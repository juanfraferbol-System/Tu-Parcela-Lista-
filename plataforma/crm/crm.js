document.addEventListener("DOMContentLoaded", () => {
  // Inicializar Supabase
  const supabase = window.supabase.createClient(
    window.TPL_SUPABASE_CONFIG.url,
    window.TPL_SUPABASE_CONFIG.anonKey
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
    if (publicacionesCache.length === 0) {
      DOM.tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No hay publicaciones en este estado.</td></tr>`;
      return;
    }
    
    DOM.tableBody.innerHTML = publicacionesCache.map(p => `
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
          <span>${pub.moneda} ${pub.precio.toLocaleString('es-CL')}</span>
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
          <strong>Descripción</strong>
          <p>${pub.descripcion || 'Sin descripción'}</p>
        </div>
      </div>
      <div class="detail-fotos">
        ${fotos.map(f => `<img src="${f.url_storage}" alt="Foto" loading="lazy">`).join('')}
      </div>
    `;
    
    DOM.modalContent.innerHTML = html;
    
    if (pub.estado === 'pendiente_revision' || pub.estado === 'requiere_cambios') {
      DOM.modalActions.innerHTML = `
        <button class="btn-secondary" onclick="window.solicitarCambios('${pub.id}')">Pedir Corrección</button>
        <button class="btn-danger" onclick="window.rechazar('${pub.id}')">Rechazar</button>
        <button class="btn-success" onclick="window.aprobar('${pub.id}')">Aprobar Publicación</button>
      `;
    } else {
      DOM.modalActions.innerHTML = `<button class="btn-secondary" onclick="document.getElementById('btn-close-modal').click()">Cerrar</button>`;
    }
  };

  const closeModalDetalle = () => DOM.modalDetalle.classList.remove('active');
  DOM.btnCloseDetalle.addEventListener("click", closeModalDetalle);

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
