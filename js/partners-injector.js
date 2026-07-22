// Partners públicos recomendados según comuna de la parcela.
const SUPABASE_URL = 'https://qxavbqhyqaqalpzbhwmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJxeGF2YnFoeXFhcWFscHpiaHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA';

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function safeImage(value) {
  try {
    const url = new URL(value, location.origin);
    return ['http:', 'https:'].includes(url.protocol) && [location.hostname, 'qxavbqhyqaqalpzbhwmh.supabase.co'].includes(url.hostname) ? url.href : '';
  } catch { return ''; }
}
function textNode(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text || '';
  if (className) node.className = className;
  return node;
}

async function fetchAndRenderPartners(comuna) {
  if (!comuna) return;
  const section = document.getElementById('partners-section');
  const grid = document.getElementById('partners-grid');
  const label = document.getElementById('partners-comuna-label');
  if (!section || !grid || !label) return;

  try {
    const fields = 'nombre_comercial,descripcion_servicios,tipo_servicio,comunas_atendidas,logo_url,slug,rating,plan_activo';
    const response = await fetch(`${SUPABASE_URL}/rest/v1/partners_publicos?select=${fields}&order=rating.desc&limit=24`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!response.ok) throw new Error('PARTNERS_REQUEST_FAILED');
    const partners = await response.json();
    const target = normalize(comuna);
    const visible = (partners || []).filter(partner => (partner.comunas_atendidas || []).some(item => normalize(item) === target));
    if (!visible.length) { section.style.display = 'none'; return; }
    visible.sort((a, b) => (b.plan_activo === 'premium') - (a.plan_activo === 'premium') || Number(b.rating || 0) - Number(a.rating || 0));

    label.textContent = comuna;
    grid.replaceChildren();
    visible.slice(0, 6).forEach(partner => {
      const card = document.createElement('article');
      card.className = 'partner-recommendation-card';
      card.style.cssText = 'background:white;border:1px solid #e2e8f0;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:10px;position:relative;box-shadow:0 4px 6px rgba(0,0,0,.02)';
      if (partner.plan_activo === 'premium') {
        const badge = textNode('span', 'PREMIUM');
        badge.style.cssText = 'background:#f59e0b;color:white;padding:2px 8px;border-radius:12px;font-size:.7rem;font-weight:bold;position:absolute;top:-10px;right:10px';
        card.appendChild(badge);
      }
      const head = document.createElement('div'); head.style.cssText='display:flex;gap:15px;align-items:center';
      const image = document.createElement('img'); image.width=60; image.height=60; image.alt=`Logo de ${partner.nombre_comercial || 'Partner TPL'}`; image.loading='lazy'; image.style.cssText='width:60px;height:60px;border-radius:50%;object-fit:cover;border:1px solid #eee;background:#f1f5f9';
      const src=safeImage(partner.logo_url); if(src) image.src=src;
      const titleWrap=document.createElement('div'); const title=textNode('h3',partner.nombre_comercial||'Partner TPL'); title.style.cssText='margin:0;font-size:1.1rem;color:#003f7a';
      const rating=textNode('div',`★ ${Number(partner.rating||0).toFixed(1)}`); rating.style.cssText='color:#f59e0b;font-size:.9rem'; titleWrap.append(title,rating); head.append(image,titleWrap);
      const description=textNode('p',partner.descripcion_servicios||''); description.style.cssText='margin:5px 0;font-size:.9rem;color:#475569;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden';
      const service=textNode('div',`Servicio: ${partner.tipo_servicio||'Servicios para proyectos'}`); service.style.cssText='font-size:.85rem;color:#64748b';
      const link=document.createElement('a'); link.href=`/plataforma/partners/perfil.html?id=${encodeURIComponent(partner.slug)}`; link.textContent='Ver perfil y cotizar'; link.style.cssText='display:block;width:100%;text-align:center;background:#00828a;color:white;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;box-sizing:border-box';
      const footer=document.createElement('div'); footer.style.cssText='margin-top:auto;padding-top:15px'; footer.appendChild(link);
      card.append(head,description,service,footer); grid.appendChild(card);
    });
    section.style.display='block';
  } catch (error) {
    console.error('Error cargando partners', error);
    section.style.display='none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const locationText = document.getElementById('detail-location-text')?.textContent || '';
    const comuna = locationText.split(',')[0].trim();
    if (comuna) fetchAndRenderPartners(comuna);
  }, 800);
});
