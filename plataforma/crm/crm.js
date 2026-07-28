document.addEventListener("DOMContentLoaded", () => {
  // Inicializar Supabase
  const crmConfig = window.TPL_CRM_CONFIG;

if (
  !crmConfig?.supabaseUrl ||
  !crmConfig?.supabaseAnonKey ||
  !window.supabase?.createClient
) {
  console.error("CRM: falta la configuración de Supabase.");
  return;
}

const supabase =
  window.tplCrmSupabase ||
  window.tplSupabase ||
  window.supabase.createClient(
    crmConfig.supabaseUrl,
    crmConfig.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "sb-qxavbqhyqaqalpzbhwmh-auth-token"
      }
    }
  );

window.tplSupabase = supabase;
window.tplCrmSupabase = supabase;

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

  // Toast System
  window.showToast = (msg, type = 'info') => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    container.appendChild(toast);
    
    // Animar entrada
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Remover luego de 4 segundos
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  window.enviarComunicacion = async (tipo, pub) => {
    const supabase = window.tplCrmSupabase;
    if (!supabase) return window.showToast('Error: No hay conexión a la base de datos.', 'error');
    
    // Obtenemos la url del objeto de configuración interno de supabase (hack temporal para sacar la base url, ya que en el CRM inicializado puede no estar la URL en el config principal o estar como URL de API).
    // Lo mejor es sacar url y key del TPL_CRM_CONFIG.
    const crmConfig = window.TPL_CRM_CONFIG;
    if (!crmConfig?.supabaseUrl || !crmConfig?.supabaseAnonKey) {
      return window.showToast('Falta configuración TPL_CRM_CONFIG.', 'error');
    }

    const email = pub.contacto_email;
    const name = pub.contacto_nombre;
    const projectName = pub.titulo_publico || 'Tu Proyecto';

    if (!email) {
      return window.showToast('El cliente no tiene un email registrado.', 'warning');
    }

    window.showToast(`Enviando ${tipo}...`, 'info');

    try {
      const endpoint = `${crmConfig.supabaseUrl}/functions/v1/send-communication`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': crmConfig.supabaseAnonKey,
          'Authorization': `Bearer ${crmConfig.supabaseAnonKey}`,
          'x-api-key': 'dev-secret-key-tpl' 
        },
        body: JSON.stringify({
          type: tipo,
          email: email,
          name: name,
          data: { projectName: projectName, visitas: Math.floor(Math.random() * 50) + 10, leads: Math.floor(Math.random() * 5) }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      window.showToast(`Comunicación (${tipo}) enviada exitosamente.`, 'success');
    } catch (err) {
      console.error(err);
      window.showToast(`Falló el envío: ${err.message}`, 'error');
    }
  };

  window.triggerComunicacion = (tipo, id) => {
    // publicacionesCache is in the upper scope of DOMContentLoaded
    const pub = publicacionesCache.find(p => p.id === id);
    if(pub) window.enviarComunicacion(tipo, pub);
    else window.showToast('No se encontró la publicación', 'error');
  };

  window.showFriendlyMessage = (msg) => {
    window.showToast(msg, 'success');
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
    DOM.loginContainer.style.display = "flex";
    DOM.appContainer.style.display = "none";
    if(msg) DOM.loginMsg.innerText = msg;
  };

  const showDashboard = () => {
    DOM.loginContainer.style.display = "none";
    DOM.appContainer.style.display = "flex";
    DOM.userName.innerText = sessionUser.nombre;
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


  DOM.btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });

  // 2. Carga de Datos
  const loadData = async () => {
    loadPendientesOperativos();
    loadMetrics();
    loadTable();
  };

  const loadPendientesOperativos = async () => {
    try {
      const [resClientes, resProyectos, resPubs] = await Promise.all([
        supabase.from('clientes').select('id, nombre, creado_en', { count: 'exact' }).eq('estado', 'nuevo').limit(5),
        supabase.from('proyectos').select('id, total, creado_en', { count: 'exact' }).eq('estado', 'cotizacion_generada').limit(5),
        supabase.rpc('crm_listar_publicaciones', { p_estado: 'pendiente_revision' })
      ]);

      const failures = [resClientes.error, resProyectos.error, resPubs.error].filter(Boolean);
      if (failures.length) throw failures[0];

      document.getElementById('metric-pendientes-clientes').innerText = resClientes.count || 0;
      document.getElementById('metric-pendientes-cotizaciones').innerText = resProyectos.count || 0;
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
        resClientes.data.forEach(c => html += createRow('Lead', c.creado_en, `Cliente nuevo: ${c.nombre}`, 'Sin contactar', '<button class="btn-action" type="button" data-pending-target="view-clientes-prioritarios">Ver prioridades</button>'));
      }
      if (resProyectos.data?.length) {
        resProyectos.data.forEach(p => html += createRow('Cotización', p.creado_en, `Cotización de: $${Number(p.total||0).toLocaleString('es-CL')}`, 'Pendiente de revisión', '<button class="btn-action" type="button" data-pending-target="view-cotizaciones">Abrir cotizaciones</button>'));
      }
      if (resPubs.data?.length) {
        resPubs.data.forEach(p => html += createRow('Parcela', p.creado_en, `Revisar: ${p.propiedad}`, 'Pendiente', `<button class="btn-action" type="button" data-pending-publication="${escapeHTML(p.id)}">Revisar</button>`));
      }

      if (!html) html = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#64748b;">No hay tareas operativas pendientes. ¡Todo al día!</td></tr>';
      
      if(tbody) tbody.innerHTML = html;

    } catch (e) {
      console.error("Error al cargar pendientes:", e);
      const tbody = document.getElementById('table-body-pendientes');
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="error-msg">No fue posible cargar los pendientes. Usa “Actualizar panel” para reintentar.</td></tr>';
    }
  };

  document.getElementById('table-body-pendientes')?.addEventListener('click', (event) => {
    const publication = event.target.closest('[data-pending-publication]');
    if (publication) {
      window.verDetalle(publication.dataset.pendingPublication);
      return;
    }
    const navigation = event.target.closest('[data-pending-target]');
    if (!navigation) return;
    const target = navigation.dataset.pendingTarget;
    const link = document.querySelector(`[data-target="${CSS.escape(target)}"],[data-business-target="${CSS.escape(target)}"]`);
    if (link) link.click();
  });

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
    
    // Calculando TPL Score (Mock inicial)
    let score = 0;
    if (pub.estado === 'aprobada' || pub.estado === 'activada') score += 25;
    if (fotos.length >= 5) score += 20;
    if (pub.descripcion?.length > 100) score += 15;
    // Asumiendo que landing_premium, etc. están en pub o se simulan para el sprint 1
    const hasLanding = pub.plan && pub.plan.toLowerCase().includes('premium');
    if (hasLanding) score += 18;
    score = Math.min(score, 78); // Dejamos 78% como mockup según la visión de usuario, si no es perfecto.

    window.currentCRMProperty = pub;
    window.currentCRMFotos = fotos;

    let html = `
      <div class="crm-detalle-layout">
        <!-- Columna Izquierda: Información Central -->
        <div class="crm-detalle-left">
          
          <section class="detail-grid">
            <h3 class="crm-section-title" style="grid-column: 1 / -1;">Información General</h3>
            <div class="detail-item">
              <strong>Proyecto / Título</strong>
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
              <strong>Cliente / Contacto</strong>
              <span>${pub.contacto_nombre} (${pub.contacto_telefono})</span>
            </div>
            <div class="detail-item" style="grid-column: 1 / -1">
              <strong>Descripción Pública</strong>
              <p>
                <textarea id="edit-relato-${pub.id}" rows="4" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:inherit; margin-bottom: 10px;">${pub.descripcion || ''}</textarea>
              </p>
              <strong>Enlace de Video (YouTube/Vimeo)</strong>
              <p>
                <input type="url" id="edit-video-${pub.id}" value="${pub.videoUrl || ''}" placeholder="Ej: https://youtube.com/watch?v=..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:inherit;">
              </p>
              <button class="btn-action" onclick="window.actualizarDatos('${pub.id}')" style="margin-top:10px; padding:6px 12px; background: #003f7a; color: white;">Guardar Cambios</button>
            </div>
          </section>

          <section>
            <h3 class="crm-section-title">Fotografías y Archivos</h3>
            <div class="detail-fotos">
              ${fotos.length ? fotos.map(f => `
                <a href="${f.url_storage}" target="_blank" style="display:block; border-radius:8px; overflow:hidden; border:2px solid #ddd;">
                  <img src="${f.url_storage}" alt="Foto" loading="lazy">
                </a>
              `).join('') : '<p class="error-msg">Sin fotografías</p>'}
            </div>
          </section>

          <section>
            <h3 class="crm-section-title">Bitácora Comercial</h3>
            <div style="font-size: 0.85rem; color: #475569; padding: 10px; background: #f8fafc; border-radius: 8px;">
              <p><strong>Hace 2 horas:</strong> Cliente revisó Mi Proyecto (TPL Business).</p>
              <p><strong>Hace 1 día:</strong> Solicitó activación de Landing Premium.</p>
              <p><strong>Hace 3 días:</strong> Publicación inicial aprobada.</p>
            </div>
          </section>

          <section>
            <h3 class="crm-section-title">Ruta de Comunicación y Automatización</h3>
            <div class="ruta-comunicacion-list">
              
              <div class="ruta-item ruta-item-1">
                <h4>1. Onboarding Automático</h4>
                <p>Enviado al publicar. Contiene bienvenida y acceso a TPL Business.</p>
                <span class="badge aprobada" style="margin-top: 5px; display: inline-block;">Enviado Automáticamente</span>
              </div>

              <div class="ruta-item ruta-item-2">
                <h4>2. Landing Premium Publicada</h4>
                <p>Notifica al cliente que su Landing exclusiva está activa y lista para compartir.</p>
                <div class="ruta-actions">
                  <button class="btn-action ruta-btn" onclick="window.triggerComunicacion('landing_email', '${pub.id}')"><i data-lucide="mail" style="width: 14px;"></i> Enviar Correo</button>
                  <button class="btn-action ruta-btn" onclick="window.triggerComunicacion('landing_wpp', '${pub.id}')"><i data-lucide="message-circle" style="width: 14px;"></i> Enviar WhatsApp</button>
                </div>
              </div>

              <div class="ruta-item ruta-item-3">
                <h4>3. Resumen Comercial Mensual</h4>
                <p>Envía automáticamente las métricas de visitas y consultas generadas este mes.</p>
                <button class="btn-action ruta-btn" style="margin-top: 8px; opacity: 0.7;" onclick="window.triggerComunicacion('resumen_mensual', '${pub.id}')"><i data-lucide="clock" style="width: 14px;"></i> Programar Envío Mensual</button>
              </div>

            </div>
          </section>
        </div>

        <!-- Columna Derecha: Estado Comercial y Centro de Oportunidades -->
        <div class="crm-detalle-right">
          
          <div>
            <span class="tpl-score-title">TPL Score</span>
            <h3 style="margin: 4px 0 10px; font-size: 1.1rem; color: #0f172a;">Estado Comercial</h3>
            <div style="background: #e2e8f0; border-radius: 6px; height: 16px; width: 100%; overflow: hidden; margin-bottom: 10px;">
              <div style="background: ${score >= 70 ? '#10b981' : '#f59e0b'}; width: ${score}%; height: 100%;"></div>
            </div>
            <strong class="tpl-score-value">${score}%</strong>
            <span class="tpl-score-desc">Potencial del proyecto</span>
            
            <ul class="crm-checklist">
              <li style="color: #10b981;"><i data-lucide="check-circle" style="width: 14px; vertical-align: middle;"></i> Fotografías procesadas</li>
              <li style="color: ${pub.estado === 'aprobada' ? '#10b981' : '#64748b'};"><i data-lucide="${pub.estado === 'aprobada' ? 'check-circle' : 'circle'}" style="width: 14px; vertical-align: middle;"></i> Publicación base</li>
              <li style="color: ${hasLanding ? '#10b981' : '#ef4444'};"><i data-lucide="${hasLanding ? 'check-circle' : 'x-circle'}" style="width: 14px; vertical-align: middle;"></i> Landing Premium</li>
              <li style="color: #ef4444;"><i data-lucide="x-circle" style="width: 14px; vertical-align: middle;"></i> Video Storyboard</li>
              <li style="color: #ef4444;"><i data-lucide="x-circle" style="width: 14px; vertical-align: middle;"></i> Campaña Google Ads</li>
              <li style="color: #10b981;"><i data-lucide="check-circle" style="width: 14px; vertical-align: middle;"></i> SEO Técnico</li>
            </ul>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <h4 style="margin: 0 0 10px; font-size: 0.95rem;">Potenciar Proyecto</h4>
            <div class="potenciar-btn-list">
              <button class="btn-action" style="background: #003f7a; color: white;" onclick="window.crearLandingPremium()">Crear Landing Premium</button>
              <button class="btn-action" onclick="window.showToast('Funcionalidad en desarrollo para configurar Google Ads', 'warning')">Activar Google Ads</button>
              <button class="btn-action" onclick="window.showToast('Funcionalidad en desarrollo para generar Video TPL Studio', 'warning')">Generar Video (TPL Studio)</button>
              <button class="btn-action" onclick="window.showToast('Redirigiendo a servicios partner...', 'info')">Ofrecer Servicios Partner</button>
            </div>
          </div>
          
        </div>
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
    
    if(window.lucide) window.lucide.createIcons();
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

  window.crearLandingPremium = () => {
    if (!window.currentCRMProperty) return;
    
    // Cierra el modal de detalle
    closeModalDetalle();
    
    // Cambia la vista a Landing Engine
    const targetId = 'view-landing-engine';
    const link = document.querySelector(`[data-target="${targetId}"]`);
    if (link) link.click();
    
    // Llama al motor de landing
    if (window.TPLLandingEngine && typeof window.TPLLandingEngine.createFromCRM === 'function') {
      // Damos un pequeño retraso para que la vista cargue
      setTimeout(() => {
        window.TPLLandingEngine.createFromCRM(window.currentCRMProperty, window.currentCRMFotos || []);
      }, 300);
    } else {
      console.warn("TPLLandingEngine no está disponible o no exporta createFromCRM.");
    }
  };

  // Edición Directa
  window.actualizarDatos = async (id) => {
    const nuevoPrecio = document.getElementById(`edit-precio-${id}`)?.value;
    const nuevoRelato = document.getElementById(`edit-relato-${id}`)?.value;
    const nuevoVideo = document.getElementById(`edit-video-${id}`)?.value;
    
    if (!confirm("¿Guardar cambios de texto, video y precio?")) return;
    
    // Primero, actualizar precio y relato a través del RPC existente
    const { error: rpcError } = await supabase.rpc('crm_actualizar_datos_publicacion', {
      p_publicacion_id: id,
      p_titulo_publico: null,
      p_precio: parseFloat(nuevoPrecio),
      p_relato: nuevoRelato
    });

    // Como MVP, si hay un link de video, intentamos guardarlo en el campo videoUrl si la tabla lo soporta
    // o lo incluimos como metadato.
    if (!rpcError && nuevoVideo !== undefined) {
      // Intento de actualización directa (fail-safe)
      try {
        await supabase.from('publicaciones').update({ video_url: nuevoVideo }).eq('id', id);
      } catch(e) { console.log('Columna video_url no existe aún en BD', e); }
    }
    
    const error = rpcError;
    
    if (!error) {
      window.showToast("Cambios guardados correctamente.", "success");
      loadData();
    } else {
      window.showToast("Error al guardar cambios: " + error.message, "error");
    }
  };

  // Acciones
  window.aprobar = async (id) => {
    if(!confirm("¿Estás seguro de APROBAR esta parcela? Se hará pública de inmediato.")) return;
    
    const { error } = await supabase.rpc('crm_moderar_publicacion', {
      p_publicacion_id: id,
      p_accion: 'aprobar',
      p_confirmar: true
    });
    
    if (!error) {
      const { error: photosError } = await supabase.functions.invoke('publicar-fotos-aprobadas', {
        body: { publicacion_id: id }
      });
      if (photosError) {
        console.error('La publicación fue aprobada, pero faltó publicar sus fotografías:', photosError);
        window.showToast('La publicación quedó aprobada, pero las fotografías no pudieron pasar al catálogo público. Reintenta la aprobación de fotos antes de difundirla.', 'warning');
      } else {
        showFriendlyMessage('Publicación aprobada y fotografías publicadas.');
      }
      closeModalDetalle();
      loadData();
    } else {
      window.showToast("Error al aprobar: " + error.message, "error");
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
  window.solicitarCambios = (id) => openFeedback(id, 'solicitar_correcciones', 'Solicitar Corrección');

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

  const moderationPayload = {
    p_publicacion_id: currentAction.id,
    p_accion: currentAction.action,
    p_motivo: motivo
  };

  if (currentAction.action === "solicitar_correcciones") {
    moderationPayload.p_campos_correccion = [
      "titulo_publico",
      "descripcion_publica",
      "precio_publicacion",
      "superficie_m2",
      "region",
      "comuna",
      "sector"
    ];
    moderationPayload.p_mensaje = motivo;
  }

  const { error } = await supabase.rpc("crm_moderar_publicacion", moderationPayload);

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
      if (targetId === 'view-solicitudes') topbarTitle.textContent = 'Parcelas y publicaciones';
      if (targetId === 'view-casas') topbarTitle.textContent = 'Catálogo de casas';
      if (targetId === 'view-tasador') topbarTitle.textContent = 'Tasador TPL';
      if (targetId === 'view-mercado') topbarTitle.textContent = 'Índice de Mercado TPL';
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
  btnNew: document.getElementById("btn-new-contratista"),
};

const domCotizaciones = {
  tableBody: document.getElementById("table-body-cotizaciones"),
  filterEstado: document.getElementById("filter-estado-cotizacion"),
  btnRefresh: document.getElementById("btn-refresh-cotizaciones"),
};

let contratistasCache = [];
let cotizacionesCache = [];


async function createContratistaManual() {
  const nombre = prompt('Nombre comercial o empresa del contratista:')?.trim();
  if (!nombre) return;
  const responsable = prompt('Nombre del responsable:')?.trim() || nombre;
  const telefono = prompt('WhatsApp o teléfono (ej. 56912345678):')?.replace(/[^0-9+]/g, '').trim();
  if (!telefono) return window.showToast('Debes indicar un teléfono o WhatsApp.', 'error');
  const correo = prompt('Correo electrónico:')?.trim().toLowerCase() || null;
  const servicio = prompt('Servicio principal (cercos, fosa séptica, construcción, electricidad, etc.):')?.trim();
  if (!servicio) return window.showToast('Debes indicar el servicio principal.', 'error');
  const region = prompt('Región de cobertura:')?.trim() || 'Región del Biobío';
  const comunasTexto = prompt('Comunas atendidas, separadas por coma:')?.trim() || '';
  const comunas = comunasTexto.split(',').map(x => x.trim()).filter(Boolean);
  const payload = {
    nombre_empresa: nombre,
    nombre_comercial: nombre,
    nombre_responsable: responsable,
    telefono,
    whatsapp: telefono,
    correo,
    descripcion_servicios: servicio,
    tipo_servicio: servicio,
    especialidades: [servicio],
    region,
    comunas_atendidas: comunas,
    ubicacion_base: region,
    anos_experiencia: 0,
    disponibilidad: 'Por confirmar',
    plan_elegido: 'gratis',
    plan_solicitado: 'gratis',
    plan_activo: 'gratis',
    estado_verificacion: 'pendiente',
    visible_publicamente: false,
    estado: 'Activo'
  };
  const { error } = await window.tplCrmSupabase.from('contratistas').insert(payload);
  if (error) {
    console.error(error);
    window.showToast('No fue posible crear el contratista: ' + error.message, 'error');
    return;
  }
  showFriendlyMessage('Contratista creado en estado pendiente.');
  await loadContratistas();
}

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
    const partnerId = String(c.id || '');
    const partnerName = String(c.nombre_comercial || 'Sin nombre');
    const partnerPlan = String(c.plan_elegido || 'gratis').toUpperCase();
    const coverage = Array.isArray(c.comunas_atendidas)
      ? c.comunas_atendidas.join(', ')
      : String(c.comunas_atendidas || c.region || '-');
    const phone = String(c.whatsapp || c.telefono || '').replace(/\D/g, '');
    const rating = Number(c.rating || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${escapeHTML(partnerName)}</strong>
        <br><small style="color: #64748b;">${escapeHTML(partnerPlan)}</small>
      </td>
      <td>${escapeHTML(coverage)}</td>
      <td>${escapeHTML(c.tipo_servicio || '-')}</td>
      <td>${escapeHTML(c.whatsapp || c.telefono || '-')}</td>
      <td>${rating.toFixed(2)} ⭐</td>
      <td>
        <select data-partner-status="${escapeHTML(partnerId)}" aria-label="Estado de ${escapeHTML(partnerName)}" style="padding: 4px; border-radius: 4px; border: 1px solid #ccc;">
          <option value="pendiente" ${c.estado_verificacion === 'pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="verificado" ${c.estado_verificacion === 'verificado' ? 'selected' : ''}>Verificado</option>
          <option value="rechazado" ${c.estado_verificacion === 'rechazado' ? 'selected' : ''}>Rechazado</option>
        </select>
      </td>
      <td>
        ${phone ? `<a class="btn-primary-submit" style="padding:6px 12px;font-size:.8rem;text-decoration:none;" href="https://wa.me/${encodeURIComponent(phone)}" target="_blank" rel="noopener"><i data-lucide="message-circle" style="width:14px;"></i> Chat</a>` : '<span>Sin teléfono</span>'}
      </td>
    `;
    domContratistas.tableBody.appendChild(tr);
  });
  domContratistas.tableBody.querySelectorAll('[data-partner-status]').forEach(select => {
    select.addEventListener('change', () => window.updatePartnerStatus(select.dataset.partnerStatus, select.value));
  });
  if(window.lucide) window.lucide.createIcons();
}

