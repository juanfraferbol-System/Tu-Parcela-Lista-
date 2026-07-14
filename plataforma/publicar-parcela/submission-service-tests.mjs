import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSubmissionAdapter,normalizeSubmissionPhotos,prepareLocalSubmission,SubmissionError,MAX_PHOTOS,MAX_TOTAL_PHOTO_BYTES} from './submission-service.js';

const baseDraft={
 schemaVersion:10,tipoPublicador:'dueno',nombreDueno:'Ana',correoDueno:'ana@example.cl',telefonoDueno:'+56911111111',
 titulo_publico:'Parcela en Florida',descripcion_publica:'Descripción pública',descripcion_origen:'Relato privado',
 region:'Biobío',comuna:'Florida',sector:'Copiulemu',superficie:5000,precio:20000000,
 rol:'propio',agua:'pozo',luz:'factibilidad',acceso:'ripio',topografia:'plana',
 naturaleza:['Bosque nativo'],cuerposAgua:['Estero'],servicios:['Comercio'],commercial:{type:'partner'}
};
const photo=(name='parcela.jpg',size=1024,type='image/jpeg')=>({file:new File([new Uint8Array(size)],name,{type}),cover:true});

function mockSupabase(options={}){
 const calls={invoke:0,idempotencyKeys:[],photoCounts:[],coverIndexes:[],payloads:[]},manifests=new Map();let failures=options.failures||0;
 const client={functions:{async invoke(name,{body}){
  assert.equal(name,'publicar-parcela');assert.ok(body instanceof FormData);calls.invoke++;
  const key=String(body.get('idempotency_key'));calls.idempotencyKeys.push(key);calls.photoCounts.push(body.getAll('photos').length);calls.coverIndexes.push(String(body.get('cover_index')));calls.payloads.push(JSON.parse(String(body.get('payload'))));
  if(options.enforceImmutableManifest){
   const descriptors=[];for(const file of body.getAll('photos')){const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());descriptors.push(`${file.type}:${file.size}:${Buffer.from(digest).toString('hex')}`);}
   const signature=JSON.stringify({coverIndex:body.get('cover_index'),descriptors}),previous=manifests.get(key);
   if(previous&&previous!==signature)return {data:{ok:false,error:'Este reintento no coincide con las fotografías del envío original.',code:'manifest_conflict'},error:null};
   manifests.set(key,signature);
  }
  if(options.delay)await new Promise(resolve=>setTimeout(resolve,options.delay));
  if(failures>0){failures--;return {data:{ok:false,error:options.message||'No fue posible guardar una fotografía.',code:options.code||'photo_upload_failed'},error:null};}
  if(options.transportError)return {data:null,error:{message:'función no disponible'}};
  return {data:{ok:true,id:'11111111-1111-4111-8111-111111111111',codigo_publico:'TPL-PUB-2026-123456',creado_en:'2026-07-13T12:00:00.000Z',fotos_procesadas:body.getAll('photos').length,analisis_visual:options.visualAnalysis||{status:'not_requested'}},error:null};
 }}};
 return {client,calls};
}

const MB=1024*1024;
assert.equal(MAX_PHOTOS,12);assert.equal(MAX_TOTAL_PHOTO_BYTES,20*MB);

// Envío local explícito y recuperación del mismo código.
const local=await createSubmissionAdapter().submit(baseDraft,{forceLocal:true,date:new Date('2026-07-13T12:00:00.000Z'),random:()=>.123456});
assert.equal(local.submission.transport,'mock-local-v1');assert.equal(local.submission.adapterLabel,'Local · solo desarrollo');
assert.equal(prepareLocalSubmission(local,{date:new Date('2027-01-01T00:00:00.000Z'),random:()=>.9}).codigo_temporal,local.codigo_temporal);

// Fallback solo en desarrollo.
const withoutCredentials=await createSubmissionAdapter().submit(baseDraft,{config:{url:'',anonKey:''}});
assert.equal(withoutCredentials.submission.fallbackReason,'missing-config');
await assert.rejects(()=>createSubmissionAdapter({allowLocalFallback:false}).submit(baseDraft,{config:{url:'',anonKey:''}}),error=>error.code==='missing_config');
await assert.rejects(()=>createSubmissionAdapter({allowLocalFallback:false}).submit(baseDraft,{forceLocal:true}),error=>error.code==='local_adapter_not_allowed');

