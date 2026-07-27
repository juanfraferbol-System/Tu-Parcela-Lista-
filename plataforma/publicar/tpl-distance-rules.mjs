/**
 * TPL DISTANCE RULES MODULE
 * Módulo de tramos de cercanía urbana y accesibilidad vial de Tu Parcela Lista.
 * REGLA ARQUITECTÓNICA: Los literales han sido normalizados a su intención original
 * (+50%, +30%, etc.) para eliminar el error de escala del código heredado.
 * Todos los porcentajes se encuentran en estado CALIBRACION_INICIAL y parametrizados.
 */

export const TPL_DISTANCE_RULES = {
  module: "tpl-distance-rules",
  version: "1.0.0",
  status: "CALIBRACION_INICIAL",
  lastUpdated: "2026-07-26",

  // Tramos de cercanía a ciudad cabecera o conurbación (Normalizados a intención original)
  urbanProximityBands: [
    { maxKm: 10, pct: 0.50, label: "0 a 10 km", id: "dist_urb_0_10", version: "1.0.0", description: "Plusvalía inmediata por contigüidad urbana metropolitana o regional", origin: "normalizacion_escala_literal_5", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: 20, pct: 0.30, label: "10 a 20 km", id: "dist_urb_10_20", version: "1.0.0", description: "Plusvalía por primera corona periurbana residencial", origin: "normalizacion_escala_literal_3", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: 30, pct: 0.15, label: "20 a 30 km", id: "dist_urb_20_30", version: "1.0.0", description: "Plusvalía por segunda corona periurbana de conmutación", origin: "normalizacion_escala_literal_1_5", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: 40, pct: 0.10, label: "30 a 40 km", id: "dist_urb_30_40", version: "1.0.0", description: "Plusvalía por conectividad regional directa", origin: "normalizacion_escala_literal_1", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: 50, pct: 0.09, label: "40 a 50 km", id: "dist_urb_40_50", version: "1.0.0", description: "Plusvalía por accesibilidad agro-residencial media", origin: "normalizacion_escala_literal_0_9", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: 60, pct: 0.05, label: "50 a 60 km", id: "dist_urb_50_60", version: "1.0.0", description: "Plusvalía moderada por cercanía a cabeceras provinciales", origin: "normalizacion_escala_literal_0_5", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: 80, pct: 0.02, label: "60 a 80 km", id: "dist_urb_60_80", version: "1.0.0", description: "Plusvalía mínima en límite de área de influencia", origin: "normalizacion_escala_literal_0_2", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: Infinity, pct: 0.00, label: "Más de 80 km", id: "dist_urb_80_inf", version: "1.0.0", description: "Zona rural profunda sin factor aditivo de proximidad urbana", origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: false, enabled: true }
  ],

  // Tramos de distancia a ruta principal asfaltada o pavimento directo
  routeAccessibilityBands: [
    { maxKm: 5, pct: 0.00, label: "0 a 5 km (Frente a ruta o pavimento directo)", id: "dist_rte_0_5", version: "1.0.0", description: "Acceso inmediato sin castigo de penetración rural", origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: false, enabled: true },
    { maxKm: 10, pct: -0.10, label: "6 a 10 km por camino interior", id: "dist_rte_6_10", version: "1.0.0", description: "Castigo leve por penetración en camino interior", origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: 20, pct: -0.15, label: "11 a 20 km por camino interior", id: "dist_rte_11_20", version: "1.0.0", description: "Castigo moderado por penetración intermedia", origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: 30, pct: -0.20, label: "21 a 30 km por camino interior", id: "dist_rte_21_30", version: "1.0.0", description: "Castigo apreciable por alejamiento de red vial principal", origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: 40, pct: -0.30, label: "31 a 40 km por camino interior", id: "dist_rte_31_40", version: "1.0.0", description: "Castigo severo por dificultad o tiempo de acceso vial", origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: 50, pct: -0.40, label: "41 a 50 km por camino interior", id: "dist_rte_41_50", version: "1.0.0", description: "Castigo por aislamiento vial considerable", origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: 60, pct: -0.50, label: "51 a 60 km por camino interior", id: "dist_rte_51_60", version: "1.0.0", description: "Castigo por alto aislamiento rural interior", origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    { maxKm: Infinity, pct: -0.60, label: "Más de 60 km adentro (Tope máximo)", id: "dist_rte_60_inf", version: "1.0.0", description: "Tope máximo de castigo vial por ruralidad extrema interior", origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true }
  ]
};

if (typeof globalThis !== "undefined") {
  globalThis.TPL_DISTANCE_RULES = TPL_DISTANCE_RULES;
}
