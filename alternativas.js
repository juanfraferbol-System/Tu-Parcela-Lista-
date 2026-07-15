// --- Mejores Alternativas Algoritmo ---
function renderBestAlternatives() {
  const container = document.getElementById("mejores-alternativas-grid");
  if (!container) return;
  
  const all = window.getAllParcelas ? window.getAllParcelas() : (typeof parcelas !== 'undefined' ? parcelas : []);
  if (!all || all.length === 0) return;

  // Filtrar parcelas reales con precio numerico
  const parsePrice = (p) => parseInt(String(p.precio).replace(/\D/g, ''), 10) || 0;
  const valid = [...all].filter(p => parsePrice(p) > 0).sort((a,b) => parsePrice(a) - parsePrice(b));

  if (valid.length < 3) return; // No hay suficientes

  // 1. Economica (La mas barata)
  const eco = valid[0];
  
  // 3. Premium (La mas cara o con mas features)
  const premium = valid[valid.length - 1];

  // 2. Estandar (La mediana)
  const standard = valid[Math.floor(valid.length / 2)];

  const alternatives = [
    { item: eco, label: "Oportunidad Económica", color: "#10b981", icon: "trending-down", desc: "La opción más accesible para empezar tu proyecto hoy mismo." },
    { item: standard, label: "Equilibrio Ideal", color: "#3b82f6", icon: "check-circle", desc: "Excelente balance entre precio, ubicación y factibilidad de servicios." },
    { item: premium, label: "Calidad Premium", color: "#f59e0b", icon: "star", desc: "Lo mejor de lo mejor. Conectividad superior y atributos exclusivos." }
  ];

  let html = '';
  alternatives.forEach(alt => {
    const p = alt.item;
    const img = (p.imagenes && p.imagenes.length > 0) ? p.imagenes[0] : 'image/parcela_placeholder.webp';
    const detailHref = 'parcela.html?id=' + encodeURIComponent(p.id);
    
    html += '<div class="parcela-card" style="display:flex; flex-direction:column; border:2px solid ' + alt.color + '20; box-shadow:0 12px 30px ' + alt.color + '15;">';
    html += '  <div style="background:' + alt.color + '; color:#fff; padding:8px 16px; font-weight:800; display:flex; align-items:center; gap:8px;">';
    html += '    <i data-lucide="' + alt.icon + '" style="width:18px;height:18px;"></i> ' + alt.label;
    html += '  </div>';
    html += '  <div class="card-image-wrapper" style="position:relative; height:200px;">';
    html += '    <a href="' + detailHref + '" style="display:block; width:100%; height:100%;">';
    html += '      <img src="' + img + '" alt="' + p.nombre + '" style="width:100%; height:100%; object-fit:cover;">';
    html += '    </a>';
    html += '  </div>';
    html += '  <div class="card-body" style="flex-grow:1; display:flex; flex-direction:column;">';
    html += '    <h3 class="card-title">' + p.nombre + '</h3>';
    html += '    <p style="font-size:0.9rem; color:var(--text-medium); margin-bottom:12px;">' + alt.desc + '</p>';
    html += '    <div class="card-price card-price-clean" style="margin-top:auto; font-size:1.5rem; color:' + alt.color + ';">' + p.precio + '</div>';
    html += '    <div class="card-actions" style="margin-top:16px;">';
    html += '      <a class="btn-card" href="' + detailHref + '" style="background:var(--surface-subtle); color:var(--tpl-primary);">Ver detalles</a>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
  });

  container.innerHTML = html;
  if(window.lucide) window.lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(renderBestAlternatives, 500); // Dar tiempo a cargar datos
});
