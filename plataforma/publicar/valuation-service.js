(() => {
  'use strict';

  const STORE_KEY = 'tpl_tasador_supabase_sessions_v1';
  const config = window.TPL_SUPABASE_CONFIG || {};

  const uuid = () => globalThis.crypto?.randomUUID?.()
    || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.random() * 16 | 0;
      return (char === 'x' ? random : (random & 0x3 | 0x8)).toString(16);
    });
  const normalize = (value) => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const read = () => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
  };
  const write = (value) => localStorage.setItem(STORE_KEY, JSON.stringify(value));
  const identity = (data = {}) => [
    normalize(data.region),
    normalize(data.comuna),
    normalize(data.sector),
    Number(data.superficie_m2 || data.superficie || 0),
    Number(data.lat || data.latitudPrivada || 0).toFixed(5),
    Number(data.lng || data.longitudPrivada || 0).toFixed(5)
  ].join('|');

  function publicConfig() {
    const url = String(config.url || '').replace(/\/$/, '');
    const anonKey = String(config.anonKey || '').trim();
    if (!/^https:\/\/[^/]+\.supabase\.co$/i.test(url) || anonKey.length < 20) {
      throw Object.assign(new Error('El Tasador TPL no tiene una conexión pública válida.'), { code: 'missing_config' });
    }
    return { url, anonKey };
  }

  function sessionFor(data) {
    const key = identity(data);
    const sessions = read();
    if (!sessions[key]) {
      sessions[key] = {
        sessionId: uuid(),
        accessToken: uuid(),
        idempotencyKey: uuid(),
        createdAt: new Date().toISOString()
      };
      write(sessions);
    }
    return { key, sessions, session: sessions[key] };
  }

  async function request(body, data) {
    const { url, anonKey } = publicConfig();
    const response = await fetch(`${url}/functions/v1/tasar-parcela`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok || payload.ok === false) {
      throw Object.assign(new Error(payload.error || `No fue posible consultar el Tasador TPL (${response.status}).`), {
        code: payload.code || `http_${response.status}`,
        status: response.status,
        payload,
        data
      });
    }
    return payload;
  }

  async function valueParcel(data) {
    const holder = sessionFor(data);
    const payload = await request({
      level: 'basica',
      sessionId: holder.session.sessionId,
      accessToken: holder.session.accessToken,
      idempotencyKey: holder.session.idempotencyKey,
      data
    }, data);
    holder.session.lastResultId = payload.result?.id || holder.session.lastResultId || null;
    holder.session.updatedAt = new Date().toISOString();
    holder.sessions[holder.key] = holder.session;
    write(holder.sessions);
    return { ...payload.result, source: 'supabase', persisted: true };
  }

  async function saveDecision(data, strategy, finalPrice) {
    const holder = sessionFor(data);
    const decision = strategy === 'ideal' ? 'adoptar_mercado' : 'otro';
    return request({
      action: 'decision',
      sessionId: holder.session.sessionId,
      accessToken: holder.session.accessToken,
      idempotencyKey: holder.session.idempotencyKey,
      decision,
      finalPrice
    }, data);
  }

  window.TPLValuationService = Object.freeze({
    valueParcel,
    saveDecision,
    identity,
    isConfigured: () => {
      try { publicConfig(); return true; } catch { return false; }
    }
  });
})();
