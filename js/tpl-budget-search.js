/* =========================================================
   Tu Parcela Lista v2 - Búsqueda inicial por presupuesto
   Controla botones: Parcela / Con Casa / Buscar.
========================================================= */
(function (window, document) {
  'use strict';
  const TPL = window.TPL || {};

  function cheapestFoundationValue(casa) {
    const m2 = TPL.casaM2?.(casa) || 0;
    const fs = TPL.fundacionesList?.() || [];
    if (!fs.length || !m2) return 0;
    const vals = fs
      .map((f) => Number(f.valorM2 || f.valor || f.precio || 0) * (f.valorM2 ? m2 : 1))
      .filter(Boolean);
    return vals.length ? Math.min(...vals) : 0;
  }

  function setMode(mode) {
    window.tplBudgetMode = mode;
    if (window.state) {
      window.state.mode = mode;
      window.state.recommendationActive = false;
    }

    const decisionFlow = TPL.$('#decision-flow');
    const budgetBox = TPL.$('#budget-box');
    const comboFields = TPL.$('#combo-fields');
    const budgetTitle = TPL.$('#budget-title');
    const budgetHelp = TPL.$('#budget-help');
    const budgetGo = TPL.$('#budget-go');

    decisionFlow?.classList.add('budget-active');
    decisionFlow?.classList.toggle('combo-mode', mode === 'combo');
    if (budgetBox) budgetBox.style.display = 'block';
    comboFields?.classList.toggle('hidden', mode !== 'combo');

    if (budgetTitle) budgetTitle.textContent = mode === 'combo'
      ? 'Buscaremos parcela + casa con tu presupuesto'
      : '¿Cuál es tu presupuesto?';
    if (budgetHelp) budgetHelp.textContent = mode === 'combo'
      ? 'El sistema armará 5 propuestas mezclando parcela y casa.'
      : 'Te mostraremos 5 parcelas cercanas a tu presupuesto.';
    if (budgetGo) budgetGo.textContent = mode === 'combo' ? 'Buscar alternativas' : 'Buscar parcelas';

    setTimeout(() => TPL.$('#budget-input')?.focus(), 80);
  }

  function formatBudgetInput() {
    const input = TPL.$('#budget-input');
    if (!input) return;
    const raw = String(input.value || '').replace(/\D/g, '');
    input.value = raw ? Number(raw).toLocaleString('es-CL') : '';
  }

  function resetFiltersVisual() {
    TPL.$$('.filter-btn.active').forEach((button) => button.classList.remove('active'));
    const clear = TPL.$('#filter-clear');
    if (clear) clear.style.display = 'none';
  }

  function renderParcelasBudget(list, budget) {
    const cont = TPL.$('#parcelas-container');
    if (!cont) return;

    TPL.$('#combo-proposals-section')?.setAttribute('hidden', '');
    resetFiltersVisual();

    const title = TPL.$('#search-title');
    const subtitle = TPL.$('#search-subtitle');
    const count = TPL.$('#results-count');
    if (title) title.textContent = 'Parcelas sugeridas según tu presupuesto';
    if (subtitle) subtitle.textContent = `Estas son las alternativas más cercanas a ${TPL.money(budget)}.`;
    if (count) count.textContent = `${list.length} parcelas`;

    cont.innerHTML = list.map((p) => `
      <article class="parcela-card budget-result-card">
        <div class="card-gallery-container">
          <img src="${TPL.imgParcela(p)}" alt="${p.nombre || 'Parcela'}" loading="lazy">
          <span class="card-price-badge">${p.precio || TPL.money(TPL.parcelaPrice(p))}</span>
        </div>
        <div class="card-body">
          <h3 class="card-title">${p.nombre || 'Parcela disponible'}</h3>
          <p class="card-location">📍 ${p.comuna || 'Chile'} · ${TPL.parcelaM2(p).toLocaleString('es-CL')} m²</p>
          <p class="card-desc">${p.descripcion || 'Alternativa seleccionada por cercanía al presupuesto ingresado.'}</p>
          <button class="combo-location-link tpl-location-mini" type="button" data-budget-location="${p.id}">Ver ubicación</button>
          <div class="card-actions">
            <a class="btn-secondary-link" href="parcela.html?id=${TPL.slug(p.id)}">Más información</a>
            <button class="btn-select-plot" type="button" data-budget-select-parcela="${p.id}">Sumar casa</button>
          </div>
        </div>
      </article>`).join('');

    cont.querySelectorAll('[data-budget-select-parcela]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const parcela = TPL.parcelasList().find((x) => String(x.id) === String(btn.dataset.budgetSelectParcela));
        if (!parcela) return;
        localStorage.setItem('selectedParcelaId', String(parcela.id));
        TPL.safeJsonSet?.('selectedParcelaData', parcela);
        if (window.state) window.state.selectedParcela = parcela;
        TPL.$('#casas-section')?.classList.add('active');
        TPL.goTo?.('#casas-section');
      });
    });

    cont.querySelectorAll('[data-budget-location]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const parcela = TPL.parcelasList().find((x) => String(x.id) === String(btn.dataset.budgetLocation));
        if (window.openLocationModal && parcela) return window.openLocationModal(parcela);
        if (parcela?.lat && parcela?.lng) window.open(`https://www.google.com/maps/search/?api=1&query=${parcela.lat},${parcela.lng}`, '_blank');
      });
    });

    TPL.goTo?.('#parcelas-anchor');
  }

  function findComboBudget(budget) {
    const combos = [];
    TPL.parcelasList().forEach((p) => {
      TPL.casasList().forEach((c) => {
        const total = TPL.parcelaPrice(p) + TPL.casaPrice(c) + cheapestFoundationValue(c);
        if (!total) return;
        combos.push({ parcela: p, casa: c, total, diff: Math.abs(total - budget) });
      });
    });
    return combos.sort((a, b) => a.diff - b.diff).slice(0, 5);
  }

  function renderComboBudget(combos, budget) {
    const section = TPL.$('#combo-proposals-section');
    const cont = TPL.$('#combo-proposals-container');
    if (!section || !cont) return;

    const casasSection = TPL.$('#casas-section');
    casasSection?.classList.add('active');
    section.hidden = false;
    section.classList.add('is-visible', 'tpl-combo-v22');
    window.__tplBudgetCombos = combos;

    cont.innerHTML = combos.map((m, idx) => `
      <article class="tpl-combo-card combo-proposal-card promo-budget-card">
        <div class="tpl-combo-media combo-proposal-media" aria-label="Fotos del proyecto sugerido">
          <figure class="tpl-combo-photo tpl-combo-photo-land combo-proposal-photo combo-proposal-photo-land">
            <img src="${TPL.imgParcela(m.parcela)}" alt="${m.parcela.nombre || 'Parcela'}" loading="lazy">
            <figcaption>Parcela</figcaption>
          </figure>
          <figure class="tpl-combo-photo tpl-combo-photo-house combo-proposal-photo combo-proposal-photo-house">
            <img src="${TPL.imgCasa(m.casa)}" alt="${m.casa.nombre || 'Casa'}" loading="lazy">
            <figcaption>Casa</figcaption>
          </figure>
          <span class="tpl-combo-rank combo-proposal-badge">Opción ${idx + 1}</span>
        </div>
        <div class="tpl-combo-content combo-proposal-body">
          <span class="tpl-combo-kicker combo-kicker">Proyecto sugerido</span>
          <h3>${m.parcela.nombre || 'Parcela'} + ${m.casa.nombre || 'Casa'}</h3>
          <p class="tpl-combo-place combo-proposal-place">📍 ${m.parcela.comuna || 'Chile'} · ${TPL.parcelaM2(m.parcela).toLocaleString('es-CL')} m² terreno · ${TPL.casaM2(m.casa)} m² casa</p>
          <div class="tpl-combo-specs combo-proposal-specs">
            <span>${m.casa.habitaciones || m.casa.dormitorios || ''} hab.</span>
            <span>Diferencia: ${TPL.money(m.diff)}</span>
          </div>
          <button type="button" class="tpl-combo-location combo-location-link" data-budget-location="${m.parcela.id}">Ver ubicación</button>
          <div class="tpl-combo-total combo-proposal-total"><small>Total estimado</small><strong>${TPL.money(m.total)}</strong></div>
          <button type="button" class="tpl-combo-select combo-proposal-select" data-budget-combo="${idx}">Cotizar este proyecto</button>
        </div>
      </article>`).join('');

    cont.querySelectorAll('[data-budget-combo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = window.__tplBudgetCombos[Number(btn.dataset.budgetCombo)];
        if (!m) return;
        localStorage.setItem('selectedParcelaId', String(m.parcela.id));
        TPL.safeJsonSet?.('selectedParcelaData', m.parcela);
        localStorage.setItem('selectedCasaId', String(m.casa.id));
        TPL.safeJsonSet?.('selectedCasaData', m.casa);
        localStorage.setItem('tplComboAutoInstallation', 'si');
        if (window.state) {
          window.state.selectedParcela = m.parcela;
          window.state.selectedCasa = m.casa;
          window.state.installationService = true;
        }
        TPL.$('#cotizador-section')?.classList.add('active');
        TPL.goTo?.('#cotizador-section');
        setTimeout(() => window.dispatchEvent(new Event('tpl:combo-selected')), 100);
      });
    });

    cont.querySelectorAll('[data-budget-location]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const parcela = TPL.parcelasList().find((x) => String(x.id) === String(btn.dataset.budgetLocation));
        if (window.openLocationModal && parcela) return window.openLocationModal(parcela);
        if (parcela?.lat && parcela?.lng) window.open(`https://www.google.com/maps/search/?api=1&query=${parcela.lat},${parcela.lng}`, '_blank');
      });
    });

    setTimeout(() => {
      const target = document.getElementById('combo-proposals-section');
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.pageYOffset - 96;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 220);
    // tplBudgetScrollToComboSection

    const title = section.querySelector('h3');
    const desc = section.querySelector('p');
    if (title) title.textContent = '5 propuestas cercanas a tu presupuesto';
    if (desc) desc.textContent = `Combinaciones armadas automáticamente cerca de ${TPL.money(budget)}.`;

    // En Netlify algunos estilos externos tardan en recalcular el layout.
    // Por eso esperamos dos frames antes de hacer scroll, para caer directo
    // sobre las propuestas y no en la parte superior de casas.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const y = section.getBoundingClientRect().top + window.pageYOffset - 92;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      });
    });
  }

  function runBudgetSearch(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    const budget = TPL.parseMoney(TPL.$('#budget-input')?.value);
    if (!budget) {
      alert('Ingresa un presupuesto válido. Ejemplo: 15.000.000');
      return;
    }

    const mode = window.tplBudgetMode || window.state?.mode || 'parcela';
    const budgetBox = TPL.$('#budget-box');
    if (budgetBox) budgetBox.style.display = 'none';
    TPL.$('#decision-flow')?.classList.add('flow-completed');

    if (mode === 'combo') {
      const combos = findComboBudget(budget);
      if (!combos.length) {
        alert(`No encontré combinaciones disponibles. Detecté ${TPL.parcelasList().length} parcelas y ${TPL.casasList().length} casas. Revisa que casas.js y parcelas.js estén cargados antes de app.js.`);
        return;
      }
      renderComboBudget(combos, budget);
      return;
    }

    const recommended = TPL.parcelasList()
      .map((p) => ({ p, diff: Math.abs(TPL.parcelaPrice(p) - budget) }))
      .filter((x) => TPL.parcelaPrice(x.p) > 0)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5)
      .map((x) => x.p);

    if (!recommended.length) {
      alert('No encontré parcelas disponibles. Revisa que parcelas.js esté cargado.');
      return;
    }
    renderParcelasBudget(recommended, budget);
  }

  document.addEventListener('DOMContentLoaded', () => {
    TPL.$('#opt-parcela')?.addEventListener('click', (event) => { event.preventDefault(); setMode('parcela'); });
    TPL.$('#opt-combo')?.addEventListener('click', (event) => { event.preventDefault(); setMode('combo'); });
    TPL.$('#budget-input')?.addEventListener('input', formatBudgetInput);
    TPL.$('#budget-input')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') runBudgetSearch(event); });
    TPL.$('#budget-go')?.addEventListener('click', runBudgetSearch, true);
  });
})(window, document);
