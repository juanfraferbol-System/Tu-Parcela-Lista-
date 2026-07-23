import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window=globalThis;
await import('./house-valuation.js');

test('la casa devuelve tres estrategias y audita cobertura',()=>{
  const result=globalThis.TPLHouseValuation.calculate({
    area:72,asking:45000000,material:'madera',quality:'buena',condition:'excelente',
    regularization:'recepcion final',year:2022,minutesToCenter:20,road:'pavimentado',
    insulation:'buena',windows:'termopanel',water:'pozo',sanitary:'fosa',
    heating:'combustion lenta',parking:2,bedrooms:3,bathrooms:2,floors:1,extras:['terraza']
  });
  assert.ok(result.quick<result.ideal);
  assert.ok(result.patient>result.ideal);
  assert.equal(result.method,'tpl-house-rules-pilot-v2');
  assert.ok(result.fieldCoverage.pct>=80);
});

test('la casa exige superficie y material',()=>{
  assert.match(globalThis.TPLHouseValuation.calculate({area:0}).error,/superficie/i);
  assert.match(globalThis.TPLHouseValuation.calculate({area:60}).error,/material/i);
});
