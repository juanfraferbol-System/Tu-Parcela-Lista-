(function(){
  const DATA_URL='agente/conocimiento.json';
  let knowledge=null;

  const normalize=(txt='')=>txt.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9ñ%$\s]/g,' ')
    .replace(/\s+/g,' ').trim();

  const moneyToNumber=(value='')=>Number(String(value).replace(/[^0-9]/g,''))||0;
  const clp=(n)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n||0);

  function getParcelasData(){
    try{
      if(typeof parcelas!=='undefined' && Array.isArray(parcelas)) return parcelas;
      if(window.parcelas && Array.isArray(window.parcelas)) return window.parcelas;
    }catch(e){}
    return [];
  }

  function parcelaText(p){
    return normalize([
      p.id,p.nombre,p.descripcion,p.comuna,p.detalle,p.precio,p.tamano,
      p.agua==='si'?'agua': '',p.luz==='si'?'luz':'',p.naturaleza==='si'?'naturaleza bosque nativo':'',p.rol==='si'?'rol propio':'',p.facilidad==='si'?'facilidad pago cuotas':'',p.servicios
    ].join(' '));
  }

  function extractBudget(q){
    const n=normalize(q);
    const m=n.match(/(\d+(?:[\.,]\d+)?)\s*(millones|millon|mm|m)/);
    if(m) return Math.round(parseFloat(m[1].replace(',','.'))*1000000);
    const raw=q.match(/\$?\s*([0-9\.]{6,})/);
    if(raw) return moneyToNumber(raw[1]);
    return 0;
  }

  function detectParcelSearch(question){
    const q=normalize(question);
    const parcelWords=['parcela','parcelas','terreno','terrenos','campo','sitio','lote','lotes'];
    const featureWords=['rio','arroyo','estero','canal','vertiente','agua','luz','rol','bosque','nativo','naturaleza','facilidad','cuotas','barata','economica','precio','presupuesto','hectarea','hectareas','quillon','nacimiento','florida','yumbel','cabrero','ñipas','nipas','rio claro','san carlos'];
    return parcelWords.some(w=>q.includes(w)) || featureWords.some(w=>q.includes(w));
  }

  function searchParcelas(question){
    const data=getParcelasData();
    if(!data.length || !detectParcelSearch(question)) return null;
    const q=normalize(question);
    const budget=extractBudget(question);

    const waterTerms=['rio','arroyo','estero','canal','vertiente','curso de agua','agua natural'];
    const wantsWaterCourse=waterTerms.some(t=>q.includes(t));
    const wantsAgua=q.includes('agua') && !wantsWaterCourse;
    const wantsLuz=q.includes('luz') || q.includes('electricidad');
    const wantsRol=q.includes('rol');
    const wantsNative=q.includes('nativo') || q.includes('bosque') || q.includes('naturaleza');
    const wantsPay=q.includes('facilidad') || q.includes('cuotas') || q.includes('financiamiento');
    const wantsCheap=q.includes('barata') || q.includes('economica') || q.includes('economico') || q.includes('menor precio');
    const wantsBig=q.includes('hectarea') || q.includes('hectareas') || q.includes('10000') || q.includes('1 hectarea');

    const comunaWords=['quillon','nacimiento','florida','yumbel','cabrero','nipas','ñipas','rio claro','san carlos'];
    const comunaAsked=comunaWords.find(c=>q.includes(normalize(c)));

    let scored=data.map(p=>{
      const t=parcelaText(p);
      let score=0;
      if(wantsWaterCourse){
        if(/\barroyo\b|\bestero\b|\bvertiente\b|\brio\b|\brío\b|\bcanal\b/.test(t)) score+=12;
        if(normalize(p.nombre||'').includes('rio') || normalize(p.comuna||'').includes('rio')) score+=4;
      }
      if(wantsAgua && p.agua==='si') score+=8;
      if(wantsLuz && p.luz==='si') score+=7;
      if(wantsRol && p.rol==='si') score+=7;
      if(wantsNative && (p.naturaleza==='si' || t.includes('bosque') || t.includes('nativo'))) score+=8;
      if(wantsPay && p.facilidad==='si') score+=9;
      if(wantsBig && Number(p.tamano)>=10000) score+=8;
      if(comunaAsked && normalize(p.comuna||'').includes(comunaAsked)) score+=10;
      if(budget){
        const price=moneyToNumber(p.precio);
        if(price && price<=budget) score+=10;
        else if(price && price<=budget*1.15) score+=4;
        else score-=5;
      }
      q.split(' ').filter(w=>w.length>3).forEach(w=>{ if(t.includes(w)) score+=1; });
      if(wantsCheap) score += Math.max(0, 5 - Math.floor(moneyToNumber(p.precio)/5000000));
      return {p,score};
    }).filter(x=>x.score>0);

    if(wantsCheap) scored.sort((a,b)=>moneyToNumber(a.p.precio)-moneyToNumber(b.p.precio));
    else scored.sort((a,b)=>b.score-a.score || moneyToNumber(a.p.precio)-moneyToNumber(b.p.precio));

    const results=scored.slice(0,5).map(x=>x.p);
    if(!results.length) return null;

    const heading = wantsWaterCourse
      ? 'Encontré estas alternativas relacionadas con río, arroyo, estero o entorno de agua:'
      : 'Encontré estas parcelas que podrían calzar con tu búsqueda:';

    const lines=results.map((p,i)=>{
      const attrs=[];
      if(p.agua==='si') attrs.push('agua');
      if(p.luz==='si') attrs.push('luz');
      if(p.rol==='si') attrs.push('rol propio');
      if(p.facilidad==='si') attrs.push('facilidad pago');
      if(p.naturaleza==='si') attrs.push('naturaleza');
      return `${i+1}. ${p.nombre || p.id} · ${p.comuna || 'sector'} · ${Number(p.tamano||0).toLocaleString('es-CL')} m² · ${p.precio || 'precio a consultar'}${attrs.length?' · '+attrs.join(', '):''}`;
    });

    return {
      answer:`${heading}\n\n${lines.join('\n')}\n\nTe recomiendo abrir la ficha de la que más te guste para revisar fotos, ubicación y descripción.`,
      actions: results.slice(0,4).map((p,i)=>({label:`Ver ${i+1}: ${(p.nombre||'parcela').slice(0,22)}`,href:`parcela.html?id=${encodeURIComponent(p.id)}`})).concat([{label:'Ver todas las parcelas',href:'index.html#parcelas-anchor'}])
    };
  }

  function createUI(){
    if(document.getElementById('tpl-agent-button')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <button class="tpl-agent-button" id="tpl-agent-button" type="button" aria-label="Abrir asesor virtual"><span class="agent-dot"></span><span>Asesor Virtual</span></button>
      <section class="tpl-agent-panel" id="tpl-agent-panel" aria-label="Asesor Virtual Tu Parcela Lista">
        <div class="tpl-agent-head"><div><strong>Asesor Tu Parcela Lista</strong><span>Parcelas, casas, reserva y proceso de compra</span></div><button class="tpl-agent-close" id="tpl-agent-close" type="button">×</button></div>
        <div class="tpl-agent-messages" id="tpl-agent-messages"></div>
        <div class="tpl-agent-quick" id="tpl-agent-quick"></div>
        <form class="tpl-agent-form" id="tpl-agent-form"><input id="tpl-agent-input" autocomplete="off" placeholder="Ej: parcelas con río, arroyo o facilidad de pago..."/><button type="submit">Enviar</button></form>
      </section>`);
  }

  function addMessage(text,type='bot',actions=[]){
    const box=document.getElementById('tpl-agent-messages'); if(!box) return;
    const msg=document.createElement('div'); msg.className=`tpl-msg ${type}`; msg.textContent=text; box.appendChild(msg);
    if(actions && actions.length){
      const row=document.createElement('div'); row.className='tpl-agent-actions';
      actions.forEach(a=>{const link=document.createElement('a'); link.href=a.href||'#'; link.textContent=a.label; row.appendChild(link);});
      box.appendChild(row);
    }
    box.scrollTop=box.scrollHeight;
  }

  function renderQuick(){
    const row=document.getElementById('tpl-agent-quick'); if(!row||!knowledge) return; row.innerHTML='';
    const quicks=knowledge.quickReplies||[];
    quicks.forEach(q=>{const b=document.createElement('button'); b.className='tpl-quick-reply'; b.type='button'; b.textContent=q; b.addEventListener('click',()=>ask(q)); row.appendChild(b);});
  }

  function findIntent(question){
    const q=normalize(question); let best=null;
    (knowledge?.intents||[]).forEach(intent=>{
      let score=0;
      (intent.keywords||[]).forEach(k=>{const nk=normalize(k); if(!nk) return; if(q.includes(nk)) score+= nk.split(' ').length>1 ? 4 : 2;});
      const words=q.split(' ').filter(w=>w.length>3); words.forEach(w=>{ if(normalize(intent.title||'').includes(w)) score+=1; });
      if(!best || score>best.score) best={intent,score};
    });
    return best && best.score>0 ? best.intent : null;
  }

  function fallback(question){
    const q=normalize(question);
    if(/\d+\s*(mill|millon|millones)|\$/.test(q)) return knowledge.intents.find(i=>i.id==='presupuesto');
    return null;
  }

  function ask(question){
    if(!question || !question.trim()) return;
    addMessage(question,'user');
    const parcelaResult=searchParcelas(question);
    const intent=parcelaResult ? null : (findIntent(question)||fallback(question));
    setTimeout(()=>{
      if(parcelaResult){ addMessage(parcelaResult.answer,'bot',parcelaResult.actions); }
      else if(intent){ addMessage(intent.answer,'bot',intent.actions); }
      else { addMessage('Puedo orientarte, pero necesito un poco más de contexto. Pregúntame por reserva, compra, parcelas con río o arroyo, facilidad de pago, casas prefabricadas, diseño propio, visita a terreno, agua, luz, rol o presupuesto. También puedes dejar tus datos para que un asesor humano revise tu caso.','bot',[{label:'Contacto',href:'index.html#contacto'},{label:'Cómo comprar',href:'como-comprar.html'}]); }
    },220);
  }

  async function init(){
    createUI();
    try{ const res=await fetch(DATA_URL,{cache:'no-store'}); knowledge=await res.json(); }
    catch(e){ knowledge={quickReplies:['¿Cómo compro una parcela?','Parcelas con río o arroyo','¿Cómo reservo?','Contacto'],intents:[]}; }
    const panel=document.getElementById('tpl-agent-panel');
    document.getElementById('tpl-agent-button')?.addEventListener('click',()=>{panel.classList.add('open'); if(!panel.dataset.started){ addMessage('Hola 👋 Soy el Asesor Virtual de Tu Parcela Lista. Puedo ayudarte a encontrar parcelas por características como río, arroyo, agua, luz, bosque nativo, facilidad de pago, comuna o presupuesto.','bot',[{label:'Parcelas con río o arroyo',href:'#'},{label:'Cómo comprar',href:'como-comprar.html'},{label:'Ver parcelas',href:'index.html#parcelas-anchor'}]); panel.dataset.started='1'; }});
    document.getElementById('tpl-agent-close')?.addEventListener('click',()=>panel.classList.remove('open'));
    document.getElementById('tpl-agent-form')?.addEventListener('submit',e=>{e.preventDefault(); const input=document.getElementById('tpl-agent-input'); ask(input.value); input.value='';});
    document.addEventListener('click',e=>{ const a=e.target.closest('.tpl-agent-actions a[href="#"]'); if(a){ e.preventDefault(); ask(a.textContent); }});
    renderQuick();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
