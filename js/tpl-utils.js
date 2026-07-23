/* =========================================================
   Tu Parcela Lista v2 - Utilidades globales
   Helpers compartidos por módulos del index.
========================================================= */
(function (window, document) {
  'use strict';

  const TPL = window.TPL = window.TPL || {};

  TPL.$ = (selector, root = document) => root.querySelector(selector);
  TPL.$$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  TPL.clpFormatter = TPL.clpFormatter || new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  });

  TPL.money = (value) => TPL.clpFormatter.format(Number(value) || 0);
  TPL.parseMoney = (value) => Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
  TPL.slug = (value) => encodeURIComponent(String(value || ''));

  TPL.goTo = (selector, offset = 90) => {
    const target = typeof selector === 'string' ? TPL.$(selector) : selector;
    if (!target) return;
    target.classList.add('active');
    const top = Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - offset);
    window.scrollTo({ top, behavior: 'smooth' });
  };

  TPL.safeJsonSet = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { console.warn('No se pudo guardar', key, error); }
  };

  TPL.getGlobalArray = (name) => {
    const value = window[name] || globalThis[name];
    return Array.isArray(value) ? value : [];
  };

  TPL.getFirstArray = (names) => {
    for (const name of names) {
      const arr = TPL.getGlobalArray(name);
      if (arr.length) return arr;
    }
    return [];
  };

  TPL.parcelasList = () => TPL.getGlobalArray('SERVER_PARCELAS');
  TPL.casasList = () => TPL.getGlobalArray('SERVER_CASAS');
  TPL.fundacionesList = () => TPL.getGlobalArray('SERVER_FUNDACIONES');

  TPL.parcelaPrice = (p) => TPL.parseMoney(p?.precio || p?.valor || p?.valorParcela);
  TPL.casaPrice = (c) => Number(c?.valorCasa || c?.precio || c?.valor || 0);
  TPL.parcelaM2 = (p) => Number(p?.tamano || p?.superficie || p?.m2 || 0);
  TPL.casaM2 = (c) => Number(c?.metros || c?.m2 || c?.superficie || 0);
  TPL.imgParcela = (p) => (Array.isArray(p?.imagenes) && p.imagenes[0]) || p?.imagen || 'image/placeholder-parcela.jpg';
  TPL.imgCasa = (c) => c?.foto || (Array.isArray(c?.imagenes) && c.imagenes[0]) || c?.imagen || 'image/placeholder-casa.jpg';

})(window, document);