// Navegador invoca una única Edge Function; no escribe directamente en tablas o Storage.
const simulated=mockSupabase(),remote=await createSubmissionAdapter().submit(baseDraft,{supabaseClient:simulated.client,photos:[photo()]});
assert.equal(remote.submission.transport,'supabase-v1');assert.equal(remote.submission.adapterLabel,'Supabase Edge Function');assert.equal(remote.submission.status,'pendiente_revision');
assert.equal(remote.codigo_temporal,'TPL-PUB-2026-123456');assert.equal(simulated.calls.invoke,1);assert.equal(simulated.calls.photoCounts[0],1);
assert.equal(simulated.calls.coverIndexes[0],'0');
assert.match(remote.submission.idempotencyKey,/^[0-9a-f-]{36}$/);assert.equal(simulated.calls.idempotencyKeys[0],remote.submission.idempotencyKey);
assert.equal('photos' in simulated.calls.payloads[0],false);

// Fallo al crear la publicación no genera un segundo intento oculto.
const createFailure=mockSupabase({failures:1,code:'publication_create_failed',message:'No fue posible crear la publicación.'});
await assert.rejects(()=>createSubmissionAdapter().submit(baseDraft,{supabaseClient:createFailure.client,photos:[photo()]}),error=>error instanceof SubmissionError&&error.code==='publication_create_failed');
assert.equal(createFailure.calls.invoke,1);

// Error de función conserva la idempotencia pública; reintento usa la misma clave.
const transient=mockSupabase({failures:1}),retryAdapter=createSubmissionAdapter();let checkpoint;
await assert.rejects(()=>retryAdapter.submit(baseDraft,{supabaseClient:transient.client,photos:[photo()],onCheckpoint:draft=>{checkpoint=draft;}}),error=>Boolean(error instanceof SubmissionError&&error.code==='photo_upload_failed'&&error.recoveryDraft?.submission?.idempotencyKey));
const retried=await retryAdapter.submit(checkpoint,{supabaseClient:transient.client,photos:[photo()]});
assert.equal(transient.calls.invoke,2);assert.equal(transient.calls.idempotencyKeys[0],transient.calls.idempotencyKeys[1]);assert.equal(retried.codigo_temporal,'TPL-PUB-2026-123456');

// La misma idempotencia con contenido diferente recibe un conflicto específico.
const immutable=mockSupabase({failures:1,enforceImmutableManifest:true}),immutableAdapter=createSubmissionAdapter();let immutableCheckpoint;
const originalFile={file:new File([new Uint8Array([1,2,3])],'original.jpg',{type:'image/jpeg'})};
await assert.rejects(()=>immutableAdapter.submit(baseDraft,{supabaseClient:immutable.client,photos:[originalFile],onCheckpoint:draft=>{immutableCheckpoint=draft;}}),error=>error.code==='photo_upload_failed');
const changedFile={file:new File([new Uint8Array([3,2,1])],'cambiada.jpg',{type:'image/jpeg'})};
await assert.rejects(()=>immutableAdapter.submit(immutableCheckpoint,{supabaseClient:immutable.client,photos:[changedFile]}),error=>error.code==='manifest_conflict');
assert.equal(immutable.calls.idempotencyKeys[0],immutable.calls.idempotencyKeys[1]);

// Cambiar portada u orden después de reservar el manifiesto también es conflicto.
const coverImmutable=mockSupabase({failures:1,enforceImmutableManifest:true}),coverAdapter=createSubmissionAdapter();let coverCheckpoint;
const coverFiles=[photo('orden-1.jpg'),photo('orden-2.jpg')];
await assert.rejects(()=>coverAdapter.submit(baseDraft,{supabaseClient:coverImmutable.client,photos:coverFiles.map((item,index)=>({...item,cover:index===0})),onCheckpoint:draft=>{coverCheckpoint=draft;}}),error=>error.code==='photo_upload_failed');
await assert.rejects(()=>coverAdapter.submit(coverCheckpoint,{supabaseClient:coverImmutable.client,photos:coverFiles.map((item,index)=>({...item,cover:index===1}))}),error=>error.code==='manifest_conflict');

// Un doble clic comparte una sola invocación en curso.
const delayed=mockSupabase({delay:20}),doubleAdapter=createSubmissionAdapter();
const [first,second]=await Promise.all([doubleAdapter.submit(baseDraft,{supabaseClient:delayed.client,photos:[photo()]}),doubleAdapter.submit(baseDraft,{supabaseClient:delayed.client,photos:[photo()]})]);
assert.equal(delayed.calls.invoke,1);assert.equal(first.codigo_temporal,second.codigo_temporal);

