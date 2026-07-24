import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, service, module] = await Promise.all([
  readFile(new URL('./index.html', import.meta.url), 'utf8'),
  readFile(new URL('./crm-business-service.js', import.meta.url), 'utf8'),
  readFile(new URL('./crm-business.js', import.meta.url), 'utf8')
]);

assert.match(html, /crm-business-service\.js[^]*crm-business\.js/);
assert.doesNotMatch(service + module, /localStorage|sessionStorage|tpl_business_v1|seed\s*=/);

for (const table of [
  'tpl_business_cuentas',
  'tpl_proyectos_comerciales',
  'tpl_landings_comerciales',
  'tpl_solicitudes_comerciales',
  'tpl_proyecto_modulos',
  'crm_oportunidades',
  'visitas'
]) {
  assert.ok(service.includes(`'${table}'`), `Falta la fuente canónica ${table}`);
}

assert.match(service, /es_administrador_activo/);
assert.match(service, /updateRequest/);
assert.match(module, /data-business-target/);
assert.match(module, /data-request-update/);
assert.match(module, /admin_project/);
assert.doesNotMatch(module, /Caburgua Premium|cli-caburgua|pro-caburgua/);

console.log('crm-business-integration: OK');
