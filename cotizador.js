// cotizador.js - Premium client-side logic for Tu Parcela Lista Cotizador
// Handles selection of parcel and house from localStorage, rendering custom card UIs, and dynamic calculation.
/**
 * Utility to format numbers as Chilean Pesos (CLP) or general currency.
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(value);
}
/**
 * Utility to parse price string to number (e.g. "$13.658.000" -> 13658000)
 */
function parsePriceString(priceStr) {
  if (!priceStr) return 0;
  if (typeof priceStr === 'number') return priceStr;
  const clean = String(priceStr).replace(/[^0-9]/g, '');
  return parseInt(clean, 10) || 0;
}
/**
 * Safely retrieve the global parcelas array.
 */
function getParcelasArray() {
  if (typeof parcelas !== 'undefined') return parcelas;
  if (window.parcelas) return window.parcelas;
  return [];
}
/**
 * Safely retrieve the global casas array.
 */
function getCasasArray() {
  if (typeof casas !== 'undefined') return casas;
  if (window.casas) return window.casas;
  return [];
}
function getCasaPrice(casa) {
  return parsePriceString(casa?.valorCasa ?? casa?.precio ?? casa?.valor ?? 0);
}
function getCasaM2(casa) {
  return Number(casa?.metros ?? casa?.superficie ?? casa?.mt2 ?? casa?.area ?? 0) || 0;
}
function getParcelaM2(parcela) {
  return Number(parcela?.tamano ?? parcela?.superficie ?? parcela?.m2 ?? 0) || 0;
}
function estimatePerimeterFromM2(m2) {
  return m2 ? Math.ceil(Math.sqrt(Number(m2)) * 4) : 0;
}

const CONSTRUCTION_TYPES = [
  { id: 'madera_economica', nombre: 'Casa madera económica', valor: 270000, desc: 'Construcción en madera, cálida y de rápida ejecución.' },
  { id: 'metalcon_simple', nombre: 'Metalcon simple', valor: 370000, desc: 'Estructura galvanizada simple, moderna y resistente.' },
  { id: 'premium_madera_metalcon', nombre: 'Madera o Metalcon premium', valor: 420000, desc: 'Mejor aislación, terminaciones superiores y estándar premium.' },
  { id: 'cemento', nombre: 'Material cemento / sólido', valor: 720000, desc: 'Sistema sólido de mayor durabilidad y terminación robusta.' }
];

