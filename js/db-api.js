// js/db-api.js
// Cliente de conexión y operaciones con Supabase para el frontend (app.js)

// Inicializa Supabase (Reemplazar con tus credenciales reales cuando crees el proyecto en Supabase)
const SUPABASE_URL = 'https://qxavbqhyqaqalpzbhwmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXZicWh5cWFxYWxwemJod21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA';

let supabase = null;

if (typeof window.supabase !== 'undefined' && SUPABASE_URL !== 'TU_SUPABASE_URL_AQUI') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn("⚠️ Supabase no está configurado en db-api.js. Usando fallback local (parcelas.js).");
}

/**
 * Obtiene la lista de parcelas. 
 * Si Supabase no está listo, retorna los datos de parcelas.js
 */
async function apiGetParcelas() {
  if (!supabase) {
    return typeof window.PARCELAS_DB !== 'undefined' ? window.PARCELAS_DB : (typeof window.parcelas !== 'undefined' ? window.parcelas : []);
  }
  
  try {
    const { data, error } = await supabase
      .from('parcelas')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false });
      
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
async function apiSaveLead(leadData) {
  if (!supabase) {
    console.log("Mock: Lead guardado", leadData);
    return { success: true, mock: true };
  }

  try {
    const { data, error } = await supabase
      .from('leads_cotizaciones')
      .insert([leadData])
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
