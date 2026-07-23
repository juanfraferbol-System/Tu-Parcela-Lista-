import assert from 'node:assert/strict';
import test from 'node:test';
import {calculateValuation,materialInput} from './engine.mjs';

const records=[
  {id:'1',region:'Región de La Araucanía',comuna:'Pucón',sector:'A',superficie_m2:5000,precio:20000000,fuente_tipo:'precio_publicado_solicitado',actualizado_en:'2026-07-01'},
  {id:'2',region:'Región de La Araucanía',comuna:'Pucón',sector:'B',superficie_m2:5200,precio:23000000,fuente_tipo:'precio_final_declarado',actualizado_en:'2026-06-01'},
  {id:'3',region:'Región de La Araucanía',comuna:'Villarrica',sector:'C',superficie_m2:4800,precio:19000000,fuente_tipo:'precio_publicado_solicitado',actualizado_en:'2026-05-01'}
];
const parameters={comparables_minimos:3,comparables_maximos:15,antiguedad_maxima_dias:1095,distancia_maxima_km:150,superficie_relacion_minima:.25};
const base={region:'Región de La Araucanía',comuna:'Pucón',sector:'Caburgua',superficie_m2:5000,precio_ingresado:30000000,acceso:'ripio',topografia:'plana',agua:'pozo',luz:'factibilidad'};

test('genera una tasación con comparables válidos',()=>{
  const result=calculateValuation(base,records,parameters,new Date('2026-07-23'));
  assert.equal(result.status,'generated');
  assert.ok(result.range.market>0);
  assert.equal(result.comparableCount,3);
});

test('aplica turismo nacional y luego acceso a río',()=>{
  const normal=calculateValuation(base,records,parameters,new Date('2026-07-23'));
  const premium=calculateValuation({...base,zona_turistica:'nacional',acceso_rio:true},records,parameters,new Date('2026-07-23'));
  assert.equal(premium.range.market,Math.round(normal.range.market*4*1.1/10000)*10000);
  assert.equal(materialInput({...base,zona_turistica:'local',acceso_rio:true}).zona_turistica,'local');
});

test('no inventa valor cuando faltan comparables',()=>{
  const result=calculateValuation(base,records.slice(0,1),parameters,new Date('2026-07-23'));
  assert.equal(result.status,'insufficient');
  assert.equal(result.range.market,null);
});
