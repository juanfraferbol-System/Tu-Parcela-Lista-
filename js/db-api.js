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
<<<<<<< HEAD
  if (!tplDbSupabase) {
    return typeof window.PARCELAS_DB !== 'undefined' ? window.PARCELAS_DB : (typeof window.parcelas !== 'undefined' ? window.parcelas : []);
=======
  const parcelasLocales =
    typeof window.PARCELAS_DB !== "undefined"
      ? window.PARCELAS_DB
      : typeof window.parcelas !== "undefined"
        ? window.parcelas
        : [];

  if (!tplDbSupabase) {
    return parcelasLocales;
>>>>>>> c0d670c (Corregir formato de parcelas cargadas desde Supabase)
  }

  try {
    const { data, error } = await tplDbSupabase
<<<<<<< HEAD
      .from('publicaciones_publicas')
      .select('*')
      .order('actualizado_en', { ascending: false });
      
=======
      .from("publicaciones_publicas")
      .select("*")
      .order("actualizado_en", { ascending: false });

>>>>>>> c0d670c (Corregir formato de parcelas cargadas desde Supabase)
    if (error) throw error;

    if (!Array.isArray(data) || data.length === 0) {
      return parcelasLocales;
    }

    return data.map((db) => {
      const precioNumero = Number(
        db.precio_publicacion ??
        db.precio ??
        db.valor ??
        0
      );

      const tamano = Number(
        db.superficie_m2 ??
        db.tamano_m2 ??
        db.tamano ??
        db.superficie ??
        0
      );

      const imagenPrincipal =
        db.imagen_portada_url ??
        db.portada_url ??
        db.imagen_url ??
        db.imagen ??
        "";

      let imagenes = [];

      if (Array.isArray(db.imagenes)) {
        imagenes = db.imagenes
          .map((imagen) => {
            if (typeof imagen === "string") {
              return imagen;
            }

            return (
              imagen?.url ??
              imagen?.imagen_url ??
              imagen?.storage_url ??
              ""
            );
          })
          .filter(Boolean);
      }

      if (imagenPrincipal && !imagenes.includes(imagenPrincipal)) {
        imagenes.unshift(imagenPrincipal);
      }

      return {
        ...db,

        id: db.id ?? db.slug ?? crypto.randomUUID(),

        nombre:
          db.titulo_publico ??
          db.titulo ??
          db.nombre ??
          "Parcela disponible",

        precio: precioNumero
          ? precioNumero.toLocaleString("es-CL", {
              style: "currency",
              currency: "CLP",
              maximumFractionDigits: 0
            })
          : "Consultar",

        precioNumero,
        tamano,

        comuna:
          db.comuna ??
          db.nombre_comuna ??
          db.ubicacion_comuna ??
          "",

        region:
          db.region ??
          db.nombre_region ??
          db.ubicacion_region ??
          "",

        descripcion:
          db.descripcion_publica ??
          db.descripcion ??
          db.descripcion_breve ??
          "Parcela disponible para tu proyecto.",

        lat: Number(
          db.latitud ??
          db.lat ??
          db.latitude ??
          0
        ),

        lng: Number(
          db.longitud ??
          db.lng ??
          db.longitude ??
          0
        ),

        imagen:
          imagenPrincipal ||
          imagenes[0] ||
          "image/placeholder-parcela.jpg",

        imagenes:
          imagenes.length > 0
            ? imagenes
            : ["image/placeholder-parcela.jpg"],

        agua:
          db.agua ??
          db.disponibilidad_agua ??
          false,

        luz:
          db.luz ??
          db.disponibilidad_luz ??
          false,

        naturaleza:
          db.naturaleza ??
          db.bosque_nativo ??
          false,

        facilidad:
          db.facilidad_pago ??
          db.facilidad ??
          false,

        servicios:
          db.cercana_servicios ??
          db.servicios ??
          false
      };
    });
  } catch (err) {
    console.error("Error al obtener parcelas de Supabase:", err);
    return parcelasLocales;
  }
}
<<<<<<< HEAD

/**
 * Guarda un lead o cotización en Supabase
 */
=======
>>>>>>> c0d670c (Corregir formato de parcelas cargadas desde Supabase)
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
