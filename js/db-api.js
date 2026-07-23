// Fuente pública canónica de Tu Parcela Lista.
// Parcelas, casas, extras y promociones se obtienen exclusivamente de Supabase.
(() => {
  'use strict';

  const URL = 'https://qxavbqhyqaqalpzbhwmh.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXZicWh5cWFxYWxwemJod21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA';
  const state = { parcelas: [], casas: [], extras: [], fundaciones: [], fundacionExtraRules: [], loadedAt: null };

  function client() {
    let sb = window.tplSupabase || window.tplCrmSupabase || window.TPL_getSupabaseClient?.() || null;
    if (!sb && window.supabase?.createClient) {
      sb = window.supabase.createClient(URL, ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'sb-qxavbqhyqaqalpzbhwmh-auth-token'
        },
        global: { headers: { 'X-Client-Info': 'tpl-public-catalog-v2' } }
      });
    }
    if (!sb) throw new Error('TPL_CATALOG_CONNECTION_UNAVAILABLE');
    window.tplSupabase = sb;
    return sb;
  }

  function number(...values) {
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;
      const parsed = Number(String(value).replace(',', '.'));
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  }

  function boolean(value) {
    if (typeof value === 'boolean') return value;
    return ['si', 'sí', 'true', '1', 'yes'].includes(String(value ?? '').trim().toLowerCase());
  }

  function images(value, principal = '') {
    const list = Array.isArray(value) ? value : [];
    const output = list.map((item) => typeof item === 'string'
      ? item
      : item?.url || item?.imagen_url || item?.storage_url || item?.public_url || ''
    ).filter(Boolean);
    if (principal && !output.includes(principal)) output.unshift(principal);
    return [...new Set(output)];
  }

  function publicationType(row) {
    return String(row.tipo_inmueble || row.tipo || '').trim().toLowerCase();
  }

  function mapParcela(row) {
    const precioNumero = number(row.precio_publicacion, row.precio);
    const imagenes = images(row.imagenes, row.imagen_principal);
    return {
      ...row,
      id: String(row.identificador_legacy || row.codigo_publico || row.id),
      publicacionId: row.id,
      codigoPublico: row.codigo_publico,
      nombre: row.titulo_publico || 'Propiedad disponible',
      precio: precioNumero
        ? precioNumero.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
        : 'Consultar',
      precioNumero,
      tamano: number(row.superficie_m2, row.superficie_terreno_m2),
      comuna: row.comuna || '',
      region: row.region || '',
      descripcion: row.descripcion_publica || '',
      lat: number(row.latitud_publica),
      lng: number(row.longitud_publica),
      imagen: row.imagen_principal || imagenes[0] || 'image/placeholder-parcela.jpg',
      imagenes,
      agua: boolean(row.agua),
      luz: boolean(row.luz),
      naturaleza: Array.isArray(row.naturaleza) ? row.naturaleza.length > 0 : boolean(row.naturaleza),
      facilidad: boolean(row.facilidad_pago),
      servicios: Array.isArray(row.servicios) ? row.servicios.length > 0 : boolean(row.servicios),
      destacada: boolean(row.destacada),
      rol: row.rol || '',
      tipoInmueble: publicationType(row) || 'parcela',
      esParcelaConCasa: publicationType(row) === 'parcela_con_casa',
      valorRespaldadoTPL: boolean(row.valor_respaldado_tpl),
      precioRecomendadoTpl: number(row.precio_recomendado_tpl),
      ventaUrgente: boolean(row.venta_urgente),
      urgenteDestacado: boolean(row.urgente_destacado),
      prioridadPromocion: number(row.prioridad_promocion)
    };
  }

  function mapCasa(row) {
    const imagenes = images(row.imagenes, row.imagen_principal_url);
    return {
      ...row,
      id: row.codigo || String(row.id),
      casaId: row.id,
      empresa: row.empresa || '',
      nombre: row.nombre,
      metros: number(row.superficie_m2),
      habitaciones: number(row.habitaciones),
      banos: number(row.banos),
      valorCasa: number(row.precio_base),
      foto: row.imagen_principal_url || imagenes[0] || 'image/placeholder-casa.jpg',
      imagenes,
      plano: row.plano_url || '',
      descripcion_breve: row.descripcion || '',
      tiempo: row.tiempo_entrega || ''
    };
  }

  function mapExtra(row) {
    return {
      ...row,
      id: row.codigo || String(row.id),
      extraId: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion || '',
      tipoCalculo: row.tipo_calculo,
      tipoCalculo2: row.aplica_a || '',
      valor: number(row.precio_base),
      empresa: row.empresa || '',
      defaultQty: number(row.cantidad_default) || 1,
      minQty: number(row.cantidad_minima) || 1,
      maxQty: number(row.cantidad_maxima) || 1,
      categoria: row.categoria,
      planCode: row.codigo_plan || '',
      visualOrder: number(row.orden_visual) || 0,
      extraRules: []
    };
  }

  async function select(table, columns = '*', orderColumn = 'actualizado_en', ascending = false) {
    let query = client().from(table).select(columns);
    if (orderColumn) query = query.order(orderColumn, { ascending });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function apiGetParcelas() {
    const rows = await select('publicaciones_publicas');
    return rows
      .filter((row) => !['casa', 'parcela_con_casa'].includes(publicationType(row)))
      .map(mapParcela)
      .sort((a, b) => b.prioridadPromocion - a.prioridadPromocion);
  }

  async function apiGetParcelasConCasa() {
    const rows = await select('publicaciones_publicas');
    return rows.filter((row) => publicationType(row) === 'parcela_con_casa').map(mapParcela);
  }

  async function apiGetCasas() {
    return (await select('casas')).filter((row) => row.activa !== false).map(mapCasa);
  }

  async function apiGetExtras() {
    return (await select('extras')).filter((row) => row.activo !== false).map(mapExtra);
  }

  async function apiGetFundacionExtraRules() {
    try {
      return await select('fundacion_extra_reglas', '*', 'orden', true);
    } catch (error) {
      // Compatibilidad de despliegue: el catálogo sigue cargando si el frontend
      // llega antes que la migración. No se inventan reglas ni se ocultan extras.
      console.warn('Reglas de planes de instalación aún no disponibles.', error);
      return [];
    }
  }

  async function loadCatalogs() {
    const [parcelas, casas, extras, fundacionExtraRules] = await Promise.all([
      apiGetParcelas(),
      apiGetCasas(),
      apiGetExtras(),
      apiGetFundacionExtraRules()
    ]);
    state.parcelas = parcelas;
    state.casas = casas;
    state.fundaciones = extras
      .filter((item) => item.categoria === 'fundacion')
      .sort((a, b) => (a.visualOrder || 999) - (b.visualOrder || 999) || a.valor - b.valor);
    state.extras = extras.filter((item) => item.categoria !== 'fundacion');
    state.fundacionExtraRules = fundacionExtraRules.filter((item) => item.activo !== false);
    state.fundaciones.forEach((fundacion) => {
      fundacion.extraRules = state.fundacionExtraRules.filter((rule) => String(rule.fundacion_id) === String(fundacion.extraId));
    });
    state.loadedAt = new Date().toISOString();

    window.SERVER_PARCELAS = state.parcelas;
    window.SERVER_CASAS = state.casas;
    window.SERVER_EXTRAS = state.extras;
    window.SERVER_FUNDACIONES = state.fundaciones;
    window.SERVER_FUNDACION_EXTRA_RULES = state.fundacionExtraRules;
    window.parcelas = state.parcelas;
    window.casas = state.casas;
    window.extrasOpcionales = state.extras;
    window.extrasAutomaticos = [];
    window.fundaciones = state.fundaciones;
    window.dispatchEvent(new CustomEvent('tpl:catalog-ready', { detail: { ...state } }));
    return { ...state };
  }

  async function apiSaveLead(payload) {
    try {
      if (payload.cliente) {
        const { data, error } = await client().rpc('crm_registrar_oportunidad_publica', {
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
      const { data, error } = await client().from('leads_cotizaciones').insert([payload]).select();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error al guardar lead:', error);
      return { success: false, error };
    }
  }

  window.TPLCatalog = Object.freeze({
    state,
    ready: loadCatalogs(),
    refresh: loadCatalogs,
    mapParcela,
    mapCasa,
    mapExtra,
    apiGetFundacionExtraRules
  });
  window.apiLoadPublicCatalogs = loadCatalogs;
  window.apiGetParcelas = apiGetParcelas;
  window.apiGetParcelasConCasa = apiGetParcelasConCasa;
  window.apiGetCasas = apiGetCasas;
  window.apiGetExtras = apiGetExtras;
  window.apiSaveLead = apiSaveLead;
  window.tplMapPublicacionToParcela = mapParcela;
})();
