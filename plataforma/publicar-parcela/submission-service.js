import {PUBLICATION_FUNCTION_URL,SUPABASE_ANON_KEY} from './supabase-config.js';

const sixDigits=value=>String(Math.max(0,Math.min(999999,Math.floor(value)))).padStart(6,'0');

export function generateTemporaryCode({date=new Date(),random=Math.random}={}){
 const value=Math.floor(random()*1000000);
 return `TPL-PUB-${date.getFullYear()}-${sixDigits(value)}`;
}

export function contactEmailFor(draft={}){
 return draft.tipoPublicador==='corredor'?String(draft.correoCorredor||'').trim():String(draft.correoDueno||'').trim();
}

export function commercialModelFor(draft={}){
 return draft.tipoPublicador==='corredor'?(draft.planCorredor||draft.commercial?.plan||''):'partner';
}

export function prepareLocalSubmission(draft={},options={}){
 const previous=draft.submission||{};
 const date=options.date||new Date();
 const idempotencyKey=previous.idempotencyKey||draft.idempotencyKey||globalThis.crypto?.randomUUID?.();
 const submission={
  status:'preparando_envio',
  submittedAt:previous.submittedAt||null,
  contactEmail:contactEmailFor(draft),
  temporaryCode:previous.temporaryCode||generateTemporaryCode({date,random:options.random}),
  publisherType:draft.tipoPublicador||'',
  commercialModel:commercialModelFor(draft),
  publicTitle:draft.titulo_publico||'',
  publicDescription:draft.descripcion_publica||'',
  idempotencyKey,
  transport:'supabase-edge-v1'
 };
 return {...draft,idempotencyKey,estado:'preparando_envio',correo_contacto:submission.contactEmail,codigo_temporal:submission.temporaryCode,tipo_publicador:submission.publisherType,plan_modelo_comercial:submission.commercialModel,enviado:false,submission};
}

export function buildSubmissionFormData(draft={},photos=[]){
 const idempotencyKey=draft.submission?.idempotencyKey||draft.idempotencyKey;
 if(!idempotencyKey)throw new Error('No fue posible preparar el identificador seguro del envío.');
 if(!photos.length)throw new Error('Debes seleccionar al menos una fotografía.');
 const coverIndex=Math.max(0,photos.findIndex(photo=>photo.cover));
 const formData=new FormData();
 formData.append('payload',JSON.stringify(draft));
 formData.append('idempotency_key',idempotencyKey);
 formData.append('cover_index',String(coverIndex));
 photos.forEach(photo=>formData.append('photos',photo.file,photo.file.name));
 return formData;
}

export const submissionAdapter={
 async submit(draft,options={}){
  const checkpoint=prepareLocalSubmission(draft);
  options.onCheckpoint?.(checkpoint);
  const formData=buildSubmissionFormData(checkpoint,options.photos||[]);
  let response;
  try{
   response=await fetch(PUBLICATION_FUNCTION_URL,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`},body:formData});
  }catch{
   const error=new Error('No pudimos conectar con el servidor. Tu borrador sigue guardado para reintentar.');
   error.recoveryDraft=checkpoint;
   throw error;
  }
  let result={};
  try{result=await response.json();}catch{}
  if(!response.ok||!result.ok){
   const error=new Error(result.error||'No fue posible enviar la publicación. Tu borrador sigue guardado.');
   error.code=result.code||'publication_submit_failed';
   error.recoveryDraft=checkpoint;
   throw error;
  }
  const submittedAt=result.creado_en||new Date().toISOString();
  const visualAnalysis=result.analisis_visual||{status:'not_requested'};
  const needsVisualReview=visualAnalysis.status==='completed'&&Boolean(visualAnalysis.suggestions);
  const finalStatus=needsVisualReview?'revision_ia_pendiente':'pendiente_revision';
  const submission={...checkpoint.submission,status:finalStatus,submittedAt,temporaryCode:result.codigo_publico,publicationId:result.id,photosProcessed:result.fotos_procesadas,photosUploaded:result.fotos_subidas,photosReused:result.fotos_reutilizadas,visualAnalysis};
  return {...checkpoint,estado:finalStatus,fecha_envio:submittedAt,codigo_temporal:result.codigo_publico,enviado:true,submission};
 }
};
