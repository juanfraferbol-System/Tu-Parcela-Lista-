(function () {
  'use strict';
  const hiddenRoutes = ['/plataforma/partners/', '/tuparcelalistamanager/'];
  const hiddenSelectors = ['a[href*="plataforma/partners"]', 'a[href*="tuparcelalistamanager"]'];
  function applyLaunchMode() {
    const mode = window.TPL_CONFIG?.lanzamiento?.modo || 'piloto_limitado';
    if (mode === 'crecimiento') return;
    hiddenSelectors.forEach((selector) => document.querySelectorAll(selector).forEach((node) => { node.hidden = true; node.setAttribute('aria-hidden', 'true'); }));
    if (hiddenRoutes.some((route) => location.pathname.startsWith(route))) location.replace('/404.html');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyLaunchMode);
  else applyLaunchMode();
})();