(() => {
  'use strict';
  const BUSINESS_KEY = 'tpl_business_v1';
  const LANDING_KEY = 'tpl_landing_engine_v1';
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const seed = (window.TPL_PUBLIC_LANDINGS || []).map((landing) => ({
    ...landing,
    updatedAt: landing.updatedAt || new Date().toISOString()
  }));
  let state = load();
  function load(){try{const data=JSON.parse(localStorage.getItem(LANDING_KEY)||'null');return Array.isArray(data)&&data.length?data:structuredClone(seed)}catch{return structuredClone(seed)}}
  function save(){localStorage.setItem(LANDING_KEY, JSON.stringify(state));window.dispatchEvent(new CustomEvent('tpl:landing-updated'));}
  function business(){try{return JSON.parse(localStorage.getItem(BUSINESS_KEY)||'{}')}catch{return {}}}
  function score(l){
    const parts={
      hero:l.title&&l.subtitle&&l.heroImage?15:0,
      gallery:Array.isArray(l.gallery)?Math.min(15,l.gallery.filter(Boolean).length*4):0,
      video:l.videoUrl?10:0,
      cta:l.ctaPrimary&&l.ctaSecondary?15:l.ctaPrimary?9:0,
      seo:l.seoTitle&&l.seoDescription?20:l.seoTitle||l.seoDescription?10:0,
      analytics:l.analyticsEnabled?10:0,
      speed:l.heroImage&&(!l.heroImage.match(/\.(png|jpg|jpeg)$/i))?10:6,
      form:l.formEnabled?5:0
    };
    return {total:Object.values(parts).reduce((a,b)=>a+b,0),parts};
  }
  function install(){
    const nav=document.querySelector('.sidebar-nav'), main=document.querySelector('.main-content');
    if(!nav||!main||document.getElementById('view-landing-engine'))return;
    const link=document.createElement('a');link.href='#';link.className='nav-item';link.dataset.target='view-landing-engine';link.innerHTML='<i data-lucide="panels-top-left"></i> Landing Engine';
    const businessLinks=[...nav.querySelectorAll('.nav-item')].filter(x=>['view-business-dashboard','view-business-clients','view-business-projects'].includes(x.dataset.target));
    const anchor=businessLinks.at(-1); anchor?.after(link);
    link.addEventListener('click',e=>{e.preventDefault();activate(link);render();});
    const view=document.createElement('div');view.id='view-landing-engine';view.className='dashboard-section';view.style.display='none';view.innerHTML=`
      <section class="business-hero landing-engine-hero"><div><span class="eyebrow">TPL BUSINESS · SPRINT 2</span><h2>Landing Engine</h2><p>Crea, evalúa y publica landings comerciales conectadas a clientes y proyectos.</p></div><button class="business-primary" id="landing-new">Nueva landing</button></section>
      <section class="landing-summary"><article><strong id="landing-count">0</strong><span>Landings</span></article><article><strong id="landing-published">0</strong><span>Publicadas</span></article><article><strong id="landing-average">0</strong><span>Score promedio</span></article><article><strong id="landing-ready">0</strong><span>Listas para Ads</span></article></section>
      <div id="landing-list" class="landing-grid"></div>`;
    main.append(view, buildModal());
    document.getElementById('landing-new').addEventListener('click',()=>openEditor());
    document.addEventListener('click',handleClick);
    render(); window.lucide?.createIcons();
  }
  function activate(link){document.querySelectorAll('.dashboard-section').forEach(s=>{s.classList.remove('active-section');s.style.display='none'});document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));document.getElementById('view-landing-engine').style.display='block';document.getElementById('view-landing-engine').classList.add('active-section');link.classList.add('active');const t=document.getElementById('topbar-title');if(t)t.textContent='Landing Engine';}
  function buildModal(){const el=document.createElement('div');el.id='landing-modal';el.className='business-modal';el.innerHTML='<div class="business-modal-box landing-modal-box"><div class="business-modal-head"><h3 id="landing-modal-title">Editar landing</h3><button type="button" class="business-secondary" data-landing-close>Cerrar</button></div><div class="business-modal-body" id="landing-modal-body"></div></div>';return el;}
  function render(){
    const list=document.getElementById('landing-list');if(!list)return;
    const avg=state.length?Math.round(state.reduce((n,l)=>n+score(l).total,0)/state.length):0;
    set('landing-count',state.length);set('landing-published',state.filter(x=>x.status==='published').length);set('landing-average',`${avg}/100`);set('landing-ready',state.filter(x=>score(x).total>=85&&x.analyticsEnabled).length);
    const biz=business();
    list.innerHTML=state.map(l=>{const s=score(l);const p=(biz.projects||[]).find(x=>x.id===l.projectId);return `<article class="landing-card"><div class="landing-card-image" style="background-image:url('${esc(l.heroImage)}')"><span class="landing-state ${l.status}">${l.status==='published'?'Publicada':'Borrador'}</span><div class="landing-score ${s.total>=85?'good':s.total>=65?'mid':'low'}"><strong>${s.total}</strong><span>/100</span></div></div><div class="landing-card-body"><span class="eyebrow">${esc(l.template.replaceAll('-',' '))}</span><h3>${esc(l.title)}</h3><p>${esc(p?.name||'Proyecto sin asociar')}</p><div class="landing-mini-checks"><span class="${l.analyticsEnabled?'ok':''}">Analytics</span><span class="${l.formEnabled?'ok':''}">Formulario</span><span class="${l.videoUrl?'ok':''}">Video</span><span class="${l.adsReady?'ok':''}">Ads</span></div><div class="landing-actions"><button data-landing-edit="${esc(l.id)}">Editar</button><a href="/plataforma/landing/?id=${encodeURIComponent(l.id)}" target="_blank" rel="noopener">Vista previa</a><button data-landing-publish="${esc(l.id)}">${l.status==='published'?'Despublicar':'Publicar'}</button></div></div></article>`}).join('')||'<div class="business-empty">Todavía no hay landings.</div>';
  }
  function openEditor(id){
    const l=state.find(x=>x.id===id)||{id:'',status:'draft',template:'parcela-premium',objective:'agendar_visitas',gallery:[],benefits:[],formEnabled:true,analyticsEnabled:false,adsReady:false};
    const biz=business(), projects=biz.projects||[];
    document.getElementById('landing-modal-title').textContent=id?'Editar landing':'Nueva landing';
    document.getElementById('landing-modal-body').innerHTML=`<form id="landing-form" class="business-form"><input type="hidden" name="id" value="${esc(l.id)}"><label>Proyecto<select name="projectId"><option value="">Sin proyecto</option>${projects.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label><label>Plantilla<select name="template"><option value="parcela-premium">Parcela Premium</option><option value="servicio-premium">Servicio Premium</option></select></label><label>Objetivo<select name="objective"><option value="agendar_visitas">Agendar visitas</option><option value="formularios">Generar formularios</option><option value="whatsapp">Recibir WhatsApp</option><option value="ventas">Generar ventas</option></select></label><label>Estado<select name="status"><option value="draft">Borrador</option><option value="published">Publicada</option></select></label><label class="wide">Título principal<input name="title" required value="${esc(l.title||'')}"></label><label class="wide">Subtítulo<textarea name="subtitle" rows="2">${esc(l.subtitle||'')}</textarea></label><label>Texto superior<input name="eyebrow" value="${esc(l.eyebrow||'')}"></label><label>Precio<input name="price" value="${esc(l.price||'')}"></label><label>Ubicación<input name="location" value="${esc(l.location||'')}"></label><label>Imagen hero<input name="heroImage" value="${esc(l.heroImage||'')}"></label><label class="wide">Descripción<textarea name="description" rows="3">${esc(l.description||'')}</textarea></label><label class="wide">Galería (una URL por línea)<textarea name="gallery" rows="4">${esc((l.gallery||[]).join('\n'))}</textarea></label><label class="wide">Beneficios (uno por línea)<textarea name="benefits" rows="4">${esc((l.benefits||[]).join('\n'))}</textarea></label><label>CTA principal<input name="ctaPrimary" value="${esc(l.ctaPrimary||'Agendar visita')}"></label><label>CTA secundario<input name="ctaSecondary" value="${esc(l.ctaSecondary||'Hablar por WhatsApp')}"></label><label>WhatsApp<input name="whatsapp" value="${esc(l.whatsapp||'')}"></label><label>Video URL<input name="videoUrl" value="${esc(l.videoUrl||'')}"></label><label class="wide">Mapa / enlace de ubicación<input name="mapUrl" value="${esc(l.mapUrl||'')}"></label><label class="wide">Título SEO<input name="seoTitle" value="${esc(l.seoTitle||'')}"></label><label class="wide">Descripción SEO<textarea name="seoDescription" rows="2">${esc(l.seoDescription||'')}</textarea></label><label class="landing-check"><input type="checkbox" name="formEnabled" ${l.formEnabled?'checked':''}> Formulario activo</label><label class="landing-check"><input type="checkbox" name="analyticsEnabled" ${l.analyticsEnabled?'checked':''}> Analytics conectado</label><label class="landing-check"><input type="checkbox" name="adsReady" ${l.adsReady?'checked':''}> Lista para Google Ads</label><div class="wide landing-score-preview" id="landing-score-preview"></div><div class="wide business-modal-foot"><button type="button" class="business-secondary" data-landing-close>Cancelar</button><button class="business-primary" type="submit">Guardar landing</button></div></form>`;
    const f=document.getElementById('landing-form');f.projectId.value=l.projectId||'';f.template.value=l.template||'parcela-premium';f.objective.value=l.objective||'agendar_visitas';f.status.value=l.status||'draft';
    const updatePreview=()=>{const d=formData(f,l);const s=score(d);document.getElementById('landing-score-preview').innerHTML=`<strong>Landing Score: ${s.total}/100</strong><span>Hero ${s.parts.hero}/15 · Fotos ${s.parts.gallery}/15 · Video ${s.parts.video}/10 · CTA ${s.parts.cta}/15 · SEO ${s.parts.seo}/20 · Analytics ${s.parts.analytics}/10 · Velocidad ${s.parts.speed}/10 · Formulario ${s.parts.form}/5</span>`};
    f.addEventListener('input',updatePreview);updatePreview();
    f.addEventListener('submit',e=>{e.preventDefault();const d=formData(f,l);d.id=d.id||`land-${Date.now()}`;d.updatedAt=new Date().toISOString();const i=state.findIndex(x=>x.id===d.id);i>=0?state[i]=d:state.push(d);save();close();render();});
    document.getElementById('landing-modal').classList.add('open');
  }
  function formData(f,old){const d=Object.fromEntries(new FormData(f));d.gallery=String(d.gallery||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);d.benefits=String(d.benefits||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);d.formEnabled=f.formEnabled.checked;d.analyticsEnabled=f.analyticsEnabled.checked;d.adsReady=f.adsReady.checked;d.clientId=old.clientId||'';return d;}
  function handleClick(e){const edit=e.target.closest('[data-landing-edit]');if(edit)openEditor(edit.dataset.landingEdit);const pub=e.target.closest('[data-landing-publish]');if(pub){const l=state.find(x=>x.id===pub.dataset.landingPublish);if(l){l.status=l.status==='published'?'draft':'published';l.updatedAt=new Date().toISOString();save();render();}}if(e.target.closest('[data-landing-close]')||e.target.id==='landing-modal')close();}
  function close(){document.getElementById('landing-modal')?.classList.remove('open');}
  function set(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
  document.addEventListener('DOMContentLoaded',install);
})();
