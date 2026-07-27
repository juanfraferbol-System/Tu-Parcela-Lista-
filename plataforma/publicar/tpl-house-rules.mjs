/**
 * TPL HOUSE RULES MODULE
 * Módulo de reglas y tarifas de construcción y viviendas para Tu Parcela Lista.
 * Incluye metadatos de trazabilidad e Índice de Densidad Sanitaria.
 */

export const TPL_HOUSE_RULES = {
  module: "tpl-house-rules",
  version: "1.0.0",
  status: "CALIBRACION_INICIAL",
  lastUpdated: "2026-07-26",

  baseM2: {
    madera: { id: "house_base_madera", version: "1.0.0", description: "Costo base m2 construcción madera tratada", value: 520000, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    metalcon: { id: "house_base_metalcon", version: "1.0.0", description: "Costo base m2 construcción acero galvanizado (Metalcon)", value: 600000, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    sip: { id: "house_base_sip", version: "1.0.0", description: "Costo base m2 construcción paneles térmicos SIP", value: 650000, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    albanileria: { id: "house_base_albanileria", version: "1.0.0", description: "Costo base m2 construcción albañilería confinada", value: 720000, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    hormigon: { id: "house_base_hormigon", version: "1.0.0", description: "Costo base m2 construcción hormigón armado", value: 820000, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    mixta: { id: "house_base_mixta", version: "1.0.0", description: "Costo base m2 construcción estructura mixta", value: 680000, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true }
  },

  quality: {
    economica: { id: "house_qual_econ", version: "1.0.0", description: "Calidad económica / terminaciones básicas", value: -0.10, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    estandar: { id: "house_qual_std", version: "1.0.0", description: "Calidad estándar corriente", value: 0.00, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: false, enabled: true },
    buena: { id: "house_qual_good", version: "1.0.0", description: "Calidad superior buena", value: 0.07, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    premium: { id: "house_qual_prem", version: "1.0.0", description: "Calidad de lujo / premium", value: 0.15, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true }
  },

  condition: {
    nueva: { id: "house_cond_new", version: "1.0.0", description: "Vivienda nueva a estrenar", value: 0.06, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    excelente: { id: "house_cond_exc", version: "1.0.0", description: "Vivienda en estado excelente sin desgaste", value: 0.04, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    "muy buena": { id: "house_cond_vgood", version: "1.0.0", description: "Vivienda muy bien mantenida", value: 0.02, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    buena: { id: "house_cond_good", version: "1.0.0", description: "Vivienda con desgaste normal de uso", value: 0.00, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: false, enabled: true },
    "necesita mejoras": { id: "house_cond_improv", version: "1.0.0", description: "Vivienda que requiere reparaciones menores", value: -0.10, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    "para remodelar": { id: "house_cond_remod", version: "1.0.0", description: "Vivienda con deterioro considerable para remodelación", value: -0.22, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true }
  },

  regularization: {
    "recepcion final": { id: "house_reg_total", version: "1.0.0", description: "Recepción municipal final otorgada y conforme", value: 0.04, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    "totalmente regularizada": { id: "house_reg_full", version: "1.0.0", description: "Regularización municipal total completa", value: 0.04, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    "regularizada parcialmente": { id: "house_reg_part", version: "1.0.0", description: "Superficie original con recepción, ampliaciones sin inscribir", value: -0.04, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    "en tramite": { id: "house_reg_proc", version: "1.0.0", description: "Carpeta en trámite en Dirección de Obras", value: -0.07, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    "sin regularizar": { id: "house_reg_none", version: "1.0.0", description: "Construcción informal no inscrita", value: -0.15, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    "no lo se": { id: "house_reg_unk", version: "1.0.0", description: "Estado de regularización desconocido", value: -0.05, origin: "codigo_heredado_house_val", confidenceLevel: "media", requiresCalibration: true, enabled: true }
  },

  sanitary: {
    "alcantarillado o fosa normalizada": { id: "house_san_ok", version: "1.0.0", description: "Alcantarillado público o fosa séptica con resolución SESMA/Seremi", value: 0.04, origin: "propuesta_integracion_huerfanas", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    "fosa informal o pozo negro": { id: "house_san_informal", version: "1.0.0", description: "Sistema de descarga artesanal sin resolución sanitaria", value: -0.18, origin: "propuesta_integracion_huerfanas", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    "sin sistema": { id: "house_san_none", version: "1.0.0", description: "Sin descarga sanitaria operativa", value: -0.25, origin: "propuesta_integracion_huerfanas", confidenceLevel: "alta", requiresCalibration: true, enabled: true }
  },

  waterSupply: {
    "red publica o apr": { id: "house_wat_ok", version: "1.0.0", description: "Agua potable de red sanitaria o APR conectada a la casa", value: 0.04, origin: "propuesta_integracion_huerfanas", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    "pozo propio profundo": { id: "house_wat_well", version: "1.0.0", description: "Agua de pozo profundo presurizada interior", value: 0.02, origin: "propuesta_integracion_huerfanas", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    "camion aljibe o precario": { id: "house_wat_none", version: "1.0.0", description: "Abastecimiento exterior por camión aljibe o estanque no presurizado", value: -0.12, origin: "propuesta_integracion_huerfanas", confidenceLevel: "alta", requiresCalibration: true, enabled: true }
  },

  sanitaryDensityThreshold: { id: "house_dens_thresh", version: "1.0.0", description: "Ratio mínimo aceptable de Baños por Dormitorio", value: 0.35, origin: "propuesta_integracion_huerfanas", confidenceLevel: "media", requiresCalibration: true, enabled: true },
  sanitaryDensityDiscountPct: { id: "house_dens_disc", version: "1.0.0", description: "Castigo por déficit sanitario (ej. 4 dorms con 1 baño)", value: -0.06, origin: "propuesta_integracion_huerfanas", confidenceLevel: "media", requiresCalibration: true, enabled: true },
  maxPositive: { id: "house_max_pos", version: "1.0.0", description: "Tope máximo acumulado de bonificaciones en casa", value: 0.35, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: false, enabled: true },
  maxNegative: { id: "house_max_neg", version: "1.0.0", description: "Tope máximo acumulado de castigos en casa", value: -0.55, origin: "codigo_heredado_house_val", confidenceLevel: "alta", requiresCalibration: false, enabled: true }
};

if (typeof globalThis !== "undefined") {
  globalThis.TPL_HOUSE_RULES = TPL_HOUSE_RULES;
}
