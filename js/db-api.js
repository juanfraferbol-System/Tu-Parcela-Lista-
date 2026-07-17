// js/db-api.js
// Cliente de conexión y operaciones con Supabase para el frontend (app.js)

// Inicializa Supabase (Reemplazar con tus credenciales reales cuando crees el proyecto en Supabase)
const SUPABASE_URL = 'https://qxavbqhyqaqalpzbhwmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXZicWh5cWFxYWxwemJod21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA';

let tplDbSupabase = null;

if (typeof window.supabase !== 'undefined' && SUPABASE_URL !== 'TU_SUPABASE_URL_AQUI') {
  tplDbSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn("⚠️ Supabase no está configurado en db-api.js. Usando fallback local (parcelas.js).");
}
window.tplSupabase = tplDbSupabase;

/**
 * Obtiene la lista de parcelas. 
 * Si Supabase no está listo, retorna los datos de parcelas.js
 */
async function apiGetParcelas() {
  if (!tplDbSupabase) {
    return typeof window.PARCELAS_DB !== 'undefined' ? window.PARCELAS_DB : (typeof window.parcelas !== 'undefined' ? window.parcelas : []);
  }
  
  try {
    const { data, error } = await tplDbSupabase
      .from('publicaciones_publicas')
      .select('*')
      .order('actualizado_en', { ascending: false });
      
    if (error) throw error;
    return data && data.length > 0 ? data : (typeof window.PARCELAS_DB !== 'undefined' ? window.PARCELAS_DB : (typeof window.parcelas !== 'undefined' ? window.parcelas : []));
  } catch (err) {
    console.error("Error al obtener parcelas de Supabase:", err);
    return typeof window.PARCELAS_DB !== 'undefined' ? window.PARCELAS_DB : (typeof window.parcelas !== 'undefined' ? window.parcelas : []);
  }
}

/**
 * Guarda un lead o cotización en Supabase
 */
async function apiSaveLead(payload) {
  if (!tplDbSupabase) {
    if (window.TplErrorLogger) window.TplErrorLogger.log("DB-API", "apiSaveLead", "Error de conexión", "No hay conexión a Supabase", null, "crítico");
    return { success: false, error: new Error("No se pudo conectar con la base de datos.") };
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

    // Fallback legacy behavior
    const { data, error } = await tplDbSupabase
      .from('leads_cotizaciones')
      .insert([payload])
      .select();
      
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("Error al guardar lead:", err);
    return { success: false, error: err };
  }
}

window.apiGetParcelas = apiGetParcelas;
window.apiSaveLead = apiSaveLead;
