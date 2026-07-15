document.addEventListener("DOMContentLoaded", () => {
  const CLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
  const CONTACT_PHONE_DISPLAY = "+56988508361";
  const CONTACT_PHONE_WA = "56988508361";

  const state = {
    mode: "normal", // normal | parcela | combo
    viewMode: "grid",
    budget: 0,
    wantedRooms: "all",
    wantedMeters: 0,
    recommendationActive: false,
    selectedParcela: null,
    selectedCasa: null,
    selectedFundacion: null,
    installationService: false,
    userCoords: null,
    selectedExtras: new Map(),
    roomFilter: "all",
    projectChangeMode: localStorage.getItem("tplReturnToCotizador") || "",
    houseImageIndices: new Map(),
    activeFilters: {
      text: "",
      gps: false,
      economic: false,
      size: false,
      water: false,
      river: false,
      native: false,
      payment: false,
      commune: "all"
    }
  };

  window.state = state;

  const DOM = {
    decisionFlow: document.getElementById("decision-flow"),
    optParcela: document.getElementById("opt-parcela"),
    optCombo: document.getElementById("opt-combo"),
    budgetBox: document.getElementById("budget-box"),
    budgetInput: document.getElementById("budget-input"),
    roomInput: document.getElementById("combo-room-input"),
    metersInput: document.getElementById("combo-meters-input"),
    budgetGo: document.getElementById("budget-go"),
    budgetTitle: document.getElementById("budget-title"),
    budgetHelp: document.getElementById("budget-help"),
    comboFields: document.getElementById("combo-fields"),

    searchInput: document.getElementById("search-input"),
    searchBtn: document.getElementById("search-btn"),
    parcelasAnchor: document.getElementById("parcelas-anchor"),
    parcelasContainer: document.getElementById("parcelas-container"),
    resultsCount: document.getElementById("results-count"),
    searchTitle: document.getElementById("search-title"),
    searchSubtitle: document.getElementById("search-subtitle"),
    changeParcelaBtn: document.getElementById("change-parcela"),
    changeCasaBtn: document.getElementById("change-casa"),

    filterGps: document.getElementById("filter-gps"),
    filterEconomic: document.getElementById("filter-economic"),
    filterSize: document.getElementById("filter-size"),
    filterWater: document.getElementById("filter-water"),
    filterRiver: document.getElementById("filter-river"),
    filterPayment: document.getElementById("filter-payment"),
    filterNative: document.getElementById("filter-native"),
    filterRegionBtn: document.getElementById("filter-region-btn"),
    regionDropdown: document.getElementById("region-dropdown"),
    filterClear: document.getElementById("filter-clear"),

    btnMapView: document.getElementById("btn-map-view"),
    mapLayout: document.getElementById("map-layout"),
    mapContainer: document.getElementById("map-container"),
    mapCards: document.getElementById("map-cards"),
    mapResults: document.getElementById("map-results"),
    backToParcelas: document.getElementById("back-to-parcelas"),

    casasSection: document.getElementById("casas-section"),
    casasContainer: document.getElementById("casas-container"),
    comboProposalsSection: document.getElementById("combo-proposals-section"),
    comboProposalsContainer: document.getElementById("combo-proposals-container"),
    roomFilterButtons: document.querySelectorAll(".room-filter-btn"),

    cotizadorSection: document.getElementById("cotizador-section"),
    fundacionesContainer: document.getElementById("fundaciones-container"),
    installationServiceToggle: document.getElementById("installation-service-toggle"),
    installationStatus: document.getElementById("installation-plan-status"),
    installationPlansTitle: document.getElementById("installation-plans-title"),
    automaticosBox: document.getElementById("automaticos-box"),
    automaticosContainer: document.getElementById("automaticos-container"),
    opcionalesContainer: document.getElementById("opcionales-container"),
    summaryItems: document.getElementById("summary-items"),
    totalAmount: document.getElementById("total-amount"),
    previewParcelaImg: document.getElementById("preview-parcela-img"),
    previewCasaImg: document.getElementById("preview-casa-img"),
    previewTitle: document.getElementById("preview-title"),
    previewLocation: document.getElementById("preview-location"),
    whatsappBtn: document.getElementById("whatsapp-btn"),
    activateProjectBtn: document.getElementById("activate-project-btn"),
    activationModal: document.getElementById("project-activation-modal"),
    activationForm: document.getElementById("project-activation-form"),
    activationStatus: document.getElementById("activation-status"),
    downloadProjectPdfBtn: document.getElementById("download-project-pdf-btn")
  };

  let map = null;
  let satelliteLayer = null;
  let satelliteLabelsLayer = null;
  let streetLayer = null;
  let markers = [];
  let markerClusterLayer = null;

  function parseClp(value) {
    if (typeof value === "number") return value;
    return Number(String(value || "").replace(/[^0-9]/g, "")) || 0;
  }

  function money(value) {
    return CLP.format(Number(value) || 0);
  }

  function getCheapestFundacion() {
    if (!Array.isArray(fundaciones) || !fundaciones.length) return null;
    return [...fundaciones].sort((a, b) => Number(a.valorM2 || a.valor || a.precio || 0) - Number(b.valorM2 || b.valor || b.precio || 0))[0];
  }

  function getFundacionValue(fundacion, casa) {
    if (!fundacion || !casa) return 0;
    return Number(fundacion.valorM2 || fundacion.valor || fundacion.precio || 0) * Number(casa.metros || 1);
  }

  function getParcelaM2(parcela) {
    return Number(parcela?.tamano || parcela?.metros || parcela?.m2 || 0) || 0;
  }

  function estimatePerimeterFromM2(m2) {
    if (!m2) return 0;
    // Estimación simple: parcela aproximada cuadrada. Perímetro = 4 * raíz(m²).
    return Math.ceil(Math.sqrt(m2) * 4);
  }

  function getDefaultExtraQty(extra) {
    const id = normalizar(extra.id || extra.nombre);
    if (id.includes("cierre") || id.includes("cerco") || id.includes("perimetral")) {
      return estimatePerimeterFromM2(getParcelaM2(state.selectedParcela));
    }
    if (extra.tipoCalculo === "mt2" && extra.tipoCalculo2 === "casa") {
      return Number(state.selectedCasa?.metros || extra.defaultQty || 0);
    }
    return Number(extra.defaultQty || 0);
  }

  const PREMIUM_INCLUDED_EXTRA_PATTERNS = [
    "pintura", "ceramica", "ceramico", "instalacion electrica", "instalacion sanitaria",
    "artefactos cocina", "artefactos de cocina", "artefactos bano", "artefactos baño", "banos", "baños"
  ];

  function isPremiumInstallationPlan(fundacion = state.selectedFundacion) {
    if (!fundacion || !state.installationService) return false;
    const planIndex = Array.isArray(fundaciones) ? fundaciones.findIndex(f => String(f.id) === String(fundacion.id)) : -1;
    const text = normalizar(`${fundacion.id || ""} ${fundacion.nombre || ""}`);
    return planIndex === 2 || text.includes("premium") || text.includes("llave en mano") || text.includes("ceramico");
  }

  function isPremiumIncludedExtra(extra) {
    const text = normalizar(`${extra?.id || ""} ${extra?.nombre || ""} ${extra?.descripcion || ""}`);
    return PREMIUM_INCLUDED_EXTRA_PATTERNS.some(pattern => text.includes(normalizar(pattern)));
  }

  function getPremiumIncludedExtrasList() {
    return ["Pintura interior y exterior", "Cerámica / piso cerámico", "Instalación eléctrica", "Instalación sanitaria", "Artefactos de cocina", "Artefactos de baño"];
  }

  function removePremiumIncludedExtrasFromSelection() {
    if (!state.selectedExtras || !Array.isArray(extrasOpcionales)) return;
    extrasOpcionales.forEach(extra => {
      const id = extra.id || extra.nombre;
      if (isPremiumIncludedExtra(extra)) state.selectedExtras.delete(id);
    });
  }

  function getFundacionPlanIndex(fundacion = state.selectedFundacion) {
    return Array.isArray(fundaciones) ? fundaciones.findIndex(f => String(f.id) === String(fundacion?.id)) : -1;
  }

  function getInstallationPlanDisplayName(fundacion = state.selectedFundacion) {
    if (!fundacion) return "No incluido";
    const idx = getFundacionPlanIndex(fundacion);
    if (idx === 0) return "Pilotes + montaje";
    if (idx === 1) return "Radier + montaje Full";
    if (idx === 2) return "Fundación + terminaciones";
    return fundacion.nombre || "Plan de instalación";
  }

  function scrollTo(el) {
    if (!el) return;
    const navbar = document.querySelector(".navbar");
    const offset = (navbar?.offsetHeight || 82) + 18;
    const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function scrollToParcelasResults() {
    const target = document.getElementById("search-heading-card") || DOM.parcelasAnchor || DOM.parcelasContainer;
    let tries = 0;
    const run = () => {
      tries += 1;
      const firstCard = DOM.parcelasContainer?.querySelector(".parcela-card");
      if (target) scrollTo(target);
      if (firstCard) {
        firstCard.classList.add("tpl-result-focus");
        return;
      }
      if (tries < 8) setTimeout(run, 90);
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  function getPendingProjectChange() {
    return state.projectChangeMode || localStorage.getItem("tplReturnToCotizador") || "";
  }

  function setPendingProjectChange(type) {
    state.projectChangeMode = type || "";
    if (type) localStorage.setItem("tplReturnToCotizador", type);
    else localStorage.removeItem("tplReturnToCotizador");
  }

  function getProjectTotalEstimate() {
    let total = 0;
    if (state.selectedParcela) total += parseClp(state.selectedParcela.precio);
    if (state.selectedCasa) total += Number(state.selectedCasa.valorCasa || state.selectedCasa.precio || 0);
    if (state.selectedCasa && state.installationService && state.selectedFundacion) total += getFundacionValue(state.selectedFundacion, state.selectedCasa);
    state.selectedExtras?.forEach?.((qty, id) => {
      const extra = (Array.isArray(extrasOpcionales) ? extrasOpcionales : []).find(x => (x.id || x.nombre) === id);
      if (extra) total += Number(extra.valor || extra.precio || 0) * Number(qty || 1);
    });
    return total;
  }

  let projectBarTimer = null;
  let projectBarSlide = 0;

  function getProjectBarSlides() {
    const parcelaName = state.selectedParcela?.nombre || "Elige tu parcela ideal";
    const parcelaMeta = state.selectedParcela
      ? `${Number(state.selectedParcela.tamano || state.selectedParcela.tamano_m2 || 0).toLocaleString("es-CL")} m² · ${state.selectedParcela.comuna || "Chile"}`
      : "Compara alternativas según tu presupuesto.";

    const casaName = state.selectedCasa?.nombre || "Agrega una casa a tu proyecto";
    const casaMeta = state.selectedCasa
      ? `${Number(state.selectedCasa.metros || state.selectedCasa.m2 || state.selectedCasa.superficie || 0) || "—"} m² · ${state.selectedCasa.habitaciones || state.selectedCasa.dormitorios || "—"} habitaciones`
      : "Visualiza parcela + casa en un solo presupuesto.";

    const total = money(getProjectTotalEstimate());
    const nextStep = state.selectedParcela && state.selectedCasa
      ? "Revisa instalación, extras y solicita tu cotización."
      : state.selectedParcela
        ? "Ahora elige una casa para completar tu proyecto."
        : "Comienza seleccionando una parcela.";

    return [
      { icon: "🌿", kicker: "PARCELA ELEGIDA", title: parcelaName, text: parcelaMeta },
      { icon: "🏡", kicker: "CASA DEL PROYECTO", title: casaName, text: casaMeta },
      { icon: "✨", kicker: "INVERSIÓN ESTIMADA", title: total, text: "Tu proyecto se actualiza automáticamente." },
      { icon: "🧭", kicker: "SIGUIENTE PASO", title: nextStep, text: "TPL te acompaña durante todo el proceso." }
    ];
  }

  function renderProjectBarSlide(forceIndex) {
    const bar = document.getElementById("tpl-project-bar");
    if (!bar || bar.hidden) return;
    const slides = getProjectBarSlides();
    if (Number.isInteger(forceIndex)) projectBarSlide = forceIndex;
    projectBarSlide = ((projectBarSlide % slides.length) + slides.length) % slides.length;
    const slide = slides[projectBarSlide];
    const stage = bar.querySelector(".tpl-project-bar-stage");
    if (!stage) return;

    stage.classList.remove("is-changing");
    void stage.offsetWidth;
    stage.classList.add("is-changing");

    const icon = document.getElementById("tpl-bar-icon");
    const kicker = document.getElementById("tpl-bar-kicker");
    const title = document.getElementById("tpl-bar-title");
    const text = document.getElementById("tpl-bar-text");
    if (icon) icon.textContent = slide.icon;
    if (kicker) kicker.textContent = slide.kicker;
    if (title) title.textContent = slide.title;
    if (text) text.textContent = slide.text;

    bar.querySelectorAll(".tpl-project-dot").forEach((dot, index) => {
      dot.classList.toggle("active", index === projectBarSlide);
    });
  }

  function startProjectBarRotation() {
    if (projectBarTimer) clearInterval(projectBarTimer);
    projectBarTimer = setInterval(() => {
      projectBarSlide = (projectBarSlide + 1) % 4;
      renderProjectBarSlide();
    }, 3000);
  }

  function ensureProjectBar() {
    let bar = document.getElementById("tpl-project-bar");
    if (bar) return bar;
    document.body.insertAdjacentHTML("beforeend", `
      <div id="tpl-project-bar" class="tpl-project-bar" hidden aria-live="polite">
        <div class="tpl-project-bar-inner">
          <div class="tpl-project-bar-brand">
            <span>🏡</span>
            <strong>Tu proyecto</strong>
          </div>
          <div class="tpl-project-bar-stage">
            <span class="tpl-project-bar-icon" id="tpl-bar-icon">🌿</span>
            <div class="tpl-project-bar-message">
              <small id="tpl-bar-kicker">PARCELA ELEGIDA</small>
              <strong id="tpl-bar-title">Tu proyecto comienza aquí</strong>
              <span id="tpl-bar-text">Selecciona una alternativa para continuar.</span>
            </div>
          </div>
          <div class="tpl-project-bar-dots" aria-hidden="true">
            <span class="tpl-project-dot active"></span>
            <span class="tpl-project-dot"></span>
            <span class="tpl-project-dot"></span>
            <span class="tpl-project-dot"></span>
          </div>
          <div class="tpl-project-bar-actions">
            <button type="button" data-change-project="parcela">Cambiar parcela</button>
            <button type="button" data-change-project="casa">Cambiar casa</button>
          </div>
        </div>
      </div>`);
    startProjectBarRotation();
    return document.getElementById("tpl-project-bar");
  }

  function updateProjectBar() {
    const bar = ensureProjectBar();
    const hasProject = !!(state.selectedParcela || state.selectedCasa);
    bar.hidden = !hasProject;
    document.body.classList.toggle("has-project-bar", hasProject);
    if (hasProject) {
      renderProjectBarSlide(projectBarSlide);
      startProjectBarRotation();
    } else if (projectBarTimer) {
      clearInterval(projectBarTimer);
      projectBarTimer = null;
    }
  }

  function getAllParcelas() {
    return Array.isArray(window.SERVER_PARCELAS) ? window.SERVER_PARCELAS : (Array.isArray(parcelas) ? parcelas : []);
  }

  function getAllCasas() {
    return Array.isArray(casas) ? casas : [];
  }

  function getParcelaCardImage(p) {
    return (Array.isArray(p?.imagenes) && p.imagenes[0]) || p?.imagen || "image/boton_combo_parcela_casa.png";
  }

  function normalizar(text) {
    return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getActiveFilterTitle() {
    const f = state.activeFilters;
    if (state.recommendationActive && state.mode === "parcela") return `Parcelas cercanas a tu presupuesto de ${money(state.budget)}`;
    if (f.gps) return "Parcelas cercanas a mí";
    if (f.water) return "Parcelas con agua";
    if (f.river) return "Parcelas con luz";
    if (f.native) return "Parcelas con bosque nativo";
    if (f.payment) return "Parcelas con facilidad de pago";
    if (f.size) return "Parcelas sobre 1 hectárea";
    if (f.commune && f.commune !== "all") return `Parcelas en ${f.commune}`;
    if (f.economic) return "Parcelas ordenadas desde menor precio";
    if (f.text) return `Resultados de búsqueda para “${f.text}”`;
    return "Parcelas disponibles";
  }

  function updateSearchHeading(list) {
    if (!DOM.searchTitle || !DOM.searchSubtitle) return;
    const f = state.activeFilters;
    const countText = `${list.length} parcela${list.length === 1 ? "" : "s"} encontrada${list.length === 1 ? "" : "s"}`;
    if (DOM.resultsCount) DOM.resultsCount.textContent = countText;

    DOM.searchTitle.textContent = getActiveFilterTitle();

    const active = [];
    if (f.gps) active.push("distancia");
    if (f.economic) active.push("precio");
    if (f.size) active.push("superficie");
    if (f.payment) active.push("facilidad de pago");
    if (f.water) active.push("agua");
    if (f.river) active.push("luz");
    if (f.native) active.push("bosque nativo");
    if (f.commune && f.commune !== "all") active.push(f.commune);
    if (f.text) active.push("búsqueda");

    DOM.searchSubtitle.textContent = active.length
      ? ""
      : "Explora todas las alternativas disponibles o usa el panel de filtros para encontrar tu parcela ideal.";
  }

  function getRecommendedParcelas() {
    const budget = Number(state.budget || 0);
    const all = getAllParcelas().filter(p => parseClp(p.precio) > 0);

    // Siempre muestra las 5 alternativas más cercanas al presupuesto.
    // Así, aunque no exista una parcela exacta dentro de un rango, el cliente nunca queda sin opciones.
    return all
      .map(p => ({ ...p, __diff: Math.abs(parseClp(p.precio) - budget) }))
      .sort((a, b) => a.__diff - b.__diff)
      .slice(0, 5);
  }

  function getFilteredParcelas() {
    let list = state.recommendationActive && state.mode === "parcela"
      ? getRecommendedParcelas()
      : [...getAllParcelas()];

    const text = normalizar(state.activeFilters.text);
    if (text) {
      list = list.filter(p => normalizar(`${p.id} ${p.nombre} ${p.comuna} ${p.descripcion}`).includes(text));
    }
    if (state.activeFilters.size) list = list.filter(p => Number(p.tamano) >= 10000);
    if (state.activeFilters.payment) list = list.filter(p => String(p.facilidad || "").toLowerCase() === "si" || p.facilidad === true);
    if (state.activeFilters.water) list = list.filter(p => String(p.agua).toLowerCase() === "si" || p.agua === true);
    if (state.activeFilters.river) {
      list = list.filter(p => {
        const luz = p.luz;
        if (luz === true) return true;
        const luzText = normalizar(String(luz || ""));
        return luzText === "si" || luzText === "sí" || luzText === "true" || luzText.includes("factibilidad") || luzText.includes("poste") || luzText.includes("empalme") || luzText.includes("luz en proceso");
      });
    }
    if (state.activeFilters.native) list = list.filter(p => String(p.naturaleza).toLowerCase() === "si" || p.naturaleza === true);
    if (state.activeFilters.region && state.activeFilters.region !== "all") {
      const regionMap = {
        "biobio": ["florida", "nacimiento", "negrete", "yumbel"],
        "nuble": ["nipas", "pemuco", "quillon"],
        "araucania": ["caburgua"]
      };
      const validCommunes = regionMap[state.activeFilters.region] || [];
      list = list.filter(p => validCommunes.includes(normalizar(p.comuna)));
    }
    if (state.activeFilters.commune && state.activeFilters.commune !== "all") {
      list = list.filter(p => normalizar(p.comuna) === state.activeFilters.commune);
    }
    if (state.activeFilters.gps && state.userCoords) {
      list = list
        .filter(p => p.lat && p.lng)
        .sort((a, b) => distanceKm(state.userCoords.lat, state.userCoords.lng, a.lat, a.lng) - distanceKm(state.userCoords.lat, state.userCoords.lng, b.lat, b.lng));
    }
    if (state.activeFilters.economic) list.sort((a, b) => parseClp(a.precio) - parseClp(b.precio));
    return list;
  }

  function findComboMatches() {
    const budget = state.budget || 0;
    let casasBase = getAllCasas();

    if (state.wantedRooms !== "all" && state.wantedRooms) {
      casasBase = casasBase.filter(c => Number(c.habitaciones) === Number(state.wantedRooms));
    }
    if (state.wantedMeters) {
      casasBase = casasBase.sort((a, b) => Math.abs(Number(a.metros) - state.wantedMeters) - Math.abs(Number(b.metros) - state.wantedMeters));
    }

    const combos = [];
    const cheapestFundacion = getCheapestFundacion();
    getAllParcelas().forEach(p => {
      casasBase.slice(0, 12).forEach(c => {
        const fundacionValor = getFundacionValue(cheapestFundacion, c);
        const total = parseClp(p.precio) + Number(c.valorCasa || 0) + fundacionValor;
        combos.push({ parcela: p, casa: c, fundacion: cheapestFundacion, fundacionValor, total, diff: Math.abs(total - budget) });
      });
    });

    // Siempre devuelve las 5 combinaciones más cercanas al presupuesto del cliente.
    return combos.sort((a, b) => a.diff - b.diff).slice(0, 5);
  }


  function getCasaCardImage(casa) {
    const imgs = Array.isArray(casa?.imagenes) ? casa.imagenes : [];
    return casa?.foto || imgs.find(img => !normalizar(img).includes("plano")) || imgs[0] || "";
  }

  function renderComboProposals(matches) {
    if (!DOM.comboProposalsSection || !DOM.comboProposalsContainer) return;
    DOM.comboProposalsSection.hidden = false;
    DOM.comboProposalsContainer.innerHTML = "";

    matches.forEach((match, index) => {
      const p = match.parcela;
      const c = match.casa;
      const card = document.createElement("article");
      card.className = "combo-proposal-card";
      card.innerHTML = `
        <div class="combo-proposal-media">
          <img src="${getParcelaCardImage(p)}" alt="${p.nombre || 'Parcela'}" loading="lazy">
          <img src="${getCasaCardImage(c)}" alt="${c.nombre || 'Casa'}" loading="lazy">
          <span class="combo-proposal-badge">Opción ${index + 1}</span>
        </div>
        <div class="combo-proposal-body">
          <h4>${p.nombre || "Parcela"} + ${c.nombre || "Casa"}</h4>
          <p class="combo-proposal-place">📍 ${p.comuna || "Chile"} · ${Number(p.tamano || p.superficie || 0).toLocaleString("es-CL")} m² terreno</p>
          <div class="combo-proposal-specs">
            <span>🏡 ${Number(c.metros || 0).toLocaleString("es-CL")} m² casa</span>
            <span>🛏 ${c.habitaciones || "—"} hab.</span>
            <span>🛠 Plan Base referencial</span>
          </div>
          <button type="button" class="combo-location-link" data-combo-location="${p.id}">
            📍 Ver ubicación de la parcela
          </button>
          <div class="combo-proposal-total">
            <small>Total estimado</small>
            <strong>${money(match.total)}</strong>
          </div>
          <button type="button" class="combo-proposal-select">Elegir esta propuesta</button>
        </div>
      `;
      card.querySelector(".combo-location-link")?.addEventListener("click", () => {
        openLocationModal(match.parcela);
      });

      card.querySelector(".combo-proposal-select")?.addEventListener("click", () => {
        state.installationService = true;
        state.selectedFundacion = match.fundacion || getCheapestFundacion();
        state.selectedParcela = match.parcela;
        state.selectedCasa = match.casa;
        localStorage.setItem("selectedParcelaId", match.parcela.id);
        localStorage.setItem("selectedParcelaData", JSON.stringify(match.parcela));
        localStorage.setItem("selectedCasaId", match.casa.id);
        localStorage.setItem("selectedCasaData", JSON.stringify(match.casa));
        localStorage.setItem("tplComboAutoInstallation", "si");
        DOM.casasSection?.classList.add("active");
        DOM.cotizadorSection?.classList.add("active");
        DOM.comboProposalsSection.hidden = true;
        renderCasas();
        renderFundaciones();
        renderExtras();
        updateCotizacionSummary();
        ensurePreviewActionButtons();
        showFriendlyMessage("Ya cargamos tu proyecto con parcela, casa y Plan Base. Puedes cambiar el plan o agregar extras antes de enviar la cotización.", "Proyecto cargado");
        setTimeout(() => scrollTo(DOM.cotizadorSection), 80);
      });
      DOM.comboProposalsContainer.appendChild(card);
    });
    setTimeout(() => {
      const target = DOM.comboProposalsSection;
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.pageYOffset - 96;
      window.scrollTo({ top, behavior: "smooth" });
    }, 180);
  }

  function hideComboProposals() {
    if (DOM.comboProposalsSection) DOM.comboProposalsSection.hidden = true;
    if (DOM.comboProposalsContainer) DOM.comboProposalsContainer.innerHTML = "";
  }


  function hasRiverOrStream(p) {
    return Boolean(normalizar(`${p?.id || ""} ${p?.nombre || ""} ${p?.descripcion || ""} ${p?.detalle || ""} ${p?.caracteristicas || ""}`).match(/rio|río|arroyo|estero|canal|vertiente|cuerpo de agua|curso de agua/));
  }

  function getParcelaFeatureChipItems(p) {
    const yes = value => value === true || String(value || "").trim().toLowerCase() === "si";
    const numericPrice = Number(String(p?.precio || "").replace(/[^0-9]/g, "")) || 0;
    const chips = [];

    if (numericPrice > 0 && numericPrice < 10000000) {
      chips.push('<span class="parcel-feature-chip parcel-feature-chip-featured">⭐ Destacada</span>');
    }
    if (yes(p.facilidad)) {
      chips.push('<span class="parcel-feature-chip parcel-feature-chip-payment">💰 Facilidad de pago</span>');
    }
    if (yes(p.luz)) {
      chips.push('<span class="parcel-feature-chip parcel-feature-chip-light">⚡ Factibilidad de luz</span>');
    }
    if (yes(p.servicios)) {
      chips.push('<span class="parcel-feature-chip parcel-feature-chip-services">📍 Cercana a servicios</span>');
    }
    if (yes(p.naturaleza)) {
      chips.push('<span class="parcel-feature-chip parcel-feature-chip-native">🌿 Nativas</span>');
    }

    return chips.slice(0, 2);
  }

  function renderParcelaFeatureChips(p, placement = "desktop") {
    const chips = getParcelaFeatureChipItems(p);
    if (!chips.length) return "";
    return `<div class="parcel-feature-chips parcel-feature-chips-${placement}">${chips.join("")}</div>`;
  }

  function getDistanceBadge(p) {
    if (!state.activeFilters.gps || !state.userCoords || !p.lat || !p.lng) return "";
    const km = distanceKm(state.userCoords.lat, state.userCoords.lng, Number(p.lat), Number(p.lng));
    const mins = Math.max(1, Math.round((km / 55) * 60));
    return `<div class="distance-badge">📍 ${km.toFixed(1)} km · ${mins} min aprox.</div>`;
  }

  function renderParcelas(customList) {
    if (!DOM.parcelasContainer) return;
    const list = customList || getFilteredParcelas();
    const renderKey = list.map(p => p.id).join("|");
    if (state.lastParcelasRenderKey !== renderKey) {
      state.lastParcelasRenderKey = renderKey;
      state.parcelasRenderLimit = 15;
    }
    const visibleList = list.slice(0, state.parcelasRenderLimit || 15);
    DOM.parcelasContainer.innerHTML = "";
    DOM.parcelasContainer.className = "parcelas-grid";
    DOM.parcelasContainer.style.display = "grid";
    if (DOM.resultsCount) DOM.resultsCount.textContent = `${list.length} parcelas encontradas`;
    updateSearchHeading(list);

    if (!list.length) {
      DOM.parcelasContainer.innerHTML = `<div class="no-results"><h3>No encontramos alternativas</h3><p>Prueba con otro presupuesto o limpia los filtros.</p></div>`;
      return;
    }

    visibleList.forEach(p => {
      const img = getParcelaCardImage(p);
      const card = document.createElement("article");
      card.className = `parcela-card ${state.selectedParcela?.id === p.id ? "selected" : ""}`;
      card.dataset.id = p.id;
      const pendingChange = getPendingProjectChange();
      const detailHref = `parcela.html?id=${encodeURIComponent(p.id)}${pendingChange === "parcela" ? "&from=cotizador" : ""}`;
      const primaryLabel = pendingChange === "parcela" ? "Agregar parcela" : "Añadir casa";
      const primaryClass = pendingChange === "parcela" ? "btn-add-house btn-add-parcela-project" : "btn-add-house";
      card.innerHTML = `
        <div class="card-image-wrapper" style="position:relative;">
        <a class="card-image card-image-link" href="${detailHref}" aria-label="Ver detalles de ${p.nombre}">
          ${window.TasadorInteligente && window.TasadorInteligente.isOpportunity(getAllParcelas(), p) ? `<div class="badge-opportunity" style="position:absolute; top:12px; left:12px; background:linear-gradient(135deg, #f59e0b, #d97706); color:white; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:800; z-index:10; box-shadow:0 4px 12px rgba(245,158,11,0.4);"><i data-lucide="flame" style="width:12px;height:12px;margin-right:4px;vertical-align:-2px;"></i> Oportunidad de Inversión</div>` : ''}
          <span class="card-comuna">📍 ${p.comuna || "Chile"}</span>
          <div class="card-top-icons" style="position:absolute; top:12px; right:12px; display:flex; gap:8px; z-index:10;">
            <button class="btn-card-icon btn-favorite" type="button" aria-label="Guardar a favoritos" style="background:rgba(240,244,248,0.9); border:none; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#4a5568; transition:all 0.2s;" onclick="event.preventDefault(); window.tplToggleFavorite('${p.id}', this);"><i data-lucide="heart" style="width:18px; height:18px;"></i></button>
            <button class="btn-card-icon btn-share" type="button" aria-label="Compartir" data-share-url="parcela.html?id=${encodeURIComponent(p.id)}" data-share-title="${p.nombre}" style="background:rgba(240,244,248,0.9); border:none; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#4a5568; transition:all 0.2s;" onclick="event.preventDefault(); navigator.share ? navigator.share({title: this.dataset.shareTitle, url: window.location.origin + '/' + this.dataset.shareUrl}) : window.open('https://api.whatsapp.com/send?text=Te quiero enseñar esta parcela, dime que te parece: ' + encodeURIComponent(window.location.origin + '/' + this.dataset.shareUrl))"><i data-lucide="share-2" style="width:18px; height:18px;"></i></button>
          </div>
          <img src="${img}" alt="${p.nombre}" loading="${state.recommendationActive ? "eager" : "lazy"}" fetchpriority="${state.recommendationActive ? "high" : "auto"}" decoding="async" width="800" height="600">
          ${renderParcelaFeatureChips(p, "mobile")}
        </a>
        </div>
        <div class="card-body">
          <h3 class="card-title">${p.nombre}</h3>
          <div class="card-meta">🌳 ${Number(p.tamano || 0).toLocaleString("es-CL")} m²</div>
          <div class="card-price card-price-clean">${p.precio}</div>
          ${renderParcelaFeatureChips(p, "desktop")}
          ${getDistanceBadge(p)}
          <p class="card-description">${p.descripcion || "Parcela disponible para tu proyecto."}</p>
          <div style="text-align: center; margin: 16px 0 8px;">
            <button class="card-location-link" type="button" data-location-id="${p.id}" style="background: transparent; border: 1px solid rgba(0,0,0,0.1); color: var(--tpl-brand, #0c2b2e); font-weight: 600; border-radius: 8px; padding: 8px 16px; font-size: 0.9rem; cursor: pointer; transition: background 0.2s, border-color 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.03)'" onmouseout="this.style.background='transparent'"><i data-lucide="map" style="width: 14px; height: 14px; margin-right: 6px; vertical-align: -2px;"></i>Ver ubicación en mapa</button>
          </div>
          <div class="card-actions">
            <a class="btn-card btn-details" href="${detailHref}">Más detalles</a>
            
          </div>
        </div>`;
      DOM.parcelasContainer.appendChild(card);
    });

    if (list.length > visibleList.length) {
      const more = document.createElement("div");
      more.className = "parcelas-load-more-wrap";
      more.innerHTML = `<button class="parcelas-load-more" type="button">Ver más parcelas</button>`;
      DOM.parcelasContainer.appendChild(more);
      const loadMore = () => {
        state.parcelasRenderLimit = Math.min(list.length, (state.parcelasRenderLimit || 15) + 15);
        renderParcelas(list);
      };
      more.querySelector("button")?.addEventListener("click", loadMore);
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            io.disconnect();
            loadMore();
          }
        }, { rootMargin: "220px" });
        io.observe(more);
      }
    }

    DOM.parcelasContainer.querySelectorAll(".card-location-link").forEach(btn => {
      btn.addEventListener("click", () => {
        const p = getAllParcelas().find(x => String(x.id) === String(btn.dataset.locationId));
        openLocationModal(p);
      });
    });

    DOM.parcelasContainer.querySelectorAll(".btn-add-house").forEach(btn => {
      btn.addEventListener("click", () => {
        const p = getAllParcelas().find(x => String(x.id) === String(btn.dataset.id));
        if (!p) return;
        const pending = getPendingProjectChange();
        selectParcela(p);
        if (pending === "parcela") {
          showFriendlyMessage("Parcela actualizada en tu proyecto.", "Proyecto actualizado");
          return;
        }
        state.mode = "combo";
        DOM.casasSection?.classList.add("active");
        renderCasas();
        scrollTo(DOM.casasSection);
      });
    });


    if (window.lucide) lucide.createIcons();
  }

  function getPlanoCasa(casa) {
    if (casa.plano) return casa.plano;
    const imgs = Array.isArray(casa.imagenes) ? casa.imagenes : [];
    return imgs.find(img => normalizar(img).includes("plano")) || imgs[imgs.length - 1] || casa.foto || "#";
  }


  function getCasaImages(casa) {
    const imgs = Array.isArray(casa.imagenes) ? casa.imagenes.filter(Boolean) : [];
    const first = casa.foto || imgs[0] || "";
    return [first, ...imgs].filter((img, i, arr) => img && arr.indexOf(img) === i);
  }

  function renderCasaImage(casaId) {
    const casa = getAllCasas().find(c => c.id === casaId);
    if (!casa) return;
    const imgs = getCasaImages(casa);
    const idx = state.houseImageIndices.get(casaId) || 0;
    const card = DOM.casasContainer?.querySelector(`.casa-card[data-id="${casaId}"]`);
    const img = card?.querySelector(".casa-main-img");
    const counter = card?.querySelector(".casa-gallery-counter");
    if (img && imgs[idx]) img.src = imgs[idx];
    if (counter) counter.textContent = `${idx + 1}/${imgs.length}`;
  }


  function openHousePlanModal(planoSrc, casaNombre) {
    if (!planoSrc || planoSrc === "#") {
      showFriendlyMessage("Esta casa aún no tiene plano disponible. Puedes solicitarlo por WhatsApp.");
      return;
    }

    let modal = document.getElementById("house-plan-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "house-plan-modal";
      modal.className = "house-plan-modal";
      modal.innerHTML = `
        <div class="house-plan-modal-backdrop" data-close="true"></div>
        <div class="house-plan-modal-panel" role="dialog" aria-modal="true" aria-labelledby="house-plan-modal-title">
          <button class="house-plan-modal-close" type="button" aria-label="Cerrar plano">×</button>
          <div class="house-plan-modal-header">
            <span>Plano de casa</span>
            <h3 id="house-plan-modal-title"></h3>
          </div>
          <div class="house-plan-modal-image-wrap">
            <img class="house-plan-modal-image" src="" alt="Plano de casa">
          </div>
        </div>`;
      document.body.appendChild(modal);

      modal.querySelector(".house-plan-modal-close")?.addEventListener("click", closeHousePlanModal);
      modal.querySelector(".house-plan-modal-backdrop")?.addEventListener("click", closeHousePlanModal);
      document.addEventListener("keydown", e => {
        if (e.key === "Escape" && modal.classList.contains("active")) closeHousePlanModal();
      });
    }

    const img = modal.querySelector(".house-plan-modal-image");
    const title = modal.querySelector("#house-plan-modal-title");
    if (img) {
      img.src = planoSrc;
      img.alt = `Plano ${casaNombre || "casa"}`;
    }
    if (title) title.textContent = casaNombre || "Casa seleccionada";
    modal.classList.add("active");
    document.body.classList.add("plan-modal-open");
  }

  function closeHousePlanModal() {
    const modal = document.getElementById("house-plan-modal");
    modal?.classList.remove("active");
    document.body.classList.remove("plan-modal-open");
  }


  function getCasaImagen(casa) {
    if (!casa) return "image/placeholder-casa.jpg";
    return casa.foto || (Array.isArray(casa.imagenes) && casa.imagenes[0]) || casa.imagen || "image/placeholder-casa.jpg";
  }

  function getCasaPlano(casa) {
    if (!casa) return "";
    return casa.plano || casa.planos || casa.imagenPlano || casa.imagen_plano || "";
  }

  function getParcelaMainImage(parcela) {
    if (!parcela) return "image/placeholder-parcela.jpg";
    return (Array.isArray(parcela.imagenes) && parcela.imagenes[0]) || parcela.imagen || parcela.foto || "image/placeholder-parcela.jpg";
  }

  function getParcelaLink(parcela) {
    return parcela?.id ? `parcela.html?id=${encodeURIComponent(parcela.id)}` : "parcela.html";
  }

  function ensureSummaryInfoModal() {
    let modal = document.getElementById("summary-info-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "summary-info-modal";
    modal.className = "summary-info-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="summary-info-backdrop" data-summary-info-close></div>
      <div class="summary-info-card" role="dialog" aria-modal="true">
        <button type="button" class="summary-info-close" data-summary-info-close aria-label="Cerrar ficha">×</button>
        <div class="summary-info-media"><img id="summary-info-img" alt="Ficha informativa"></div>
        <div class="summary-info-body">
          <span id="summary-info-kicker" class="summary-info-kicker"></span>
          <h3 id="summary-info-title"></h3>
          <p id="summary-info-desc"></p>
          <div id="summary-info-specs" class="summary-info-specs"></div>
          <div id="summary-info-actions" class="summary-info-actions"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", e => {
      if (e.target.closest("[data-summary-info-close]")) closeSummaryInfoModal();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && modal.classList.contains("active")) closeSummaryInfoModal();
    });
    return modal;
  }

  window.TPLOpenSummaryInfoModal = (type) => openSummaryInfoModal(type);

  function closeSummaryInfoModal() {
    const modal = document.getElementById("summary-info-modal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("summary-info-open");
  }

  function openSummaryInfoModal(type) {
    const modal = ensureSummaryInfoModal();
    const img = modal.querySelector("#summary-info-img");
    const kicker = modal.querySelector("#summary-info-kicker");
    const title = modal.querySelector("#summary-info-title");
    const desc = modal.querySelector("#summary-info-desc");
    const specs = modal.querySelector("#summary-info-specs");
    const actions = modal.querySelector("#summary-info-actions");

    if (type === "parcela") {
      const p = state.selectedParcela;
      if (!p) return showFriendlyMessage("Primero selecciona una parcela.");
      const m2 = getParcelaM2(p);
      const tipo = m2 >= 10000 ? "Campo seleccionado" : "Parcela seleccionada";
      img.src = getParcelaMainImage(p);
      kicker.textContent = tipo;
      title.textContent = p.nombre || "Propiedad seleccionada";
      desc.innerHTML = p.descripcion || p.detalleTexto || p.descripcion_breve || "Ficha informativa de la propiedad seleccionada para este proyecto.";
      specs.innerHTML = `
        <span><b>Valor</b>${p.precio || "Consultar"}</span>
        <span><b>Superficie</b>${m2.toLocaleString("es-CL")} m²</span>
        <span><b>Comuna</b>${p.comuna || "Por definir"}</span>
        <span><b>Rol</b>${String(p.rol || "Consultar").toUpperCase()}</span>
        <span><b>Agua</b>${p.agua || "Consultar"}</span>
        <span><b>Luz</b>${p.luz || "Consultar"}</span>
        <span><b>Naturaleza</b>${p.naturaleza || "Consultar"}</span>
        <span><b>Servicios</b>${p.servicios || "Consultar"}</span>`;
      actions.innerHTML = `
        <a href="${getParcelaLink(p)}">Abrir ficha completa</a>
        <button type="button" data-summary-location="${p.id}">Ver en mapa</button>
        <button type="button" data-summary-info-close>Volver al resumen</button>`;
    } else {
      const c = state.selectedCasa;
      if (!c) return showFriendlyMessage("Primero selecciona una casa.");
      const m2 = Number(c.metros || c.m2 || c.superficie || 0);
      const habitaciones = Number(c.habitaciones || c.dormitorios || 0);
      img.src = getCasaImagen(c);
      kicker.textContent = "Casa seleccionada";
      title.textContent = c.nombre || "Casa seleccionada";
      desc.innerHTML = c.descripcion || c.detalle || c.descripcion_breve || "Ficha informativa del modelo seleccionado para este proyecto.";
      specs.innerHTML = `
        <span><b>Valor</b>${money(Number(c.valorCasa || c.precio || 0))}</span>
        <span><b>Superficie</b>${m2 || "-"} m²</span>
        <span><b>Habitaciones</b>${habitaciones || "-"}</span>
        <span><b>Baños</b>${c.banos || c.baños || "Consultar"}</span>
        <span><b>Materialidad</b>${c.material || c.materialidad || c.tipo || "Prefabricada"}</span>
        <span><b>Terminación</b>${c.terminacion || c.terminación || c.nivel || "Consultar"}</span>`;
      const plano = getCasaPlano(c);
      actions.innerHTML = `${plano ? `<button type="button" data-summary-house-plan>Ver plano</button>` : `<span class="summary-info-note">Plano referencial no disponible.</span>`}<button type="button" data-summary-select-house>Mantener esta casa</button>`;
      actions.querySelector("[data-summary-house-plan]")?.addEventListener("click", () => openHousePlanModal(plano, c.nombre));
      actions.querySelector("[data-summary-select-house]")?.addEventListener("click", () => closeSummaryInfoModal());
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("summary-info-open");
    if (window.lucide) lucide.createIcons();
  }

  function renderCasas(customList) {
    if (!DOM.casasContainer) return;
    let list = customList || getAllCasas();
    if (!customList && state.roomFilter !== "all") {
      list = list.filter(c => Number(c.habitaciones) === Number(state.roomFilter));
    }

    DOM.casasContainer.innerHTML = "";
    const sectionTitle = DOM.casasSection?.querySelector(".casas-results-counter") || document.createElement("div");
    if (DOM.casasSection && !sectionTitle.classList.contains("casas-results-counter")) {
      sectionTitle.className = "casas-results-counter";
      DOM.casasContainer.parentNode?.insertBefore(sectionTitle, DOM.casasContainer);
    }
    sectionTitle.textContent = `${list.length} casa${list.length === 1 ? "" : "s"} encontrada${list.length === 1 ? "" : "s"}`;

    list.forEach(c => {
      const imgs = getCasaImages(c);
      const idx = state.houseImageIndices.get(c.id) || 0;
      const currentImg = imgs[idx] || "";
      const plano = getPlanoCasa(c);
      const hasGallery = imgs.length > 1;
      const card = document.createElement("article");
      card.className = `casa-card ${state.selectedCasa?.id === c.id ? "selected" : ""}`;
      card.dataset.id = c.id;
      card.innerHTML = `
        <div class="casa-img-container casa-gallery">
          <img class="casa-main-img" src="${currentImg}" alt="${c.nombre}">
          <div class="casa-specs-badge">${c.metros} m²</div>
          ${hasGallery ? `<button class="casa-gallery-btn casa-prev" type="button" aria-label="Imagen anterior">‹</button><button class="casa-gallery-btn casa-next" type="button" aria-label="Imagen siguiente">›</button><span class="casa-gallery-counter">${idx + 1}/${imgs.length}</span>` : ""}
        </div>
        <div class="casa-body">
          <div class="casa-head-row">
            <h3 class="casa-title">${c.nombre}</h3>
            <div class="casa-price">${money(c.valorCasa)}</div>
          </div>
          <p class="casa-desc">${c.descripcion_breve || "Casa prefabricada lista para cotizar."}</p>
          <div class="casa-specs-strip"><span>🛏 ${c.habitaciones} hab</span><span>🚿 ${c.banos || 1} baño</span><span>📐 ${c.metros} m²</span></div>
          <button class="house-plan-button" type="button" data-plano="${plano}" data-title="${c.nombre}" title="Ver plano ampliado">
            <span class="house-plan-icon">📐</span>
            <span>Plano</span>
          </button>
          <button class="btn-select-house" type="button">${getPendingProjectChange() === "casa" ? "Agregar esta casa" : "Seleccionar casa"}</button>
        </div>`;

      card.querySelector(".btn-select-house").addEventListener("click", () => {
        selectCasa(c);
        scrollTo(DOM.cotizadorSection);
      });
      card.querySelector(".house-plan-button")?.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        openHousePlanModal(plano, c.nombre);
      });
      card.querySelector(".casa-prev")?.addEventListener("click", ev => {
        ev.stopPropagation();
        const next = ((state.houseImageIndices.get(c.id) || 0) - 1 + imgs.length) % imgs.length;
        state.houseImageIndices.set(c.id, next);
        renderCasaImage(c.id);
      });
      card.querySelector(".casa-next")?.addEventListener("click", ev => {
        ev.stopPropagation();
        const next = ((state.houseImageIndices.get(c.id) || 0) + 1) % imgs.length;
        state.houseImageIndices.set(c.id, next);
        renderCasaImage(c.id);
      });
      DOM.casasContainer.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
  }

  function selectParcela(p) {
    state.selectedParcela = p;
    localStorage.setItem("selectedParcelaId", p.id);
    localStorage.setItem("selectedParcelaData", JSON.stringify(p));
    renderParcelas();
    updateCotizacionSummary();
    updateProjectBar();
    finishProjectChangeIfNeeded("parcela");
  }

  function selectCasa(c) {
    state.selectedCasa = c;
    if (state.installationService && !state.selectedFundacion) state.selectedFundacion = getCheapestFundacion();
    localStorage.setItem("selectedCasaId", c.id);
    localStorage.setItem("selectedCasaData", JSON.stringify(c));
    DOM.cotizadorSection?.classList.add("active");
    renderCasas();
    renderFundaciones();
    renderExtras();
    updateCotizacionSummary();
    updateProjectBar();
    finishProjectChangeIfNeeded("casa");
  }

  function getFundacionPlanMeta(index, f) {
    const metas = [
      { badge: "Económico", title: "Pilotes + montaje", tag: "Menor inversión inicial", desc: "Base simple para terrenos aptos.", bullets: ["Pilotes de madera", "Montaje de la casa"] },
      { badge: "Recomendado", title: "Radier + montaje Full", tag: "⭐ Equilibrio y firmeza", desc: "Base sólida y montaje completo.", bullets: ["Radier afinado", "Montaje Full"] },
      { badge: "Llave en mano", title: "Fundación + terminaciones", tag: "Proyecto más completo", desc: "Para avanzar con menos coordinaciones.", bullets: ["Fundación especial", "Terminaciones principales incluidas"] }
    ];
    return metas[index] || { badge: `Plan ${index + 1}`, title: f.nombre || "Plan de instalación", tag: "Servicio opcional", desc: "Plan de instalación para tu proyecto.", bullets: ["Equipo especializado", "Coordinación según zona"] };
  }

  function syncInstallationUI() {
    const enabled = !!state.installationService;
    if (DOM.installationServiceToggle) DOM.installationServiceToggle.checked = enabled;
    if (DOM.fundacionesContainer) DOM.fundacionesContainer.hidden = !enabled;
    if (DOM.installationPlansTitle) DOM.installationPlansTitle.hidden = !enabled;
    if (DOM.installationStatus) {
      DOM.installationStatus.classList.toggle("enabled", enabled);
      DOM.installationStatus.innerHTML = enabled
        ? `✅ Servicio activado: <strong>${getInstallationPlanDisplayName()}</strong>`
        : "Servicio no incluido. Puedes continuar con tu propio equipo o activar un plan de instalación.";
    }
  }

  function renderFundaciones() {
    if (!DOM.fundacionesContainer || !Array.isArray(fundaciones)) return;
    syncInstallationUI();
    DOM.fundacionesContainer.innerHTML = "";
    fundaciones.forEach((f, index) => {
      const meta = getFundacionPlanMeta(index, f);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `fundacion-option installation-plan-card ${state.installationService && state.selectedFundacion?.id === f.id ? "selected active" : ""}`;
      const valor = getFundacionValue(f, state.selectedCasa);
      btn.innerHTML = `
        <span class="installation-plan-badge">${meta.badge}</span>
        <strong class="installation-plan-title">${meta.title}</strong>
        <small class="installation-plan-tag">${meta.tag}</small>
        <p>${meta.desc}</p>
        <ul>${meta.bullets.map(b => `<li>✓ ${b}</li>`).join("")}</ul>
        <span class="installation-plan-price">${money(valor)}</span>`;
      btn.addEventListener("click", () => {
        state.installationService = true;
        state.selectedFundacion = f;
        if (isPremiumInstallationPlan(f)) removePremiumIncludedExtrasFromSelection();
        renderFundaciones();
        renderExtras();
        updateCotizacionSummary();
      });
      DOM.fundacionesContainer.appendChild(btn);
    });
  }

  function renderExtras() {
    if (DOM.automaticosBox) DOM.automaticosBox.style.display = Array.isArray(extrasAutomaticos) && extrasAutomaticos.length ? "block" : "none";
    if (DOM.automaticosContainer) DOM.automaticosContainer.innerHTML = (Array.isArray(extrasAutomaticos) ? extrasAutomaticos : []).map(e => `<div class="extra-row"><span>${e.nombre}</span><strong>${money(e.valor || e.precio || 0)}</strong></div>`).join("");
    if (!DOM.opcionalesContainer || !Array.isArray(extrasOpcionales)) return;
    DOM.opcionalesContainer.innerHTML = "";
    const premiumActive = isPremiumInstallationPlan();
    if (premiumActive) {
      removePremiumIncludedExtrasFromSelection();
      const included = document.createElement("div");
      included.className = "premium-included-card";
      included.innerHTML = `
        <span class="premium-included-kicker">🎁 Incluido en tu Plan Premium</span>
        <strong>Estos trabajos ya forman parte del plan y no se cobran como extras.</strong>
        <ul>${getPremiumIncludedExtrasList().map(item => `<li>✓ ${item}</li>`).join("")}</ul>`;
      DOM.opcionalesContainer.appendChild(included);
    }
    extrasOpcionales.forEach(e => {
      if (premiumActive && isPremiumIncludedExtra(e)) return;
      const id = e.id || e.nombre;
      const defaultQty = Math.max(1, getDefaultExtraQty(e));
      const isSelected = state.selectedExtras.has(id);
      const currentQty = isSelected ? state.selectedExtras.get(id) : defaultQty;
      const unitLabel = e.tipoCalculo === "mt2" ? "m²" : (e.tipoCalculo === "metro" ? "ml" : (e.tipoCalculo || "unidad"));
      const row = document.createElement("div");
      row.className = `extra-row extra-row-modern ${isSelected ? "checked" : ""}`;
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-pressed", isSelected ? "true" : "false");
      row.innerHTML = `
        <label class="extra-left">
          <input class="extra-checkbox" type="checkbox" ${isSelected ? "checked" : ""} aria-label="Activar ${e.nombre}">
          <span class="extra-info-text">
            <b class="extra-name">${e.nombre}</b>
            <small class="extra-desc">${money(e.valor || e.precio || 0)} por ${unitLabel}</small>
          </span>
        </label>
        <div class="extra-controls">
          <input class="qty-input-box" type="number" min="1" value="${currentQty}" aria-label="Cantidad ${e.nombre}">
          <strong class="extra-total-val">${money((e.valor || e.precio || 0) * (isSelected ? currentQty : 0))}</strong>
        </div>`;

      const checkbox = row.querySelector(".extra-checkbox");
      const qtyInput = row.querySelector(".qty-input-box");
      const totalEl = row.querySelector(".extra-total-val");

      const sync = (selected, qty = Number(qtyInput.value) || defaultQty) => {
        qty = Math.max(1, qty);
        qtyInput.value = qty;
        if (selected) state.selectedExtras.set(id, qty); else state.selectedExtras.delete(id);
        row.classList.toggle("checked", selected);
        row.setAttribute("aria-pressed", selected ? "true" : "false");
        checkbox.checked = selected;
        if (totalEl) totalEl.textContent = money((e.valor || e.precio || 0) * (selected ? qty : 0));
        updateCotizacionSummary();
      };

      row.addEventListener("click", ev => {
        if (ev.target.closest("input.qty-input-box")) return;
        sync(!state.selectedExtras.has(id));
      });
      row.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          sync(!state.selectedExtras.has(id));
        }
      });
      checkbox.addEventListener("change", ev => {
        ev.stopPropagation();
        sync(checkbox.checked);
      });
      qtyInput.addEventListener("input", ev => {
        ev.stopPropagation();
        sync(true, Number(qtyInput.value) || defaultQty);
      });
      DOM.opcionalesContainer.appendChild(row);
    });
  }

  function updateCotizacionSummary() {
    if (!DOM.summaryItems || !DOM.totalAmount) return;
    let total = 0;
    const rows = [];
    const landTypeEl = document.getElementById("preview-land-type");
    const landNameEl = document.getElementById("preview-land-name");
    const landSizeEl = document.getElementById("preview-land-size");
    const houseNameEl = document.getElementById("preview-house-name");
    const houseSpecsEl = document.getElementById("preview-house-specs");

    let tipoTerreno = "Parcela";
    let parcelaM2 = 0;

    if (state.selectedParcela) {
      parcelaM2 = getParcelaM2(state.selectedParcela);
      tipoTerreno = parcelaM2 > 10000 ? "Campo" : "Parcela";

      const val = parseClp(state.selectedParcela.precio);
      total += val;
      rows.push([`${tipoTerreno}: ${state.selectedParcela.nombre} · ${parcelaM2.toLocaleString("es-CL")} m²
        <button type="button" class="summary-location-link" data-summary-location="${state.selectedParcela.id}">📍 Ver ubicación</button>`, val]);

      if (DOM.previewParcelaImg) DOM.previewParcelaImg.src = (state.selectedParcela.imagenes && state.selectedParcela.imagenes[0]) || state.selectedParcela.imagen || "";
      if (DOM.previewLocation) DOM.previewLocation.textContent = state.selectedParcela.comuna || state.selectedParcela.nombre;
      if (landTypeEl) landTypeEl.textContent = tipoTerreno.toUpperCase();
      if (landNameEl) landNameEl.textContent = state.selectedParcela.nombre || "Propiedad seleccionada";
      if (landSizeEl) landSizeEl.textContent = `${parcelaM2.toLocaleString("es-CL")} m² de superficie`;
    } else {
      if (landTypeEl) landTypeEl.textContent = "PARCELA";
      if (landNameEl) landNameEl.textContent = "Por seleccionar";
      if (landSizeEl) landSizeEl.textContent = "Superficie por definir";
    }

    if (state.selectedCasa) {
      const val = Number(state.selectedCasa.valorCasa || 0);
      const casaM2 = Number(state.selectedCasa.metros || state.selectedCasa.m2 || 0);
      const habitaciones = Number(state.selectedCasa.habitaciones || state.selectedCasa.dormitorios || 0);
      const textoHabitaciones = habitaciones === 1 ? "1 habitación" : `${habitaciones} habitaciones`;

      total += val;
      rows.push([`Casa: ${state.selectedCasa.nombre} · ${textoHabitaciones} · ${casaM2} m²`, val]);

      if (DOM.previewCasaImg) DOM.previewCasaImg.src = state.selectedCasa.foto || (state.selectedCasa.imagenes && state.selectedCasa.imagenes[0]) || "";
      if (DOM.previewTitle) DOM.previewTitle.textContent = `${state.selectedParcela ? tipoTerreno : "Proyecto"} + Casa ${casaM2} m²`;
      if (houseNameEl) houseNameEl.textContent = state.selectedCasa.nombre || `Casa ${casaM2} m²`;
      if (houseSpecsEl) houseSpecsEl.textContent = `${textoHabitaciones} · ${casaM2} m² construidos`;
    } else {
      if (DOM.previewTitle) DOM.previewTitle.textContent = state.selectedParcela ? `${tipoTerreno}: ${state.selectedParcela.nombre}` : "Parcela + Casa";
      if (houseNameEl) houseNameEl.textContent = "Por seleccionar";
      if (houseSpecsEl) houseSpecsEl.textContent = "Habitaciones y superficie por definir";
    }
    if (state.selectedCasa) {
      if (state.installationService && state.selectedFundacion) {
        const val = getFundacionValue(state.selectedFundacion, state.selectedCasa);
        total += val;
        const premiumNote = isPremiumInstallationPlan() ? `<small class="summary-premium-note">Incluye: pintura, cerámica, instalación eléctrica, sanitaria, artefactos de cocina y baño.</small>` : "";
        rows.push([`Servicio de instalación: ${getInstallationPlanDisplayName()}${premiumNote}`, val]);
      } else {
        rows.push([`Servicio de instalación: No incluido <small style="display:block;color:#64748b;margin-top:4px;">El cliente realizará esta etapa con su propio equipo.</small>`, 0]);
      }
    }
    (Array.isArray(extrasAutomaticos) ? extrasAutomaticos : []).forEach(e => {
      const val = Number(e.valor || e.precio || 0);
      total += val;
      rows.push([e.nombre, val]);
    });
    state.selectedExtras.forEach((qty, id) => {
      const e = extrasOpcionales.find(x => (x.id || x.nombre) === id);
      if (!e) return;
      const val = Number(e.valor || e.precio || 0) * qty;
      const unitLabel = e.tipoCalculo === "mt2" ? "m²" : (e.tipoCalculo === "metro" ? "ml" : (e.tipoCalculo || "unidad"));
      total += val;
      rows.push([`${e.nombre} x ${qty} ${unitLabel}`, val]);
    });
    DOM.summaryItems.innerHTML = rows.map(([name, val]) => `<tr><td>${name}</td><td style="text-align:right;">${money(val)}</td></tr>`).join("") || `<tr><td>Selecciona parcela y casa</td><td style="text-align:right;">$0</td></tr>`;
    DOM.totalAmount.textContent = money(total);
    if (DOM.changeParcelaBtn) DOM.changeParcelaBtn.style.display = state.selectedParcela ? "inline-flex" : "none";
    if (DOM.changeCasaBtn) DOM.changeCasaBtn.style.display = state.selectedCasa ? "inline-flex" : "none";
    updateProjectBar();
  }


  function getCotizacionRowsText() {
    return [...document.querySelectorAll("#summary-items tr")].map(tr =>
      [...tr.children].map(td => td.innerText.replace(/\s+/g, " ").trim()).join(": ")
    ).filter(Boolean).join("\n");
  }

  function getExtrasText() {
    if (!state.selectedExtras || !state.selectedExtras.size) return "Sin adicionales seleccionados";
    return [...state.selectedExtras.entries()].map(([id, qty]) => {
      const e = (Array.isArray(extrasOpcionales) ? extrasOpcionales : []).find(x => (x.id || x.nombre) === id);
      if (!e) return `• ${id}: ${qty}`;
      const unitLabel = e.tipoCalculo === "mt2" ? "m²" : (e.tipoCalculo === "metro" ? "ml" : (e.tipoCalculo || "unidad"));
      return `• ${e.nombre}: ${qty} ${unitLabel}`;
    }).join("\n");
  }

  function getCotizacionData() {
    const parcela = state.selectedParcela || null;
    const casa = state.selectedCasa || null;
    const fundacion = state.selectedFundacion || null;
    return {
      parcela,
      casa,
      fundacion,
      total: DOM.totalAmount?.textContent || "$0",
      rowsText: getCotizacionRowsText(),
      extrasText: getExtrasText(),
      fecha: new Date().toLocaleString("es-CL")
    };
  }

  function buildCotizacionPlainText(cliente = {}) {
    const data = getCotizacionData();
    return [
      "TU PARCELA LISTA - COTIZACIÓN DE PROYECTO",
      `Fecha: ${data.fecha}`,
      "",
      cliente.nombre ? `Cliente: ${cliente.nombre}` : "Cliente: Por completar",
      cliente.email ? `Email: ${cliente.email}` : "Email: Por completar",
      cliente.telefono ? `Teléfono: ${cliente.telefono}` : "Teléfono: Por completar",
      cliente.ciudad ? `Ciudad: ${cliente.ciudad}` : "",
      cliente.mensaje ? `Comentario: ${cliente.mensaje}` : "",
      "",
      "PROYECTO COTIZADO",
      `Parcela/Campo: ${data.parcela?.nombre || "por definir"}`,
      `Comuna: ${data.parcela?.comuna || "por definir"}`,
      `Tamaño terreno: ${data.parcela ? (data.parcela.tamano || data.parcela.superficie || data.parcela.m2 || "por definir") : "por definir"} m²`,
      `Casa: ${data.casa?.nombre || "por definir"}`,
      `Superficie casa: ${data.casa ? (data.casa.metros || data.casa.superficie || data.casa.mt2 || "por definir") : "por definir"} m²`,
      `Habitaciones: ${data.casa ? (data.casa.habitaciones || data.casa.dormitorios || "por definir") : "por definir"}`,
      `Fundación e instalación: ${data.fundacion?.nombre || "por definir"}`,
      "",
      "RESUMEN DE VALORES",
      data.rowsText || "Resumen pendiente",
      "",
      "ADICIONALES",
      data.extrasText,
      "",
      `TOTAL ESTIMADO: ${data.total}`,
      "",
      "Valores referenciales sujetos a disponibilidad, visita técnica, condiciones del terreno y confirmación comercial."
    ].filter(Boolean).join("\n");
  }

  function createCotizacionPdfBlob(cliente = {}) {
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) return null;

    const data = getCotizacionData();
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 42;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 48;

    const addPageIfNeeded = (needed = 30) => {
      if (y + needed > pageHeight - 44) { doc.addPage(); y = 48; }
    };
    const addText = (text, size = 10, bold = false, color = [15, 23, 42], maxWidth = pageWidth - margin * 2) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text || ""), maxWidth);
      lines.forEach(line => {
        addPageIfNeeded(size + 8);
        doc.text(line, margin, y);
        y += size + 5;
      });
    };
    const addSectionTitle = (label) => {
      addPageIfNeeded(34);
      doc.setFillColor(238, 247, 250);
      doc.roundedRect(margin, y - 16, pageWidth - margin * 2, 30, 8, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 63, 122);
      doc.text(label, margin + 12, y + 4);
      y += 28;
    };
    const addImageFromElement = (selector, x, yPos, w, h) => {
      try {
        const el = document.querySelector(selector);
        if (el && el.complete && el.naturalWidth) {
          doc.addImage(el, "JPEG", x, yPos, w, h, undefined, "FAST");
          return true;
        }
      } catch (_) {}
      return false;
    };

    doc.setFillColor(0, 63, 122);
    doc.rect(0, 0, pageWidth, 104, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Tu Parcela Lista", margin, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.text("Cotización de proyecto parcela + casa", margin, 66);
    doc.setFontSize(9);
    doc.text(`Generado: ${data.fecha}`, margin, 84);
    y = 126;

    addSectionTitle("Datos del cliente");
    addText(`Nombre: ${cliente.nombre || "Por completar"}`);
    addText(`Email: ${cliente.email || "Por completar"}`);
    addText(`Teléfono: ${cliente.telefono || "Por completar"}`);
    if (cliente.ciudad) addText(`Ciudad: ${cliente.ciudad}`);
    if (cliente.mensaje) addText(`Comentario: ${cliente.mensaje}`);
    y += 8;

    addSectionTitle("Fotos referenciales del proyecto");
    const imgW = (pageWidth - margin * 2 - 16) / 2;
    const imgH = 130;
    const yImg = y;
    doc.setFillColor(245, 248, 252);
    doc.roundedRect(margin, yImg, imgW, imgH, 12, 12, "F");
    doc.roundedRect(margin + imgW + 16, yImg, imgW, imgH, 12, 12, "F");
    addImageFromElement("#preview-parcela-img", margin, yImg, imgW, imgH);
    addImageFromElement("#preview-casa-img", margin + imgW + 16, yImg, imgW, imgH);
    y = yImg + imgH + 18;

    addSectionTitle("Ficha rápida");
    const parcelaLink = data.parcela ? `${location.origin}${location.pathname.replace(/index\.html?$/, "")}parcela.html?id=${encodeURIComponent(data.parcela.id)}` : "";
    addText(`Parcela/Campo: ${data.parcela?.nombre || "por definir"}`, 11, true);
    addText(`Comuna: ${data.parcela?.comuna || "por definir"} · Superficie: ${data.parcela ? (data.parcela.tamano || data.parcela.superficie || data.parcela.m2 || "por definir") : "por definir"} m²`);
    addText(`Casa: ${data.casa?.nombre || "por definir"}`, 11, true);
    addText(`Superficie casa: ${data.casa ? (data.casa.metros || data.casa.superficie || data.casa.mt2 || "por definir") : "por definir"} m² · Habitaciones: ${data.casa ? (data.casa.habitaciones || data.casa.dormitorios || "por definir") : "por definir"}`);
    addText(`Fundación e instalación: ${data.fundacion?.nombre || "por definir"}`);
    if (parcelaLink) {
      doc.setTextColor(0, 130, 138); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.textWithLink("Abrir ficha completa de la parcela", margin, y, { url: parcelaLink }); y += 16;
    }
    const plano = getCasaPlano(data.casa);
    if (plano) {
      const planoUrl = plano.startsWith("http") ? plano : `${location.origin}${location.pathname.replace(/index\.html?$/, "")}${plano}`;
      doc.setTextColor(0, 130, 138); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.textWithLink("Abrir plano de la casa", margin, y, { url: planoUrl }); y += 16;
    }
    y += 8;

    addSectionTitle("Resumen de valores");
    (data.rowsText || "Resumen pendiente").split("\n").forEach(line => addText(line, 10, false));
    y += 6;
    addText(`TOTAL ESTIMADO: ${data.total}`, 15, true, [0, 63, 122]);
    y += 8;

    addSectionTitle("Adicionales seleccionados");
    addText(data.extrasText || "Sin adicionales seleccionados");
    y += 8;
    addText("Valores referenciales sujetos a disponibilidad, visita técnica, condiciones del terreno y confirmación comercial.", 9, false, [100, 116, 139]);

    return doc.output("blob");
  }

  function downloadBlob(blob, filename) {
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  function generateCotizacionPdfIndex(cliente = {}, shouldDownload = true) {
    const filename = `cotizacion-tu-parcela-lista-${Date.now()}.pdf`;
    const blob = createCotizacionPdfBlob(cliente);
    if (blob && shouldDownload) downloadBlob(blob, filename);
    return { filename, blob };
  }

  function openActivationModal() {
    if (!state.selectedParcela) {
      showFriendlyMessage("Primero selecciona una parcela para activar el proyecto.");
      scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor);
      return;
    }
    if (DOM.activationModal) {
      DOM.activationModal.classList.add("active");
      DOM.activationModal.setAttribute("aria-hidden", "false");
      setTimeout(() => DOM.activationModal?.querySelector('input[name="nombre"]')?.focus(), 80);
    }
  }

  function closeActivationModal() {
    if (!DOM.activationModal) return;
    DOM.activationModal.classList.remove("active");
    DOM.activationModal.setAttribute("aria-hidden", "true");
  }

  async function sendActivationRequest(cliente) {
    const pdfResult = generateCotizacionPdfIndex(cliente, true);
    const bodyText = buildCotizacionPlainText(cliente);
    const formData = new FormData();
    formData.append("_subject", `Nueva activación de proyecto - ${state.selectedParcela?.nombre || "Tu Parcela Lista"}`);
    formData.append("_cc", cliente.email || "");
    formData.append("_template", "table");
    formData.append("nombre", cliente.nombre || "");
    formData.append("email_cliente", cliente.email || "");
    formData.append("telefono", cliente.telefono || "");
    formData.append("ciudad", cliente.ciudad || "");
    formData.append("comentario", cliente.mensaje || "");
    formData.append("cotizacion", bodyText);
    if (pdfResult.blob) formData.append("attachment", pdfResult.blob, pdfResult.filename);

    try {
      const res = await fetch("https://formsubmit.co/ajax/tuparcelalista@gmail.com", {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: formData
      });
      if (!res.ok) throw new Error("No se pudo enviar por FormSubmit");
      return true;
    } catch (err) {
      const subject = encodeURIComponent(`Activación de proyecto - ${state.selectedParcela?.nombre || "Tu Parcela Lista"}`);
      const body = encodeURIComponent(bodyText + "\n\nAdjunta manualmente el PDF descargado si tu correo lo permite.");
      window.location.href = `mailto:tuparcelalista@gmail.com?cc=${encodeURIComponent(cliente.email || "")}&subject=${subject}&body=${body}`;
      return false;
    }
  }

  function initMap() {
    if (map || !DOM.mapContainer || !window.L) return;
    map = L.map(DOM.mapContainer, { zoomControl: false }).setView([-36.82, -73.05], 8);
    L.control.zoom({ position: "topright" }).addTo(map);
    streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
    satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles © Esri", maxZoom: 19 });
    satelliteLabelsLayer = L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { attribution: "Labels © Esri", pane: "overlayPane", opacity: 1, maxZoom: 19 });

    // TPL Map 2.0: marcadores limpios por defecto.
    // Las fotos aparecen solo cuando el zoom está muy cerca o cuando se selecciona una parcela.
    window.tplMapMarkerIcon = function(imgUrl, selected = false, forcePhoto = false) {
      const safeImg = imgUrl || "image/placeholder-parcela.jpg";
      const showPhoto = forcePhoto || selected || (map && map.getZoom && map.getZoom() >= 15);
      if (showPhoto) {
        return L.divIcon({
          className: `tpl-clean-marker tpl-clean-marker-photo ${selected ? "selected" : ""}`,
          html: `<span class="tpl-clean-marker-photo-inner" style="background-image:url('${safeImg.replace(/'/g, "%27")}')"></span>`,
          iconSize: selected ? [58, 58] : [48, 48],
          iconAnchor: selected ? [29, 29] : [24, 24],
          popupAnchor: [0, -30]
        });
      }
      return L.divIcon({
        className: `tpl-clean-marker tpl-clean-marker-dot ${selected ? "selected" : ""}`,
        html: `<span class="tpl-clean-marker-dot-inner"></span>`,
        iconSize: selected ? [28, 28] : [22, 22],
        iconAnchor: selected ? [14, 14] : [11, 11],
        popupAnchor: [0, -16]
      });
    };

    window.tplPhotoMarkerIcon = window.tplMapMarkerIcon;
  }

  function renderMapa(focusId = null) {
    initMap();
    if (!map) return;

    if (markerClusterLayer) {
      markerClusterLayer.clearLayers();
      map.removeLayer(markerClusterLayer);
      markerClusterLayer = null;
    }
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    markerClusterLayer = window.L.markerClusterGroup ? L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 15,
      maxClusterRadius: 48,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<span class="tpl-cluster-count">${count}</span>`,
          className: "tpl-cluster-marker",
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });
      }
    }).addTo(map) : null;

    const list = (window.__mapShowAllParcelas ? [...getAllParcelas()] : getFilteredParcelas())
      .filter(p => p && p.lat && p.lng);

    if (DOM.mapResults) DOM.mapResults.textContent = `${list.length} resultados`;
    if (DOM.mapCards) DOM.mapCards.innerHTML = "";

    const bounds = [];
    let focusMarker = null;
    let focusParcela = null;
    const markerById = new Map();

    function getVisibleByMap() {
      if (!map || !list.length) return list;
      const b = map.getBounds();
      const center = map.getCenter();
      const visible = list
        .filter(p => b.contains([Number(p.lat), Number(p.lng)]))
        .sort((a, b) =>
          distanceKm(center.lat, center.lng, Number(a.lat), Number(a.lng)) -
          distanceKm(center.lat, center.lng, Number(b.lat), Number(b.lng))
        );
      return visible.length ? visible : [...list].sort((a, b) =>
        distanceKm(center.lat, center.lng, Number(a.lat), Number(a.lng)) -
        distanceKm(center.lat, center.lng, Number(b.lat), Number(b.lng))
      );
    }

    function setActiveMarker(activeId) {
      markerById.forEach((marker, id) => {
        const parcela = list.find(p => p.id === id);
        const img = getParcelaCardImage(parcela || {});
        if (window.tplMapMarkerIcon) marker.setIcon(window.tplMapMarkerIcon(img, id === activeId));
      });
      DOM.mapCards?.querySelectorAll('.map-card-item').forEach(card => {
        card.classList.toggle('active', card.dataset.id === activeId);
      });
    }

    function paintMapSidebar(items, forceOne = false) {
      if (!DOM.mapCards) return;
      const clean = items.filter(x => x && x.lat && x.lng);
      const visibleItems = clean.slice(0, forceOne ? 1 : 5);
      DOM.mapCards.innerHTML = "";

      if (DOM.mapResults) {
        DOM.mapResults.textContent = forceOne && visibleItems.length
          ? "1 parcela seleccionada"
          : `${visibleItems.length} de ${clean.length || list.length} visibles`;
      }

      visibleItems.forEach(p => {
        const marker = markerById.get(p.id);
        const card = document.createElement("article");
        card.className = "map-card-item";
        card.dataset.id = p.id;
        card.innerHTML = `
          <button class="map-card-main" type="button" aria-label="Ver ${p.nombre} en el mapa">
            <img src="${getParcelaCardImage(p)}" alt="${p.nombre}">
            <span class="map-card-info">
              <b class="map-card-price">${p.precio || "Consultar"}</b>
              <strong>${p.nombre}</strong>
              <small>${p.comuna || "Chile"} · ${Number(p.tamano || 0).toLocaleString("es-CL")} m²</small>
              ${getDistanceBadge(p)}
            </span>
          </button>
          <div class="map-card-actions">
            <a href="parcela.html?id=${encodeURIComponent(p.id)}">Más detalles</a>
            <button type="button" data-add-house="${p.id}">Sumar casa</button>
          </div>`;

        card.querySelector('.map-card-main')?.addEventListener("click", () => {
          setActiveMarker(p.id);
          map.flyTo([p.lat, p.lng], 16, { duration: 0.8 });
          setTimeout(() => marker?.openPopup(), 420);
        });
        card.querySelector('[data-add-house]')?.addEventListener("click", () => {
          selectParcela(p);
          state.mode = "combo";
          DOM.casasSection?.classList.add("active");
          renderCasas();
          closeMap();
          scrollTo(DOM.casasSection);
        });
        DOM.mapCards.appendChild(card);
      });
    }

    list.forEach(p => {
      bounds.push([p.lat, p.lng]);
      const img = getParcelaCardImage(p);
      const popupHtml = `
        <div class="map-popup-card map-popup-premium">
          ${img ? `<img src="${img}" alt="${p.nombre}" loading="${state.recommendationActive ? "eager" : "lazy"}" fetchpriority="${state.recommendationActive ? "high" : "auto"}" decoding="async" width="800" height="600">` : ""}
          <span class="map-popup-price">${p.precio || "Consultar"}</span>
          <strong>${p.nombre}</strong>
          <small>${p.comuna || "Chile"} · ${Number(p.tamano || 0).toLocaleString("es-CL")} m²</small>
              ${getDistanceBadge(p)}
          <div class="map-popup-actions">
            <a class="popup-detail" href="parcela.html?id=${encodeURIComponent(p.id)}">Más detalles</a>
            <button class="popup-select" type="button" onclick="window.tplSelectMapParcela && window.tplSelectMapParcela('${String(p.id).replace(/'/g, "\'")}')">Sumar casa</button>
          </div>
        </div>`;
      const marker = L.marker([p.lat, p.lng], window.tplMapMarkerIcon ? { icon: window.tplMapMarkerIcon(img, focusId === p.id) } : undefined)
        .bindPopup(popupHtml);
      if (markerClusterLayer) markerClusterLayer.addLayer(marker);
      else marker.addTo(map);
      marker.on("click", () => {
        setActiveMarker(p.id);
        paintMapSidebar([p], true);
      });
      markerById.set(p.id, marker);
      markers.push(marker);
      if (focusId && p.id === focusId) { focusMarker = marker; focusParcela = p; }
    });

    window.tplSelectMapParcela = function(id) {
      const p = getAllParcelas().find(x => x.id === id);
      if (!p) return;
      selectParcela(p);
      state.mode = "combo";
      DOM.casasSection?.classList.add("active");
      renderCasas();
      closeMap();
      scrollTo(DOM.casasSection);
    };

    function updateVisibleMarkerIcons(activeId = null) {
      markerById.forEach((marker, id) => {
        const parcela = list.find(p => p.id === id);
        if (!parcela || !window.tplMapMarkerIcon) return;
        marker.setIcon(window.tplMapMarkerIcon(getParcelaCardImage(parcela), id === activeId));
      });
    }

    if (!map.__tplSidebarMoveBound) {
      map.__tplSidebarMoveBound = true;
      map.on("zoomend moveend", () => {
        updateVisibleMarkerIcons();
        const currentList = window.__lastMapList || [];
        if (!currentList.length || !DOM.mapCards) return;
        const c = map.getCenter();
        const visible = currentList
          .filter(p => map.getBounds().contains([Number(p.lat), Number(p.lng)]))
          .sort((a,b) => distanceKm(c.lat, c.lng, Number(a.lat), Number(a.lng)) - distanceKm(c.lat, c.lng, Number(b.lat), Number(b.lng)));
        const next = visible.length ? visible : [...currentList].sort((a,b) => distanceKm(c.lat, c.lng, Number(a.lat), Number(a.lng)) - distanceKm(c.lat, c.lng, Number(b.lat), Number(b.lng)));
        paintMapSidebar(next, false);
      });
    }

    window.__lastMapList = list;

    if (focusMarker && focusParcela) {
      map.flyTo([focusParcela.lat, focusParcela.lng], 15, { duration: 0.8 });
      setTimeout(() => {
        focusMarker.openPopup();
        paintMapSidebar([focusParcela], true);
        setActiveMarker(focusParcela.id);
      }, 350);
    } else if (bounds.length) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      setTimeout(() => paintMapSidebar(getVisibleByMap(), false), 180);
    }
  }

  function openMap(focusId = null) {
    state.viewMode = "map";
    DOM.mapLayout?.classList.remove("map-hidden");
    if (DOM.btnMapView) {
      DOM.btnMapView.innerHTML = '<i data-lucide="map"></i><span>Ocultar mapa</span>';
      if(window.lucide) window.lucide.createIcons();
    }
    renderMapa(focusId);
    setTimeout(() => { map?.invalidateSize(); if (focusId) renderMapa(focusId); }, 80);
  }

  function closeMap() {
    state.viewMode = "grid";
    DOM.mapLayout?.classList.add("map-hidden");
    if (DOM.btnMapView) {
      DOM.btnMapView.innerHTML = '<i data-lucide="globe-2"></i><span>Ver en mapa</span>';
      if(window.lucide) window.lucide.createIcons();
    }
  }

  function populateComunas() {
    if (!DOM.regionDropdown) return;
    const comunas = [...new Set(getAllParcelas().map(p => p.comuna).filter(Boolean))].sort();
    DOM.regionDropdown.innerHTML = `<button type="button" class="dropdown-item" data-commune="all">Todas las comunas</button>` + comunas.map(c => `<button type="button" class="dropdown-item" data-commune="${c}">${c}</button>`).join("");
  }

  function toggleClear() {
    if (!DOM.filterClear) return;
    const f = state.activeFilters;
    DOM.filterClear.style.display = f.text || f.gps || f.economic || f.size || f.payment || f.water || f.river || f.native || f.commune !== "all" ? "inline-flex" : "none";
  }

  function refresh() {
    if (state.viewMode === "map") renderMapa(); else renderParcelas();
    toggleClear();
  }

  function showFriendlyMessage(text, title = "Tu Parcela Lista") {
    let box = document.getElementById("friendly-message");
    if (!box) {
      document.body.insertAdjacentHTML("beforeend", `
        <div class="friendly-message" id="friendly-message" role="status" aria-live="polite">
          <button type="button" class="friendly-message-close" aria-label="Cerrar">×</button>
          <strong></strong>
          <p></p>
        </div>`);
      box = document.getElementById("friendly-message");
      box.querySelector("button")?.addEventListener("click", () => box.classList.remove("show"));
    }
    box.querySelector("strong").textContent = title;
    box.querySelector("p").textContent = text;
    box.classList.add("show");
    clearTimeout(box.__hideTimer);
    box.__hideTimer = setTimeout(() => box.classList.remove("show"), 5200);
  }


  function ensurePreviewActionButtons() {
    const parcelaBox = DOM.previewParcelaImg?.closest(".preview-photo-box");
    const casaBox = DOM.previewCasaImg?.closest(".preview-photo-box");
    if (parcelaBox && !parcelaBox.querySelector('[data-project-info="parcela"]:not(img)')) {
      parcelaBox.insertAdjacentHTML("afterbegin", '<button class="preview-ficha-btn" type="button" data-project-info="parcela">Ficha parcela</button>');
    }
    if (casaBox && !casaBox.querySelector('[data-project-info="casa"]:not(img)')) {
      casaBox.insertAdjacentHTML("afterbegin", '<button class="preview-ficha-btn" type="button" data-project-info="casa">Ficha casa</button>');
    }
    DOM.previewParcelaImg?.setAttribute("data-project-info", "parcela");
    DOM.previewCasaImg?.setAttribute("data-project-info", "casa");
    DOM.changeParcelaBtn?.setAttribute("data-change-project", "parcela");
    DOM.changeCasaBtn?.setAttribute("data-change-project", "casa");
  }

  function beginProjectChange(type) {
    setPendingProjectChange(type);
    if (type === "parcela") {
      showFriendlyMessage("Elige una nueva parcela. Ahora las tarjetas mostrarán el botón Agregar parcela y al seleccionarla volverás al cotizador.", "Cambiar parcela");
      state.viewMode = "grid";
      state.recommendationActive = false;
      closeMap();
      renderParcelas(getAllParcelas());
      scrollToParcelasResults();
      return;
    }
    showFriendlyMessage("Elige una nueva casa. Al seleccionarla volverás al cotizador con tu proyecto actualizado.", "Cambiar casa");
    DOM.casasSection?.classList.add("active");
    renderCasas();
    scrollTo(DOM.casasSection);
  }

  function finishProjectChangeIfNeeded(type) {
    const pending = getPendingProjectChange();
    if (pending !== type) return false;
    setPendingProjectChange("");
    if (type === "parcela" && !state.selectedCasa) {
      DOM.casasSection?.classList.add("active");
      setTimeout(() => scrollTo(DOM.casasSection), 120);
      return true;
    }
    DOM.cotizadorSection?.classList.add("active");
    setTimeout(() => scrollTo(DOM.cotizadorSection), 140);
    return true;
  }

  function setupEvents() {
    ensurePreviewActionButtons();

    DOM.installationServiceToggle?.addEventListener("change", () => {
      state.installationService = !!DOM.installationServiceToggle.checked;
      if (state.installationService && !state.selectedFundacion) state.selectedFundacion = getCheapestFundacion();
      if (!state.installationService) state.selectedFundacion = null;
      if (isPremiumInstallationPlan()) removePremiumIncludedExtrasFromSelection();
      renderFundaciones();
      renderExtras();
      updateCotizacionSummary();
    });

    document.addEventListener("click", e => {
      const infoBtn = e.target.closest("[data-project-info]");
      if (infoBtn) {
        e.preventDefault();
        e.stopPropagation();
        const type = infoBtn.getAttribute("data-project-info");
        openSummaryInfoModal(type === "casa" ? "casa" : "parcela");
        return;
      }

      const changeBtn = e.target.closest("[data-change-project]");
      if (changeBtn) {
        e.preventDefault();
        e.stopPropagation();
        beginProjectChange(changeBtn.getAttribute("data-change-project") === "casa" ? "casa" : "parcela");
        return;
      }

      const locationBtn = e.target.closest("[data-summary-location]");
      if (locationBtn) {
        const parcela = getParcelaById(locationBtn.dataset.summaryLocation);
        openLocationModal(parcela || state.selectedParcela);
      }

      if (e.target.closest("[data-close-location-modal]")) closeLocationModal();
    });

    document.getElementById("tpl-location-street")?.addEventListener("click", () => setLocationLayer("street"));
    document.getElementById("tpl-location-satellite")?.addEventListener("click", () => setLocationLayer("satellite"));
    document.getElementById("tpl-location-geolocate")?.addEventListener("click", activateUserLocationForModal);
    document.querySelectorAll("[data-close-location-modal]").forEach(el => {
      el.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        closeLocationModal();
      });
    });
    document.addEventListener("keydown", ev => {
      if (ev.key === "Escape") closeLocationModal();
    });

    DOM.previewParcelaImg?.addEventListener("click", () => openSummaryInfoModal("parcela"));
    DOM.previewCasaImg?.addEventListener("click", () => openSummaryInfoModal("casa"));
    DOM.previewParcelaImg?.setAttribute("title", "Ver ficha de la parcela");
    DOM.previewCasaImg?.setAttribute("title", "Ver ficha de la casa");

    DOM.optParcela?.addEventListener("click", () => {
      state.mode = "parcela";
      state.recommendationActive = false;
      hideComboProposals();
      DOM.decisionFlow?.classList.remove("combo-mode");
      DOM.decisionFlow?.classList.add("budget-active");
      DOM.budgetBox.style.display = "block";
      DOM.comboFields?.classList.add("hidden");
      if (DOM.budgetTitle) DOM.budgetTitle.textContent = "¿Cuál es tu presupuesto?";
      if (DOM.budgetHelp) DOM.budgetHelp.textContent = "";
      if (DOM.budgetGo) {
        const label = DOM.budgetGo.querySelector("span");
        if (label) label.textContent = "Buscar";
        else DOM.budgetGo.textContent = "Buscar";
      }
      DOM.budgetInput?.focus();
    });

    DOM.optCombo?.addEventListener("click", () => {
      state.mode = "combo";
      hideComboProposals();
      DOM.decisionFlow?.classList.add("budget-active", "combo-mode");
      DOM.budgetBox.style.display = "block";
      DOM.comboFields?.classList.remove("hidden");
      if (DOM.budgetTitle) DOM.budgetTitle.textContent = "Buscaremos parcela + casa con tu presupuesto";
      if (DOM.budgetHelp) DOM.budgetHelp.textContent = "";
      if (DOM.budgetGo) {
        const label = DOM.budgetGo.querySelector("span");
        if (label) label.textContent = "Buscar alternativas";
        else DOM.budgetGo.textContent = "Buscar alternativas";
      }
      DOM.budgetInput?.focus();
    });

    // v0.9.1-fix: listeners en captura para evitar que otros scripts externos bloqueen
    // los dos botones grandes iniciales.
    DOM.optParcela?.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      state.mode = "parcela";
      state.recommendationActive = false;
      hideComboProposals();
      DOM.decisionFlow?.classList.remove("combo-mode");
      DOM.decisionFlow?.classList.add("budget-active");
      DOM.decisionFlow?.classList.remove("choice-combo");
      DOM.decisionFlow?.classList.add("choice-parcela");
      if (DOM.budgetBox) DOM.budgetBox.style.display = "block";
      DOM.comboFields?.classList.add("hidden");
      if (DOM.budgetTitle) DOM.budgetTitle.textContent = "¿Cuál es tu presupuesto?";
      if (DOM.budgetHelp) DOM.budgetHelp.textContent = "Te mostraremos 5 parcelas cercanas a tu presupuesto.";
      if (DOM.budgetGo) {
        const label = DOM.budgetGo.querySelector("span");
        if (label) label.textContent = "Buscar parcelas";
        else DOM.budgetGo.textContent = "Buscar parcelas";
      }
      setTimeout(() => DOM.budgetInput?.focus(), 40);
    }, true);

    DOM.optCombo?.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      state.mode = "combo";
      hideComboProposals();
      DOM.decisionFlow?.classList.add("budget-active", "combo-mode", "choice-combo");
      DOM.decisionFlow?.classList.remove("choice-parcela");
      if (DOM.budgetBox) DOM.budgetBox.style.display = "block";
      DOM.comboFields?.classList.remove("hidden");
      if (DOM.budgetTitle) DOM.budgetTitle.textContent = "Buscaremos parcela + casa con tu presupuesto";
      if (DOM.budgetHelp) DOM.budgetHelp.textContent = "Te mostraremos propuestas de parcela + casa cercanas al monto.";
      if (DOM.budgetGo) {
        const label = DOM.budgetGo.querySelector("span");
        if (label) label.textContent = "Buscar alternativas";
        else DOM.budgetGo.textContent = "Buscar alternativas";
      }
      setTimeout(() => DOM.budgetInput?.focus(), 40);
    }, true);

    DOM.budgetInput?.addEventListener("input", () => {
      const raw = String(DOM.budgetInput.value || "").replace(/\D/g, "");
      DOM.budgetInput.value = raw ? Number(raw).toLocaleString("es-CL") : "";
    });

    const budgetLoaderMessages = [
      ["Buscando las mejores opciones para ti", "Estamos comparando precios, ubicación y características según tu presupuesto."],
      ["Revisando alternativas cercanas", "Ordenamos las parcelas para mostrarte primero las que mejor se ajustan a tu proyecto."],
      ["Preparando tus resultados", "Estamos cargando las fotografías y dejando listas tus cinco recomendaciones."]
    ];
    let budgetLoaderTimer = null;

    function showBudgetSearchLoader() {
      const loader = document.getElementById("tpl-budget-loader");
      const title = document.getElementById("tpl-budget-loader-title");
      const text = document.getElementById("tpl-budget-loader-text");
      if (!loader) return;
      document.body.classList.add("tpl-budget-searching");
      loader.hidden = false;
      let index = 0;
      const update = () => {
        const message = budgetLoaderMessages[index % budgetLoaderMessages.length];
        if (title) title.textContent = message[0];
        if (text) text.textContent = message[1];
        index += 1;
      };
      update();
      clearInterval(budgetLoaderTimer);
      budgetLoaderTimer = setInterval(update, 850);
    }

    function hideBudgetSearchLoader() {
      clearInterval(budgetLoaderTimer);
      budgetLoaderTimer = null;
      const loader = document.getElementById("tpl-budget-loader");
      if (loader) loader.hidden = true;
      document.body.classList.remove("tpl-budget-searching");
    }

    function nextPaint() {
      return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    function preloadBudgetImages(parcelasList, timeoutMs = 1800) {
      const sources = parcelasList.map(getParcelaCardImage).filter(Boolean);
      if (!sources.length) return Promise.resolve();
      const loads = sources.map(src => new Promise(resolve => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = resolve;
        image.src = src;
        if (image.complete) resolve();
      }));
      return Promise.race([
        Promise.all(loads),
        new Promise(resolve => setTimeout(resolve, timeoutMs))
      ]);
    }

    async function handleBudgetSearch(ev) {
      ev?.preventDefault?.();
      ev?.stopImmediatePropagation?.();

      state.budget = Number(String(DOM.budgetInput?.value || 0).replace(/\D/g, ""));
      state.wantedRooms = DOM.roomInput?.value || "all";
      state.wantedMeters = Number(DOM.metersInput?.value || 0);

      if (!state.mode || state.mode === "normal") state.mode = "parcela";

      if (!state.budget) {
        showFriendlyMessage("Ingresa un presupuesto válido para mostrarte alternativas cercanas.");
        DOM.budgetInput?.focus();
        return;
      }

      DOM.decisionFlow?.classList.add("flow-completed");
      if (DOM.budgetBox) DOM.budgetBox.style.display = "none";

      if (state.mode === "parcela") {
        const startedAt = performance.now();
        showBudgetSearchLoader();
        try {
          state.viewMode = "grid";
          state.recommendationActive = true;
          state.lastParcelasRenderKey = "";
          state.parcelasRenderLimit = 5;
          state.activeFilters = {
            text: "", gps: false, economic: false, size: false, payment: false,
            water: false, river: false, native: false, commune: "all"
          };
          closeMap();
          hideComboProposals();

          document.body.classList.add("tpl-guided-revealed", "tpl-show-parcelas");
          [DOM.parcelasAnchor, DOM.gridView, DOM.parcelasContainer].forEach(el => {
            if (!el) return;
            el.hidden = false;
            el.style.visibility = "visible";
            el.style.opacity = "1";
          });
          if (DOM.gridView) DOM.gridView.style.display = "block";
          if (DOM.parcelasContainer) DOM.parcelasContainer.style.display = "grid";

          await nextPaint();
          const recommended = getRecommendedParcelas();
          await preloadBudgetImages(recommended);
          state.parcelasRenderLimit = 5;
          renderParcelas(recommended);
          toggleClear();
          await nextPaint();

          const elapsed = performance.now() - startedAt;
          if (elapsed < 850) await new Promise(resolve => setTimeout(resolve, 850 - elapsed));
        } finally {
          hideBudgetSearchLoader();
        }
        scrollToParcelasResults();
        return;
      }

      const matches = findComboMatches();
      if (!matches.length) {
        showFriendlyMessage("No encontramos una combinación exacta, pero te mostramos casas disponibles para ajustar tu proyecto.");
        DOM.casasSection?.classList.add("active");
        hideComboProposals();
        renderCasas();
        scrollTo(DOM.casasSection);
        return;
      }
      DOM.casasSection?.classList.add("active");
      renderComboProposals(matches);
      renderCasas(matches.map(m => m.casa).filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i));
      scrollTo(DOM.comboProposalsSection || DOM.casasSection);
    }

    // v0.9.1-fix: el sitio tiene scripts complementarios que también escuchan el botón de presupuesto.
    // Registramos este flujo en captura y detenemos propagación dentro de handleBudgetSearch()
    // para que "Parcela" siempre renderice primero las 5 alternativas y luego haga scroll.
    DOM.budgetGo?.addEventListener("click", handleBudgetSearch, true);
    DOM.budgetInput?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") handleBudgetSearch(ev);
    }, true);

    DOM.searchBtn?.addEventListener("click", () => { state.activeFilters.text = DOM.searchInput?.value || ""; refresh(); scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor); });
    DOM.searchInput?.addEventListener("keydown", e => { if (e.key === "Enter") DOM.searchBtn?.click(); });
    document.querySelectorAll('a[href="#parcelas-anchor"], a[href="index.html#parcelas-anchor"]').forEach(link => {
      link.addEventListener("click", () => {
        window.__mapShowAllParcelas = true;
        state.recommendationActive = false;
        state.activeFilters = { text: "", gps: false, economic: false, size: false, payment: false, water: false, river: false, native: false, commune: "all" };
        document.querySelectorAll(".filter-btn.active").forEach(b => b.classList.remove("active"));
        closeMap();
        hideComboProposals();
        renderParcelas(getAllParcelas());
        setTimeout(() => scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor), 80);
      });
    });

    DOM.filterGps?.addEventListener("click", () => {
      const activate = !state.activeFilters.gps;
      if (!activate) {
        state.activeFilters.gps = false;
        DOM.filterGps.classList.remove("active");
        refresh();
        scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor);
        return;
      }
      if (!navigator.geolocation) { showFriendlyMessage("Tu navegador no permite ubicación. Puedes usar los otros filtros."); return; }
      navigator.geolocation.getCurrentPosition(pos => {
        state.userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.activeFilters.gps = true;
        DOM.filterGps.classList.add("active");
        showFriendlyMessage("Ordenamos las parcelas por distancia. En cada tarjeta verás kilómetros y tiempo estimado en vehículo.");
        refresh();
        scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor);
      }, () => showFriendlyMessage("No pudimos obtener tu ubicación. Revisa los permisos del navegador."));
    });
    DOM.filterEconomic?.addEventListener("click", () => { state.activeFilters.economic = !state.activeFilters.economic; DOM.filterEconomic.classList.toggle("active", state.activeFilters.economic); refresh(); scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor); });
    DOM.filterSize?.addEventListener("click", () => { state.activeFilters.size = !state.activeFilters.size; DOM.filterSize.classList.toggle("active", state.activeFilters.size); refresh(); scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor); });
    DOM.filterPayment?.addEventListener("click", () => { state.activeFilters.payment = !state.activeFilters.payment; DOM.filterPayment.classList.toggle("active", state.activeFilters.payment); refresh(); scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor); });
    DOM.filterWater?.addEventListener("click", () => { state.activeFilters.water = !state.activeFilters.water; DOM.filterWater.classList.toggle("active", state.activeFilters.water); refresh(); scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor); });
    DOM.filterRiver?.addEventListener("click", () => { state.activeFilters.river = !state.activeFilters.river; DOM.filterRiver.classList.toggle("active", state.activeFilters.river); refresh(); scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor); });
    DOM.filterNative?.addEventListener("click", () => { state.activeFilters.native = !state.activeFilters.native; DOM.filterNative.classList.toggle("active", state.activeFilters.native); refresh(); scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor); });
    function revealParcelaSidebar(extraOffset = 140) {
      const sidebar = document.querySelector(".parcelas-sidebar");
      const target = sidebar || DOM.parcelasAnchor;
      if (!target) return;

      const y = target.getBoundingClientRect().top + window.pageYOffset - extraOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }

    DOM.filterRegionBtn?.addEventListener("click", () => {
      const isOpen = DOM.regionDropdown?.classList.toggle("active");
      const sidebar = document.querySelector(".parcelas-sidebar");
      sidebar?.classList.toggle("comunas-open", !!isOpen);
      if (isOpen) {
        // Al abrir Comunas se activa scroll interno del sidebar y se acomoda la vista.
        setTimeout(() => revealParcelaSidebar(115), 80);
      }
    });

    DOM.regionDropdown?.addEventListener("click", e => {
      const item = e.target.closest(".dropdown-item");
      if (!item) return;
      state.activeFilters.commune = item.dataset.commune;
      DOM.regionDropdown.classList.remove("active");
      document.querySelector(".parcelas-sidebar")?.classList.remove("comunas-open");
      refresh();
      // Al elegir una comuna, se baja un poco y se deja visible el inicio de resultados.
      setTimeout(() => revealParcelaSidebar(105), 80);
    });
    DOM.filterClear?.addEventListener("click", () => {
      state.activeFilters = { text: "", gps: false, economic: false, size: false, payment: false, water: false, river: false, native: false, commune: "all" };
      if (DOM.searchInput) DOM.searchInput.value = "";
      document.querySelectorAll(".filter-btn.active").forEach(b => b.classList.remove("active"));
      refresh();
      setTimeout(() => scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor), 80);
    });

    DOM.btnMapView?.addEventListener("click", () => {
      window.__mapShowAllParcelas = false;
      if (DOM.mapLayout?.classList.contains("map-hidden")) {
        openMap();
      } else {
        closeMap();
      }
    });
    DOM.backToParcelas?.addEventListener("click", () => {
      closeMap();
    });

    document.addEventListener("click", e => {
      if (e.target.id === "map-satellite") {
        if (map && satelliteLayer && !map.hasLayer(satelliteLayer)) { map.removeLayer(streetLayer); satelliteLayer.addTo(map); satelliteLabelsLayer?.addTo(map); setTimeout(() => map.invalidateSize(), 80); }
      }
      if (e.target.id === "map-street") {
        if (map && streetLayer && !map.hasLayer(streetLayer)) { map.removeLayer(satelliteLayer); if (satelliteLabelsLayer && map.hasLayer(satelliteLabelsLayer)) map.removeLayer(satelliteLabelsLayer); streetLayer.addTo(map); setTimeout(() => map.invalidateSize(), 80); }
      }
      if (e.target.classList.contains("popup-select")) {
        const p = getAllParcelas().find(x => x.id === e.target.dataset.id);
        if (p) { closeMap(); selectParcela(p); DOM.casasSection?.classList.add("active"); renderCasas(); scrollTo(DOM.casasSection); }
      }
    });

    DOM.roomFilterButtons?.forEach(btn => {
      btn.addEventListener("click", () => {
        DOM.roomFilterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.roomFilter = btn.dataset.rooms || "all";
        renderCasas();
      });
    });

    DOM.changeParcelaBtn?.addEventListener("click", (ev) => {
      ev.preventDefault();
      beginProjectChange("parcela");
    });

    DOM.changeCasaBtn?.addEventListener("click", (ev) => {
      ev.preventDefault();
      beginProjectChange("casa");
    });

    DOM.whatsappBtn?.addEventListener("click", () => {
      if (!state.selectedParcela) {
        showFriendlyMessage("Primero selecciona una parcela para enviar la cotización.");
        scrollTo(DOM.parcelasContainer || DOM.parcelasAnchor);
        return;
      }

      // Genera un PDF descargable como respaldo, pero no bloquea WhatsApp si falla la librería.
      const pdfResult = generateCotizacionPdfIndex({}, true);
      const data = getCotizacionData();
      const msg = encodeURIComponent(
        `Hola Tu Parcela Lista, quiero avanzar con esta cotización.\n\n` +
        `🏡 PROYECTO COTIZADO\n` +
        `Parcela/Campo: ${data.parcela?.nombre || "por definir"}\n` +
        `Comuna: ${data.parcela?.comuna || "por definir"}\n` +
        `Tamaño terreno: ${data.parcela ? (data.parcela.tamano || data.parcela.superficie || data.parcela.m2 || "por definir") : "por definir"} m²\n` +
        `Casa: ${data.casa?.nombre || "por definir"}\n` +
        `Superficie casa: ${data.casa ? (data.casa.metros || data.casa.superficie || data.casa.mt2 || "por definir") : "por definir"} m²\n` +
        `Habitaciones: ${data.casa ? (data.casa.habitaciones || data.casa.dormitorios || "por definir") : "por definir"}\n` +
        `Fundación e instalación: ${data.fundacion?.nombre || "por definir"}\n\n` +
        `🧾 RESUMEN DE VALORES\n${data.rowsText || "Resumen pendiente"}\n\n` +
        `➕ ADICIONALES\n${data.extrasText}\n\n` +
        `💰 TOTAL ESTIMADO: ${data.total}\n\n` +
        `Se generó un PDF descargable de respaldo${pdfResult?.filename ? ` (${pdfResult.filename})` : ""}.\n\n` +
        `Quiero que un ejecutivo me contacte para revisar disponibilidad, reserva y pasos de compra.`
      );
      window.open(`https://wa.me/${CONTACT_PHONE_WA}?text=${msg}`, "_blank");
    });

    DOM.activateProjectBtn?.addEventListener("click", openActivationModal);
    DOM.downloadProjectPdfBtn?.addEventListener("click", () => generateCotizacionPdfIndex({}, true));
    DOM.activationModal?.querySelectorAll("[data-close-activation]").forEach(btn => btn.addEventListener("click", closeActivationModal));
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeActivationModal(); });

    DOM.activationForm?.addEventListener("submit", async e => {
      e.preventDefault();
      if (!state.selectedParcela) {
        showFriendlyMessage("Primero selecciona una parcela antes de activar el proyecto.");
        return;
      }
      const fd = new FormData(DOM.activationForm);
      const cliente = {
        rut: String(fd.get("rut") || "").trim(),
        nombre: String(fd.get("nombre") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        telefono: String(fd.get("telefono") || "").trim(),
        ciudad: String(fd.get("ciudad") || "").trim(),
        mensaje: String(fd.get("mensaje") || "").trim(),
        parcela_id: state.selectedParcela.id,
        estado: 'esperando_pago'
      };
      if (DOM.activationStatus) DOM.activationStatus.textContent = "Guardando solicitud y redirigiendo a Flow...";
      
      try {
        const leadRes = await window.apiSaveLead(cliente);
        const leadId = leadRes?.data?.[0]?.id || `TPL-${Date.now()}`;
        const amount = (parseClp(state.selectedParcela.precio) * 0.01) || 10000;

        const flowRes = await fetch('/api/flow-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            email: cliente.email,
            subject: `Reserva Parcela ${state.selectedParcela.nombre}`,
            leadId
          })
        });

        const flowData = await flowRes.json();
        
        if (flowData.success && flowData.redirectUrl) {
          if (DOM.activationStatus) DOM.activationStatus.textContent = "Redirigiendo a pago seguro...";
          window.location.href = flowData.redirectUrl;
        } else {
          throw new Error("No se pudo generar el enlace de pago");
        }
      } catch (err) {
        console.error(err);
        if (DOM.activationStatus) DOM.activationStatus.textContent = "Error al iniciar el pago. Revisa tu conexión.";
      }
    });
  }

  function addMapToolbarButtons() {
    const toolbar = document.querySelector(".map-toolbar");
    if (!toolbar || toolbar.querySelector(".map-actions")) return;
    toolbar.insertAdjacentHTML("beforeend", `<div class="map-actions"><button id="map-street" type="button">Mapa normal</button><button id="map-satellite" type="button">Vista satelital</button><button id="map-distance" type="button">A cuánta distancia de mí</button><button id="map-back-top" type="button">Ver todas las parcelas</button></div><div id="map-distance-output" class="map-distance-output"></div>`);
    document.getElementById("map-back-top")?.addEventListener("click", () => {
      window.__mapShowAllParcelas = true;
      state.recommendationActive = false;
      state.activeFilters = { text: "", gps: false, economic: false, size: false, payment: false, water: false, river: false, native: false, commune: "all" };
      document.querySelectorAll(".filter-btn.active").forEach(b => b.classList.remove("active"));
      renderMapa();
    });
    document.getElementById("map-distance")?.addEventListener("click", showDistancesFromMe);
  }

  function showDistancesFromMe() {
    const output = document.getElementById("map-distance-output");
    const run = () => {
      const list = (window.__mapShowAllParcelas ? getAllParcelas() : getFilteredParcelas()).filter(p => p.lat && p.lng);
      const nearest = list.map(p => ({ p, km: distanceKm(state.userCoords.lat, state.userCoords.lng, Number(p.lat), Number(p.lng)) }))
        .sort((a,b) => a.km - b.km).slice(0, 5);
      if (output) output.innerHTML = `<strong>Distancia desde tu ubicación:</strong>` + nearest.map(x => `<span>${x.p.nombre}: <b>${x.km.toFixed(1)} km</b></span>`).join("");
    };
    if (state.userCoords) return run();
    if (!navigator.geolocation) { showFriendlyMessage("Tu navegador no permite activar GPS."); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      state.userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      run();
    }, () => showFriendlyMessage("No pudimos obtener tu ubicación. Revisa los permisos del navegador."));
  }

  function openVisitModal() {
    let modal = document.getElementById("visit-modal");
    if (!modal) {
      document.body.insertAdjacentHTML("beforeend", `
        <div class="modal-backdrop" id="visit-modal">
          <div class="lead-modal">
            <button class="modal-close" type="button" data-close-modal>×</button>
            <h3>Agendar visita</h3>
            <p>Completa tus datos y fecha preferida. Se abrirá tu correo con copia para recordatorio.</p>
            <form id="visit-form">
              <input required id="visit-name" placeholder="Nombre completo">
              <input required id="visit-phone" placeholder="Número de contacto">
              <input required id="visit-email" type="email" placeholder="Correo electrónico">
              <input required id="visit-date" type="date">
              <input id="visit-time" type="time">
              <button class="btn-primary-submit" type="submit">Enviar solicitud de visita</button>
            </form>
          </div>
        </div>`);
      modal = document.getElementById("visit-modal");
      modal.querySelector("[data-close-modal]").addEventListener("click", () => modal.classList.remove("active"));
      modal.querySelector("#visit-form").addEventListener("submit", e => {
        e.preventDefault();
        const name = document.getElementById("visit-name").value;
        const phone = document.getElementById("visit-phone").value;
        const email = document.getElementById("visit-email").value;
        const date = document.getElementById("visit-date").value;
        const time = document.getElementById("visit-time").value || "horario por confirmar";
        const subject = encodeURIComponent("Solicitud de agendar visita - Tu Parcela Lista");
        const body = encodeURIComponent(`Hola, quiero agendar una visita.\n\nNombre: ${name}\nTeléfono: ${phone}\nCorreo: ${email}\nFecha preferida: ${date}\nHora: ${time}\n\nParcelas de interés: las parcelas vistas en el mapa.`);
        showFriendlyMessage("Tu solicitud quedó lista. Se abrirá tu correo para enviarla y también puedes escribirnos directo al WhatsApp +56988508361.", "Solicitud preparada");
        window.location.href = `mailto:tuparcelalista@gmail.com?cc=${encodeURIComponent(email)}&subject=${subject}&body=${body}`;
      });
    }
    modal.classList.add("active");
  }


  // ------------------------------------------------------------


  function openProjectInfoModal(type) {
    const item = type === "casa" ? state.selectedCasa : state.selectedParcela;
    if (!item) {
      showFriendlyMessage(type === "casa" ? "Primero selecciona una casa para ver su ficha." : "Primero selecciona una parcela para ver su ficha.");
      return;
    }
    const modal = document.getElementById("tpl-info-modal");
    if (!modal) return;
    const img = document.getElementById("tpl-info-img");
    const kicker = document.getElementById("tpl-info-kicker");
    const title = document.getElementById("tpl-info-title");
    const desc = document.getElementById("tpl-info-desc");
    const grid = document.getElementById("tpl-info-grid");
    const actions = document.getElementById("tpl-info-actions");
    const image = type === "casa"
      ? (item.foto || item.imagen || (item.imagenes && item.imagenes[0]) || "image/placeholder-casa.jpg")
      : ((item.imagenes && item.imagenes[0]) || item.imagen || "image/placeholder-parcela.jpg");
    if (img) img.src = image;
    if (kicker) kicker.textContent = type === "casa" ? "Ficha informativa · Casa" : "Ficha informativa · Parcela";
    if (title) title.textContent = item.nombre || (type === "casa" ? "Casa seleccionada" : "Parcela seleccionada");
    if (desc) desc.textContent = item.descripcion || (type === "casa" ? "Modelo de casa seleccionado para tu proyecto." : "Propiedad seleccionada para tu proyecto.");
    const fields = type === "casa" ? [
      ["Valor", money(Number(item.valorCasa || item.precio || item.valor || 0))],
      ["Superficie", `${Number(item.metros || item.m2 || item.superficie || 0).toLocaleString("es-CL")} m²`],
      ["Habitaciones", `${Number(item.habitaciones || item.dormitorios || 0) || "-"}`],
      ["Sistema", item.tipo || item.material || "Prefabricada"]
    ] : [
      ["Precio", item.precio || "Consultar"],
      ["Superficie", `${getParcelaM2(item).toLocaleString("es-CL")} m²`],
      ["Comuna", item.comuna || "Chile"],
      ["Rol", item.rol || item.escritura || "Consultar"],
      ["Agua", item.agua || "Consultar"],
      ["Luz", item.luz || "Consultar"]
    ];
    if (grid) grid.innerHTML = fields.map(([a,b]) => `<div class="tpl-info-item"><small>${a}</small><strong>${b}</strong></div>`).join("");
    if (actions) {
      actions.innerHTML = type === "casa"
        ? `<button type="button" class="primary" data-close-info-modal>Seguir cotizando</button>`
        : `<a class="primary" href="parcela.html?id=${encodeURIComponent(item.id)}">Ver detalle completo</a><button type="button" class="soft" data-info-location="${item.id}">Ver ubicación</button>`;
    }
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeProjectInfoModal() {
    const modal = document.getElementById("tpl-info-modal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }

  // Mini Mapa Premium: ubicación desde tarjetas Parcela + Casa y cotizador
  // ------------------------------------------------------------
  let locationModalMap = null;
  let locationStreetLayer = null;
  let locationSatelliteLayer = null;
  let locationParcelaMarker = null;
  let locationUserMarker = null;
  let locationRouteLine = null;
  let locationCurrentParcela = null;

  function getParcelaById(id) {
    return getAllParcelas().find(p => String(p.id) === String(id));
  }

  function ensureLocationModalMap(parcela) {
    if (!parcela || !parcela.lat || !parcela.lng || !window.L) return;

    const lat = Number(parcela.lat);
    const lng = Number(parcela.lng);

    if (!locationModalMap) {
      locationModalMap = L.map("tpl-location-map", { zoomControl: false }).setView([lat, lng], 14);
      L.control.zoom({ position: "topright" }).addTo(locationModalMap);

      locationStreetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
      });

      locationSatelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles © Esri",
        maxZoom: 19
      }).addTo(locationModalMap);
    } else {
      locationModalMap.setView([lat, lng], 14);
    }

    if (locationParcelaMarker) locationModalMap.removeLayer(locationParcelaMarker);
    locationParcelaMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: "tpl-location-pin",
        html: "<span></span>",
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      })
    }).addTo(locationModalMap);

    setTimeout(() => locationModalMap?.invalidateSize(), 160);
  }

  function setLocationLayer(type) {
    if (!locationModalMap || !locationStreetLayer || !locationSatelliteLayer) return;
    const streetBtn = document.getElementById("tpl-location-street");
    const satelliteBtn = document.getElementById("tpl-location-satellite");

    if (type === "satellite") {
      if (locationModalMap.hasLayer(locationStreetLayer)) locationModalMap.removeLayer(locationStreetLayer);
      if (!locationModalMap.hasLayer(locationSatelliteLayer)) locationSatelliteLayer.addTo(locationModalMap);
      streetBtn?.classList.remove("active");
      satelliteBtn?.classList.add("active");
    } else {
      if (locationModalMap.hasLayer(locationSatelliteLayer)) locationModalMap.removeLayer(locationSatelliteLayer);
      if (!locationModalMap.hasLayer(locationStreetLayer)) locationStreetLayer.addTo(locationModalMap);
      satelliteBtn?.classList.remove("active");
      streetBtn?.classList.add("active");
    }
  }

  function openLocationModal(parcela) {
    if (!parcela || !parcela.lat || !parcela.lng) {
      showFriendlyMessage("Esta parcela aún no tiene coordenadas disponibles para mostrarla en el mapa.");
      return;
    }

    locationCurrentParcela = parcela;

    const modal = document.getElementById("tpl-location-modal");
    const title = document.getElementById("tpl-location-title");
    const subtitle = document.getElementById("tpl-location-subtitle");
    const name = document.getElementById("tpl-location-name");
    const meta = document.getElementById("tpl-location-meta");
    const distance = document.getElementById("tpl-location-distance");
    const directions = document.getElementById("tpl-location-directions");
    const detail = document.getElementById("tpl-location-detail");
    const waze = document.getElementById("tpl-location-waze");

    if (!modal) return;

    const superficie = Number(parcela.tamano || parcela.superficie || 0).toLocaleString("es-CL");
    if (title) title.textContent = parcela.nombre || "Ubicación de parcela";
    if (subtitle) subtitle.textContent = `${parcela.comuna || "Chile"} · ${superficie} m²`;
    if (name) name.textContent = parcela.nombre || "Parcela seleccionada";
    if (meta) meta.textContent = `${parcela.comuna || "Chile"} · ${superficie} m² · ${parcela.precio || "Consultar"}`;
    if (distance) distance.textContent = "Activa tu ubicación para calcular distancia.";
    if (directions) directions.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(parcela.lat + "," + parcela.lng)}`;
    if (waze) waze.href = `https://waze.com/ul?ll=${encodeURIComponent(parcela.lat + "," + parcela.lng)}&navigate=yes`;
    if (detail) detail.href = `parcela.html?id=${encodeURIComponent(parcela.id)}`;

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("tpl-location-open");

    ensureLocationModalMap(parcela);
    setLocationLayer("satellite");
    setTimeout(() => locationModalMap?.invalidateSize(), 220);
  }

  function closeLocationModal() {
    const modal = document.getElementById("tpl-location-modal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("tpl-location-open");
    if (locationModalMap) {
      try { locationModalMap.closePopup(); } catch (err) {}
    }
  }

  function activateUserLocationForModal() {
    if (!locationCurrentParcela || !navigator.geolocation) {
      showFriendlyMessage("Tu navegador no permite obtener ubicación o la parcela no tiene coordenadas.");
      return;
    }

    const distanceBox = document.getElementById("tpl-location-distance");
    if (distanceBox) distanceBox.textContent = "Buscando tu ubicación...";

    navigator.geolocation.getCurrentPosition(pos => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;
      const pLat = Number(locationCurrentParcela.lat);
      const pLng = Number(locationCurrentParcela.lng);
      const km = distanceKm(userLat, userLng, pLat, pLng);
      const mins = Math.max(1, Math.round((km / 55) * 60));

      if (locationModalMap) {
        if (locationUserMarker) locationModalMap.removeLayer(locationUserMarker);
        if (locationRouteLine) locationModalMap.removeLayer(locationRouteLine);

        locationUserMarker = L.marker([userLat, userLng], {
          icon: L.divIcon({
            className: "tpl-location-user-pin",
            html: "<span></span>",
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })
        }).addTo(locationModalMap);

        locationRouteLine = L.polyline([[userLat, userLng], [pLat, pLng]], {
          color: "#00828a",
          weight: 4,
          opacity: 0.75,
          dashArray: "8 8"
        }).addTo(locationModalMap);

        locationModalMap.fitBounds([[userLat, userLng], [pLat, pLng]], { padding: [40, 40] });
      }

      if (distanceBox) {
        distanceBox.innerHTML = `<strong>${km.toFixed(1)} km aprox.</strong><span>Estimación en vehículo: ${mins} min</span>`;
      }
    }, () => {
      if (distanceBox) distanceBox.textContent = "No se pudo activar tu ubicación. Puedes usar “Cómo llegar”.";
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });
  }


  window.openLocationModal = openLocationModal;
  window.closeLocationModal = closeLocationModal;
  window.setLocationLayer = setLocationLayer;
  window.activateUserLocationForModal = activateUserLocationForModal;


  function renderProjectPromos() {
    const grid = document.getElementById("promos-grid");
    if (!grid) return;

    const parcelasList = getAllParcelas()
      .filter(p => p && p.id && parseClp(p.precio) > 0)
      .slice()
      .sort((a, b) => parseClp(a.precio) - parseClp(b.precio))
      .slice(0, 10);

    const casasList = getAllCasas()
      .filter(c => c && c.id && Number(c.valorCasa || c.precio || 0) > 0)
      .slice()
      .sort((a, b) => Number(a.valorCasa || a.precio || 0) - Number(b.valorCasa || b.precio || 0))
      .slice(0, 10);

    if (!parcelasList.length || !casasList.length) return;

    const promos = [];
    parcelasList.forEach(p => {
      casasList.forEach(c => {
        const houseVal = Number(c.valorCasa || c.precio || 0);
        const total = parseClp(p.precio) + houseVal + getFundacionValue(getCheapestFundacion(), c);
        promos.push({ p, c, total });
      });
    });

    const used = new Set();
    const picks = promos
      .sort((a, b) => a.total - b.total)
      .filter(item => {
        const key = `${item.p.id}-${item.c.id}`;
        if (used.has(key)) return false;
        used.add(key);
        return true;
      })
      .slice(0, 5);

    const promoThemes = ["orange", "teal", "blue", "green", "gold"];
    const promoTags = ["Oferta inicial", "Casa + terreno", "Precio oportunidad", "Proyecto familiar", "Más completo"];
    const promoSubTags = ["LOW PRICE", "READY TO QUOTE", "HOT DEAL", "BEST VALUE", "FULL PROJECT"];

    grid.innerHTML = "";
    picks.forEach((item, index) => {
      const p = item.p;
      const c = item.c;
      const landVal = parseClp(p.precio);
      const houseVal = Number(c.valorCasa || c.precio || 0);
      const m2 = getParcelaM2(p);
      const card = document.createElement("article");
      card.className = `promo-card-v2 promo-card-modern promo-gringo promo-theme-${promoThemes[index]}`;
      card.innerHTML = `
        <div class="promo-photo" style="background-image:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,43,82,.88)),url('${getParcelaMainImage(p)}')">
          <span class="promo-chip">${promoTags[index]}</span>
          <span class="promo-us-tag">${promoSubTags[index]}</span>
          <strong>${p.comuna || p.nombre || "Proyecto"}</strong>
        </div>
        <div class="promo-body">
          <div class="promo-index">PROMO ${index + 1}</div>
          <h3>${p.nombre || "Parcela seleccionada"} + ${c.nombre || "Casa"}</h3>
          <p>${m2.toLocaleString("es-CL")} m² de terreno · ${c.habitaciones || c.dormitorios || "-"} hab · ${c.metros || c.m2 || "-"} m² construidos.</p>
          <div class="promo-mini-grid">
            <span><b>Parcela</b>${p.precio || money(landVal)}</span>
            <span><b>Casa</b>${money(houseVal)}</span>
          </div>
          <div class="promo-price-wrap">
            <small>Desde</small>
            <div class="promo-price">${money(item.total)}</div>
          </div>
          <div class="promo-actions-row">
            <button type="button" class="promo-cta-button">Cotizar proyecto</button>
            <button type="button" class="promo-location-button">Ver ubicación</button>
          </div>
        </div>`;
      card.addEventListener("click", (ev) => {
        if (ev.target.closest(".promo-location-button")) return;
        window.TPLSelectProyectoListo(p.id, c.id);
      });
      card.querySelector(".promo-cta-button")?.addEventListener("click", (ev) => {
        ev.stopPropagation();
        window.TPLSelectProyectoListo(p.id, c.id);
      });
      card.querySelector(".promo-location-button")?.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openLocationModal(p);
      });
      grid.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
  }

  document.getElementById("share-project-btn")?.addEventListener("click", () => {
    if (!state.selectedParcela) return;
    const shareUrl = window.location.href.split('?')[0] + `?selectParcela=${state.selectedParcela.id}` + (state.selectedCasa ? `&selectCasa=${state.selectedCasa.id}` : '');
    const shareText = "Te quiero enseñar esta parcela, dime qué te parece";
    
    if (navigator.share) {
      navigator.share({
        title: 'Tu Parcela Lista - Proyecto',
        text: shareText,
        url: shareUrl
      }).catch(console.error);
    } else {
      // Fallback a WhatsApp Web/App
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
      window.open(waUrl, '_blank');
    }
  });

  function hydrateFromUrlOrStorage() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get("flow") === "success") {
      showFriendlyMessage("¡Pago de reserva exitoso! Tu cotización ha sido confirmada y nos pondremos en contacto contigo.", "Reserva Confirmada");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const preselectId = params.get("selectParcela") || localStorage.getItem("selectedParcelaId");
    const preselectCasaId = params.get("selectCasa") || localStorage.getItem("selectedCasaId");
    if (preselectId) {
      const p = getAllParcelas().find(x => String(x.id) === String(preselectId));
      if (p) {
        state.selectedParcela = p;
        localStorage.setItem("selectedParcelaId", p.id);
        localStorage.setItem("selectedParcelaData", JSON.stringify(p));
        DOM.casasSection?.classList.add("active");
        if (params.get("selectParcela")) setTimeout(() => scrollTo(DOM.casasSection), 250);
      }
    }
    if (preselectCasaId) {
      const c = getAllCasas().find(x => String(x.id) === String(preselectCasaId));
      if (c) {
        state.selectedCasa = c;
        if (state.installationService) state.selectedFundacion = getCheapestFundacion();
        localStorage.setItem("selectedCasaId", c.id);
        localStorage.setItem("selectedCasaData", JSON.stringify(c));
        DOM.casasSection?.classList.add("active");
        DOM.cotizadorSection?.classList.add("active");
        if (params.get("selectCasa")) setTimeout(() => scrollTo(DOM.cotizadorSection), 350);
      }
    }
    if (window.location.hash === "#cotizador-section" && state.selectedParcela) {
      DOM.casasSection?.classList.add("active");
      if (state.selectedCasa) DOM.cotizadorSection?.classList.add("active");
      setTimeout(() => scrollTo(state.selectedCasa ? DOM.cotizadorSection : DOM.casasSection), 450);
    }
  }

  window.TPLSelectProyectoListo = function(parcelaId, casaId) {
    const p = getAllParcelas().find(x => String(x.id) === String(parcelaId));
    const c = getAllCasas().find(x => String(x.id) === String(casaId));
    if (!p || !c) {
      showFriendlyMessage("No pudimos cargar este proyecto. Revisa que la parcela y la casa existan en los archivos de datos.");
      return;
    }
    if (state.installationService) state.selectedFundacion = getCheapestFundacion();
    selectParcela(p);
    selectCasa(c);
    DOM.casasSection?.classList.add("active");
    DOM.cotizadorSection?.classList.add("active");
    renderCasas();
    renderFundaciones();
    updateCotizacionSummary();
    scrollTo(DOM.cotizadorSection);
  };


  window.TPLUpdateCotizadorFromSelection = function(options = {}) {
    const parcelaId = localStorage.getItem("selectedParcelaId");
    const casaId = localStorage.getItem("selectedCasaId");

    if (parcelaId) {
      const p = getAllParcelas().find(x => String(x.id) === String(parcelaId));
      if (p) state.selectedParcela = p;
      else {
        try { state.selectedParcela = JSON.parse(localStorage.getItem("selectedParcelaData") || "null") || state.selectedParcela; } catch(e) {}
      }
    }
    if (casaId) {
      const c = getAllCasas().find(x => String(x.id) === String(casaId));
      if (c) state.selectedCasa = c;
      else {
        try { state.selectedCasa = JSON.parse(localStorage.getItem("selectedCasaData") || "null") || state.selectedCasa; } catch(e) {}
      }
    }

    if (localStorage.getItem("tplComboAutoInstallation") === "si") state.installationService = true;
    if (state.installationService && !state.selectedFundacion) state.selectedFundacion = getCheapestFundacion();

    DOM.cotizadorSection?.classList.add("active");
    if (state.selectedCasa) DOM.casasSection?.classList.add("active");
    renderCasas();
    renderFundaciones();
    renderExtras();
    updateCotizacionSummary();
    ensurePreviewActionButtons();
    if (window.lucide) lucide.createIcons();
    if (options.scroll) setTimeout(() => scrollTo(DOM.cotizadorSection), 120);
  };

  window.addEventListener("tpl:combo-selected", (event) => {
    if (event.detail?.parcela) state.selectedParcela = event.detail.parcela;
    if (event.detail?.casa) state.selectedCasa = event.detail.casa;
    window.TPLUpdateCotizadorFromSelection({ scroll: false });
  });

  populateComunas();
  addMapToolbarButtons();
  
  if (typeof window.apiGetParcelas === 'function') {
    window.apiGetParcelas().then(data => {
      window.SERVER_PARCELAS = data;
      hydrateFromUrlOrStorage();
      renderParcelas();
      populateComunas(); 
    });
  } else {
    hydrateFromUrlOrStorage();
    renderParcelas();
  }
  renderCasas();
  renderFundaciones();
  renderExtras();
  renderProjectPromos();
  updateCotizacionSummary();
  ensurePreviewActionButtons();
  setupEvents();
  
  // Location Filter Bar Logic
  const locBar = document.querySelector(".location-filter-bar");
  if (locBar) {
    locBar.addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      
      const type = btn.dataset.filterType;
      const val = btn.dataset.value;
      
      // Update UI active states
      locBar.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      // Reset other location filters
      state.activeFilters.commune = "all";
      state.activeFilters.region = "all";
      
      if (type === "region") {
        state.activeFilters.region = val;
      } else if (type === "commune") {
        state.activeFilters.commune = val;
      }
      
      // Trigger refresh and scroll
      refresh();
      const parcelasSec = document.getElementById("parcelas-container");
      if (parcelasSec) {
        const headerOffset = 140;
        const elementPosition = parcelasSec.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
             top: offsetPosition,
             behavior: "smooth"
        });
      }
    });
  }

  
  // View Switchers
  const switchers = document.querySelectorAll('.view-switcher');
  switchers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      switchers.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      const grid = document.getElementById('parcelas-container');
      if (grid) {
        grid.className = 'parcelas-grid view-' + view;
      }
    });
  });

  // Hover Grid -> Map
  document.addEventListener('mouseover', e => {
    const card = e.target.closest('.card-parcela-v5');
    if (card && window.mapMarkers && !DOM.mapLayout?.classList.contains('map-hidden')) {
      const id = card.dataset.id;
      if (window.mapMarkers[id]) {
        window.mapMarkers[id].openPopup();
      }
    }
  });

  // Store markers in renderMapa
  window.mapMarkers = {};

