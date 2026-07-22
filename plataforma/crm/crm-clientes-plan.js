(() => {
  'use strict';
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = (v) => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v||0));
  const fmtDate = (v) => v ? new Intl.DateTimeFormat('es-CL',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)) : '—';
  const db = () => window.tplSupabase || window.tplCrmSupabase || window.TPL_getSupabaseClient?.();
  let cache = [];

  function install() {
    const nav = document.querySelector('.sidebar-nav');
    const main = document.querySelector('.main-content');
    if (!nav || !main || document.getElementById('view-clientes-plan')) return;
    const link = document.createElement('a');
    link.href = '#'; link.className = 'nav-item nav-clientes-plan'; link.dataset.target = 'view-clientes-plan';
    link.innerHTML = '<i data-lucide="heart-handshake"></i> Clientes con plan <span id="plan-alert-count" class="plan-alert-count" hidden>0</span>';
    nav.insertBefore(link, nav.firstElementChild);

    const section = document.createElement('div');
    section.id = 'view-clientes-plan'; section.className = 'dashboard-section'; section.style.display = 'none';
    section.innerHTML = `
      <section class="plan-hero"><div><span class="eyebrow">Prioridad máxima</span><h2>Clientes con plan activo</h2><p>Primero cuidamos a quienes ya confiaron en Tu Parcela Lista.</p></div><button id="plan-refresh" class="btn-primary" type="button"><i data-lucide="refresh-cw"></i> Actualizar</button></section>
      <section class="plan-metrics">
        <article><strong id="plan-total">0</strong><span>Planes activos</span></article>
        <article class="health-green"><strong id="plan-green">0</strong><span>Todo en orden</span></article>
        <article class="health-yellow"><strong id="plan-yellow">0</strong><span>Requieren seguimiento</span></article>
        <article class="health-red"><strong id="plan-red">0</strong><span>Atención inmediata</span></article>
        <article><strong id="plan-contact-average">0 días</strong><span>Promedio sin contacto</span></article>
        <article><strong id="plan-health-average">0%</strong><span>Salud promedio</span></article>
      </section>
      <section class="plan-toolbar"><label>Filtrar <select id="plan-health-filter"><option value="">Todos</option><option value="rojo">Urgentes</option><option value="amarillo">Seguimiento</option><option value="verde">En orden</option></select></label><label>Buscar <input id="plan-search" type="search" placeholder="Cliente, proyecto o plan"></label></section>
      <section class="table-container"><table class="data-table plan-table"><thead><tr><th>Salud</th><th>Cliente / Plan</th><th>Proyecto</th><th>Etapa y avance</th><th>Comunicación</th><th>Pendientes</th><th>Acción recomendada</th><th>Contacto</th></tr></thead><tbody id="plan-body"><tr><td colspan="8">Cargando…</td></tr></tbody></table></section>`;
    main.appendChild(section);

    link.addEventListener('click', e => { e.preventDefault(); activate(link, section); load(); });
    document.getElementById('plan-refresh')?.addEventListener('click', load);
    document.getElementById('plan-health-filter')?.addEventListener('change', render);
    document.getElementById('plan-search')?.addEventListener('input', render);
    window.addEventListener('tpl:clientes-plan-refresh', load);
    window.lucide?.createIcons();
  }

  function activate(link, section) {
    document.querySelectorAll('.dashboard-section').forEach(s => { s.classList.remove('active-section'); s.style.display='none'; });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    section.style.display='block'; section.classList.add('active-section'); link.classList.add('active');
    const title = document.getElementById('topbar-title'); if (title) title.textContent='Clientes con plan';
  }

  async function load() {
    const client = db(), body = document.getElementById('plan-body'), button = document.getElementById('plan-refresh');
    if (!client || !body) return;
    body.innerHTML='<tr><td colspan="8">Evaluando salud de los proyectos…</td></tr>';
    if (button) button.disabled=true;
    try {
      const {data,error}=await client.rpc('crm_clientes_con_plan',{p_limite:200});
      if (error) throw error;
      cache=data||[]; updateMetrics(); render();
    } catch(error) {
      console.error('crm_clientes_con_plan',error);
      body.innerHTML=`<tr><td colspan="8" class="error-msg">No se pudo cargar. Ejecuta la migración 202607220004: ${esc(error.message||error)}</td></tr>`;
    } finally { if(button) button.disabled=false; }
  }

  function updateMetrics() {
    const count = h => cache.filter(r=>r.salud===h).length;
    const avg = key => cache.length ? Math.round(cache.reduce((a,r)=>a+Number(r[key]||0),0)/cache.length) : 0;
    set('plan-total',cache.length); set('plan-green',count('verde')); set('plan-yellow',count('amarillo')); set('plan-red',count('rojo'));
    set('plan-contact-average',`${avg('dias_sin_contacto')} días`); set('plan-health-average',`${avg('puntaje_salud')}%`);
    const badge=document.getElementById('plan-alert-count'), urgent=count('rojo');
    if(badge){badge.textContent=urgent;badge.hidden=!urgent;}
  }
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};

  function render() {
    const body=document.getElementById('plan-body'); if(!body)return;
    const health=document.getElementById('plan-health-filter')?.value||'';
    const q=(document.getElementById('plan-search')?.value||'').trim().toLowerCase();
    const rows=cache.filter(r=>(!health||r.salud===health)&&(!q||`${r.cliente_nombre} ${r.numero_proyecto} ${r.plan_nombre}`.toLowerCase().includes(q)));
    body.innerHTML=rows.length?rows.map(row).join(''):'<tr><td colspan="8">No hay clientes que coincidan con el filtro.</td></tr>';
    body.querySelectorAll('[data-contact-project]').forEach(btn=>btn.addEventListener('click',()=>registerContact(btn.dataset.contactProject,btn.dataset.clientName)));
  }

  function row(r) {
    const phone=String(r.whatsapp||r.telefono||'').replace(/\D/g,'');
    const wa=phone?`https://wa.me/${phone}`:'';
    const pending=[]; if(r.etapas_atrasadas)pending.push(`${r.etapas_atrasadas} etapa(s) atrasada(s)`); if(r.observaciones_pendientes)pending.push(`${r.observaciones_pendientes} observación(es)`); if(r.pagos_pendientes)pending.push(`${r.pagos_pendientes} pago(s)`);
    return `<tr class="plan-row health-${esc(r.salud)}">
      <td><span class="health-pill ${esc(r.salud)}"><span></span>${esc(r.salud)}</span><br><small>${Number(r.puntaje_salud||0)}%</small></td>
      <td><strong>${esc(r.cliente_nombre||'Sin nombre')}</strong><br><span>${esc(r.plan_nombre)}</span><br><small>${esc(r.correo||r.telefono||'Sin contacto')}</small></td>
      <td><strong>${esc(r.numero_proyecto||'Proyecto')}</strong><br><span>${esc((r.proyecto_estado||'activo').replaceAll('_',' '))}</span><br><small>${money(r.total)}</small></td>
      <td><strong>${esc(r.etapa_actual)}</strong><br><div class="plan-progress"><span style="width:${Math.min(100,Number(r.avance_porcentaje||0))}%"></span></div><small>${Number(r.avance_porcentaje||0)}% · ${esc((r.etapa_estado||'').replaceAll('_',' '))}</small></td>
      <td><strong>${Number(r.dias_sin_contacto||0)} días sin contacto</strong><br><small>Último: ${fmtDate(r.ultimo_contacto)}<br>Actualización: ${fmtDate(r.ultima_actualizacion)}</small></td>
      <td>${pending.length?pending.map(x=>`<span class="plan-pending">${esc(x)}</span>`).join(''):'<span class="plan-ok">Sin pendientes críticos</span>'}</td>
      <td><strong>${esc(r.proxima_accion)}</strong><br><small>${fmtDate(r.fecha_proxima_accion)}</small></td>
      <td><div class="plan-actions">${wa?`<a class="btn-action" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>`:''}${r.correo?`<a class="btn-action" href="mailto:${esc(r.correo)}">Correo</a>`:''}<button class="btn-action" type="button" data-contact-project="${esc(r.proyecto_id)}" data-client-name="${esc(r.cliente_nombre)}">Registrar contacto</button></div></td>
    </tr>`;
  }

  async function registerContact(projectId, clientName) {
    const notes=window.prompt(`Resultado del contacto con ${clientName}:`); if(notes===null)return;
    const client=db(); if(!client)return;
    const {error}=await client.rpc('crm_registrar_contacto_cliente_plan',{p_proyecto_id:projectId,p_canal:'telefono',p_resultado:'contactado',p_notas:notes,p_contacto_util:true,p_proximo_contacto_en:null});
    if(error){window.alert(`No se pudo registrar: ${error.message}`);return;}
    await load();
  }

  document.addEventListener('DOMContentLoaded',install);
})();
