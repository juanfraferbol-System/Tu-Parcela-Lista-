/* =========================================================
   Tu Parcela Lista v2 - Menú y navegación
========================================================= */
(function (window, document) {
  'use strict';
  const TPL = window.TPL || {};

  function closeMobileMenu(toggle, links) {
    links?.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    toggle?.setAttribute('aria-expanded', 'false');
  }

  function initMobileMenu() {
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMobileMenu(toggle, links));
    });
  }

  function initAnchorNavigation() {
    TPL.$$('a[href="#casas-section"], a[href="index.html#casas-section"]').forEach((a) => {
      a.addEventListener('click', (event) => {
        event.preventDefault();
        TPL.goTo?.('#casas-section');
      });
    });

    TPL.$$('a[href="#promos"], a[href="index.html#promos"]').forEach((a) => {
      a.addEventListener('click', (event) => {
        event.preventDefault();
        TPL.goTo?.('#promos');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initAnchorNavigation();
  });
})(window, document);
