(function (window, document) {
  'use strict';

  const config = window.tplBusiness;
  const auth = window.TPLBusinessAuth;
  const service = window.TPLBusinessService;
  const root = document.getElementById('tpl-business-app');
  const state = {
    portalSession: null,
    project: null,
    adminPreview: false,
    lastDialogTrigger: null,
    authSubscription: null,
    loading: false
  };

  const icons = {
    building: '<path d="M3 21h18M6 21V5l6-3 6 3v16M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01"></path>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path>',
    check: '<path d="m5 12 4 4L19 6"></path>',
    close: '<path d="M18 6 6 18M6 6l12 12"></path>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 9v12"></path>',
    logout: '<path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6"></path>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"></path>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5A8 8 0 1 1 21 15Z"></path>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92z"></path>',
    spark: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"></path><path d="m5 15 .8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8z"></path>',
    target: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="4"></circle><path d="m15 9 6-6"></path>',
    user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
    window: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18"></path>'
  };

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function icon(name) {
    return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.spark}</svg>`;
  }

  function formatDate(value, includeTime) {
    if (!value) return 'Sin datos todavía';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin datos todavía';
    return new Intl.DateTimeFormat('es-CL', includeTime
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' }).format(date);
  }

  function formatMoney(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(Number(value));
  }

  function statusLabel(value) {
    return ({
      activo: 'Activo',
      disponible: 'Disponible',
      pendiente: 'Pendiente',
      proximamente: 'Próximamente',
      no_contratado: 'No contratado',
      preparacion: 'En preparación',
      pausado: 'Pausado',
      ganado: 'Vendido',
      perdido: 'Cerrado',
      cerrado: 'Cerrado',
      borrador: 'Borrador',
      publicada: 'Publicada',
      archivada: 'Archivada',
      solicitada: 'Solicitada',
      contactando: 'Contactando',
      aprobada: 'Aprobada',
      activada: 'Activada',
      rechazada: 'Rechazada'
    })[value] || String(value || 'Sin estado');
  }

  function statusTone(value) {
    if (['activo', 'publicada', 'activada', 'aprobada'].includes(value)) return 'active';
    if (['disponible', 'solicitada', 'contactando'].includes(value)) return 'available';
    if (['pendiente', 'borrador', 'preparacion'].includes(value)) return 'pending';
    if (['proximamente', 'no_contratado', 'archivada'].includes(value)) return 'muted';
    return 'muted';
  }

  function setDocumentTitle(projectName) {
    document.title = projectName
      ? `${projectName} | Mi Proyecto`
      : 'Mi Proyecto | TPL Business';
  }

  function renderEntry(title, message, error) {
    root.innerHTML = `<main class="tpl-entry-state${error ? ' is-error' : ''}" aria-live="polite">
      ${error ? `<div class="tpl-entry-icon">${icon('building')}</div>` : '<div class="tpl-entry-spinner" aria-hidden="true"></div>'}
      <h1>${esc(title)}</h1>
      <p>${esc(message)}</p>
      ${error ? `<div class="tpl-entry-actions"><button class="tpl-button" type="button" data-retry>Intentar nuevamente</button>${state.portalSession ? '<button class="tpl-button tpl-button-secondary" type="button" data-logout>Cerrar sesión</button>' : ''}</div>` : ''}
    </main>`;
  }

  function renderLogin(message) {
    setDocumentTitle('');
    root.innerHTML = `<main class="tpl-auth-page" id="contenido">
      <section class="tpl-auth-copy">
        <a class="tpl-brand" href="/" aria-label="Tu Parcela Lista, inicio">
          <span class="tpl-brand-mark">TPL</span>
          <span><strong>${esc(config.brand.name)}</strong><small>${esc(config.brand.eyebrow)}</small></span>
        </a>
        <span class="tpl-kicker">Centro privado de clientes</span>
        <h1>Administra la venta de tu propiedad.</h1>
        <p>Revisa tu Landing Premium, resultados y próximos pasos desde una experiencia simple y segura.</p>
        <div class="tpl-auth-trust">${icon('check')}<span>Tus proyectos se identifican mediante tu cuenta. No utilizamos enlaces públicos para conceder acceso.</span></div>
      </section>
      <section class="tpl-auth-card" aria-labelledby="login-title">
        <span class="tpl-kicker">Mi Proyecto</span>
        <h2 id="login-title">Ingresa a TPL Business</h2>
        <p>Utiliza el correo asociado a tu proyecto.</p>
        <form id="tpl-login-form">
          <label>Correo electrónico<input name="email" type="email" autocomplete="email" required></label>
          <label>Contraseña<input name="password" type="password" autocomplete="current-password" minlength="8" required></label>
          <button class="tpl-button" type="submit">Ingresar</button>
          <p class="tpl-form-status${message ? ' is-error' : ''}" id="tpl-auth-status" role="status">${esc(message || '')}</p>
        </form>
        <button class="tpl-text-button" type="button" data-show-recovery>¿Olvidaste tu contraseña?</button>
        <a class="tpl-auth-back" href="/">Volver a Tu Parcela Lista</a>
      </section>
    </main>`;
  }

  function renderRecovery(mode, message) {
    const update = mode === 'update';
    root.innerHTML = `<main class="tpl-auth-page" id="contenido">
      <section class="tpl-auth-copy">
        <a class="tpl-brand" href="/" aria-label="Tu Parcela Lista, inicio">
          <span class="tpl-brand-mark">TPL</span><span><strong>${esc(config.brand.name)}</strong><small>Acceso seguro</small></span>
        </a>
        <span class="tpl-kicker">Recuperar acceso</span>
        <h1>${update ? 'Crea una nueva contraseña.' : 'Volvamos a tu proyecto.'}</h1>
        <p>${update ? 'Elige una contraseña segura para continuar.' : 'Te enviaremos un enlace seguro al correo asociado con tu cuenta.'}</p>
      </section>
      <section class="tpl-auth-card">
        <h2>${update ? 'Nueva contraseña' : 'Recuperar acceso'}</h2>
        <form id="${update ? 'tpl-password-form' : 'tpl-recovery-form'}">
          ${update
            ? '<label>Nueva contraseña<input name="password" type="password" autocomplete="new-password" minlength="10" required></label><label>Repetir contraseña<input name="confirmation" type="password" autocomplete="new-password" minlength="10" required></label>'
            : '<label>Correo electrónico<input name="email" type="email" autocomplete="email" required></label>'}
          <button class="tpl-button" type="submit">${update ? 'Guardar contraseña' : 'Enviar enlace seguro'}</button>
          <p class="tpl-form-status" id="tpl-auth-status" role="status">${esc(message || '')}</p>
        </form>
        <button class="tpl-text-button" type="button" data-show-login>Volver al ingreso</button>
      </section>
    </main>`;
  }

  function projectSelector() {
    const projects = state.portalSession?.projects || [];
    if (projects.length <= 1) return '';
    const selected = state.project?.project?.code;
    return `<label class="tpl-project-selector">Proyecto
      <select data-project-select>
        ${projects.map(project => `<option value="${esc(project.code)}"${project.code === selected ? ' selected' : ''}>${esc(project.name)}</option>`).join('')}
      </select>
    </label>`;
  }

  function renderLanding(landing) {
    if (!landing) {
      return `<section class="tpl-section tpl-landing-section" id="landing">
        <div class="tpl-empty-card"><span class="tpl-kicker">${esc(config.copy.landingKicker)}</span><h2>Landing aún no disponible</h2><p>El equipo comercial todavía no ha asociado una Landing a este proyecto.</p></div>
      </section>`;
    }

    const url = service.sanitizeLocalUrl(landing.publicUrl);
    const published = landing.status === 'publicada' && url;
    return `<section class="tpl-section tpl-landing-section" id="landing">
      <div class="tpl-section-heading">
        <div><span class="tpl-kicker">${esc(config.copy.landingKicker)}</span><h2>${esc(config.copy.landingTitle)}</h2></div>
        <p>Esta es la experiencia pública que reciben las personas interesadas. Su contenido permanece en la fuente publicada de Supabase.</p>
      </div>
      <article class="tpl-landing-card">
        <div class="tpl-landing-toolbar">
          <div>
            <span class="tpl-status-pill ${statusTone(landing.status)}"><i></i>${esc(statusLabel(landing.status))}</span>
            <strong>${esc(url || 'URL pendiente')}</strong>
            <small>Última publicación: ${esc(formatDate(landing.publishedAt, true))}</small>
          </div>
          <div class="tpl-preview-switch" aria-label="Tamaño de vista previa">
            <button type="button" class="active" data-preview-size="desktop" aria-pressed="true">Escritorio</button>
            <button type="button" data-preview-size="mobile" aria-pressed="false">Móvil</button>
          </div>
        </div>
        <div class="tpl-landing-preview" data-preview-frame>
          ${published
            ? `<iframe src="${esc(url)}" title="Vista previa de la Landing del proyecto" loading="lazy"></iframe>`
            : '<div class="tpl-preview-empty">La vista previa estará disponible cuando la Landing esté publicada.</div>'}
        </div>
        <div class="tpl-landing-actions">
          ${published
            ? `<a class="tpl-button" href="${esc(url)}">Ver mi Landing</a><a class="tpl-button tpl-button-secondary" href="${esc(url)}" target="_blank" rel="noopener">Abrir en una nueva pestaña ${icon('external')}</a>`
            : '<span class="tpl-inline-note">No existe una URL pública activa.</span>'}
        </div>
      </article>
    </section>`;
  }

  function renderStatus(modules) {
    const byCode = new Map((modules || []).map(item => [item.code, item]));
    const ordered = config.statusOrder.map(code => byCode.get(code)).filter(Boolean);
    return `<section class="tpl-section tpl-status-section" id="estado">
      ${sectionHeading('Mi Proyecto', config.copy.statusTitle, config.copy.statusDescription)}
      <div class="tpl-status-grid">${ordered.map(item => `
        <article class="tpl-status-card">
          <div class="tpl-status-icon">${icon(item.code === 'whatsapp' ? 'message' : item.code === 'google_ads' ? 'target' : item.code === 'landing_premium' ? 'layout' : 'window')}</div>
          <h3>${esc(item.name)}</h3>
          <span class="tpl-status-pill ${statusTone(item.status)}"><i></i>${esc(statusLabel(item.status))}</span>
        </article>`).join('')}</div>
    </section>`;
  }

  function metricCard(label, value, note) {
    const display = value === null || value === undefined ? 'Sin datos todavía' : String(value);
    return `<article class="tpl-metric-card"><span>${esc(label)}</span><strong class="${display.length > 8 ? 'is-text' : ''}">${esc(display)}</strong><small>${esc(note)}</small></article>`;
  }

  function renderMetrics(metrics) {
    return `<section class="tpl-section tpl-results-section" id="resultados">
      ${sectionHeading('Actividad comercial', config.copy.resultsTitle, config.copy.resultsDescription)}
      <div class="tpl-metrics-grid">
        ${metricCard('Consultas', metrics?.consultations, 'Formularios de información registrados')}
        ${metricCard('Visitas', metrics?.visitRequests, 'Solicitudes de visita registradas')}
        ${metricCard('WhatsApp', metrics?.whatsappClicks, 'Clics registrados desde la Landing')}
        ${metricCard('Leads únicos', metrics?.uniqueLeads, 'Oportunidades únicas del proyecto')}
        ${metricCard('Conversiones', metrics?.conversions, metrics?.definition || 'Sin definición disponible')}
        ${metricCard('Última actividad', metrics?.lastActivity ? formatDate(metrics.lastActivity, true) : null, 'Último evento comercial registrado')}
      </div>
    </section>`;
  }

  function list(items, emptyText) {
    if (!Array.isArray(items) || !items.length) return `<p class="tpl-inline-note">${esc(emptyText)}</p>`;
    return `<ul>${items.map(item => `<li>${icon('check')}<span>${esc(item)}</span></li>`).join('')}</ul>`;
  }

  function renderHealth(health) {
    const score = Number.isFinite(Number(health?.score)) ? Number(health.score) : null;
    const source = health?.source === 'manual'
      ? 'Evaluación manual del equipo comercial'
      : health?.source === 'calculada'
        ? 'Evaluación calculada'
        : 'Evaluación pendiente';
    return `<section class="tpl-section tpl-health-section" id="salud">
      ${sectionHeading('Oportunidades de mejora', config.copy.healthTitle, health?.summary || 'Evaluación pendiente.')}
      <div class="tpl-health-card">
        <div class="tpl-health-score">
          <div class="tpl-score-ring${score === null ? ' is-pending' : ''}" style="--tpl-score:${score === null ? 0 : score * 3.6}deg">
            <div><strong>${score === null ? '—' : `${score}%`}</strong><span>${esc(source)}</span></div>
          </div>
          <p>${score === null ? 'No mostraremos un porcentaje hasta que exista una evaluación configurada.' : 'Este valor orienta los próximos pasos y su fuente se indica de forma visible.'}</p>
        </div>
        <div class="tpl-health-list tpl-strengths"><h3>Fortalezas</h3>${list(health?.strengths, 'Aún no hay fortalezas registradas.')}</div>
        <div class="tpl-health-list tpl-opportunities"><h3>Oportunidades</h3>${list(health?.opportunities, 'Aún no hay oportunidades registradas.')}</div>
      </div>
    </section>`;
  }

  function renderGrowth(modules) {
    return `<section class="tpl-section tpl-growth-section" id="crecimiento">
      ${sectionHeading('Herramientas recomendadas', config.copy.growthTitle, config.copy.growthDescription)}
      <div class="tpl-growth-grid">${config.growthGroups.map((group, index) => {
        const tools = (modules || []).filter(module => module.group === group.id);
        return `<button class="tpl-growth-card" type="button" data-growth-group="${esc(group.id)}" aria-haspopup="dialog">
          <div class="tpl-group-icon">${icon(group.id === 'analizar' ? 'chart' : group.id === 'interesados' ? 'target' : group.id === 'organizar' ? 'user' : 'spark')}</div>
          <span class="tpl-group-number">0${index + 1}</span>
          <h3>${esc(group.title)}</h3><p>${esc(group.description)}</p>
          <div class="tpl-tool-list">${tools.map(tool => `<span>${esc(tool.name)}</span>`).join('')}</div>
          <span class="tpl-card-link">Explorar herramientas</span>
        </button>`;
      }).join('')}</div>
    </section>`;
  }

  function renderStages(health) {
    const current = health?.growthStage || 'comenzar';
    return `<section class="tpl-section tpl-stages-section" id="opciones">
      ${sectionHeading('Un camino simple', 'Etapas de crecimiento', 'Cada etapa fortalece una parte distinta de la venta de tu propiedad.')}
      <div class="tpl-stage-track">${config.growthStages.map((stage, index) => `
        <article class="tpl-stage-card${stage.id === current ? ' current' : ''}">
          <span>Etapa ${index + 1}</span><h3>${esc(stage.name)}</h3><p>${esc(stage.description)}</p>
          ${stage.id === current ? '<strong>Etapa actual</strong>' : ''}
        </article>`).join('')}</div>
    </section>`;
  }

  function renderPlans(plans) {
    return `<section class="tpl-section tpl-plans-section">
      ${sectionHeading('Crecimiento configurable', config.copy.plansTitle, 'Mostramos solamente opciones activas del catálogo comercial de TPL Business.')}
      ${Array.isArray(plans) && plans.length
        ? `<div class="tpl-plan-grid">${plans.map(plan => `
          <article class="tpl-plan-card">
            <span class="tpl-kicker">Opción de crecimiento</span><h3>${esc(plan.name)}</h3>
            <p>${esc(plan.goal || 'Consulta sus alcances con el equipo comercial.')}</p>
            ${list(plan.benefits, 'Los beneficios serán confirmados por el equipo comercial.')}
            ${plan.price !== null && plan.price !== undefined ? `<strong class="tpl-plan-price">${esc(formatMoney(plan.price))}</strong>` : '<span class="tpl-inline-note">Valor disponible previa evaluación</span>'}
            <button class="tpl-button" type="button" data-request-plan="${esc(plan.id)}">Solicitar activación</button>
          </article>`).join('')}</div>`
        : '<div class="tpl-empty-card"><h3>No hay planes públicos configurados todavía</h3><p>Las herramientas disponibles pueden solicitarse desde la sección anterior. No mostraremos nombres ni precios que no existan en el catálogo canónico.</p></div>'}
    </section>`;
  }

  function renderAdvisor(health) {
    const recommendations = Array.isArray(health?.recommendations) ? health.recommendations : [];
    return `<section class="tpl-section tpl-advisor-section">
      <div class="tpl-advisor-card">
        <div class="tpl-advisor-profile"><div class="tpl-advisor-icon">${icon('spark')}</div><span>${esc(config.copy.advisorLabel)}<small>Recomendaciones configuradas</small></span></div>
        <div class="tpl-advisor-copy"><span class="tpl-kicker">Próximos pasos</span><h2>${esc(config.copy.advisorTitle)}</h2><p>${esc(config.copy.advisorDescription)}</p></div>
        <div class="tpl-advisor-recommendations"><h3>Recomendaciones</h3>
          ${recommendations.length
            ? `<ul>${recommendations.map(item => `<li><span>${icon('check')}${esc(item)}</span><button type="button" data-request-recommendation="${esc(item)}">Solicitar esta mejora</button></li>`).join('')}</ul>`
            : '<p>No existen recomendaciones configuradas todavía.</p>'}
        </div>
      </div>
    </section>`;
  }

  function renderRequests(requests) {
    return `<section class="tpl-section tpl-requests-section" id="solicitudes">
      ${sectionHeading('Seguimiento', config.copy.requestsTitle, 'Revisa las mejoras y activaciones que has solicitado al equipo comercial.')}
      ${Array.isArray(requests) && requests.length
        ? `<div class="tpl-request-list">${requests.map(request => `
          <article>
            <div><span class="tpl-status-pill ${statusTone(request.status)}"><i></i>${esc(statusLabel(request.status))}</span>
              <h3>${esc(request.recommendation || request.moduleCode || 'Opción de crecimiento')}</h3>
              <small>${esc(formatDate(request.createdAt, true))}</small>
            </div>
          </article>`).join('')}</div>`
        : '<div class="tpl-empty-card"><h3>Aún no tienes solicitudes</h3><p>Cuando solicites una herramienta o recomendación podrás seguir su estado aquí.</p></div>'}
    </section>`;
  }

  function sectionHeading(kicker, title, description) {
    return `<div class="tpl-section-heading"><div><span class="tpl-kicker">${esc(kicker)}</span><h2>${esc(title)}</h2></div><p>${esc(description)}</p></div>`;
  }

  function renderApp() {
    const data = state.project;
    const project = data.project;
    const account = data.account;
    const user = state.portalSession.user || {};
    setDocumentTitle(account.name || project.name);

    root.innerHTML = `
      ${state.adminPreview ? '<aside class="tpl-admin-preview" role="status">Vista administrativa segura. Estás revisando la experiencia del cliente; las solicitudes están deshabilitadas.</aside>' : ''}
      <header class="tpl-header">
        <a class="tpl-brand" href="#inicio" aria-label="TPL Business, Mi Proyecto"><span class="tpl-brand-mark">TPL</span><span><strong>${esc(config.brand.name)}</strong><small>${esc(config.brand.eyebrow)}</small></span></a>
        <nav aria-label="Navegación principal"><a href="#landing">Mi Landing</a><a href="#resultados">Resultados</a><a href="#crecimiento">Cómo crecer</a><a href="#solicitudes">Solicitudes</a></nav>
        <div class="tpl-account-area">
          ${projectSelector()}
          <button class="tpl-account-button" type="button" data-account-menu aria-expanded="false">${icon('user')}<span>${esc(user.name || user.email || 'Mi cuenta')}</span>${icon('menu')}</button>
          <div class="tpl-account-menu" data-account-panel hidden>
            <a href="#inicio">Mi Proyecto</a><a href="#resultados">Mis resultados</a><a href="#opciones">Opciones de crecimiento</a><a href="#solicitudes">Mis solicitudes</a><a href="#cuenta">Datos de cuenta</a>
            <button type="button" data-logout>${icon('logout')} Cerrar sesión</button>
          </div>
        </div>
      </header>
      <main id="contenido">
        <section class="tpl-hero" id="inicio">
          <div class="tpl-orb tpl-orb-one"></div><div class="tpl-orb tpl-orb-two"></div>
          <div class="tpl-hero-copy"><span class="tpl-eyebrow"><i></i>${esc(config.copy.heroEyebrow)}</span><h1>${esc(account.name || project.name)}</h1><p>${esc(config.copy.heroSubtitle)}</p><a class="tpl-button" href="#landing">${esc(config.copy.heroCta)}</a></div>
          <div class="tpl-hero-visual"><div class="tpl-project-card">
            <div class="tpl-project-card-head"><span>${esc(project.name)}</span><i>${esc(statusLabel(project.status))}</i></div>
            <div class="tpl-property-visual"><span class="tpl-property-line wide"></span><span class="tpl-property-line"></span><div class="tpl-property-hill"></div><div class="tpl-property-sun"></div></div>
            <div class="tpl-project-card-foot"><span><i></i>Proyecto ${esc(statusLabel(project.status).toLowerCase())}</span><strong>${esc(project.propertyCode || '')}</strong></div>
          </div></div>
        </section>
        ${renderLanding(data.landing)}
        ${renderStatus(data.modules)}
        ${renderMetrics(data.metrics)}
        ${renderHealth(data.health)}
        ${renderGrowth(data.modules)}
        ${renderStages(data.health)}
        ${renderPlans(data.plans)}
        ${renderAdvisor(data.health)}
        ${renderRequests(data.requests)}
        <section class="tpl-section tpl-account-section" id="cuenta">
          ${sectionHeading('Cuenta', 'Datos de cuenta', 'Información básica de la sesión y del proyecto actualmente seleccionado.')}
          <div class="tpl-account-card"><div>${icon('user')}<span><small>Usuario</small><strong>${esc(user.email || 'Correo no disponible')}</strong></span></div><div>${icon('building')}<span><small>Cuenta</small><strong>${esc(account.name)}</strong></span></div><div>${icon('layout')}<span><small>Proyecto</small><strong>${esc(project.name)}</strong></span></div></div>
        </section>
      </main>
      <footer class="tpl-footer"><div class="tpl-footer-brand"><span class="tpl-brand-mark">TPL</span><div><strong>${esc(config.brand.name)}</strong><p>${esc(config.brand.support)}</p></div></div><div class="tpl-footer-links"><a href="#inicio">Mi Proyecto</a><a href="#resultados">Resultados</a><a href="#crecimiento">Cómo crecer</a></div><p class="tpl-copyright">© ${new Date().getFullYear()} TPL Business. Centro privado de clientes.</p></footer>
      <div class="tpl-dialog-backdrop" data-dialog-backdrop hidden><section class="tpl-dialog" role="dialog" aria-modal="true" aria-labelledby="tpl-dialog-title"><button class="tpl-dialog-close" type="button" data-close-dialog aria-label="Cerrar ficha">${icon('close')}</button><div data-dialog-content></div></section></div>
      <div class="tpl-toast" data-toast role="status" hidden></div>`;

    if (state.adminPreview) {
      root.querySelectorAll('[data-request-plan],[data-request-module],[data-request-recommendation]').forEach(button => {
        button.disabled = true;
        button.title = 'Deshabilitado durante la vista administrativa';
      });
    }
  }

  function openGrowthDialog(groupId, trigger) {
    const group = config.growthGroups.find(item => item.id === groupId);
    const tools = (state.project?.modules || []).filter(item => item.group === groupId);
    if (!group) return;
    const backdrop = root.querySelector('[data-dialog-backdrop]');
    const content = root.querySelector('[data-dialog-content]');
    if (!backdrop || !content) return;
    state.lastDialogTrigger = trigger;
    content.innerHTML = `<span class="tpl-kicker">Cómo ayuda a vender mejor</span><h2 id="tpl-dialog-title">${esc(group.title)}</h2><p>${esc(group.description)}</p>
      <div class="tpl-dialog-tools">${tools.map(tool => `<article><div><strong>${esc(tool.name)}</strong><p>${esc(tool.description)}</p><span class="tpl-status-pill ${statusTone(tool.status)}"><i></i>${esc(statusLabel(tool.status))}</span></div>${!['activo', 'proximamente'].includes(tool.status) ? `<button type="button" data-request-module="${esc(tool.code)}">Solicitar activación</button>` : ''}</article>`).join('')}</div>
      <div class="tpl-outcome">${icon('check')}<span><strong>Resultado esperado</strong>${esc(group.outcome)}</span></div>`;
    backdrop.hidden = false;
    document.body.classList.add('tpl-dialog-open');
    backdrop.querySelector('[data-close-dialog]').focus();
    if (state.adminPreview) {
      content.querySelectorAll('[data-request-module]').forEach(button => {
        button.disabled = true;
        button.title = 'Deshabilitado durante la vista administrativa';
      });
    }
  }

  function closeDialog() {
    const backdrop = root.querySelector('[data-dialog-backdrop]');
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true;
    document.body.classList.remove('tpl-dialog-open');
    state.lastDialogTrigger?.focus();
  }

  function showToast(message, error) {
    const toast = root.querySelector('[data-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle('is-error', Boolean(error));
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 5000);
  }

  async function loadPortal() {
    if (state.loading) return;
    state.loading = true;
    renderEntry('Cargando Mi Proyecto', 'Estamos consultando tu información de manera segura.');
    try {
      state.portalSession = await service.getPortalSession();
      const params = new URLSearchParams(window.location.search);
      const adminCode = params.get('admin_project');
      const requestedCode = params.get('project');
      state.adminPreview = Boolean(state.portalSession.isAdmin);

      if (!Array.isArray(state.portalSession.projects) || !state.portalSession.projects.length) {
        renderEntry('Tu cuenta aún no tiene proyectos', 'Solicita al equipo de Tu Parcela Lista que vincule tu acceso con el proyecto correspondiente.', true);
        return;
      }

      if (adminCode && !state.portalSession.isAdmin) {
        throw new Error('Esta vista requiere una cuenta administradora.');
      }

      const selectedCode = adminCode || requestedCode || state.portalSession.projects[0].code;
      state.project = await service.getProject(selectedCode, state.adminPreview);
      renderApp();
    } catch (error) {
      console.error('[TPL Business] Error cargando el portal:', error.cause || error);
      const message = error.message || 'No fue posible cargar tu proyecto.';
      if (/sesión|jwt/i.test(message)) {
        renderLogin(message);
      } else {
        renderEntry('No pudimos abrir Mi Proyecto', message, true);
      }
    } finally {
      state.loading = false;
    }
  }

  async function handleLogin(form) {
    const status = form.querySelector('#tpl-auth-status');
    const button = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    button.disabled = true;
    button.textContent = 'Verificando…';
    status.className = 'tpl-form-status';
    status.textContent = '';
    try {
      await auth.signIn(values.get('email'), values.get('password'));
      await loadPortal();
    } catch (error) {
      status.className = 'tpl-form-status is-error';
      status.textContent = service.readableError(error, 'No fue posible iniciar sesión.');
    } finally {
      button.disabled = false;
      button.textContent = 'Ingresar';
    }
  }

  async function handleRecovery(form) {
    const status = form.querySelector('#tpl-auth-status');
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Enviando…';
    try {
      await auth.requestRecovery(new FormData(form).get('email'));
      status.className = 'tpl-form-status is-success';
      status.textContent = 'Si el correo está registrado, recibirás un enlace para recuperar el acceso.';
      form.reset();
    } catch (error) {
      status.className = 'tpl-form-status is-error';
      status.textContent = service.readableError(error, 'No fue posible enviar el enlace.');
    } finally {
      button.disabled = false;
      button.textContent = 'Enviar enlace seguro';
    }
  }

  async function handlePassword(form) {
    const status = form.querySelector('#tpl-auth-status');
    const button = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    const password = String(values.get('password') || '');
    if (password !== String(values.get('confirmation') || '')) {
      status.className = 'tpl-form-status is-error';
      status.textContent = 'Las contraseñas no coinciden.';
      return;
    }
    button.disabled = true;
    button.textContent = 'Guardando…';
    try {
      await auth.updatePassword(password);
      history.replaceState({}, '', config.infrastructure.portalPath);
      await loadPortal();
    } catch (error) {
      status.className = 'tpl-form-status is-error';
      status.textContent = service.readableError(error, 'No fue posible guardar la contraseña.');
    } finally {
      button.disabled = false;
      button.textContent = 'Guardar contraseña';
    }
  }

  async function submitRequest(input, button) {
    if (state.adminPreview) return;
    const previous = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = 'Registrando…';
    }
    try {
      const result = await service.requestActivation({
        projectCode: state.project.project.code,
        ...input
      });
      showToast(result?.duplicate ? 'Esta solicitud ya estaba registrada.' : 'Solicitud registrada. El equipo comercial la revisará.');
      state.project = await service.getProject(state.project.project.code, false);
      renderApp();
    } catch (error) {
      showToast(error.message || 'No fue posible registrar la solicitud.', true);
      if (button) {
        button.disabled = false;
        button.textContent = previous;
      }
    }
  }

  root.addEventListener('submit', event => {
    if (event.target.id === 'tpl-login-form') {
      event.preventDefault();
      handleLogin(event.target);
    } else if (event.target.id === 'tpl-recovery-form') {
      event.preventDefault();
      handleRecovery(event.target);
    } else if (event.target.id === 'tpl-password-form') {
      event.preventDefault();
      handlePassword(event.target);
    }
  });

  root.addEventListener('change', async event => {
    if (!event.target.matches('[data-project-select]')) return;
    const code = event.target.value;
    const url = new URL(window.location.href);
    url.searchParams.delete('admin_project');
    url.searchParams.set(state.portalSession.isAdmin ? 'admin_project' : 'project', code);
    history.replaceState({}, '', `${url.pathname}${url.search}`);
    try {
      state.project = await service.getProject(code, Boolean(state.portalSession.isAdmin));
      state.adminPreview = Boolean(state.portalSession.isAdmin);
      renderApp();
    } catch (error) {
      showToast(error.message || 'No fue posible cambiar de proyecto.', true);
    }
  });

  root.addEventListener('click', async event => {
    const target = event.target;
    if (target.closest('[data-show-recovery]')) return renderRecovery('request');
    if (target.closest('[data-show-login]')) return renderLogin('');
    if (target.closest('[data-retry]')) return loadPortal();
    if (target.closest('[data-close-dialog]') || target.matches('[data-dialog-backdrop]')) return closeDialog();

    const accountButton = target.closest('[data-account-menu]');
    if (accountButton) {
      const panel = root.querySelector('[data-account-panel]');
      const expanded = accountButton.getAttribute('aria-expanded') === 'true';
      accountButton.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
      return;
    }

    const logout = target.closest('[data-logout]');
    if (logout) {
      logout.disabled = true;
      try {
        await service.logLogout().catch(() => false);
        await auth.signOut();
      } catch (error) {
        showToast('No fue posible cerrar la sesión.', true);
      }
      return;
    }

    const previewButton = target.closest('[data-preview-size]');
    if (previewButton) {
      const frame = root.querySelector('[data-preview-frame]');
      frame?.classList.toggle('is-mobile', previewButton.dataset.previewSize === 'mobile');
      root.querySelectorAll('[data-preview-size]').forEach(button => {
        const active = button === previewButton;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      return;
    }

    const growth = target.closest('[data-growth-group]');
    if (growth) return openGrowthDialog(growth.dataset.growthGroup, growth);

    const moduleButton = target.closest('[data-request-module]');
    if (moduleButton) return submitRequest({ type: 'modulo', moduleCode: moduleButton.dataset.requestModule }, moduleButton);

    const planButton = target.closest('[data-request-plan]');
    if (planButton) return submitRequest({ type: 'plan', planId: planButton.dataset.requestPlan }, planButton);

    const recommendationButton = target.closest('[data-request-recommendation]');
    if (recommendationButton) return submitRequest({
      type: 'recomendacion',
      recommendation: recommendationButton.dataset.requestRecommendation
    }, recommendationButton);
  });

  document.addEventListener('keydown', event => {
    const backdrop = root.querySelector('[data-dialog-backdrop]');
    if (event.key === 'Escape') {
      closeDialog();
      return;
    }
    if (event.key !== 'Tab' || !backdrop || backdrop.hidden) return;
    const focusable = [...backdrop.querySelectorAll('button:not(:disabled),a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  async function boot() {
    if (!config || !auth || !service || !root) {
      console.error('[TPL Business] Faltan dependencias de inicialización.');
      renderEntry('TPL Business no está disponible', 'No fue posible iniciar la aplicación.', true);
      return;
    }

    state.authSubscription = auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        renderRecovery('update');
      } else if (event === 'SIGNED_OUT') {
        state.portalSession = null;
        state.project = null;
        renderLogin('');
      } else if (event === 'SIGNED_IN' && session && root.querySelector('#tpl-login-form')) {
        loadPortal();
      }
    });

    try {
      const session = await auth.getSession();
      const mode = new URLSearchParams(window.location.search).get('mode');
      if (mode === 'recovery' && session) {
        renderRecovery('update');
      } else if (session) {
        await loadPortal();
      } else {
        renderLogin('');
      }
    } catch (error) {
      console.error('[TPL Business] Error inicializando la sesión:', error);
      renderLogin('No fue posible validar la sesión. Intenta nuevamente.');
    }
  }

  boot();
})(window, document);
