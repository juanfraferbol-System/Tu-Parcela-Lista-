(() => {
  'use strict';

  const getClient = () => window.tplCrmSupabase || window.tplSupabase;
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const val = (id) => document.getElementById(id)?.value?.trim() ?? '';
  const bool = (id) => Boolean(document.getElementById(id)?.checked);
  const numberOrNull = (id) => {
    const raw = val(id);
    return raw === '' ? null : Number(raw);
  };
  const csv = (id) => val(id).split(',').map((item) => item.trim()).filter(Boolean);
  const money = (value) => value == null ? '—' : `$${Number(value).toLocaleString('es-CL')}`;
  const assetUrl = (value) => {
    const raw = String(value || '').trim().replaceAll('\\', '/');
    if (!raw) return '';
    if (/^(?:https?:|data:|blob:)/i.test(raw) || raw.startsWith('/')) return raw;
    return `/${raw.replace(/^\.?\//, '').replace(/^(?:\.\.\/)+/, '')}`;
  };

  function field(id, label, value = '', type = 'text', attrs = '') {
    return `<label class="catalog-field"><span>${esc(label)}</span><input id="${id}" type="${type}" value="${esc(value ?? '')}" ${attrs}></label>`;
  }

  function textarea(id, label, value = '', rows = 4) {
    return `<label class="catalog-field catalog-span-2"><span>${esc(label)}</span><textarea id="${id}" rows="${rows}">${esc(value ?? '')}</textarea></label>`;
  }

  function checkbox(id, label, checked = false) {
    return `<label class="catalog-check"><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  }

  function showMessage(message, type = 'info') {
    const node = document.getElementById('catalog-status');
    if (!node) return;
    node.hidden = false;
    node.className = `catalog-status ${type}`;
    node.textContent = message;
  }

  async function openParcelEditor(id) {
    const client = getClient();
    const modal = document.getElementById('modal-detalle');
    const content = document.getElementById('modal-content');
    const actions = document.getElementById('modal-actions');
    if (!client || !modal || !content || !actions) return;

    modal.classList.add('active');
    content.innerHTML = '<p>Cargando todos los datos de la parcela…</p>';
    actions.innerHTML = '';

    const { data, error } = await client.rpc('crm_detalle_publicacion', { p_publicacion_id: id });
    if (error || !data?.publicacion) {
      console.error('Error cargando parcela:', error);
      content.innerHTML = '<p class="error-msg">No fue posible cargar la parcela.</p>';
      return;
    }

    const p = data.publicacion;
    const photos = data.fotos || [];
    const extra = p.datos_formulario && typeof p.datos_formulario === 'object' ? p.datos_formulario : {};

    content.innerHTML = `
      <form id="parcel-admin-form" class="catalog-form" data-id="${esc(p.id)}">
        <div class="catalog-section-title"><h3>Información pública</h3><span>${esc(p.codigo_publico)}</span></div>
        <div class="catalog-grid">
          ${field('par-titulo', 'Título público', p.titulo_publico, 'text', 'maxlength="160" required')}
          ${field('par-precio', 'Precio de publicación', p.precio_publicacion, 'number', 'min="0" step="1"')}
          ${field('par-superficie', 'Superficie (m²)', p.superficie_m2, 'number', 'min="1" step="1"')}
          ${field('par-rol', 'Rol de la propiedad', p.rol)}
          ${textarea('par-descripcion', 'Descripción pública', p.descripcion_publica, 6)}
        </div>

        <div class="catalog-section-title"><h3>Ubicación</h3></div>
        <div class="catalog-grid">
          ${field('par-region', 'Región', p.region)}
          ${field('par-comuna', 'Comuna', p.comuna)}
          ${field('par-sector', 'Sector', p.sector)}
          ${field('par-ubicacion', 'Ubicación pública aproximada', p.ubicacion_publica_aproximada)}
          ${field('par-ciudad', 'Ciudad principal cercana', p.ciudad_principal)}
          ${field('par-distancia', 'Distancia a ciudad', p.distancia_ciudad)}
          ${field('par-lat', 'Latitud privada', p.latitud_privada, 'number', 'step="any" min="-90" max="90"')}
          ${field('par-lng', 'Longitud privada', p.longitud_privada, 'number', 'step="any" min="-180" max="180"')}
          ${field('par-lat-publica', 'Latitud del mapa público', p.latitud_publica, 'number', 'step="any" min="-90" max="90"')}
          ${field('par-lng-publica', 'Longitud del mapa público', p.longitud_publica, 'number', 'step="any" min="-180" max="180"')}
          <div class="catalog-span-2 catalog-check-row">${checkbox('par-mapa-exacto', 'Mostrar estas coordenadas exactas en la Landing Premium', p.consentimiento_uso_ubicacion && p.latitud_publica != null && p.longitud_publica != null)}</div>
        </div>

        <div class="catalog-section-title"><h3>Características de la parcela</h3><small>Completa manualmente lo que falte.</small></div>
        <div class="catalog-grid">
          ${field('par-agua', 'Agua', p.agua)}
          ${field('par-luz', 'Luz', p.luz)}
          ${field('par-acceso', 'Acceso', p.acceso)}
          ${field('par-topografia', 'Topografía', p.topografia)}
          ${field('par-naturaleza', 'Naturaleza (separada por comas)', (p.naturaleza || []).join(', '))}
          ${field('par-cuerpos-agua', 'Cuerpos de agua (separados por comas)', (p.cuerpos_agua || []).join(', '))}
          ${field('par-servicios', 'Servicios (separados por comas)', (p.servicios || []).join(', '))}
          ${field('par-detalle-pago', 'Detalle facilidad de pago', p.detalle_facilidad_pago)}
          <div class="catalog-span-2 catalog-check-row">${checkbox('par-facilidad-pago', 'Tiene facilidad de pago', p.facilidad_pago)}</div>
        </div>

        <div class="catalog-section-title"><h3>Contacto y publicación</h3></div>
        <div class="catalog-grid">
          ${field('par-contacto-nombre', 'Nombre de contacto', p.contacto_nombre)}
          ${field('par-contacto-email', 'Correo', p.contacto_email, 'email')}
          ${field('par-contacto-telefono', 'Teléfono / WhatsApp', p.contacto_telefono)}
          ${field('par-contacto-org', 'Organización o corredora', p.contacto_organizacion)}
          ${field('par-plan', 'Plan seleccionado', p.plan_contratado || p.plan_seleccionado)}
          ${field('par-tipo-publicador', 'Tipo de publicador', p.tipo_publicador)}
        </div>

        <div class="catalog-section-title"><h3>Campos adicionales del publicador</h3><small>Se conservan como JSON para no perder información futura.</small></div>
        ${textarea('par-datos-extra', 'Datos adicionales', JSON.stringify(extra, null, 2), 8)}

        <div class="catalog-section-title"><h3>Fotografías</h3><span>${photos.length} archivo(s)</span></div>
        <div class="catalog-photo-grid">
          ${photos.length ? photos.map((f) => `<a href="${esc(assetUrl(f.url_storage))}" target="_blank" rel="noopener"><img src="${esc(assetUrl(f.url_storage))}" alt="Fotografía de la parcela" loading="lazy"><span>${f.es_portada ? 'Portada' : `Foto ${Number(f.orden || 0) + 1}`}</span></a>`).join('') : '<p>Esta publicación no tiene fotografías disponibles.</p>'}
        </div>
      </form>`;

    actions.innerHTML = `
      <button type="button" class="btn-secondary" id="btn-close-parcel-editor">Cerrar</button>
      <button type="button" class="btn-primary" id="btn-save-parcel">Guardar parcela</button>`;

    document.getElementById('btn-close-parcel-editor')?.addEventListener('click', () => modal.classList.remove('active'));
    document.getElementById('btn-save-parcel')?.addEventListener('click', () => saveParcel(id));
    window.lucide?.createIcons();
  }

  async function saveParcel(id) {
    const client = getClient();
    const button = document.getElementById('btn-save-parcel');
    if (!client || !button) return;

    let extra = {};
    try {
      extra = val('par-datos-extra') ? JSON.parse(val('par-datos-extra')) : {};
    } catch {
      alert('Los datos adicionales no tienen un formato JSON válido.');
      return;
    }

    const payload = {
      titulo_publico: val('par-titulo'), descripcion_publica: val('par-descripcion'),
      precio_publicacion: numberOrNull('par-precio'), superficie_m2: numberOrNull('par-superficie'), rol: val('par-rol') || null,
      region: val('par-region'), comuna: val('par-comuna'), sector: val('par-sector'), ubicacion_publica_aproximada: val('par-ubicacion'),
      ciudad_principal: val('par-ciudad') || null, distancia_ciudad: val('par-distancia') || null,
      latitud_privada: numberOrNull('par-lat'), longitud_privada: numberOrNull('par-lng'),
      latitud_publica: bool('par-mapa-exacto') ? (numberOrNull('par-lat-publica') ?? numberOrNull('par-lat')) : null,
      longitud_publica: bool('par-mapa-exacto') ? (numberOrNull('par-lng-publica') ?? numberOrNull('par-lng')) : null,
      consentimiento_uso_ubicacion: bool('par-mapa-exacto'),
      precision_ubicacion: bool('par-mapa-exacto') ? 'exacta' : 'aproximada',
      agua: val('par-agua') || null, luz: val('par-luz') || null, acceso: val('par-acceso') || null, topografia: val('par-topografia') || null,
      naturaleza: csv('par-naturaleza'), cuerpos_agua: csv('par-cuerpos-agua'), servicios: csv('par-servicios'),
      facilidad_pago: bool('par-facilidad-pago'), detalle_facilidad_pago: val('par-detalle-pago') || null,
      contacto_nombre: val('par-contacto-nombre'), contacto_email: val('par-contacto-email'), contacto_telefono: val('par-contacto-telefono') || null,
      contacto_organizacion: val('par-contacto-org') || null, plan_seleccionado: val('par-plan') || null,
      datos_formulario: extra
    };

    if (!payload.titulo_publico || !payload.descripcion_publica || !payload.region || !payload.comuna || !payload.sector || !payload.ubicacion_publica_aproximada) {
      alert('Completa título, descripción, región, comuna, sector y ubicación pública.');
      return;
    }

    button.disabled = true;
    button.textContent = 'Guardando…';
    const { error } = await client.rpc('crm_guardar_publicacion_admin', { p_publicacion_id: id, p_datos: payload });
    button.disabled = false;
    button.textContent = 'Guardar parcela';

    if (error) {
      console.error('Error guardando parcela:', error);
      alert(`No se pudo guardar: ${error.message || 'error desconocido'}`);
      return;
    }

    alert('Parcela actualizada correctamente.');
    document.getElementById('modal-detalle')?.classList.remove('active');
    document.getElementById('btn-refresh')?.click();
  }

  async function loadHouses() {
    const client = getClient();
    const body = document.getElementById('table-body-casas');
    if (!client || !body) return;
    body.innerHTML = '<tr><td colspan="8">Cargando casas…</td></tr>';
    const { data, error } = await client.rpc('crm_listar_casas_admin');
    if (error) {
      console.error('Error cargando casas:', error);
      body.innerHTML = '<tr><td colspan="8" class="error-msg">No fue posible cargar las casas.</td></tr>';
      return;
    }
    const houses = data || [];
    body.innerHTML = houses.length ? houses.map((h) => `
      <tr>
        <td>${h.imagen_principal_url ? `<img class="catalog-thumb" src="${esc(assetUrl(h.imagen_principal_url))}" alt="${esc(h.nombre)}">` : '—'}</td>
        <td><strong>${esc(h.nombre)}</strong><br><small>${esc(h.codigo || '')}</small></td>
        <td>${esc(h.superficie_m2)} m²</td><td>${esc(h.habitaciones)}</td><td>${esc(h.banos)}</td>
        <td>${money(h.precio_base)}</td><td><span class="badge ${h.activa ? 'aprobada' : 'rechazada'}">${h.activa ? 'Activa' : 'Inactiva'}</span></td>
        <td><button class="btn-action" data-edit-house="${esc(h.id)}">Editar</button></td>
      </tr>`).join('') : '<tr><td colspan="8">No hay casas registradas.</td></tr>';
    body.querySelectorAll('[data-edit-house]').forEach((button) => button.addEventListener('click', () => openHouseEditor(button.dataset.editHouse)));
  }

  async function openHouseEditor(id = null) {
    const client = getClient();
    const modal = document.getElementById('modal-detalle');
    const content = document.getElementById('modal-content');
    const actions = document.getElementById('modal-actions');
    if (!client || !modal || !content || !actions) return;

    let h = { imagenes: [], activa: true, destacada: false };
    if (id) {
      const { data, error } = await client.rpc('crm_detalle_casa_admin', { p_casa_id: id });
      if (error) return alert(`No se pudo cargar la casa: ${error.message}`);
      h = data || h;
    }

    modal.classList.add('active');
    content.innerHTML = `
      <form id="house-admin-form" class="catalog-form">
        <div class="catalog-section-title"><h3>${id ? 'Editar casa' : 'Nueva casa'}</h3></div>
        <div class="catalog-grid">
          ${field('casa-codigo', 'Código', h.codigo)}
          ${field('casa-nombre', 'Nombre', h.nombre, 'text', 'required')}
          ${field('casa-superficie', 'Superficie (m²)', h.superficie_m2, 'number', 'min="1" step="0.01" required')}
          ${field('casa-habitaciones', 'Habitaciones', h.habitaciones, 'number', 'min="0" step="1" required')}
          ${field('casa-banos', 'Baños', h.banos, 'number', 'min="0" step="1" required')}
          ${field('casa-precio', 'Precio base', h.precio_base, 'number', 'min="0" step="1" required')}
          ${field('casa-tipo', 'Tipo de construcción', h.tipo_construccion)}
          ${field('casa-empresa', 'Empresa', h.empresa)}
          ${field('casa-tiempo', 'Tiempo de entrega', h.tiempo_entrega)}
          ${field('casa-plano', 'URL del plano', h.plano_url)}
          ${field('casa-imagen', 'URL imagen principal', h.imagen_principal_url)}
          ${field('casa-imagenes', 'Imágenes adicionales (separadas por comas)', Array.isArray(h.imagenes) ? h.imagenes.join(', ') : '')}
          ${textarea('casa-descripcion', 'Descripción', h.descripcion, 6)}
          <div class="catalog-span-2 catalog-check-row">${checkbox('casa-activa', 'Casa activa', h.activa)}${checkbox('casa-destacada', 'Casa destacada', h.destacada)}</div>
        </div>
      </form>`;
    actions.innerHTML = `<button type="button" class="btn-secondary" id="btn-close-house-editor">Cerrar</button><button type="button" class="btn-primary" id="btn-save-house">Guardar casa</button>`;
    document.getElementById('btn-close-house-editor')?.addEventListener('click', () => modal.classList.remove('active'));
    document.getElementById('btn-save-house')?.addEventListener('click', () => saveHouse(id));
  }

  async function saveHouse(id) {
    const client = getClient();
    const button = document.getElementById('btn-save-house');
    if (!client || !button) return;
    const payload = {
      codigo: val('casa-codigo') || null, nombre: val('casa-nombre'), descripcion: val('casa-descripcion') || null,
      superficie_m2: numberOrNull('casa-superficie'), habitaciones: numberOrNull('casa-habitaciones'), banos: numberOrNull('casa-banos'),
      precio_base: numberOrNull('casa-precio'), tipo_construccion: val('casa-tipo') || null, plano_url: val('casa-plano') || null,
      empresa: val('casa-empresa') || null, tiempo_entrega: val('casa-tiempo') || null,
      imagen_principal_url: val('casa-imagen') || null, imagenes: csv('casa-imagenes'), activa: bool('casa-activa'), destacada: bool('casa-destacada')
    };
    if (!payload.nombre || payload.superficie_m2 == null || payload.habitaciones == null || payload.banos == null || payload.precio_base == null) {
      return alert('Completa nombre, superficie, habitaciones, baños y precio.');
    }
    button.disabled = true;
    const { error } = await client.rpc('crm_guardar_casa_admin', { p_casa_id: id, p_datos: payload });
    button.disabled = false;
    if (error) return alert(`No se pudo guardar: ${error.message}`);
    document.getElementById('modal-detalle')?.classList.remove('active');
    await loadHouses();
  }

  async function loadExtras() {
    const client = getClient();
    const body = document.getElementById('table-body-extras');
    if (!client || !body) return;
    body.innerHTML = '<tr><td colspan="6">Cargando catálogo…</td></tr>';
    const { data, error } = await client.rpc('crm_listar_extras_admin');
    if (error) {
      console.error('Error cargando extras:', error);
      body.innerHTML = '<tr><td colspan="6" class="error-msg">Aplica primero la migración del catálogo canónico.</td></tr>';
      return;
    }
    body.innerHTML = (data || []).map((item) => `<tr>
      <td><strong>${esc(item.nombre)}</strong><br><small>${esc(item.codigo || '')}</small></td>
      <td>${esc(item.categoria)}</td><td>${esc(item.tipo_calculo)}</td><td>${money(item.precio_base)}</td>
      <td><span class="badge ${item.activo ? 'aprobada' : 'rechazada'}">${item.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td><button class="btn-action" data-edit-extra="${esc(item.id)}">Editar</button></td>
    </tr>`).join('') || '<tr><td colspan="6">No hay extras registrados.</td></tr>';
    body.querySelectorAll('[data-edit-extra]').forEach((button) => button.addEventListener('click', () => {
      const item = (data || []).find((row) => row.id === button.dataset.editExtra);
      openExtraEditor(item);
    }));
  }

  function openExtraEditor(item = null) {
    const modal = document.getElementById('modal-detalle');
    const content = document.getElementById('modal-content');
    const actions = document.getElementById('modal-actions');
    if (!modal || !content || !actions) return;
    const x = item || { categoria: 'opcional', tipo_calculo: 'unidad', activo: true, cantidad_default: 1, cantidad_minima: 1, cantidad_maxima: 1 };
    modal.classList.add('active');
    content.innerHTML = `<form class="catalog-form"><div class="catalog-section-title"><h3>${item ? 'Editar' : 'Nuevo'} extra o fundación</h3></div><div class="catalog-grid">
      ${field('extra-codigo','Código',x.codigo,'text','required')}${field('extra-nombre','Nombre',x.nombre,'text','required')}
      ${field('extra-categoria','Categoría (opcional/fundacion)',x.categoria)}${field('extra-calculo','Tipo de cálculo',x.tipo_calculo)}
      ${field('extra-precio','Precio base',x.precio_base,'number','min="0" required')}${field('extra-unidad','Unidad',x.unidad)}
      ${field('extra-empresa','Empresa',x.empresa)}${field('extra-aplica','Aplica a (casa/parcela)',x.aplica_a)}
      ${field('extra-default','Cantidad predeterminada',x.cantidad_default,'number','min="0"')}${field('extra-min','Cantidad mínima',x.cantidad_minima,'number','min="0"')}
      ${field('extra-max','Cantidad máxima',x.cantidad_maxima,'number','min="0"')}${textarea('extra-descripcion','Descripción',x.descripcion,4)}
      <div class="catalog-span-2 catalog-check-row">${checkbox('extra-activo','Activo',x.activo)}</div>
    </div></form>`;
    actions.innerHTML = '<button type="button" class="btn-secondary" id="btn-close-extra">Cerrar</button><button type="button" class="btn-primary" id="btn-save-extra">Guardar</button>';
    document.getElementById('btn-close-extra')?.addEventListener('click', () => modal.classList.remove('active'));
    document.getElementById('btn-save-extra')?.addEventListener('click', () => saveExtra(item?.id || null));
  }

  async function saveExtra(id) {
    const client = getClient();
    const button = document.getElementById('btn-save-extra');
    const payload = {
      codigo: val('extra-codigo'), nombre: val('extra-nombre'), descripcion: val('extra-descripcion') || null,
      categoria: val('extra-categoria') || 'opcional', tipo_calculo: val('extra-calculo') || 'unidad',
      precio_base: numberOrNull('extra-precio'), unidad: val('extra-unidad') || null, empresa: val('extra-empresa') || null,
      aplica_a: val('extra-aplica') || null, cantidad_default: numberOrNull('extra-default') ?? 1,
      cantidad_minima: numberOrNull('extra-min') ?? 1, cantidad_maxima: numberOrNull('extra-max') ?? 1, activo: bool('extra-activo')
    };
    if (!client || !button || !payload.codigo || !payload.nombre || payload.precio_base == null) return alert('Completa código, nombre y precio.');
    button.disabled = true;
    const { error } = await client.rpc('crm_guardar_extra_admin', { p_extra_id: id, p_datos: payload });
    button.disabled = false;
    if (error) return alert(`No se pudo guardar: ${error.message}`);
    document.getElementById('modal-detalle')?.classList.remove('active');
    await loadExtras();
  }

  function init() {
    window.verDetalle = openParcelEditor;
    document.getElementById('btn-refresh-casas')?.addEventListener('click', loadHouses);
    document.getElementById('btn-new-house')?.addEventListener('click', () => openHouseEditor());
    document.querySelector('[data-target="view-casas"]')?.addEventListener('click', loadHouses);
    document.getElementById('btn-refresh-extras')?.addEventListener('click', loadExtras);
    document.getElementById('btn-new-extra')?.addEventListener('click', () => openExtraEditor());
    document.querySelector('[data-target="view-extras"]')?.addEventListener('click', loadExtras);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