// Gold revisa el resultado antes de finalizar; el segundo envío reutiliza publicación e idempotencia.
const visualResult={status:'completed',model:'modelo-prueba',suggestions:{description:'Descripción visual.',visibleFeatures:['Pradera visible'],coverOrder:0}};
const visualMock=mockSupabase({visualAnalysis:visualResult,enforceImmutableManifest:true}),visualAdapter=createSubmissionAdapter();
const goldDraft={...baseDraft,tipoPublicador:'corredor',planCorredor:'gold',correoCorredor:'corredor@example.cl',analisisVisual:{consent:true,reviewStatus:null,acceptedSuggestions:null}};
const pendingReview=await visualAdapter.submit(goldDraft,{supabaseClient:visualMock.client,photos:[photo()]});
assert.equal(pendingReview.submission.status,'revision_ia_pendiente');assert.equal(pendingReview.submission.visualAnalysis.suggestions.coverOrder,0);
const reviewed={...pendingReview,analisisVisual:{consent:true,reviewStatus:'edited',acceptedSuggestions:{description:'Descripción corregida.',visibleFeatures:['Pradera visible'],coverOrder:0}}};
const completedReview=await visualAdapter.submit(reviewed,{supabaseClient:visualMock.client,photos:[photo()]});
assert.equal(completedReview.submission.status,'pendiente_revision');assert.equal(visualMock.calls.invoke,2);
assert.equal(visualMock.calls.idempotencyKeys[0],visualMock.calls.idempotencyKeys[1]);
assert.equal(visualMock.calls.payloads[1].analisisVisual.reviewStatus,'edited');
assert.equal(visualMock.calls.payloads[1].analisisVisual.acceptedSuggestions.description,'Descripción corregida.');

// Límites finales antes de enviar. No existe máximo individual adicional.
const meta=(name,size,type='image/jpeg',cover=false)=>({file:{name,size,type},cover});
assert.equal(normalizeSubmissionPhotos([meta('una-20mb.jpg',20*MB)]).length,1);
assert.equal(normalizeSubmissionPhotos([meta('a-10mb.jpg',10*MB),meta('b-10mb.jpg',10*MB)]).length,2);
assert.equal(normalizeSubmissionPhotos(Array.from({length:12},(_,i)=>meta(`foto-${i}.webp`,Math.floor(20*MB/12),'image/webp'))).length,12);
assert.equal(normalizeSubmissionPhotos([meta('exacta.jpg',20*MB)]).length,1);
assert.throws(()=>normalizeSubmissionPhotos(Array.from({length:13},(_,i)=>meta(`foto-${i}.jpg`,1))),error=>error.code==='too_many_photos');
assert.throws(()=>normalizeSubmissionPhotos([meta('supera.jpg',20*MB+1)]),error=>error.code==='photos_total_too_large');
assert.throws(()=>normalizeSubmissionPhotos([meta('archivo.gif',100,'image/gif')]),error=>error.code==='invalid_photo_type');
assert.throws(()=>normalizeSubmissionPhotos([]),error=>error.code==='missing_photos');

// Orden y portada viajan al manifiesto de la Edge Function.
const ordered=mockSupabase();await createSubmissionAdapter().submit(baseDraft,{supabaseClient:ordered.client,photos:[photo('primera.jpg'),photo('portada.jpg'),photo('tercera.jpg')].map((item,index)=>({...item,cover:index===1}))});
assert.equal(ordered.calls.photoCounts[0],3);assert.equal(ordered.calls.coverIndexes[0],'1');

