document.addEventListener("DOMContentLoaded", () => {
  // Cliente Supabase único para todos los módulos del CRM.
  const supabase = window.TPL_getSupabaseClient?.();

  if (!supabase) {
    console.error('CRM: Supabase no está disponible o falta crm-config.js.');
    return;
  }

  const DOM = {
    loginContainer: document.getElementById("login-container"),
    appContainer: document.getElementById("app-container"),
    loginForm: document.getElementById("login-form"),
    loginEmail: document.getElementById("login-email"),
    loginPassword: document.getElementById("login-password"),
    btnLogin: document.getElementById("btn-login"),
    loginMsg: document.getElementById("login-msg"),
    
    btnLogout: document.getElementById("btn-logout"),
    userName: document.getElementById("user-name-display"),
    
    // Métricas
    mPendientes: document.getElementById("metric-pendientes"),
    mCorregir: document.getElementById("metric-corregir"),
    mAprobadas: document.getElementById("metric-aprobadas"),
    mRechazadas: document.getElementById("metric-rechazadas"),
    
    // Tabla
    tableBody: document.getElementById("table-body"),
    filterEstado: document.getElementById("filter-estado"),
    btnRefresh: document.getElementById("btn-refresh"),
    
    // Modales
    modalDetalle: document.getElementById("modal-detalle"),
    modalFeedback: document.getElementById("modal-feedback"),
    modalContent: document.getElementById("modal-content"),
    modalActions: document.getElementById("modal-actions"),
    feedbackTitle: document.getElementById("feedback-title"),
    feedbackMotivo: document.getElementById("feedback-motivo"),
    feedbackError: document.getElementById("feedback-error"),
    
    // Formularios y Botones
    inputFeedback: document.getElementById("input-feedback"),
    btnConfirmFeedback: document.getElementById("btn-confirm-feedback"),
    btnCancelFeedback: document.getElementById("btn-cancel-feedback"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    btnCloseDetalle: document.getElementById("btn-close-modal")
  };

  let sessionUser = null;
  let publicacionesCache = [];
  let itemToProcess = null; // ID de la publicacion
  let newStatusProcess = null; // "Aprobada", "Corregir", "Rechazada"

  const escapeHTML = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const safeDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleDateString('es-CL');
  };

  // 1. Inicialización y Auth
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { data: profileRows, error: profileError } = await supabase.rpc('crm_sesion_actual');
      const profile = profileRows?.[0];

      if (!profileError && profile?.tipo === 'administrador') {
        sessionUser = { nombre: profile.nombre || session.user.email };
        showDashboard();
      } else {
        await supabase.auth.signOut();
        showLogin("Acceso denegado. No tienes rol de administrador.");
      }
    } else {
      showLogin();
    }
  };

  const showLogin = (msg = "") => {
    if (DOM.loginContainer) DOM.loginContainer.style.display = "flex";
    if (DOM.appContainer) DOM.appContainer.style.display = "none";
    if (DOM.loginMsg) DOM.loginMsg.innerText = msg;
  };

  const showDashboard = () => {
    if (DOM.loginContainer) DOM.loginContainer.style.display = "none";
    if (DOM.appContainer) DOM.appContainer.style.display = "flex";
    if (DOM.userName) DOM.userName.innerText = sessionUser?.nombre || "Administrador";
    loadData();
  };

