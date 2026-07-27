/**
 * TPL LAND RULES MODULE
 * Módulo de reglas y tarifas para terrenos de Tu Parcela Lista.
 * Incluye metadatos de trazabilidad y estado de calibración según directiva arquitectónica.
 */

export const TPL_LAND_RULES = {
  module: "tpl-land-rules",
  version: "1.0.0",
  status: "CALIBRACION_INICIAL",
  lastUpdated: "2026-07-26",

  surfacePricing: {
    upTo7000M2: { id: "land_price_tier1", version: "1.0.0", description: "Tarifa base m2 para superficies menores a 7.000 m2", value: 2000, origin: "codigo_heredado_app_js", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    from7001To10000M2: { id: "land_price_tier2", version: "1.0.0", description: "Tarifa base m2 para superficies de 7.001 a 10.000 m2", value: 1000, origin: "codigo_heredado_app_js", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    from10001To20000M2: { id: "land_price_tier3", version: "1.0.0", description: "Tarifa base m2 para superficies de 10.001 a 20.000 m2", value: 500, origin: "codigo_heredado_app_js", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    from20001To40000M2: { id: "land_price_tier4", version: "1.0.0", description: "Tarifa base m2 para superficies de 20.001 a 40.000 m2", value: 250, origin: "codigo_heredado_app_js", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    above40000M2: { id: "land_price_tier5", version: "1.0.0", description: "Tarifa base m2 para superficies mayores a 40.000 m2", value: 400, origin: "codigo_heredado_app_js", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    largeLandThresholdM2: { id: "land_threshold_large", version: "1.0.0", description: "Umbral para considerar macro-lote o paño de absorción", value: 40000, origin: "codigo_heredado_app_js", confidenceLevel: "alta", requiresCalibration: false, enabled: true },
    largeLandDiscountPct: { id: "land_discount_large", version: "1.0.0", description: "Descuento por volumen en macro-lote", value: -0.30, origin: "codigo_heredado_app_js", confidenceLevel: "alta", requiresCalibration: true, enabled: true }
  },

  directAdjustments: {
    // Electricidad
    electricConnected: { id: "adj_elec_connected", version: "1.0.0", description: "Empalme eléctrico instalado y operativo", value: 0.15, origin: "normalizacion_escala_agua_luz", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    electricFeasible: { id: "adj_elec_feasible", version: "1.0.0", description: "Factibilidad eléctrica comprobable", value: 0.12, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    electricUnavailable: { id: "adj_elec_unavailable", version: "1.0.0", description: "Sin factibilidad eléctrica cercana", value: -0.12, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    
    // Agua (Integrada)
    waterConnected: { id: "adj_water_connected", version: "1.0.0", description: "Agua conectada (APR o pozo profundo propio)", value: 0.15, origin: "propuesta_integracion_huerfanas", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    waterFeasible: { id: "adj_water_feasible", version: "1.0.0", description: "Factibilidad de agua o pozo superficial", value: 0.08, origin: "propuesta_integracion_huerfanas", confidenceLevel: "media", requiresCalibration: true, enabled: true },
    waterUnavailable: { id: "adj_water_unavailable", version: "1.0.0", description: "Sin agua / camión aljibe", value: -0.15, origin: "propuesta_integracion_huerfanas", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    
    // Topografía (Integrada)
    topographyFlat: { id: "adj_topo_flat", version: "1.0.0", description: "Topografía plana o lomaje suave", value: 0.00, origin: "propuesta_integracion_huerfanas", confidenceLevel: "alta", requiresCalibration: false, enabled: true },
    topographyModerate: { id: "adj_topo_mod", version: "1.0.0", description: "Pendiente moderada aprovechable", value: -0.10, origin: "propuesta_integracion_huerfanas", confidenceLevel: "media", requiresCalibration: true, enabled: true },
    topographySteep: { id: "adj_topo_steep", version: "1.0.0", description: "Topografía escarpada o quebrada fuerte", value: -0.15, origin: "propuesta_integracion_huerfanas", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    
    // Atributos y Naturaleza
    nativeForest: { id: "adj_nat_forest", version: "1.0.0", description: "Bosque nativo maduro o conservado", value: 0.20, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    fruitTrees: { id: "adj_fruit_trees", version: "1.0.0", description: "Árboles frutales en producción", value: 0.25, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    forestryPlantation: { id: "adj_forest_plant", version: "1.0.0", description: "Plantación forestal comercial (pino/eucaliptus)", value: -0.05, origin: "codigo_heredado_validado", confidenceLevel: "media", requiresCalibration: true, enabled: true },
    panoramicView: { id: "adj_view_pano", version: "1.0.0", description: "Vista panorámica destacada", value: 0.06, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    springWater: { id: "adj_water_spring", version: "1.0.0", description: "Vertiente o estero natural en el predio", value: 0.04, origin: "codigo_heredado_validado", confidenceLevel: "media", requiresCalibration: true, enabled: true }
  }
};

if (typeof globalThis !== "undefined") {
  globalThis.TPL_LAND_RULES = TPL_LAND_RULES;
}
