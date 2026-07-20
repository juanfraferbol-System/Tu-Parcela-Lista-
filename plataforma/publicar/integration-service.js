(()=>{
'use strict';
/*
  Integración única del Publicador TPL.

  Prioridad:
  1. submissionEndpoint personalizado, si está configurado.
  2. Edge Function `publicar-parcela` de Supabase.
  3. Modo local de respaldo, si todavía no existe configuración pública.

  Nunca incluir service_role ni secretos de Flow en el navegador.
*/
const config=window.TPL_PUBLICADOR_CONFIG||{};

function meta(name){return document.querySelector(`meta[name="${name}"]`)?.content?.trim()||'';}
function supabaseConfig(){
 const globalConfig=window.TPL_SUPABASE_CONFIG||window.__TPL_SUPABASE__||{};
 return {
  url:String(config.supabaseUrl||globalConfig.url||globalConfig.supabaseUrl||meta('tpl-supabase-url')||'').replace(/\/$/,''),
  anonKey:String(config.supabaseAnonKey||globalConfig.anonKey||globalConfig.key||meta('tpl-supabase-anon-key')||'').trim()
 };
}
function validPublicConfig(value){
 return Boolean(value.url&&/^https:\/\/[^/]+\.supabase\.co$/i.test(value.url)&&value.anonKey.length>=20&&!/service[_-]?role/i.test(value.anonKey));
}
function uuid(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}-4${Math.random().toString(16).slice(2,5)}-8${Math.random().toString(16).slice(2,5)}-${Math.random().toString(16).slice(2,14)}`.slice(0,36);}
async function readResponse(response){
 let data={};
 try{data=await response.json();}catch{}
 if(!response.ok)throw Object.assign(new Error(data.error||data.message||`Error del servidor (${response.status})`),{code:data.code||null,status:response.status});
 return data;
}
async function postJSON(url,payload,headers={}){
 return readResponse(await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(payload)}));
}
function preferredPhotoFile(photo){return photo?.variants?.large?.file||photo?.variants?.medium?.file||photo?.file||null;}
function publicPayload(payload){
 const clone=typeof structuredClone==='function'?structuredClone(payload):JSON.parse(JSON.stringify(payload));
 // Los archivos binarios se envían en multipart; el manifiesto descriptivo puede permanecer.
 return clone;
}
async function submitToSupabase(payload,photos=[]){
 const supabase=supabaseConfig();
 if(!validPublicConfig(supabase))return null;
 const form=new FormData();
 form.append('payload',JSON.stringify(publicPayload(payload)));
 form.append('idempotency_key',uuid());
 form.append('cover_index','0');
 const files=photos.map(preferredPhotoFile).filter(Boolean);
 files.forEach(file=>form.append('photos',file,file.name||'foto.webp'));
 const endpoint=`${supabase.url}/functions/v1/publicar-parcela`;
 const response=await fetch(endpoint,{method:'POST',headers:{apikey:supabase.anonKey,Authorization:`Bearer ${supabase.anonKey}`},body:form});
 const publication=await readResponse(response);
 return {mode:'remote',provider:'supabase',publication,mediaUploaded:true,flowConfigured:false};
}
async function uploadPhotos(photos,publicationCode){
 if(!config.mediaUploadEndpoint||!photos?.length)return null;
 const form=new FormData();
 form.append('publicationCode',publicationCode);
 const manifest=[];
 photos.forEach((photo,index)=>{
  const variants={};
  for(const [size,data] of Object.entries(photo.variants||{})){
   const key=`photo_${index}_${size}`;
   form.append(key,data.file,data.file.name);
   variants[size]={field:key,name:data.file.name,width:data.width,height:data.height,size:data.size,type:data.file.type};
  }
  manifest.push({id:photo.id,order:index,cover:index===0,originalName:photo.originalName,variants});
 });
 form.append('manifest',JSON.stringify(manifest));
 return readResponse(await fetch(config.mediaUploadEndpoint,{method:'POST',body:form}));
}
function mergeUploadedMedia(payload,upload){
 if(!upload)return payload;
 const clone=typeof structuredClone==='function'?structuredClone(payload):JSON.parse(JSON.stringify(payload));
 clone.medios={...(clone.medios||{}),storage:'supabase',uploadId:upload.uploadId||null,fotos:upload.photos||upload.fotos||clone.medios?.fotos||[],portadaUrl:upload.coverUrl||upload.portadaUrl||null};
 return clone;
}
async function submitPublication(payload,photos=[]){
 // Backend personalizado existente.
 if(config.submissionEndpoint){
  let finalPayload=payload;
  if(config.mediaUploadEndpoint&&photos.length){finalPayload=mergeUploadedMedia(payload,await uploadPhotos(photos,payload.codigo));}
  const publication=await postJSON(config.submissionEndpoint,finalPayload);
  window.TPL?.orchestrator?.notify?.('CRM_SINCRONIZADO',{publication},{source:'integration-service'});
  if(finalPayload.integraciones?.flow?.requerido&&config.flowCreatePaymentEndpoint){
   const payment=await postJSON(config.flowCreatePaymentEndpoint,{publicationId:publication?.id||finalPayload.codigo,planId:finalPayload.plan.id,customer:finalPayload.contacto,amount:finalPayload.plan.tarifa,payloadVersion:finalPayload.version});
   if(payment.url)return{mode:'remote',provider:'custom',publication,paymentUrl:payment.url,token:payment.token||null,mediaUploaded:!!config.mediaUploadEndpoint};
  }
  return{mode:'remote',provider:'custom',publication,mediaUploaded:!!config.mediaUploadEndpoint,flowConfigured:!!config.flowCreatePaymentEndpoint};
 }
 // Camino recomendado: Edge Function ya incluida en el proyecto.
 const supabaseResult=await submitToSupabase(payload,photos);
 if(supabaseResult){window.TPL?.orchestrator?.notify?.('CRM_SINCRONIZADO',{publication:supabaseResult.publication},{source:'integration-service'});return supabaseResult;}
 // Respaldo mientras se configura la clave pública.
 return{mode:'local',provider:'browser-backup',publication:null,flowConfigured:false,mediaConfigured:false,reason:'missing_public_supabase_config'};
}
window.TPLIntegration={submitPublication,uploadPhotos,getSupabaseConfig:supabaseConfig,isRemoteReady:()=>validPublicConfig(supabaseConfig())};
})();
