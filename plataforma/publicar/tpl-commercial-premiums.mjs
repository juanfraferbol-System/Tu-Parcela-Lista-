/**
 * TPL COMMERCIAL PREMIUMS MODULE
 * Módulo de premios comerciales externos (turismo, río, lago) de Tu Parcela Lista.
 * REGLA ARQUITECTÓNICA: tourismNational normalizado a 0.30 (+30%) desde el error de escala antiguo (3.00).
 * Incluye metadatos de trazabilidad y estado de calibración según directiva arquitectónica.
 */

export const TPL_COMMERCIAL_PREMIUMS = {
  module: "tpl-commercial-premiums",
  version: "1.0.0",
  status: "CALIBRACION_INICIAL",
  lastUpdated: "2026-07-26",

  premiums: {
    tourismNational: { id: "prem_tour_nat", version: "1.0.0", description: "Bono por ubicación en zona turística de relevancia nacional/internacional", value: 0.30, origin: "normalizacion_escala_literal_3", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    tourismLocal: { id: "prem_tour_loc", version: "1.0.0", description: "Bono por ubicación en zona turística de atractivo local/regional", value: 0.20, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    riverAccess: { id: "prem_river", version: "1.0.0", description: "Bono por colindancia directo a río o curso fluvial permanente", value: 0.10, origin: "codigo_heredado_validado", confidenceLevel: "alta", requiresCalibration: true, enabled: true },
    lakeAccess: { id: "prem_lake", version: "1.0.0", description: "Bono por colindancia o acceso directo garantizado a lago navegable", value: 0.12, origin: "propuesta_integracion_huerfanas", confidenceLevel: "media", requiresCalibration: true, enabled: true }
  }
};

if (typeof globalThis !== "undefined") {
  globalThis.TPL_COMMERCIAL_PREMIUMS = TPL_COMMERCIAL_PREMIUMS;
}
