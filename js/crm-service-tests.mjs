import assert from 'node:assert/strict';
import {CRM_PHOTO_URL_TTL_SECONDS,loadModerationDetail,loadModerationInbox,manageVisualAnalysisPlan,moderatePublication,requestMagicLink,requireAdminSession} from './crm-service.js';

const calls=[];
const client={
 auth:{getSession:async()=>({data:{session:{user:{id:'admin-test'}}},error:null}),signInWithOtp:async payload=>{calls.push(['otp',payload]);return {error:null};}},
 rpc:async(name,args)=>{calls.push([name,args]);if(name==='crm_sesion_actual')return {data:[{usuario_id:'admin-test',nombre:'Admin prueba',tipo:'administrador'}]};if(name==='crm_contadores_publicaciones')return {data:{pendientes:1,requieren_correccion:2,aprobadas:3,rechazadas:4}};if(name==='crm_listar_publicaciones')return {data:[{id:'pub-test'}]};if(name==='crm_detalle_publicacion')return {data:{publicacion:{id:'pub-test'},fotos:[{bucket_id:'publicaciones-pendientes',storage_path:'pub-test/foto.jpg'}]}};if(name==='crm_estado_plan_ia')return {data:{plan_solicitado:'gold',elegible:true,entitlement_activo:false}};if(name==='crm_moderar_publicacion')return {data:{estado_nuevo:args.p_accion==='aprobar'?'aprobada':'requiere_cambios'}};if(name==='crm_gestionar_plan_ia')return {data:{plan:'gold',estado_nuevo:args.p_accion==='confirmar'?'activo':'revocado'}};return {error:{message:'unexpected'}};},
 storage:{from:bucket=>({createSignedUrl:async(path,ttl)=>{calls.push(['signed',bucket,path,ttl]);return {data:{signedUrl:'https://signed.example/photo'},error:null};}})}
};

assert.equal((await requireAdminSession(client)).tipo,'administrador');
await requestMagicLink(client,'ADMIN@EXAMPLE.CL','https://example.cl/CRM.html');assert.equal(calls.find(call=>call[0]==='otp')[1].options.shouldCreateUser,false);
const inbox=await loadModerationInbox(client,{estado:'pendiente_revision',comuna:'Florida'});assert.equal(inbox.counts.pendientes,1);assert.equal(inbox.items.length,1);
const detail=await loadModerationDetail(client,'pub-test');assert.equal(detail.fotos[0].expiresIn,300);assert.equal(detail.planIa.plan_solicitado,'gold');assert.equal(CRM_PHOTO_URL_TTL_SECONDS,300);
const decision=await moderatePublication(client,{publicationId:'pub-test',action:'aprobar',confirm:true});assert.equal(decision.estado_nuevo,'aprobada');
assert.deepEqual(calls.find(call=>call[0]==='crm_moderar_publicacion')[1].p_confirmar,true);
await moderatePublication(client,{publicationId:'pub-test',action:'solicitar_correcciones',reason:'Corregir superficie',fields:['superficie_m2'],message:'Revisa el dato.'});
await moderatePublication(client,{publicationId:'pub-test',action:'rechazar',reason:'Información inconsistente',category:'Contenido no apto',confirm:true});
await moderatePublication(client,{publicationId:'pub-test',action:'revertir_rechazo',reason:'Nueva evidencia administrativa',confirm:true});
const moderationCalls=calls.filter(call=>call[0]==='crm_moderar_publicacion').map(call=>call[1]);assert.deepEqual(moderationCalls.map(call=>call.p_accion),['aprobar','solicitar_correcciones','rechazar','revertir_rechazo']);assert.deepEqual(moderationCalls[1].p_campos_correccion,['superficie_m2']);
assert.equal((await manageVisualAnalysisPlan(client,{publicationId:'pub-test',action:'confirmar',reason:'Contratación Gold confirmada'})).estado_nuevo,'activo');
assert.equal((await manageVisualAnalysisPlan(client,{publicationId:'pub-test',action:'revocar',reason:'Activación administrativa errónea'})).estado_nuevo,'revocado');
await assert.rejects(()=>manageVisualAnalysisPlan(client,{publicationId:'pub-test',action:'forzar',reason:'No permitido'}),/crm_ai_action_invalid/);
await assert.rejects(()=>manageVisualAnalysisPlan({...client,rpc:async()=>({error:{message:'CRM_ACCESS_DENIED'}})},{publicationId:'pub-test',action:'confirmar',reason:'Intento sin autorización'}),/crm_ai_management_failed/);
await assert.rejects(()=>requireAdminSession({auth:{getSession:async()=>({data:{session:{}},error:null})},rpc:async()=>({error:{message:'denied'}})}),/crm_access_denied/);
await assert.rejects(()=>requestMagicLink(client,'no-es-correo','https://example.cl/CRM.html'),/crm_email_invalid/);
await assert.rejects(()=>loadModerationDetail({...client,storage:{from:()=>({createSignedUrl:async()=>({error:{message:'denied'}})})}},'pub-test'),/crm_signed_url_failed/);
console.log('OK: acceso admin, moderación, activación/revocación IA y signed URLs temporales.');
