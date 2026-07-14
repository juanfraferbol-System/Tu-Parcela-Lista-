/* =====================================================
   TU PARCELA LISTA - ANALYTICS LOCAL / CRM BASE
   Guarda métricas en localStorage para demo y pruebas.
   Para producción online real, conectar con Supabase/Firebase.
===================================================== */
(function(){
  const STORE_KEY = 'tplCRMData';
  const now = () => new Date().toISOString();
  const getId = () => new URLSearchParams(location.search).get('id') || localStorage.getItem('selectedParcelaId') || 'general';
  function read(){
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch(e){ return {}; }
  }
  function write(data){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
  function ensure(data){
    data.general = data.general || { visits:0, pages:{}, events:[], startedAt: now() };
    data.parcelas = data.parcelas || {};
    data.leads = data.leads || [];
    data.comments = data.comments || [];
    data.ratings = data.ratings || {};
    return data;
  }
  function event(type, detail={}){
    const data = ensure(read());
    data.general.events.push({ type, detail, page: location.pathname.split('/').pop() || 'index.html', parcelaId:getId(), at:now() });
    if(data.general.events.length > 500) data.general.events = data.general.events.slice(-500);
    write(data);
  }
  function trackVisit(){
    const data = ensure(read());
    const page = location.pathname.split('/').pop() || 'index.html';
    data.general.visits += 1;
    data.general.pages[page] = (data.general.pages[page] || 0) + 1;
    const id = getId();
    if(page.includes('parcela') && id !== 'general'){
      data.parcelas[id] = data.parcelas[id] || { visits:0, interactions:0, lastVisit:null };
      data.parcelas[id].visits += 1;
      data.parcelas[id].lastVisit = now();
    }
    write(data);
  }
  function addLead(lead){
    const data = ensure(read());
    data.leads.unshift({ id:'lead_'+Date.now(), status:'Nuevo', at:now(), ...lead });
    write(data); event('lead_created', { parcelaId: lead.parcelaId, type: lead.type });
  }
  function addComment(comment){
    const data = ensure(read());
    data.comments.unshift({ id:'comment_'+Date.now(), status:'Pendiente', at:now(), ...comment });
    write(data); event('comment_created', { parcelaId: comment.parcelaId });
  }
  function rate(parcelaId, value){
    const data = ensure(read());
    data.ratings[parcelaId] = data.ratings[parcelaId] || { base:5, votes:[] };
    data.ratings[parcelaId].votes.push({ value:Number(value), at:now() });
    const p = data.parcelas[parcelaId] = data.parcelas[parcelaId] || { visits:0, interactions:0, lastVisit:null };
    p.interactions += 1;
    write(data); event('rating', { parcelaId, value:Number(value) });
  }
  function ratingSummary(parcelaId){
    const data = ensure(read());
    const r = data.ratings[parcelaId] || { base:5, votes:[] };
    const votes = r.votes || [];
    if(!votes.length) return { avg:5, count:0 };
    const avg = votes.reduce((a,b)=>a+Number(b.value||0),0) / votes.length;
    return { avg: Math.max(1, Math.min(5, avg)), count:votes.length };
  }
  window.TPLCRM = { read, write, event, trackVisit, addLead, addComment, rate, ratingSummary };
  document.addEventListener('DOMContentLoaded', trackVisit);
  document.addEventListener('click', e => {
    const a = e.target.closest('a,button');
    if(!a) return;
    const txt = (a.innerText || a.id || a.className || '').trim().slice(0,80);
    event('click', { label: txt, href: a.href || '' });
    const id = getId();
    const data = ensure(read());
    if(id !== 'general'){
      data.parcelas[id] = data.parcelas[id] || { visits:0, interactions:0, lastVisit:null };
      data.parcelas[id].interactions += 1;
      write(data);
    }
  }, true);
})();
