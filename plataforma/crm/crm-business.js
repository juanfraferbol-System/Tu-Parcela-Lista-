(function (window, document) {
  'use strict';

  const service = window.TPLBusinessAdminService;
  const state = {
    loading: false,
    accounts: [],
    projects: [],
    landings: [],
    requests: [],
    modules: [],
    plans: [],
    projectModules: [],
    opportunities: [],
    visits: []
  };

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));

  const formatDate = value => {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Sin fecha'
      : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const label = value => ({
    preparacion: 'Preparación',
    activo: 'Activo',
    pausado: 'Pausado',
    ganado: 'Ganado',
    perdido: 'Perdido',
    cerrado: 'Cerrado',
    solicitada: 'Solicitada',
    contactando: 'Contactando',
    aprobada: 'Aprobada',
    activada: 'Activada',
    rechazada: 'Rechazada'
  }[value] || value || 'Sin estado');

  const clientViewUrl = projectCode =>
    `/plataforma/tpl-business/?admin_project=${encodeURIComponent(String(projectCode || ''))}`;

  function section(id, html) {
    const element = document.createElement('div');
    element.id = id;
    element.className = 'dashboard-section';
    element.style.display = 'none';
    element.innerHTML = html;
    return element;
  }

  function buildDashboard() {
    return section('view-business-dashboard', `
      <section class="business-hero">
        <div><span class="eyebrow">TPL BUSINESS</span><h2>Centro Comercial</h2>
          <p>Información canónica de clientes, proyectos, solicitudes y resultados almacenada en Supabase.</p>
        </div>
        <div class="business-hero-actions">
          <button class="business-primary" data-business-action="new-account">Nueva cuenta</button>
          <button class="business-secondary" data-business-action="new-project">Nuevo proyecto</button>
        </div>
      </section>
      <div class="business-feedback" data-business-feedback hidden></div>
      <section class="business-kpis">
        <article class="business-kpi"><strong data-kpi="accounts">—</strong><span>Cuentas activas</span></article>
        <article class="business-kpi"><strong data-kpi="projects">—</strong><span>Proyectos abiertos</span></article>
        <article class="business-kpi"><strong data-kpi="campaigns">—</strong><span>Google Ads activos</span></article>
        <article class="business-kpi"><strong data-kpi="leads">—</strong><span>Leads reales</span></article>
        <article class="business-kpi"><strong data-kpi="visits">—</strong><span>Visitas</span></article>
        <article class="business-kpi"><strong data-kpi="requests">—</strong><span>Solicitudes pendientes</span></article>
      </section>
      <section class="business-grid">
        <article class="business-card"><h3>Proyectos prioritarios</h3><div data-priority-projects></div></article>
        <article class="business-card"><h3>Actividad comercial</h3><div data-request-summary></div></article>
      </section>`);
  }

  function buildAccounts() {
    return section('view-business-accounts', `
      <section class="business-hero">
        <div><span class="eyebrow">Cuentas</span><h2>Clientes de TPL Business</h2>
          <p>Cada cuenta puede reunir uno o más proyectos comerciales.</p>
        </div>
        <button class="business-primary" data-business-action="new-account">Agregar cuenta</button>
      </section>
      <div class="business-feedback" data-business-feedback hidden></div>
      <div class="business-toolbar">
        <input data-account-search type="search" placeholder="Buscar cuenta">
        <select data-account-status><option value="">Todos los estados</option><option value="activo">Activas</option><option value="pausado">Pausadas</option><option value="cerrado">Cerradas</option></select>
      </div>
      <section class="table-container"><table class="data-table">
        <thead><tr><th>Cuenta</th><th>Código</th><th>Proyectos</th><th>Estado</th><th>Actualización</th><th>Acciones</th></tr></thead>
        <tbody data-accounts-body></tbody>
      </table></section>`);
  }

  function buildProjects() {
    return section('view-business-projects', `
      <section class="business-hero">
        <div><span class="eyebrow">Proyectos</span><h2>Proyectos comerciales</h2>
          <p>Fuente única para Mi Proyecto, Landing Premium y resultados comerciales.</p>
        </div>
        <button class="business-primary" data-business-action="new-project">Crear proyecto</button>
      </section>
      <div class="business-feedback" data-business-feedback hidden></div>
      <div class="business-toolbar">
        <input data-project-search type="search" placeholder="Buscar proyecto, cuenta o propiedad">
        <select data-project-status><option value="">Todos los estados</option><option value="preparacion">Preparación</option><option value="activo">Activos</option><option value="pausado">Pausados</option><option value="ganado">Ganados</option><option value="perdido">Perdidos</option><option value="cerrado">Cerrados</option></select>
      </div>
      <section class="table-container"><table class="data-table">
        <thead><tr><th>Proyecto</th><th>Cuenta</th><th>Landing</th><th>Resultados</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody data-projects-body></tbody>
      </table></section>`);
  }

  function buildRequests() {
    return section('view-business-requests', `
      <section class="business-hero">
        <div><span class="eyebrow">Solicitudes</span><h2>Solicitudes comerciales</h2>
          <p>Gestiona las activaciones pedidas por propietarios y colaboradores desde Mi Proyecto.</p>
        </div>
        <button class="business-secondary" data-business-refresh>Actualizar</button>
      </section>
      <div class="business-feedback" data-business-feedback hidden></div>
      <div class="business-toolbar">
        <input data-request-search type="search" placeholder="Buscar proyecto, módulo o recomendación">
        <select data-request-status><option value="">Todos los estados</option><option value="solicitada">Solicitadas</option><option value="contactando">Contactando</option><option value="aprobada">Aprobadas</option><option value="activada">Activadas</option><option value="rechazada">Rechazadas</option></select>
      </div>
      <section class="table-container"><table class="data-table">
        <thead><tr><th>Solicitud</th><th>Proyecto</th><th>Fecha</th><th>Estado</th><th>Gestión</th></tr></thead>
        <tbody data-requests-body></tbody>
      </table></section>`);
  }

  function buildModal() {
    const modal = document.createElement('div');
    modal.id = 'business-modal';
    modal.className = 'business-modal';
    modal.innerHTML = `<div class="business-modal-box" role="dialog" aria-modal="true" aria-labelledby="business-modal-title">
      <div class="business-modal-head"><h3 id="business-modal-title">Registro</h3><button class="business-secondary" type="button" data-business-close>Cerrar</button></div>
      <div class="business-feedback business-modal-feedback" data-business-modal-feedback hidden></div>
      <div class="business-modal-body" data-business-modal-body></div>
    </div>`;
    return modal;
  }

  function install() {
    const navigation = document.querySelector('.sidebar-nav');
    const main = document.querySelector('.main-content');
    if (!navigation || !main || document.getElementById('view-business-dashboard')) return;

    const group = document.createElement('div');
    group.className = 'nav-business-group';
    group.textContent = 'TPL Business';
    navigation.prepend(group);

    const links = [
      ['view-business-dashboard', 'layout-dashboard', 'Centro Comercial'],
      ['view-business-accounts', 'building-2', 'Cuentas TPL'],
      ['view-business-projects', 'folder-kanban', 'Proyectos Comerciales'],
      ['view-business-requests', 'inbox', 'Solicitudes']
    ];
    [...links].reverse().forEach(([target, icon, text]) => {
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'nav-item';
      link.dataset.businessTarget = target;
      link.innerHTML = `<i data-lucide="${icon}"></i> ${text}`;
      navigation.insertBefore(link, group.nextSibling);
    });

    main.append(buildDashboard(), buildAccounts(), buildProjects(), buildRequests(), buildModal());
    bind();
    window.lucide?.createIcons();
    load();
  }

  function activate(link) {
    const target = link.dataset.businessTarget;
    document.querySelectorAll('.dashboard-section').forEach(section => {
      section.classList.remove('active-section');
      section.style.display = 'none';
    });
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById(target)?.style.setProperty('display', 'block');
    document.getElementById(target)?.classList.add('active-section');
    link.classList.add('active');
    const title = document.getElementById('topbar-title');
    if (title) title.textContent = link.textContent.trim();
    render();
  }

  async function load() {
    if (state.loading || !service) return;
    state.loading = true;
    feedback('Cargando información desde Supabase…');
    try {
      Object.assign(state, await service.loadPanel());
      feedback('');
      render();
    } catch (error) {
      console.error('[TPL Business CRM] Error:', error.cause || error);
      feedback(error.message || 'No fue posible cargar TPL Business.', true);
    } finally {
      state.loading = false;
    }
  }

  function account(id) {
    return state.accounts.find(item => item.id === id);
  }

  function project(id) {
    return state.projects.find(item => item.id === id);
  }

  function landing(projectId) {
    return state.landings.find(item => item.proyecto_comercial_id === projectId);
  }

  function projectMetrics(projectId) {
    const opportunities = state.opportunities.filter(item => item.proyecto_comercial_id === projectId);
    return {
      leads: opportunities.length,
      sales: opportunities.filter(item => item.estado === 'ganada' || ['reservado', 'ganado'].includes(item.etapa)).length,
      visits: state.visits.filter(item => item.proyecto_comercial_id === projectId).length
    };
  }

  function requestName(request) {
    if (request.recomendacion) return request.recomendacion;
    if (request.modulo_codigo) {
      return state.modules.find(item => item.codigo === request.modulo_codigo)?.nombre || request.modulo_codigo;
    }
    if (request.plan_id) return state.plans.find(item => item.id === request.plan_id)?.nombre || 'Plan comercial';
    return 'Solicitud comercial';
  }

  function render() {
    renderDashboard();
    renderAccounts();
    renderProjects();
    renderRequests();
  }

  function renderDashboard() {
    const openProjects = state.projects.filter(item => item.estado !== 'cerrado');
    const activeCampaigns = state.projectModules.filter(item => item.modulo_codigo === 'google_ads' && item.estado === 'activo');
    const pendingRequests = state.requests.filter(item => ['solicitada', 'contactando', 'aprobada'].includes(item.estado));
    const values = {
      accounts: state.accounts.filter(item => item.estado === 'activo').length,
      projects: openProjects.length,
      campaigns: activeCampaigns.length,
      leads: state.opportunities.length,
      visits: state.visits.length,
      requests: pendingRequests.length
    };
    Object.entries(values).forEach(([key, value]) => {
      const element = document.querySelector(`[data-kpi="${key}"]`);
      if (element) element.textContent = value;
    });

    const projectsBox = document.querySelector('[data-priority-projects]');
    if (projectsBox) {
      projectsBox.innerHTML = openProjects.slice(0, 6).map(item => {
        const owner = account(item.cuenta_id);
        const currentLanding = landing(item.id);
        return `<div class="business-project"><div>
          <span class="business-status ${item.estado === 'activo' ? 'active' : ''}">${esc(label(item.estado))}</span>
          <h4>${esc(item.nombre)}</h4><p>${esc(owner?.nombre || 'Sin cuenta')} · ${esc(item.propiedad_codigo || 'Sin propiedad')}</p>
        </div><div class="business-table-actions">
          ${currentLanding ? `<a href="/${esc(currentLanding.slug)}" target="_blank" rel="noopener">Landing</a>` : ''}
          <a href="${esc(clientViewUrl(item.codigo))}" target="_blank" rel="noopener">Vista como cliente</a>
        </div></div>`;
      }).join('') || '<div class="business-empty">No existen proyectos abiertos.</div>';
    }

    const summary = document.querySelector('[data-request-summary]');
    if (summary) {
      summary.innerHTML = state.requests.slice(0, 5).map(item => `
        <div class="business-check"><strong>${esc(requestName(item))}</strong><span>${esc(label(item.estado))}</span></div>
      `).join('') || '<div class="business-empty">No existen solicitudes todavía.</div>';
    }
  }

  function renderAccounts() {
    const body = document.querySelector('[data-accounts-body]');
    if (!body) return;
    const query = String(document.querySelector('[data-account-search]')?.value || '').toLowerCase();
    const status = document.querySelector('[data-account-status]')?.value || '';
    const rows = state.accounts.filter(item =>
      (!status || item.estado === status)
      && (!query || `${item.nombre} ${item.codigo}`.toLowerCase().includes(query))
    );
    body.innerHTML = rows.map(item => {
      const count = state.projects.filter(projectItem => projectItem.cuenta_id === item.id).length;
      return `<tr><td><strong>${esc(item.nombre)}</strong></td><td><small>${esc(item.codigo)}</small></td>
        <td>${count}</td><td><span class="business-status ${item.estado === 'activo' ? 'active' : ''}">${esc(label(item.estado))}</span></td>
        <td>${esc(formatDate(item.actualizado_en))}</td><td><div class="business-table-actions">
          <button data-edit-account="${esc(item.id)}">Editar</button>
          ${item.estado !== 'cerrado' ? `<button data-archive-account="${esc(item.id)}">Archivar</button>` : ''}
        </div></td></tr>`;
    }).join('') || '<tr><td colspan="6" class="business-empty">No hay cuentas que coincidan.</td></tr>';
  }

  function renderProjects() {
    const body = document.querySelector('[data-projects-body]');
    if (!body) return;
    const query = String(document.querySelector('[data-project-search]')?.value || '').toLowerCase();
    const status = document.querySelector('[data-project-status]')?.value || '';
    const rows = state.projects.filter(item => {
      const owner = account(item.cuenta_id);
      return (!status || item.estado === status)
        && (!query || `${item.nombre} ${item.codigo} ${item.propiedad_codigo || ''} ${owner?.nombre || ''}`.toLowerCase().includes(query));
    });
    body.innerHTML = rows.map(item => {
      const owner = account(item.cuenta_id);
      const currentLanding = landing(item.id);
      const metrics = projectMetrics(item.id);
      return `<tr><td><strong>${esc(item.nombre)}</strong><br><small>${esc(item.codigo)}</small></td>
        <td>${esc(owner?.nombre || 'Sin cuenta')}</td>
        <td>${currentLanding ? `<span class="business-status ${currentLanding.estado === 'publicada' ? 'active' : ''}">${esc(label(currentLanding.estado))}</span>` : 'Sin Landing'}</td>
        <td><small>${metrics.leads} leads · ${metrics.visits} visitas · ${metrics.sales} ventas</small></td>
        <td><span class="business-stage">${esc(label(item.estado))}</span></td>
        <td><div class="business-table-actions">
          ${currentLanding ? `<a href="/${esc(currentLanding.slug)}" target="_blank" rel="noopener">Landing</a>` : ''}
          <a href="${esc(clientViewUrl(item.codigo))}" target="_blank" rel="noopener">Vista como cliente</a>
          <button data-edit-project="${esc(item.id)}">Editar</button>
          ${item.estado !== 'cerrado' ? `<button data-archive-project="${esc(item.id)}">Archivar</button>` : ''}
        </div></td></tr>`;
    }).join('') || '<tr><td colspan="6" class="business-empty">No hay proyectos que coincidan.</td></tr>';
  }

  function renderRequests() {
    const body = document.querySelector('[data-requests-body]');
    if (!body) return;
    const query = String(document.querySelector('[data-request-search]')?.value || '').toLowerCase();
    const status = document.querySelector('[data-request-status]')?.value || '';
    const rows = state.requests.filter(item => {
      const currentProject = project(item.proyecto_id);
      return (!status || item.estado === status)
        && (!query || `${requestName(item)} ${currentProject?.nombre || ''}`.toLowerCase().includes(query));
    });
    body.innerHTML = rows.map(item => {
      const currentProject = project(item.proyecto_id);
      return `<tr><td><strong>${esc(requestName(item))}</strong><br><small>${esc(item.tipo)}</small></td>
        <td>${esc(currentProject?.nombre || 'Proyecto no disponible')}</td><td>${esc(formatDate(item.creado_en))}</td>
        <td><span class="business-status ${item.estado === 'activada' ? 'active' : ''}">${esc(label(item.estado))}</span></td>
        <td><select data-request-update="${esc(item.id)}" aria-label="Estado de ${esc(requestName(item))}">
          ${['solicitada', 'contactando', 'aprobada', 'activada', 'rechazada'].map(value =>
            `<option value="${value}"${item.estado === value ? ' selected' : ''}>${esc(label(value))}</option>`
          ).join('')}
        </select></td></tr>`;
    }).join('') || '<tr><td colspan="5" class="business-empty">No existen solicitudes que coincidan.</td></tr>';
  }

  function accountForm(id) {
    const current = account(id) || {};
    openModal(id ? 'Editar cuenta' : 'Nueva cuenta', `<form data-account-form class="business-form">
      <input type="hidden" name="id" value="${esc(current.id || '')}">
      <label class="wide">Nombre de la cuenta<input name="name" required maxlength="160" value="${esc(current.nombre || '')}"></label>
      <label>Estado<select name="status"><option value="activo">Activa</option><option value="pausado">Pausada</option><option value="cerrado">Cerrada</option></select></label>
      <div class="wide business-modal-foot"><button type="button" class="business-secondary" data-business-close>Cancelar</button><button class="business-primary" type="submit">Guardar en Supabase</button></div>
    </form>`);
    document.querySelector('[data-account-form] [name="status"]').value = current.estado || 'activo';
  }

  function projectForm(id) {
    const current = project(id) || {};
    if (!state.accounts.length) {
      feedback('Primero debes crear una cuenta TPL Business.', true);
      return;
    }
    openModal(id ? 'Editar proyecto' : 'Nuevo proyecto', `<form data-project-form class="business-form">
      <input type="hidden" name="id" value="${esc(current.id || '')}">
      <label>Cuenta<select name="accountId" required>${state.accounts.map(item => `<option value="${esc(item.id)}">${esc(item.nombre)}</option>`).join('')}</select></label>
      <label>Estado<select name="status">${['preparacion', 'activo', 'pausado', 'ganado', 'perdido', 'cerrado'].map(value => `<option value="${value}">${esc(label(value))}</option>`).join('')}</select></label>
      <label class="wide">Nombre del proyecto<input name="name" required maxlength="180" value="${esc(current.nombre || '')}"></label>
      <label>Código de propiedad<input name="propertyCode" maxlength="120" value="${esc(current.propiedad_codigo || '')}"></label>
      <label class="wide">Objetivo<textarea name="objective" rows="4" maxlength="600">${esc(current.objetivo || '')}</textarea></label>
      <div class="wide business-modal-foot"><button type="button" class="business-secondary" data-business-close>Cancelar</button><button class="business-primary" type="submit">Guardar en Supabase</button></div>
    </form>`);
    const form = document.querySelector('[data-project-form]');
    form.accountId.value = current.cuenta_id || state.accounts[0].id;
    form.status.value = current.estado || 'preparacion';
  }

  function openModal(title, html) {
    document.getElementById('business-modal-title').textContent = title;
    const modalFeedback = document.querySelector('[data-business-modal-feedback]');
    modalFeedback.hidden = true;
    modalFeedback.textContent = '';
    document.querySelector('[data-business-modal-body]').innerHTML = html;
    document.getElementById('business-modal').classList.add('open');
  }

  function closeModal() {
    document.getElementById('business-modal')?.classList.remove('open');
  }

  function feedback(message, isError) {
    document.querySelectorAll('[data-business-feedback],[data-business-modal-feedback]').forEach(element => {
      element.hidden = !message;
      element.textContent = message || '';
      element.classList.toggle('is-error', Boolean(isError));
    });
  }

  async function save(form, action, loadingText) {
    const button = form.querySelector('button[type="submit"]');
    const previous = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    try {
      await action(Object.fromEntries(new FormData(form)));
      closeModal();
      await load();
    } catch (error) {
      feedback(error.message || 'No fue posible guardar la información.', true);
      button.disabled = false;
      button.textContent = previous;
    }
  }

  function bind() {
    document.addEventListener('click', async event => {
      const navigation = event.target.closest('[data-business-target]');
      if (navigation) {
        event.preventDefault();
        return activate(navigation);
      }
      if (event.target.closest('[data-business-close]') || event.target.id === 'business-modal') return closeModal();
      if (event.target.closest('[data-business-refresh]')) return load();
      if (event.target.closest('[data-business-action="new-account"]')) return accountForm();
      if (event.target.closest('[data-business-action="new-project"]')) return projectForm();

      const editAccount = event.target.closest('[data-edit-account]');
      if (editAccount) return accountForm(editAccount.dataset.editAccount);
      const editProject = event.target.closest('[data-edit-project]');
      if (editProject) return projectForm(editProject.dataset.editProject);

      const archiveAccount = event.target.closest('[data-archive-account]');
      if (archiveAccount && window.confirm('¿Archivar esta cuenta? Sus datos no serán eliminados.')) {
        await service.archiveAccount(archiveAccount.dataset.archiveAccount);
        return load();
      }
      const archiveProject = event.target.closest('[data-archive-project]');
      if (archiveProject && window.confirm('¿Archivar este proyecto? Sus datos no serán eliminados.')) {
        await service.archiveProject(archiveProject.dataset.archiveProject);
        return load();
      }
    });

    document.addEventListener('submit', event => {
      const accountFormElement = event.target.closest('[data-account-form]');
      if (accountFormElement) {
        event.preventDefault();
        return save(accountFormElement, values => service.saveAccount(values), 'Guardando…');
      }
      const projectFormElement = event.target.closest('[data-project-form]');
      if (projectFormElement) {
        event.preventDefault();
        return save(projectFormElement, values => service.saveProject(values), 'Guardando…');
      }
    });

    document.addEventListener('change', async event => {
      if (event.target.matches('[data-account-status],[data-project-status],[data-request-status]')) return render();
      const request = event.target.closest('[data-request-update]');
      if (!request) return;
      request.disabled = true;
      try {
        await service.updateRequest(request.dataset.requestUpdate, request.value);
        await load();
      } catch (error) {
        feedback(error.message || 'No fue posible actualizar la solicitud.', true);
        request.disabled = false;
      }
    });

    document.addEventListener('input', event => {
      if (event.target.matches('[data-account-search],[data-project-search],[data-request-search]')) render();
    });
  }

  document.addEventListener('DOMContentLoaded', install);
})(window, document);
