(()=>{
'use strict';
/*
  Configuración esperada (inyectada antes de este archivo):
  window.TPL_PUBLICADOR_CONFIG = {
    submissionEndpoint: '/api/publicaciones',
    mediaUploadEndpoint: '/api/publicaciones/media',
    flowCreatePaymentEndpoint: '/api/flow/create-payment'
  };
  Las credenciales secretas de Supabase y Flow NUNCA deben incluirse en el navegador.
*/
const config=window.TPL_PUBLICADOR_CONFIG||{};
async function readResponse(response){let data={};try{data=await response.json();}catch{}if(!response.ok)throw new Error(data.message||`Error del servidor (${response.status})`);return data;}
async function postJSON(url,payload){return readResponse(await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}));}
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
  let finalPayload=payload;
  if(config.mediaUploadEndpoint&&photos.length){
    const upload=await uploadPhotos(photos,payload.codigo);
    finalPayload=mergeUploadedMedia(payload,upload);
  }
  let publicationResult=null;
  if(config.submissionEndpoint){publicationResult=await postJSON(config.submissionEndpoint,finalPayload);window.TPL?.orchestrator?.notify?.('CRM_SINCRONIZADO',{publication:publicationResult||finalPayload},{source:'integration-service'});}
  const requiresPayment=finalPayload.integraciones?.flow?.requerido;
  if(requiresPayment&&config.flowCreatePaymentEndpoint){
    const payment=await postJSON(config.flowCreatePaymentEndpoint,{publicationId:publicationResult?.id||finalPayload.codigo,planId:finalPayload.plan.id,customer:finalPayload.contacto,amount:finalPayload.plan.tarifa,payloadVersion:finalPayload.version});
    if(payment.url){window.TPL?.orchestrator?.notify?.('PAGO_CREADO',{publicationId:publicationResult?.id||finalPayload.codigo,planId:finalPayload.plan.id},{source:'integration-service'});return{mode:'remote',publication:publicationResult,paymentUrl:payment.url,token:payment.token||null,mediaUploaded:!!config.mediaUploadEndpoint};}
  }
  return{mode:config.submissionEndpoint?'remote':'local',publication:publicationResult,flowConfigured:!!config.flowCreatePaymentEndpoint,mediaConfigured:!!config.mediaUploadEndpoint};
}
window.TPLIntegration={submitPublication,uploadPhotos};
})();
