import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const configSource = fs.readFileSync(
  new URL('../plataforma/landing/landing-config.js', import.meta.url),
  'utf8'
);
const publicSource = fs.readFileSync(
  new URL('../plataforma/landing/landing.js', import.meta.url),
  'utf8'
);
const crmSource = fs.readFileSync(
  new URL('../plataforma/crm/crm-landing-engine.js', import.meta.url),
  'utf8'
);

const calls = [];
const responses = {
  tpl_obtener_landing_publica: {
    config: { id: 'land-caburgua', slug: 'caburgua-premium', title: 'Título publicado' },
    status: 'publicada',
    version: 4,
    updatedAt: '2026-07-23T12:00:00Z'
  },
  tpl_obtener_landing_admin: {
    code: 'land-caburgua',
    slug: 'caburgua-premium',
    status: 'publicada',
    draft: { id: 'land-caburgua', slug: 'caburgua-premium', title: 'Título borrador' }
  },
  tpl_guardar_borrador_landing: {
    success: true,
    status: 'publicada',
    updatedAt: '2026-07-23T12:01:00Z',
    updatedBy: 'admin@parcelalista.cl'
  },
  tpl_publicar_landing: {
    success: true,
    status: 'publicada',
    version: 5
  }
};

const supabaseClient = {
  async rpc(name, params) {
    calls.push({ name, params });
    return { data: responses[name], error: null };
  }
};
const context = {
  window: {
    tplSupabase: supabaseClient
  },
  console
};
vm.createContext(context);
vm.runInContext(configSource, context);

const repository = context.window.TPLLandingRepository;
assert.equal((await repository.getPublished('land-caburgua')).title, 'Título publicado');
assert.equal((await repository.getAdmin('land-caburgua')).draft.title, 'Título borrador');
await repository.saveDraft('land-caburgua', {
  id: 'land-caburgua',
  slug: 'caburgua-premium',
  title: 'Nuevo título'
});
await repository.publish('land-caburgua');

assert.deepEqual(
  calls.map((call) => call.name),
  [
    'tpl_obtener_landing_publica',
    'tpl_obtener_landing_admin',
    'tpl_guardar_borrador_landing',
    'tpl_publicar_landing'
  ]
);
assert.equal(
  calls[2].params.p_configuracion.title,
  'Nuevo título',
  'Guardar borrador debe enviar la configuración a Supabase'
);
assert.equal(
  calls[3].params.p_landing_codigo,
  'land-caburgua',
  'Publicar debe utilizar el mismo landing_id'
);

assert.doesNotMatch(configSource, /TPL_PUBLIC_LANDINGS|Mirador del Villarrica/);
assert.doesNotMatch(publicSource, /localStorage|getItem\(STORAGE_KEY/);
assert.doesNotMatch(crmSource, /localStorage|tpl_landing_engine_v1/);
assert.match(publicSource, /getPublished\(landingKey\)/);
assert.match(crmSource, /saveDraft\(record\.code, draft\)/);
assert.match(crmSource, /publish\(record\.code\)/);

console.log('OK: flujo canónico CRM → Supabase → Landing pública');
