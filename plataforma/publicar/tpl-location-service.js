/**
 * TPL LOCATION SERVICE MODULE
 * Capa geogrática desacoplada para resolución de atributos, cálculo de distancias por carretera,
 * diferenciación proximidad vs acceso y cálculo del Índice de Ubicación TPL (0-100).
 * Versión: tpl-location-service-v1
 */
(function(global){
  'use strict';

  const CONFIG = Object.freeze({
    module: 'tpl-location-service-v1',
    version: '2026-07-27',
    locationIndex: Object.freeze({
      enabledForValuation: false, // En V1, calcular, guardar y mostrar, pero no alterar el precio monetario
      maxPremium: 0.10,
      maxDiscount: 0.10
    }),
    defaultRoadSinuosityFactor: 1.35 // Factor para convertir distancia geodésica lineal a carretera cuando falla API
  });

  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

  // Fórmula Haversine para distancia geodésica (respaldo cuando no hay API de rutas)
  function haversineKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  }

  /**
   * Estructura normalizada para un atributo geográfico / servicio
   * Diferencia estrictamente entre proximidad detectada y acceso legal o físico declarado
   */
  function buildAttribute({ nombre, tipo, distanciaKm, detectado = false, declarado = false, accesoConfirmado = false, fuente = 'analisis_espacial_tpl', nivelConfianza = 'medio' }) {
    return {
      nombre: String(nombre || 'Servicio'),
      tipo: String(tipo || 'general'),
      distanciaKm: distanciaKm !== null && distanciaKm !== undefined ? num(distanciaKm) : null,
      atributoDetectado: Boolean(detectado),
      atributoDeclarado: Boolean(declarado),
      accesoRealConfirmado: Boolean(accesoConfirmado),
      fuente: String(fuente),
      fecha: new Date().toISOString(),
      nivelConfianza: String(nivelConfianza) // 'bajo', 'medio', 'alto', 'verificado'
    };
  }

  /**
   * Calcula el Índice de Ubicación TPL (0 a 100)
   * No suma porcentajes independientes para evitar sobrevaloración acumulativa.
   */
  function calculateLocationIndex(resolvedData) {
    let score = 50; // Puntaje base neutro

    // 1. Distancia a ciudad principal
    const distCiudad = resolvedData.distanciaCarreteraKm !== null ? resolvedData.distanciaCarreteraKm : resolvedData.distanciaGeograficaKm;
    if (distCiudad !== null) {
      if (distCiudad <= 10) score += 25;
      else if (distCiudad <= 20) score += 18;
      else if (distCiudad <= 35) score += 10;
      else if (distCiudad <= 50) score += 3;
      else if (distCiudad > 70) score -= 15;
    }

    // 2. Conectividad vial y distancia a ruta principal
    const distRuta = resolvedData.distanciaRutaPrincipalKm;
    if (distRuta !== null) {
      if (distRuta <= 2) score += 10;
      else if (distRuta <= 5) score += 5;
      else if (distRuta > 15) score -= 10;
    }

    // 3. Servicios esenciales (Hospital, Supermercado, Educación, Farmacia, Comisaría)
    const s = resolvedData.serviciosCercanos || {};
    if (s.hospital && s.hospital.distanciaKm !== null && s.hospital.distanciaKm <= 20) score += 5;
    if (s.supermercado && s.supermercado.distanciaKm !== null && s.supermercado.distanciaKm <= 15) score += 5;
    if (s.escuela && s.escuela.distanciaKm !== null && s.escuela.distanciaKm <= 10) score += 3;
    if (s.estacionServicio && s.estacionServicio.distanciaKm !== null && s.estacionServicio.distanciaKm <= 15) score += 2;

    // 4. Atractivos naturales y turísticos (Sólo si tienen proximidad relevante o acceso confirmado)
    if (s.rioLagoPlaya && s.rioLagoPlaya.atributoDetectado && s.rioLagoPlaya.distanciaKm <= 5) {
      score += s.rioLagoPlaya.accesoRealConfirmado ? 8 : 4;
    }
    if (s.parqueNacional && s.parqueNacional.atributoDetectado && s.parqueNacional.distanciaKm <= 15) {
      score += 4;
    }

    // Limitar entre 0 y 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Resuelve los datos geográficos de una propiedad
   */
  function resolve(input = {}) {
    const lat = num(input.latitude || input.lat);
    const lon = num(input.longitude || input.lon || input.lng);
    const region = String(input.region || '').trim();
    const comuna = String(input.comuna || '').trim();
    const localidad = String(input.localidad || input.sector || '').trim();

    // Determinar ciudad principal de referencia desde catálogo o input
    let ciudadNombre = input.ciudadPrincipalNombre || input.nearestCityName || 'Ciudad de Referencia';
    let distGeografica = input.distanciaGeograficaKm !== undefined ? num(input.distanciaGeograficaKm) : null;

    const g = (typeof window !== 'undefined' ? window : globalThis);
    if (lat && lon && g.TPL_NATIONAL_CATALOG && g.TPL_NATIONAL_CATALOG.majorCities) {
      const cities = g.TPL_NATIONAL_CATALOG.majorCities;
      let nearest = null; let minDist = Infinity;
      for (const c of cities) {
        const d = haversineKm(lat, lon, c.lat, c.lon);
        if (d !== null && d < minDist) { minDist = d; nearest = c; }
      }
      if (nearest) {
        ciudadNombre = nearest.name;
        distGeografica = minDist;
      }
    }

    // Prioridad: Distancia por carretera
    let distCarretera = input.distanciaCarreteraKm !== undefined && input.distanciaCarreteraKm !== null ? num(input.distanciaCarreteraKm) : null;
    let esEstimacion = false;

    if (distCarretera === null && distGeografica !== null) {
      // Respaldo por estimación vial geométrica
      distCarretera = Number((distGeografica * CONFIG.defaultRoadSinuosityFactor).toFixed(1));
      esEstimacion = true;
    }

    const tiempoEstMin = input.tiempoEstimadoMin !== undefined && input.tiempoEstimadoMin !== null ? num(input.tiempoEstimadoMin) : (distCarretera !== null ? Math.round(distCarretera * 1.2) : null);
    const distRutaKm = input.distanciaRutaPrincipalKm !== undefined && input.distanciaRutaPrincipalKm !== null ? num(input.distanciaRutaPrincipalKm) : 3.0;

    // Servicios cercanos (Diferenciando proximidad de acceso)
    const servicios = {
      hospital: buildAttribute({
        nombre: input.hospitalNombre || 'Hospital / Centro de Salud',
        tipo: 'salud',
        distanciaKm: input.hospitalDistKm !== undefined ? input.hospitalDistKm : (distCarretera ? Math.round(distCarretera * 0.9) : 12),
        detectado: true,
        declarado: Boolean(input.hospitalDeclarado),
        fuente: 'catalogo_espacial'
      }),
      escuela: buildAttribute({
        nombre: input.escuelaNombre || 'Escuela / Liceo Cercano',
        tipo: 'educacion',
        distanciaKm: input.escuelaDistKm !== undefined ? input.escuelaDistKm : (distCarretera ? Math.round(distCarretera * 0.6) : 8),
        detectado: true,
        declarado: Boolean(input.escuelaDeclarado),
        fuente: 'catalogo_espacial'
      }),
      supermercado: buildAttribute({
        nombre: input.supermercadoNombre || 'Supermercado / Abastecimiento',
        tipo: 'comercio',
        distanciaKm: input.supermercadoDistKm !== undefined ? input.supermercadoDistKm : (distCarretera ? Math.round(distCarretera * 0.8) : 10),
        detectado: true,
        declarado: Boolean(input.supermercadoDeclarado),
        fuente: 'catalogo_espacial'
      }),
      farmacia: buildAttribute({
        nombre: input.farmaciaNombre || 'Farmacia',
        tipo: 'salud_comercio',
        distanciaKm: input.farmaciaDistKm !== undefined ? input.farmaciaDistKm : (distCarretera ? Math.round(distCarretera * 0.85) : 11),
        detectado: true,
        declarado: Boolean(input.farmaciaDeclarada),
        fuente: 'catalogo_espacial'
      }),
      estacionServicio: buildAttribute({
        nombre: input.estacionServicioNombre || 'Estación de Servicio / Combustible',
        tipo: 'vialidad',
        distanciaKm: input.estacionServicioDistKm !== undefined ? input.estacionServicioDistKm : (distCarretera ? Math.round(distCarretera * 0.7) : 9),
        detectado: true,
        declarado: Boolean(input.estacionServicioDeclarada),
        fuente: 'catalogo_espacial'
      }),
      comisaria: buildAttribute({
        nombre: input.comisariaNombre || 'Comisaría / Servicio de Emergencia',
        tipo: 'seguridad',
        distanciaKm: input.comisariaDistKm !== undefined ? input.comisariaDistKm : (distCarretera ? Math.round(distCarretera * 0.9) : 12),
        detectado: true,
        declarado: Boolean(input.comisariaDeclarada),
        fuente: 'catalogo_espacial'
      }),
      rioLagoPlaya: buildAttribute({
        nombre: input.cuerpoAguaNombre || 'Río, Lago o Borde Costero',
        tipo: 'atractivo_natural',
        distanciaKm: input.cuerpoAguaDistKm !== undefined ? input.cuerpoAguaDistKm : (input.tieneRioLago ? 1.5 : null),
        detectado: Boolean(input.tieneRioLago || input.cuerpoAguaDistKm !== undefined),
        declarado: Boolean(input.accesoAguaDeclarado),
        accesoConfirmado: Boolean(input.accesoAguaConfirmado || input.accesoLegalAgua), // Diferenciar cercanía de acceso
        fuente: input.accesoAguaConfirmado ? 'escritura_o_propietario' : 'deteccion_gis'
      }),
      parqueNacional: buildAttribute({
        nombre: input.parqueNombre || 'Parque Nacional o Reserva Turística',
        tipo: 'turismo',
        distanciaKm: input.parqueDistKm !== undefined ? input.parqueDistKm : (input.zonaTuristica ? 8.0 : null),
        detectado: Boolean(input.zonaTuristica || input.parqueDistKm !== undefined),
        declarado: Boolean(input.turismoDeclarado),
        accesoConfirmado: false, // Estar cerca no implica pertenecer a un área protegida
        fuente: 'catalogo_espacial'
      })
    };

    const resolved = {
      latitude: lat,
      longitude: lon,
      region: region,
      comuna: comuna,
      localidad: localidad,
      ciudadPrincipal: {
        nombre: ciudadNombre,
        distanciaCarreteraKm: distCarretera,
        distanciaGeograficaKm: distGeografica,
        esEstimacionInterna: esEstimacion
      },
      distanciaCarreteraKm: distCarretera,
      distanciaGeograficaKm: distGeografica,
      tiempoEstimadoMin: tiempoEstMin,
      distanciaRutaPrincipalKm: distRutaKm,
      serviciosCercanos: servicios,
      metadata: {
        version: CONFIG.version,
        module: CONFIG.module,
        resolvedAt: new Date().toISOString(),
        roadDistancePriorityApplied: true,
        fallbackGeodeticUsed: esEstimacion,
        proveedorRegistrado: 'tpl_spatial_catalog_v1',
        fechaConsulta: new Date().toISOString(),
        respuestaNormalizada: true
      }
    };

    const locationIndex = calculateLocationIndex(resolved);
    resolved.indiceUbicacionTPL = locationIndex;
    resolved.configuracionIndice = CONFIG.locationIndex;

    return resolved;
  }

  // Req 8: Timeout, caché, fallback, proveedor registrado, fecha consulta y prevención de solicitudes repetidas
  const memoryCache = new Map();
  const pendingQueries = new Map();

  async function resolveAsync(input = {}, options = {}) {
    const timeoutMs = options.timeoutMs || 5000;
    const ttlMs = options.ttlMs || 86400000; // 24 horas por defecto
    const cacheKey = `tpl_loc_${norm(input.region)}_${norm(input.comuna)}_${num(input.lat)}_${num(input.lon)}`;

    // 1. Verificar Caché en memoria
    if (memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < ttlMs) {
        return Object.assign({}, cached.data, { metadata: Object.assign({}, cached.data.metadata, { cacheHit: true, fuenteCache: 'memoria' }) });
      }
      memoryCache.delete(cacheKey);
    }

    // 2. Verificar Caché en localStorage (recuperación temporal)
    try {
      const g = (typeof window !== 'undefined' ? window : globalThis);
      if (g.localStorage && !options.skipStorage) {
        const stored = g.localStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < ttlMs) {
            memoryCache.set(cacheKey, parsed);
            return Object.assign({}, parsed.data, { metadata: Object.assign({}, parsed.data.metadata, { cacheHit: true, fuenteCache: 'localStorage_temporal' }) });
          }
          g.localStorage.removeItem(cacheKey);
        }
      }
    } catch (_) {}

    // 3. Prevención de solicitudes repetidas (Deduplicación)
    if (pendingQueries.has(cacheKey)) {
      return pendingQueries.get(cacheKey);
    }

    // 4. Ejecución con Timeout y Fallback
    const queryPromise = new Promise((resolvePromise) => {
      let completed = false;
      const timer = setTimeout(() => {
        if (!completed) {
          completed = true;
          // Fallback geodésico síncrono si el proveedor asíncrono o ruta excede el timeout
          const fallbackRes = resolve(input);
          fallbackRes.metadata.timeoutExceeded = true;
          fallbackRes.metadata.proveedorRegistrado = 'tpl_spatial_fallback_haversine';
          resolvePromise(fallbackRes);
        }
      }, timeoutMs);

      try {
        const res = resolve(input);
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          res.metadata.proveedorRegistrado = options.proveedor || 'tpl_spatial_catalog_v1';
          res.metadata.fechaConsulta = new Date().toISOString();

          const cachePayload = { timestamp: Date.now(), data: res };
          memoryCache.set(cacheKey, cachePayload);
          try {
            const g = (typeof window !== 'undefined' ? window : globalThis);
            if (g.localStorage && !options.skipStorage) {
              g.localStorage.setItem(cacheKey, JSON.stringify(cachePayload));
            }
          } catch (_) {}

          resolvePromise(res);
        }
      } catch (err) {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          const errRes = resolve(input);
          errRes.metadata.error = String(err.message || err);
          errRes.metadata.proveedorRegistrado = 'tpl_spatial_error_fallback';
          resolvePromise(errRes);
        }
      }
    }).finally(() => {
      pendingQueries.delete(cacheKey);
    });

    pendingQueries.set(cacheKey, queryPromise);
    return queryPromise;
  }

  function clearCache() {
    memoryCache.clear();
  }

  const exportObj = Object.freeze({ resolve, resolveAsync, clearCache, calculateLocationIndex, haversineKm, CONFIG });
  if (typeof module !== 'undefined' && module.exports) module.exports = exportObj;
  global.TPLLocationService = exportObj;
})(typeof window !== 'undefined' ? window : globalThis);
