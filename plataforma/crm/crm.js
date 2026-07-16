document.addEventListener("DOMContentLoaded", () => {
  // Inicializar Supabase
  const supabase = window.supabase.createClient(
    'https://qxavbqhyqaqalpzbhwmh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXZicWh5cWFxYWxwemJod21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA'
  );

  // Elementos DOM
  const DOM = {
    loginView: document.getElementById("login-view"),
    dashboardView: document.getElementById("dashboard-view"),
    loginForm: document.getElementById("login-form"),
    loginError: document.getElementById("login-error"),
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
    
    // Cierres de modales
    btnCloseDetalle: document.getElementById("btn-close-modal"),
    btnCloseFeedback: document.getElementById("btn-close-feedback"),
    btnCancelFeedback: document.getElementById("btn-cancel-feedback"),
    btnConfirmFeedback: document.getElementById("btn-confirm-feedback")
  };

  lucide.createIcons();

  let sessionUser = null;
  let publicacionesCache = [];
  let currentAction = null; // { id, action: 'rechazar' | 'requiere_cambios' }

  // 1. Autenticación
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Verificar si es admin activo
      const { data, error } = await supabase.rpc('crm_sesion_actual');
      if (error || !data || data.length === 0) {
        await supabase.auth.signOut();
        showLogin("Tu cuenta no tiene privilegios de administrador.");
      } else {
        sessionUser = data[0];
        showDashboard();
      }
    } else {
      showLogin();
    }
  };

  const showLogin = (errorMsg = "") => {
    DOM.loginView.classList.add("active");
    DOM.dashboardView.style.display = "none";
    DOM.loginError.innerText = errorMsg;
  };

  const showDashboard = () => {
    DOM.loginView.classList.remove("active");
    DOM.dashboardView.style.display = "flex";
    DOM.userName.innerText = sessionUser.nombre;
    loadData();
  };

  DOM.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const btn = document.getElementById("btn-login");
    
    btn.disabled = true;
    btn.innerText = "Verificando...";
    DOM.loginError.innerText = "";
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      DOM.loginError.innerText = "Credenciales incorrectas.";
      btn.disabled = false;
      btn.innerText = "Ingresar al Sistema";
    } else {
      checkAuth();
    }
  });

  DOM.btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });

  // 2. Carga de Datos
  const loadData = async () => {
    loadMetrics();
    loadTable();
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
        <td>${new Date(p.creado_en).toLocaleDateString('es-CL')}</td>
        <td><strong>${p.propiedad}</strong><br><small style="color:var(--text-muted)">${p.codigo_publico}</small></td>
        <td>${p.corredor || 'No indicado'}</td>
        <td>${p.comuna}</td>
        <td>${p.plan}</td>
        <td><span class="${getBadgeClass(p.estado)}">${p.estado.replace('_', ' ')}</span></td>
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

  const closeModalDetalle = () => DOM.modalDetalle.classList.remove('active');
  DOM.btnCloseDetalle.addEventListener("click", closeModalDetalle);

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
  
  DOM.btnCloseFeedback.addEventListener("click", closeFeedback);
  DOM.btnCancelFeedback.addEventListener("click", closeFeedback);

  DOM.btnConfirmFeedback.addEventListener("click", async () => {
    const motivo = DOM.feedbackMotivo.value.trim();
    if (!motivo) {
      DOM.feedbackError.innerText = "Debes ingresar un motivo.";
      return;
    }
    
    DOM.btnConfirmFeedback.disabled = true;
    
    const { error } = await supabase.rpc('crm_moderar_publicacion', {
      p_publicacion_id: currentAction.id,
      p_accion: currentAction.action,
      p_motivo: motivo
    });
    
    DOM.btnConfirmFeedback.disabled = false;
    
    if (!error) {
      closeFeedback();
      closeModalDetalle();
      loadData();
    } else {
      DOM.feedbackError.innerText = "Error de red al procesar.";
    }
  });

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
  
  const { data, error } = await window.supabase.from('contratistas').select('*').order('created_at', { ascending: false });
  
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
  const filtered = filter ? contratistasCache.filter(c => c.estado === filter) : contratistasCache;
  
  if (filtered.length === 0) {
    domContratistas.tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay contratistas.</td></tr>';
    return;
  }
  
  filtered.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${c.nombre || 'Sin nombre'}</strong></td>
      <td>${c.ubicacion_base || '-'}</td>
      <td>${c.actividad_especialidad || '-'}</td>
      <td>${c.telefono || '-'}</td>
      <td>${c.estrellas_calificacion ? c.estrellas_calificacion + ' ★' : '-'}</td>
      <td><span class="preview-badge" style="background:${c.estado === 'Activo' ? '#dcfce7' : '#f1f5f9'}; color:${c.estado === 'Activo' ? '#166534' : '#475569'};">${c.estado || 'Inactivo'}</span></td>
      <td>
        <button class="btn-primary-submit" style="padding: 6px 12px; font-size:0.8rem;" onclick="window.open('https://wa.me/${c.telefono}', '_blank')"><i data-lucide="message-circle" style="width:14px;"></i> Chat</button>
      </td>
    `;
    domContratistas.tableBody.appendChild(tr);
  });
  if(window.lucide) window.lucide.createIcons();
}

// Cargar Cotizaciones y Smart Match
async function loadCotizaciones() {
  if (!domCotizaciones.tableBody) return;
  domCotizaciones.tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando cotizaciones...</td></tr>';
  
  const { data, error } = await window.supabase.from('cotizaciones_proyectos').select('*').order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error al cargar cotizaciones:", error);
    domCotizaciones.tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar.</td></tr>';
    return;
  }
  
  // Si no tenemos contratistas cargados aún, los necesitamos para el Smart Match
  if (contratistasCache.length === 0) {
    const res = await window.supabase.from('contratistas').select('*').eq('estado', 'Activo');
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
        if (cont.ubicacion_base && cont.ubicacion_base.toLowerCase().includes(comuna)) score += 50;
        if (cont.estrellas_calificacion) score += (cont.estrellas_calificacion * 5); // Hasta 25 ptos
        cont._tempScore = score;
      });
      mejoresMatch.sort((a,b) => (b._tempScore || 0) - (a._tempScore || 0));
    }
    
    const topMatch = mejoresMatch.length > 0 ? mejoresMatch[0] : null;
    const matchHtml = topMatch 
      ? `<div style="font-size:0.8rem; background:#f0fdf4; padding:8px; border-radius:8px; border:1px solid #bbf7d0;">
          <strong>Sugerido: ${topMatch.nombre}</strong><br>
          <span style="color:#166534">${topMatch.ubicacion_base || 'Sin zona'} • ${topMatch.estrellas_calificacion || 0}★</span><br>
          <button onclick="window.open('https://wa.me/${topMatch.telefono}?text=Hola ${encodeURIComponent(topMatch.nombre)}, tengo un proyecto en ${encodeURIComponent(c.parcela_comuna)} que podría interesarte.', '_blank')" style="margin-top:4px; padding:4px 8px; font-size:0.75rem; background:#25D366; color:#fff; border:none; border-radius:4px; cursor:pointer;">Contactar</button>
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

// Interceptar la navegación para cargar datos la primera vez
document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    const targetId = item.getAttribute('data-target');
    if (targetId === 'view-contratistas' && contratistasCache.length === 0) loadContratistas();
    if (targetId === 'view-cotizaciones' && cotizacionesCache.length === 0) loadCotizaciones();
  });
});
