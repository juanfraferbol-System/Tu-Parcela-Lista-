/* =========================================================
   TPL BRAIN v1 - Cerebro transversal de Tu Parcela Lista
   Conecta navegación, parcelas, casas, cotizaciones, publicación
   y CRM mediante un contexto persistente y eventos seguros.
========================================================= */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'tpl_brain_context_v1';
  const QUEUE_KEY = 'tpl_brain_sync_queue_v1';
  const MAX_QUEUE = 250;
  const PUBLIC_EVENTS = new Set([
    'parcela_view','filtros_usados','mapa_abierto','whatsapp_click',
    'cotizador_iniciado','casa_seleccionada','tipo_constructivo_seleccionado',
    'extra_seleccionado','cotizacion_guardada','pdf_generado',
    'publicacion_iniciada','publicacion_finalizada'
  ]);
  const EVENT_ALIASES = {
    PARCELA_VISTA: 'parcela_view',
    MAPA_ABIERTO: 'mapa_abierto',
    WHATSAPP_CLICK: 'whatsapp_click',
    COTIZADOR_INICIADO: 'cotizador_iniciado',
    CASA_SELECCIONADA: 'casa_seleccionada',
    EXTRA_SELECCIONADO: 'extra_seleccionado',
    COTIZACION_GUARDADA: 'cotizacion_guardada',
    PDF_GENERADO: 'pdf_generado',
    PUBLICACION_INICIADA: 'publicacion_iniciada',
    PUBLICACION_FINALIZADA: 'publicacion_finalizada',
    PUBLICACION_PREPARADA: 'publicacion_iniciada',
    CRM_SINCRONIZADO: 'publicacion_finalizada'
  };

  const now = () => new Date().toISOString();
  const uuid = () => root.crypto?.randomUUID?.() || `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const cleanText = (value, max = 80) => String(value ?? '').trim().slice(0, max);
  const safeNumber = (value) => { const n = Number(value); return Number.isFinite(n) ? n : null; };

  function initialContext() {
    return {
      version: 1,
      sessionId: sessionStorage.getItem('tpl_brain_session') || uuid(),
      visitorId: localStorage.getItem('tpl_brain_visitor') || uuid(),
      stage: 'visitante',
      current: { parcela: null, casa: null, cotizacion: null, publicacion: null, proyecto: null },
      signals: { urgency: null, budget: null, intent: null, lastPage: location.pathname },
      counters: { parcelViews: 0, quoteStarts: 0, quoteSaves: 0, whatsappClicks: 0 },
      nextActions: [],
      updatedAt: now()
    };
  }

  let context = { ...initialContext(), ...read(STORAGE_KEY, {}) };
  sessionStorage.setItem('tpl_brain_session', context.sessionId);
  localStorage.setItem('tpl_brain_visitor', context.visitorId);

  function save() {
    context.updatedAt = now();
    context.signals.lastPage = location.pathname;
    context.nextActions = recommend(context);
    write(STORAGE_KEY, context);
    root.dispatchEvent(new CustomEvent('tpl:brain-context', { detail: snapshot() }));
    return context;
  }

  function snapshot() { return JSON.parse(JSON.stringify(context)); }

  function recommend(ctx) {
    const actions = [];
    if (ctx.current.parcela && !ctx.current.casa) actions.push({ type: 'ELEGIR_CASA', label: 'Sugerir una casa compatible con la parcela', priority: 'media' });
    if (ctx.current.casa && !ctx.current.cotizacion) actions.push({ type: 'CONTINUAR_COTIZACION', label: 'Continuar el proyecto en el cotizador', priority: 'alta' });
    if (ctx.current.cotizacion && ctx.stage !== 'activo_proyecto') actions.push({ type: 'ACTIVAR_PROYECTO', label: 'Invitar a guardar o activar el proyecto', priority: 'alta' });
    if (ctx.counters.parcelViews >= 3 && !ctx.current.cotizacion) actions.push({ type: 'GUIAR_DECISION', label: 'Ofrecer ayuda para comparar las parcelas vistas', priority: 'media' });
    if (ctx.counters.whatsappClicks > 0) actions.push({ type: 'SEGUIMIENTO_COMERCIAL', label: 'Priorizar seguimiento comercial', priority: 'alta' });
    return actions.slice(0, 4);
  }

  function sanitizeMetadata(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const allowed = ['parcela_id','parcela_codigo','casa_id','casa_codigo','extra_codigo','tipo_constructivo','origen','paso','resultado','motivo','valor','filtros_activos','duracion_segundos','publicacion_id','fecha_visita'];
    const output = {};
    for (const key of allowed) {
      if (source[key] === undefined || source[key] === null || source[key] === '') continue;
      output[key] = typeof source[key] === 'number' ? source[key] : cleanText(source[key], key === 'filtros_activos' ? 180 : 80);
    }
    return output;
  }

  function updateContext(eventName, payload = {}) {
    const name = String(eventName || '').toLowerCase();
    if (name === 'parcela_view') {
      context.current.parcela = { id: cleanText(payload.parcela_id || payload.parcela_codigo || payload.id), nombre: cleanText(payload.nombre), valor: safeNumber(payload.valor) };
      context.counters.parcelViews += 1; context.stage = 'vio_parcela'; context.signals.intent = 'parcela';
    } else if (name === 'casa_seleccionada') {
      context.current.casa = { id: cleanText(payload.casa_id || payload.casa_codigo || payload.id), nombre: cleanText(payload.nombre), valor: safeNumber(payload.valor) };
      context.stage = 'eligio_casa'; context.signals.intent = 'parcela_casa';
    } else if (name === 'cotizador_iniciado') {
      context.counters.quoteStarts += 1; context.stage = 'inicio_cotizacion';
    } else if (name === 'cotizacion_guardada') {
      context.current.cotizacion = { id: cleanText(payload.id || uuid()), valor: safeNumber(payload.valor), savedAt: now() };
      context.counters.quoteSaves += 1; context.stage = 'guardo_cotizacion';
    } else if (name === 'publicacion_iniciada') {
      context.stage = 'publicando'; context.signals.intent = 'vender';
    } else if (name === 'publicacion_finalizada') {
      context.current.publicacion = { id: cleanText(payload.publicacion_id || payload.id), completedAt: now() };
      context.stage = 'publicacion_pendiente_revision';
    } else if (name === 'whatsapp_click') {
      context.counters.whatsappClicks += 1;
    }
    save();
  }

  function enqueue(record) {
    const queue = read(QUEUE_KEY, []);
    queue.push(record);
    write(QUEUE_KEY, queue.slice(-MAX_QUEUE));
  }

  async function syncRecord(record) {
    const client = root.tplSupabase || root.tplCrmSupabase;
    if (!client || !PUBLIC_EVENTS.has(record.evento)) return false;
    const { error } = await client.from('crm_eventos').insert({
      evento: record.evento,
      etapa: record.etapa,
      origen: record.origen,
      pagina: record.pagina,
      metadata: record.metadata
    });
    if (error) throw error;
    return true;
  }

  async function flush() {
    const queue = read(QUEUE_KEY, []);
    if (!queue.length || !(root.tplSupabase || root.tplCrmSupabase) || !navigator.onLine) return;
    const pending = [];
    for (const record of queue) {
      try { await syncRecord(record); } catch { pending.push(record); }
    }
    write(QUEUE_KEY, pending);
  }

  function track(eventName, payload = {}, options = {}) {
    const normalized = EVENT_ALIASES[String(eventName || '').toUpperCase()] || String(eventName || '').toLowerCase();
    updateContext(normalized, payload);
    const record = {
      id: uuid(), evento: normalized, etapa: context.stage,
      origen: cleanText(options.source || payload.origen || 'web-cerebro', 120),
      pagina: cleanText(location.pathname, 180), metadata: sanitizeMetadata(payload), creado_en: now()
    };
    if (PUBLIC_EVENTS.has(normalized)) {
      enqueue(record);
      flush();
    }
    root.TPL?.events?.emit?.('BRAIN_EVENT_RECORDED', record, { source: 'tpl-brain' });
    return record;
  }

  function captureClicks() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a,button,[data-parcela-id],[data-casa-id],[data-extra-id]');
      if (!target) return;
      const href = target.getAttribute('href') || '';
      const text = cleanText(target.textContent, 60).toLowerCase();
      const parcelaId = target.dataset.parcelaId || target.dataset.idParcela;
      const casaId = target.dataset.casaId || target.dataset.idCasa;
      const extraId = target.dataset.extraId;
      if (parcelaId) track('parcela_view', { parcela_codigo: parcelaId });
      if (casaId) track('casa_seleccionada', { casa_codigo: casaId });
      if (extraId) track('extra_seleccionado', { extra_codigo: extraId });
      if (/whatsapp|wa\.me/i.test(href) || text.includes('whatsapp')) track('whatsapp_click', { origen: location.pathname });
      if (text.includes('mapa') || target.id?.toLowerCase().includes('map')) track('mapa_abierto', { origen: location.pathname });
      if (text.includes('cotizar') || href.includes('cotizador')) track('cotizador_iniciado', { origen: location.pathname });
      if (text.includes('pdf') || text.includes('descargar proyecto')) track('pdf_generado', { valor: context.current.cotizacion?.valor });
    }, true);
  }

  function bridgeExistingEvents() {
    const events = root.TPL?.events;
    events?.on?.('*', (event) => {
      if (event.name === 'BRAIN_EVENT_RECORDED') return;
      const alias = EVENT_ALIASES[event.name];
      if (alias) track(alias, event.payload || {}, { source: event.metadata?.source || 'tpl-core' });
    });
  }

  function init() {
    captureClicks();
    bridgeExistingEvents();
    save();
    flush();
    root.addEventListener('online', flush);
    root.addEventListener('storage', (event) => { if (event.key === STORAGE_KEY) context = { ...initialContext(), ...read(STORAGE_KEY, {}) }; });
    track(location.pathname.includes('/publicar') ? 'publicacion_iniciada' : 'filtros_usados', { paso: 'page_view', origen: document.referrer ? 'referido' : 'directo' });
  }

  root.TPL = root.TPL || {};
  root.TPL.brain = { init, track, flush, getContext: snapshot, setContext: (patch) => { context = { ...context, ...patch }; return save(); }, recommendations: () => recommend(context) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})(typeof globalThis !== 'undefined' ? globalThis : window);
