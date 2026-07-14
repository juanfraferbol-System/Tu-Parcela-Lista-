/* =====================================================
   TU PARCELA LISTA - PROYECTOS LISTOS PARA COTIZAR
   - 4 alternativas parcela + casa
   - Abre el cotizador interno de index.html
   - cotizador.html queda reservado para diseño propio
===================================================== */
(function () {
  const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const money = v => CLP.format(Number(v || 0));
  const parsePrice = v => Number(String(v ?? '').replace(/\D/g, '')) || 0;
  const getParcelas = () => window.parcelas || (typeof parcelas !== 'undefined' ? parcelas : []);
  const getCasas = () => window.casas || (typeof casas !== 'undefined' ? casas : []);
  const casaPrice = c => parsePrice(c?.valorCasa ?? c?.precio ?? c?.valor);
  const parcelaPrice = p => parsePrice(p?.precio);
  const getM2 = c => Number(c?.metros || c?.mt2 || c?.superficie || 0) || 0;
  const getParcelaM2 = p => Number(p?.tamano || p?.superficie || p?.m2 || 0) || 0;
  const normalize = txt => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const PROYECTOS_BASE = [
    {
      slug: 'proyecto-inicio',
      titulo: 'Proyecto Inicio',
      etiqueta: 'Más económico',
      parcelaNombre: 'Nacimiento El Roble',
      casaId: 'aura18',
      banner: 'image/proyectos/proyecto1.webp',
      descripcion: 'Ideal para primera inversión, refugio de fin de semana o partir con un proyecto simple y ordenado.'
    },
    {
      slug: 'proyecto-quillon-5000',
      titulo: 'Proyecto Quillón 5.000 m²',
      etiqueta: 'Vida de campo',
      parcelaNombre: 'Santa Ana 5000',
      casaId: 'aura36',
      banner: 'image/proyectos/proyecto2.webp',
      descripcion: 'Parcela amplia con casa compacta, buena base para descanso familiar y crecimiento por etapas.'
    },
    {
      slug: 'proyecto-familiar',
      titulo: 'Proyecto Familiar',
      etiqueta: 'Mejor equilibrio',
      parcelaNombre: 'Los Guindos Nativo',
      casaId: 'aura42',
      banner: 'image/proyectos/proyecto3.webp',
      descripcion: 'Pensado para familia pequeña, buena superficie interior y entorno natural con proyección.'
    },
    {
      slug: 'proyecto-premium-campo',
      titulo: 'Proyecto Campo Premium',
      etiqueta: 'Más completo',
      parcelaNombre: 'Santa Ana Quillón 9500',
      casaId: 'aura84_1',
      banner: 'image/proyectos/proyecto4.webp',
      descripcion: 'Alternativa superior con mayor terreno y vivienda más amplia para uso familiar o segunda residencia.'
    }
  ];

  function findParcelaByName(name) {
    const key = normalize(name);
    return getParcelas().find(p => normalize(p.nombre).includes(key)) ||
           getParcelas().find(p => key.includes(normalize(p.nombre))) ||
           null;
  }

  function setupBudgetDots() {
    const input = document.getElementById('budget-input');
    if (!input) return;
    input.setAttribute('type', 'text');
    input.setAttribute('inputmode', 'numeric');
    input.placeholder = 'Ej: 15.000.000';
    input.addEventListener('input', () => {
      const raw = String(input.value || '').replace(/\D/g, '');
      input.value = raw ? Number(raw).toLocaleString('es-CL') : '';
    });
  }

  function buildPromos() {
    const wrap = document.getElementById('promos-grid');
    if (!wrap) return;

    const casas = getCasas();
    const proyectos = PROYECTOS_BASE.map(base => {
      const p = findParcelaByName(base.parcelaNombre);
      const c = casas.find(x => String(x.id) === String(base.casaId));
      if (!p || !c) return null;
      const total = parcelaPrice(p) + casaPrice(c);
      return { ...base, p, c, total };
    }).filter(Boolean).sort((a, b) => a.total - b.total).slice(0, 4);

    wrap.innerHTML = proyectos.map((x, i) => `
      <article class="proyecto-listo-card" role="button" tabindex="0" data-parcela="${x.p.id}" data-casa="${x.c.id}">
        <div class="proyecto-listo-img">
          <img src="${x.banner}" alt="${x.titulo}">
        </div>
        <div class="proyecto-listo-body">
          <div class="proyecto-listo-topline">
            <span class="proyecto-listo-badge">${i + 1}. ${x.etiqueta}</span>
            <span class="proyecto-listo-kicker">Parcela + casa</span>
          </div>
          <h3>${x.titulo}</h3>
          <p>${x.descripcion}</p>
          <div class="proyecto-listo-specs">
            <span>📍 ${x.p.comuna || 'Biobío / Ñuble'}</span>
            <span>🌳 ${getParcelaM2(x.p).toLocaleString('es-CL')} m² terreno</span>
            <span>🏡 ${getM2(x.c)} m² casa</span>
            <span>🛏 ${x.c.habitaciones || x.c.dormitorios || 1} hab.</span>
          </div>
          <div class="proyecto-listo-price">
            <small>Desde</small>
            <strong>${money(x.total)}</strong>
          </div>
          <button class="btn-proyecto-listo" type="button">Cotizar este proyecto</button>
        </div>
      </article>`).join('');

    wrap.querySelectorAll('.proyecto-listo-card').forEach(card => {
      const open = () => {
        const parcelaId = card.dataset.parcela;
        const casaId = card.dataset.casa;
        localStorage.setItem('selectedParcelaId', parcelaId);
        localStorage.setItem('selectedCasaId', casaId);
        localStorage.removeItem('tplDisenoPropio');

        if (typeof window.TPLSelectProyectoListo === 'function') {
          window.TPLSelectProyectoListo(parcelaId, casaId);
          return;
        }

        window.location.href = `index.html?selectParcela=${encodeURIComponent(parcelaId)}&selectCasa=${encodeURIComponent(casaId)}#cotizador-section`;
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupBudgetDots();
    setTimeout(buildPromos, 250);
  });
})();
