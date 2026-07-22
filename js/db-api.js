// js/db-api.js
// Cliente de conexión y operaciones con Supabase para el frontend.

const SUPABASE_URL = 'https://qxavbqhyqaqalpzbhwmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXZicWh5cWFxYWxwemJod21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA';

let tplDbSupabase = window.tplSupabase || window.tplCrmSupabase || window.TPL_getSupabaseClient?.() || null;

if (!tplDbSupabase && typeof window.supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
  tplDbSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'sb-qxavbqhyqaqalpzbhwmh-auth-token'
    },
    global: {
      headers: { 'X-Client-Info': 'tu-parcela-lista-web' }
    }
  });
} else if (!tplDbSupabase) {
  console.warn('⚠️ Supabase no está disponible. Se utilizará el inventario local de parcelas.js.');
}

if (tplDbSupabase) {
  window.tplSupabase = tplDbSupabase;
  window.tplCrmSupabase = window.tplCrmSupabase || tplDbSupabase;
}

function getLocalParcelas() {
  if (Array.isArray(window.PARCELAS_DB)) return window.PARCELAS_DB;
  if (Array.isArray(window.parcelas)) return window.parcelas;
  if (typeof parcelas !== 'undefined' && Array.isArray(parcelas)) return parcelas;
  return [];
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(String(value).replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['si', 'sí', 'true', '1', 'yes'].includes(normalized);
}

function normalizeImages(db, principal) {
  const candidates = [db.imagenes, db.fotos, db.galeria];
  const output = [];

  candidates.forEach((candidate) => {
    if (!Array.isArray(candidate)) return;
    candidate.forEach((image) => {
      const url = typeof image === 'string'
        ? image
        : image?.url ?? image?.imagen_url ?? image?.storage_url ?? image?.public_url ?? '';
      if (url && !output.includes(url)) output.push(url);
    });
  });

  if (principal && !output.includes(principal)) output.unshift(principal);
  return output.length ? output : ['image/placeholder-parcela.jpg'];
}

function mapPublicacionToParcela(db) {
  const precioNumero = firstFiniteNumber(db.precio_publicacion, db.precio, db.valor);
  const tamano = firstFiniteNumber(db.superficie_m2, db.tamano_m2, db.tamano, db.superficie);
  const lat = firstFiniteNumber(db.latitud_publica, db.latitud, db.lat, db.latitude);
  const lng = firstFiniteNumber(db.longitud_publica, db.longitud, db.lng, db.longitude);
  const imagenPrincipal = db.imagen_principal ?? db.imagen_portada_url ?? db.portada_url ?? db.imagen_url ?? db.imagen ?? '';
  const imagenes = normalizeImages(db, imagenPrincipal);

  const valorRespaldadoTPL = normalizeBoolean(
    db.valor_respaldado_tpl ??
    db.valorRespaldadoTPL ??
    db.distintivo_valor_respaldado
  );
  const precioRecomendadoTpl = firstFiniteNumber(
    db.precio_recomendado_tpl,
    db.precioRecomendadoTPL,
    db.precio_venta_rapida_tpl
  );

  const ventaUrgente = normalizeBoolean(db.venta_urgente ?? db.urgente ?? db.promocion_urgente);
  const urgenteDestacado = normalizeBoolean(db.urgente_destacado ?? db.destacado_pago ?? db.promocion_destacada);
  const prioridadPromocion = firstFiniteNumber(db.prioridad_promocion, db.prioridad_grilla, urgenteDestacado ? 100 : ventaUrgente ? 50 : 0);

  return {
    ...db,
    id: String(db.identificador_legacy ?? db.codigo_publico ?? db.id ?? db.slug ?? crypto.randomUUID()),
    nombre: db.titulo_publico ?? db.titulo ?? db.nombre ?? 'Parcela disponible',
    precio: precioNumero
      ? precioNumero.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
      : 'Consultar',
    precioNumero,
    tamano,
    comuna: db.comuna ?? db.nombre_comuna ?? db.ubicacion_comuna ?? '',
    region: db.region ?? db.nombre_region ?? db.ubicacion_region ?? '',
    descripcion: db.descripcion_publica ?? db.descripcion ?? db.descripcion_breve ?? 'Parcela disponible para tu proyecto.',
    lat,
    lng,
    imagen: imagenPrincipal || imagenes[0],
    imagenes,
    agua: normalizeBoolean(db.agua ?? db.disponibilidad_agua),
    luz: normalizeBoolean(db.luz ?? db.disponibilidad_luz),
    naturaleza: Array.isArray(db.naturaleza) ? db.naturaleza.length > 0 : normalizeBoolean(db.naturaleza ?? db.bosque_nativo),
    facilidad: normalizeBoolean(db.facilidad_pago ?? db.facilidad),
    servicios: Array.isArray(db.servicios) ? db.servicios.length > 0 : normalizeBoolean(db.cercana_servicios ?? db.servicios),
    valorRespaldadoTPL,
    precioRecomendadoTpl,
    ventaUrgente,
    urgenteDestacado,
    prioridadPromocion,
    distintivos: valorRespaldadoTPL ? {
      valorRespaldadoTPL: true,
      precioRecomendado: true,
      texto: 'Valor respaldado por Tu Parcela Lista',
      badge: 'Precio recomendado'
    } : (db.distintivos || {})
  };
}

/** Obtiene las parcelas públicas desde Supabase, con respaldo local. */
async function apiGetParcelas() {
  const parcelasLocales = getLocalParcelas();
  if (!tplDbSupabase) return parcelasLocales;

  try {
    const { data, error } = await tplDbSupabase
      .from('publicaciones_publicas')
      .select('*')
      .order('actualizado_en', { ascending: false });

    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) return parcelasLocales;

    const remotas = data.map(mapPublicacionToParcela).sort((a, b) => (b.prioridadPromocion || 0) - (a.prioridadPromocion || 0) || Number(b.valorRespaldadoTPL) - Number(a.valorRespaldadoTPL));
    const idsRemotos = new Set(remotas.map(item => String(item.id)));
    const localesNoDuplicadas = parcelasLocales.filter(item => !idsRemotos.has(String(item.id)));

    // Conserva el catálogo local mientras las publicaciones se migran gradualmente.
    return [...remotas, ...localesNoDuplicadas];
  } catch (err) {
    console.error('Error al obtener parcelas de Supabase:', err);
    return parcelasLocales;
  }
}

