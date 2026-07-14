import {getSupabaseClient,hasValidSupabaseConfig,readSupabaseConfig} from '../../js/supabase-client.js';
import {ALLOWED_PHOTO_TYPES,MAX_PHOTOS,MAX_FINAL_TOTAL_PHOTO_BYTES} from './photo-optimizer.js';
import {planIncludesVisualAnalysis} from './plans-config.js';

export const PENDING_BUCKET='publicaciones-pendientes';
export {ALLOWED_PHOTO_TYPES,MAX_PHOTOS};
export const MAX_TOTAL_PHOTO_BYTES=MAX_FINAL_TOTAL_PHOTO_BYTES;

const sixDigits=value=>String(Math.max(0,Math.min(999999,Math.floor(value)))).padStart(6,'0');
const nowIso=date=>(date||new Date()).toISOString();
const randomUuid=()=>globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,char=>{const value=Math.random()*16|0;return(char==='x'?value:(value&3|8)).toString(16);});

export class SubmissionError extends Error{
 constructor(message,{code='submission_error',cause=null,recoveryDraft=null}={}){
  super(message);this.name='SubmissionError';this.code=code;this.cause=cause;this.recoveryDraft=recoveryDraft;
 }
}

export function generateTemporaryCode({date=new Date(),random=Math.random}={}){
 return `TPL-PUB-${date.getFullYear()}-${sixDigits(Math.floor(random()*1000000))}`;
}

export function contactEmailFor(draft={}){
 return draft.tipoPublicador==='corredor'?String(draft.correoCorredor||'').trim():String(draft.correoDueno||'').trim();
}

export function commercialModelFor(draft={}){
 return draft.tipoPublicador==='corredor'?(draft.planCorredor||draft.commercial?.plan||''):'partner';
}

export function visualAnalysisRequestFor(draft={}){
 const plan=commercialModelFor(draft),included=draft.tipoPublicador==='corredor'&&planIncludesVisualAnalysis(plan),consent=Boolean(included&&draft.analisisVisual?.consent);
 return {requested:consent,included,consent,maxPhotos:5,detail:'low',reviewStatus:draft.analisisVisual?.reviewStatus||null,acceptedSuggestions:draft.analisisVisual?.acceptedSuggestions||null};
}

export function prepareLocalSubmission(draft={},options={}){
 const previous=draft.submission||{};const date=options.date||new Date();
 const submission={
  status:'publicado',submittedAt:previous.submittedAt||date.toISOString(),
  contactEmail:contactEmailFor(draft),temporaryCode:previous.temporaryCode||generateTemporaryCode({date,random:options.random}),
  publisherType:draft.tipoPublicador||'',commercialModel:commercialModelFor(draft),
 publicTitle:draft.titulo_publico||'',publicDescription:draft.descripcion_publica||'',
  transport:'mock-local-v1',adapterLabel:'Local · solo desarrollo',fallbackReason:options.fallbackReason||'development'
 };
 return {...draft,estado:'publicado',activo:true,fecha_envio:submission.submittedAt,correo_contacto:submission.contactEmail,codigo_temporal:submission.temporaryCode,tipo_publicador:submission.publisherType,plan_modelo_comercial:submission.commercialModel,enviado:true,submission};
}

export function createIdempotencyKey(){return randomUuid();}

function safePayload(draft){
 const copy={...draft};delete copy.submission;delete copy.enviado;delete copy.estado;delete copy.codigo_temporal;delete copy.fecha_envio;
 const payload=JSON.parse(JSON.stringify(copy,(key,value)=>key==='file'||key==='url'?undefined:value));
 delete payload.photos;
 ['precio','montoLiquido'].forEach(key=>{if(payload[key]!=null)payload[key]=String(payload[key]).replace(/[^0-9]/g,'');});
 if(payload.superficie!=null)payload.superficie=String(payload.superficie).replace(',','.').replace(/[^0-9.]/g,'');
 payload.analisisVisual=visualAnalysisRequestFor(draft);
 payload.autoPublish = true; // Flag for Supabase to auto-publish
 payload.activo = true; // Auto-publish flag
 return payload;
}

export function normalizeSubmissionPhotos(items=[]){
 if(items.length===0)throw new SubmissionError('Debes seleccionar al menos una fotografía.',{code:'missing_photos'});
 if(items.length>MAX_PHOTOS)throw new SubmissionError(`Se permiten como máximo ${MAX_PHOTOS} fotografías.`,{code:'too_many_photos'});
 let totalBytes=0;
 const normalized=[...items].map((photo,index)=>{
  const file=photo.file||photo;
  if(!file||!ALLOWED_PHOTO_TYPES.includes(file.type))throw new SubmissionError(`La fotografía ${file?.name||index+1} tiene un formato no permitido.`,{code:'invalid_photo_type'});
  if(!Number(file.size))throw new SubmissionError(`La fotografía ${file.name||index+1} está vacía.`,{code:'invalid_photo_size'});
  totalBytes+=file.size;return {file,index,cover:Boolean(photo.cover)};
 });
 if(totalBytes>MAX_TOTAL_PHOTO_BYTES)throw new SubmissionError('Las fotografías optimizadas no pueden superar 20 MB en total.',{code:'photos_total_too_large'});
 return normalized;
}

