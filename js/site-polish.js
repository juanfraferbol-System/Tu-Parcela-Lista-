(function () {
  "use strict";

  const ready = (fn) => document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", fn, { once: true })
    : fn();

  ready(function () {
    const main = document.querySelector("main") || document.querySelector("[role='main']");
    if (main && !main.id) main.id = "contenido-principal";
    if (main && !document.querySelector(".skip-link")) {
      const skip = document.createElement("a");
      skip.className = "skip-link";
      skip.href = "#" + main.id;
      skip.textContent = "Saltar al contenido";
      document.body.prepend(skip);
    }

    document.querySelectorAll("a[target='_blank']").forEach(function (link) {
      const rel = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
      rel.add("noopener"); rel.add("noreferrer");
      link.setAttribute("rel", Array.from(rel).join(" "));
    });

    document.querySelectorAll("img:not([loading])").forEach(function (img, index) {
      if (index > 0 && !img.closest(".hero, .hero-section")) img.loading = "lazy";
      img.decoding = "async";
    });

    const toggle = document.getElementById("nav-toggle");
    const nav = document.getElementById("nav-links") || document.querySelector(".nav-links");
    if (toggle && nav) {
      toggle.setAttribute("aria-controls", nav.id || "nav-links");
      if (!nav.id) nav.id = "nav-links";
      if (!toggle.hasAttribute("aria-expanded")) toggle.setAttribute("aria-expanded", "false");
      toggle.addEventListener("click", function () {
        setTimeout(function () {
          const open = nav.classList.contains("active") || nav.classList.contains("open") || document.body.classList.contains("nav-open");
          toggle.setAttribute("aria-expanded", String(open));
          toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
        }, 0);
      });
      nav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          nav.classList.remove("active", "open");
          document.body.classList.remove("nav-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      document.querySelectorAll(".active, .open, [aria-hidden='false']").forEach(function (el) {
        if (el.matches(".modal, .lightbox, .nav-links, [role='dialog']")) {
          el.classList.remove("active", "open");
          if (el.hasAttribute("aria-hidden")) el.setAttribute("aria-hidden", "true");
        }
      });
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open", "modal-open");
    });

    document.querySelectorAll("button:not([type])").forEach(function (button) {
      if (!button.closest("form")) button.type = "button";
    });

    document.querySelectorAll("a[href='#']").forEach(function (link) {
      if (link.classList.contains("logo-container")) link.href = "index.html";
    });

    // Ya no se inyecta banner inferior
    // initInfoBanner();
    applyIncomingFilter();
    initDeferredExtras();
    initProjectExperience();
    initNavbarObserver();
  });

  function initNavbarObserver() {
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"], .nav-links a[href^="index.html#"]');
    if (!navLinks.length) return;
    
    // Marcar por defecto si estamos en una pgina como como-comprar.html
    const currentPath = window.location.pathname.split("/").pop();
    document.querySelectorAll('.nav-links a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href === currentPath && currentPath !== '' && currentPath !== 'index.html') {
        link.classList.add('active');
      }
    });

    if (currentPath !== '' && currentPath !== 'index.html') return; // Solo index usa observer para anclas

    const sections = Array.from(navLinks).map(link => {
      const href = link.getAttribute("href");
      const id = href.includes("#") ? href.substring(href.indexOf("#") + 1) : "";
      return document.getElementById(id);
    }).filter(Boolean);

    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('active'));
          const id = entry.target.id;
          const activeLink = document.querySelector(`.nav-links a[href="#${id}"], .nav-links a[href="index.html#${id}"]`);
          if (activeLink) activeLink.classList.add('active');
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });

    sections.forEach(sec => observer.observe(sec));
  }

  function initInfoBanner() {
    if (!document.querySelector("header") || /(?:admin-publicaciones|CRM)\.html/i.test(location.pathname) || document.querySelector(".tpl-info-banner")) return;
    const slides = [
      { label: "Oportunidades", text: "Conoce primero los proyectos más económicos", href: "index.html?filtro=economicas#parcelas-anchor" },
      { label: "Agua y naturaleza", text: "Explora parcelas con agua, bosque y entorno rural", href: "index.html?filtro=agua#parcelas-anchor" },
      { label: "Proyecto completo", text: "Elige parcela + casa y cotiza todo en un solo lugar", href: "index.html#decision-flow" },
      { label: "Vida de campo", text: "Más espacio para vivir, descansar y compartir en familia", href: "como-comprar.html" },
      { label: "Casas", text: "Compara modelos y encuentra la casa que se adapta a ti", href: "index.html#casas-section" },
      { label: "Publica", text: "¿Tienes un terreno? Prepara tu anuncio paso a paso", href: "plataforma/publicar/" }
    ];
    const banner = document.createElement("section");
    banner.className = "tpl-info-banner";
    banner.setAttribute("aria-label", "Información destacada");
    banner.innerHTML = `<button type="button" class="tpl-info-prev" aria-label="Mensaje anterior">‹</button><a class="tpl-info-link" href="#"><span></span><strong></strong><b aria-hidden="true">→</b></a><button type="button" class="tpl-info-next" aria-label="Mensaje siguiente">›</button>`;
    document.querySelector("header").insertAdjacentElement("afterend", banner);
    let index = 0;
    let timer = null;
    const draw = function () {
      const slide = slides[index];
      const link = banner.querySelector(".tpl-info-link");
      link.href = slide.href;
      link.querySelector("span").textContent = slide.label;
      link.querySelector("strong").textContent = slide.text;
      banner.dataset.slide = String(index + 1);
    };
    const move = function (delta) { index = (index + delta + slides.length) % slides.length; draw(); };
    const start = function () { clearInterval(timer); timer = setInterval(function () { move(1); }, 5200); };
    banner.querySelector(".tpl-info-prev").addEventListener("click", function () { move(-1); start(); });
    banner.querySelector(".tpl-info-next").addEventListener("click", function () { move(1); start(); });
    banner.addEventListener("mouseenter", function () { clearInterval(timer); });
    banner.addEventListener("mouseleave", start);
    banner.addEventListener("focusin", function () { clearInterval(timer); });
    banner.addEventListener("focusout", start);
    draw(); start();
  }

  function applyIncomingFilter() {
    if (!/index\.html$|\/$/.test(location.pathname)) return;
    const filter = new URLSearchParams(location.search).get("filtro");
    if (!filter) return;
    const selector = filter === "economicas" ? "#filter-economic" : filter === "agua" ? "#filter-water" : "";
    if (!selector) return;
    setTimeout(function () {
      const button = document.querySelector(selector);
      if (button) button.click();
      document.querySelector("#parcelas-anchor")?.scrollIntoView({ block: "start" });
    }, 900);
  }

  function initDeferredExtras() {
    const extrasBox = document.querySelector("#deferred-extras-box");
    const whatsappButton = document.querySelector("#whatsapp-btn");
    const activateButton = document.querySelector("#activate-project-btn");
    if (!extrasBox || (!whatsappButton && !activateButton) || document.querySelector("#tpl-extras-gate")) return;

    const modal = document.createElement("div");
    modal.id = "tpl-extras-gate";
    modal.className = "tpl-extras-gate";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="tpl-extras-gate-backdrop" data-extras-close></div>
      <section class="tpl-extras-gate-panel" role="dialog" aria-modal="true" aria-labelledby="tpl-extras-title">
        <button type="button" class="tpl-extras-gate-close" data-extras-close aria-label="Cerrar">×</button>
        <span class="tpl-extras-gate-kicker">ÚLTIMO PASO OPCIONAL</span>
        <h2 id="tpl-extras-title">¿Quieres agregar algo antes de continuar?</h2>
        <p>Selecciona solo lo que necesites. El total se actualiza con la misma fórmula del cotizador.</p>
        <div class="tpl-extras-gate-slot"></div>
        <div class="tpl-extras-gate-total"><span>Total actualizado</span><strong data-extras-total>$0</strong></div>
        <div class="tpl-extras-gate-actions">
          <button type="button" class="secondary" data-extras-skip>Continuar sin extras</button>
          <button type="button" class="primary" data-extras-continue>Usar selección y continuar</button>
        </div>
      </section>`;
    document.body.appendChild(modal);
    const slot = modal.querySelector(".tpl-extras-gate-slot");
    let pendingAction = null;
    let bypassGate = false;

    const updateTotal = function () {
      const value = document.querySelector("#total-amount")?.textContent || "$0";
      modal.querySelector("[data-extras-total]").textContent = value;
    };
    const open = function (button) {
      pendingAction = button;
      extrasBox.hidden = false;
      slot.appendChild(extrasBox);
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("tpl-extras-open");
      updateTotal();
      modal.querySelector("[data-extras-continue]").focus();
    };
    const close = function () {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("tpl-extras-open");
      extrasBox.hidden = true;
    };
    const proceed = function () {
      const button = pendingAction;
      close();
      if (!button) return;
      bypassGate = true;
      setTimeout(function () { button.click(); bypassGate = false; }, 0);
    };

    document.addEventListener("click", function (event) {
      const button = event.target.closest("#whatsapp-btn, #activate-project-btn");
      if (!button || bypassGate) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      open(button);
    }, true);
    modal.querySelectorAll("[data-extras-close]").forEach(function (button) { button.addEventListener("click", close); });
    modal.querySelector("[data-extras-continue]").addEventListener("click", proceed);
    modal.querySelector("[data-extras-skip]").addEventListener("click", function () {
      extrasBox.querySelectorAll(".extra-checkbox:checked").forEach(function (checkbox) {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      });
      updateTotal();
      proceed();
    });
    modal.addEventListener("keydown", function (event) { if (event.key === "Escape") close(); });
    const total = document.querySelector("#total-amount");
    if (total) new MutationObserver(updateTotal).observe(total, { childList: true, characterData: true, subtree: true });
  }

  function safeJson(value, fallback) {
    try { return JSON.parse(value || "") || fallback; } catch (_) { return fallback; }
  }

  function getCatalog(name) {
    try {
      if (name === "parcelas" && typeof parcelas !== "undefined" && Array.isArray(parcelas)) return parcelas;
      if (name === "casas" && typeof casas !== "undefined" && Array.isArray(casas)) return casas;
    } catch (_) {}
    return [];
  }

  function itemImage(item, type) {
    if (!item) return "";
    return type === "parcela"
      ? (item.imagen || (item.imagenes && item.imagenes[0]) || "image/placeholder-parcela.jpg")
      : (item.foto || item.imagen || (item.imagenes && item.imagenes[0]) || "image/placeholder-casa.jpg");
  }

  function getSelected(type) {
    const prefix = type === "parcela" ? "Parcela" : "Casa";
    const saved = safeJson(localStorage.getItem("selected" + prefix + "Data"), null);
    if (saved) return saved;
    const id = localStorage.getItem("selected" + prefix + "Id");
    return getCatalog(type === "parcela" ? "parcelas" : "casas").find(function (x) { return String(x.id) === String(id); }) || null;
  }

  function initProjectExperience() {
    // La ficha de parcela ya tiene sus propias acciones de selección y cotización.
    // Evita inyectar después del footer la bandeja global con imágenes sin estilos.
    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath.endsWith("/parcela.html") || currentPath.endsWith("parcela.html")) return;
    if (!document.body || document.querySelector(".tpl-project-tray")) return;

    const tray = document.createElement("aside");
    tray.className = "tpl-project-tray";
    tray.setAttribute("aria-label", "Proyecto guardado");
    document.body.appendChild(tray);
    document.body.classList.add("tpl-has-project-tray");

    function renderTray() {
      const parcela = getSelected("parcela");
      const casa = getSelected("casa");
      const favorites = safeJson(localStorage.getItem("tplFavorites"), []);
      const compare = safeJson(localStorage.getItem("tplCompare"), []);
      const collapsed = localStorage.getItem("tplTrayCollapsed") === "1";
      tray.classList.toggle("is-collapsed", collapsed);
      tray.classList.toggle("is-empty", !parcela && !casa);
      const nextHref = parcela && casa ? "index.html#cotizador-section" : parcela ? "index.html#casas-section" : "index.html#parcelas-anchor";
      const nextLabel = parcela && casa ? "Ir al cotizador" : parcela ? "Elegir una casa" : "Comenzar proyecto";
      const chips = [
        parcela ? projectChip(parcela, "parcela", "Parcela") : "",
        casa ? projectChip(casa, "casa", "Casa") : ""
      ].join("");
      tray.innerHTML = `
        <div class="tpl-project-tray-head">
          <div class="tpl-project-tray-title"><i aria-hidden="true"></i><span>${parcela || casa ? "Tu proyecto guardado" : "Arma tu proyecto parcela + casa"}</span></div>
          <div class="tpl-project-tray-tools">
            <button type="button" data-tpl-show-favorites aria-label="Ver favoritos">♡ <span data-tpl-tool-label>${favorites.length}</span></button>
            <button type="button" data-tpl-show-compare aria-label="Comparar parcelas">⇄ <span data-tpl-tool-label>${compare.length}</span></button>
            <button type="button" data-tpl-collapse aria-label="${collapsed ? "Expandir proyecto" : "Minimizar proyecto"}">${collapsed ? "▴" : "▾"}</button>
          </div>
        </div>
        <div class="tpl-project-tray-body">
          <div class="tpl-project-tray-items">${chips || '<span class="tpl-project-empty">Elige una parcela y la guardaremos aquí mientras navegas.</span>'}</div>
          <div class="tpl-project-actions">
            ${parcela || casa ? '<button type="button" class="secondary" data-tpl-clear-project>Limpiar</button>' : ""}
            <a class="primary" href="${nextHref}">${nextLabel} →</a>
          </div>
        </div>`;
      tray.querySelector("[data-tpl-collapse]")?.addEventListener("click", function () {
        localStorage.setItem("tplTrayCollapsed", tray.classList.contains("is-collapsed") ? "0" : "1");
      });
      tray.querySelectorAll("[data-tpl-remove]").forEach(function (button) {
        button.addEventListener("click", function () {
          const type = button.dataset.tplRemove;
          const prefix = type === "parcela" ? "Parcela" : "Casa";
          localStorage.removeItem("selected" + prefix + "Id");
          localStorage.removeItem("selected" + prefix + "Data");
        });
      });
      tray.querySelector("[data-tpl-clear-project]")?.addEventListener("click", function () {
        ["selectedParcelaId","selectedParcelaData","selectedCasaId","selectedCasaData","tplComboAutoInstallation"].forEach(function (key) { localStorage.removeItem(key); });
      });
      tray.querySelector("[data-tpl-show-compare]")?.addEventListener("click", showCompare);
      tray.querySelector("[data-tpl-show-favorites]")?.addEventListener("click", showFavorites);
    }

    function projectChip(item, type, label) {
      const name = item.nombre || item.titulo || (type === "parcela" ? "Parcela elegida" : "Casa elegida");
      return `<div class="tpl-project-chip"><img src="${itemImage(item, type)}" alt=""><span><small>${label}</small><strong>${name}</strong></span><button type="button" data-tpl-remove="${type}" aria-label="Quitar ${label.toLowerCase()}">×</button></div>`;
    }

    function enhanceCards() {
      document.querySelectorAll(".parcel-card, .parcela-card").forEach(function (card) {
        if (card.querySelector(".tpl-card-tools")) return;
        const link = card.querySelector('a[href*="parcela.html?id="]');
        if (!link) return;
        const id = new URL(link.href, location.href).searchParams.get("id");
        if (!id) return;
        const tools = document.createElement("div");
        tools.className = "tpl-card-tools tpl-card-tools-grid";
        tools.innerHTML = `<button type="button" data-tpl-favorite="${id}" aria-label="Guardar en favoritos" title="Guardar en favoritos">♡</button>`;
        (card.querySelector(".card-image-wrapper, .card-gallery-container, .card-image") || card).appendChild(tools);
      });
      const detailTarget = document.querySelector(".detail-header-layout, .detail-main-info");
      const detailId = new URLSearchParams(location.search).get("id");
      if (detailTarget && detailId && !detailTarget.querySelector(".tpl-card-tools")) {
        const tools = document.createElement("div");
        tools.className = "tpl-card-tools";
        tools.innerHTML = `<button type="button" data-tpl-favorite="${detailId}" aria-label="Guardar parcela en favoritos">♡</button><button type="button" data-tpl-compare="${detailId}" aria-label="Agregar parcela a comparación">⇄</button>`;
        detailTarget.appendChild(tools);
      }
      syncCardTools();
    }

    function syncCardTools() {
      const favorites = safeJson(localStorage.getItem("tplFavorites"), []);
      const compare = safeJson(localStorage.getItem("tplCompare"), []);
      document.querySelectorAll("[data-tpl-favorite]").forEach(function (button) { button.classList.toggle("is-active", favorites.some(function (x) { return String(x.id) === button.dataset.tplFavorite; })); });
      document.querySelectorAll("[data-tpl-compare]").forEach(function (button) { button.classList.toggle("is-active", compare.some(function (x) { return String(x.id) === button.dataset.tplCompare; })); });
    }

    document.addEventListener("click", function (event) {
      const favoriteButton = event.target.closest("[data-tpl-favorite]");
      const compareButton = event.target.closest("[data-tpl-compare]");
      if (!favoriteButton && !compareButton) return;
      event.preventDefault(); event.stopPropagation();
      const button = favoriteButton || compareButton;
      const key = favoriteButton ? "tplFavorites" : "tplCompare";
      const id = favoriteButton ? button.dataset.tplFavorite : button.dataset.tplCompare;
      let list = safeJson(localStorage.getItem(key), []);
      const index = list.findIndex(function (x) { return String(x.id) === String(id); });
      if (index >= 0) list.splice(index, 1);
      else {
        if (key === "tplCompare" && list.length >= 3) { showToast("Puedes comparar hasta 3 parcelas."); return; }
        const item = getCatalog("parcelas").find(function (x) { return String(x.id) === String(id); });
        if (item) list.push(item);
      }
      localStorage.setItem(key, JSON.stringify(list));
      showToast(index >= 0 ? "Se quitó de tu selección." : (favoriteButton ? "Parcela guardada en favoritos." : "Parcela agregada a comparación."));
    }, true);

    function showCompare() {
      const list = safeJson(localStorage.getItem("tplCompare"), []);
      document.querySelector(".tpl-compare-dialog")?.remove();
      const dialog = document.createElement("div");
      dialog.className = "tpl-compare-dialog";
      dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true"); dialog.setAttribute("aria-labelledby", "tpl-compare-title");
      const columns = list.map(function (p) { return `<th><img src="${itemImage(p,"parcela")}" alt=""><br>${p.nombre || "Parcela"}<br><button class="tpl-compare-remove" type="button" data-remove-compare="${p.id}">Quitar</button></th>`; }).join("");
      const row = function (label, getter) { return `<tr><th scope="row">${label}</th>${list.map(function (p) { return `<td>${getter(p)}</td>`; }).join("")}</tr>`; };
      dialog.innerHTML = `<div class="tpl-compare-panel"><div class="tpl-compare-head"><div><small>DECIDE CON CLARIDAD</small><h2 id="tpl-compare-title">Comparar parcelas</h2></div><button class="tpl-compare-close" type="button" aria-label="Cerrar comparación">×</button></div>${list.length ? `<div style="overflow:auto"><table class="tpl-compare-table"><thead><tr><th>Característica</th>${columns}</tr></thead><tbody>${row("Precio",function(p){return p.precio||"Consultar"})}${row("Superficie",function(p){return (p.tamano||p.superficie||"—")+" m²"})}${row("Comuna",function(p){return p.comuna||"—"})}${row("Agua",function(p){return p.agua==="si"?"Sí":"Consultar"})}${row("Luz",function(p){return p.luz==="si"?"Sí":"Consultar"})}${row("Facilidad de pago",function(p){return p.facilidadPago||p.facilidad_pago||"Consultar"})}</tbody></table></div>` : '<p>Aún no agregas parcelas. Usa el botón ⇄ de las tarjetas para comparar hasta tres alternativas.</p>'}</div>`;
      document.body.appendChild(dialog); document.body.classList.add("modal-open");
      const closeCompare = function () { dialog.remove(); document.body.classList.remove("modal-open"); };
      dialog.querySelector(".tpl-compare-close").addEventListener("click", closeCompare);
      dialog.addEventListener("click", function (event) { if (event.target === dialog) closeCompare(); });
      dialog.addEventListener("keydown", function (event) { if (event.key === "Escape") closeCompare(); });
      dialog.querySelectorAll("[data-remove-compare]").forEach(function (button) { button.addEventListener("click", function () { localStorage.setItem("tplCompare", JSON.stringify(list.filter(function (p) { return String(p.id) !== button.dataset.removeCompare; }))); showCompare(); }); });
      dialog.querySelector(".tpl-compare-close").focus();
    }

    function showFavorites() {
      const list = safeJson(localStorage.getItem("tplFavorites"), []);
      document.querySelector(".tpl-favorites-dialog")?.remove();
      const dialog = document.createElement("div");
      dialog.className = "tpl-compare-dialog tpl-favorites-dialog";
      dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true"); dialog.setAttribute("aria-labelledby", "tpl-favorites-title");
      const cards = list.map(function (p) {
        return `<article style="display:grid;grid-template-columns:100px 1fr;gap:12px;padding:10px;border:1px solid var(--tpl-line);border-radius:14px"><img src="${itemImage(p,"parcela")}" alt="" style="width:100px;height:82px;object-fit:cover;border-radius:10px"><div><small>${p.comuna || "Parcela"}</small><h3 style="font-size:1rem;margin:3px 0">${p.nombre || "Parcela guardada"}</h3><strong>${p.precio || "Consultar"}</strong><div style="margin-top:8px"><a href="parcela.html?id=${encodeURIComponent(p.id)}">Ver ficha →</a> · <button class="tpl-compare-remove" type="button" data-remove-favorite="${p.id}">Quitar</button></div></div></article>`;
      }).join("");
      dialog.innerHTML = `<div class="tpl-compare-panel"><div class="tpl-compare-head"><div><small>TU SELECCIÓN</small><h2 id="tpl-favorites-title">Parcelas favoritas</h2></div><button class="tpl-compare-close" type="button" aria-label="Cerrar favoritos">×</button></div>${list.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">${cards}</div>` : '<p>Aún no guardas parcelas. Pulsa el corazón de una tarjeta para encontrarla rápidamente aquí.</p>'}</div>`;
      document.body.appendChild(dialog); document.body.classList.add("modal-open");
      const close = function () { dialog.remove(); document.body.classList.remove("modal-open"); };
      dialog.querySelector(".tpl-compare-close").addEventListener("click", close);
      dialog.addEventListener("click", function (event) { if (event.target === dialog) close(); });
      dialog.addEventListener("keydown", function (event) { if (event.key === "Escape") close(); });
      dialog.querySelectorAll("[data-remove-favorite]").forEach(function (button) { button.addEventListener("click", function () { localStorage.setItem("tplFavorites", JSON.stringify(list.filter(function (p) { return String(p.id) !== button.dataset.removeFavorite; }))); showFavorites(); }); });
      dialog.querySelector(".tpl-compare-close").focus();
    }

    function showToast(message) {
      let toast = document.querySelector(".tpl-status-toast");
      if (!toast) { toast = document.createElement("div"); toast.className = "tpl-status-toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast); }
      toast.textContent = message; toast.classList.add("is-visible");
      clearTimeout(showToast.timer); showToast.timer = setTimeout(function () { toast.classList.remove("is-visible"); }, 2400);
    }

    const observer = new MutationObserver(function () { enhanceCards(); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("storage", function () { renderTray(); syncCardTools(); });
    let storageSignature = "";
    setInterval(function () {
      const nextSignature = ["selectedParcelaId","selectedCasaId","tplFavorites","tplCompare","tplTrayCollapsed"].map(function (key) { return localStorage.getItem(key) || ""; }).join("|");
      if (nextSignature !== storageSignature) { storageSignature = nextSignature; renderTray(); syncCardTools(); }
    }, 500);
    enhanceCards(); renderTray();
  }
})();