/** Guarda un lead o cotización en Supabase. */
async function apiSaveLead(payload) {
  if (!tplDbSupabase) {
    if (window.TplErrorLogger) {
      window.TplErrorLogger.log('DB-API', 'apiSaveLead', 'Error de conexión', 'No hay conexión a Supabase', null, 'crítico');
    }
    return { success: false, error: new Error('No se pudo conectar con la base de datos.') };
  }

  try {
    if (payload.cliente) {
      const { data, error } = await tplDbSupabase.rpc('crm_registrar_oportunidad_publica', {
        p_cliente: payload.cliente,
        p_proyecto: payload.proyecto || null,
        p_evento: payload.evento || 'informacion_solicitada',
        p_etapa: payload.etapa || 'solicito_informacion',
        p_origen: payload.proyecto?.origen || payload.origen || 'web',
        p_pagina: location.pathname,
        p_metadata: payload.metadata || {}
      });
      if (error) throw error;
      return data || { success: true };
    }

    const { data, error } = await tplDbSupabase
      .from('leads_cotizaciones')
      .insert([payload])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error al guardar lead:', err);
    return { success: false, error: err };
  }
}

window.apiGetParcelas = apiGetParcelas;
window.apiSaveLead = apiSaveLead;
window.tplMapPublicacionToParcela = mapPublicacionToParcela;
