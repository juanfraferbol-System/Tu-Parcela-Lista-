import assert from 'node:assert/strict';
import {MAX_CORRECTION_PAYLOAD_BYTES,sha256Text,validateCorrectionRequest} from './correction-logic.mjs';

const token='a'.repeat(64);
assert.deepEqual(validateCorrectionRequest({action:'load',token}),{action:'load',token,changes:null});
assert.deepEqual(validateCorrectionRequest({action:'submit',token,changes:{titulo_publico:'Título corregido'}}),{action:'submit',token,changes:{titulo_publico:'Título corregido'}});
assert.throws(()=>validateCorrectionRequest({action:'load',token:'visible-token'}),/correction_token_invalid/);
assert.throws(()=>validateCorrectionRequest({action:'submit',token}),/correction_changes_invalid/);
assert.equal(await sha256Text('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.equal(MAX_CORRECTION_PAYLOAD_BYTES,65536);
console.log('OK: token de corrección, hash SHA-256, payload y acciones validadas sin exponer secretos.');