function responseError(response){return response?.error||null;}

function isDevelopmentRuntime(options={},dependencies={}){
 if(typeof options.allowLocalFallback==='boolean')return options.allowLocalFallback;
 if(typeof dependencies.allowLocalFallback==='boolean')return dependencies.allowLocalFallback;
 if(typeof location==='undefined')return true;
 return location.protocol==='file:'||['localhost','127.0.0.1','[::1]'].includes(location.hostname);
}

function checkpointDraft(draft,submission){
 return {...draft,estado:submission.status==='publicado'?'publicado':'borrador',activo:(submission.status==='publicado'),fecha_envio:submission.submittedAt,correo_contacto:submission.contactEmail,codigo_temporal:submission.temporaryCode,tipo_publicador:submission.publisherType,plan_modelo_comercial:submission.commercialModel,enviado:submission.status==='publicado',submission};
}

async function notifyCheckpoint(callback,draft){if(typeof callback==='function')await callback(draft);}

async function submitToSupabase(draft,options,client){
 const photos=normalizeSubmissionPhotos(options.photos||[]),previous=draft.submission?.transport==='supabase-v1'?draft.submission:null;
 if(previous&&!photos.length&&Array.isArray(draft.photos)&&draft.photos.length)throw new SubmissionError('Vuelve a seleccionar las fotografías para reanudar el envío.',{code:'missing_recovery_files',recoveryDraft:draft});
 const idempotencyKey=previous?.idempotencyKey||createIdempotencyKey();
 let submission={
  ...previous,status:'procesando_en_servidor',submittedAt:previous?.submittedAt||nowIso(options.date),
  contactEmail:contactEmailFor(draft),temporaryCode:previous?.temporaryCode||'',idempotencyKey,
  publisherType:draft.tipoPublicador||'',commercialModel:commercialModelFor(draft),
  publicTitle:draft.titulo_publico||'',publicDescription:draft.descripcion_publica||'',
  transport:'supabase-v1',adapterLabel:'Supabase Edge Function'
 };
 let recoveryDraft=checkpointDraft(draft,submission);await notifyCheckpoint(options.onCheckpoint,recoveryDraft);
 const formData=new FormData();formData.append('payload',JSON.stringify(safePayload(draft)));formData.append('idempotency_key',idempotencyKey);
 const coverIndex=Math.max(0,photos.findIndex(photo=>photo.cover));formData.append('cover_index',String(coverIndex));
 photos.forEach(photo=>formData.append('photos',photo.file));
 let response;
 try{response=await client.functions.invoke('publicar-parcela',{body:formData});}
 catch(cause){throw new SubmissionError('No fue posible conectar con el servicio seguro de publicación. El reintento conservará la misma idempotencia.',{code:'edge_function_failed',cause,recoveryDraft});}
 const error=responseError(response),result=response?.data;
 if(error||!result?.ok||!result?.id||!result?.codigo_publico)throw new SubmissionError(result?.error||error?.message||'No fue posible completar la publicación.',{code:result?.code||'edge_function_failed',cause:error,recoveryDraft});
 const visualAnalysis=result.analisis_visual||{status:'not_requested'},reviewed=['accepted','edited','rejected'].includes(String(draft.analisisVisual?.reviewStatus||''));
 submission={...submission,status:visualAnalysis.status==='completed'&&visualAnalysis.suggestions&&!reviewed?'revision_ia_pendiente':'publicado',temporaryCode:result.codigo_publico,publicationId:result.id,submittedAt:result.creado_en||submission.submittedAt,completedAt:nowIso(options.date),processedPhotos:Number(result.fotos_procesadas||0),visualAnalysis};
 recoveryDraft=checkpointDraft(draft,submission);await notifyCheckpoint(options.onCheckpoint,recoveryDraft);
 return recoveryDraft;
}

export function createSubmissionAdapter(dependencies={}){
 let inFlight=null;
 return {
  async submit(draft={},options={}){
   if(inFlight)return inFlight;
   const run=async()=>{
    if(options.forceLocal){
     if(!isDevelopmentRuntime(options,dependencies))throw new SubmissionError('El adaptador local está bloqueado fuera de desarrollo.',{code:'local_adapter_not_allowed'});
     return prepareLocalSubmission(draft,{...options,fallbackReason:'forced-local'});
    }
    const injectedClient=options.supabaseClient||dependencies.supabaseClient;
    const config=options.config||dependencies.config||readSupabaseConfig();
    const configured=Boolean(injectedClient)||hasValidSupabaseConfig(config);
    if(!configured){
     if(isDevelopmentRuntime(options,dependencies))return prepareLocalSubmission(draft,{...options,fallbackReason:'missing-config'});
     throw new SubmissionError('Supabase no está configurado. El respaldo local solo está disponible en desarrollo.',{code:'missing_config'});
    }
    const client=injectedClient||(dependencies.getClient||getSupabaseClient)({config});
    if(!client)throw new SubmissionError('La configuración de Supabase existe, pero el cliente supabase-js no está disponible.',{code:'client_unavailable'});
    return submitToSupabase(draft,options,client);
   };
   inFlight=run();
   try{return await inFlight;}finally{inFlight=null;}
  }
 };
}

export const submissionAdapter=createSubmissionAdapter();
