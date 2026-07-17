// partners-injector.js
// Fetch and display partners for a given parcela comuna

const SUPABASE_URL = 'https://qxavbqhyqaqalpzbhwmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXZicWh5cWFxYWxwemJod21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA';

async function fetchAndRenderPartners(comuna) {
  if (!comuna) return;

  const section = document.getElementById('partners-section');
  const grid = document.getElementById('partners-grid');
  const label = document.getElementById('partners-comuna-label');
  
  if (!section || !grid || !label) return;

  try {
    // Buscar contratistas que estén verificados y cuya cobertura incluya la comuna (usamos ilike para buscar dentro del string)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/contratistas?estado_verificacion=eq.verificado&comunas_atendidas=ilike.*${comuna}*&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    const partners = await response.json();
    
    // Filtrar localmente para evitar falsos positivos y omitir planes gratis si queremos publicarlos solo para Pro/Premium.
    // El requerimiento decía: "La opción gratuita podrá solamente recibir propuestas de servicios cuando su perfil calce... sin landing pública, sin aparición en búsquedas"
    const visiblePartners = partners.filter(p => p.plan_elegido === 'profesional' || p.plan_elegido === 'premium');

    if (visiblePartners.length === 0) {
      return; // Ocultar si no hay partners de pago en la zona
    }

    // Ordenar (Premium primero, luego Profesional) y por rating
    visiblePartners.sort((a, b) => {
      if (a.plan_elegido === 'premium' && b.plan_elegido !== 'premium') return -1;
      if (b.plan_elegido === 'premium' && a.plan_elegido !== 'premium') return 1;
      return b.rating - a.rating; // Mayor rating primero
    });

    label.textContent = comuna;
    grid.innerHTML = '';

    visiblePartners.forEach(partner => {
      const isPremium = partner.plan_elegido === 'premium';
      const badge = isPremium ? '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: bold; position: absolute; top: -10px; right: 10px;">PREMIUM</span>' : '';
      
      const card = document.createElement('div');
      card.style.cssText = `
        background: white; 
        border: 1px solid #e2e8f0; 
        border-radius: 16px; 
        padding: 20px; 
        display: flex; 
        flex-direction: column; 
        gap: 10px; 
        position: relative;
        box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        transition: transform 0.2s;
      `;
      card.onmouseenter = () => card.style.transform = 'translateY(-2px)';
      card.onmouseleave = () => card.style.transform = 'translateY(0)';

      const logoImg = partner.logo_url || 'https://via.placeholder.com/60?text=Logo';
      
      card.innerHTML = `
        ${badge}
        <div style="display: flex; gap: 15px; align-items: center;">
          <img src="${logoImg}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 1px solid #eee;">
          <div>
            <h3 style="margin: 0; font-size: 1.1rem; color: #003f7a;">${partner.nombre_comercial}</h3>
            <div style="color: #f59e0b; font-size: 0.9rem;">★★★★★ <span style="color: #64748b; font-size: 0.8rem;">${partner.rating}</span></div>
          </div>
        </div>
        <p style="margin: 5px 0; font-size: 0.9rem; color: #475569; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${partner.descripcion_servicios || ''}
        </p>
        <div style="font-size: 0.85rem; color: #64748b;">
          <strong>Servicio:</strong> ${partner.tipo_servicio}
        </div>
        <div style="margin-top: auto; padding-top: 15px;">
          <a href="plataforma/partners/perfil.html?id=${partner.slug}" class="btn" style="display: block; width: 100%; text-align: center; background: #00828a; color: white; padding: 10px; border-radius: 8px; text-decoration: none; font-weight: 600;">Ver Perfil y Cotizar</a>
        </div>
      `;
      
      grid.appendChild(card);
    });

    section.style.display = 'block';

  } catch (err) {
    console.error('Error cargando partners', err);
  }
}

// Escuchar cuando la parcela cargue. `parcelas.js` o el inline script cargan `const p`.
// Podemos intentar buscar la comuna en el DOM.
document.addEventListener("DOMContentLoaded", () => {
  // En parcela.html, la comuna está en #detail-location-text u otro lado, pero sabemos que en el objeto 'p' tenemos 'comuna'.
  // Esperar a que el script de parcela termine de pintar o leer del localStorage/URL.
  setTimeout(() => {
    const locText = document.getElementById("detail-location-text");
    if (locText && locText.textContent) {
      // Usualmente dice "Florida, Región del Biobío". Extraemos la primera parte.
      const comuna = locText.textContent.split(',')[0].trim();
      fetchAndRenderPartners(comuna);
    }
  }, 1000); // 1s delay para asegurar que los scripts principales hayan cargado
});
