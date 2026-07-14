import assert from 'node:assert/strict';
import {extractPhotoGps,findFirstPhotoGps,hasPrivateCoordinates,isValidGoogleMapsLink,locationIsMissing,shouldShowLocationWarning} from './photo-geolocation.js';

assert.equal(isValidGoogleMapsLink('https://maps.app.goo.gl/abc123'),true);
assert.equal(isValidGoogleMapsLink('https://www.google.com/maps/place/Florida'),true);
assert.equal(isValidGoogleMapsLink('https://www.google.cl/maps/place/Florida'),true);
assert.equal(isValidGoogleMapsLink('https://www.google.com/maps?q=-36.820000,-73.050000'),true,'el enlace generado desde coordenadas debe ser válido');
assert.equal(isValidGoogleMapsLink('https://example.com/maps/place/Florida'),false);
assert.equal(isValidGoogleMapsLink('https://google.evil.com/maps/place/Florida'),false);
assert.equal(isValidGoogleMapsLink('no-es-un-enlace'),false);
assert.equal(isValidGoogleMapsLink(''),false);

assert.equal(locationIsMissing({mapsLink:'',gpsConsent:false}),true,'GPS rechazado y enlace vacío');
assert.equal(locationIsMissing({mapsLink:'https://example.com/mapa',gpsConsent:false}),true,'enlace inválido');
assert.equal(locationIsMissing({mapsLink:'https://maps.app.goo.gl/abc123',gpsConsent:false}),false,'enlace válido basta');
assert.equal(locationIsMissing({mapsLink:'',gpsConsent:true,gpsCoordinates:null}),true,'GPS autorizado pero inexistente');
assert.equal(locationIsMissing({mapsLink:'',gpsConsent:true,gpsCoordinates:{latitude:-36.8,longitude:-73.1}}),false);
assert.equal(locationIsMissing({mapsLink:'',confirmedCoordinates:{latitude:-36.8,longitude:-73.1},gpsConsent:false}),false,'una ubicación confirmada no depende del permiso EXIF');
assert.equal(shouldShowLocationWarning({evaluationReady:true,mapsLink:'',gpsConsent:false}),true);
assert.equal(shouldShowLocationWarning({evaluationReady:true,mapsLink:'',gpsConsent:false,dismissed:true}),false);
assert.equal(shouldShowLocationWarning({evaluationReady:true,mapsLink:'',gpsConsent:true,gpsAnalysisPending:true}),false);
assert.equal(shouldShowLocationWarning({evaluationReady:true,mapsLink:'',confirmedCoordinates:{latitude:-36.8,longitude:-73.1}}),false);
assert.equal(hasPrivateCoordinates({latitude:-90,longitude:180}),true);assert.equal(hasPrivateCoordinates({latitude:91,longitude:0}),false);

const noGpsPng=new File([new Uint8Array([1,2,3])],'sin-gps.png',{type:'image/png'});
const noGpsJpeg=new File([new Uint8Array([0xff,0xd8,0xff,0xd9])],'sin-gps.jpg',{type:'image/jpeg'});
assert.equal(await extractPhotoGps(noGpsPng),null);assert.equal(await extractPhotoGps(noGpsJpeg),null);
assert.deepEqual(await findFirstPhotoGps([noGpsPng,noGpsJpeg]),null);
assert.deepEqual(await findFirstPhotoGps([noGpsJpeg],async()=>({latitude:-36.8,longitude:-73.1})),{latitude:-36.8,longitude:-73.1});

console.log('OK: ubicación manual válida/inválida/vacía, GPS rechazado, inexistente y coordenadas privadas.');
