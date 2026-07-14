import {generatePublicDescription,shouldConfirmDescriptionRegeneration} from './description-generator.js';
const clipTitle=value=>{const text=String(value||'').replace(/\s+/g,' ').trim();if(text.length<=70)return text;return `${text.slice(0,67).replace(/\s+\S*$/,'')}…`;};
export function generatePublicTitle(data={}){
 const surface=data.superficie?`${Number(data.superficie).toLocaleString('es-CL')} m²`:'';
 const nature=(data.naturaleza||[]).find(value=>!/sin vegetación/i.test(value));
 const place=data.comuna||data.sector||data.region||'';
 const feature=nature?`con ${String(nature).toLowerCase()}`:data.topografia?`${String(data.topografia).toLowerCase()}`:data.agua&&data.luz?'con agua y luz':'';
 const candidates=[surface&&feature&&place&&`Parcela de ${surface} ${feature} en ${place}`,surface&&place&&`Parcela de ${surface} en ${place}`,feature&&place&&`Parcela ${feature} en ${place}`,place&&`Parcela en ${place}`];
 return clipTitle(candidates.find(Boolean)||'Parcela por completar');
}
export function generateCommercialContent(data={}){return {titulo_publico:generatePublicTitle(data),descripcion_publica:generatePublicDescription(data),generator:'local-rules-v2'};}
export {shouldConfirmDescriptionRegeneration};
