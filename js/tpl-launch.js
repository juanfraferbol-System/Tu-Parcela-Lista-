(function () {
  'use strict';

  const QUEUE_KEY = 'tpl_cerebro_event_queue_v2';
  const SESSION_KEY = 'tpl_cerebro_session_v2';
  const PROJECT_KEY = 'tpl_cerebro_project_v2';
  const DRAFT_PREFIX = 'tpl_draft_';
  const MAX_QUEUE = 150;
  const allowedMetadata = new Set([
    'session_id', 'journey_id', 'parcela_id', 'parcela_codigo', 'casa_id', 'casa_codigo',
    'extra_codigo', 'tipo_constructivo', 'origen', 'paso', 'resultado', 'motivo', 'valor',
    'filtros_activos', 'filtro_tipo', 'duracion_segundos', 'publicacion_id', 'fecha_visita',
    'dispositivo', 'pagina_anterior', 'accion', 'estado_proyecto', 'total_estimado', 'cantidad_extras'
  ]);

  function randomId(prefix) {
    if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function readJson(storage, key, fallback) {
    try { return JSON.parse(storage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }

  function writeJson(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  }

  function getSession() {
    let session = readJson(sessionStorage, SESSION_KEY, null);
    if (!session?.id) {
      session = {
        id: randomId('ses'),
        journeyId: readJson(localStorage, PROJECT_KEY, null)?.journeyId || randomId('journey'),
        startedAt: new Date().toISOString(),
        lastPath: document.referrer ? safeReferrerPath(document.referrer) : ''
      };
      writeJson(sessionStorage, SESSION_KEY, session);
    }
    return session;
  }

  function getProjectState() {
    const current = readJson(localStorage, PROJECT_KEY, null);
    if (current?.journeyId) return current;
    const state = {
      journeyId: getSession().journeyId,
      parcelaCodigo: '', casaCodigo: '', extras: [], estado: 'explorando',
      totalEstimado: 0, updatedAt: new Date().toISOString()
    };
    writeJson(localStorage, PROJECT_KEY, state);
    return state;
  }

  function updateProjectState(patch) {
    const current = getProjectState();
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    if (Array.isArray(patch?.extras)) next.extras = [...new Set(patch.extras.filter(Boolean))].slice(0, 30);
    writeJson(localStorage, PROJECT_KEY, next);
    window.TPL?.events?.emit?.('PROYECTO_LOCAL_ACTUALIZADO', next, { source: 'tpl-launch-v2' });
    return next;
  }

  function safeReferrerPath(value) {
    try { return new URL(value).pathname.slice(0, 180); } catch { return ''; }
  }

  function deviceType() {
    if (matchMedia('(max-width: 767px)').matches) return 'movil';
    if (matchMedia('(max-width: 1100px)').matches) return 'tablet';
    return 'escritorio';
  }

  function cleanMetadata(metadata) {
    return Object.entries(metadata || {}).reduce((safe, [key, value]) => {
      if (!allowedMetadata.has(key) || value === undefined || value === null || value === '') return safe;
      if (typeof value === 'string') safe[key] = value.slice(0, 180);
      else if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value;
      else if (typeof value === 'boolean') safe[key] = value;
      return safe;
    }, {});
  }

  function readQueue() { return readJson(localStorage, QUEUE_KEY, []); }
  function writeQueue(events) { writeJson(localStorage, QUEUE_KEY, events.slice(-MAX_QUEUE)); }

  async function persistEvent(event) {
    if (!window.tplSupabase) return false;
    const { error } = await window.tplSupabase.from('crm_eventos').insert([event]);
    if (error) throw error;
    return true;
  }

  async function flushQueue() {
    const queued = readQueue();
    if (!queued.length || !window.tplSupabase || !navigator.onLine) return;
    const pending = [];
    for (const event of queued) {
      try { await persistEvent(event); }
      catch { pending.push(event); }
    }
    writeQueue(pending);
  }

  function inferStage(eventName) {
    const map = {
      sitio_visitado: 'visitante', busqueda_realizada: 'visitante', parcela_view: 'vio_parcela',
      mapa_abierto: 'vio_parcela', informacion_solicitada: 'solicito_informacion',
      visita_solicitada: 'solicito_visita', cotizador_iniciado: 'inicio_cotizacion',
      cotizacion_guardada: 'guardo_cotizacion', proyecto_activado: 'activo_proyecto',
      reserva_iniciada: 'activo_proyecto', pago_confirmado: 'activo_proyecto'
    };
    return map[eventName] || null;
  }

  async function track(eventName, metadata = {}, context = {}) {
    const session = getSession();
    const project = getProjectState();
    const safeMetadata = cleanMetadata({
      ...metadata,
      session_id: session.id,
      journey_id: project.journeyId,
      dispositivo: deviceType()
    });
    const normalizedName = String(eventName || 'evento_desconocido').slice(0, 80);
    const event = {
      evento: normalizedName,
      etapa: context.etapa || inferStage(normalizedName),
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
    window.TPL?.events?.emit?.(event.evento, safeMetadata, { etapa: event.etapa, pagina: event.pagina });

    try {
      if (!(await persistEvent(event))) writeQueue([...readQueue(), event]);
    } catch {
      writeQueue([...readQueue(), event]);
    }
    return event;
  }

  function sourceFromUrl() {
    const params = new URLSearchParams(location.search);
    if (params.get('utm_source')) return params.get('utm_source');
    if (params.get('ref')) return params.get('ref');
    try { return document.referrer ? new URL(document.referrer).hostname : 'directo'; } catch { return 'directo'; }
  }

  function saveDraft(key, value) {
    return writeJson(localStorage, `${DRAFT_PREFIX}${key}`, { value, savedAt: new Date().toISOString() });
  }
  function loadDraft(key) { return readJson(localStorage, `${DRAFT_PREFIX}${key}`, null); }
  function clearDraft(key) { localStorage.removeItem(`${DRAFT_PREFIX}${key}`); }

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

  function captureInitialPage() {
    const session = getSession();
    const params = new URLSearchParams(location.search);
    const path = location.pathname;
    track('sitio_visitado', {
      origen: sessionStorage.getItem('tpl_origen'),
      pagina_anterior: session.lastPath || ''
    });

    if (/\/parcela(?:\.html)?$/.test(path)) {
      const code = params.get('id') || localStorage.getItem('selectedParcelaId') || '';
      if (code) updateProjectState({ parcelaCodigo: code, estado: 'parcela_seleccionada' });
      track('parcela_view', { parcela_codigo: code, origen: sessionStorage.getItem('tpl_origen') });
    }
    if (path.includes('cotizador')) {
      updateProjectState({ estado: 'cotizando' });
      track('cotizador_iniciado', { parcela_codigo: getProjectState().parcelaCodigo || localStorage.getItem('selectedParcelaId') || '' });
    }
    if (path.includes('/publicar')) track('publicacion_iniciada', { paso: 1 });
  }

  function handleClick(event) {
    const target = event.target.closest('a,button,.casa-card,.extra-card-compact,.fundacion-card-premium,[data-tpl-event]');
    if (!target) return;
    const text = `${target.id || ''} ${target.className || ''} ${target.textContent || ''}`.toLowerCase();
    let eventName = target.dataset.tplEvent || null;
    const metadata = { origen: sessionStorage.getItem('tpl_origen') };

    if (!eventName && target.matches('a[href*="wa.me"],a[href*="whatsapp"]')) eventName = 'whatsapp_click';
    if (!eventName && (text.includes('mapa') || text.includes('ubicación'))) eventName = 'mapa_abierto';
    if (!eventName && /reservar|reserva/.test(text)) eventName = 'reserva_iniciada';
    if (!eventName && target.matches('.casa-card,[data-casa-id]')) {
      eventName = 'casa_seleccionada';
      metadata.casa_codigo = target.dataset.id || target.dataset.casaId || '';
      updateProjectState({ casaCodigo: metadata.casa_codigo, estado: 'casa_seleccionada' });
    }
    if (!eventName && target.matches('.extra-card-compact')) {
      eventName = 'extra_seleccionado';
      metadata.extra_codigo = target.dataset.id || '';
      const project = getProjectState();
      updateProjectState({ extras: [...project.extras, metadata.extra_codigo], estado: 'extras_seleccionados' });
    }
    if (!eventName && target.matches('.fundacion-card-premium')) {
      eventName = 'tipo_constructivo_seleccionado';
      metadata.tipo_constructivo = target.dataset.id || '';
    }
    if (eventName) track(eventName, metadata);
  }

  let filterTimer = null;
  function handleChange(event) {
    const field = event.target;
    if (!(field.closest('#search-form,.filters,.filters-bar,.location-filter-bar') || /filter|filtro|region|comuna|presupuesto|habitacion/i.test(field.id || field.name || ''))) return;
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      track('busqueda_realizada', {
        filtros_activos: document.querySelectorAll('.filter-btn.active,.location-filter-bar .active').length || 1,
        filtro_tipo: field.name || field.id || field.type || 'filtro'
      });
    }, 500);
  }

  function init() {
    sessionStorage.setItem('tpl_origen', sourceFromUrl().slice(0, 120));
    captureInitialPage();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('change', handleChange, true);
    window.addEventListener('online', flushQueue);
    window.addEventListener('pagehide', () => {
      const session = getSession();
      const seconds = Math.max(0, Math.round((Date.now() - Date.parse(session.startedAt)) / 1000));
      if (seconds >= 5) track('sesion_finalizada', { duracion_segundos: seconds });
    }, { once: true });
    flushQueue();
  }

  window.TPLLaunch = {
    track, flushQueue, saveDraft, loadDraft, clearDraft, guardSubmit, releaseSubmit,
    getProjectState, updateProjectState, getSession
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
