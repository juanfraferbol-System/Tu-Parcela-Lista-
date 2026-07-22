(() => {
  'use strict';

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = (n) => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n||0));
  const date = (v) => v ? new Intl.DateTimeFormat('es-CL',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)) : '—';
  const client = () => window.tplSupabase || window.tplCrmSupabase || window.TPL_getSupabaseClient?.();

  function mountNavigation() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav || nav.querySelector('[data-target="view-clientes-prioritarios"]')) return;
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'nav-item';
    link.dataset.target = 'view-clientes-prioritarios';
    link.innerHTML = '<i data-lucide="flame"></i> Clientes prioritarios';
    nav.insertBefore(link, nav.querySelector('[data-target="view-solicitudes"]'));

    const main = document.querySelector('.main-content');
    const section = document.createElement('div');
    section.id = 'view-clientes-prioritarios';
    section.className = 'dashboard-section';
    section.style.display = 'none';
    section.innerHTML = `
      <section class="priority-hero">
        <div><span class="eyebrow">Inteligencia comercial</span><h2>Clientes más importantes del día</h2><p>Ordenados automáticamente por intención, actividad, reserva, visita y valor potencial.</p></div>
        <button id="priority-refresh" class="btn-primary" type="button"><i data-lucide="refresh-cw"></i> Recalcular</button>
      </section>
      <section class="priority-summary">
        <article><strong id="priority-hot">0</strong><span>Muy calientes</span></article>
        <article><strong id="priority-call">0</strong><span>Llamar hoy</span></article>
        <article><strong id="priority-reserve">0</strong><span>Reservas activas</span></article>
        <article><strong id="priority-value">$0</strong><span>Valor potencial</span></article>
      </section>
      <section class="table-container">
        <table class="data-table"><thead><tr><th>#</th><th>Cliente</th><th>Prioridad</th><th>Probabilidad</th><th>Valor potencial</th><th>Última señal</th><th>Próxima acción</th><th>Contacto</th></tr></thead><tbody id="priority-body"><tr><td colspan="8">Cargando…</td></tr></tbody></table>
      </section>`;
    main.appendChild(section);

    link.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelectorAll('.dashboard-section').forEach((s) => { s.classList.remove('active-section'); s.style.display='none'; });
      document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
      section.style.display='block'; section.classList.add('active-section'); link.classList.add('active');
      const title = document.getElementById('topbar-title'); if (title) title.textContent='Clientes prioritarios';
      loadPriorityClients();
    });
    document.getElementById('priority-refresh')?.addEventListener('click', recalculatePriorityClients);
    window.lucide?.createIcons();
  }

  async function recalculatePriorityClients() {
    const db = client();
    const button = document.getElementById('priority-refresh');
    if (!db) return;
    if (button) { button.disabled = true; button.textContent = 'Recalculando…'; }
    try {
      const { error } = await db.rpc('crm_recalcular_prioridades_clientes');
      if (error) throw error;
      await loadPriorityClients();
    } catch (error) {
      console.error('crm_recalcular_prioridades_clientes', error);
      const body = document.getElementById('priority-body');
      if (body) body.innerHTML = `<tr><td colspan="8" class="error-msg">No se pudo recalcular: ${esc(error.message || error)}</td></tr>`;
    } finally {
      if (button) { button.disabled = false; button.innerHTML = '<i data-lucide="refresh-cw"></i> Recalcular'; window.lucide?.createIcons(); }
    }
  }

  async function loadPriorityClients() {
    const db = client();
    const body = document.getElementById('priority-body');
    if (!db || !body) return;
    body.innerHTML='<tr><td colspan="8">Calculando prioridades…</td></tr>';
    const {data,error} = await db.rpc('crm_clientes_prioritarios',{p_limite:50});
    if (error) {
      console.error('crm_clientes_prioritarios',error);
      body.innerHTML=`<tr><td colspan="8" class="error-msg">No se pudo cargar: ${esc(error.message)}</td></tr>`;
      return;
    }
    const rows = data || [];
    document.getElementById('priority-hot').textContent = rows.filter(r=>r.prioridad==='muy_caliente').length;
    document.getElementById('priority-call').textContent = rows.filter(r=>/llamar/i.test(r.proxima_accion||'')).length;
    document.getElementById('priority-reserve').textContent = rows.filter(r=>/reserva/i.test(r.proxima_accion||'')).length;
    document.getElementById('priority-value').textContent = money(rows.reduce((a,r)=>a+Number(r.valor_proyecto_estimado||0),0));
    body.innerHTML = rows.length ? rows.map((r,i)=>{
      const contact = r.whatsapp || r.telefono || r.correo || '';
      const wa = contact && !contact.includes('@') ? `https://wa.me/${String(contact).replace(/\D/g,'')}` : '';
      return `<tr>
        <td><strong>${i+1}</strong></td>
        <td><strong>${esc(r.nombre)}</strong><br><small>${esc(r.correo||r.telefono||'Sin contacto')}</small></td>
        <td><span class="priority-badge ${esc(r.prioridad)}">${esc((r.prioridad||'frio').replaceAll('_',' '))}</span><br><small>${Number(r.score||0)} puntos</small></td>
        <td><strong>${Number(r.probabilidad_compra||0)}%</strong><div class="priority-meter"><span style="width:${Math.min(100,Number(r.probabilidad_compra||0))}%"></span></div></td>
        <td>${money(r.valor_proyecto_estimado)}</td>
        <td>${date(r.ultima_interaccion_en)}<br><small>${esc(r.etapa||'nuevo')}</small></td>
        <td><strong>${esc(r.proxima_accion||'Revisar')}</strong><br><small>${date(r.proxima_accion_en)}</small></td>
        <td>${wa ? `<a class="btn-action" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : contact.includes('@') ? `<a class="btn-action" href="mailto:${esc(contact)}">Correo</a>` : '—'}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="8">Todavía no hay clientes para priorizar.</td></tr>';
  }

  document.addEventListener('DOMContentLoaded', mountNavigation);
})();
