/* =========================================================
   Tu Parcela Lista v2 - Botones seguros del mapa modal
   Mantiene clickeables cerrar, mapa/satélite y geolocalización.
========================================================= */
(function (window, document) {
  'use strict';

  function closeModal() {
    const modal = document.getElementById('tpl-location-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('tpl-location-open');
  }

  window.closeLocationModal = window.closeLocationModal || closeModal;

  document.addEventListener('click', function (event) {
    const closeBtn = event.target.closest('[data-close-location-modal], .tpl-location-close');
    if (closeBtn) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      (window.closeLocationModal || closeModal)();
      return false;
    }

    const streetBtn = event.target.closest('#tpl-location-street');
    if (streetBtn) {
      event.preventDefault();
      event.stopPropagation();
      window.setLocationLayer?.('street');
      return false;
    }

    const satBtn = event.target.closest('#tpl-location-satellite');
    if (satBtn) {
      event.preventDefault();
      event.stopPropagation();
      window.setLocationLayer?.('satellite');
      return false;
    }

    const geoBtn = event.target.closest('#tpl-location-geolocate');
    if (geoBtn) {
      event.preventDefault();
      event.stopPropagation();
      window.activateUserLocationForModal?.();
      return false;
    }
  }, true);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') (window.closeLocationModal || closeModal)();
  });
})(window, document);
