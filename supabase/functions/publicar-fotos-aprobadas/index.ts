import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (status:number, body:Record<string,unknown>) => new Response(JSON.stringify(body), {status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:cors});
  if (req.method !== 'POST') return json(405,{ok:false,error:'Método no permitido.'});
  try {
    const url=Deno.env.get('SUPABASE_URL');
    const anon=Deno.env.get('SUPABASE_ANON_KEY');
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!anon||!service) return json(500,{ok:false,error:'Configuración incompleta.'});

    const authHeader=req.headers.get('Authorization')||'';
    const userClient=createClient(url,anon,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
    const {data:sessionRows,error:sessionError}=await userClient.rpc('crm_sesion_actual');
    if(sessionError||sessionRows?.[0]?.tipo!=='administrador') return json(403,{ok:false,error:'Acceso administrativo requerido.'});

    const body=await req.json().catch(()=>({}));
    const publicacionId=String(body.publicacion_id||'').trim();
    if(!publicacionId) return json(400,{ok:false,error:'Falta publicacion_id.'});

    const admin=createClient(url,service,{auth:{persistSession:false}});
    const {data:publication,error:pubError}=await admin.from('publicaciones').select('id,estado,datos_formulario').eq('id',publicacionId).single();
    if(pubError||!publication) return json(404,{ok:false,error:'Publicación no encontrada.'});
    if(publication.estado!=='aprobada') return json(409,{ok:false,error:'La publicación debe estar aprobada.'});

    const {data:photos,error:photosError}=await admin.from('publicacion_fotos').select('*').eq('publicacion_id',publicacionId).order('orden');
    if(photosError) throw photosError;
    const publicUrls:string[]=[];
    let coverUrl:string|null=null;

    for(const photo of photos||[]){
      let targetPath=photo.storage_path;
      if(photo.bucket_id!=='publicaciones-publicas'){
        const {data:file,error:downloadError}=await admin.storage.from(photo.bucket_id).download(photo.storage_path);
        if(downloadError) throw downloadError;
        const {error:uploadError}=await admin.storage.from('publicaciones-publicas').upload(targetPath,file,{contentType:photo.mime_type,upsert:true});
        if(uploadError) throw uploadError;
        const {error:updatePhotoError}=await admin.from('publicacion_fotos').update({bucket_id:'publicaciones-publicas'}).eq('id',photo.id);
        if(updatePhotoError) throw updatePhotoError;
        await admin.storage.from(photo.bucket_id).remove([photo.storage_path]);
      }
      const {data:publicData}=admin.storage.from('publicaciones-publicas').getPublicUrl(targetPath);
      const urlPublica=publicData.publicUrl;
      publicUrls.push(urlPublica);
      if(photo.es_portada) coverUrl=urlPublica;
    }
    coverUrl=coverUrl||publicUrls[0]||null;
    const nextData={...(publication.datos_formulario||{}),imagen_principal:coverUrl,imagenes:publicUrls,bucket_imagenes:'publicaciones-publicas'};
    const {error:updateError}=await admin.from('publicaciones').update({datos_formulario:nextData}).eq('id',publicacionId);
    if(updateError) throw updateError;
    return json(200,{ok:true,publicacion_id:publicacionId,fotos_publicadas:publicUrls.length,imagen_principal:coverUrl});
  } catch(error){
    console.error(error);
    return json(500,{ok:false,error:error instanceof Error?error.message:'No fue posible publicar las fotografías.'});
  }
});
