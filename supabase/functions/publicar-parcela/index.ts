import {createClient} from 'npm:@supabase/supabase-js@2';
import {uploadMissingPhotos} from './upload-logic.mjs';
import {MAX_VISUAL_ANALYSIS_PHOTOS,analyzeVisualPhotos} from './visual-analysis.ts';

const BUCKET='publicaciones-pendientes';
const MAX_PHOTOS=12;
const MAX_TOTAL_PHOTO_BYTES=20*1024*1024;
const MAX_REQUEST_BYTES=22*1024*1024;
const MAX_PAYLOAD_BYTES=100*1024;
const MIME_EXTENSIONS:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedPlans=['gold','platinum'] as const;
const DEFAULT_VISUAL_MODEL='gpt-4o-mini';

function allowedOrigins(){
 const configured=String(Deno.env.get('TPL_ALLOWED_ORIGINS')||'').split(',').map(value=>value.trim()).filter(Boolean);
 return new Set(['https://parcelalista.cl','https://www.parcelalista.cl','http://127.0.0.1:8765','http://localhost:8765',...configured]);
}

function corsHeaders(origin:string){
 return {
  'Access-Control-Allow-Origin':origin,
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Access-Control-Max-Age':'86400',
  'Vary':'Origin'
 };
}

function jsonResponse(origin:string,status:number,body:Record<string,unknown>){
 return new Response(JSON.stringify(body),{status,headers:{...corsHeaders(origin),'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}

function serverKey(){
 const current=Deno.env.get('SUPABASE_SECRET_KEYS');
 if(current){
  try{
   const keys=JSON.parse(current);const key=keys?.default||Object.values(keys||{})[0];
   if(typeof key==='string'&&key)return key;
  }catch{/* Se intenta la variable legacy solo dentro del runtime. */}
 }
 return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
}

function publicKeys(){
 const keys:string[]=[];
 const configured=String(Deno.env.get('TPL_PUBLIC_API_KEYS')||'').split(',').map(value=>value.trim()).filter(Boolean);
 keys.push(...configured);
 const current=Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
 if(current){
  try{for(const value of Object.values(JSON.parse(current)||{}))if(typeof value==='string'&&value)keys.push(value);}catch{/* Se usa el fallback legacy. */}
 }
 const legacy=Deno.env.get('SUPABASE_ANON_KEY');if(legacy)keys.push(legacy);
 return new Set(keys);
}

async function sha256Hex(file:File){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()));
 return [...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
}

async function deterministicPhotoUuid(idempotencyKey:string,index:number,contentHash:string){
 const source=`${idempotencyKey}:${index}:${contentHash}`;
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))).slice(0,16);
 bytes[6]=(bytes[6]&0x0f)|0x50;bytes[8]=(bytes[8]&0x3f)|0x80;
 const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function bytesToBase64(bytes:Uint8Array){let binary='';const chunk=0x8000;for(let offset=0;offset<bytes.length;offset+=chunk)binary+=String.fromCharCode(...bytes.subarray(offset,offset+chunk));return btoa(binary);}

async function processVisualAnalysis(admin:any,publicationId:string){
 const model=String(Deno.env.get('OPENAI_VISUAL_MODEL')||DEFAULT_VISUAL_MODEL);
 const apiKey=String(Deno.env.get('OPENAI_API_KEY')||'');
 if(!apiKey)return {status:'pending_openai_configuration'};
 const reservation=await admin.rpc('preparar_analisis_visual',{p_publicacion_id:publicationId,p_modelo:model});
 if(reservation.error)return {status:'pending_server_configuration'};
 const row=Array.isArray(reservation.data)?reservation.data[0]:reservation.data;
 if(!row?.debe_analizar)return {status:row?.estado||'not_requested',reused:Boolean(row?.reutilizado)};
 const paths=Array.isArray(row.foto_paths)?row.foto_paths.slice(0,MAX_VISUAL_ANALYSIS_PHOTOS):[],mimes=Array.isArray(row.foto_mimes)?row.foto_mimes.slice(0,paths.length):[];
 if(!paths.length)return {status:'missing_photos'};
 try{
  const images=[] as string[];
  for(let index=0;index<paths.length;index++){
   const downloaded=await admin.storage.from(BUCKET).download(paths[index]);
   if(downloaded.error||!downloaded.data)throw new Error('visual_photo_download_failed');
   images.push(`data:${mimes[index]||'image/jpeg'};base64,${bytesToBase64(new Uint8Array(await downloaded.data.arrayBuffer()))}`);
  }
  const result=await analyzeVisualPhotos({apiKey,model,images});
  const completed=await admin.rpc('completar_analisis_visual',{p_analisis_id:row.analisis_id,p_modelo:result.model,p_sugerencias:result.suggestions});
  if(completed.error)throw new Error('visual_analysis_save_failed');
  return {status:'completed',suggestions:result.suggestions,model:result.model};
 }catch{
  await admin.rpc('marcar_error_analisis_visual',{p_analisis_id:row.analisis_id,p_codigo_error:'visual_analysis_unavailable'});
  return {status:'unavailable'};
 }
}

Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 if(!allowedOrigins().has(origin))return new Response(JSON.stringify({ok:false,error:'Origen no permitido.'}),{status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders(origin)});
 if(request.method!=='POST')return jsonResponse(origin,405,{ok:false,error:'Método no permitido.'});

 const apiKey=request.headers.get('apikey')||'';
 if(!apiKey||!publicKeys().has(apiKey))return jsonResponse(origin,401,{ok:false,error:'Clave pública no válida.'});

 const contentType=request.headers.get('content-type')||'';
 if(!contentType.toLowerCase().startsWith('multipart/form-data'))return jsonResponse(origin,415,{ok:false,error:'Se requiere multipart/form-data.'});
 const declaredLength=Number(request.headers.get('content-length')||0);
 if(declaredLength>MAX_REQUEST_BYTES)return jsonResponse(origin,413,{ok:false,error:'La solicitud supera el límite total permitido.'});

 const url=Deno.env.get('SUPABASE_URL')||'',secret=serverKey();
 if(!url||!secret)return jsonResponse(origin,503,{ok:false,error:'El servicio de publicación no está configurado.'});

 try{
  const form=await request.formData();
  const rawPayload=form.get('payload'),idempotencyKey=String(form.get('idempotency_key')||''),rawCoverIndex=String(form.get('cover_index')||'0');
  if(typeof rawPayload!=='string'||new TextEncoder().encode(rawPayload).byteLength>MAX_PAYLOAD_BYTES)return jsonResponse(origin,400,{ok:false,error:'Datos de publicación inválidos.'});
  if(!UUID_PATTERN.test(idempotencyKey))return jsonResponse(origin,400,{ok:false,error:'Identificador de idempotencia inválido.'});

  let payload:Record<string,unknown>;
  try{payload=JSON.parse(rawPayload);}catch{return jsonResponse(origin,400,{ok:false,error:'El contenido de la publicación no es JSON válido.'});}
  if(!payload||Array.isArray(payload)||typeof payload!=='object')return jsonResponse(origin,400,{ok:false,error:'Datos de publicación inválidos.'});
  const publisherType=String(payload.tipoPublicador||payload.tipo_publicador||''),commercial=payload.commercial&&typeof payload.commercial==='object'?payload.commercial as Record<string,unknown>:{};
  const plan=String(payload.planCorredor||commercial.plan||''),rawVisual=payload.analisisVisual&&typeof payload.analisisVisual==='object'?payload.analisisVisual as Record<string,unknown>:{};
  const visualConsent=rawVisual.consent===true||rawVisual.requested===true,visualIncluded=publisherType==='corredor'&&allowedPlans.includes(plan as typeof allowedPlans[number]);
  if(visualConsent&&!visualIncluded)return jsonResponse(origin,403,{ok:false,error:'El plan seleccionado no incluye análisis visual con IA.',code:'visual_analysis_not_included'});
  const visualReviewStatus=['accepted','edited','rejected'].includes(String(rawVisual.reviewStatus||''))?String(rawVisual.reviewStatus):null;
  payload.analisisVisual={requested:visualConsent&&visualIncluded,consent:visualConsent&&visualIncluded,included:visualIncluded,maxPhotos:MAX_VISUAL_ANALYSIS_PHOTOS,detail:'low',reviewStatus:visualReviewStatus,acceptedSuggestions:visualReviewStatus==='rejected'?null:rawVisual.acceptedSuggestions||null};

  const photos=form.getAll('photos').filter(value=>value instanceof File) as File[];
  if(photos.length===0)return jsonResponse(origin,400,{ok:false,error:'Debes seleccionar al menos una fotografía.',code:'missing_photos'});
  if(photos.length>MAX_PHOTOS)return jsonResponse(origin,400,{ok:false,error:`Se permiten como máximo ${MAX_PHOTOS} fotografías.`});
  const coverIndex=Number(rawCoverIndex);
  if(!Number.isInteger(coverIndex)||coverIndex<0||coverIndex>=photos.length)return jsonResponse(origin,400,{ok:false,error:'La portada seleccionada no es válida.',code:'invalid_cover'});
  let totalBytes=0;
  for(const file of photos){
   if(!MIME_EXTENSIONS[file.type])return jsonResponse(origin,400,{ok:false,error:'Una fotografía tiene un formato no permitido.'});
   if(file.size<=0)return jsonResponse(origin,400,{ok:false,error:'Una fotografía está vacía.'});
   totalBytes+=file.size;
  }
  if(totalBytes>MAX_TOTAL_PHOTO_BYTES)return jsonResponse(origin,400,{ok:false,error:'Las fotografías no pueden superar 20 MB en total.'});

  const manifest=[] as Array<{id:string;mime_type:string;tamano_bytes:number;orden:number;es_portada:boolean;contenido_sha256:string}>;
  for(let index=0;index<photos.length;index++){
   const file=photos[index],contentHash=await sha256Hex(file);
   manifest.push({
    id:await deterministicPhotoUuid(idempotencyKey,index,contentHash),
    mime_type:file.type,tamano_bytes:file.size,orden:index,es_portada:index===coverIndex,contenido_sha256:contentHash
   });
  }

  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const creation=await admin.rpc('crear_publicacion_pendiente',{p_datos:payload,p_idempotency_key:idempotencyKey,p_fotos:manifest});
  const publication=Array.isArray(creation.data)?creation.data[0]:creation.data;
  if(creation.error){
   if(/MANIFEST_CONFLICT/i.test(String(creation.error.message||'')))throw new Error('manifest_conflict');
   if(/MANIFEST_DUPLICATE_ORDER/i.test(String(creation.error.message||'')))throw new Error('manifest_duplicate_order');
   throw new Error('publication_create_failed');
  }
  if(!publication?.id||!publication?.codigo_publico)throw new Error('publication_create_failed');

  const authorization=request.headers.get('authorization')||'',jwt=authorization.replace(/^Bearer\s+/i,'');
  let userId:string|null=null;
  if(jwt&&jwt!==apiKey){const userResult=await admin.auth.getUser(jwt);if(!userResult.error)userId=userResult.data.user?.id||null;}
  const enteredPrice=Number(payload.precio||0),ownerAmount=Number(payload.precioPropietarioSolicitado||payload.montoLiquido||0);
  const commercialUpdate:Record<string,unknown>={usuario_id:userId,precio_publico:enteredPrice||null,precision_ubicacion:payload.ubicacionFuente||null,consentimiento_uso_ubicacion:payload.autorizaGpsFotos===true||payload.consentimientoUbicacion===true,consentimiento_uso_ubicacion_en:payload.ubicacionConfirmadaEn||null};
  if(publisherType==='dueno'&&ownerAmount>0){
   const commercialConfig=await admin.from('crm_configuracion').select('valor_numero').eq('clave','partner_service_percent').maybeSingle();
   const servicePercent=Number(commercialConfig.data?.valor_numero);
   if(Number.isFinite(servicePercent)&&servicePercent>=0&&servicePercent<=1){const serviceAmount=Math.round(ownerAmount*servicePercent);commercialUpdate.precio_propietario_solicitado=ownerAmount;commercialUpdate.monto_liquido=ownerAmount;commercialUpdate.porcentaje_servicio=servicePercent;commercialUpdate.monto_servicio=serviceAmount;commercialUpdate.precio_publico=ownerAmount+serviceAmount;commercialUpdate.precio_publicacion=ownerAmount+serviceAmount;}
  }
  await admin.from('publicaciones').update(commercialUpdate).eq('id',publication.id);

  const uploadResult=await uploadMissingPhotos({storage:admin.storage,bucket:BUCKET,publicationId:publication.id,photos,manifest,mimeExtensions:MIME_EXTENSIONS});
  const visualAnalysis=visualConsent&&visualIncluded?await processVisualAnalysis(admin,publication.id):{status:'not_requested'};

  return jsonResponse(origin,200,{ok:true,id:publication.id,codigo_publico:publication.codigo_publico,creado_en:publication.creado_en,fotos_procesadas:uploadResult.processed,fotos_subidas:uploadResult.uploaded,fotos_reutilizadas:uploadResult.reused,analisis_visual:visualAnalysis});
 }catch(error){
  const code=String((error as Error)?.message||'internal_error').split(':')[0];
  const messages:Record<string,string>={publication_create_failed:'No fue posible crear la publicación.',photo_upload_failed:'No fue posible guardar una fotografía.',storage_inspection_failed:'No fue posible comprobar las fotografías ya guardadas.',storage_partial_response:'Storage devolvió una respuesta incompleta.',manifest_conflict:'Este reintento no coincide con las fotografías del envío original.',manifest_duplicate_order:'El manifiesto contiene un orden de fotografía duplicado.'};
  return jsonResponse(origin,502,{ok:false,error:messages[code]||'No fue posible completar la publicación.',code});
 }
});