const HOUSE_REFERENCES = [
  { min: 0, max: 59, label: 'Compacta', desc: '1 a 2 dormitorios', className: 'house-small' },
  { min: 60, max: 109, label: 'Familiar', desc: '2 a 3 dormitorios', className: 'house-medium' },
  { min: 110, max: 9999, label: 'Campo Premium', desc: '4+ dormitorios', className: 'house-large' }
];
const PROJECT_STAGES = [
  { id:'estudio_suelo', title:'Estudio de suelo', icon:'clipboard-check', desc:'Revisión técnica inicial del terreno y recomendaciones de fundación.', fixed:100000 },
  { id:'diseno_arquitectura', title:'Diseño y anteproyecto', icon:'drafting-compass', desc:'Distribución junto al cliente, estilo, m² y ajustes funcionales.', weight:.06 },
  { id:'planimetria', title:'Planos técnicos', icon:'ruler', desc:'Planimetría, detalles técnicos y especificaciones para ejecutar.', weight:.04 },
  { id:'instalacion_faena', title:'Instalación de faena', icon:'hard-hat', desc:'Organización de obra, logística, acopio y preparación inicial.', weight:.04 },
  { id:'movimiento_tierra', title:'Preparación de terreno', icon:'tractor', desc:'Limpieza, trazado, niveles y preparación de superficie.', weight:.05 },
  { id:'fundaciones', title:'Fundaciones y radier', icon:'blocks', desc:'Base de apoyo de la vivienda según sistema constructivo.', weight:.12 },
  { id:'estructura', title:'Estructura principal', icon:'frame', desc:'Levantamiento de estructura, muros y soportes principales.', weight:.16 },
  { id:'techumbre', title:'Techumbre y cubierta', icon:'home', desc:'Cerchas, cubierta, aislación superior y evacuación de aguas.', weight:.10 },
  { id:'envolvente', title:'Muros y revestimientos exteriores', icon:'panel-top', desc:'Cerramientos, revestimientos y protección exterior.', weight:.10 },
  { id:'ventanas_puertas', title:'Ventanas y puertas', icon:'door-open', desc:'Instalación de vanos, puertas exteriores e interiores.', weight:.07 },
  { id:'instalaciones', title:'Instalaciones interiores', icon:'lightbulb', desc:'Redes interiores según estándar elegido y coordinación técnica.', weight:.10 },
  { id:'aislacion', title:'Aislación y humedad', icon:'shield-check', desc:'Barreras, aislantes y protección frente a clima y humedad.', weight:.06 },
  { id:'terminaciones', title:'Terminaciones', icon:'paintbrush-2', desc:'Revestimientos interiores, detalles, remates y terminación final.', weight:.15 },
  { id:'revision_entrega', title:'Revisión y entrega', icon:'badge-check', desc:'Control final, correcciones y entrega referencial del proyecto.', weight:.05 }
];
let selectedProjectStages = new Set();
const EXTRA_VISUAL_MAP = [
  { keys:['pintura'], className:'has-paint', label:'Pintura aplicada', icon:'brush' },
  { keys:['luz','electrica','eléctrica','electricidad'], className:'has-light', label:'Iluminación agregada', icon:'lightbulb' },
  { keys:['terraza'], className:'has-terrace', label:'Terraza agregada', icon:'sun' },
  { keys:['quincho'], className:'has-quincho', label:'Quincho agregado', icon:'flame' },
  { keys:['piscina'], className:'has-pool', label:'Piscina agregada', icon:'waves' },
  { keys:['cerco','cierre'], className:'has-fence', label:'Cerco agregado', icon:'fence' },
  { keys:['paisaj'], className:'has-landscape', label:'Paisajismo agregado', icon:'flower-2' },
  { keys:['estacionamiento'], className:'has-parking', label:'Estacionamiento agregado', icon:'car' },
  { keys:['bodega'], className:'has-storage', label:'Bodega agregada', icon:'warehouse' }
];
function getHouseReference(m2){
  return HOUSE_REFERENCES.find(r => m2 >= r.min && m2 <= r.max) || HOUSE_REFERENCES[1];
}
function getSelectedExtraVisuals(){
  const active = [];
  document.querySelectorAll('#opcionales-container .extra-check:checked').forEach(chk => {
    const extra = window.extrasOpcionales?.find(item => item.id === chk.dataset.id);
    const name = String(extra?.nombre || extra?.id || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    EXTRA_VISUAL_MAP.forEach(v => {
      if (!active.some(a => a.className === v.className) && v.keys.some(k => name.includes(k))) active.push(v);
    });
  });
  return active;
}
function renderProjectVisualizer(){
  const visual = document.getElementById('project-visualizer');
  const stages = document.getElementById('construction-stages-grid');
  if (!visual || !stages) return;
  const construction = getSelectedConstruction();
  const m2 = getBuildM2();
  const rooms = getBuildRooms();
  const ref = getHouseReference(m2);
  const extras = getSelectedExtraVisuals();
  const extraClasses = extras.map(e => e.className).join(' ');
  visual.className = `architecture-visualizer ${construction.id} ${ref.className} ${extraClasses}`;
  visual.innerHTML = `
    <div class="visual-sky"><span></span><span></span><span></span></div>
    <div class="visual-mountains"></div>
    <div class="visual-field"></div>
    <div class="visual-path"></div>
    <div class="visual-foundation"></div>
    <div class="visual-house">
      <div class="visual-roof"><span></span></div>
      <div class="visual-body">
        <span class="window w1"></span>
        <span class="door"></span>
        <span class="window w2"></span>
        <span class="window w3"></span>
        <span class="siding-lines"></span>
      </div>
      <div class="visual-deck"></div>
      <div class="paint-roller"><i data-lucide="brush"></i></div>
      <div class="light-bulb"><i data-lucide="lightbulb"></i></div>
    </div>
    <div class="visual-pool"></div>
    <div class="visual-fence"></div>
    <div class="visual-terrace"><i data-lucide="sun"></i></div>
    <div class="visual-quincho"><i data-lucide="flame"></i></div>
    <div class="visual-parking"><i data-lucide="car"></i></div>
    <div class="visual-storage"><i data-lucide="warehouse"></i></div>
    <div class="visual-landscape"><i data-lucide="flower-2"></i></div>
    <div class="visual-info-card">
      <strong>${construction.nombre}</strong>
      <span>${m2} m² • ${rooms} habitación(es) • referencia ${ref.label}</span>
      <small>${ref.desc}</small>
    </div>
    <div class="visual-tags">${extras.length ? extras.map(e => `<span><i data-lucide="${e.icon}"></i>${e.label}</span>`).join('') : '<span><i data-lucide="sparkles"></i>Visualizador base del proyecto</span>'}</div>
  `;
  stages.innerHTML = PROJECT_STAGES.map((stage, i) => {
    const selected = selectedProjectStages.has(stage.id);
    const price = getStageCost(stage);
    return `<button type="button" class="stage-card stage-button ${selected ? 'done active selected' : ''}" data-stage-id="${stage.id}">
      <div class="stage-number">${String(i + 1).padStart(2,'0')}</div>
      <div class="stage-icon"><i data-lucide="${stage.icon}"></i></div>
      <h4>${stage.title}</h4>
      <p>${stage.desc}</p>
      <strong class="stage-price">${formatCurrency(price)}</strong>
      <small>Presiona para ver costo acumulado</small>
      <div class="stage-bar"><span style="width:${Math.round(getStageProgressUntil(stage.id))}%"></span></div>
    </button>`;
  }).join('');
  stages.querySelectorAll('[data-stage-id]').forEach(btn => {
    btn.addEventListener('click', () => openStageCostModal(btn.dataset.stageId));
  });
  if (window.lucide) window.lucide.createIcons();
}
function getBuildM2(casa){
  const input = document.getElementById('build-m2');
  return Number(input?.value || getCasaM2(casa) || 36) || 36;
}
function getBuildRooms(casa){
  const input = document.getElementById('build-rooms');
  return Number(input?.value || casa?.habitaciones || casa?.dormitorios || 2) || 2;
}
function getSelectedConstruction(){
  const radio = document.querySelector('#fundaciones-container input[name="fundacion"]:checked');
  return CONSTRUCTION_TYPES.find(t => t.id === radio?.value) || CONSTRUCTION_TYPES[0];
}
function isWoodConstruction(){
  return getSelectedConstruction().id.includes('madera');
}
function getConstructionTotal(){
  return getBuildM2() * Number(getSelectedConstruction().valor || 0);
}
function getStageCost(stage){
  if (stage.fixed) return Number(stage.fixed);
  return Math.round(getConstructionTotal() * Number(stage.weight || 0));
}
function getStageIndex(stageId){
  return PROJECT_STAGES.findIndex(s => s.id === stageId);
}
function getStageCumulativeCost(stageId){
  const idx = getStageIndex(stageId);
  if (idx < 0) return 0;
  return PROJECT_STAGES.slice(0, idx + 1).reduce((sum, stage) => sum + getStageCost(stage), 0);
}
function getStageProgressUntil(stageId){
  const total = PROJECT_STAGES.reduce((sum, stage) => sum + getStageCost(stage), 0) || 1;
  return Math.min(100, (getStageCumulativeCost(stageId) / total) * 100);
}
function getSelectedStagesTotal(){
  return 0;
}
function openStageCostModal(stageId){
  const stage = PROJECT_STAGES.find(s => s.id === stageId);
  if (!stage) return;
  const modal = document.getElementById('stage-cost-modal');
  if (!modal) return;
  const construction = getSelectedConstruction();
  const m2 = getBuildM2();
  const cost = getStageCost(stage);
  const cumulative = getStageCumulativeCost(stageId);
  modal.querySelector('#stage-cost-title').textContent = stage.title;
  modal.querySelector('#stage-cost-desc').textContent = stage.desc;
  modal.querySelector('#stage-cost-current').textContent = formatCurrency(cost);
  modal.querySelector('#stage-cost-cumulative').textContent = formatCurrency(cumulative);
  modal.querySelector('#stage-cost-context').textContent = `${construction.nombre} • ${m2} m² • valor base ${formatCurrency(getConstructionTotal())}`;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden','false');
}
function closeStageCostModal(){
  const modal = document.getElementById('stage-cost-modal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden','true');
}

function getDefaultExtraQty(extra, parcela, casa) {
  const id = String(extra?.id || extra?.nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (id.includes('cierre') || id.includes('cerco') || id.includes('perimetral') || extra?.tipoCalculo2 === 'parcela') {
    return estimatePerimeterFromM2(getParcelaM2(parcela));
  }
  if (extra?.tipoCalculo === 'mt2' && extra?.tipoCalculo2 === 'casa') return getCasaM2(casa);
  return Number(extra?.defaultQty ?? 1) || 0;
}
/**
 * Render selected parcel and house details in the top selection info bar.
 */
function renderSelectionInfoBar(parcela, casa) {
  const container = document.getElementById('selection-info-bar');
  if (!container) return;

  const parcelaName = parcela ? (parcela.nombre || `Parcela ${parcela.id}`) : 'Ninguna parcela seleccionada';
  const parcelaSub = parcela ? `${parcela.comuna || ''} • ${parcela.tamano || parcela.superficie || '5.000'} m²` : 'Puedes cotizar tu casa y luego agregar parcela';
  const parcelaPrice = parcela ? formatCurrency(parsePriceString(parcela.precio)) : '-';
  const parcelaImg = parcela ? (parcela.imagen || parcela.imagenes?.[0] || 'image/placeholder-parcela.jpg') : 'image/placeholder-parcela.jpg';
  const parcelaLink = parcela ? `parcela.html?id=${encodeURIComponent(parcela.id)}&fromCotizador=1` : 'index.html#parcelas-anchor';

  const construction = getSelectedConstruction();
  const m2 = getBuildM2(casa);
  const rooms = getBuildRooms(casa);
  const casaPrice = formatCurrency(m2 * construction.valor);

  container.innerHTML = `
    <div class="selection-parcela-card">
      <a class="selection-parcela-photo" href="${parcelaLink}" title="Ver ficha de la parcela">
        <img src="${parcelaImg}" alt="${parcelaName}">
        <span>Ver ficha</span>
      </a>
      <div class="info-block">
        <span class="label"><i data-lucide="map-pin" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;color:var(--secondary);"></i> Parcela seleccionada</span>
        <span class="value">${parcelaName}</span>
        <span class="sub-value">${parcelaSub} • <strong>${parcelaPrice}</strong></span>
      </div>
    </div>

    <div class="info-block selection-build-card">
      <span class="label"><i data-lucide="home" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;color:var(--primary);"></i> Casa personalizada</span>
      <span class="value">Diseño propio desde cero</span>
      <span class="sub-value">${m2} m² • ${rooms} habitación(es) • ${construction.nombre}</span>
      <strong class="selection-build-price">${casaPrice}</strong>
    </div>

    <div class="change-parcela-btn-container">
      <button id="btn-change-parcela" type="button">
        <i data-lucide="map"></i>
        <span>Cambiar parcela</span>
      </button>
      <small>Volverás al listado y podrás agregar otra parcela al cotizador.</small>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  document.getElementById('btn-change-parcela')?.addEventListener('click', () => {
    localStorage.setItem('tplReturnToCotizadorDesign', '1');
    localStorage.removeItem('selectedParcelaId');
    window.location.href = 'index.html#parcelas-anchor';
  });
}

/**
 * Render foundation options as selectable premium cards.
 */
function renderFundaciones() {
  const container = document.getElementById('fundaciones-container');
  if (!container) return;
  const html = CONSTRUCTION_TYPES.map((f, index) => {
    const isSelected = index === 0 ? 'selected' : '';
    const isChecked = index === 0 ? 'checked' : '';
    return `
      <div class="fundacion-card-premium ${isSelected}" data-id="${f.id}">
        <input type="radio" name="fundacion" value="${f.id}" data-valor="${f.valor}" ${isChecked} style="pointer-events: none;" />
        <span class="fundacion-card-title">${f.nombre}</span>
        <span class="fundacion-card-price">${formatCurrency(f.valor)} <span>/ m²</span></span>
        <span style="display:block;margin-top:8px;font-size:.78rem;color:var(--text-muted);line-height:1.35;">${f.desc}</span>
      </div>
    `;
  }).join('');
  container.innerHTML = html;
  const storedCasaId = localStorage.getItem('selectedCasaId');
  const casa = getCasasArray().find(c => String(c.id) === storedCasaId);
  const m2Input = document.getElementById('build-m2');
  const roomsInput = document.getElementById('build-rooms');
  if (m2Input && (!m2Input.value || Number(m2Input.value) === 36)) m2Input.value = getCasaM2(casa) || 36;
  if (roomsInput && (!roomsInput.value || Number(roomsInput.value) === 2)) roomsInput.value = casa?.habitaciones || casa?.dormitorios || 2;
  [m2Input, roomsInput].forEach(input => input?.addEventListener('input', () => { updateSummary(); renderProjectVisualizer(); renderSelectionInfoBar(getParcelasArray().find(p => String(p.id) === localStorage.getItem('selectedParcelaId')), casa); }));
  const cards = container.querySelectorAll('.fundacion-card-premium');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        selectedProjectStages.clear();
        renderExtrasOpcionales();
        updateSummary();
        renderProjectVisualizer();
        renderSelectionInfoBar(getParcelasArray().find(p => String(p.id) === localStorage.getItem('selectedParcelaId')), casa);
      }
    });
  });
}
/**
 * Render optional extras as premium selectable row cards.
 */
function renderExtrasOpcionales() {
  const container = document.getElementById('opcionales-container');
  if (!container || typeof window.extrasOpcionales === 'undefined') return;
  const storedId = localStorage.getItem('selectedParcelaId');
  const storedCasaId = localStorage.getItem('selectedCasaId');
  const parcela = getParcelasArray().find(p => String(p.id) === storedId);
  const casa = getCasasArray().find(c => String(c.id) === storedCasaId);
  const extrasFiltrados = window.extrasOpcionales.filter(e => {
    if (isWoodConstruction()) return true;
    const name = String(`${e.id || ''} ${e.nombre || ''}`).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return !(name.includes('electrica') || name.includes('electricidad') || name.includes('pintura') || name.includes('ceramico') || name.includes('ceramica') || name.includes('piso'));
  });
  const html = extrasFiltrados.map(e => {
    const defaultQty = getDefaultExtraQty(e, parcela, casa);
    const min = e.minQty ?? 1;
    const max = e.maxQty ?? 9999;
    
    // Define label according to type
    let priceLabel = '';
    if (e.tipoCalculo === 'mt2') {
      priceLabel = `${formatCurrency(e.valor)} / m²`;
    } else if (e.tipoCalculo === 'metro') {
      priceLabel = `${formatCurrency(e.valor)} / metro`;
    } else {
      priceLabel = `${formatCurrency(e.valor)} c/u`;
    }
    // Qty input if needed
    const showQty = true;
    const qtyInputHtml = showQty ? `
      <div class="qty-control-wrapper" style="pointer-events: auto;">
        <input type="number" class="extra-qty" data-id="${e.id}" min="${min}" max="${max}" value="${defaultQty}" />
      </div>
    ` : `<span class="badge-highlight">Calculado por m²</span>`;
    return `
      <div class="extra-card-premium" data-id="${e.id}">
        <input type="checkbox" class="extra-check" data-id="${e.id}" data-valor="${e.valor}" data-tipo="${e.tipoCalculo}" style="pointer-events: none;" />
        <div class="extra-info-group">
          <span class="extra-card-title">${e.nombre}</span>
          <span class="extra-card-desc">${e.descripcion || 'Servicio e instalación garantizada'}</span>
        </div>
        <div style="display:flex; align-items:center; gap:1.25rem;">
          <span class="extra-card-price">${priceLabel}</span>
          ${qtyInputHtml}
        </div>
      </div>
    `;
  }).join('');
  container.innerHTML = html;
  // Add click listeners to cards to handle checkbox toggling
  const cards = container.querySelectorAll('.extra-card-premium');
  cards.forEach(card => {
    card.addEventListener('click', (event) => {
      // If clicking inside the qty number input, don't toggle the checkbox
      if (event.target.classList.contains('extra-qty')) {
        return;
      }
      const chk = card.querySelector('input[type="checkbox"]');
      if (chk) {
        chk.checked = !chk.checked;
        if (chk.checked) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
        updateSummary();
        renderProjectVisualizer();
      }
    });
    // Listen to changes in quantity inputs directly
    const qtyInput = card.querySelector('.extra-qty');
    if (qtyInput) {
      qtyInput.addEventListener('input', () => {
        // Automatically check the item if quantity is modified
        const chk = card.querySelector('input[type="checkbox"]');
        if (chk && !chk.checked) {
          chk.checked = true;
          card.classList.add('selected');
        }
        updateSummary();
        renderProjectVisualizer();
      });
    }
  });
}
/**
 * Calculate total values.
 */
function calculateTotal() {
  const storedId = localStorage.getItem('selectedParcelaId');
  const storedCasaId = localStorage.getItem('selectedCasaId');
  const targetParcelas = getParcelasArray();
  const parcela = targetParcelas.find(p => String(p.id) === storedId);
  // Terreno opcional: este cotizador también funciona para diseño propio sin parcela seleccionada.
  let total = parcela ? parsePriceString(parcela.precio) : 0;
  // Selected House Cost
  let houseArea = 0;
  const targetCasas = getCasasArray();
  const casa = targetCasas.find(c => String(c.id) === storedCasaId);
  if (casa) {
    houseArea = getCasaM2(casa);
  }
  // Valor de construcción: siempre suma m² x sistema constructivo seleccionado.
  total += getConstructionTotal();
  // Optional Extras Cost
  const extraChecks = document.querySelectorAll('#opcionales-container .extra-check');
  extraChecks.forEach(chk => {
    if (chk.checked) {
      const valor = Number(chk.dataset.valor);
      const tipo = chk.dataset.tipo;
      let qty = 1;
      const qtyInput = document.querySelector(`.extra-qty[data-id="${chk.dataset.id}"]`);
      if (qtyInput) qty = Number(qtyInput.value) || 0;
      else if (tipo === 'mt2') qty = getBuildM2(casa);
      total += valor * qty;
    }
  });

  // Upsells IA y ParcelaTur
  document.querySelectorAll('.extra-check-upsell:checked').forEach(chk => {
    total += Number(chk.dataset.price) || 0;
  });

  return total;
}
/**
 * Update summary table rows and final total projection.
 */
function updateSummary() {
  const tbody = document.getElementById('summary-items');
  const totalSpan = document.getElementById('total-amount');
  if (!tbody || !totalSpan) return;
  // Clean summary items
  tbody.innerHTML = '';
  const storedId = localStorage.getItem('selectedParcelaId');
  const storedCasaId = localStorage.getItem('selectedCasaId');
  const targetParcelas = getParcelasArray();
  const parcela = targetParcelas.find(p => String(p.id) === storedId);
  // 1. Terreno opcional
  if (parcela) {
    const terrainCost = parsePriceString(parcela.precio);
    const size = parcela.tamano || parcela.superficie || '5.000';
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>
          <div class="summary-item-name">Terreno ${parcela.nombre || parcela.id}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Superficie de ${size} m²</div>
        </td>
        <td class="summary-item-value">${formatCurrency(terrainCost)}</td>
      </tr>
    `);
  } else {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>
          <div class="summary-item-name">Terreno por definir</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Cotización de casa propia independiente de parcela.</div>
        </td>
        <td class="summary-item-value">$0</td>
      </tr>
    `);
  }
  // 2. Diseño propio: no se muestra ninguna casa de catálogo.
  const targetCasas = getCasasArray();
  const casa = targetCasas.find(c => String(c.id) === storedCasaId);
  const f = getSelectedConstruction();
  const buildM2 = getBuildM2(casa);
  const rooms = getBuildRooms(casa);
  // 3. Valor base de construcción: sí entra al total final.
  tbody.insertAdjacentHTML('beforeend', `
    <tr>
      <td>
        <div class="summary-item-name">Construcción ${f.nombre}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${buildM2} m² × ${formatCurrency(f.valor)} / m² • ${rooms} habitación(es)</div>
      </td>
      <td class="summary-item-value">${formatCurrency(getConstructionTotal())}</td>
    </tr>
    <tr>
      <td>
        <div class="summary-item-name">Etapas del proyecto</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">Las etapas son informativas: al pinchar cada botón se muestra el costo de esa parte y el acumulado, sin duplicar el total.</div>
      </td>
      <td class="summary-item-value">Informativo</td>
    </tr>
  `);
  // 4. Extras Rows
  const extraChecks = document.querySelectorAll('#opcionales-container .extra-check');
  extraChecks.forEach(chk => {
    if (chk.checked) {
      const e = window.extrasOpcionales?.find(item => item.id === chk.dataset.id);
      if (!e) return;
      
      const tipo = e.tipoCalculo;
      let qty = 1;
      let qtyLabel = '';
      if (tipo === 'mt2') {
        qty = getBuildM2(casa);
        qtyLabel = `${qty} m²`;
      } else {
        const qtyInput = document.querySelector(`.extra-qty[data-id="${e.id}"]`);
        qty = Number(qtyInput ? qtyInput.value : 1) || 0;
        qtyLabel = `${qty} ${tipo === 'metro' ? 'metros' : 'unidades'}`;
      }
      const extraCost = e.valor * qty;
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>
            <div class="summary-item-name">${e.nombre}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${qtyLabel} × ${formatCurrency(e.valor)}</div>
          </td>
          <td class="summary-item-value">${formatCurrency(extraCost)}</td>
        </tr>
      `);
    }
  });

  // Upsells IA y ParcelaTur render
  document.querySelectorAll('.extra-check-upsell:checked').forEach(chk => {
    const upsellName = chk.dataset.name;
    const upsellPrice = Number(chk.dataset.price) || 0;
    if (upsellPrice > 0) {
       tbody.insertAdjacentHTML('beforeend', `
         <tr>
           <td>
             <div class="summary-item-name" style="color:#4f46e5;"><i data-lucide="sparkles" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> ${upsellName}</div>
             <div style="font-size:0.75rem;color:var(--text-muted);">Servicio Digital</div>
           </td>
           <td class="summary-item-value" style="color:#4f46e5;">${formatCurrency(upsellPrice)}</td>
         </tr>`);
    } else {
       tbody.insertAdjacentHTML('beforeend', `
         <tr>
           <td>
             <div class="summary-item-name" style="color:#059669;"><i data-lucide="key" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> ${upsellName}</div>
             <div style="font-size:0.75rem;color:var(--text-muted);">Servicio Administrativo</div>
           </td>
           <td class="summary-item-value" style="color:#059669;">Gratis</td>
         </tr>`);
    }
  });

  if (window.lucide) window.lucide.createIcons();

  // Calculate final total project cost
  const total = calculateTotal();
  totalSpan.textContent = formatCurrency(total);
  
  // Guardamos resumen global para API
  window.activeUpsells = Array.from(document.querySelectorAll('.extra-check-upsell:checked')).map(chk => ({
    nombre: chk.dataset.name,
    valor: Number(chk.dataset.price) || 0
  }));
}
/**
 * Initialize Cotizador Page setup.
 */
