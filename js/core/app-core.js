/* =========================================================
   TPL CORE 2.1 - Inicializador del núcleo
   No reemplaza todavía app.js: convive con el código legacy.
========================================================= */
(function (window) {
  'use strict';

  window.TPL = window.TPL || {};

  function exposeHelpers() {
    window.TPL.$ = (selector, root = document) => root.querySelector(selector);
    window.TPL.$$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    window.TPL.money = function money(value) {
      const config = window.TPL.config || {};
      try {
        return new Intl.NumberFormat(config.locale || 'es-CL', {
          style: 'currency',
          currency: config.currency || 'CLP',
          maximumFractionDigits: 0
        }).format(Number(value) || 0);
      } catch (_) {
        return `$${Number(value || 0).toLocaleString('es-CL')}`;
      }
    };
    window.TPL.parseMoney = function parseMoney(value) {
      return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
    };
  }

  function init() {
    exposeHelpers();
    window.TPL.state?.init?.();
    window.TPL.router?.initAnchorRouter?.();
    document.documentElement.dataset.tplCore = window.TPL.config?.version || '2.1';
    window.dispatchEvent(new CustomEvent('tpl:core-ready', { detail: { version: window.TPL.config?.version } }));
  }

  window.TPL.core = { init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window);
