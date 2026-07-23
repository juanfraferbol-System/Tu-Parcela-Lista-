import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
const app=await readFile(new URL('./app.js',import.meta.url),'utf8');

test('el publicador ya no carga comparables estáticos',()=>{
  assert.doesNotMatch(html,/src="valuation-data\.js/);
  assert.doesNotMatch(app,/TPL_VALUATION_DATA|raw\.parcelas|raw\.casas/);
  assert.match(html,/src="valuation-service\.js/);
});

test('parcelas consultan el tasador Supabase y esperan el resultado',()=>{
  assert.match(app,/TPLValuationService\?\.valueParcel/);
  assert.match(app,/async function calculateValuation/);
  assert.match(app,/await calculateLandValuation/);
});

test('parcela con casa suma ambos componentes',()=>{
  assert.match(app,/ideal=Number\(land\.ideal\)\+Number\(house\.ideal\)/);
  assert.match(app,/source:'composite_land_house'/);
  assert.match(app,/components:\{land,house\}/);
});

test('solo una tasación persistida puede activar valor respaldado',()=>{
  assert.match(app,/valorRespaldadoTPL:Boolean\(state\.valuation\?\.persisted/);
});
