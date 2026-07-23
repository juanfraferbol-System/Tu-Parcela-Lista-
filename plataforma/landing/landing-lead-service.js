(() => {
  'use strict';

  const ATTRIBUTION_KEY = 'tpl_landing_attribution_v1';
  const SESSION_KEY = 'tpl_landing_session_v1';
  const JOURNEY_KEY = 'tpl_landing_journey_v1';
  const ALLOWED_ACTIONS = new Set([
    'informacion_solicitada',
    'whatsapp_click',
    'visita_solicitada'
  ]);

  function randomId(prefix) {
    if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function readJson(storage, key, fallback) {
    try { return JSON.parse(storage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }

  function writeJson(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); }
    catch {}
  }

  function persistentId(storage, key, prefix) {
    let value = storage.getItem(key);
    if (!value) {
      value = randomId(prefix);
      try { storage.setItem(key, value); } catch {}
    }
    return value;
  }

  function safeReferrer() {
    try {
      const url = new URL(document.referrer);
      return `${url.origin}${url.pathname}`.slice(0, 300);
    } catch {
      return '';
    }
  }

  function deviceType() {
    if (matchMedia('(max-width: 767px)').matches) return 'movil';
    if (matchMedia('(max-width: 1100px)').matches) return 'tablet';
    return 'escritorio';
  }

  function attribution() {
    const stored = readJson(localStorage, ATTRIBUTION_KEY, {});
    const params = new URLSearchParams(location.search);
    const current = {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      utm_term: params.get('utm_term') || '',
      gclid: params.get('gclid') || '',
      referrer: safeReferrer(),
      pagina_origen: location.pathname,
      session_id: persistentId(sessionStorage, SESSION_KEY, 'ses'),
      journey_id: persistentId(localStorage, JOURNEY_KEY, 'journey')
    };
    const firstTouch = Object.keys(stored).length ? stored : current;
    if (!Object.keys(stored).length) writeJson(localStorage, ATTRIBUTION_KEY, firstTouch);
    return {
      ...firstTouch,
      utm_source: current.utm_source || firstTouch.utm_source || '',
      utm_medium: current.utm_medium || firstTouch.utm_medium || '',
      utm_campaign: current.utm_campaign || firstTouch.utm_campaign || '',
      utm_content: current.utm_content || firstTouch.utm_content || '',
      utm_term: current.utm_term || firstTouch.utm_term || '',
      gclid: current.gclid || firstTouch.gclid || '',
      pagina_origen: current.pagina_origen,
      session_id: current.session_id,
      journey_id: current.journey_id
    };
  }

  function supabaseClient() {
    if (window.tplSupabase) return window.tplSupabase;
    const config = window.TPL_SUPABASE_CONFIG || {};
    if (!window.supabase?.createClient || !config.url || !config.anonKey) return null;
    window.tplSupabase = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: { 'X-Client-Info': 'tpl-business-landing-v1' }
      }
    });
    return window.tplSupabase;
  }

  function normalizeContact(contact = {}) {
    return {
      nombre: String(contact.nombre || '').trim().slice(0, 120),
      correo: String(contact.correo || '').trim().toLowerCase().slice(0, 180),
      telefono: String(contact.telefono || '').replace(/\D/g, '').slice(0, 24),
      acepta_tratamiento_datos: contact.aceptaTratamiento === true
    };
  }

  function normalizeDetail(detail = {}) {
    const requestedDate = String(detail.fechaVisita || '').trim();
    const parsedDate = requestedDate ? Date.parse(requestedDate) : NaN;
    return {
      fecha_visita: Number.isFinite(parsedDate) ? new Date(parsedDate).toISOString() : requestedDate.slice(0, 40),
      mensaje: String(detail.mensaje || '').trim().slice(0, 1000),
      dispositivo: deviceType()
    };
  }

  async function capture(input = {}) {
    const action = String(input.action || '');
    if (!ALLOWED_ACTIONS.has(action)) throw new Error('landing_action_invalid');
    const landingCode = String(input.landingCode || '').trim();
    if (!landingCode) throw new Error('landing_code_missing');
    const client = supabaseClient();
    if (!client) throw new Error('landing_connection_unavailable');

    const idempotencyKey = String(input.idempotencyKey || randomId('lead')).slice(0, 120);
    const { data, error } = await client.rpc('tpl_registrar_interaccion_landing', {
      p_landing_codigo: landingCode,
      p_accion: action,
      p_contacto: normalizeContact(input.contact),
      p_atribucion: attribution(),
      p_detalle: normalizeDetail(input.detail),
      p_idempotency_key: idempotencyKey
    });
    if (error) {
      const failure = new Error(error.message || 'landing_capture_failed');
      failure.code = error.code || '';
      throw failure;
    }
    if (!data?.success) throw new Error('landing_capture_failed');
    return data;
  }

  window.TPLLandingCRM = Object.freeze({
    capture,
    attribution,
    newIdempotencyKey: () => randomId('lead')
  });
})();
