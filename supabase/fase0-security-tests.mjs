import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const migration=await read('./migrations/202607170003_cerrar_exposicion_publicaciones.sql');
const app=await read('../app.js');
const dbApi=await read('../js/db-api.js');
const flowCreate=await read('../api/flow-create.js');
const flowWebhook=await read('../api/flow-webhook.js');
const publication=await read('../plataforma/publicar-parcela/publicar-parcela.js');
const submission=await read('../plataforma/publicar-parcela/submission-service.js');
const photoOptimizer=await read('../plataforma/publicar-parcela/photo-optimizer.js');

assert.match(migration,/revoke select on table public\.publicaciones from anon, authenticated/i);
assert.match(migration,/create or replace view public\.publicaciones_publicas/i);
for(const privateColumn of ['contacto_email','contacto_telefono','descripcion_origen_privada','latitud_privada','longitud_privada','datos_formulario']){
 const selectBlock=migration.split('from public.publicaciones p')[0];
 assert.doesNotMatch(selectBlock,new RegExp(`^\\s*p\\.${privateColumn}\\s*,`,'im'));
}
assert.match(migration,/round\(p\.latitud_privada, 3\) as latitud_publica/i);
assert.match(app,/rest\/v1\/publicaciones_publicas\?select=\*/);
assert.doesNotMatch(app,/rest\/v1\/publicaciones\?estado=eq\.aprobada&select=\*/);
assert.match(dbApi,/from\('publicaciones_publicas'\)/);
assert.doesNotMatch(dbApi,/getMockVisits|isOpportunity|getCommuneAverage/);
assert.doesNotMatch(flowCreate,/FLOW_API_KEY\s*\|\|\s*['"]/);
assert.doesNotMatch(flowCreate,/FLOW_SECRET_KEY\s*\|\|\s*['"]/);
assert.doesNotMatch(flowWebhook,/FLOW_API_KEY\s*\|\|\s*['"]/);
assert.doesNotMatch(flowWebhook,/FLOW_SECRET_KEY\s*\|\|\s*['"]/);
assert.doesNotMatch(publication,/token=simulated_payment/);
assert.doesNotMatch(publication,/sessionStorage\.setItem\(`tpl_plan_paid_/);
assert.match(submission,/PUBLICATION_FUNCTION_URL/);
assert.match(submission,/transport:'supabase-edge-v1'/);
assert.match(photoOptimizer,/MAX_PHOTOS=12/);

console.log('OK: privacidad pública, Flow, envío real y límites estabilizados.');