if (window.lucide) lucide.createIcons();
});


/* TPL producción: garantiza que Parcelas y Casas estén disponibles
   incluso al abrir un enlace compartido, restaurar caché o navegar desde móvil. */
(function ensurePublicSectionsAreAvailable(){
  const reveal = () => {
    document.body.classList.add("tpl-guided-revealed");
    document.body.classList.remove("tpl-guided-mode");
    const casas = document.getElementById("casas-section");
    if (casas) {
      casas.classList.add("active");
      casas.style.removeProperty("display");
      casas.style.removeProperty("opacity");
      casas.style.removeProperty("pointer-events");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reveal, { once:true });
  } else {
    reveal();
  }

  window.addEventListener("pageshow", reveal);

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href="#casas-section"], a[href$="index.html#casas-section"]');
    if (!link) return;
    reveal();
    requestAnimationFrame(() => {
      document.getElementById("casas-section")?.scrollIntoView({ behavior:"smooth", block:"start" });
    });
  });
})();

/* Respaldo global de imágenes: evita tarjetas vacías ante una ruta dañada. */
document.addEventListener('error', (event) => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.dataset.imageError = 'true';
  img.alt = img.alt || 'Imagen temporalmente no disponible';
  img.src = 'image/logo_compartir.png';
}, true);