function initCotizador() {
  const storedId = localStorage.getItem('selectedParcelaId');
  const storedCasaId = localStorage.getItem('selectedCasaId');
  if (false && !storedId) {
    const errorMsg = `
      <div style="text-align:center; padding:3rem 1.5rem; background:#fff; border-radius:16px; border:1px solid #fee2e2; max-width:600px; margin:2rem auto; box-shadow:var(--shadow-premium);">
        <i data-lucide="alert-circle" style="width:48px; height:48px; color:#ef4444; margin-bottom:1rem;"></i>
        <h2 style="color:#ef4444; margin:0 0 0.75rem 0; font-weight:800;">Parcela no seleccionada</h2>
        <p style="color:var(--text-muted); margin-bottom:1.5rem;">Para realizar una cotización de proyecto, primero debes seleccionar un terreno agrícola en el catálogo de parcelas.</p>
        <a href="index.html" class="btn-whatsapp-quote" style="display:inline-flex; width:auto; text-decoration:none; background:var(--primary);">
          <i data-lucide="arrow-left"></i> Volver a Selección de Parcelas
        </a>
      </div>
    `;
    const section = document.getElementById('cotizador-page');
    if (section) {
      section.innerHTML = `<div class="container">${errorMsg}</div>`;
      if (window.lucide) window.lucide.createIcons();
    }
    return;
  }
  // Load objects
  const targetParcelas = getParcelasArray();
  const parcela = targetParcelas.find(p => String(p.id) === storedId);
  const targetCasas = getCasasArray();
  const casa = targetCasas.find(c => String(c.id) === storedCasaId);
  if (false && !parcela) {
    document.getElementById('cotizador-page').innerHTML = `
      <div class="container" style="text-align:center; padding:3rem 0;">
        <i data-lucide="alert-triangle" style="width:48px; height:48px; color:#f59e0b; margin-bottom:1rem;"></i>
        <h2 style="margin:0 0 0.5rem 0;">No se encontró el terreno</h2>
        <p style="color:var(--text-muted); margin-bottom:1.5rem;">No pudimos encontrar la parcela con ID "${storedId}" en nuestro registro de parcelas agrícolas.</p>
        <a href="index.html" style="color:var(--primary); font-weight:700; text-decoration:none;"><i data-lucide="arrow-left" style="width:14px;height:14px;vertical-align:middle;"></i> Volver a Inicio</a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  // 1. Render Configurators
  renderFundaciones();
  renderExtrasOpcionales();
  // 2. Render Top Info Header y visualizador
  renderSelectionInfoBar(parcela, casa);
  renderProjectVisualizer();
  // 3. Initial Summary Table
  updateSummary();

  // 3.5. Upsell Checkbox Listeners
  document.querySelectorAll('.extra-check-upsell').forEach(chk => {
     chk.addEventListener('change', () => {
         // Lógica combo
         if (chk.id === 'upsell-ai-combo' && chk.checked) {
            const el1 = document.getElementById('upsell-ai-foto');
            const el2 = document.getElementById('upsell-ai-video');
            if(el1) el1.checked = false;
            if(el2) el2.checked = false;
         } else if ((chk.id === 'upsell-ai-foto' || chk.id === 'upsell-ai-video') && chk.checked) {
            const combo = document.getElementById('upsell-ai-combo');
            if(combo) combo.checked = false;
         }
         updateSummary();
     });
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-stage-modal]')) closeStageCostModal();
  });
  // 4. WhatsApp Button Generator
  const whatsappBtn = document.getElementById('whatsapp-btn');
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const total = calculateTotal();
      
      // Build details text from summary items in a readable format
      let detailsText = '';
      
      // Terrain detail
      const size = parcela.tamano || parcela.superficie || '5.000';
      detailsText += `• Terreno: ${parcela.nombre || parcela.id} (${size} m²) - ${formatCurrency(parsePriceString(parcela.precio))}\n`;
      
      // House detail
      if (casa) {
        detailsText += `• Diseño propio: se usó ${getCasaM2(casa)} m² como referencia inicial\n`;
      } else {
        detailsText += `• Diseño propio: casa personalizada desde cero\n`;
      }
      
      // Construction detail
      const f = getSelectedConstruction();
      const area = getBuildM2(casa);
      const rooms = getBuildRooms(casa);
      detailsText += `• Construcción: ${f.nombre} (${area} m², ${rooms} habitación/es, radier base incluido) - ${formatCurrency(area * f.valor)}\n`;
      
      // Extras detail
      const extraChecks = document.querySelectorAll('#opcionales-container .extra-check');
      let extrasAdded = false;
      extraChecks.forEach(chk => {
        if (chk.checked) {
          const e = window.extrasOpcionales?.find(item => item.id === chk.dataset.id);
          if (e) {
            if (!extrasAdded) {
              detailsText += `• Adicionales:\n`;
              extrasAdded = true;
            }
            const tipo = e.tipoCalculo;
            let qty = 1;
            const qtyInput = document.querySelector(`.extra-qty[data-id="${e.id}"]`);
            qty = Number(qtyInput ? qtyInput.value : getDefaultExtraQty(e, parcela, casa)) || 0;
            detailsText += `  - ${e.nombre} (${qty} ${tipo === 'mt2' ? 'm²' : tipo === 'metro' ? 'mts' : 'u'}): ${formatCurrency(e.valor * qty)}\n`;
          }
        }
      });
      const message = encodeURIComponent(
        `¡Hola Tu Parcela Lista! Deseo reservar el siguiente proyecto cotizado:\n\n` +
        `🏡 DETALLE DEL PROYECTO:\n` +
        detailsText +
        `\n💰 TOTAL ESTIMADO NETO: ${formatCurrency(total)}\n\n` +
        `Por favor, contactar con un ejecutivo para coordinar reserva de terreno y firma de contrato.`
      );
      
      // Redirect to WhatsApp
      const url = `https://wa.me/56988508361?text=${message}`; // Replace with corporate WhatsApp number
      window.open(url, '_blank');
    });
  }
}
// Execute setup once page content has fully loaded
document.addEventListener('DOMContentLoaded', initCotizador);
// =====================================================
// Activar proyecto: genera PDF local y prepara correo
// Nota: desde un sitio estático no se puede adjuntar/enviar email automáticamente sin backend.
// Se genera el PDF para descargar y se abre el correo con copia al cliente.
// =====================================================
function buildQuotePlainText(client = {}) {
  const storedId = localStorage.getItem('selectedParcelaId');
  const storedCasaId = localStorage.getItem('selectedCasaId');
  const parcela = getParcelasArray().find(p => String(p.id) === storedId);
  const casa = getCasasArray().find(c => String(c.id) === storedCasaId);
  const total = calculateTotal();
  const rows = [...document.querySelectorAll('#summary-items tr')].map(tr => tr.innerText.replace(/\s+/g, ' ').trim()).join('\n');
  return `TU PARCELA LISTA - ACTIVACIÓN DE PROYECTO\n\nCliente: ${client.name || ''}\nTeléfono: ${client.phone || ''}\nCorreo: ${client.email || ''}\nComentarios: ${client.message || ''}\n\nParcela: ${parcela?.nombre || 'Por definir'}\nComuna: ${parcela?.comuna || ''}\nPrecio parcela: ${parcela?.precio || ''}\nDiseño propio: ${getBuildM2(casa)} m², ${getBuildRooms(casa)} habitación(es), ${getSelectedConstruction().nombre}\n\nResumen:\n${rows}\n\nTOTAL ESTIMADO: ${formatCurrency(total)}\n\nEquipo Tu Parcela Lista\ntuparcelalista@gmail.com`;
}

