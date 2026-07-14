const DEFAULT_GEOCODER='https://nominatim.openstreetmap.org/search';
const LEAFLET_VERSION='1.9.4';
const searchCache=new Map();
let lastSearchAt=0;

export const DEFAULT_CHILE_CENTER=Object.freeze({latitude:-36.82,longitude:-73.05});

export function normalizeCoordinates(value){
 const coordinates={latitude:Number(value?.latitude),longitude:Number(value?.longitude)};
 return Number.isFinite(coordinates.latitude)&&coordinates.latitude>=-90&&coordinates.latitude<=90&&Number.isFinite(coordinates.longitude)&&coordinates.longitude>=-180&&coordinates.longitude<=180?coordinates:null;
}

export function coordinatesToGoogleMapsLink(value){
 const coordinates=normalizeCoordinates(value);if(!coordinates)return '';
 return `https://www.google.com/maps?q=${coordinates.latitude.toFixed(6)},${coordinates.longitude.toFixed(6)}`;
}

export function approximateCoordinateLabel(value){
 const coordinates=normalizeCoordinates(value);if(!coordinates)return 'Ubicación aproximada por definir';
 return `Referencia aproximada: ${coordinates.latitude.toFixed(3)}, ${coordinates.longitude.toFixed(3)}`;
}

export function requestBrowserCoordinates({geolocation=globalThis.navigator?.geolocation,timeout=12000}={}){
 return new Promise((resolve,reject)=>{
  if(!geolocation?.getCurrentPosition){reject(Object.assign(new Error('geolocation_unsupported'),{code:'unsupported'}));return;}
  geolocation.getCurrentPosition(position=>{
   const coordinates=normalizeCoordinates({latitude:position?.coords?.latitude,longitude:position?.coords?.longitude});
   if(coordinates)resolve(coordinates);else reject(Object.assign(new Error('geolocation_invalid'),{code:'invalid'}));
  },error=>reject(Object.assign(new Error('geolocation_failed'),{code:error?.code===1?'denied':'failed'})),{enableHighAccuracy:true,timeout,maximumAge:0});
 });
}

export async function searchChileLocation(query,{fetchImpl=fetch,endpoint=globalThis.TPL_MAP_CONFIG?.geocoderUrl||DEFAULT_GEOCODER,now=Date.now}={}){
 const normalized=String(query||'').trim();if(normalized.length<2)throw new Error('search_query_too_short');
 const cacheKey=normalized.toLocaleLowerCase('es-CL');if(searchCache.has(cacheKey))return searchCache.get(cacheKey);
 const elapsed=now()-lastSearchAt;if(elapsed<1000)throw new Error('search_rate_limited');lastSearchAt=now();
 const url=new URL(endpoint);url.searchParams.set('format','jsonv2');url.searchParams.set('countrycodes','cl');url.searchParams.set('limit','5');url.searchParams.set('accept-language','es');url.searchParams.set('q',normalized);
 const response=await fetchImpl(url,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error('search_unavailable');
 const raw=await response.json(),results=(Array.isArray(raw)?raw:[]).map(item=>({label:String(item.display_name||'').trim(),coordinates:normalizeCoordinates({latitude:item.lat,longitude:item.lon})})).filter(item=>item.label&&item.coordinates);
 searchCache.set(cacheKey,results);return results;
}

export function ensureLeaflet(){
 if(globalThis.L?.map)return Promise.resolve(globalThis.L);
 if(globalThis.__tplLeafletPromise)return globalThis.__tplLeafletPromise;
 globalThis.__tplLeafletPromise=new Promise((resolve,reject)=>{
  if(!document.querySelector('link[data-tpl-leaflet]')){const css=document.createElement('link');css.rel='stylesheet';css.href=`https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;css.crossOrigin='';css.dataset.tplLeaflet='true';document.head.append(css);}
  const existing=document.querySelector('script[data-tpl-leaflet]');if(existing){existing.addEventListener('load',()=>resolve(globalThis.L),{once:true});existing.addEventListener('error',()=>reject(new Error('map_library_unavailable')),{once:true});return;}
  const script=document.createElement('script');script.src=`https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;script.crossOrigin='';script.dataset.tplLeaflet='true';script.onload=()=>globalThis.L?.map?resolve(globalThis.L):reject(new Error('map_library_unavailable'));script.onerror=()=>reject(new Error('map_library_unavailable'));document.head.append(script);
 });
 return globalThis.__tplLeafletPromise;
}
