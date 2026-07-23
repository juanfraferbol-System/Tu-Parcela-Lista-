(function (window, document) {
  'use strict';

  var config = window.tplBusiness;
  var root = document.getElementById('tpl-business-app');
  var lastTrigger = null;

  if (!config || !root) {
    console.error('[TPL Business] No fue posible cargar la configuración.');
    return;
  }

  var icons = {
    window: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18"></path>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 9v12"></path>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>',
    target: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="4"></circle><path d="m15 9 6-6"></path>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5A8 8 0 1 1 21 15Z"></path>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"></rect><path d="m16 10 5-3v10l-5-3z"></path>',
    rotate: '<circle cx="12" cy="12" r="8"></circle><path d="m17 7 3 .2-.2-3M7 17l-3-.2.2 3"></path>',
    megaphone: '<path d="m3 11 18-5v12L3 14zM11.6 16.4 13 21H7l-1.4-6"></path>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path>',
    spark: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"></path><path d="m5 15 .8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8z"></path>',
    arrow: '<path d="M5 12h14M14 7l5 5-5 5"></path>',
    check: '<path d="m5 12 4 4L19 6"></path>',
    close: '<path d="M18 6 6 18M6 6l12 12"></path>'
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function icon(name) {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      (icons[name] || icons.spark) + '</svg>';
  }

  function list(items, className) {
    return '<ul class="' + className + '">' + items.map(function (item) {
      return '<li>' + icon('check') + escapeHtml(item) + '</li>';
    }).join('') + '</ul>';
  }

  function render() {
    var year = new Date().getFullYear();
    root.innerHTML =
      '<header class="tpl-header">' +
        '<a class="tpl-brand" href="#inicio" aria-label="TPL Business, inicio"><span class="tpl-brand-mark">TPL</span><span><strong>' + escapeHtml(config.brand.name) + '</strong><small>' + escapeHtml(config.brand.eyebrow) + '</small></span></a>' +
        '<nav aria-label="Navegación principal"><a href="#estado">Estado</a><a href="#resultados">Resultados</a><a href="#crecimiento">Cómo crecer</a></nav>' +
        '<a class="tpl-header-action" href="#estado">Mi Proyecto</a>' +
      '</header>' +
      '<main id="contenido">' +
        '<section class="tpl-hero" id="inicio">' +
          '<div class="tpl-orb tpl-orb-one"></div><div class="tpl-orb tpl-orb-two"></div>' +
          '<div class="tpl-hero-copy"><span class="tpl-eyebrow"><i></i>' + escapeHtml(config.hero.eyebrow) + '</span><h1>' + escapeHtml(config.hero.title) + '</h1><p>' + escapeHtml(config.hero.subtitle) + '</p><a class="tpl-button" href="' + escapeHtml(config.hero.primaryCtaUrl) + '">' + escapeHtml(config.hero.primaryCta) + icon('arrow') + '</a></div>' +
          '<div class="tpl-hero-visual" aria-label="Resumen visual del estado del proyecto"><div class="tpl-project-card"><div class="tpl-project-card-head"><span>' + escapeHtml(config.hero.projectLabel) + '</span><i>En marcha</i></div><div class="tpl-property-visual"><span class="tpl-property-line wide"></span><span class="tpl-property-line"></span><div class="tpl-property-hill"></div><div class="tpl-property-sun"></div></div><div class="tpl-project-card-foot"><span><i></i>Publicación activa</span><strong>' + config.projectHealth.score + '%</strong></div></div></div>' +
        '</section>' +
        sectionHeading('Mi Proyecto', config.projectStatus.title, config.projectStatus.description, 'estado', 'tpl-status-section') +
          '<div class="tpl-status-grid">' + config.projectStatus.items.map(function (item) {
            return '<article class="tpl-status-card"><div class="tpl-status-icon">' + icon(item.icon) + '</div><h3>' + escapeHtml(item.name) + '</h3><span class="tpl-status-pill ' + escapeHtml(item.tone) + '"><i></i>' + escapeHtml(item.status) + '</span></article>';
          }).join('') + '</div></section>' +
        sectionHeading('Resultados', 'Las señales que acercan tu propiedad a una venta.', 'Estos indicadores se completarán cuando conectes la actividad de tus herramientas.', 'resultados', 'tpl-results-section') +
          '<div class="tpl-metrics-grid">' + config.metrics.map(function (metric) {
            return '<article class="tpl-metric-card"><span>' + escapeHtml(metric.label) + '</span><strong>' + escapeHtml(metric.value) + '</strong><small>' + escapeHtml(metric.note) + '</small></article>';
          }).join('') + '</div></section>' +
        sectionHeading('Oportunidades de mejora', config.projectHealth.title, config.projectHealth.summary, 'salud', 'tpl-health-section') +
          '<div class="tpl-health-card"><div class="tpl-health-score"><div class="tpl-score-ring" style="--tpl-score:' + (config.projectHealth.score * 3.6) + 'deg"><div><strong>' + config.projectHealth.score + '%</strong><span>Salud actual</span></div></div><p>Un indicador configurable para orientar los próximos pasos del proyecto.</p></div>' +
          '<div class="tpl-health-list tpl-strengths"><h3>Fortalezas</h3>' + list(config.projectHealth.strengths, '') + '</div>' +
          '<div class="tpl-health-list tpl-opportunities"><h3>Oportunidades</h3><ul>' + config.projectHealth.opportunities.map(function (item, index) { return '<li><span>' + String(index + 1).padStart(2, '0') + '</span>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div></div></section>' +
        sectionHeading('Herramientas recomendadas', '¿Cómo quieres crecer?', 'Elige el resultado que buscas. Nosotros reunimos las herramientas que pueden ayudarte a conseguirlo.', 'crecimiento', 'tpl-growth-section') +
          '<div class="tpl-growth-grid">' + config.growthGroups.map(function (group, index) {
            return '<button class="tpl-growth-card" type="button" data-growth-id="' + escapeHtml(group.id) + '" aria-haspopup="dialog"><div class="tpl-group-icon">' + icon(group.icon) + '</div><span class="tpl-group-number">0' + (index + 1) + '</span><h3>' + escapeHtml(group.title) + '</h3><p>' + escapeHtml(group.description) + '</p><div class="tpl-tool-list">' + group.tools.map(function (tool) { return '<span>' + escapeHtml(tool) + '</span>'; }).join('') + '</div><span class="tpl-card-link">Ver cómo funciona ' + icon('arrow') + '</span></button>';
          }).join('') + '</div></section>' +
        sectionHeading('Un camino simple', config.growthStages.title, config.growthStages.description, 'etapas', 'tpl-stages-section') +
          '<div class="tpl-stage-track">' + config.growthStages.items.map(function (stage, index) {
            var current = stage.name === config.growthStages.currentStage;
            return '<article class="tpl-stage-card' + (current ? ' current' : '') + '"><span>Etapa ' + (index + 1) + '</span><h3>' + escapeHtml(stage.name) + '</h3><p>' + escapeHtml(stage.description) + '</p>' + (current ? '<strong>Etapa actual</strong>' : '') + '</article>';
          }).join('') + '</div></section>' +
        '<section class="tpl-section tpl-advisor-section"><div class="tpl-advisor-card"><div class="tpl-advisor-profile"><div class="tpl-advisor-icon">' + icon('spark') + '</div><span>' + escapeHtml(config.aiAdvisor.label) + '<small>Preparado para una próxima etapa</small></span></div><div class="tpl-advisor-copy"><span class="tpl-kicker">' + escapeHtml(config.aiAdvisor.greeting) + '</span><h2>' + escapeHtml(config.aiAdvisor.title) + '</h2><p>' + escapeHtml(config.aiAdvisor.description) + '</p></div><div class="tpl-advisor-recommendations"><h3>Recomendaciones</h3>' + list(config.aiAdvisor.recommendations, '') + '<button type="button" disabled aria-describedby="tpl-advisor-availability">' + escapeHtml(config.aiAdvisor.ctaText) + '</button><small id="tpl-advisor-availability">' + escapeHtml(config.aiAdvisor.availabilityText) + '</small></div></div></section>' +
      '</main>' +
      '<footer class="tpl-footer"><div class="tpl-footer-brand"><span class="tpl-brand-mark">TPL</span><div><strong>' + escapeHtml(config.brand.name) + '</strong><p>' + escapeHtml(config.footer.statement) + '</p></div></div><div class="tpl-footer-links">' + config.footer.links.map(function (link) { return '<a href="' + escapeHtml(link.href) + '">' + escapeHtml(link.label) + '</a>'; }).join('') + '</div><p class="tpl-copyright">© ' + year + ' ' + escapeHtml(config.footer.copyright) + '. Mi Proyecto.</p></footer>' +
      '<div class="tpl-dialog-backdrop" id="tpl-growth-dialog" hidden><section class="tpl-dialog" role="dialog" aria-modal="true" aria-labelledby="tpl-dialog-title"><button class="tpl-dialog-close" type="button" aria-label="Cerrar ficha">' + icon('close') + '</button><div id="tpl-dialog-content"></div></section></div>';
  }

  function sectionHeading(kicker, title, description, id, className) {
    return '<section class="tpl-section ' + className + '" id="' + id + '"><div class="tpl-section-heading"><div><span class="tpl-kicker">' + escapeHtml(kicker) + '</span><h2>' + escapeHtml(title) + '</h2></div><p>' + escapeHtml(description) + '</p></div>';
  }

  function openDialog(groupId, trigger) {
    var group = config.growthGroups.find(function (item) { return item.id === groupId; });
    var backdrop = document.getElementById('tpl-growth-dialog');
    var content = document.getElementById('tpl-dialog-content');
    if (!group || !backdrop || !content) return;

    lastTrigger = trigger;
    content.innerHTML = '<div class="tpl-group-icon large">' + icon(group.icon) + '</div><span class="tpl-kicker">Cómo ayuda a vender mejor</span><h2 id="tpl-dialog-title">' + escapeHtml(group.title) + '</h2><p>' + escapeHtml(group.detail) + '</p><div class="tpl-tool-list">' + group.tools.map(function (tool) { return '<span>' + escapeHtml(tool) + '</span>'; }).join('') + '</div><div class="tpl-outcome">' + icon('check') + '<span><strong>Resultado esperado</strong>' + escapeHtml(group.outcome) + '</span></div><p class="tpl-future-note">Las activaciones estarán disponibles en una siguiente etapa.</p>';
    backdrop.hidden = false;
    document.body.classList.add('tpl-dialog-open');
    backdrop.querySelector('.tpl-dialog-close').focus();
  }

  function closeDialog() {
    var backdrop = document.getElementById('tpl-growth-dialog');
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true;
    document.body.classList.remove('tpl-dialog-open');
    if (lastTrigger) lastTrigger.focus();
  }

  render();

  root.addEventListener('click', function (event) {
    var growthCard = event.target.closest('[data-growth-id]');
    if (growthCard) openDialog(growthCard.getAttribute('data-growth-id'), growthCard);
    if (event.target.closest('.tpl-dialog-close')) closeDialog();
    if (event.target.id === 'tpl-growth-dialog') closeDialog();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeDialog();
  });
})(window, document);
