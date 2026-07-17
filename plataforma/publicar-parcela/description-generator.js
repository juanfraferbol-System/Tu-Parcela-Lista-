const humanList=values=>values.filter(Boolean).join(', ').replace(/, ([^,]*)$/,values.length>1?' y $1':'$1');
export function generatePublicDescription(data={}){
  const location=humanList([data.sector,data.comuna,data.region]);
  const opening=`Parcela${data.superficie?` de ${Number(data.superficie).toLocaleString('es-CL')} m²`:''}${location?` ubicada en ${location}`:''}.`;
  const details=[];
  if(data.naturaleza?.length)details.push(`Su entorno destaca por ${humanList(data.naturaleza.map(value=>String(value).toLowerCase()))}.`);
  if(data.cuerposAgua?.length)details.push(`Cuenta con ${humanList(data.cuerposAgua.map(value=>String(value).toLowerCase()))}.`);
  const infrastructure=[data.agua&&`agua: ${data.agua}`,data.luz&&`electricidad: ${data.luz}`,data.acceso&&`acceso: ${data.acceso}`,data.rol&&`rol: ${data.rol}`,data.topografia&&`topografía: ${data.topografia}`].filter(Boolean);
  if(infrastructure.length)details.push(`Información principal: ${infrastructure.join('; ')}.`);
  if(data.ciudadPrincipal)details.push(`Se encuentra aproximadamente a ${data.distanciaCiudad||'una distancia por confirmar'} de ${data.ciudadPrincipal}.`);
  if(data.servicios?.length)details.push(`Servicios cercanos: ${humanList(data.servicios)}.`);
  if(data.facilidadPago==='si')details.push(data.detalleFacilidad?`Existe facilidad de pago: ${data.detalleFacilidad}.`:'Existe posibilidad de facilidad de pago.');
  return [opening,...details].join('\n\n').replace(/\s+/g,' ').replace(/\.\s+/g,'.\n\n').trim();
}

export function shouldConfirmDescriptionRegeneration({modified=false,current='',lastGenerated=''}={}){
  return Boolean(modified&&String(current).trim()&&String(current)!==String(lastGenerated));
}

// Contrato local preparado para sustituir esta implementación por una fuente remota.
export const descriptionProvider={id:'local-rules-v1',generate:generatePublicDescription};

