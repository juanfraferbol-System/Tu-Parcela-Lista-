/* =========================================================
   TPL CORE 2.1 - Navegación interna segura
========================================================= */
(function (window) {
  'use strict';

  window.TPL = window.TPL || {};

  function scrollToSelector(selector, options = {}) {
    const el = document.querySelector(selector);
    if (!el) return false;
    const offset = Number(options.offset ?? window.TPL.config?.ui?.scrollOffset ?? 90);
    const top = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - offset);
    window.scrollTo({ top, behavior: options.behavior || 'smooth' });
    return true;
  }

  function go(routeName) {
    const route = window.TPL.config?.routes?.[routeName];
    if (route) window.location.href = route;
  }

  function initAnchorRouter() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const target = link.getAttribute('href');
      if (!target || target === '#') return;
      const handled = scrollToSelector(target);
      if (handled) event.preventDefault();
    });
  }

  window.TPL.router = {
    scrollToSelector,
    go,
    initAnchorRouter
  };
})(window);
