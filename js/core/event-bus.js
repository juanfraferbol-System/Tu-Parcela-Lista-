/* =========================================================
   TPL CORE 2.2 - Motor de eventos central
   Permite que Publicador, CRM, Tasador y Flow reaccionen sin
   acoplarse entre sí. Compatible con navegador y Node.
========================================================= */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TPL = root.TPL || {};
  root.TPL.events = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const listeners = new Map();
  const history = [];
  const MAX_HISTORY = 100;

  function normalizeName(name) {
    return String(name || '').trim().toUpperCase();
  }

  function on(name, handler) {
    const eventName = normalizeName(name);
    if (!eventName || typeof handler !== 'function') return function noop() {};
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(handler);
    return () => listeners.get(eventName)?.delete(handler);
  }

  function once(name, handler) {
    const off = on(name, function wrapped(event) {
      off();
      handler(event);
    });
    return off;
  }

  function emit(name, payload, metadata) {
    const eventName = normalizeName(name);
    if (!eventName) throw new Error('tpl_event_name_required');
    const event = Object.freeze({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: eventName,
      payload: payload ?? null,
      metadata: metadata || {},
      createdAt: new Date().toISOString()
    });
    history.push(event);
    if (history.length > MAX_HISTORY) history.shift();

    const targets = [
      ...(listeners.get(eventName) || []),
      ...(listeners.get('*') || [])
    ];
    targets.forEach((handler) => {
      try { handler(event); } catch (error) { console.error('[TPL events]', eventName, error); }
    });

    if (root?.dispatchEvent && typeof root.CustomEvent === 'function') {
      root.dispatchEvent(new root.CustomEvent(`tpl:${eventName.toLowerCase()}`, { detail: event }));
    }
    return event;
  }

  function getHistory(filterName) {
    const name = normalizeName(filterName);
    return name ? history.filter((event) => event.name === name) : history.slice();
  }

  function clearHistory() { history.length = 0; }

  return { on, once, emit, getHistory, clearHistory };
});
