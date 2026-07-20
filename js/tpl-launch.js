(function () {
  'use strict';

  const QUEUE_KEY = 'tpl_launch_event_queue_v1';
  const DRAFT_PREFIX = 'tpl_draft_';
  const allowedMetadata = new Set([
    'parcela_id', 'parcela_codigo', 'casa_id', 'casa_codigo', 'extra_codigo',
    'tipo_constructivo', 'origen', 'paso', 'resultado', 'motivo', 'valor',
    'filtros_activos', 'duracion_segundos', 'publicacion_id'
  ]);

  function cleanMetadata(metadata) {
    return Object.entries(metadata || {}).reduce((safe, [key, value]) => {
      if (!allowedMetadata.has(key) || value === undefined || value === null) return safe;
      if (typeof value === 'string') safe[key] = value.slice(0, 120);
      else if (typeof value === 'number' || typeof value === 'boolean') safe[key] = value;
      return safe;
    }, {});
  }

  function readQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch { return []; }
  }

  function writeQueue(events) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-100))); }
    catch { /* La analítica nunca debe bloquear el flujo comercial. */ }
  }

  async function persistEvent(event) {
    if (!window.tplSupabase) return false;
    const { error } = await window.tplSupabase.from('crm_eventos').insert([event]);
    if (error) throw error;
    return true;
  }

  async function flushQueue() {
    const queued = readQueue();
    if (!queued.length || !window.tplSupabase) return;
    const pending = [];
    for (const event of queued) {
      try { await persistEvent(event); }
      catch { pending.push(event); }
    }
    writeQueue(pending);
  }

  async function track(eventName, metadata = {}, context = {}) {
    const safeMetadata = cleanMetadata(metadata);
    const event = {
      evento: String(eventName || 'evento_desconocido').slice(0, 80),
      etapa: context.etapa || null,
      cliente_id: context.clienteId || null,
      proyecto_id: context.proyectoId || null,
      publicacion_id: context.publicacionId || null,
      origen: safeMetadata.origen || sessionStorage.getItem('tpl_origen') || 'directo',
      pagina: location.pathname,
      metadata: safeMetadata
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: `tpl_${event.evento}`, tpl: safeMetadata });
    window.TPLCRM?.event?.(event.evento, safeMetadata);

    try {
      if (!(await persistEvent(event))) writeQueue([...readQueue(), event]);
    } catch {
      writeQueue([...readQueue(), event]);
    }
  }

  function sourceFromUrl() {
    const params = new URLSearchParams(location.search);
    if (params.get('utm_source')) return params.get('utm_source');
    if (params.get('ref')) return params.get('ref');
    try { return document.referrer ? new URL(document.referrer).hostname : 'directo'; } catch { return 'directo'; }
  }

  function saveDraft(key, value) {
    try { localStorage.setItem(`${DRAFT_PREFIX}${key}`, JSON.stringify({ value, savedAt: new Date().toISOString() })); }
    catch { return false; }
    return true;
  }

  function loadDraft(key) {
    try { return JSON.parse(localStorage.getItem(`${DRAFT_PREFIX}${key}`) || 'null'); }
    catch { return null; }
  }

  function clearDraft(key) {
    localStorage.removeItem(`${DRAFT_PREFIX}${key}`);
  }

  function guardSubmit(form, busyText = 'Enviando…') {
    if (!form || form.dataset.tplSubmitting === 'true') return false;
    form.dataset.tplSubmitting = 'true';
    const button = form.querySelector('[type="submit"]');
    if (button) {
      button.dataset.tplOriginalText = button.textContent;
      button.disabled = true;
      button.textContent = busyText;
    }
    return true;
  }

  function releaseSubmit(form) {
    if (!form) return;
    form.dataset.tplSubmitting = 'false';
    const button = form.querySelector('[type="submit"]');
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.tplOriginalText || button.textContent;
    }
  }

  function init() {
    sessionStorage.setItem('tpl_origen', sourceFromUrl().slice(0, 120));
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    if (/\/parcela(?:\.html)?$/.test(path)) track('parcela_view', { parcela_codigo: params.get('id') || localStorage.getItem('selectedParcelaId') || '', origen: sessionStorage.getItem('tpl_origen') }, { etapa: 'vio_parcela' });
    if (path.includes('cotizador')) track('cotizador_iniciado', { parcela_codigo: localStorage.getItem('selectedParcelaId') || '', origen: sessionStorage.getItem('tpl_origen') }, { etapa: 'inicio_cotizacion' });
    if (path.includes('/publicar')) track('publicacion_iniciada', { paso: 1, origen: sessionStorage.getItem('tpl_origen') });

    document.addEventListener('click', (event) => {
      const target = event.target.closest('a,button,.casa-card,.extra-card-compact,.fundacion-card-premium');
      if (!target) return;
      const text = `${target.id || ''} ${target.className || ''} ${target.textContent || ''}`.toLowerCase();
      let eventName = target.dataset.tplEvent || null;
      const metadata = { origen: sessionStorage.getItem('tpl_origen') };
      if (!eventName && (target.matches('a[href*="wa.me"],a[href*="whatsapp"]'))) eventName = 'whatsapp_click';
      if (!eventName && (text.includes('mapa') || text.includes('ubicación'))) eventName = 'mapa_abierto';
      if (!eventName && target.matches('.casa-card,[data-casa-id]')) { eventName = 'casa_seleccionada'; metadata.casa_codigo = target.dataset.id || target.dataset.casaId || ''; }
      if (!eventName && target.matches('.extra-card-compact')) { eventName = 'extra_seleccionado'; metadata.extra_codigo = target.dataset.id || ''; }
      if (!eventName && target.matches('.fundacion-card-premium')) { eventName = 'tipo_constructivo_seleccionado'; metadata.tipo_constructivo = target.dataset.id || ''; }
      if (eventName) track(eventName, metadata);
    }, true);

    document.addEventListener('change', (event) => {
      const field = event.target;
      if (field.closest('#search-form,.filters,.filters-bar') || /filter|filtro|region|comuna|presupuesto/i.test(field.id || field.name || '')) {
        track('filtros_usados', { filtros_activos: 1, origen: sessionStorage.getItem('tpl_origen') });
      }
    }, true);
    flushQueue();
  }

  window.TPLLaunch = { track, flushQueue, saveDraft, loadDraft, clearDraft, guardSubmit, releaseSubmit };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();