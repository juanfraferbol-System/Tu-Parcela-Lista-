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


// ==========================================
// SIMULADOR DE INTELIGENCIA ARTIFICIAL
// ==========================================
export async function simulateAIEnrichment(data, withPremiumFeatures = false) {
  return new Promise((resolve) => {
    setTimeout(() => {
      let description = `Descubre tu próximo refugio natural. Esta hermosa parcela de ${data.superficie || '5000'} m² te recibe con un entorno inigualable, ideal para quienes buscan paz y conexión con la naturaleza.`;
      
      if (data.naturaleza && data.naturaleza.length > 0) {
        description += ` Destaca por su imponente ${data.naturaleza.join(' y ')}, creando un ecosistema perfecto para tu proyecto de vida.`;
      }
      
      if (withPremiumFeatures) {
        description += `\n\n🌟 **Potencial de Inversión (IA):** Esta zona en ${data.comuna || 'el sur'} presenta una alta plusvalía proyectada. Sus características la hacen ideal para construir la casa de tus sueños o cabañas de descanso.`;
      }
      
      const suggestedLat = -39.283 + (Math.random() * 0.1);
      const suggestedLng = -71.933 + (Math.random() * 0.1);
      
      resolve({
        enrichedDescription: description,
        suggestedCoordinates: { latitude: suggestedLat, longitude: suggestedLng }
      });
    }, 1500); // Simulando delay de red
  });
}
