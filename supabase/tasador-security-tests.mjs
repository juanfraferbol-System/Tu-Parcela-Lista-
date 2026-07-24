import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const migration=await read('./migrations/202607170004_tasador_tpl_mvp.sql');
const rollback=await read('./rollback/202607170004_tasador_tpl_mvp_rollback.sql');
const edge=await read('./functions/tasar-parcela/index.ts');
const engine=await read('./functions/tasar-parcela/engine.mjs');
const publication=await read('../plataforma/publicar/app.js');
const estimator=await read('../plataforma/publicar/valuation-service.js');
const html=await read('../plataforma/publicar/index.html');
const crm=await read('../plataforma/crm/crm.js');

for(const table of ['tasaciones','tasacion_comparables','tasacion_factores','consumos_tasador','historial_precios_publicacion','ventas_declaradas','configuracion_tasador'])assert.match(migration,new RegExp(`create table public\\.${table}`,'i'));
assert.match(migration,/alter table public\.publicaciones add column if not exists precio_propietario_solicitado/i);
assert.match(migration,/tipo_precio_actual[^;]+precio_publicado_solicitado/is);
assert.match(migration,/revoke all on public\.planes_comerciales[\s\S]+from anon, authenticated/i);
assert.match(migration,/grant execute on function public\.registrar_tasacion_mvp[\s\S]+to service_role/i);
assert.doesNotMatch(migration,/grant (insert|update|delete)[^;]+tasaciones[^;]+to anon/i);
assert.match(rollback,/drop table if exists public\.tasaciones/i);
assert.match(edge,/premium_not_enabled/);
assert.match(edge,/action==='decision'/);
assert.match(edge,/free_valuation_used/);
assert.match(edge,/TASADOR_ABUSE_SALT/);
assert.match(edge,/registrar_tasacion_mvp/);
assert.match(edge,/Tasador TPL entrega una estimación comercial referencial/);
assert.doesNotMatch(engine,/perM2\s*=|2400|15000000/);
assert.doesNotMatch(estimator,/perM2\s*=|2400|15000000/);
assert.match(publication,/precio:number\(val\('precioVenta'\)\)/);
assert.match(publication,/TPLValuationService\?\.saveDecision/);
assert.match(html,/Tasador TPL de Casa · Piloto/);
assert.match(html,/id="runValuation"/);
assert.match(crm,/view-tasador|loadTasadorPanel/);

console.log('OK: esquema, Edge Function, flujo gratuito, decisiones, CRM y rollback del Tasador TPL.');
