(() => {
  'use strict';
  
  function getRule(key, fallbackVal, fallbackId, fallbackDesc) {
    const config = window.TPL_VALUATION_CONFIG;
    if (config && config.commercialPremiums && config.commercialPremiums.premiums && config.commercialPremiums.premiums[key]) {
      return config.commercialPremiums.premiums[key];
    }
    return {
      id: fallbackId,
      version: "1.0.0-fallback",
      description: fallbackDesc,
      value: fallbackVal,
      origin: "fallback_seguro",
      confidenceLevel: "alta",
      requiresCalibration: true,
      enabled: true
    };
  }

  function getRuleValue(ruleObj) {
    if (!ruleObj || ruleObj.enabled === false) return 0;
    return typeof ruleObj.value === 'number' ? ruleObj.value : (typeof ruleObj.pct === 'number' ? ruleObj.pct : 0);
  }

  const RULES = {
    get tourismNational() { return getRuleValue(getRule('tourismNational', 0.30, 'prem_tour_nat', 'Bono turismo nacional normalizado')); },
    get tourismLocal() { return getRuleValue(getRule('tourismLocal', 0.20, 'prem_tour_loc', 'Bono turismo local')); },
    get riverAccess() { return getRuleValue(getRule('riverAccess', 0.10, 'prem_river', 'Bono acceso río')); },
    get lakeAccess() { return getRuleValue(getRule('lakeAccess', 0.12, 'prem_lake', 'Bono acceso lago')); }
  };

  function calculate(baseValue, { tourism = '', riverAccess = false, lakeAccess = false } = {}) {
    const base = Math.max(0, Number(baseValue) || 0);
    const tourismPct = tourism === 'nacional' ? RULES.tourismNational
      : tourism === 'local' ? RULES.tourismLocal : 0;
    const afterTourism = Math.round(base * (1 + tourismPct));
    const riverPct = riverAccess ? RULES.riverAccess : 0;
    const lakePct = lakeAccess ? RULES.lakeAccess : 0;
    return {
      base,
      total: Math.round(afterTourism * (1 + riverPct + lakePct)),
      tourism: { type: tourism || 'none', pct: tourismPct, applied: tourismPct > 0 },
      riverAccess: { pct: riverPct, applied: riverPct > 0 },
      lakeAccess: { pct: lakePct, applied: lakePct > 0 },
      order: ['tourism', 'river_access', 'lake_access']
    };
  }

  window.TPLValuationPremiums = Object.freeze({ RULES, calculate });
})();