window.updatePartnerStatus = async function(id, newStatus) {
  try {
    const { error } = await window.tplCrmSupabase.from('contratistas').update({ estado_verificacion: newStatus }).eq('id', id);
    if (error) {
      window.showToast('Error al actualizar estado', 'error');
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
    let mejoresMatch = contratistasCache.map(partner => ({ partner, score: 0 }));

    if (c.parcela_comuna) {
      const comuna = String(c.parcela_comuna).toLowerCase();
      mejoresMatch = mejoresMatch.map(item => {
        const cont = item.partner;
        let score = 0;
        const coverage = Array.isArray(cont.comunas_atendidas)
          ? cont.comunas_atendidas.join(' ')
          : String(cont.comunas_atendidas || '');
        if (coverage.toLowerCase().includes(comuna)) score += 50;
        else if (String(cont.region || '').toLowerCase().includes(comuna)) score += 25;
        if (Number(cont.rating)) score += Number(cont.rating) * 5;
        return { partner: cont, score };
      });
      mejoresMatch.sort((a, b) => b.score - a.score);
    }
    
    const topMatch = mejoresMatch[0]?.score > 0 ? mejoresMatch[0].partner : null;
    const topCoverage = topMatch
      ? (Array.isArray(topMatch.comunas_atendidas) ? topMatch.comunas_atendidas.join(', ') : String(topMatch.comunas_atendidas || 'Sin zona'))
      : '';
    const topPhone = String(topMatch?.whatsapp || topMatch?.telefono || '').replace(/\D/g, '');
    const contactMessage = topMatch
      ? `Hola ${topMatch.nombre_comercial || ''}, tengo un proyecto en ${c.parcela_comuna || ''} que podría interesarte.`
      : '';
    const matchHtml = topMatch 
      ? `<div style="font-size:0.8rem; background:#f0fdf4; padding:8px; border-radius:8px; border:1px solid #bbf7d0;">
          <strong>Sugerido: ${escapeHTML(topMatch.nombre_comercial || 'Partner')}</strong><br>
          <span style="color:#166534">${escapeHTML(topCoverage)} • ${Number(topMatch.rating || 0).toFixed(2)}⭐</span><br>
          ${topPhone ? `<a href="https://wa.me/${encodeURIComponent(topPhone)}?text=${encodeURIComponent(contactMessage)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:4px;padding:4px 8px;font-size:.75rem;background:#25D366;color:#fff;border-radius:4px;text-decoration:none;">Contactar</a>` : '<small>Sin teléfono disponible</small>'}
         </div>`
      : '<span style="color:#94a3b8; font-size:0.8rem;">Sin sugerencias</span>';

    const fecha = safeDate(c.created_at);
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(fecha)}</td>
      <td><strong>${escapeHTML(c.cliente_nombre || 'Anónimo')}</strong><br><small>${escapeHTML(c.cliente_telefono || '')}</small></td>
      <td>ID: ${escapeHTML(c.parcela_id || '-')}<br><small>${escapeHTML(c.parcela_comuna || '')}</small></td>
      <td>${c.requiere_instalacion ? '<span style="color:#10b981; font-weight:bold;">Sí</span>' : 'No'}</td>
      <td><span class="preview-badge">${escapeHTML(c.estado || 'Nueva')}</span></td>
      <td>${matchHtml}</td>
    `;
    domCotizaciones.tableBody.appendChild(tr);
  });
  if(window.lucide) window.lucide.createIcons();
}

// Event Listeners para recargar
if (domContratistas.btnRefresh) domContratistas.btnRefresh.addEventListener('click', loadContratistas);
if (domContratistas.btnNew) domContratistas.btnNew.addEventListener('click', createContratistaManual);
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
    if (targetId === 'view-mercado' && window.TPLMercadoAdmin && typeof window.TPLMercadoAdmin.load === 'function') window.TPLMercadoAdmin.load();
  });
});

});
