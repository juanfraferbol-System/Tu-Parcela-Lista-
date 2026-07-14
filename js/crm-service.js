const PHOTO_URL_TTL_SECONDS=300;

function rpcData(result,code){
 if(result?.error)throw Object.assign(new Error(code),{cause:result.error});
 return result?.data;
}

export async function requireAdminSession(client){
 const session=await client.auth.getSession();
 if(session.error)throw new Error('crm_session_unavailable');
 if(!session.data?.session)return null;
 return rpcData(await client.rpc('crm_sesion_actual'),'crm_access_denied')?.[0]||null;
}

export async function requestMagicLink(client,email,redirectTo){
 const normalized=String(email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))throw new Error('crm_email_invalid');
 const result=await client.auth.signInWithOtp({email:normalized,options:{emailRedirectTo:redirectTo,shouldCreateUser:false}});
 if(result.error)throw new Error('crm_magic_link_failed');
 return true;
}

export async function loadModerationInbox(client,filters={}){
 const [counts,list]=await Promise.all([
  client.rpc('crm_contadores_publicaciones'),
  client.rpc('crm_listar_publicaciones',{
   p_estado:filters.estado||null,p_desde:filters.desde||null,p_hasta:filters.hasta||null,
   p_corredor:filters.corredor||null,p_comuna:filters.comuna||null,p_plan:filters.plan||null
  })
 ]);
 return {counts:rpcData(counts,'crm_counts_failed')||{},items:rpcData(list,'crm_list_failed')||[]};
}

export async function loadModerationDetail(client,publicationId){
 const [detailResult,planResult]=await Promise.all([
  client.rpc('crm_detalle_publicacion',{p_publicacion_id:publicationId}),
  client.rpc('crm_estado_plan_ia',{p_publicacion_id:publicationId})
 ]);
 const detail=rpcData(detailResult,'crm_detail_failed'),planIa=rpcData(planResult,'crm_ai_status_failed')||{};
 const photos=[];
 for(const photo of detail?.fotos||[]){
  const signed=await client.storage.from(photo.bucket_id).createSignedUrl(photo.storage_path,PHOTO_URL_TTL_SECONDS);
  if(signed.error||!signed.data?.signedUrl)throw new Error('crm_signed_url_failed');
  photos.push({...photo,signedUrl:signed.data.signedUrl,expiresIn:PHOTO_URL_TTL_SECONDS});
 }
 return {...detail,fotos:photos,planIa};
}

export async function moderatePublication(client,input){
 return rpcData(await client.rpc('crm_moderar_publicacion',{
  p_publicacion_id:input.publicationId,p_accion:input.action,p_motivo:input.reason||null,
  p_categoria:input.category||null,p_campos_correccion:input.fields||[],
  p_mensaje:input.message||null,p_confirmar:input.confirm===true
 }),'crm_moderation_failed');
}

export async function manageVisualAnalysisPlan(client,input){
 if(!['confirmar','revocar'].includes(input.action))throw new Error('crm_ai_action_invalid');
 return rpcData(await client.rpc('crm_gestionar_plan_ia',{
  p_publicacion_id:input.publicationId,p_accion:input.action,p_motivo:String(input.reason||'').trim()
 }),'crm_ai_management_failed');
}

export const CRM_PHOTO_URL_TTL_SECONDS=PHOTO_URL_TTL_SECONDS;