// Contrato estático de migraciones y Edge Function.
const migrations=new URL('../../supabase/migrations/',import.meta.url);
const schemaSql=await readFile(new URL('202607130001_crear_publicaciones.sql',migrations),'utf8');
const storageSql=await readFile(new URL('202607130002_crear_storage_publicaciones.sql',migrations),'utf8');
const policiesSql=await readFile(new URL('202607130003_crear_politicas_rls.sql',migrations),'utf8');
const photosV2Sql=await readFile(new URL('202607130004_ampliar_fotografias_publicaciones.sql',migrations),'utf8');
for(const table of ['publicaciones','publicacion_borradores','publicacion_fotos','moderacion_registros']){
 assert.match(schemaSql,new RegExp(`create table public\\.${table}`));assert.match(schemaSql,new RegExp(`alter table public\\.${table} enable row level security`));
}
assert.match(schemaSql,/publicaciones_idempotency_key_unique unique \(idempotency_key\)/);assert.match(schemaSql,/publicacion_fotos_publicacion_orden_unique unique \(publicacion_id, orden\)/);
assert.match(schemaSql,/p_idempotency_key uuid/);assert.match(schemaSql,/p_fotos jsonb/);assert.match(schemaSql,/exception when unique_violation/);
assert.match(schemaSql,/security definer/i);assert.match(schemaSql,/set search_path = pg_catalog/i);assert.doesNotMatch(schemaSql,/set search_path = pg_catalog, public/i);assert.match(schemaSql,/publicacion_fotos_ruta_publicacion/);
assert.match(schemaSql,/contenido_sha256 text not null/);assert.match(schemaSql,/MANIFEST_CONFLICT/);assert.match(schemaSql,/MANIFEST_DUPLICATE_ORDER/);
for(const field of ['pf\.orden','pf\.mime_type','pf\.tamano_bytes','pf\.contenido_sha256'])assert.match(schemaSql,new RegExp(field));
assert.match(schemaSql,/count\(distinct value->>'orden'\)/);assert.match(schemaSql,/count\(\*\).*public\.publicacion_fotos/);
assert.match(schemaSql,/if found then[\s\S]*return query select v_id, v_codigo, v_creado;[\s\S]*return;[\s\S]*end if;[\s\S]*loop/);
assert.match(schemaSql,/insert into public\.publicacion_fotos/);assert.match(schemaSql,/jsonb_array_length\(p_fotos\) > 6/);
assert.match(storageSql,/publicaciones-pendientes/);assert.match(storageSql,/public\s*=\s*false/);assert.match(storageSql,/2097152/);
assert.doesNotMatch(policiesSql,/create policy/i);assert.doesNotMatch(policiesSql,/grant (select|insert|update|delete).*anon/i);
assert.match(policiesSql,/revoke all on storage\.objects from anon, authenticated/);
assert.match(policiesSql,/grant execute on function public\.crear_publicacion_pendiente\(jsonb, uuid, jsonb\) to service_role/);
assert.match(photosV2Sql,/rename to crear_publicacion_pendiente_v1/);assert.match(photosV2Sql,/jsonb_array_length\(p_fotos\) > 12/);assert.match(photosV2Sql,/v_total_fotos > 20971520/);
assert.match(photosV2Sql,/file_size_limit = 20971520/);assert.match(photosV2Sql,/pf\.es_portada/);assert.match(photosV2Sql,/set search_path = pg_catalog/i);
assert.match(photosV2Sql,/revoke all on function public\.crear_publicacion_pendiente_v1[\s\S]*service_role/);assert.match(photosV2Sql,/grant execute on function public\.crear_publicacion_pendiente\(jsonb, uuid, jsonb\)[\s\S]*to service_role/);
assert.doesNotMatch(photosV2Sql,/grant execute[\s\S]{0,160}to (anon|authenticated)/i);

const serviceSource=await readFile(new URL('./submission-service.js',import.meta.url),'utf8');
assert.doesNotMatch(serviceSource,/\.storage\.|\.from\(|service[_-]?role|secret[_-]?key/i);assert.match(serviceSource,/functions\.invoke\('publicar-parcela'/);
const edgeSource=await readFile(new URL('../../supabase/functions/publicar-parcela/index.ts',import.meta.url),'utf8');
const uploadLogicSource=await readFile(new URL('../../supabase/functions/publicar-parcela/upload-logic.mjs',import.meta.url),'utf8');
const supabaseConfig=await readFile(new URL('../../supabase/config.toml',import.meta.url),'utf8');
assert.match(supabaseConfig,/\[functions\.publicar-parcela\][\s\S]*verify_jwt = false/);
assert.match(edgeSource,/MAX_PHOTOS=12/);assert.match(edgeSource,/MAX_TOTAL_PHOTO_BYTES=20\*1024\*1024/);assert.match(edgeSource,/MAX_REQUEST_BYTES=22\*1024\*1024/);assert.doesNotMatch(edgeSource,/MAX_PHOTO_BYTES/);
assert.match(edgeSource,/cover_index/);assert.match(edgeSource,/es_portada:index===coverIndex/);
assert.match(edgeSource,/SUPABASE_PUBLISHABLE_KEYS/);assert.match(edgeSource,/publicKeys\(\)\.has\(apiKey\)/);
assert.match(edgeSource,/sha256Hex/);assert.match(edgeSource,/deterministicPhotoUuid/);assert.match(edgeSource,/p_fotos:manifest/);
assert.match(edgeSource,/uploadMissingPhotos/);assert.match(edgeSource,/allowedOrigins\(\)\.has\(origin\)/);assert.match(edgeSource,/TPL_ALLOWED_ORIGINS/);
assert.match(edgeSource,/MANIFEST_CONFLICT/);assert.match(edgeSource,/MANIFEST_DUPLICATE_ORDER/);
assert.doesNotMatch(edgeSource+uploadLogicSource,/console\.(log|info|warn|error)|file\.name/);
assert.doesNotMatch(edgeSource,/admin\.from\('publicacion_fotos'\)/);assert.doesNotMatch(edgeSource,/ignoreDuplicates:true/);

const uiSource=await readFile(new URL('./publicar-parcela.js',import.meta.url),'utf8');
assert.match(uiSource,/En revisión · Supabase/);assert.match(uiSource,/Respaldo local · solo desarrollo/);

console.log('OK: Edge Function única, idempotencia UNIQUE, límites, nombres servidor y cero políticas anon.');
