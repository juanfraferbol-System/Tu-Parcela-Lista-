import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

const calls = [];
const localStorage = storage();
const sessionStorage = storage();
const window = {
  crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
  TPL_SUPABASE_CONFIG: { url: 'https://example.supabase.co', anonKey: 'public-anon-key-for-tests-12345' },
  supabase: {
    createClient: () => ({
      rpc: async (name, payload) => {
        calls.push({ name, payload });
        return {
          data: {
            success: true,
            duplicate: false,
            clienteId: 'client-test',
            oportunidadId: 'opportunity-test'
          },
          error: null
        };
      }
    })
  }
};

const context = {
  window,
  localStorage,
  sessionStorage,
  location: {
    search: '?utm_source=google&utm_medium=cpc&utm_campaign=caburgua-premium&gclid=test-gclid',
    pathname: '/caburgua-premium'
  },
  document: { referrer: 'https://www.google.com/search?q=caburgua' },
  matchMedia: () => ({ matches: false }),
  URL,
  URLSearchParams,
  console
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(new URL('./landing-lead-service.js', import.meta.url), 'utf8'),
  context
);

const result = await window.TPLLandingCRM.capture({
  landingCode: 'land-caburgua',
  action: 'informacion_solicitada',
  idempotencyKey: 'test-idempotency',
  contact: {
    nombre: 'Persona Prueba',
    correo: 'PERSONA@EXAMPLE.COM',
    telefono: '+56 9 1111 1111',
    aceptaTratamiento: true
  },
  detail: { mensaje: 'Consulta de prueba' }
});

assert.equal(result.success, true);
assert.equal(calls.length, 1);
assert.equal(calls[0].name, 'tpl_registrar_interaccion_landing');
assert.equal(calls[0].payload.p_landing_codigo, 'land-caburgua');
assert.equal(calls[0].payload.p_contacto.correo, 'persona@example.com');
assert.equal(calls[0].payload.p_contacto.telefono, '56911111111');
assert.equal(calls[0].payload.p_atribucion.utm_source, 'google');
assert.equal(calls[0].payload.p_atribucion.utm_medium, 'cpc');
assert.equal(calls[0].payload.p_atribucion.utm_campaign, 'caburgua-premium');
assert.equal(calls[0].payload.p_atribucion.gclid, 'test-gclid');
assert.equal(calls[0].payload.p_idempotency_key, 'test-idempotency');
assert.equal('nombre' in calls[0].payload.p_atribucion, false);
assert.equal('correo' in calls[0].payload.p_atribucion, false);
assert.equal('telefono' in calls[0].payload.p_atribucion, false);

await window.TPLLandingCRM.capture({
  landingCode: 'land-caburgua',
  action: 'visita_solicitada',
  idempotencyKey: 'test-visit',
  contact: {
    nombre: 'Persona Prueba',
    correo: 'persona@example.com',
    aceptaTratamiento: true
  },
  detail: { fechaVisita: '2030-01-20T11:30' }
});
assert.equal(calls[1].payload.p_accion, 'visita_solicitada');
assert.match(calls[1].payload.p_detalle.fecha_visita, /^2030-01-20T/);

await window.TPLLandingCRM.capture({
  landingCode: 'land-caburgua',
  action: 'whatsapp_click',
  idempotencyKey: 'test-whatsapp'
});
assert.equal(calls[2].payload.p_accion, 'whatsapp_click');
assert.equal(calls[2].payload.p_contacto.nombre, '');
assert.equal(calls[2].payload.p_idempotency_key, 'test-whatsapp');

await assert.rejects(
  window.TPLLandingCRM.capture({
    landingCode: 'land-caburgua',
    action: 'accion_invalida'
  }),
  /landing_action_invalid/
);

console.log('landing-lead-service: OK');
