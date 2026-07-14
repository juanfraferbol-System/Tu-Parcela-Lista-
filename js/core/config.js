/* =========================================================
   TPL CORE 2.1 - Configuración general
   Mantiene valores centrales sin tocar la lógica legacy.
========================================================= */
(function (window) {
  'use strict';

  window.TPL = window.TPL || {};

  window.TPL.config = {
    version: '2.1.0-core',
    brand: 'Tu Parcela Lista',
    locale: 'es-CL',
    currency: 'CLP',
    routes: {
      home: 'index.html',
      parcela: 'parcela.html',
      cotizador: 'cotizador.html',
      publicar: 'plataforma/publicar-parcela/',
      crm: 'CRM.html'
    },
    selectors: {
      parcelasAnchor: '#parcelas-anchor',
      casasSection: '#casas-section',
      cotizadorSection: '#cotizador-section',
      promosSection: '#promos',
      budgetBox: '#budget-box',
      budgetInput: '#budget-input'
    },
    ui: {
      scrollOffset: 90,
      initialParcelasLimit: 15,
      nextParcelasBatch: 12
    },
    storage: {
      selectedParcelaId: 'selectedParcelaId',
      selectedParcelaData: 'selectedParcelaData',
      selectedCasaId: 'selectedCasaId',
      selectedCasaData: 'selectedCasaData',
      currentProject: 'tplCurrentProject'
    }
  };
})(window);