async function logoDataUrl() {
  try {
    const img = new Image();
    img.src = 'image/logo-tu-parcela-lista.png';
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (err) {
    return null;
  }
}

async function generateProjectPdf(client = {}) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) return null;
  const storedId = localStorage.getItem('selectedParcelaId');
  const storedCasaId = localStorage.getItem('selectedCasaId');
  const parcela = getParcelasArray().find(p => String(p.id) === storedId);
  const casa = getCasasArray().find(c => String(c.id) === storedCasaId);
  const total = calculateTotal();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = 595;
  const margin = 42;
  const logo = await logoDataUrl();

  doc.setFillColor(0, 71, 133);
  doc.roundedRect(28, 24, pageW - 56, 92, 18, 18, 'F');
  if (logo) doc.addImage(logo, 'PNG', 42, 34, 86, 58, undefined, 'FAST');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Activación de proyecto', 145, 58);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text('Cotización referencial generada por Tu Parcela Lista', 145, 78);
  doc.text(new Date().toLocaleDateString('es-CL'), 145, 96);

  let y = 145;
  const section = (title) => {
    doc.setTextColor(0, 71, 133);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(title, margin, y);
    y += 18;
    doc.setDrawColor(0, 130, 138);
    doc.line(margin, y, pageW - margin, y);
    y += 18;
    doc.setTextColor(25, 38, 52);
    doc.setFontSize(10.5);
    doc.setFont(undefined, 'normal');
  };
  const row = (label, value) => {
    const text = `${label}: ${value || '-'}`;
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 13 + 5;
  };

  section('Datos del cliente');
  row('Nombre', client.name);
  row('Teléfono', client.phone);
  row('Correo', client.email);
  if (client.message) row('Comentarios', client.message);

  section('Selección del proyecto');
  row('Parcela', parcela?.nombre || 'Por definir');
  row('Comuna', parcela?.comuna || '');
  row('Precio parcela', parcela?.precio || '');
  row('Diseño propio', `${getBuildM2(casa)} m², ${getBuildRooms(casa)} habitación(es), ${getSelectedConstruction().nombre}`);

  section('Resumen de cotización');
  const rows = [...document.querySelectorAll('#summary-items tr')].map(tr => [...tr.children].map(td => td.innerText.replace(/\s+/g,' ').trim()));
  rows.forEach(cols => {
    const left = cols[0] || '';
    const right = cols[1] || '';
    if (y > 720) { doc.addPage(); y = 60; }
    doc.setTextColor(25,38,52);
    doc.setFont(undefined, 'normal');
    doc.text(doc.splitTextToSize(left, 360), margin, y);
    doc.setFont(undefined, 'bold');
    doc.text(right, pageW - margin, y, { align: 'right' });
    y += 22;
  });

  y += 12;
  doc.setFillColor(255, 193, 7);
  doc.roundedRect(margin, y, pageW - margin * 2, 42, 14, 14, 'F');
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('TOTAL ESTIMADO', margin + 16, y + 27);
  doc.text(formatCurrency(total), pageW - margin - 16, y + 27, { align: 'right' });
  y += 70;

  doc.setTextColor(82, 99, 118);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  const note = 'Documento referencial. Valores sujetos a validación técnica, disponibilidad de parcela, condiciones de terreno y confirmación comercial.';
  doc.text(doc.splitTextToSize(note, pageW - margin * 2), margin, y);
  doc.text('tuparcelalista@gmail.com', margin, 805);

  const filename = `proyecto-tu-parcela-lista-${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}

function setupActivateProjectModal() {
  const btn = document.getElementById('activate-project-btn');
  const modal = document.getElementById('activate-modal');
  const close = document.getElementById('activate-close');
  const form = document.getElementById('activate-form');
  if (!btn || !modal || !form) return;
  btn.addEventListener('click', () => modal.classList.add('active'));
  close?.addEventListener('click', () => modal.classList.remove('active'));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const client = {
      name: document.getElementById('activate-name').value,
      phone: document.getElementById('activate-phone').value,
      email: document.getElementById('activate-email').value,
      message: document.getElementById('activate-message').value
    };

    // Guardar lead en Supabase
    if (window.apiSaveLead) {
      const summaryText = buildQuotePlainText(client);
      await window.apiSaveLead({
        nombre: client.name,
        telefono: client.phone,
        email: client.email,
        mensaje: client.message + "\n\n--- Cotización Generada ---\n" + summaryText,
        origen: "Cotizador Diseño Propio",
        fecha: new Date().toISOString()
      });
    }

    const filename = await generateProjectPdf(client);
    const subject = encodeURIComponent('Activación de proyecto - Tu Parcela Lista');
    const body = encodeURIComponent(buildQuotePlainText(client) + `\n\nPDF generado en el navegador: ${filename || 'no disponible'}. Adjuntar el archivo descargado a este correo.`);
    window.location.href = `mailto:tuparcelalista@gmail.com?cc=${encodeURIComponent(client.email)}&subject=${subject}&body=${body}`;
    modal.classList.remove('active');
  });
}

document.addEventListener('DOMContentLoaded', setupActivateProjectModal);
