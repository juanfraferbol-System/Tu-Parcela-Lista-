/* =====================================================
   TU PARCELA LISTA 2.0 - COTIZADOR PREMIUM
   Diseño propio, terminaciones, PDF/WhatsApp limpio
===================================================== */
(function () {
  const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const money = v => CLP.format(Number(v || 0));
  const parsePrice = v => Number(String(v ?? '').replace(/\D/g, '')) || 0;
  const getParcelas = () => window.parcelas || (typeof parcelas !== 'undefined' ? parcelas : []);
  const getCasas = () => window.casas || (typeof casas !== 'undefined' ? casas : []);
  const getM2Casa = c => Number(c?.metros || c?.mt2 || c?.superficie || 0) || 0;
  const casaPrice = c => parsePrice(c?.valorCasa ?? c?.precio ?? c?.valor);
  const parcelaPrice = p => parsePrice(p?.precio);

  const MATERIAL_DEFAULTS = [
    { id: 'madera', nombre: 'Económica madera', precioM2: 420000, desc: 'Rápida, cálida y eficiente para segunda vivienda.' },
    { id: 'metalcon', nombre: 'Estándar metalcon', precioM2: 540000, desc: 'Estructura resistente, liviana y moderna.' },
    { id: 'solido', nombre: 'Premium sólido', precioM2: 720000, desc: 'Mayor durabilidad y terminación superior.' }
  ];
  const TERMINACION_DEFAULTS = [
    { id: 'obra', nombre: 'Obra gruesa', precioM2: 0 },
    { id: 'normal', nombre: 'Terminación estándar', precioM2: 70000 },
    { id: 'full', nombre: 'Full llave en mano', precioM2: 140000 }
  ];
  const PISOS = [
    { id: 'sin', nombre: 'Sin piso adicional', precioM2: 0 },
    { id: 'ceramico', nombre: 'Piso cerámico', precioM2: 32000 },
    { id: 'vinilico', nombre: 'Piso vinílico SPC', precioM2: 45000 }
  ];
  const PINTURAS = [
    { id: 'sin', nombre: 'Sin pintura adicional', precioM2: 0 },
    { id: 'interior', nombre: 'Pintura interior', precioM2: 15000 },
    { id: 'full', nombre: 'Pintura interior + exterior', precioM2: 28000 }
  ];

  function getCustomState() {
    return {
      active: localStorage.getItem('tplDisenoPropio') === 'true',
      m2: Number(document.getElementById('custom-m2')?.value || localStorage.getItem('tplCustomM2') || 60),
      material: document.querySelector('input[name="custom-material"]:checked')?.value || localStorage.getItem('tplCustomMaterial') || 'madera',
      terminacion: document.querySelector('input[name="custom-terminacion"]:checked')?.value || localStorage.getItem('tplCustomTerminacion') || 'normal',
      piso: document.getElementById('custom-piso')?.value || localStorage.getItem('tplCustomPiso') || 'ceramico',
      pintura: document.getElementById('custom-pintura')?.value || localStorage.getItem('tplCustomPintura') || 'interior',
      dormitorios: Number(document.getElementById('custom-dormitorios')?.value || 2),
      banos: Number(document.getElementById('custom-banos')?.value || 1)
    };
  }

  window.getCustomState = getCustomState;
  function saveCustomState(s) {
    localStorage.setItem('tplDisenoPropio', String(s.active));
    localStorage.setItem('tplCustomM2', String(s.m2));
    localStorage.setItem('tplCustomMaterial', s.material);
    localStorage.setItem('tplCustomTerminacion', s.terminacion);
    localStorage.setItem('tplCustomPiso', s.piso);
    localStorage.setItem('tplCustomPintura', s.pintura);
  }

  function customTotal(s = getCustomState()) {
    const mat = MATERIAL_DEFAULTS.find(x => x.id === s.material) || MATERIAL_DEFAULTS[0];
    const ter = TERMINACION_DEFAULTS.find(x => x.id === s.terminacion) || TERMINACION_DEFAULTS[1];
    const piso = PISOS.find(x => x.id === s.piso) || PISOS[0];
    const pintura = PINTURAS.find(x => x.id === s.pintura) || PINTURAS[0];
    return s.m2 * (mat.precioM2 + ter.precioM2 + piso.precioM2 + pintura.precioM2);
  }

  function renderCustomDesigner() {
    const left = document.querySelector('.cotizador-left');
    if (!left || document.getElementById('custom-designer-box')) return;
    const s = getCustomState();
    const box = document.createElement('div');
    box.className = 'options-box custom-designer-box';
    box.id = 'custom-designer-box';
    box.innerHTML = `
      <div class="custom-designer-head">
        <div><h3><i data-lucide="drafting-compass"></i> Diseño Propio</h3><p class="box-description">Borra la casa prefabricada y calcula una casa desde cero según m², material y terminaciones.</p></div>
        <button type="button" class="btn-own-design" id="activate-own-design">Activar diseño propio</button>
      </div>
      <div class="custom-designer-panel ${s.active ? 'active' : ''}" id="custom-designer-panel">
        <div class="custom-grid-inputs">
          <label>Metros cuadrados <input type="number" id="custom-m2" min="18" value="${s.m2}"></label>
          <label>Dormitorios <input type="number" id="custom-dormitorios" min="1" value="${s.dormitorios}"></label>
          <label>Baños <input type="number" id="custom-banos" min="1" value="${s.banos}"></label>
        </div>
        <h4>Material principal</h4>
        <div class="choice-grid">${MATERIAL_DEFAULTS.map(m => `<label class="choice-card"><input type="radio" name="custom-material" value="${m.id}" ${s.material === m.id ? 'checked' : ''}><strong>${m.nombre}</strong><span>${money(m.precioM2)} / m²</span><small>${m.desc}</small></label>`).join('')}</div>
        <h4>Terminación</h4>
        <div class="choice-grid">${TERMINACION_DEFAULTS.map(t => `<label class="choice-card"><input type="radio" name="custom-terminacion" value="${t.id}" ${s.terminacion === t.id ? 'checked' : ''}><strong>${t.nombre}</strong><span>${money(t.precioM2)} / m²</span></label>`).join('')}</div>
        <div class="custom-grid-inputs">
          <label>Piso <select id="custom-piso">${PISOS.map(p => `<option value="${p.id}" ${s.piso === p.id ? 'selected' : ''}>${p.nombre} - ${money(p.precioM2)}/m²</option>`).join('')}</select></label>
          <label>Pintura <select id="custom-pintura">${PINTURAS.map(p => `<option value="${p.id}" ${s.pintura === p.id ? 'selected' : ''}>${p.nombre} - ${money(p.precioM2)}/m²</option>`).join('')}</select></label>
        </div>
        <div class="custom-live-total"><span>Total casa diseño propio</span><strong id="custom-live-total">${money(customTotal(s))}</strong></div>
      </div>`;
    left.insertBefore(box, left.firstElementChild);
    document.getElementById('activate-own-design')?.addEventListener('click', () => {
      localStorage.removeItem('selectedCasaId');
      localStorage.setItem('tplDisenoPropio', 'true');
      document.getElementById('custom-designer-panel')?.classList.add('active');
      updatePremiumSummary();
    });
    box.addEventListener('input', updatePremiumSummary);
    box.addEventListener('change', updatePremiumSummary);
    if (window.lucide) window.lucide.createIcons();
  }

  
  // TPL PROJECT STATE MANAGEMENT
  window.getTplProjectState = function() {
    try {
      const stored = localStorage.getItem('tplProjectState');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    const oldPid = localStorage.getItem('selectedParcelaId');
    return {
      parcelaId: oldPid || null,
      incluidaEnProyecto: oldPid ? true : false,
      origen: "cotizador.html",
      returnTo: "diseno-propio"
    };
  }
  
  window.saveTplProjectState = function(state) {
    localStorage.setItem('tplProjectState', JSON.stringify(state));
    if (state.parcelaId && state.incluidaEnProyecto) {
      localStorage.setItem('selectedParcelaId', state.parcelaId); 
    } else {
      localStorage.removeItem('selectedParcelaId');
    }
  }

  function getParcelaActiva(state) {
      if (!state.parcelaId) return null;
      return getParcelas().find(p => String(p.id) === String(state.parcelaId)) || null;
  }

  window.renderSelectedParcelBlock = function() {
    const block = document.getElementById('tu-parcela-block');
    if(!block) return;
    
    const state = window.getTplProjectState();
    const parcela = getParcelaActiva(state);
    
    if (!parcela) {
        block.innerHTML = `
          <div class="empty-parcel-card">
            <div style="background:#e2e8f0; width:56px; height:56px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
              <i data-lucide="map" style="color:#64748b; width:28px; height:28px;"></i>
            </div>
            <h4>Ya tienes una parcela?</h4>
            <p>Puedes disear tu casa sin parcela o agregar una para calcular el proyecto completo.</p>
            <button class="btn-primary-small" onclick="window.location.href='index.html?modo=seleccionar-parcela&returnTo=diseno-propio#parcelas-anchor'"><i data-lucide="plus" style="width:16px; height:16px; vertical-align:middle;"></i> Agregar una parcela</button>
          </div>
        `;
    } else {
        const isIncluded = state.incluidaEnProyecto;
        const opacityClass = isIncluded ? '' : 'inactive';
        const img = (parcela.imagenes && parcela.imagenes[0]) || 'image/placeholder-parcela.jpg';
        
        block.innerHTML = `
          <div class="parcel-selection-card ${opacityClass}">
            <div class="parcel-switch-container">
              <span class="parcel-switch-label">Incluir parcela en este proyecto</span>
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-parcel-inclusion" ${isIncluded ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
            
            <div class="parcel-card-content">
              <img src="${img}" class="parcel-thumb" alt="Parcela">
              <div class="parcel-details">
                <span style="font-size:0.75rem; background:#dbeafe; color:#1e40af; padding:2px 8px; border-radius:99px; font-weight:700; text-transform:uppercase;">Parcela Seleccionada</span>
                <h4>${parcela.titulo || parcela.nombre || 'Parcela'}</h4>
                <p>${parcela.ubicacion || ''}  ${parcela.superficie || ''}</p>
                <div class="parcel-price">${isIncluded ? money(parcelaPrice(parcela)) : 'No incluida en el total'}</div>
              </div>
            </div>
            
            <div class="parcel-actions">
              <button class="btn-outline-small" onclick="window.location.href='parcela.html?id=${parcela.id}&returnTo=diseno-propio'"><i data-lucide="external-link" style="width:14px; height:14px; vertical-align:middle;"></i> Ver detalles</button>
              <button class="btn-outline-small" onclick="window.location.href='index.html?modo=seleccionar-parcela&returnTo=diseno-propio#parcelas-anchor'"><i data-lucide="refresh-cw" style="width:14px; height:14px; vertical-align:middle;"></i> Cambiar</button>
              <button class="btn-danger-small" id="btn-remove-parcel"><i data-lucide="trash-2" style="width:14px; height:14px; vertical-align:middle;"></i> Quitar parcela</button>
            </div>
          </div>
        `;
        
        document.getElementById('toggle-parcel-inclusion').addEventListener('change', (e) => {
            state.incluidaEnProyecto = e.target.checked;
            window.saveTplProjectState(state);
            window.renderSelectedParcelBlock();
            if(typeof window.renderExtrasOpcionales !== 'undefined') window.renderExtrasOpcionales();
            if(typeof updatePremiumSummary !== 'undefined') updatePremiumSummary();
            if(typeof updateResumenCotizacion !== 'undefined') updateResumenCotizacion();
        });
        
        document.getElementById('btn-remove-parcel').addEventListener('click', () => {
            state.parcelaId = null;
            state.incluidaEnProyecto = false;
            window.saveTplProjectState(state);
            window.renderSelectedParcelBlock();
            if(typeof window.renderExtrasOpcionales !== 'undefined') window.renderExtrasOpcionales();
            if(typeof updatePremiumSummary !== 'undefined') updatePremiumSummary();
            if(typeof updateResumenCotizacion !== 'undefined') updateResumenCotizacion();
        });
    }
    if(typeof lucide !== 'undefined') lucide.createIcons();
  }

  function updatePremiumSummary() {
    const s = getCustomState();
    saveCustomState(s);
    const live = document.getElementById('custom-live-total');
    if (live) live.textContent = money(customTotal(s));
    const tbody = document.getElementById('summary-items');
    const totalSpan = document.getElementById('total-amount');
    if (!tbody || !totalSpan || !s.active) return;
    
      const state = window.getTplProjectState();
      const parcela = state.incluidaEnProyecto ? getParcelaActiva(state) : null;

    const terreno = parcelaPrice(parcela);
    const casa = customTotal(s);
    let extras = 0;
    document.querySelectorAll('#opcionales-container .extra-check:checked').forEach(chk => {
      const valor = Number(chk.dataset.valor || 0);
      const qtyInput = document.querySelector(`.extra-qty[data-id="${chk.dataset.id}"]`);
      const qty = Number(qtyInput?.value || 1);
      extras += valor * qty;
    });
    tbody.innerHTML = `
      <tr><td><div class="summary-item-name">Terreno ${parcela?.nombre || 'seleccionado'}</div><div style="font-size:.75rem;color:var(--text-muted)">${parcela?.comuna || ''}</div></td><td class="summary-item-value">${money(terreno)}</td></tr>
      <tr><td><div class="summary-item-name">Casa Diseño Propio</div><div style="font-size:.75rem;color:var(--text-muted)">${s.m2} m² · ${s.dormitorios} dorm · ${s.banos} baño(s)</div></td><td class="summary-item-value">${money(casa)}</td></tr>
      ${extras ? `<tr><td><div class="summary-item-name">Extras seleccionados</div></td><td class="summary-item-value">${money(extras)}</td></tr>` : ''}`;
    totalSpan.textContent = money(terreno + casa + extras);
    const info = document.getElementById('selection-info-bar');
    if (info && s.active) {
      const blocks = info.querySelectorAll('.info-block');
      if (blocks[1]) blocks[1].innerHTML = `<span class="label">Casa personalizada</span><span class="value">Diseño Propio</span><span class="sub-value">${s.m2} m² · ${money(casa)}</span>`;
    }
  }

  function setupProjectWhatsAppForm() {
    const form = document.getElementById('activate-form');
    if (!form || form.dataset.premiumReady) return;
    form.dataset.premiumReady = 'true';
    form.addEventListener('submit', e => {
      const s = getCustomState();
      const total = document.getElementById('total-amount')?.textContent || '$0';
      
      const state = window.getTplProjectState();
      const parcela = state.incluidaEnProyecto ? getParcelaActiva(state) : null;

      const name = document.getElementById('activate-name')?.value || '';
      const phone = document.getElementById('activate-phone')?.value || '';
      const email = document.getElementById('activate-email')?.value || '';
      const comments = document.getElementById('activate-message')?.value || '';
      const msg = encodeURIComponent(`Hola Tu Parcela Lista, quiero activar este proyecto.\n\nCliente: ${name}\nTeléfono: ${phone}\nCorreo: ${email}\n\nParcela: ${parcela?.nombre || 'Por definir'}\nComuna: ${parcela?.comuna || ''}\nMaterial: ${s.material}\nTotal estimado: ${total}\n\nComentarios: ${comments}\n\nSolicito contacto para revisar factibilidad, visita y reserva.`);
      setTimeout(() => window.open(`https://wa.me/56988508361?text=${msg}`, '_blank'), 700);
    }, true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    
    const params = new URLSearchParams(location.search);
    const state = window.getTplProjectState();
    if (params.get('parcela')) {
        state.parcelaId = params.get('parcela');
        state.incluidaEnProyecto = true;
        window.saveTplProjectState(state);
    }
    window.renderSelectedParcelBlock();

    if (params.get('casa')) localStorage.setItem('selectedCasaId', params.get('casa'));
    setTimeout(() => { localStorage.removeItem('tplDisenoPropio'); setupProjectWhatsAppForm(); }, 350);
  });
})();
