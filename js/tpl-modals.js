/* =========================================================
   Tu Parcela Lista v2 - Modales globales del index
   Inyecta los modales fuera del HTML principal para mantener
   index.html limpio y evitar contenido visible bajo el footer.
========================================================= */
(function () {
  function injectTplModals() {
    if (!document.body) return;

    if (!document.getElementById('tpl-info-modal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div aria-hidden="true" class="tpl-info-modal" id="tpl-info-modal">
          <div class="tpl-info-backdrop" data-close-info-modal></div>
          <section aria-labelledby="tpl-info-title" aria-modal="true" class="tpl-info-dialog" role="dialog">
            <button aria-label="Cerrar ficha" class="tpl-info-close" data-close-info-modal type="button">×</button>
            <div class="tpl-info-cover">
              <img alt="Ficha informativa" id="tpl-info-img" src="image/placeholder-parcela.jpg">
            </div>
            <div class="tpl-info-body">
              <span class="tpl-info-kicker" id="tpl-info-kicker">Ficha informativa</span>
              <h3 id="tpl-info-title">Detalle seleccionado</h3>
              <p id="tpl-info-desc">Información del proyecto seleccionado.</p>
              <div class="tpl-info-grid" id="tpl-info-grid"></div>
              <div class="tpl-info-actions" id="tpl-info-actions"></div>
            </div>
          </section>
        </div>
      `);
    }

    if (!document.getElementById('tpl-location-modal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div aria-hidden="true" class="tpl-location-modal" id="tpl-location-modal">
          <div class="tpl-location-backdrop" data-close-location-modal></div>
          <section aria-labelledby="tpl-location-title" aria-modal="true" class="tpl-location-dialog tpl-location-dialog-premium" role="dialog">
            <button aria-label="Cerrar mapa" class="tpl-location-close" data-close-location-modal type="button">×<span>Cerrar</span></button>
            <div class="tpl-location-panel">
              <aside class="tpl-location-side">
                <span class="tpl-location-kicker">Ubicación de la parcela</span>

                <div class="tpl-location-info">
                  <div>
                    <strong id="tpl-location-name">Parcela seleccionada</strong>
                    <span id="tpl-location-meta">Superficie y comuna</span>
                  </div>
                </div>

                <div class="tpl-location-distance" id="tpl-location-distance">
                  Activa tu ubicación para calcular distancia aproximada.
                </div>

                <div class="tpl-location-actions">
                  <button id="tpl-location-geolocate" type="button">📍 Activar mi ubicación</button>
                  <a href="#" id="tpl-location-directions" rel="noopener" target="_blank">🧭 Cómo llegar</a>
                  <a href="#" id="tpl-location-waze" rel="noopener" target="_blank">🚗 Abrir Waze</a>
                  <a href="#" id="tpl-location-detail">Ver ficha completa</a>
                </div>
              </aside>

              <div class="tpl-location-map-wrap">
                <div class="tpl-location-map" id="tpl-location-map"></div>
                <div class="tpl-location-map-actions">
                  <button id="tpl-location-street" type="button">Mapa</button>
                  <button class="active" id="tpl-location-satellite" type="button">Satélite</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      `);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectTplModals, { once: true });
  } else {
    injectTplModals();
  }
})();
