(() => {
  'use strict';
  const RULES = Object.freeze({
    tourismNational: 3,
    tourismLocal: 0.20,
    riverAccess: 0.10
  });
  function calculate(baseValue, { tourism = '', riverAccess = false } = {}) {
    const base = Math.max(0, Number(baseValue) || 0);
    const tourismPct = tourism === 'nacional' ? RULES.tourismNational
      : tourism === 'local' ? RULES.tourismLocal : 0;
    const afterTourism = Math.round(base * (1 + tourismPct));
    const riverPct = riverAccess ? RULES.riverAccess : 0;
    return {
      base,
      total: Math.round(afterTourism * (1 + riverPct)),
      tourism: { type: tourism || 'none', pct: tourismPct, applied: tourismPct > 0 },
      riverAccess: { pct: riverPct, applied: riverPct > 0 },
      order: ['tourism', 'river_access']
    };
  }
  window.TPLValuationPremiums = Object.freeze({ RULES, calculate });
})();
