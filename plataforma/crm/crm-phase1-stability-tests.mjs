import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [html, css, crm, catalogs] = await Promise.all([
  read('./index.html'),
  read('./crm.css'),
  read('./crm.js'),
  read('./crm-catalogos.js')
]);

assert.doesNotMatch(html, /class="nav-item" data-target="view-promociones"/);
assert.match(html, /TPL Studio <span class="nav-beta">MVP local<\/span>/);
assert.match(html, /id="view-promociones"[^>]+hidden[^>]+aria-hidden="true"/);

assert.doesNotMatch(crm, /Funcionalidad próxima: Abrir Ficha/);
assert.match(crm, /data-pending-target="view-clientes-prioritarios"/);
assert.match(crm, /data-pending-target="view-cotizaciones"/);
assert.match(crm, /data-pending-publication/);
assert.match(crm, /Array\.isArray\(cont\.comunas_atendidas\)/);
assert.doesNotMatch(crm, /cont\.comunas_atendidas\.toLowerCase\(\)/);
assert.doesNotMatch(crm, /_tempScore/);
assert.match(crm, /escapeHTML\(partnerName\)/);
assert.match(crm, /escapeHTML\(c\.cliente_nombre/);
assert.doesNotMatch(crm, /onclick="window\.open\('https:\/\/wa\.me/);

assert.match(catalogs, /return `\/\$\{raw\.replace/);
assert.match(css, /\.sidebar-nav[\s\S]*overflow-y: auto/);
assert.match(css, /\.table-container[\s\S]*overflow-x: auto/);

console.log('crm-phase1-stability: OK');
