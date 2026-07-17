import {hasPrivateCoordinates} from './photo-geolocation.js';

export const DEFAULT_CHILE_CENTER={latitude:-33.4489,longitude:-70.6693};
let leafletPromise=null,lastSearchAt=0;

export function approximateCoordinateLabel(coordinates){
 if(!hasPrivateCoordinates(coordinates))return 'Ubicación aproximada por confirmar';
 return `Referencia aproximada: ${Number(coordinates.latitude).toFixed(3)}, ${Number(coordinates.longitude).toFixed(3)}`;
}

export function coordinatesToGoogleMapsLink(coordinates){return hasPrivateCoordinates(coordinates)?`https://www.google.com/maps?q=${Number(coordinates.latitude).toFixed(7)},${Number(coordinates.longitude).toFixed(7)}`:'';}

export function requestBrowserCoordinates(options={}){
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation){reject(Object.assign(new Error('unsupported'),{code:'unsupported'}));return;}
  navigator.geolocation.getCurrentPosition(position=>{const coordinates={latitude:position.coords.latitude,longitude:position.coords.longitude};if(hasPrivateCoordinates(coordinates))resolve(coordinates);else reject(Object.assign(new Error('invalid'),{code:'invalid'}));},error=>reject(Object.assign(new Error(error.code===1?'denied':'invalid'),{code:error.code===1?'denied':'invalid'})),{enableHighAccuracy:true,timeout:12000,maximumAge:60000,...options});
 });
}

function addStylesheet(href){if(document.querySelector(`link[href="${href}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.crossOrigin='';document.head.append(link);}

export function ensureLeaflet(){
 if(globalThis.L)return Promise.resolve(globalThis.L);
 if(leafletPromise)return leafletPromise;
 const version='1.9.4',base=`https://unpkg.com/leaflet@${version}/dist/`;
 addStylesheet(`${base}leaflet.css`);
 leafletPromise=new Promise((resolve,reject)=>{const existing=document.querySelector(`script[src="${base}leaflet.js"]`),script=existing||document.createElement('script');const finish=()=>globalThis.L?resolve(globalThis.L):reject(new Error('leaflet_unavailable'));script.addEventListener('load',finish,{once:true});script.addEventListener('error',()=>reject(new Error('leaflet_unavailable')),{once:true});if(!existing){script.src=`${base}leaflet.js`;script.crossOrigin='';document.head.append(script);}else if(globalThis.L)finish();});
 return leafletPromise;
}

export async function searchChileLocation(query){
 const clean=String(query||'').trim();if(clean.length<2)throw new Error('search_query_too_short');
 const now=Date.now();if(now-lastSearchAt<1000)throw new Error('search_rate_limited');lastSearchAt=now;
 const url=new URL('https://nominatim.openstreetmap.org/search');url.searchParams.set('format','jsonv2');url.searchParams.set('countrycodes','cl');url.searchParams.set('limit','5');url.searchParams.set('addressdetails','1');url.searchParams.set('q',clean);
 const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error('search_unavailable');
 const data=await response.json();return data.map(item=>({label:item.display_name,coordinates:{latitude:Number(item.lat),longitude:Number(item.lon)}})).filter(item=>hasPrivateCoordinates(item.coordinates));
}
