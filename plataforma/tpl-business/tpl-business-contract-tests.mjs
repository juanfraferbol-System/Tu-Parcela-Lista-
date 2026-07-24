import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = new URL('./', import.meta.url);
const read = name => fs.readFileSync(new URL(name, base), 'utf8');

const html = read('index.html');
const config = read('tpl-business-config.js');
const auth = read('tpl-business-auth.js');
const service = read('tpl-business-service.js');
const app = read('tpl-business.js');

assert.match(html, /@supabase\/supabase-js@2/);
assert.match(html, /tpl-business-auth\.js/);
assert.match(html, /tpl-business-service\.js/);
assert.ok(html.indexOf('tpl-business-auth.js') < html.indexOf('tpl-business.js'));

assert.match(config, /qxavbqhyqaqalpzbhwmh\.supabase\.co/);
assert.match(config, /sb-qxavbqhyqaqalpzbhwmh-auth-token/);
assert.doesNotMatch(config, /Hola Juan|Caburgua Premium|score:\s*82/);
assert.doesNotMatch(`${config}\n${auth}\n${service}\n${app}`, /\blocalStorage\b|\bsessionStorage\b/);

for (const authMethod of [
  'signInWithPassword',
  'resetPasswordForEmail',
  'updateUser',
  'signOut',
  'getSession',
  'onAuthStateChange'
]) {
  assert.match(auth, new RegExp(authMethod));
}

for (const rpcName of [
  'tpl_business_sesion_actual',
  'tpl_business_proyecto_actual',
  'tpl_business_vista_cliente_admin',
  'tpl_business_registrar_solicitud',
  'tpl_business_registrar_cierre_sesion'
]) {
  assert.match(service, new RegExp(rpcName));
}

assert.match(service, /url\.origin !== window\.location\.origin/);
assert.match(`${config}\n${app}`, /Tu Landing Premium/);
assert.match(app, /Sin datos todavía/);
assert.match(app, /Vista administrativa segura/);
assert.match(app, /data-request-module/);
assert.match(app, /data-request-plan/);
assert.match(app, /data-request-recommendation/);
assert.doesNotMatch(app, /Caburgua Premium|land-caburgua|pro-caburgua/);

console.log('tpl-business-contract: OK');
