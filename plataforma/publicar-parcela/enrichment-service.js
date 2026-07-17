export const ENRICHMENT_STATUS={SUGGESTED:'suggested',ACCEPTED:'accepted',EDITED:'edited',REJECTED:'rejected'};
export async function suggestPublicEnrichment(data={}){
 const location=[data.comuna,data.region].filter(Boolean).join(', ');const lines=[];
 if(data.ciudadPrincipal)lines.push(`Ciudad principal cercana informada: ${data.ciudadPrincipal}${data.distanciaCiudad?` a aproximadamente ${data.distanciaCiudad}`:''}.`);
 if(location)lines.push(`La ubicación comunal indicada es ${location}.`);
 return {status:ENRICHMENT_STATUS.SUGGESTED,text:lines.join(' '),city:data.ciudadPrincipal||'',distance:data.distanciaCiudad||'',mainRoutes:[],communeServices:[],attractions:[],sources:[],consultedAt:null,confidence:'baja',provider:'mock-local-v1'};
}
export const enrichmentProvider={id:'mock-local-v1',suggest:suggestPublicEnrichment};

