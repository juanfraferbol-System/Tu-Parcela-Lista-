/**
 * plataforma/crm/crm-mercado.js
 * Controlador de Administración de Variables Comunales e Índice de Mercado TPL (SSOT)
 */
(function(window, document){
  'use strict';

  let mercadoCache = [];
  let isLoaded = false;

  function getSupabase() {
    return window.supabaseClient || (window.supabase ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null);
  }

  function formatMoney(num) {
    return Number(num || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  }

  function normalizar(text) {
    if (!text) return '';
    return String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  async function loadMercadoData() {
    const sb = getSupabase();
    const tbody = document.getElementById('table-body-mercado');
    if (!tbody) return;

    if (!sb) {
      tbody.innerHTML = '<tr><td colspan="10" class="launch-empty" style="color:#ef4444;">Error: Cliente Supabase no disponible.</td></tr>';
      return;
    }

    tbody.innerHTML = '<tr><td colspan="10" class="launch-empty">Consultando fuente canónica de mercado comunal...</td></tr>';

    try {
      const { data, error } = await sb
        .from('mercado_comunas')
        .select('*')
        .order('region', { ascending: true })
        .order('comuna', { ascending: true });

      if (error) throw error;
      mercadoCache = data || [];
      isLoaded = true;
      renderTable();
    } catch(e) {
      console.error('TPLMercadoAdmin: Error cargando datos de mercado:', e);
      tbody.innerHTML = `<tr><td colspan="10" class="launch-empty" style="color:#ef4444;">Error consultando base de datos: ${e.message}</td></tr>`;
    }
  }

  function renderTable() {
    const tbody = document.getElementById('table-body-mercado');
    if (!tbody) return;

    const searchTerm = (document.getElementById('search-mercado')?.value || '').toLowerCase().trim();
    const filterEstado = document.getElementById('filter-estado-mercado')?.value || 'all';

    const filtered = mercadoCache.filter(item => {
      if (filterEstado === 'true' && !item.activo) return false;
      if (filterEstado === 'false' && item.activo) return false;

      if (searchTerm) {
        const str = `${item.region} ${item.comuna} ${item.nombre_normalizado} ${JSON.stringify(item.aliases || [])} ${item.version}`.toLowerCase();
        if (!str.includes(searchTerm)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="launch-empty">No se encontraron comunas que coincidan con los criterios.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    filtered.forEach(item => {
      const row = document.createElement('tr');
      row.style.opacity = item.activo ? '1' : '0.6';

      let aliasesStr = '—';
      if (Array.isArray(item.aliases) && item.aliases.length > 0) {
        aliasesStr = item.aliases.join(', ');
      } else if (typeof item.aliases === 'string') {
        try {
          const arr = JSON.parse(item.aliases);
          if (Array.isArray(arr) && arr.length > 0) aliasesStr = arr.join(', ');
        } catch(e){}
      }

      const valProm = formatMoney(item.valor_promedio_m2);
      const val5000 = formatMoney(item.valor_parcela_tipo_5000);
      const valRango = `${formatMoney(item.rango_bajo_m2)} – ${formatMoney(item.rango_alto_m2)}`;
      const comparables = `${item.comparables_validos || 0} / ${item.comparables_revisados || 0}`;

      let badgeClass = 'badge-info';
      if (item.confianza === 'Alta') badgeClass = 'badge-success';
      if (item.confianza === 'Media' || item.confianza === 'Media-Alta') badgeClass = 'badge-warning';
      if (item.confianza === 'Baja' || item.confianza === 'Preliminar') badgeClass = 'badge-danger';

      row.innerHTML = `
        <td><strong>${item.comuna}</strong><br><small style="color:#64748b;">${item.region}</small></td>
        <td><span style="font-size:0.8rem; color:#475569;">${aliasesStr}</span></td>
        <td style="font-weight:700; color:#0f3d65;">${valProm}</td>
        <td>${val5000}</td>
        <td style="font-size:0.82rem;">${valRango}</td>
        <td style="text-align:center;">${comparables}</td>
        <td><span class="badge ${badgeClass}" style="padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:700;">${item.confianza}</span></td>
        <td><span style="font-family:monospace; font-size:0.8rem;">${item.version}</span></td>
        <td>
          <span style="color:${item.activo ? '#047857' : '#991b1b'}; font-weight:700; font-size:0.8rem;">
            ${item.activo ? '● Activa' : '○ Inactiva'}
          </span>
        </td>
        <td style="white-space:nowrap;">
          <button class="btn-action btn-edit-mercado" data-id="${item.id}" title="Editar" style="padding:5px 8px; margin-right:4px; border:1px solid #cbd5e1; border-radius:6px; background:white; cursor:pointer;"><i data-lucide="edit-2" style="width:14px;height:14px;"></i></button>
          <button class="btn-action btn-historial-mercado" data-id="${item.id}" title="Ver Historial" style="padding:5px 8px; margin-right:4px; border:1px solid #cbd5e1; border-radius:6px; background:white; cursor:pointer;"><i data-lucide="history" style="width:14px;height:14px;"></i></button>
          <button class="btn-action btn-dup-mercado" data-id="${item.id}" title="Duplicar como Nueva Versión" style="padding:5px 8px; margin-right:4px; border:1px solid #cbd5e1; border-radius:6px; background:white; cursor:pointer;"><i data-lucide="copy" style="width:14px;height:14px;"></i></button>
          <button class="btn-action btn-toggle-mercado" data-id="${item.id}" title="${item.activo ? 'Desactivar comuna' : 'Activar comuna'}" style="padding:5px 8px; border:1px solid #cbd5e1; border-radius:6px; background:${item.activo ? '#fff1f2' : '#f0fdf4'}; color:${item.activo ? '#e11d48' : '#16a34a'}; cursor:pointer;"><i data-lucide="${item.activo ? 'power-off' : 'check-circle'}" style="width:14px;height:14px;"></i></button>
        </td>
      `;
      tbody.appendChild(row);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function openFormModal(item = null, isDuplicate = false) {
    const modal = document.getElementById('modal-mercado-form');
    const title = document.getElementById('mercado-form-title');
    const err = document.getElementById('mercado-error-msg');
    if (!modal) return;

    err.textContent = '';
    document.getElementById('mercado-id').value = (item && !isDuplicate) ? item.id : '';
    document.getElementById('mercado-region').value = item ? item.region : 'Biobío';
    document.getElementById('mercado-comuna').value = item ? item.comuna : '';

    let aliasesVal = '';
    if (item && item.aliases) {
      if (Array.isArray(item.aliases)) aliasesVal = item.aliases.join(', ');
      else if (typeof item.aliases === 'string') {
        try { const arr = JSON.parse(item.aliases); if (Array.isArray(arr)) aliasesVal = arr.join(', '); } catch(e){}
      }
    }
    document.getElementById('mercado-aliases').value = aliasesVal;
    document.getElementById('mercado-val-m2').value = item ? item.valor_promedio_m2 : '';
    document.getElementById('mercado-val-5000').value = item ? item.valor_parcela_tipo_5000 : '';
    document.getElementById('mercado-rango-bajo').value = item ? item.rango_bajo_m2 : '';
    document.getElementById('mercado-rango-alto').value = item ? item.rango_alto_m2 : '';
    document.getElementById('mercado-comp-rev').value = item ? item.comparables_revisados : '0';
    document.getElementById('mercado-comp-val').value = item ? item.comparables_validos : '0';
    document.getElementById('mercado-confianza').value = item ? item.confianza : 'Alta';
    document.getElementById('mercado-version').value = (item && isDuplicate) ? `${item.version}-rev` : (item ? item.version : 'IM-TPL-2026-07');
    document.getElementById('mercado-fecha-act').value = isDuplicate ? new Date().toISOString().slice(0, 10) : (item && item.fecha_actualizacion ? item.fecha_actualizacion : new Date().toISOString().slice(0, 10));
    
    let proxRev = '';
    if (item && item.proxima_fecha_revision && !isDuplicate) proxRev = item.proxima_fecha_revision;
    else {
      const d = new Date();
      d.setDate(d.getDate() + 90);
      proxRev = d.toISOString().slice(0, 10);
    }
    document.getElementById('mercado-fecha-rev').value = proxRev;

    let fuentesVal = '';
    if (item && item.fuentes) {
      if (Array.isArray(item.fuentes)) fuentesVal = item.fuentes.join(', ');
      else if (typeof item.fuentes === 'string') {
        try { const arr = JSON.parse(item.fuentes); if (Array.isArray(arr)) fuentesVal = arr.join(', '); } catch(e){}
      }
    }
    document.getElementById('mercado-fuentes').value = fuentesVal;
    document.getElementById('mercado-notas').value = (item && !isDuplicate) ? (item.notas_internas || '') : '';
    document.getElementById('mercado-activo').checked = item ? item.activo : true;

    if (isDuplicate) {
      title.textContent = `Duplicar como Nueva Versión: ${item.comuna}`;
    } else if (item) {
      title.textContent = `Editar Índice Comunal: ${item.comuna}`;
    } else {
      title.textContent = 'Nueva Comuna de Mercado';
    }

    modal.style.display = 'flex';
  }

  function closeModal() {
    const modal = document.getElementById('modal-mercado-form');
    if (modal) modal.style.display = 'none';
  }

  async function handleSaveForm() {
    const err = document.getElementById('mercado-error-msg');
    err.textContent = '';

    const id = document.getElementById('mercado-id').value;
    const region = document.getElementById('mercado-region').value.trim();
    const comuna = document.getElementById('mercado-comuna').value.trim();
    const valM2 = Number(document.getElementById('mercado-val-m2').value);
    let val5000 = Number(document.getElementById('mercado-val-5000').value);
    const rangoBajo = Number(document.getElementById('mercado-rango-bajo').value);
    const rangoAlto = Number(document.getElementById('mercado-rango-alto').value);
    const compRev = Number(document.getElementById('mercado-comp-rev').value || 0);
    const compVal = Number(document.getElementById('mercado-comp-val').value || 0);
    const confianza = document.getElementById('mercado-confianza').value;
    const version = document.getElementById('mercado-version').value.trim();
    const fechaAct = document.getElementById('mercado-fecha-act').value;
    const fechaRev = document.getElementById('mercado-fecha-rev').value || null;
    const notas = document.getElementById('mercado-notas').value.trim();
    const activo = document.getElementById('mercado-activo').checked;

    // VALIDACIONES OBLIGATORIAS
    if (!region || !comuna || !version || !fechaAct) {
      err.textContent = 'Error: Región, Comuna, Versión y Fecha de actualización son obligatorios.';
      return;
    }
    if (isNaN(valM2) || valM2 <= 0) {
      err.textContent = 'Error: El valor promedio por m² debe ser un número mayor que cero.';
      return;
    }
    if (isNaN(rangoBajo) || rangoBajo > valM2) {
      err.textContent = 'Error: El rango bajo debe ser menor o igual al valor promedio.';
      return;
    }
    if (isNaN(rangoAlto) || rangoAlto < valM2) {
      err.textContent = 'Error: El rango alto debe ser mayor o igual al valor promedio.';
      return;
    }
    if (compVal > compRev) {
      err.textContent = 'Error: Los comparables válidos no pueden ser mayores que los comparables revisados.';
      return;
    }

    if (!val5000 || val5000 <= 0) {
      val5000 = valM2 * 5000;
    }

    const nombreNorm = normalizar(comuna);

    // Evitar duplicados de región/comuna normalizada (si es un registro nuevo)
    if (!id) {
      const duplicado = mercadoCache.find(x => normalizar(x.region) === normalizar(region) && normalizar(x.nombre_normalizado) === nombreNorm);
      if (duplicado) {
        err.textContent = `Error: Ya existe un registro para ${comuna} en ${region}. Edita el existente o duplícalo como nueva versión.`;
        return;
      }
    }

    const aliasesRaw = document.getElementById('mercado-aliases').value.trim();
    const aliasesArr = aliasesRaw ? aliasesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!aliasesArr.includes(comuna)) aliasesArr.unshift(comuna);

    const fuentesRaw = document.getElementById('mercado-fuentes').value.trim();
    const fuentesArr = fuentesRaw ? fuentesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    const payload = {
      region,
      comuna,
      nombre_normalizado: nombreNorm,
      aliases: aliasesArr,
      valor_promedio_m2: valM2,
      valor_parcela_tipo_5000: val5000,
      rango_bajo_m2: rangoBajo,
      rango_alto_m2: rangoAlto,
      comparables_revisados: compRev,
      comparables_validos: compVal,
      confianza,
      version,
      fecha_actualizacion: fechaAct,
      proxima_fecha_revision: fechaRev,
      fuentes: fuentesArr,
      notas_internas: notas,
      activo,
      modificado_por: 'admin@parcelalista.cl'
    };

    const sb = getSupabase();
    if (!sb) {
      err.textContent = 'Error: No se pudo conectar a Supabase.';
      return;
    }

    const btnSave = document.getElementById('btn-save-mercado-form');
    btnSave.disabled = true;
    btnSave.textContent = 'Guardando...';

    try {
      let res;
      if (id) {
        res = await sb.from('mercado_comunas').update(payload).eq('id', id).select();
      } else {
        res = await sb.from('mercado_comunas').insert([payload]).select();
      }

      if (res.error) throw res.error;
      closeModal();
      await loadMercadoData();
    } catch(e) {
      console.error('TPLMercadoAdmin: Error guardando:', e);
      err.textContent = `Error al guardar: ${e.message || e.details || 'Fallo de red o RLS'}`;
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Guardar Índice';
    }
  }

  async function toggleActiveStatus(id) {
    const item = mercadoCache.find(x => x.id === id);
    if (!item) return;

    const sb = getSupabase();
    if (!sb) return;

    const nuevoEstado = !item.activo;
    const accionTxt = nuevoEstado ? 'Activar' : 'Desactivar';
    if (!confirm(`¿Estás seguro de ${accionTxt.toLowerCase()} la comuna "${item.comuna}"? ${nuevoEstado ? 'Estará disponible' : 'Dejará de estar disponible'} para consultas públicas.`)) {
      return;
    }

    try {
      const { error } = await sb.from('mercado_comunas').update({ activo: nuevoEstado, modificado_por: 'admin@parcelalista.cl' }).eq('id', id);
      if (error) throw error;
      await loadMercadoData();
    } catch(e) {
      alert(`Error al cambiar estado: ${e.message}`);
    }
  }

  async function openHistoryModal(id) {
    const modal = document.getElementById('modal-mercado-historial');
    const tbody = document.getElementById('table-body-historial-mercado');
    const item = mercadoCache.find(x => x.id === id);
    if (!modal || !tbody) return;

    document.getElementById('mercado-historial-title').textContent = `Historial: ${item ? item.comuna : 'Comuna'}`;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando historial de cambios...</td></tr>';
    modal.style.display = 'flex';

    const sb = getSupabase();
    if (!sb) {
      tbody.innerHTML = '<tr><td colspan="7" style="color:red; text-align:center;">Error de conexión a BD</td></tr>';
      return;
    }

    try {
      const { data, error } = await sb
        .from('mercado_comunas_historial')
        .select('*')
        .eq('mercado_comuna_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#64748b;">No hay versiones anteriores en el historial. Esta es la primera versión o no ha sufrido modificaciones.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      data.forEach(hist => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${new Date(hist.created_at || hist.fecha_actualizacion).toLocaleDateString('es-CL')}<br><small style="color:#64748b;">${new Date(hist.created_at || hist.fecha_actualizacion).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}</small></td>
          <td style="font-weight:700;">${formatMoney(hist.valor_promedio_m2)}</td>
          <td>${formatMoney(hist.valor_parcela_tipo_5000)}</td>
          <td style="font-size:0.8rem;">${formatMoney(hist.rango_bajo_m2)} – ${formatMoney(hist.rango_alto_m2)}</td>
          <td><span class="badge badge-info" style="font-size:0.75rem;">${hist.confianza || '—'}</span></td>
          <td style="font-family:monospace; font-size:0.8rem;">${hist.version || '—'}</td>
          <td style="font-size:0.8rem; color:#475569;">${hist.modificado_por || 'admin@parcelalista.cl'}</td>
        `;
        tbody.appendChild(row);
      });
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error cargando historial: ${e.message}</td></tr>`;
    }
  }

  function closeHistoryModal() {
    const modal = document.getElementById('modal-mercado-historial');
    if (modal) modal.style.display = 'none';
  }

  // Event Listeners
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-refresh-mercado')?.addEventListener('click', loadMercadoData);
    document.getElementById('btn-new-mercado')?.addEventListener('click', () => openFormModal(null));
    document.getElementById('btn-close-mercado-form')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-mercado-form')?.addEventListener('click', closeModal);
    document.getElementById('form-mercado-comuna')?.addEventListener('submit', handleSaveForm);
    document.getElementById('search-mercado')?.addEventListener('input', renderTable);
    document.getElementById('filter-estado-mercado')?.addEventListener('change', renderTable);

    document.getElementById('btn-close-mercado-historial')?.addEventListener('click', closeHistoryModal);
    document.getElementById('btn-close-mercado-historial-2')?.addEventListener('click', closeHistoryModal);

    // Delegación de eventos en tabla
    const tbody = document.getElementById('table-body-mercado');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const item = mercadoCache.find(x => x.id === id);
        if (!item) return;

        if (btn.classList.contains('btn-edit-mercado')) {
          openFormModal(item, false);
        } else if (btn.classList.contains('btn-dup-mercado')) {
          openFormModal(item, true);
        } else if (btn.classList.contains('btn-historial-mercado')) {
          openHistoryModal(id);
        } else if (btn.classList.contains('btn-toggle-mercado')) {
          toggleActiveStatus(id);
        }
      });
    }
  });

  window.TPLMercadoAdmin = {
    load: () => {
      if (!isLoaded) loadMercadoData();
      else renderTable();
    },
    refresh: loadMercadoData
  };

})(window, document);