DOM.loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = DOM.loginEmail?.value.trim();
  const password = DOM.loginPassword?.value;

  if (!email || !password) {
    DOM.loginMsg.innerText = "Ingresa tu correo y contraseña.";
    return;
  }

  DOM.btnLogin.disabled = true;
  DOM.btnLogin.innerText = "Verificando...";
  DOM.loginMsg.innerText = "";

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Error de ingreso:", error);
    DOM.loginMsg.innerText = "Credenciales incorrectas o acceso no autorizado.";
    DOM.btnLogin.disabled = false;
    DOM.btnLogin.innerText = "Ingresar";
    return;
  }

  await checkAuth();
});


  DOM.btnLogout?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });

  // 2. Carga de Datos
  const loadData = async () => {
    const results = await Promise.allSettled([
      loadPendientesOperativos(),
      loadMetrics(),
      loadTable()
    ]);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.error('CRM: error cargando módulo:', result.reason);
      }
    });
  };

  const loadPendientesOperativos = async () => {
    // Simularemos la recolección de los datos de "Pendientes"
    // En producción se haría con endpoints RPC o conteos
    try {
      // Clientes Nuevos
      const resClientes = await supabase.from('clientes').select('id, nombre, creado_en', { count: 'exact' }).eq('estado', 'nuevo').limit(5);
      document.getElementById('metric-pendientes-clientes').innerText = resClientes.count || 0;
      
      // Proyectos/Cotizaciones
      const resProyectos = await supabase.from('proyectos').select('id, total, creado_en, estado', { count: 'exact' }).in('estado', ['cotizacion_generada', 'cotizacion_enviada']).limit(5);
      document.getElementById('metric-pendientes-cotizaciones').innerText = resProyectos.count || 0;

      // Publicaciones por revisar
      const resPubs = await supabase.rpc('crm_listar_publicaciones', { p_estado: 'pendiente_revision' });
      document.getElementById('metric-pendientes-publicaciones').innerText = resPubs.data?.length || 0;

      const tbody = document.getElementById('table-body-pendientes');
      let html = '';

      const createRow = (tipo, fecha, desc, estado, accion) => `
        <tr>
          <td><span class="badge ${tipo.toLowerCase()}">${tipo}</span></td>
          <td>${safeDate(fecha)}</td>
          <td>${escapeHTML(desc)}</td>
          <td>${escapeHTML(estado)}</td>
          <td>${accion}</td>
        </tr>
      `;

      if (resClientes.data?.length) {
        resClientes.data.forEach(c => html += createRow('Lead', c.creado_en, `Cliente Nuevo: ${c.nombre}`, 'Sin contactar', `<button class="btn-action" onclick="alert('Funcionalidad próxima: Abrir Ficha')">Ver</button>`));
      }
      if (resProyectos.data?.length) {
        resProyectos.data.forEach(p => html += createRow('Cotización', p.creado_en, `Cotización de: $${Number(p.total||0).toLocaleString('es-CL')}`, 'Huérfana', `<button class="btn-action">Revisar</button>`));
      }
      if (resPubs.data?.length) {
        resPubs.data.forEach(p => html += createRow('Parcela', p.creado_en, `Revisar: ${escapeHTML(p.propiedad)}`, 'Pendiente', `<button class="btn-action" onclick="window.verDetalle('${p.id}')">Revisar</button>`));
      }

      if (!html) html = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#64748b;">No hay tareas operativas pendientes. ¡Todo al día!</td></tr>';
      
      if(tbody) tbody.innerHTML = html;

    } catch (e) {
      console.error("Error al cargar pendientes:", e);
    }
  };

  const loadMetrics = async () => {
    const { data, error } = await supabase.rpc('crm_contadores_publicaciones');
    if (!error && data) {
      DOM.mPendientes.innerText = data.pendientes || 0;
      DOM.mCorregir.innerText = data.requieren_correccion || 0;
      DOM.mAprobadas.innerText = data.aprobadas || 0;
      DOM.mRechazadas.innerText = data.rechazadas || 0;
    }
  };

  const loadTable = async () => {
    DOM.tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Cargando publicaciones...</td></tr>`;
    
    const estadoFiltro = DOM.filterEstado.value || null;
    
    const { data, error } = await supabase.rpc('crm_listar_publicaciones', {
      p_estado: estadoFiltro
    });
    
    if (error) {
      console.error(error);
      DOM.tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger)">Error al cargar datos.</td></tr>`;
      return;
    }
    
    publicacionesCache = data || [];
    renderTable();
  };

  const getBadgeClass = (estado) => {
    switch(estado) {
      case 'pendiente_revision': return 'badge pendiente';
      case 'requiere_cambios': return 'badge correccion';
      case 'aprobada': return 'badge aprobada';
      case 'rechazada': return 'badge rechazada';
      default: return 'badge';
    }
  };

  const renderTable = () => {
    let filtradas = publicacionesCache;
    const q = document.getElementById('search-input')?.value.toLowerCase().trim();
    if (q) {
      filtradas = filtradas.filter(p => 
        (p.propiedad && p.propiedad.toLowerCase().includes(q)) ||
        (p.codigo_publico && p.codigo_publico.toLowerCase().includes(q)) ||
        (p.comuna && p.comuna.toLowerCase().includes(q)) ||
        (p.corredor && p.corredor.toLowerCase().includes(q))
      );
    }
    
    if (filtradas.length === 0) {
      DOM.tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No hay publicaciones que coincidan.</td></tr>`;
      return;
    }
    
    DOM.tableBody.innerHTML = filtradas.map(p => `
      <tr>
        <td>${safeDate(p.creado_en)}</td>
        <td><strong>${escapeHTML(p.propiedad)}</strong><br><small style="color:var(--text-muted)">${escapeHTML(p.codigo_publico)}</small></td>
        <td>${escapeHTML(p.corredor || 'No indicado')}</td>
        <td>${escapeHTML(p.comuna)}</td>
        <td>${escapeHTML(p.plan)}</td>
        <td><span class="${getBadgeClass(p.estado)}">${escapeHTML(String(p.estado || '').replace('_', ' '))}</span></td>
        <td>
          <button class="btn-action" onclick="window.verDetalle('${p.id}')">Ver Detalle</button>
        </td>
      </tr>
    `).join('');
  };

  DOM.filterEstado.addEventListener("change", loadTable);
  document.getElementById('search-input')?.addEventListener('input', renderTable);
  DOM.btnRefresh.addEventListener("click", loadData);

  // 3. Detalle y Moderación
  window.verDetalle = async (id) => {
    DOM.modalContent.innerHTML = `<p>Cargando detalle...</p>`;
    DOM.modalActions.innerHTML = '';
    DOM.modalDetalle.classList.add('active');
    
    const { data, error } = await supabase.rpc('crm_detalle_publicacion', { p_publicacion_id: id });
    if (error || !data) {
      DOM.modalContent.innerHTML = `<p class="error-msg">Error al cargar la publicación.</p>`;
      return;
    }
    
    const pub = data.publicacion;
    const fotos = data.fotos || [];
    
    let html = `
      <div class="detail-grid">
        <div class="detail-item">
          <strong>Título</strong>
          <span>${pub.titulo_publico}</span>
        </div>
        <div class="detail-item">
          <strong>Precio</strong>
          <span style="display:flex; gap:8px; align-items:center;">
            ${pub.moneda} 
            <input type="number" id="edit-precio-${pub.id}" value="${pub.precio}" style="width:120px; padding:4px; border:1px solid #ccc; border-radius:4px;">
            <button class="btn-action" onclick="window.actualizarPrecio('${pub.id}')" style="padding:4px 8px;">Guardar</button>
          </span>
        </div>
        <div class="detail-item">
          <strong>Comuna</strong>
          <span>${pub.comuna}</span>
        </div>
        <div class="detail-item">
          <strong>Contacto</strong>
          <span>${pub.contacto_nombre} (${pub.contacto_telefono})</span>
        </div>
        <div class="detail-item" style="grid-column: 1 / -1">
          <strong>Categorías e IA</strong>
          <div id="crm-categories-display" style="padding:10px; background:#f0f4f8; border-radius:8px; font-size:14px; color:#2c3e50;">
            ${pub.datos_parcela?.categorias ? 
              Object.entries(pub.datos_parcela.categorias)
                .map(([cat, score]) => `<span style="display:inline-block; margin-right:15px;"><b>${cat.toUpperCase()}:</b> ${score} pts</span>`)
                .join('') 
              : 'Sin categorizar'}
          </div>
        </div>
        <div class="detail-item" style="grid-column: 1 / -1">
          <strong>Descripción</strong>
          <p>
            <textarea id="edit-relato-${pub.id}" rows="5" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:inherit;">${pub.descripcion || ''}</textarea>
          </p>
          <button class="btn-action" onclick="window.actualizarDatos('${pub.id}')" style="margin-top:5px; padding:6px 12px;">Guardar Cambios de Texto y Precio</button>
        </div>
      </div>
      <div class="detail-fotos" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 15px;">
        ${fotos.length ? fotos.map(f => `
          <a href="${f.url_storage}" target="_blank" style="display:block; border-radius:8px; overflow:hidden; border:2px solid #ddd;">
            <img src="${f.url_storage}" alt="Foto" loading="lazy" style="width:100%; height:120px; object-fit:cover; display:block;">
          </a>
        `).join('') : '<p>Sin fotografías</p>'}
      </div>
    `;
    
    DOM.modalContent.innerHTML = html;
    
    if (pub.estado === 'pendiente_revision' || pub.estado === 'requiere_cambios') {
      DOM.modalActions.innerHTML = `
        <button class="btn-secondary" onclick="window.solicitarCambios('${pub.id}')">Pedir Corrección</button>
        <button class="btn-danger" onclick="window.rechazar('${pub.id}')">Rechazar</button>
        <button class="btn-success" onclick="window.aprobar('${pub.id}')">Aprobar Publicación</button>
        ${getContactButtons(pub)}
      `;
    } else {
      DOM.modalActions.innerHTML = `
        <button class="btn-secondary" onclick="document.getElementById('btn-close-modal').click()">Cerrar</button>
        ${getContactButtons(pub)}
      `;
    }
  };

  const getContactButtons = (pub) => {
    const telefono = pub.contacto_telefono ? pub.contacto_telefono.replace(/[^0-9]/g, '') : '';
    const email = pub.contacto_email || '';
    const name = pub.contacto_nombre || 'Cliente';
    
    let wppUrl = telefono ? `https://wa.me/${telefono}?text=Hola ${encodeURIComponent(name)}, te escribimos de Tu Parcela Lista sobre tu publicación "${encodeURIComponent(pub.titulo_publico)}"` : '#';
    let mailUrl = email ? `mailto:${email}?subject=Sobre tu publicación en Tu Parcela Lista&body=Hola ${encodeURIComponent(name)},%0D%0ATe escribimos sobre tu publicación "${encodeURIComponent(pub.titulo_publico)}".` : '#';
    
    return `
      <a href="${wppUrl}" target="_blank" class="btn-action" style="background:#25D366; color:white; padding:8px 15px; border-radius:5px; text-decoration:none; margin-left:10px;"><i data-lucide="message-circle" style="width:16px; height:16px; vertical-align:middle; margin-right:5px;"></i> WhatsApp</a>
      <a href="${mailUrl}" target="_blank" class="btn-action" style="background:#0078D4; color:white; padding:8px 15px; border-radius:5px; text-decoration:none; margin-left:5px;"><i data-lucide="mail" style="width:16px; height:16px; vertical-align:middle; margin-right:5px;"></i> Correo</a>
    `;
  };

const closeModalDetalle = () => {
  DOM.modalDetalle?.classList.remove('active');
};

DOM.btnCloseDetalle?.addEventListener("click", closeModalDetalle);

  // Edición Directa
  window.actualizarDatos = async (id) => {
    const nuevoPrecio = document.getElementById(`edit-precio-${id}`)?.value;
    const nuevoRelato = document.getElementById(`edit-relato-${id}`)?.value;
    
    if (!confirm("¿Guardar cambios de texto y precio?")) return;
    
    const { error } = await supabase.rpc('crm_actualizar_datos_publicacion', {
      p_publicacion_id: id,
      p_titulo_publico: null, // Si quisieramos editar el título, podemos agregarlo después. Por ahora solo pasamos relato y precio
      p_precio: parseFloat(nuevoPrecio),
      p_relato: nuevoRelato
    });
    
    if (!error) {
      alert("Cambios guardados correctamente.");
      loadData();
    } else {
      alert("Error al guardar cambios: " + error.message);
    }
  };

  // Acciones
  window.aprobar = async (id) => {
    if(!confirm("¿Estás seguro de APROBAR esta parcela? Se hará pública de inmediato.")) return;
    
    const { error } = await supabase.rpc('crm_moderar_publicacion', {
      p_publicacion_id: id,
      p_accion: 'aprobar'
    });
    
    if (!error) {
      closeModalDetalle();
      loadData();
    } else {
      alert("Error al aprobar.");
    }
  };

  const openFeedback = (id, action, title) => {
    currentAction = { id, action };
    DOM.feedbackTitle.innerText = title;
    DOM.feedbackMotivo.value = "";
    DOM.feedbackError.innerText = "";
    DOM.modalFeedback.classList.add("active");
  };

  window.rechazar = (id) => openFeedback(id, 'rechazar', 'Rechazar Publicación');
  window.solicitarCambios = (id) => openFeedback(id, 'requiere_cambios', 'Solicitar Corrección');

  const closeFeedback = () => {
    DOM.modalFeedback.classList.remove("active");
    currentAction = null;
  };
  
DOM.btnCancelFeedback?.addEventListener("click", closeFeedback);

DOM.btnConfirmFeedback?.addEventListener("click", async () => {

  const motivo = DOM.feedbackMotivo?.value.trim();

  if (!motivo) {
    if (DOM.feedbackError) {
      DOM.feedbackError.innerText = "Debes ingresar un motivo.";
    }
    return;
  }

  DOM.btnConfirmFeedback.disabled = true;

  const { error } = await supabase.rpc("crm_moderar_publicacion", {
    p_publicacion_id: currentAction.id,
    p_accion: currentAction.action,
    p_motivo: motivo
  });

  DOM.btnConfirmFeedback.disabled = false;

  if (error) {
    console.error(error);

    if (DOM.feedbackError) {
      DOM.feedbackError.innerText = error.message;
    }

    return;
  }

  closeFeedback();
  closeModalDetalle();
  loadData();

  // Iniciar
  checkAuth();
});


// --- NAVEGACIÓN CRM ---
const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
const dashboardSections = document.querySelectorAll('.dashboard-section');

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Quitar active de todos los links
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
    
    // Ocultar todas las secciones
    dashboardSections.forEach(sec => sec.style.display = 'none');
    
    // Mostrar la sección correspondiente
    const targetId = item.getAttribute('data-target');
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      targetSection.style.display = 'block';
    }

    // Actualizar el título de la barra superior
    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle) {
      if (targetId === 'view-solicitudes') topbarTitle.textContent = 'Moderación de Publicaciones';
      if (targetId === 'view-tasador') topbarTitle.textContent = 'Tasador TPL';
      if (targetId === 'view-cotizaciones') topbarTitle.textContent = 'Cotizaciones y Smart Match';
      if (targetId === 'view-contratistas') topbarTitle.textContent = 'Gestión de Contratistas';
    }
  });
});


