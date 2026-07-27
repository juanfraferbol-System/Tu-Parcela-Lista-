/**
 * TPL MARKET RULES MODULE
 * Módulo de factores de mercado, certeza legal y obras civiles de Tu Parcela Lista.
 * Incluye metadatos de trazabilidad y estado de calibración según directiva arquitectónica.
 */

export const TPL_MARKET_RULES = {
  module: "tpl-market-rules",
  version: "1.0.0",
  status: "CALIBRACION_INICIAL",
  lastUpdated: "2026-07-26",

  // Factores globales y márgenes de negociación en el mercado
  marketFactors: {
    generalDiscountPct: { id: "mkt_gen_discount", version: "1.0.0", description: "Castigo estructural para absorber margen de negociación real vs publicación", value: -0.20, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    quickSaleDiscountPct: { id: "mkt_quick_sale", version: "1.0.0", description: "Descuento adicional por necesidad de liquidación o venta rápida urgente", value: -0.08, origin: "codigo_heredado_validado", confidenceLevel: "media", requiresCalibration: true, enabled: true },
    patientSalePremiumPct: { id: "mkt_patient_sale", version: "1.0.0", description: "Sobreprecio por venta paciente con holgura de tiempo", value: 0.09, origin: "codigo_heredado_validado", confidenceLevel: "media", requiresCalibration: true, enabled: true }
  },

  // Modificadores por certeza legal de la propiedad y tenencia
  legalStatusModifiers: {
    rolPropio: { id: "leg_rol_propio", version: "1.0.0", description: "Plusvalía por Rol propio individual inscrito en CBR", value: 0.10, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    rolEnTramite: { id: "leg_rol_tramite", version: "1.0.0", description: "Castigo por subdivisión o rol en trámite SAG/DOM", value: -0.20, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    cesionDerechos: { id: "leg_cesion", version: "1.0.0", description: "Castigo severo por cesión de derechos no delimitados", value: -0.50, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    condominio: { id: "leg_condominio", version: "1.0.0", description: "Plusvalía por pertenencia a loteo organizado o condominio", value: 0.10, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true }
  },

  // Modificadores por infraestructura y obras civiles de acceso/cierre
  infrastructureModifiers: {
    perimeterFencing: { id: "inf_fence", version: "1.0.0", description: "Plusvalía por cierre perimetral completo 100%", value: 0.05, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    accessGate: { id: "inf_gate", version: "1.0.0", description: "Plusvalía por portón de acceso individual o común", value: 0.03, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    internalRoads: { id: "inf_roads", version: "1.0.0", description: "Plusvalía por caminos interiores compactados en buen estado", value: 0.03, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    legalAccessPublic: { id: "inf_acc_pub", version: "1.0.0", description: "Plusvalía por colindancia directa con camino público oficial", value: 0.04, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    legalAccessServitude: { id: "inf_acc_serv", version: "1.0.0", description: "Acceso por servidumbre de tránsito legalmente inscrita", value: 0.00, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: false, enabled: true },
    legalAccessInformal: { id: "inf_acc_inf", version: "1.0.0", description: "Castigo severo por acceso de hecho informal sin servidumbre inscrita", value: -0.30, origin: "propuesta_integracion_huerfanas", confidenceLevel: "alta", requiresCalibration: true, enabled: true }
  }
};

if (typeof globalThis !== "undefined") {
  globalThis.TPL_MARKET_RULES = TPL_MARKET_RULES;
}
