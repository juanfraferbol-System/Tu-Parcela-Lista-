/* =========================================================
   TPL v2.2.7 - Flujo guiado, promos y ajustes UX
   Este archivo actúa como capa final: no reemplaza app.js,
   solo corrige/ordena la experiencia visual y algunos flujos.
========================================================= */
(function () {
  "use strict";

  const CLP = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  });

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function money(value) {
    return CLP.format(Number(value || 0));
  }

  function parsePrice(value) {
    if (typeof value === "number") return value;
    return Number(String(value || "").replace(/[^\d]/g, "")) || 0;
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function uniqueById(list) {
    const seen = new Set();
    return (list || []).filter(item => {
      if (!item) return false;
      const id = String(item.id || item.nombre || JSON.stringify(item));
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function getParcelas() {
    return uniqueById([
      ...(Array.isArray(window.parcelas) ? window.parcelas : []),
      ...(Array.isArray(window.parcelasPortal) ? window.parcelasPortal : []),
      ...(Array.isArray(window.parcelasDuenos) ? window.parcelasDuenos : [])
    ]).filter(p => p && p.id);
  }

  function getCasas() {
    return uniqueById([
      ...(Array.isArray(window.casas) ? window.casas : []),
      ...(Array.isArray(window.casasPrefabricadas) ? window.casasPrefabricadas : []),
      ...(Array.isArray(window.modelosCasas) ? window.modelosCasas : [])
    ]).filter(c => c && c.id);
  }

  function parcelaImg(p) {
    return (Array.isArray(p?.imagenes) && p.imagenes[0]) || p?.imagen || p?.foto || "image/placeholder-parcela.jpg";
  }

  function casaImg(c) {
    const imgs = Array.isArray(c?.imagenes) ? c.imagenes : [];
    return c?.foto || imgs.find(img => !normalize(img).includes("plano")) || imgs[0] || c?.imagen || "image/placeholder-casa.jpg";
  }

  function casaM2(c) {
    return Number(c?.metros || c?.m2 || c?.superficie || 0) || 0;
  }

  function casaRooms(c) {
    return Number(c?.habitaciones || c?.dormitorios || 0) || 0;
  }

  function casaPrice(c) {
    return Number(c?.valorCasa || c?.precio || c?.valor || 0) || parsePrice(c?.precioTexto);
  }

  function parcelaM2(p) {
    return Number(p?.tamano || p?.superficie || p?.m2 || 0) || 0;
  }

  function chooseCheapestCombos(limit = 5) {
    const parcelas = getParcelas()
      .filter(p => parsePrice(p.precio) > 0)
      .sort((a, b) => parsePrice(a.precio) - parsePrice(b.precio));

    const casas = getCasas()
      .filter(c => casaPrice(c) > 0)
      .sort((a, b) => casaPrice(a) - casaPrice(b));

    const combos = [];
    parcelas.slice(0, Math.min(parcelas.length, 12)).forEach(p => {
      casas.slice(0, Math.min(casas.length, 12)).forEach(c => {
        combos.push({
          parcela: p,
          casa: c,
          total: parsePrice(p.precio) + casaPrice(c)
        });
      });
    });

    return combos
      .sort((a, b) => a.total - b.total)
      .filter((combo, index, arr) => {
        const key = `${combo.parcela.id}__${combo.casa.id}`;
        return arr.findIndex(x => `${x.parcela.id}__${x.casa.id}` === key) === index;
      })
      .slice(0, limit);
  }

  function revealContent(target = "all") {
    document.body.classList.add("tpl-guided-revealed");

    if (target === "parcelas" || target === "all") {
      document.body.classList.add("tpl-show-parcelas");
    }
    if (target === "casas" || target === "combo" || target === "all") {
      document.body.classList.add("tpl-show-casas");
      $("#casas-section")?.classList.add("active");
    }
    if (target === "combo") {
      document.body.classList.add("tpl-focus-combo-proposals");
    }
  }

  function setupGuidedMode() {
    document.body.classList.add("tpl-guided-mode");

    if (location.hash === "#parcelas-anchor") revealContent("parcelas");
    if (location.hash === "#casas-section") revealContent("casas");
    if (location.hash === "#promos") revealContent("all");

    $$('a[href="#parcelas-anchor"], .hero-action-primary').forEach(link => {
      link.addEventListener("click", () => revealContent("parcelas"), { capture: true });
    });

    $$('a[href="#casas-section"], .hero-action-soft').forEach(link => {
      link.addEventListener("click", () => revealContent("casas"), { capture: true });
    });

    $$('a[href="#promos"]').forEach(link => {
      link.addEventListener("click", () => revealContent("all"), { capture: true });
    });

    $("#opt-parcela")?.addEventListener("click", () => {
      document.body.classList.remove("tpl-focus-combo-proposals");
    }, { capture: true });

    $("#opt-combo")?.addEventListener("click", () => {
      document.body.classList.add("tpl-focus-combo-proposals");
    }, { capture: true });

    $("#budget-go")?.addEventListener("click", () => {
      const comboMode = document.body.classList.contains("tpl-focus-combo-proposals") ||
        window.state?.mode === "combo";
      revealContent(comboMode ? "combo" : "parcelas");
    }, { capture: true });

    // Si el usuario empieza a bajar la página, revelamos el catálogo completo.
    let revealedByScroll = false;
    const revealOnScrollIntent = () => {
      if (revealedByScroll || document.body.classList.contains("tpl-guided-revealed")) return;
      revealedByScroll = true;
      revealContent("all");
    };

    window.addEventListener("wheel", ev => {
      if (ev.deltaY > 30) revealOnScrollIntent();
    }, { passive: true });

    window.addEventListener("touchmove", revealOnScrollIntent, { passive: true });
  }

  function renderPromosFinal() {
    const grid = $("#promos-grid");
    if (!grid) return;

    const combos = chooseCheapestCombos(5);
    if (!combos.length) return;

    const labels = [
      "Más económico",
      "Gran oportunidad",
      "Familiar eficiente",
      "Precio destacado",
      "Proyecto recomendado"
    ];

    grid.innerHTML = combos.map((combo, index) => {
      const p = combo.parcela;
      const c = combo.casa;
      const m2 = parcelaM2(p);
      const rooms = casaRooms(c);
      const meters = casaM2(c);
      const housePrice = casaPrice(c);
      const landPrice = parsePrice(p.precio);

      return `
        <article class="tpl-promo-pro-card" data-promo-parcela="${p.id}" data-promo-casa="${c.id}">
          <div class="tpl-promo-ribbon">${labels[index] || "Promo"}</div>
          <div class="tpl-promo-media">
            <img src="${parcelaImg(p)}" alt="${p.nombre || "Parcela"}" loading="lazy">
            <img src="${casaImg(c)}" alt="${c.nombre || "Casa"}" loading="lazy">
            <span class="tpl-promo-count">Proyecto ${index + 1}</span>
          </div>
          <div class="tpl-promo-body">
            <span class="tpl-promo-kicker">Parcela + casa</span>
            <h3>${p.nombre || "Parcela"} + ${c.nombre || "Casa"}</h3>
            <p>${p.comuna || "Chile"} · ${m2.toLocaleString("es-CL")} m² terreno · ${rooms || "—"} hab · ${meters || "—"} m² casa</p>
            <div class="tpl-promo-values">
              <span><b>Parcela</b>${p.precio || money(landPrice)}</span>
              <span><b>Casa</b>${money(housePrice)}</span>
            </div>
            <div class="tpl-promo-total">
              <small>Total referencial desde</small>
              <strong>${money(combo.total)}</strong>
            </div>
            <div class="tpl-promo-actions">
              <button type="button" class="tpl-promo-primary">Cotizar proyecto</button>
              <button type="button" class="tpl-promo-location">Ver ubicación</button>
            </div>
          </div>
        </article>`;
    }).join("");

    $$(".tpl-promo-pro-card", grid).forEach(card => {
      const parcelaId = card.dataset.promoParcela;
      const casaId = card.dataset.promoCasa;

      const selectPromo = () => {
        revealContent("all");
        if (typeof window.TPLSelectProyectoListo === "function") {
          window.TPLSelectProyectoListo(parcelaId, casaId);
        } else {
          localStorage.setItem("selectedParcelaId", parcelaId);
          localStorage.setItem("selectedCasaId", casaId);
          document.getElementById("cotizador-section")?.classList.add("active");
          document.getElementById("cotizador-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };

      card.addEventListener("click", ev => {
        if (ev.target.closest(".tpl-promo-location")) return;
        selectPromo();
      });

      $(".tpl-promo-primary", card)?.addEventListener("click", ev => {
        ev.stopPropagation();
        selectPromo();
      });

      $(".tpl-promo-location", card)?.addEventListener("click", ev => {
        ev.stopPropagation();
        const p = getParcelas().find(x => String(x.id) === String(parcelaId));
        if (p && typeof window.openLocationModal === "function") window.openLocationModal(p);
      });
    });
  }

  function fixLocationModalLayout() {
    const modal = $("#tpl-location-modal");
    if (!modal) return;

    // Cuando se abre el mapa, evitamos que controles Leaflet queden bajo botones flotantes.
    setTimeout(() => {
      $$(".tpl-location-modal .leaflet-control-zoom").forEach(control => {
        control.classList.add("tpl-location-zoom-safe");
      });
    }, 200);
  }

  function setupModalWatchers() {
    const observer = new MutationObserver(() => {
      fixLocationModalLayout();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    document.addEventListener("click", ev => {
      if (ev.target.closest(".combo-location-link, .card-location-link, .promo-location-button, .tpl-promo-location, [data-summary-location]")) {
        setTimeout(fixLocationModalLayout, 250);
      }
    }, true);
  }

  function setupComboScrollSafety() {
    document.addEventListener("click", ev => {
      if (ev.target.closest("#budget-go")) {
        const comboMode = document.body.classList.contains("tpl-focus-combo-proposals") || window.state?.mode === "combo";
        if (!comboMode) return;

        revealContent("combo");

        setTimeout(() => {
          const section = $("#combo-proposals-section");
          if (!section || section.hidden) return;
          const top = section.getBoundingClientRect().top + window.pageYOffset - 96;
          window.scrollTo({ top, behavior: "smooth" });
        }, 420);
      }
    }, true);
  }

  function setupSummaryModalScrollFix() {
    document.addEventListener("click", ev => {
      if (!ev.target.closest("[data-project-info]")) return;
      setTimeout(() => {
        const modal = $("#summary-info-modal");
        if (!modal) return;
        modal.classList.add("tpl-summary-scroll-safe");
      }, 100);
    }, true);
  }

  function boot() {
    setupGuidedMode();
    setupModalWatchers();
    setupComboScrollSafety();
    setupSummaryModalScrollFix();

    // app.js también renderiza promos; esta capa final asegura 5 promociones económicas.
    setTimeout(renderPromosFinal, 200);
    setTimeout(renderPromosFinal, 900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();