import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
require('./event-bus.js');
require('./property-model.js');
require('./intelligence-engine.js');
const orchestrator=require('./orchestrator.js');

const payload={
 version:'test',codigo:'TPL-TEST',
 propiedad:{tipo:'parcela',subtipo:'Parcela',superficieTerreno:5000,precio:25000000,titulo:'Parcela con excelente ubicación en Florida',descripcion:'Propiedad rural con acceso expedito, naturaleza y condiciones apropiadas para desarrollar un proyecto familiar o de inversión.'},
 ubicacion:{lat:-36.8,lng:-72.6},documentacion:{rol:'Sí'},servicios:{agua:'Pozo',electricidad:'Disponible'},
 contacto:{tipo:'propietario',nombre:'Prueba',telefono:'+56911111111',email:'test@example.com'},
 comercial:{urgencia:'alta',urgenciaPuntaje:70},plan:{id:'prop_fuerte',recomendado:'prop_fuerte',coincideConUrgencia:true},
 medios:{cantidadFotos:8},integraciones:{flow:{requerido:true}}
};
const result=orchestrator.preparePublication(payload,{source:'test'});
assert.equal(result.schemaVersion,'tpl-property-v1');
assert.equal(result.objetoMaestro.property.landArea,5000);
assert.ok(result.inteligencia.quality.score>=80);
assert.equal(result.inteligencia.commercialPriority.level,'Alta');
assert.ok(result.automatizaciones.proximasAcciones.some(x=>x.type==='CONFIRMAR_PAGO'));
console.log('Core 2.2 tests OK');
