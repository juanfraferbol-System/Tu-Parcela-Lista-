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


// ==========================================
// TASADOR INTELIGENTE E INVERSIÓN
// ==========================================
window.TasadorInteligente = {
  getCommuneAverage: function(parcelas, comuna) {
    if (!parcelas || !comuna) return 0;
    const filtered = parcelas.filter(p => p.comuna === comuna);
    if(filtered.length === 0) return 0;
    let total = 0;
    filtered.forEach(p => {
      let price = p.precio;
      if (typeof price === 'string') {
        price = parseInt(price.replace(/[^0-9]/g, ''), 10);
      }
      total += (price || 0);
    });
    return total / filtered.length;
  },
  isOpportunity: function(parcelas, parcela) {
    if (!parcelas || !parcela) return false;
    const avg = this.getCommuneAverage(parcelas, parcela.comuna);
    if(avg === 0) return false;
    
    let price = parcela.precio;
    if (typeof price === 'string') {
      price = parseInt(price.replace(/[^0-9]/g, ''), 10);
    }
    
    // Es oportunidad si el precio es <= 85% del promedio
    return price > 0 && price <= (avg * 0.85);
  },
  getMockVisits: function(parcelaId) {
    // Simulador de visitas para el CRM basado en el ID
    const seed = String(parcelaId).split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return {
      visitasTotales: (seed * 13) % 450 + 50,
      visitasMes: (seed * 7) % 80 + 10,
      tiempoPromedio: ((seed * 3) % 4 + 1) + ' min'
    };
  }
};
