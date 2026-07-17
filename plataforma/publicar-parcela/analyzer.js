import {CHILE_LOCATIONS} from './chile-locations.js';
const NUMBER_WORDS = { un:1, uno:1, una:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9, diez:10, once:11, doce:12, quince:15, veinte:20, treinta:30, cuarenta:40, cincuenta:50 };
const LOCATIONS=CHILE_LOCATIONS.flatMap(({region,communes})=>communes.map(commune=>[region,commune]));

export function normalizeSpanish(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}

export function cleanVoiceTranscript(value){
  let text=String(value||'').replace(/\s+/g,' ').trim();
  const cautiousWords='tiene|y|o|con|de|la|el|que|una|un';
  text=text.replace(new RegExp(`\\b(${cautiousWords})\\s+\\1\\b`,'giu'),'$1');
  text=text.replace(/\b([\p{L}]+\s+[\p{L}]+(?:\s+[\p{L}]+)?)\s+\1\b/giu,'$1');
  return text.replace(/\s+([,.;:])/g,'$1').trim();
}

export function extractSurface(text){
  const n=normalizeSpanish(text);
  if(/media\s+hectarea/.test(n))return 5000;
  const hw=n.match(/\b(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+hectareas?\b/);if(hw)return NUMBER_WORDS[hw[1]]*10000;
  const hn=n.match(/\b(\d+(?:[.,]\d+)?)\s*(?:hectareas?|ha)\b/);if(hn)return Math.round(Number(hn[1].replace(',','.'))*10000);
  const tw=n.match(/\b(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|quince|veinte|treinta|cuarenta|cincuenta)\s+mil\s+(?:metros|m2)\b/);if(tw)return NUMBER_WORDS[tw[1]]*1000;
  const mn=n.match(/\b(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*(?:metros cuadrados|metros|m2)\b/);return mn?Number(mn[1].replace(/[.\s]/g,'')):null;
}

const first=(text,rules)=>{const found=rules.find(([pattern])=>pattern.test(text));return found?found[1]:null;};
const capture=(text,pattern)=>text.match(pattern)?.[1]?.trim()||null;

export function analyzeParcelText(value){
  const original=cleanVoiceTranscript(value);const n=normalizeSpanish(original);
  const location=LOCATIONS.map(item=>({item,index:n.indexOf(normalizeSpanish(item[1]))})).filter(match=>match.index>=0).sort((a,b)=>a.index-b.index)[0]?.item;
  const regionMention=LOCATIONS.map(([region])=>region).find(region=>n.includes(normalizeSpanish(region)));
  const sector=capture(original,/(?:sector|localidad|camino)\s+([\p{L}\d -]{3,35})(?=[,.]|\s+(?:de|con|tiene|a)\b)/iu);
  const priceMatch=n.match(/(?:precio|vendo|valor|pido|esperado)[^\d]{0,18}\$?\s*(\d{1,3}(?:[.\s]\d{3})+|\d{6,})/);
  const distanceMatch=n.match(/(?:a|queda a|ubicad[ao] a)\s*(\d+)\s*(kilometros|km|minutos?)\s+(?:de|del)\s+([\p{L} ]{3,30}?)(?=,|\.|\s+y\s+|$)/u);
  const nature=[['Bosque nativo',/bosque nativo/],['Pinos',/\bpinos?\b/],['Eucaliptos',/eucaliptos?/],['Pradera',/pradera|empastada/],['Vegetación mixta',/vegetacion mixta/],['Sin vegetación destacada',/sin vegetacion/]].filter(([,p])=>p.test(n)).map(([label])=>label);
  const waters=[['Arroyo',/\barroyo\b/],['Río',/\brio\b/],['Estero',/\bestero\b/],['Vertiente',/vertiente/],['Laguna',/laguna/]].filter(([,p])=>p.test(n)).map(([label])=>label);
  const services=[['Educación',/escuela|colegio/],['Comercio',/supermercado|comercio|negocios/],['Salud',/posta|cesfam|hospital/],['Locomoción',/locomocion|bus|transporte/],['Servicios públicos',/municipalidad|registro civil|servicios publicos/]].filter(([,p])=>p.test(n)).map(([label])=>label);
  const role=first(n,[[/\b(sin rol|no tiene rol)\b/,'cesion'],[/rol en tramite|tramitando el rol/,'tramite'],[/\b(tiene rol|rol propio|con rol)\b/,'propio']]);
  const water=first(n,[[/agua (?:de )?pozo|pozo profundo/,'pozo'],[/agua de vertiente|vertiente propia/,'vertiente'],[/\bapr\b|agua potable|agua conectada/,'conectada'],[/factibilidad de agua|agua cercana/,'factibilidad'],[/sin agua/,'sin']]);
  const light=first(n,[[/luz en el camino|luz cercana|factibilidad de luz|electricidad cerca/,'factibilidad'],[/luz conectada|electricidad conectada|tiene luz/,'conectada'],[/panel(?:es)? solar(?:es)?|energia solar/,'solar'],[/sin luz|sin electricidad/,'sin']]);
  const access=first(n,[[/camino asfaltado|camino pavimentado|acceso pavimentado/,'pavimento'],[/camino de ripio|acceso de ripio|ripio/,'ripio'],[/camino interior/,'interior'],[/acceso (?:dificil|complejo)/,'complejo']]);
  const topography=first(n,[[/terreno plano|parcela plana|topografia plana/,'plana'],[/lomaje suave|topografia mixta|partes? plana/,'mixta'],[/pendiente pronunciada|mucha pendiente/,'pronunciada'],[/con pendiente|terreno inclinado/,'pendiente']]);
  const payment=first(n,[[/acepto cuotas|pago en cuotas|facilidad(?:es)? de pago/,'Pago en cuotas conversable'],[/credito directo|financiamiento directo/,'Financiamiento directo'],[/solo contado|pago al contado/,'Pago al contado']]);
  return {
    region:location?.[0]||regionMention||null,comuna:location?.[1]||null,sector,superficie:extractSurface(original),
    precio:priceMatch?Number(priceMatch[1].replace(/[.\s]/g,'')):null,rol:role,agua:water,luz:light,acceso:access,topografia:topography,
    naturaleza:nature.join(', ')||null,aguaNatural:waters.join(', ')||null,serviciosCercanos:services.join(', ')||null,
    distancia:distanceMatch?`${distanceMatch[1]} ${distanceMatch[2]}`:null,ciudadPrincipal:distanceMatch?.[3]?.trim()||null,facilidadPago:payment,
    descripcionPublica:original||null
  };
}

