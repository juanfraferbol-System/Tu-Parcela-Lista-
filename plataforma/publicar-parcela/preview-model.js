import {ASESOR_TPL} from './responsible-config.js';
const unique=values=>[...new Set(values.filter(Boolean))];
export function buildPreviewBadges(data={}){
 const characteristic=data.rol==='propio'?'Con rol':data.luz==='conectada'?'Con luz':data.luz==='factibilidad'?'Luz cercana':data.naturaleza?.[0]||'';
 const commercial=data.facilidadPago==='si'?'Facilidad de pago':data.ciudadPrincipal?`Cerca de ${data.ciudadPrincipal}`:'';
 return unique([data.comuna,data.superficie?`${Number(data.superficie).toLocaleString('es-CL')} m²`:'',characteristic,commercial]).slice(0,4);
}
export function buildWhatsappMessage(title=''){return `Hola, vi la parcela "${String(title||'Parcela')}" en Tu Parcela Lista y quisiera recibir más información.`;}
export function buildResponsible(type,data={}){
 if(type==='corredor')return {responsable_tipo:'corredor',responsable_id:data.id||'broker-local',responsable_nombre:data.corredoraNombre||data.representanteNombre||'Corredor responsable',responsable_whatsapp:data.whatsappCorredor||data.telefonoCorredor||'',responsable_email:data.correoCorredor||'',responsable_foto:data.foto||'',responsable_cargo:'Corredor responsable',responsable_tiempo_respuesta:'Sin información suficiente'};
 return {responsable_tipo:'asesor_tpl',responsable_id:ASESOR_TPL.id,responsable_nombre:ASESOR_TPL.nombre,responsable_whatsapp:ASESOR_TPL.whatsapp,responsable_email:ASESOR_TPL.email,responsable_foto:ASESOR_TPL.foto,responsable_cargo:ASESOR_TPL.cargo,responsable_tiempo_respuesta:ASESOR_TPL.tiempoRespuesta};
}
export function whatsappUrl(number,title){const raw=String(number||'');const destination=/x/i.test(raw)?raw:raw.replace(/\D/g,'');return `https://wa.me/${destination}?text=${encodeURIComponent(buildWhatsappMessage(title))}`;}
export function createVisitRequest(values={},responsible={},options={}){
 return {id:options.id||`visit-${Date.now()}`,createdAt:options.createdAt||new Date().toISOString(),responsable_tipo:responsible.responsable_tipo||'',responsable_id:responsible.responsable_id||'',responsable_nombre:responsible.responsable_nombre||'',nombre:String(values.nombre||'').trim(),telefono:String(values.telefono||'').trim(),correo:String(values.correo||'').trim(),fechaPreferida:String(values.fechaPreferida||''),horario:String(values.horario||''),mensaje:String(values.mensaje||'').trim(),estado:'simulada_local'};
}
