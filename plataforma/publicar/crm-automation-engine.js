(()=>{
'use strict';
const KEYS={owners:'tpl_crm_propietarios_v1',properties:'tpl_crm_propiedades_v1',events:'tpl_crm_eventos_v1',queue:'tpl_automation_queue_v1'};
const now=()=>new Date().toISOString();
const read=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const uuid=()=>globalThis.crypto?.randomUUID?.()||`tpl-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
const normalize=s=>String(s||'').trim().toLowerCase();
const ownerKey=c=>normalize(c.email)||normalize(c.telefono)||normalize(c.nombre)||uuid();

function emit(type,data={},meta={}){
  const event={id:uuid(),type,at:now(),source:meta.source||'publicador',actor:meta.actor||'usuario_web',entityType:meta.entityType||null,entityId:meta.entityId||data.propertyId||data.publicationCode||null,data};
  const events=read(KEYS.events);events.unshift(event);write(KEYS.events,events.slice(0,2000));
  window.dispatchEvent(new CustomEvent('tpl:event',{detail:event}));
  return event;
}
function ensureOwner(contact={}){
  const owners=read(KEYS.owners);const key=ownerKey(contact);
  let owner=owners.find(o=>o.identityKey===key);
  if(!owner){owner={id:uuid(),identityKey:key,createdAt:now(),updatedAt:now(),status:'activo',roles:[contact.tipo||'propietario'],contact:{...contact},propertyIds:[],history:[]};owners.push(owner);emit('CLIENTE_CREADO',{ownerId:owner.id},{entityType:'owner',entityId:owner.id});}
  else{owner.contact={...owner.contact,...contact};owner.updatedAt=now();if(contact.tipo&&!owner.roles.includes(contact.tipo))owner.roles.push(contact.tipo);emit('CLIENTE_ACTUALIZADO',{ownerId:owner.id},{entityType:'owner',entityId:owner.id});}
  write(KEYS.owners,owners);return owner;
}
function createPropertyDossier(publication,result={}){
  const owner=ensureOwner(publication.contacto||{});const properties=read(KEYS.properties);
  const propertyId=publication.id||publication.codigo||uuid();
  let dossier=properties.find(p=>p.id===propertyId||p.publicationCode===publication.codigo);
  const status=result.mode==='remote'?'pendiente_revision':'borrador_local';
  const snapshot={...publication,id:propertyId,ownerId:owner.id,publicationCode:publication.codigo,status,remoteId:result.publication?.id||null,updatedAt:now()};
  if(!dossier){dossier={id:propertyId,publicationCode:publication.codigo,ownerId:owner.id,createdAt:now(),updatedAt:now(),status,current:snapshot,versions:[{id:uuid(),at:now(),reason:'creacion',snapshot}],timeline:[],commercial:{visits:0,leads:0,reservations:0},automation:{pending:[],completed:[]}};properties.push(dossier);}
  else{dossier.current=snapshot;dossier.status=status;dossier.updatedAt=now();dossier.versions.unshift({id:uuid(),at:now(),reason:'actualizacion',snapshot});}
  if(!owner.propertyIds.includes(propertyId))owner.propertyIds.push(propertyId);owner.updatedAt=now();
  const owners=read(KEYS.owners);const idx=owners.findIndex(o=>o.id===owner.id);if(idx>=0)owners[idx]=owner;write(KEYS.owners,owners);
  write(KEYS.properties,properties);
  emit('EXPEDIENTE_PROPIEDAD_CREADO',{propertyId,publicationCode:publication.codigo,ownerId:owner.id,status},{entityType:'property',entityId:propertyId});
  return dossier;
}
function queueTask(type,payload,options={}){
  const queue=read(KEYS.queue);const task={id:uuid(),type,status:'pendiente',createdAt:now(),attempts:0,maxAttempts:options.maxAttempts||3,nextRunAt:options.nextRunAt||now(),payload,lastError:null};queue.push(task);write(KEYS.queue,queue);emit('AUTOMATIZACION_ENCOLADA',{taskId:task.id,type,propertyId:payload.propertyId},{entityType:'automation',entityId:task.id});return task;
}
function schedulePublicationAutomations(dossier,publication,result={}){
  const common={propertyId:dossier.id,publicationCode:publication.codigo,ownerId:dossier.ownerId};
  const tasks=[
    queueTask('REGISTRAR_BITACORA',{...common,event:'PUBLICACION_CREADA'}),
    queueTask('CALCULAR_TASACION',{...common,valuation:publication.tasacion||null}),
    queueTask('ASIGNAR_EJECUTIVO',{...common,region:publication.propiedad?.region,comuna:publication.propiedad?.comuna}),
    queueTask('NOTIFICAR_ADMINISTRADOR',{...common,status:dossier.status}),
    queueTask('PREPARAR_SEGUIMIENTO_COMERCIAL',{...common,urgency:publication.comercial?.urgencia,plan:publication.plan?.id})
  ];
  if(result.mode==='remote')tasks.push(queueTask('CONFIRMAR_SINCRONIZACION_REMOTA',{...common,remoteId:result.publication?.id||null}));
  const properties=read(KEYS.properties);const item=properties.find(p=>p.id===dossier.id);if(item){item.automation.pending.push(...tasks.map(t=>t.id));item.updatedAt=now();write(KEYS.properties,properties);}return tasks;
}
function registerPublication(publication,result={}){
  const dossier=createPropertyDossier(publication,result);const tasks=schedulePublicationAutomations(dossier,publication,result);
  emit('PUBLICACION_REGISTRADA_EN_CRM',{propertyId:dossier.id,publicationCode:publication.codigo,ownerId:dossier.ownerId,tasks:tasks.length,status:dossier.status},{entityType:'property',entityId:dossier.id});
  return{dossier,tasks};
}
function listDashboard(){const properties=read(KEYS.properties),owners=read(KEYS.owners),events=read(KEYS.events),queue=read(KEYS.queue);return{totals:{properties:properties.length,owners:owners.length,pendingReview:properties.filter(p=>p.status==='pendiente_revision').length,pendingTasks:queue.filter(t=>t.status==='pendiente').length},properties,owners,events,queue};}
function updateStatus(propertyId,status,reason='actualizacion_manual'){
  const properties=read(KEYS.properties);const dossier=properties.find(p=>p.id===propertyId);if(!dossier)throw new Error('Expediente no encontrado');const previous=dossier.status;dossier.status=status;dossier.current.status=status;dossier.updatedAt=now();dossier.timeline.unshift({id:uuid(),at:now(),type:'CAMBIO_ESTADO',from:previous,to:status,reason});write(KEYS.properties,properties);emit('PUBLICACION_ESTADO_CAMBIADO',{propertyId,from:previous,to:status,reason},{entityType:'property',entityId:propertyId});return dossier;
}
window.TPLCRM={registerPublication,ensureOwner,createPropertyDossier,queueTask,emit,listDashboard,updateStatus,keys:KEYS};
window.TPL=window.TPL||{};window.TPL.crm=window.TPLCRM;
})();