// ============================================================================
// MODULO CONTRATISTAS Y SMART MATCH
// ============================================================================

// Elementos DOM Nuevos
const domContratistas = {
  tableBody: document.getElementById("table-body-contratistas"),
  filterEstado: document.getElementById("filter-estado-contratista"),
  btnRefresh: document.getElementById("btn-refresh-contratistas"),
};

const domCotizaciones = {
  tableBody: document.getElementById("table-body-cotizaciones"),
  filterEstado: document.getElementById("filter-estado-cotizacion"),
  btnRefresh: document.getElementById("btn-refresh-cotizaciones"),
};

let contratistasCache = [];
let cotizacionesCache = [];

// Cargar Contratistas
async function loadContratistas() {
  if (!domContratistas.tableBody) return;
  domContratistas.tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando contratistas...</td></tr>';
  
  const { data, error } = await window.tplCrmSupabase.from('contratistas').select('*').order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error al cargar contratistas:", error);
    domContratistas.tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error al cargar.</td></tr>';
    return;
  }
  
  contratistasCache = data;
  renderContratistas();
}

function renderContratistas() {
  if (!domContratistas.tableBody) return;
  domContratistas.tableBody.innerHTML = '';
  
  const filter = domContratistas.filterEstado ? domContratistas.filterEstado.value : '';
  const filtered = filter ? contratistasCache.filter(c => c.estado_verificacion === filter) : contratistasCache;
  
  if (filtered.length === 0) {
    domContratistas.tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay partners.</td></tr>';
    return;
  }
  
  filtered.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${c.nombre_comercial || 'Sin nombre'}</strong>
        <br><small style="color: #64748b;">${c.plan_elegido ? c.plan_elegido.toUpperCase() : 'GRATIS'}</small>
      </td>
      <td>${c.comunas_atendidas || c.region || '-'}</td>
      <td>${c.tipo_servicio || '-'}</td>
      <td>${c.whatsapp || c.telefono || '-'}</td>
      <td>${c.rating ? c.rating + ' ⭐' : '0.00 ⭐'}</td>
      <td>
        <select onchange="updatePartnerStatus('${c.id}', this.value)" style="padding: 4px; border-radius: 4px; border: 1px solid #ccc;">
          <option value="pendiente" ${c.estado_verificacion === 'pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="verificado" ${c.estado_verificacion === 'verificado' ? 'selected' : ''}>Verificado</option>
          <option value="rechazado" ${c.estado_verificacion === 'rechazado' ? 'selected' : ''}>Rechazado</option>
        </select>
      </td>
      <td>
        <button class="btn-primary-submit" style="padding: 6px 12px; font-size:0.8rem;" onclick="window.open('https://wa.me/${c.whatsapp || c.telefono}', '_blank')"><i data-lucide="message-circle" style="width:14px;"></i> Chat</button>
      </td>
    `;
    domContratistas.tableBody.appendChild(tr);
  });
  if(window.lucide) window.lucide.createIcons();
}

window.updatePartnerStatus = async function(id, newStatus) {
  try {
    const { error } = await window.tplCrmSupabase.from('contratistas').update({ estado_verificacion: newStatus }).eq('id', id);
    if (error) {
      alert('Error al actualizar estado');
      console.error(error);
    } else {
      const idx = contratistasCache.findIndex(c => c.id === id);
      if(idx > -1) contratistasCache[idx].estado_verificacion = newStatus;
      showFriendlyMessage('Estado de partner actualizado a: ' + newStatus);
    }
  } catch(e) {
    console.error(e);
  }
}

// Cargar Cotizaciones y Smart Match
async function loadCotizaciones() {
  if (!domCotizaciones.tableBody) return;
  domCotizaciones.tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando cotizaciones...</td></tr>';
  
  const { data:projectRows, error } = await window.tplCrmSupabase.from('proyectos').select('id,creado_en,estado,total,modalidad,parcela_id,clientes(nombre,telefono),publicaciones(comuna)').order('creado_en', { ascending: false });
  const data=(projectRows||[]).map(project=>({id:project.id,created_at:project.creado_en,estado:project.estado,parcela_id:project.parcela_id,parcela_comuna:project.publicaciones?.comuna||'',cliente_nombre:project.clientes?.nombre||'',cliente_telefono:project.clientes?.telefono||'',requiere_instalacion:project.modalidad==='llave_en_mano',total:project.total}));
  
  if (error) {
    console.error("Error al cargar cotizaciones:", error);
    domCotizaciones.tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar.</td></tr>';
    return;
  }
  
  // Si no tenemos contratistas cargados aún, los necesitamos para el Smart Match
  if (contratistasCache.length === 0) {
    const res = await window.tplCrmSupabase.from('contratistas').select('*').eq('estado_verificacion', 'verificado');
    if (!res.error) contratistasCache = res.data;
  }
  
  cotizacionesCache = data;
  renderCotizaciones();
}

function renderCotizaciones() {
  if (!domCotizaciones.tableBody) return;
  domCotizaciones.tableBody.innerHTML = '';
  
  const filter = domCotizaciones.filterEstado ? domCotizaciones.filterEstado.value : '';
  const filtered = filter ? cotizacionesCache.filter(c => c.estado === filter) : cotizacionesCache;
  
  if (filtered.length === 0) {
    domCotizaciones.tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay cotizaciones.</td></tr>';
    return;
  }
  
  filtered.forEach(c => {
    // Calcular Smart Match (lógica básica)
    let mejoresMatch = [...contratistasCache];
    
    // 1. Filtrar por cercanía (muy básico)
    if (c.parcela_comuna) {
      const comuna = c.parcela_comuna.toLowerCase();
      mejoresMatch.forEach(cont => {
        let score = 0;
        if (cont.comunas_atendidas && cont.comunas_atendidas.toLowerCase().includes(comuna)) score += 50;
        else if (cont.region && cont.region.toLowerCase().includes(comuna)) score += 25; // fallback
        if (cont.rating) score += (cont.rating * 5); // Hasta 25 ptos
        cont._tempScore = score;
      });
      mejoresMatch.sort((a,b) => (b._tempScore || 0) - (a._tempScore || 0));
    }
    
    const topMatch = mejoresMatch.length > 0 && mejoresMatch[0]._tempScore > 0 ? mejoresMatch[0] : null;
    const matchHtml = topMatch 
      ? `<div style="font-size:0.8rem; background:#f0fdf4; padding:8px; border-radius:8px; border:1px solid #bbf7d0;">
          <strong>Sugerido: ${topMatch.nombre_comercial}</strong><br>
          <span style="color:#166534">${topMatch.comunas_atendidas || 'Sin zona'} • ${topMatch.rating || 0}⭐</span><br>
          <button onclick="window.open('https://wa.me/${topMatch.whatsapp || topMatch.telefono}?text=Hola ${encodeURIComponent(topMatch.nombre_comercial)}, tengo un proyecto en ${encodeURIComponent(c.parcela_comuna)} que podría interesarte.', '_blank')" style="margin-top:4px; padding:4px 8px; font-size:0.75rem; background:#25D366; color:#fff; border:none; border-radius:4px; cursor:pointer;">Contactar</button>
         </div>`
      : '<span style="color:#94a3b8; font-size:0.8rem;">Sin sugerencias</span>';

    const fecha = new Date(c.created_at).toLocaleDateString();
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fecha}</td>
      <td><strong>${c.cliente_nombre || 'Anónimo'}</strong><br><small>${c.cliente_telefono || ''}</small></td>
      <td>ID: ${c.parcela_id || '-'}<br><small>${c.parcela_comuna || ''}</small></td>
      <td>${c.requiere_instalacion ? '<span style="color:#10b981; font-weight:bold;">Sí</span>' : 'No'}</td>
      <td><span class="preview-badge">${c.estado || 'Nueva'}</span></td>
      <td>${matchHtml}</td>
    `;
    domCotizaciones.tableBody.appendChild(tr);
  });
  if(window.lucide) window.lucide.createIcons();
}

