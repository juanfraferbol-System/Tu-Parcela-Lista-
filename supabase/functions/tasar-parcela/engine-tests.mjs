import assert from 'node:assert/strict';
import {calculateValuation,haversineKm,materialInput,propertyIdentityInput} from './engine.mjs';

const subject={region:'Biobío',comuna:'Nacimiento',sector:'Nahuelbuta',superficie_m2:5000,lat:-37.5,lng:-72.7,acceso:'Ripio',agua:'Pozo',luz:'Cercana',topografia:'Mixta',precio_ingresado:18000000};
const records=[
 {id:'1',region:'Biobío',comuna:'Nacimiento',sector:'A',superficie_m2:5000,precio:10000000,lat:-37.51,lng:-72.71,fuente_tipo:'precio_publicado_solicitado',fecha:'2026-06-01'},
 {id:'2',region:'Biobío',comuna:'Nacimiento',sector:'B',superficie_m2:6000,precio:15000000,lat:-37.52,lng:-72.72,fuente_tipo:'precio_publicado_solicitado',fecha:'2026-05-01'},
 {id:'3',region:'Biobío',comuna:'Nacimiento',sector:'C',superficie_m2:4000,precio:12000000,lat:-37.53,lng:-72.73,fuente_tipo:'precio_final_declarado',fecha:'2026-04-01'},
 {id:'4',region:'Biobío',comuna:'Yumbel',sector:'D',superficie_m2:5000,precio:40000000,lat:-37.1,lng:-72.5,fuente_tipo:'precio_publicado_solicitado',fecha:'2026-03-01'},
 {id:'duplicate',region:'Biobío',comuna:'Nacimiento',sector:'Proyecto repetido',superficie_m2:5000,precio:11000000,lat:-37.51001,lng:-72.71001,fuente_tipo:'precio_publicado_solicitado',fecha:'2026-01-01'}
];
const config={comparables_minimos:3,comparables_maximos:15,cobertura_suficiente_desde:12,cobertura_limitada_desde:6,antiguedad_maxima_dias:1095,distancia_maxima_km:150,superficie_relacion_minima:.25};
const result=calculateValuation(subject,records,config,new Date('2026-07-17'));
assert.equal(result.status,'generated');
assert.equal(result.coverage,'experimental');
assert.equal(result.confidence,'baja');
assert.ok(result.range.minimum<=result.range.market);
assert.ok(result.range.market<=result.range.maximum);
assert.ok(result.comparables.length>=3);
const otherPrice=calculateValuation({...subject,precio_ingresado:90000000},records,config,new Date('2026-07-17'));
assert.equal(otherPrice.range.market,result.range.market);
assert.notEqual(otherPrice.difference,result.difference);
const insufficient=calculateValuation({...subject,region:'Región sin datos',comuna:'Comuna sin datos'},records,config,new Date('2026-07-17'));
assert.equal(insufficient.status,'insufficient');
assert.equal(insufficient.range.market,null);
assert.match(insufficient.cautions.join(' '),/No se inventó/);
assert.ok(haversineKm({lat:-37.5,lng:-72.7},{lat:-37.51,lng:-72.71})>0);
assert.deepEqual(Object.keys(materialInput(subject)).sort(),Object.keys(materialInput(subject)).sort());
assert.notDeepEqual(materialInput(subject),propertyIdentityInput(subject));
console.log('OK: mediana ponderada, cobertura, insuficiencia y precio ingresado independiente.');
