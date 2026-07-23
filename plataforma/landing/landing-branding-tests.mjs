import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function storage(values = {}) {
  return {
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => { values[key] = String(value); },
    removeItem: (key) => { delete values[key]; }
  };
}

function render({ search = '', stored = {} } = {}) {
  const root = { innerHTML: '', dataset: {} };
  const body = { classList: { add() {}, remove() {} } };
  const window = {};
  const document = {
    title: '',
    referrer: '',
    activeElement: null,
    body,
    getElementById: (id) => id === 'landing-root' ? root : null,
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const context = {
    window,
    document,
    location: { search, pathname: '/caburgua-premium' },
    localStorage: storage(stored),
    URLSearchParams,
    encodeURIComponent,
    FormData,
    Date,
    console
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL('./landing-config.js', import.meta.url), 'utf8'), context);
  vm.runInContext(fs.readFileSync(new URL('./landing.js', import.meta.url), 'utf8'), context);
  return { root, landing: window.TPL_getPublicLanding('land-caburgua') };
}

const publicView = render();
assert.match(publicView.root.innerHTML, /Características importantes/);
assert.match(publicView.root.innerHTML, /class="feature-check"/);
assert.match(publicView.root.innerHTML, /Proyecto gestionado mediante TPL Business/);
assert.match(publicView.root.innerHTML, /role="dialog"/);
assert.match(publicView.root.innerHTML, /aria-modal="true"/);
assert.match(publicView.root.innerHTML, /Tecnología y gestión comercial por Tu Parcela Lista/);
assert.match(publicView.root.innerHTML, /Quiero una landing como esta/);
assert.doesNotMatch(publicView.root.innerHTML, /proyecto verificado/i);
assert.equal(publicView.landing.features.length, 6);

const requiredBrandingKeys = [
  'enabled',
  'badgeText',
  'supportText',
  'footerText',
  'ctaText',
  'ctaUrl',
  'modalTitle',
  'modalContent',
  'footerTheme'
];
for (const key of requiredBrandingKeys) {
  assert.equal(key in publicView.landing.tplBranding, true, `Falta tplBranding.${key}`);
}

const oldDraft = JSON.stringify([{
  id: 'land-caburgua',
  slug: 'caburgua-premium',
  title: 'Título de vista previa',
  benefits: ['Beneficio antiguo'],
  gallery: [],
  formEnabled: false
}]);
const preview = render({
  search: '?id=land-caburgua&preview=1',
  stored: { tpl_landing_engine_v1: oldDraft }
});
assert.match(preview.root.innerHTML, /Título de vista previa/);
assert.match(preview.root.innerHTML, /Proyecto gestionado mediante TPL Business/);
assert.match(preview.root.innerHTML, /Vista al volcán Villarrica/);
assert.equal(preview.root.dataset.landingMode, 'preview');

console.log('landing-branding: OK');