// Event Listeners para recargar
if (domContratistas.btnRefresh) domContratistas.btnRefresh.addEventListener('click', loadContratistas);
if (domContratistas.filterEstado) domContratistas.filterEstado.addEventListener('change', renderContratistas);
if (domCotizaciones.btnRefresh) domCotizaciones.btnRefresh.addEventListener('click', loadCotizaciones);
if (domCotizaciones.filterEstado) domCotizaciones.filterEstado.addEventListener('change', renderCotizaciones);

async function loadTasadorPanel(){
 const status=document.getElementById('tasador-admin-status'),tbody=document.getElementById('table-body-tasaciones');
 if(!window.tplCrmSupabase||!tbody)return;
 status.hidden=true;tbody.innerHTML='<tr><td colspan="7" class="launch-empty">Cargando tasaciones…</td></tr>';
 const [valuationResponse,configResponse]=await Promise.all([
  window.tplCrmSupabase.from('tasaciones').select('id,creada_en,precio_ingresado,valor_minimo,valor_mercado,valor_maximo,confianza,cobertura,decision_usuario,resumen_factores,datos_entrada').order('creada_en',{ascending:false}).limit(200),
  window.tplCrmSupabase.from('configuracion_tasador').select('version,algoritmo,parametros').eq('estado','activa').maybeSingle()
 ]);
 if(valuationResponse.error){status.hidden=false;status.textContent='El esquema del Tasador TPL todavía no está desplegado o tu sesión no tiene permisos.';tbody.innerHTML='<tr><td colspan="7" class="launch-empty">Sin datos disponibles.</td></tr>';return;}
 const rows=valuationResponse.data||[];
 document.getElementById('metric-tasaciones-total').textContent=rows.length;
 document.getElementById('metric-tasaciones-baja').textContent=rows.filter(row=>['experimental','informacion_insuficiente'].includes(row.cobertura)).length;
 document.getElementById('metric-tasaciones-fuera').textContent=rows.filter(row=>row.resumen_factores?.position==='sobre_el_rango').length;
 document.getElementById('metric-tasaciones-aceptadas').textContent=rows.filter(row=>row.decision_usuario==='adoptar_mercado').length;
 if(configResponse.data){document.getElementById('tasador-config-version').textContent=`${configResponse.data.version} · ${configResponse.data.algoritmo}`;const parameters=configResponse.data.parametros||{};document.getElementById('tasador-config-summary').textContent=`Mínimo ${parameters.comparables_minimos||'—'} comparables · cobertura limitada desde ${parameters.cobertura_limitada_desde||'—'} · máxima ${parameters.distancia_maxima_km||'—'} km geográficos.`;}
 tbody.replaceChildren();
 if(!rows.length){const row=tbody.insertRow();const cell=row.insertCell();cell.colSpan=7;cell.className='launch-empty';cell.textContent='Todavía no existen tasaciones.';return;}
 rows.forEach(item=>{const row=tbody.insertRow(),values=[new Date(item.creada_en).toLocaleDateString('es-CL'),item.datos_entrada?.comuna||'—',formatAdminMoney(item.precio_ingresado),item.valor_minimo&&item.valor_maximo?`${formatAdminMoney(item.valor_minimo)} – ${formatAdminMoney(item.valor_maximo)}`:'Información insuficiente',item.confianza,item.cobertura,item.decision_usuario||'sin_decision'];values.forEach(value=>{const cell=row.insertCell();cell.textContent=String(value??'—');});});
}

function formatAdminMoney(value){return Number(value||0).toLocaleString('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});}
document.getElementById('btn-refresh-tasador')?.addEventListener('click',loadTasadorPanel);

// Interceptar la navegación para cargar datos la primera vez
document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    const targetId = item.getAttribute('data-target');
    if (targetId === 'view-contratistas' && contratistasCache.length === 0) loadContratistas();
    if (targetId === 'view-cotizaciones' && cotizacionesCache.length === 0) loadCotizaciones();
    if (targetId === 'view-tasador') loadTasadorPanel();
  });
});

});
