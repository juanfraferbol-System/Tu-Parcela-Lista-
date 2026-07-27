/**
 * TPL VALUATION CONFIG (Agregador Modular y SSOT de Parametrización)
 * Módulo central que agrega todas las reglas de tasación, tramos, tarifas base,
 * factores de mercado y premios comerciales para el ecosistema Tu Parcela Lista.
 * REGLA ARQUITECTÓNICA: Los porcentajes se encuentran en estado CALIBRACION_INICIAL
 * y disponen de metadatos de trazabilidad.
 */

import { TPL_LAND_RULES } from './tpl-land-rules.mjs';
import { TPL_HOUSE_RULES } from './tpl-house-rules.mjs';
import { TPL_DISTANCE_RULES } from './tpl-distance-rules.mjs';
import { TPL_MARKET_RULES } from './tpl-market-rules.mjs';
import { TPL_COMMERCIAL_PREMIUMS } from './tpl-commercial-premiums.mjs';

export const TPL_VALUATION_CONFIG = {
  version: "2026-Q3-param-v2",
  status: "CALIBRACION_INICIAL",
  lastUpdated: "2026-07-26",
  description: "Configuración agregadoraizada de reglas de tasación TPL con trazabilidad completa",

  // Módulos especializados importados
  landRules: TPL_LAND_RULES,
  houseRules: TPL_HOUSE_RULES,
  distanceRules: TPL_DISTANCE_RULES,
  marketRules: TPL_MARKET_RULES,
  commercialPremiums: TPL_COMMERCIAL_PREMIUMS,

  /**
   * Helper para obtener de forma segura el valor numérico de una regla con metadatos.
   * Respeta el flag enabled: si enabled === false, retorna 0.
   */
  getRuleValue(ruleObj) {
    if (!ruleObj) return 0;
    if (ruleObj.enabled === false) return 0;
    if (typeof ruleObj.value === "number") return ruleObj.value;
    if (typeof ruleObj.pct === "number") return ruleObj.pct;
    return 0;
  },

  /**
   * Helper para verificar si una regla específica requiere calibración futura con datos reales.
   */
  requiresCalibration(ruleObj) {
    if (!ruleObj) return false;
    return Boolean(ruleObj.requiresCalibration);
  }
};

if (typeof globalThis !== "undefined") {
  globalThis.TPL_VALUATION_CONFIG = TPL_VALUATION_CONFIG;
}
