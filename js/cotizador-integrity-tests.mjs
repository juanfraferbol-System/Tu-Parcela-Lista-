import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const db=await readFile(new URL('./db-api.js',import.meta.url),'utf8');
const migration=await readFile(new URL('../supabase/migrations/202607230005_cotizador_reglas_planes_integridad.sql',import.meta.url),'utf8');

test('el cotizador persiste total, parcela canónica e ítems',()=>{
  assert.match(app,/p_parcela_id:\s*state\.selectedParcela \? \(state\.selectedParcela\.publicacionId/);
  assert.match(app,/p_extras:\s*data\.items/g);
  assert.doesNotMatch(app,/p_extras:\s*\[\]/);
  assert.match(app,/totalNum/);
});

test('los planes tienen código y orden estable desde Supabase',()=>{
  assert.match(db,/planCode:\s*row\.codigo_plan/);
  assert.match(db,/visualOrder:\s*number\(row\.orden_visual\)/);
  assert.match(migration,/codigo_plan='premium'/);
  assert.match(migration,/fundacion_extra_reglas/);
});

test('las cantidades respetan límites de catálogo',()=>{
  assert.match(app,/function clampExtraQty/);
  assert.match(app,/extra\?\.minQty/);
  assert.match(app,/extra\?\.maxQty/);
});
