(function () {
  'use strict';
  const state = { rows: [], loaded: false };
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const date = value => value ? new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '—';
  const planLabel = value => ({partner:'Partner gratis',ideal:'Ideal',empresa:'Empresa',premium:'Premium'}[value] || value || '—');
  const client = () => window.TPL_getSupabaseClient?.();

  async function load() {
    const sb = client();
    if (!sb) return renderError('No se pudo iniciar Supabase.');
    const { data, error } = await sb.from('partner_postulaciones').select('*').order('creado_en',{ascending:false}).limit(300);
    if (error) return renderError(error.message);
    state.rows = data || []; state.loaded = true; render(); updateMetrics();
  }
  function updateMetrics() {
    const count = key => state.rows.filter(row => row.estado === key).length;
    $('partner-count-pending').textContent=count('pendiente'); $('partner-count-info').textContent=count('antecedentes');
    $('partner-count-approved').textContent=count('aprobada'); $('partner-count-rejected').textContent=count('rechazada');
    const badge=$('partner-pending-badge'), total=count('pendiente'); badge.textContent=total; badge.hidden=!total;
  }
  function filtered() {
    const status=$('partner-application-filter')?.value || '';
    const query=($('partner-application-search')?.value || '').trim().toLowerCase();
    return state.rows.filter(row => (!status || row.estado===status) && (!query || [row.nombre_comercial,row.nombre_responsable,row.correo,row.codigo].some(v=>String(v||'').toLowerCase().includes(query))));
  }
  function render() {
    const body=$('partner-applications-body'); if(!body)return;
    const rows=filtered();
    if(!rows.length){body.innerHTML='<tr><td colspan="7">No hay postulaciones para este filtro.</td></tr>';return;}
    body.innerHTML=rows.map(row=>`<tr>
      <td><strong>${esc(row.codigo)}</strong><br><small>${esc(row.nombre_responsable)}</small></td>
      <td><strong>${esc(row.nombre_comercial)}</strong><br><small>${esc(row.correo)} · ${esc(row.whatsapp)}</small></td>
      <td>${esc(row.tipo_servicio)}<br><small>${esc(row.region)} · ${esc((row.comunas_atendidas||[]).join(', '))}</small></td>
      <td>${esc(planLabel(row.plan_solicitado))}</td><td><span class="partner-state ${esc(row.estado)}">${esc(row.estado)}</span></td><td>${esc(date(row.creado_en))}</td>
      <td><div class="partner-actions"><button data-partner-view="${row.id}">Ver</button>${row.estado==='pendiente'||row.estado==='antecedentes'?`<button class="approve" data-partner-action="aprobar" data-id="${row.id}">Aprobar</button><button data-partner-action="antecedentes" data-id="${row.id}">Antecedentes</button><button class="reject" data-partner-action="rechazar" data-id="${row.id}">Rechazar</button>`:''}</div></td>
    </tr>`).join('');
  }
  function renderError(message){const body=$('partner-applications-body');if(body)body.innerHTML=`<tr><td colspan="7">Error: ${esc(message)}</td></tr>`;}
  function showDetail(id){
    const row=state.rows.find(item=>item.id===id); if(!row)return;
    const modal=$('modal-detalle'), content=$('modal-content'), actions=$('modal-actions'); if(!modal||!content)return;
    content.innerHTML=`<div class="partner-detail-grid"><div><strong>Código</strong>${esc(row.codigo)}</div><div><strong>Estado</strong>${esc(row.estado)}</div><div><strong>Empresa</strong>${esc(row.nombre_comercial)}</div><div><strong>Responsable</strong>${esc(row.nombre_responsable)}</div><div><strong>Correo</strong>${esc(row.correo)}</div><div><strong>WhatsApp</strong>${esc(row.whatsapp)}</div><div><strong>Servicio</strong>${esc(row.tipo_servicio)}</div><div><strong>Plan solicitado</strong>${esc(planLabel(row.plan_solicitado))}</div><div><strong>Región</strong>${esc(row.region)}</div><div><strong>Comunas</strong>${esc((row.comunas_atendidas||[]).join(', '))}</div><div class="partner-detail-wide"><strong>Especialidades</strong>${esc((row.especialidades||[]).join(', '))}</div><div class="partner-detail-wide"><strong>Descripción</strong>${esc(row.descripcion_servicios)}</div><div><strong>Experiencia</strong>${esc(row.anos_experiencia)} años</div><div><strong>Disponibilidad</strong>${esc(row.disponibilidad)}</div><div class="partner-detail-wide"><strong>Consentimientos</strong>Términos: ${row.acepta_terminos?'Sí':'No'} · Privacidad: ${row.acepta_privacidad?'Sí':'No'} · Contacto: ${row.autoriza_contacto?'Sí':'No'}</div>${row.motivo_estado?`<div class="partner-detail-wide"><strong>Observación administrativa</strong>${esc(row.motivo_estado)}</div>`:''}</div>`;
    if(actions)actions.innerHTML=''; modal.classList.add('active'); modal.style.display='flex';
  }
  async function review(id, action){
    let motive='';
    if(action!=='aprobar'){motive=prompt(action==='rechazar'?'Motivo del rechazo:':'Antecedentes que debe enviar:')||'';if(!motive.trim())return;}
    if(action==='aprobar'&&!confirm('Aprobar esta postulación creará el Partner interno. No activará un plan pagado ni lo hará público. ¿Continuar?'))return;
    const sb=client(); const {error}=await sb.rpc('tpl_revisar_postulacion_partner',{p_id:id,p_accion:action,p_motivo:motive||null});
    if(error){alert(`No fue posible actualizar: ${error.message}`);return;} await load();
  }
  function bind(){
    $('btn-refresh-partner-applications')?.addEventListener('click',load);
    $('partner-application-filter')?.addEventListener('change',render);
    $('partner-application-search')?.addEventListener('input',render);
    document.addEventListener('click',event=>{const view=event.target.closest('[data-partner-view]');if(view)showDetail(view.dataset.partnerView);const action=event.target.closest('[data-partner-action]');if(action)review(action.dataset.id,action.dataset.partnerAction);});
    document.querySelector('[data-target="view-partner-postulaciones"]')?.addEventListener('click',()=>{if(!state.loaded)load();});
  }
  document.addEventListener('DOMContentLoaded',()=>{bind();load();});
})();
