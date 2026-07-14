/* =========================================================
   Tu Parcela Lista v2 - Acceso al cotizador desde index
========================================================= */
(function (window, document) {
  'use strict';

  function enableCotizadorButton() {
    const btn = document.getElementById('btn-cotizador');
    if (!btn) return;

    const hasParcela = Boolean(window.state?.selectedParcela || localStorage.getItem('selectedParcelaId'));
    btn.disabled = !hasParcela;
    btn.style.opacity = hasParcela ? '1' : '0.5';
    btn.style.cursor = hasParcela ? 'pointer' : 'not-allowed';
  }

  function initCotizadorButton() {
    const btn = document.getElementById('btn-cotizador');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const parcelaSeleccionada = window.state?.selectedParcela || null;
      const parcelaId = parcelaSeleccionada?.id || localStorage.getItem('selectedParcelaId');

      if (!parcelaId) {
        alert('Primero debes seleccionar una parcela.');
        return;
      }

      localStorage.setItem('selectedParcelaId', String(parcelaId));
      if (parcelaSeleccionada) {
        try { localStorage.setItem('selectedParcelaData', JSON.stringify(parcelaSeleccionada)); } catch (error) {}
      }

      if (window.state?.selectedCasa?.id) {
        localStorage.setItem('selectedCasaId', String(window.state.selectedCasa.id));
      }

      window.location.href = 'cotizador.html';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initCotizadorButton();
    enableCotizadorButton();
    setInterval(enableCotizadorButton, 500);
  });
})(window, document);
