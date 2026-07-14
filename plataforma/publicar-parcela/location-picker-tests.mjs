import assert from 'node:assert/strict';
import {approximateCoordinateLabel,coordinatesToGoogleMapsLink,normalizeCoordinates,requestBrowserCoordinates,searchChileLocation} from './location-picker.js';

assert.deepEqual(normalizeCoordinates({latitude:-36.82,longitude:-73.05}),{latitude:-36.82,longitude:-73.05});
assert.equal(normalizeCoordinates({latitude:91,longitude:0}),null);
assert.equal(coordinatesToGoogleMapsLink({latitude:-36.82,longitude:-73.05}),'https://www.google.com/maps?q=-36.820000,-73.050000');
assert.equal(approximateCoordinateLabel({latitude:-36.82345,longitude:-73.05432}),'Referencia aproximada: -36.823, -73.054');

let requestedOptions=null;
const accepted=await requestBrowserCoordinates({geolocation:{getCurrentPosition(success,_failure,options){requestedOptions=options;success({coords:{latitude:-33.45,longitude:-70.66}});}}});
assert.deepEqual(accepted,{latitude:-33.45,longitude:-70.66});
assert.deepEqual(requestedOptions,{enableHighAccuracy:true,timeout:12000,maximumAge:0});
await assert.rejects(()=>requestBrowserCoordinates({geolocation:{getCurrentPosition(_success,failure){failure({code:1});}}}),error=>error.code==='denied');
await assert.rejects(()=>requestBrowserCoordinates({geolocation:null}),error=>error.code==='unsupported');

let requestedUrl='';
const fetchImpl=async url=>{requestedUrl=String(url);return {ok:true,json:async()=>[{display_name:'Florida, Provincia de Concepción, Chile',lat:'-36.82',lon:'-72.67'}]};};
const results=await searchChileLocation('Florida, Biobío',{fetchImpl,now:()=>2000});
assert.equal(results.length,1);assert.equal(results[0].label,'Florida, Provincia de Concepción, Chile');
assert.match(requestedUrl,/countrycodes=cl/);assert.match(requestedUrl,/limit=5/);assert.match(requestedUrl,/format=jsonv2/);
const cached=await searchChileLocation('Florida, Biobío',{fetchImpl:async()=>{throw new Error('No debe consultar nuevamente');},now:()=>2001});
assert.deepEqual(cached,results);
await assert.rejects(()=>searchChileLocation(' ',{fetchImpl,now:()=>4000}),/search_query_too_short/);

console.log('OK: GPS del navegador, coordenadas temporales, enlace generado y búsqueda manual explícita en Chile.');
