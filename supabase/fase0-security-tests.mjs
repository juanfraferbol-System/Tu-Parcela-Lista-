import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const migration=await read('./migrations/202607170003_cerrar_exposicion_publicaciones.sql');
const app=await read('../app.js');
const dbApi=await read('../js/db-api.js');
const flowCreate=await read('../api/flow-create.js');
const flowWebhook=await read('../api/flow-webhook.js');
const publication=await read('../plataforma/publicar/app.js');
const submission=await read('../plataforma/publicar/integration-service.js');
const photoOptimizer=await read('../plataforma/publicar/photo-optimizer.js');

assert.match(migration,/revoke select on table public\.publicaciones from anon, authenticated/i);
assert.match(migration,/create or replace view public\.publicaciones_publicas/i);
for(const privateColumn of ['contacto_email','contacto_telefono','descripcion_origen_privada','latitud_privada','longitud_privada','datos_formulario']){
 const selectBlock=migration.split('from public.publicaciones p')[0];
 assert.doesNotMatch(selectBlock,new RegExp(`^\\s*p\\.${privateColumn}\\s*,`,'im'));
}
assert.match(migration,/round\(p\.latitud_privada, 3\) as latitud_publica/i);
assert.doesNotMatch(app,/rest\/v1\/publicaciones\?estado=eq\.aprobada&select=\*/);
assert.match(dbApi,/select\('publicaciones_publicas'\)/);
assert.doesNotMatch(dbApi,/getMockVisits|isOpportunity|getCommuneAverage/);
assert.doesNotMatch(flowCreate,/FLOW_API_KEY\s*\|\|\s*['"]/);
assert.doesNotMatch(flowCreate,/FLOW_SECRET_KEY\s*\|\|\s*['"]/);
assert.doesNotMatch(flowWebhook,/FLOW_API_KEY\s*\|\|\s*['"]/);
assert.doesNotMatch(flowWebhook,/FLOW_SECRET_KEY\s*\|\|\s*['"]/);
assert.doesNotMatch(publication,/token=simulated_payment/);
assert.doesNotMatch(publication,/sessionStorage\.setItem\(`tpl_plan_paid_/);
assert.match(submission,/functions\/v1\/publicar-inmueble/);
assert.match(submission,/mode:'remote',provider:'supabase'/);
assert.match(photoOptimizer,/maxFiles:12/);
assert.doesNotMatch(submission,/(?:service[_-]?role|SUPABASE_SECRET)\s*[:=]\s*['"][^'"]+['"]/i);

console.log('OK: privacidad pública, Flow, envío real y límites estabilizados.');
