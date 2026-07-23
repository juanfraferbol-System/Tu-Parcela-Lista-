(() => {
  'use strict';
  const STORAGE_KEY = 'tpl_studio_campaigns_v1';
  const QUEUE_KEY = 'tpl_studio_queue_v1';
  const $ = (id) => document.getElementById(id);
  const state = { current: null, campaigns: read(STORAGE_KEY), queue: read(QUEUE_KEY) };

  function read(key){ try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]} }
  function save(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state.campaigns)); localStorage.setItem(QUEUE_KEY,JSON.stringify(state.queue)); }
  function uid(){ return `TPL-STUDIO-${Date.now().toString(36).toUpperCase()}` }
  function toast(message){ const el=$('toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2400) }
  function esc(value=''){ return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])) }

  function collect(){
    return {
      id:uid(), createdAt:new Date().toISOString(), name:$('project-name').value.trim(), type:$('project-type').value,
      commune:$('commune').value.trim(), price:$('price').value.trim(), landSize:$('land-size').value.trim(), houseSize:$('house-size').value.trim(),
      value:$('value-proposition').value.trim(), features:$('features').value.trim(), images:$('images').value.split(/\n+/).map(x=>x.trim()).filter(Boolean),
      formats:[...document.querySelectorAll('#formats input:checked')].map(x=>x.value), tone:$('tone').value, audience:$('audience').value, cta:$('cta').value.trim()
    };
  }

  function buildStoryboard(c){
    const location=c.commune?` en ${c.commune}`:'';
    const scenes=[
      {title:'Apertura emocional',seconds:'0–4 s',visual:`Vista amplia del entorno${location}, movimiento cinematográfico suave y sensación de libertad.`,purpose:'Detener el scroll y despertar interés.'},
      {title:'Presentación del proyecto',seconds:'4–9 s',visual:`Mostrar ${c.name} con sus mejores imágenes, texto breve y precio ${c.price||'a consultar'}.`,purpose:'Explicar rápidamente qué se ofrece.'},
      {title:'Espacio y distribución',seconds:'9–15 s',visual:`Destacar ${c.landSize||'la superficie del terreno'} y ${c.houseSize||'la solución habitacional'}, usando transiciones limpias.`,purpose:'Dar escala y hacer tangible el proyecto.'},
      {title:'Beneficios principales',seconds:'15–21 s',visual:`Representar visualmente: ${c.features||c.value||'naturaleza, conectividad y calidad de vida'}.`,purpose:'Transformar características en beneficios.'},
      {title:'Vida futura',seconds:'21–26 s',visual:`Familia disfrutando una vida tranquila y realista, coherente con la audiencia ${c.audience.replaceAll('_',' ')}.`,purpose:'Ayudar al cliente a imaginarse viviendo allí.'},
      {title:'Cierre comercial',seconds:'26–30 s',visual:`Logo Tu Parcela Lista, nombre del proyecto y llamado: ${c.cta}.`,purpose:'Generar una acción concreta.'}
    ];
    if(c.type==='partner'){
      scenes[0].visual='Problema cotidiano del cliente antes de contratar el servicio.';
      scenes[2].visual=`Proceso técnico explicado de forma simple: ${c.features||'diagnóstico, instalación y comprobación final'}.`;
      scenes[4].visual='Resultado terminado, prueba de funcionamiento y cliente satisfecho.';
    }
    const narration=`Imagina una nueva etapa${location}. ${c.name} reúne ${c.landSize||'espacio'}${c.houseSize?` y ${c.houseSize}`:''} para crear un proyecto pensado en ${c.value||'vivir con más libertad y tranquilidad'}. ${c.features?`Incluye ${c.features}. `:''}${c.price?`Disponible desde ${c.price}. `:''}${c.cta}.`;
    return {scenes,narration};
  }

  function createOutputs(c){
    const labels={video_30:'Video 30 segundos',reel:'Reel / TikTok',facebook:'Publicación Facebook',instagram:'Publicación Instagram',pdf:'Ficha PDF',seo:'SEO / Blog'};
    return c.formats.map(format=>({id:uid(),campaignId:c.id,type:format,label:labels[format]||format,status:'preparado',provider:'pendiente_conexion',createdAt:c.createdAt}));
  }

  function renderStoryboard(c){
    if(!c){$('storyboard-empty').hidden=false;$('storyboard-list').innerHTML='';$('narration-box').hidden=true;return}
    $('storyboard-empty').hidden=true;
    $('storyboard-summary').textContent=`${c.storyboard.scenes.length} escenas · ${c.formats.length} formatos · ${c.name}`;
    $('storyboard-list').innerHTML=c.storyboard.scenes.map((s,i)=>`<article class="scene"><div class="scene-number">${i+1}</div><div><h3>${esc(s.title)}</h3><p><strong>Visual:</strong> ${esc(s.visual)}<br><strong>Objetivo:</strong> ${esc(s.purpose)}</p></div><span class="scene-time">${esc(s.seconds)}</span></article>`).join('');
    $('narration-text').textContent=c.storyboard.narration; $('narration-box').hidden=false;
  }

  function renderQueue(){
    $('queue-total').textContent=state.queue.length; $('queue-ready').textContent=state.queue.filter(x=>x.status==='preparado').length; $('queue-pending').textContent=state.queue.filter(x=>x.provider==='pendiente_conexion').length;
    $('queue-list').innerHTML=state.queue.length?state.queue.map(x=>`<article class="queue-item"><div><h3>${esc(x.label)}</h3><p>${esc(x.projectName)} · ${new Date(x.createdAt).toLocaleString('es-CL')}</p></div><span class="badge">Proveedor IA pendiente</span></article>`).join(''):'<div class="empty-state"><h3>La cola está vacía</h3><p>Prepara una campaña para crear los primeros trabajos.</p></div>';
  }

  function renderLibrary(){
    $('asset-count').textContent=state.queue.length;
    $('library-list').innerHTML=state.campaigns.length?state.campaigns.map(c=>`<article class="library-card"><span class="eyebrow">${esc(c.type.replaceAll('_',' '))}</span><h3>${esc(c.name)}</h3><p>${esc(c.commune||'Sin comuna')} · ${c.formats.length} formatos · ${new Date(c.createdAt).toLocaleDateString('es-CL')}</p><button class="btn-secondary open-campaign" data-id="${esc(c.id)}">Abrir storyboard</button></article>`).join(''):'<div class="empty-state"><h3>Sin campañas guardadas</h3><p>La primera campaña aparecerá aquí.</p></div>';
    document.querySelectorAll('.open-campaign').forEach(btn=>btn.addEventListener('click',()=>{state.current=state.campaigns.find(c=>c.id===btn.dataset.id);renderStoryboard(state.current);switchView('storyboard')}));
  }

  function switchView(name){ document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`)); document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name)); $('view-title').textContent=({crear:'Crear campaña',storyboard:'Storyboard',cola:'Cola de producción',biblioteca:'Biblioteca'})[name]; if(name==='cola')renderQueue(); if(name==='biblioteca')renderLibrary() }

  $('campaign-form').addEventListener('submit',e=>{e.preventDefault();const c=collect();c.storyboard=buildStoryboard(c);c.outputs=createOutputs(c);state.current=c;state.campaigns.unshift(c);state.queue.unshift(...c.outputs.map(o=>({...o,projectName:c.name})));save();renderStoryboard(c);renderQueue();renderLibrary();switchView('storyboard');toast('Kit preparado y guardado en la cola')});
  $('load-example').addEventListener('click',()=>{$('project-name').value='Parcela El Roble + Casa 54 m²';$('commune').value='Nacimiento';$('price').value='$39.990.000';$('land-size').value='5.000 m²';$('house-size').value='54 m², 3 dormitorios';$('value-proposition').value='Un proyecto de campo accesible, rodeado de naturaleza y preparado para comenzar una nueva etapa familiar.';$('features').value='Casa prefabricada, fundación, instalación eléctrica, solución sanitaria y opción de paneles solares';$('images').value='image/nacimiento/nac_el_roble/el_roble (5).webp';toast('Ejemplo cargado')});
  $('copy-script').addEventListener('click',async()=>{if(!state.current)return toast('Primero prepara una campaña');await navigator.clipboard.writeText(state.current.storyboard.narration);toast('Narración copiada')});
  $('export-json').addEventListener('click',()=>{if(!state.current)return toast('Primero prepara una campaña');const blob=new Blob([JSON.stringify(state.current,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${state.current.id}.json`;a.click();URL.revokeObjectURL(a.href)});
  $('clear-queue').addEventListener('click',()=>{if(!confirm('¿Limpiar la cola local de producción?'))return;state.queue=[];save();renderQueue();renderLibrary();toast('Cola limpiada')});
  document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
  lucide.createIcons(); renderQueue(); renderLibrary(); renderStoryboard(null);
})();
