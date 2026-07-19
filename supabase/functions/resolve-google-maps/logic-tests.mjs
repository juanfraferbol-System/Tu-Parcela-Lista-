import assert from 'node:assert/strict';
import {extractCoordinates,isAllowedGoogleMapsUrl} from './logic.mjs';
assert.equal(isAllowedGoogleMapsUrl('https://maps.app.goo.gl/VrCoBLhGgjyMPUsy7'),true);
assert.equal(isAllowedGoogleMapsUrl('https://example.com/maps'),false);
assert.deepEqual(extractCoordinates('https://www.google.com/maps/@-36.82699,-73.04977,17z'),{latitude:-36.82699,longitude:-73.04977,source:'url_at'});
assert.deepEqual(extractCoordinates('https://maps.google.com/?q=-36.82699,-73.04977'),{latitude:-36.82699,longitude:-73.04977,source:'query'});
assert.deepEqual(extractCoordinates('x!3d-36.82699!4d-73.04977y'),{latitude:-36.82699,longitude:-73.04977,source:'data'});
console.log('resolve-google-maps logic tests: OK');
