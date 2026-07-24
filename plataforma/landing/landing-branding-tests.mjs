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

const branding = {
  enabled: true,
  badgeText: 'Proyecto gestionado mediante TPL Business',
  supportText: 'Tecnología, registro de consultas y gestión comercial por Tu Parcela Lista.',
  footerText: 'Tecnología y gestión comercial por Tu Parcela Lista',
  ctaText: 'Quiero una landing como esta',
  ctaUrl: '/tecnologia.html',
  modalTitle: 'Respaldo tecnológico y comercial',
  modalContent: [
    'La información del proyecto es proporcionada por el propietario o representante.',
    'Las consultas y solicitudes son gestionadas mediante TPL Business.',
    'Las solicitudes pueden registrarse para seguimiento comercial.',
    'Tu Parcela Lista entrega la infraestructura tecnológica y comercial.'
  ],
  footerTheme: 'corporate'
};

const fixture = {
  id: 'land-caburgua',
  title: 'Caburgua Premium',
  subtitle: 'Naturaleza y conexión',
  description: 'Una propiedad preparada para una experiencia premium.',
  heroImage: '/image/caburgua.webp',
  location: 'Caburgua',
  price: '$120.000.000',
  gallery: [],
  benefits: [],
  features: [
    { title: 'Vista al volcán Villarrica', text: 'Entorno natural privilegiado.' },
    { title: 'Acceso a río', text: 'Dentro del proyecto.' },
    { title: 'Aguas termales', text: 'Experiencia durante todo el año.' },
    { title: 'Rol propio', text: 'Información proporcionada por el representante.' },
    { title: 'Agua disponible', text: 'Factibilidad informada.' },
    { title: 'Energía eléctrica', text: 'Disponibilidad informada.' }
  ],
  distances: [],
  faq: [],
  tplBranding: branding,
  formEnabled: false
};

async function render({ search = '', published = fixture, draft = fixture } = {}) {
  const root = { innerHTML: '', dataset: {} };
  const body = { classList: { add() {}, remove() {} } };
  const window = {
    TPLLandingRepository: {
      getPublished: async () => structuredClone(published),
      getAdmin: async () => ({ draft: structuredClone(draft), updatedAt: '2026-07-24T00:00:00Z' })
    },
    matchMedia: () => ({ matches: false })
  };
  const document = {
    title: '',
    referrer: '',
    activeElement: null,
    body,
    addEventListener() {},
    getElementById: (id) => id === 'landing-root' ? root : null,
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const context = {
    window,
    document,
    location: { search, pathname: '/caburgua-premium', origin: 'https://www.parcelalista.cl' },
    localStorage: storage(),
    URLSearchParams,
    URL,
    encodeURIComponent,
    FormData,
    Date,
    structuredClone,
    console
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL('./landing.js', import.meta.url), 'utf8'), context);
  await new Promise(resolve => setTimeout(resolve, 0));
  return { root, landing: search.includes('preview=1') ? draft : published };
}

const publicView = await render();
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

const previewDraft = {
  ...fixture,
  title: 'Título de vista previa',
};
const preview = await render({
  search: '?id=land-caburgua&preview=1',
  draft: previewDraft
});
assert.match(preview.root.innerHTML, /Título de vista previa/);
assert.match(preview.root.innerHTML, /Proyecto gestionado mediante TPL Business/);
assert.match(preview.root.innerHTML, /Vista al volcán Villarrica/);
assert.equal(preview.root.dataset.landingMode, 'preview');

console.log('landing-branding: OK');
