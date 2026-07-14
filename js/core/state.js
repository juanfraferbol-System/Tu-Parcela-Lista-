/* =========================================================
   TPL CORE 2.1 - Estado central
   Crea un punto único para selección de parcela, casa y proyecto.
========================================================= */
(function (window) {
  'use strict';

  window.TPL = window.TPL || {};

  const listeners = new Map();

  const state = {
    mode: 'normal',
    presupuesto: 0,
    selectedParcela: null,
    selectedCasa: null,
    selectedFundacion: null,
    extras: [],
    filters: {},
    ready: false
  };

  function emit(eventName, payload) {
    const callbacks = listeners.get(eventName) || [];
    callbacks.forEach((cb) => {
      try { cb(payload, state); } catch (error) { console.warn('[TPL state listener]', error); }
    });
    window.dispatchEvent(new CustomEvent(`tpl:${eventName}`, { detail: payload }));
  }

  function on(eventName, callback) {
    if (!listeners.has(eventName)) listeners.set(eventName, []);
    listeners.get(eventName).push(callback);
    return () => {
      const callbacks = listeners.get(eventName) || [];
      listeners.set(eventName, callbacks.filter((cb) => cb !== callback));
    };
  }

  function set(partial, reason = 'update') {
    Object.assign(state, partial);
    persistProject();
    emit('state-change', { reason, partial });
  }

  function get() {
    return state;
  }

  function parseStoredJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function persistProject() {
    const config = window.TPL.config;
    if (!config) return;
    const project = {
      parcela: state.selectedParcela || null,
      casa: state.selectedCasa || null,
      fundacion: state.selectedFundacion || null,
      extras: state.extras || [],
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(config.storage.currentProject, JSON.stringify(project));
      if (project.parcela?.id) localStorage.setItem(config.storage.selectedParcelaId, String(project.parcela.id));
      if (project.casa?.id) localStorage.setItem(config.storage.selectedCasaId, String(project.casa.id));
    } catch (_) {}
  }

  function hydrateFromLegacyStorage() {
    const config = window.TPL.config;
    if (!config) return;

    const storedParcela = parseStoredJSON(config.storage.selectedParcelaData);
    const storedCasa = parseStoredJSON(config.storage.selectedCasaData);
    const storedProject = parseStoredJSON(config.storage.currentProject);

    state.selectedParcela = storedProject?.parcela || storedParcela || state.selectedParcela;
    state.selectedCasa = storedProject?.casa || storedCasa || state.selectedCasa;

    if (window.state) {
      state.mode = window.state.mode || state.mode;
      state.presupuesto = window.state.presupuesto || window.state.budget || state.presupuesto;
      state.selectedParcela = window.state.selectedParcela || state.selectedParcela;
      state.selectedCasa = window.state.selectedCasa || state.selectedCasa;
      state.filters = window.state.activeFilters || window.state.filtros || state.filters;
    }
  }

  function syncToLegacy() {
    window.state = window.state || {};
    window.state.selectedParcela = state.selectedParcela || window.state.selectedParcela || null;
    window.state.selectedCasa = state.selectedCasa || window.state.selectedCasa || null;
    window.state.mode = state.mode || window.state.mode || 'normal';
  }

  function selectParcela(parcela, reason = 'select-parcela') {
    state.selectedParcela = parcela || null;
    syncToLegacy();
    persistProject();
    emit('parcela-selected', { parcela, reason });
  }

  function selectCasa(casa, reason = 'select-casa') {
    state.selectedCasa = casa || null;
    syncToLegacy();
    persistProject();
    emit('casa-selected', { casa, reason });
  }

  function init() {
    hydrateFromLegacyStorage();
    syncToLegacy();
    state.ready = true;
    emit('ready', { state });
  }

  window.TPL.state = {
    get,
    set,
    on,
    emit,
    init,
    selectParcela,
    selectCasa,
    hydrateFromLegacyStorage,
    syncToLegacy
  };
})(window);
