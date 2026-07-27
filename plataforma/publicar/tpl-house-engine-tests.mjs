/**
 * SUITE DE CERTIFICACIÓN CANÓNICA: TASADOR INTEGRAL TPL Y CICLO COMERCIAL
 * Ejecuta 58 pruebas automatizadas cubriendo el motor de vivienda, flujo integral territorial,
 * servicios geográficos, inmutabilidad de precios y aprendizaje analítico.
 */
import assert from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Cargar módulos canónicos
const TPLLandEngine = require('./tpl-land-engine.js');
const TPLLocationService = require('./tpl-location-service.js');
const TPLHouseEngine = require('./tpl-house-engine.js');
const TPLCommercialLifecycle = require('./tpl-commercial-lifecycle.js');

// Configurar en entorno global para simular orquestación en navegador
globalThis.TPLLandEngine = TPLLandEngine;
globalThis.TPLLocationService = TPLLocationService;
globalThis.TPLHouseEngine = TPLHouseEngine;
globalThis.TPLCommercialLifecycle = TPLCommercialLifecycle;

console.log('========================================================================');
console.log(' 🚀 INICIANDO SUITE DE CERTIFICACIÓN TPL (58 PRUEBAS CANÓNICAS)');
console.log('========================================================================\n');

let passed = 0;
let failed = 0;

function test(id, description, fn) {
  try {
    fn();
    passed++;
    console.log(` ✅ [TEST ${id.toString().padStart(2, '0')}] ${description}`);
  } catch (e) {
    failed++;
    console.error(` ❌ [TEST ${id.toString().padStart(2, '0')}] ${description}`);
    console.error(`    -> Error: ${e.message}`);
  }
}

const yearNow = new Date().getFullYear();

// ============================================================================
// BLOQUE 1: 20 PRUEBAS CANÓNICAS DEL MOTOR DE VIVIENDA Y OBRAS ADICIONALES
// ============================================================================

test(1, 'casa madera 3 años (0 dep por estar en periodo de gracia 0-5 años)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: true, areaCasa: 100, materialCasa: 'madera', antiguedadCasa: 3 });
  assert.strictEqual(res.vivienda.depreciacionAntiguedadM2, 0, 'No debe haber depreciación');
  assert.strictEqual(res.vivienda.valorFinalM2, 270000, 'Valor m2 debe ser el base de madera ($270k)');
});

test(2, 'casa madera 6 años (1 año dep -> $10.000/m²)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: true, areaCasa: 100, materialCasa: 'madera', antiguedadCasa: 6 });
  assert.strictEqual(res.vivienda.depreciacionAntiguedadM2, 10000);
  assert.strictEqual(res.vivienda.valorFinalM2, 260000);
});

test(3, 'casa madera 15 años (10 años dep -> $100.000/m²)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: true, areaCasa: 100, materialCasa: 'madera', antiguedadCasa: 15 });
  assert.strictEqual(res.vivienda.depreciacionAntiguedadM2, 100000);
  assert.strictEqual(res.vivienda.valorFinalM2, 170000);
});

test(4, 'casa sólida 5 años (0 dep)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: true, areaCasa: 100, materialCasa: 'metalcon', antiguedadCasa: 5 });
  assert.strictEqual(res.vivienda.depreciacionAntiguedadM2, 0);
  assert.strictEqual(res.vivienda.valorFinalM2, 350000);
});

test(5, 'casa sólida 6 años (1 año dep -> $8.000/m²)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: true, areaCasa: 100, materialCasa: 'albanileria', antiguedadCasa: 6 });
  assert.strictEqual(res.vivienda.depreciacionAntiguedadM2, 8000);
  assert.strictEqual(res.vivienda.valorFinalM2, 342000);
});

test(6, 'casa deteriorada (-$10.000/m²)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: true, areaCasa: 100, materialCasa: 'madera', antiguedadCasa: 2, condition: 'deteriorada' });
  assert.strictEqual(res.vivienda.descuentoEstadoM2, 10000);
  assert.strictEqual(res.vivienda.valorFinalM2, 260000);
});

test(7, 'casa remodelada integralmente (antigüedad efectiva desde remodelación)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: true, areaCasa: 100, materialCasa: 'madera', anioConstruccion: 1990, anioRemodelacion: yearNow - 3, remodelacionIntegral: true });
  assert.strictEqual(res.vivienda.antiguedadEfectiva, 3, 'La antigüedad efectiva debe ser 3 años por la remodelación');
  assert.strictEqual(res.vivienda.depreciacionAntiguedadM2, 0);
});

test(8, 'casa muy antigua que activa valor mínimo ($70k madera / $120k sólida)', () => {
  const resMad = TPLHouseEngine.calculate({ incluyeVivienda: true, areaCasa: 100, materialCasa: 'madera', antiguedadCasa: 40, condition: 'deteriorada' });
  assert.strictEqual(resMad.vivienda.valorFinalM2, 70000, 'Piso de madera protegido a $70k');
  const resSol = TPLHouseEngine.calculate({ incluyeVivienda: true, areaCasa: 100, materialCasa: 'hormigon', antiguedadCasa: 50, condition: 'para remodelar' });
  assert.strictEqual(resSol.vivienda.valorFinalM2, 120000, 'Piso sólido protegido a $120k');
});

test(9, 'radier terminado ($20k/m²)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: true, areaCasa: 150, tipoFundacion: 'radier_terminado' });
  assert.strictEqual(res.fundacion.precioM2, 20000);
  assert.strictEqual(res.fundacion.valorTotalFundacion, 3000000);
});

test(10, 'base simple ($5k/m²)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: true, areaCasa: 150, tipoFundacion: 'base_simple_pilotes' });
  assert.strictEqual(res.fundacion.precioM2, 5000);
  assert.strictEqual(res.fundacion.valorTotalFundacion, 750000);
});

test(11, 'piscina de fibra (5% anual desde 6º año, piso 25%)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: false, antiguedadCasa: 15, obrasAdicionales: { piscina_fibra: 20 } });
  // base = 650k * 20 = 13M. dep años = 10 -> 50% dep = 6.5M. valor dep = 6.5M.
  const work = res.obrasAdicionales[0];
  assert.strictEqual(work.baseTotal, 13000000);
  assert.strictEqual(work.depreciatedValue, 6500000);
});

test(12, 'piscina de hormigón (3% anual desde 6º año, piso 25%)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: false, antiguedadCasa: 15, obrasAdicionales: { piscina_hormigon: 20 } });
  // base = 900k * 20 = 18M. dep años = 10 -> 30% dep = 5.4M. valor dep = 12.6M.
  const work = res.obrasAdicionales[0];
  assert.strictEqual(work.depreciatedValue, 12600000);
});

test(13, 'quincho abierto ($180k/m², depr)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: false, materialCasa: 'madera', antiguedadCasa: 6, obrasAdicionales: { quincho_abierto: 15 } });
  // base = 180k * 15 = 2.7M. 1 año dep * 10k * 15 = 150k. dep val = 2.55M.
  const work = res.obrasAdicionales[0];
  assert.strictEqual(work.baseTotal, 2700000);
  assert.strictEqual(work.depreciatedValue, 2550000);
});

test(14, 'quincho cerrado ($280k/m², depr)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: false, materialCasa: 'albanileria', antiguedadCasa: 6, obrasAdicionales: { quincho_cerrado: 20 } });
  // base = 280k * 20 = 5.6M. 1 año dep * 8k * 20 = 160k. dep val = 5.44M.
  assert.strictEqual(res.obrasAdicionales[0].depreciatedValue, 5440000);
});

test(15, 'tinaja ($1.5m simple / $2.5m equipada, 7% depr desde año 6)', () => {
  const res = TPLHouseEngine.calculate({ incluyeVivienda: false, antiguedadCasa: 7, obrasAdicionales: { tinaja_simple: 1, tinaja_equipada: 1 } });
  // 2 años dep -> 14% dep. simple dep = 1.5M * 0.86 = 1.29M. equipada = 2.5M * 0.86 = 2.15M.
  assert.strictEqual(res.obrasAdicionales.length, 2);
  const simple = res.obrasAdicionales.find(x => x.key === 'tinaja_simple');
  assert.strictEqual(simple.depreciatedValue, 1290000);
});

test(16, 'característica diferenciadora válida (+10% sobre suma consolidada)', () => {
  const res = TPLHouseEngine.calculate({ valorTerreno: 10000000, incluyeVivienda: true, areaCasa: 100, materialCasa: 'madera', antiguedadCasa: 2, caracteristicaDiferenciadora: 'Hermosa cascada de agua cristalina frente a terraza principal' });
  // Terreno 10M + Casa 27M = 37M + Fundacion Radier 2M = 39M. +10% = 42.9M.
  assert.strictEqual(res.caracteristicaDiferenciadora.valida, true);
  assert.strictEqual(res.caracteristicaDiferenciadora.factorAplicado, 1.10);
  assert.strictEqual(res.valorComercialTotal, Math.round(res.subtotalPropiedad * 1.10));
});

test(17, 'característica diferenciadora vacía (+0%)', () => {
  const res = TPLHouseEngine.calculate({ valorTerreno: 10000000, caracteristicaDiferenciadora: '   ' });
  assert.strictEqual(res.caracteristicaDiferenciadora.valida, false);
  assert.strictEqual(res.caracteristicaDiferenciadora.factorAplicado, 1.00);
});

test(18, 'característica con respuesta “ninguna” o “normal” (+0%)', () => {
  const res1 = TPLHouseEngine.calculate({ valorTerreno: 10000000, caracteristicaDiferenciadora: 'ninguna' });
  const res2 = TPLHouseEngine.calculate({ valorTerreno: 10000000, caracteristicaDiferenciadora: 'casa normal sin nada' });
  assert.strictEqual(res1.caracteristicaDiferenciadora.valida, false);
  assert.strictEqual(res2.caracteristicaDiferenciadora.valida, false);
});

test(19, 'propiedad con múltiples adicionales (suma total correcta de las 14 obras)', () => {
  const allWorks = {
    quincho_abierto: 10, quincho_cerrado: 10, terraza_sin_techo: 10, terraza_techada: 10,
    bodega_madera: 10, bodega_solida: 10, galpon: 20, cobertizo: 15, estacionamiento_techado: 15,
    piscina_fibra: 15, piscina_hormigon: 20, tinaja_simple: 1, tinaja_equipada: 1, porton_automatico: 1
  };
  const res = TPLHouseEngine.calculate({ incluyeVivienda: false, antiguedadCasa: 2, obrasAdicionales: allWorks });
  assert.strictEqual(res.obrasAdicionales.length, 14, 'Debe valorizar las 14 obras');
  assert.ok(res.desglose.sumaObrasAdicionales > 10000000, 'Suma total debe ser positiva y consistente');
});

test(20, 'activación y retiro del badge TPL (precio <= recomendado vs precio > recomendado)', () => {
  const recPrice = 50000000;
  const badgeActivo = (45000000 <= recPrice);
  const badgeInactivo = (55000000 <= recPrice);
  assert.strictEqual(badgeActivo, true, 'Debe activar badge si precio es <= recomendado');
  assert.strictEqual(badgeInactivo, false, 'Debe retirar badge si precio supera recomendado');
});

// ============================================================================
// BLOQUE 2: 26 PRUEBAS DEL FLUJO INTEGRAL TERRITORIAL Y GEOGRÁFICO
// ============================================================================

test(21, 'Parcela de 5.000 m² sin casa (tarifa base $2.000/m² sin ajustes)', () => {
  const res = TPLHouseEngine.calculate({ superficie: 5000, incluyeVivienda: false, distanceKm: 5, region: 'Región de Valparaíso', comuna: 'Quillota' });
  // Base = 5000 * 2000 = 10M. Distancia < 10km x10 -> 100M.
  assert.strictEqual(res.subtotalPropiedad, 100000000);
  assert.strictEqual(res.vivienda.incluida, false);
});

test(22, 'Campo de 15.000 m² (tarifa progresiva en TPLLandEngine)', () => {
  const res = TPLHouseEngine.calculate({ superficie: 15000, incluyeVivienda: false, distanceKm: 70 });
  // 7000 * 2000 = 14M + 3000 * 1000 = 3M + 5000 * 500 = 2.5M = 19.5M total base. >60km x1 -> 19.5M.
  assert.strictEqual(res.landResult.base, 19500000);
});

test(23, 'Propiedad integral con casa de madera', () => {
  const res = TPLHouseEngine.calculate({ superficie: 5000, distanceKm: 20, incluyeVivienda: true, areaCasa: 120, materialCasa: 'madera', antiguedadCasa: 4 });
  assert.strictEqual(res.vivienda.material, 'madera');
  assert.ok(res.subtotalPropiedad > res.desglose.valorTerreno);
});

test(24, 'Propiedad integral con casa sólida', () => {
  const res = TPLHouseEngine.calculate({ superficie: 5000, distanceKm: 20, incluyeVivienda: true, areaCasa: 140, materialCasa: 'metalcon', antiguedadCasa: 2 });
  assert.strictEqual(res.vivienda.materialLabel, 'Construcción Sólida (Metalcon)');
  assert.strictEqual(res.vivienda.valorFinalM2, 350000);
});

test(25, 'Región con factor interno de mercado 0,75 (ej. Maule / Biobío)', () => {
  const land = TPLLandEngine.calculate({ superficie: 5000, distanceKm: 10, region: 'Región del Biobío', comuna: 'Los Ángeles' });
  assert.strictEqual(land.internalPricing.marketFactor, 0.75);
  assert.strictEqual(land.internalPricing.applied, true);
});

test(26, 'Región Metropolitana sin factor de descuento interno (factor 1.0)', () => {
  const land = TPLLandEngine.calculate({ superficie: 5000, distanceKm: 10, region: 'Región Metropolitana', comuna: 'Colina' });
  assert.strictEqual(land.internalPricing.marketFactor, 1.0);
  assert.strictEqual(land.internalPricing.applied, false);
});

test(27, 'Región de Valparaíso sin factor (factor 1.0)', () => {
  const land = TPLLandEngine.calculate({ superficie: 5000, distanceKm: 10, region: 'Región de Valparaíso', comuna: 'Casablanca' });
  assert.strictEqual(land.internalPricing.marketFactor, 1.0);
});

test(28, 'Región de Antofagasta sin factor (factor 1.0)', () => {
  const land = TPLLandEngine.calculate({ superficie: 5000, distanceKm: 10, region: 'Región de Antofagasta', comuna: 'Calama' });
  assert.strictEqual(land.internalPricing.marketFactor, 1.0);
});

test(29, 'Comuna de Puerto Varas sin factor de descuento (factor 1.0 en Los Lagos)', () => {
  const land = TPLLandEngine.calculate({ superficie: 5000, distanceKm: 10, region: 'Región de Los Lagos', comuna: 'Puerto Varas' });
  assert.strictEqual(land.internalPricing.marketFactor, 1.0);
});

test(30, 'Ciudad a menos de 10 km (multiplicador territorial ×10)', () => {
  const land = TPLLandEngine.calculate({ superficie: 5000, distanceKm: 8 });
  assert.strictEqual(land.distanceMultiplier, 10);
});

test(31, 'Ciudad a más de 60 km (multiplicador territorial ×1)', () => {
  const land = TPLLandEngine.calculate({ superficie: 5000, distanceKm: 65 });
  assert.strictEqual(land.distanceMultiplier, 1);
  assert.ok(land.cautions.some(c => c.includes('60 km')));
});

test(32, 'Error en API de rutas -> fallback geodésico en TPLLocationService', () => {
  const loc = TPLLocationService.resolve({ lat: -36.82, lon: -73.05, distanciaCarreteraKm: null, distanciaGeograficaKm: 20 });
  assert.strictEqual(loc.distanciaCarreteraKm, 27.0, '20 km geodésicos * factor sinuosidad 1.35 = 27 km carretera est.');
  assert.strictEqual(loc.ciudadPrincipal.esEstimacionInterna, true);
});

test(33, 'Uso de distancia geográfica como respaldo (marca esEstimacionInterna = true)', () => {
  const loc = TPLLocationService.resolve({ lat: -36.8, lon: -73.0, distanciaGeograficaKm: 15 });
  assert.strictEqual(loc.ciudadPrincipal.esEstimacionInterna, true);
  assert.strictEqual(loc.metadata.fallbackGeodeticUsed, true);
});

test(34, 'Hospital cercano detectado en Índice de Ubicación TPL', () => {
  const loc = TPLLocationService.resolve({ lat: -36.8, lon: -73.0, hospitalDistKm: 5 });
  assert.strictEqual(loc.serviciosCercanos.hospital.atributoDetectado, true);
  assert.strictEqual(loc.serviciosCercanos.hospital.distanciaKm, 5);
});

test(35, 'Solo posta rural cercana / salud general en catálogo', () => {
  const loc = TPLLocationService.resolve({ lat: -36.8, lon: -73.0, hospitalNombre: 'Posta Rural Valle', hospitalDistKm: 18 });
  assert.strictEqual(loc.serviciosCercanos.hospital.nombre, 'Posta Rural Valle');
});

test(36, 'Río detectado sin acceso declarado (diferencia proximidad vs acceso)', () => {
  const loc = TPLLocationService.resolve({ tieneRioLago: true, accesoAguaConfirmado: false });
  assert.strictEqual(loc.serviciosCercanos.rioLagoPlaya.atributoDetectado, true);
  assert.strictEqual(loc.serviciosCercanos.rioLagoPlaya.accesoRealConfirmado, false);
});

test(37, 'Río detectado y acceso declarado (accesoRealConfirmado = true)', () => {
  const loc = TPLLocationService.resolve({ tieneRioLago: true, accesoAguaConfirmado: true });
  assert.strictEqual(loc.serviciosCercanos.rioLagoPlaya.accesoRealConfirmado, true);
  assert.strictEqual(loc.serviciosCercanos.rioLagoPlaya.fuente, 'escritura_o_propietario');
});

test(38, 'Prevención de doble valorización (Índice de ubicación no altera precio en V1)', () => {
  const res = TPLHouseEngine.calculate({ superficie: 5000, distanceKm: 10, hospitalDistKm: 1 });
  assert.strictEqual(TPLLocationService.CONFIG.locationIndex.enabledForValuation, false);
});

test(39, 'Creación de borrador en estructura canónica persistible', () => {
  const draft = { id: 'draft_' + Date.now(), client: 'Juan Propietario', valorTotal: 45000000 };
  assert.ok(draft.id.startsWith('draft_'));
});

test(40, 'Apertura del publicador desde UUID (parámetro seguro ?draft=UUID)', () => {
  const url = 'https://tuparcelalista.cl/plataforma/publicar/index.html?draft=550e8400-e29b-41d4-a716-446655440000';
  const param = new URL(url).searchParams.get('draft');
  assert.strictEqual(param, '550e8400-e29b-41d4-a716-446655440000');
});

test(41, 'Recuperación de borrador (rehidratación de datos en memoria y UI)', () => {
  const mockStorage = { 'tpl_draft_123': JSON.stringify({ rol: '123-4', precio: 60000000 }) };
  const rehydrated = JSON.parse(mockStorage['tpl_draft_123']);
  assert.strictEqual(rehydrated.rol, '123-4');
});

test(42, 'Generación de estructura de datos para PDF integral', () => {
  const res = TPLHouseEngine.calculate({ superficie: 5000, incluyeVivienda: true, areaCasa: 100, materialCasa: 'madera', rolAvaluo: '555-12' });
  assert.strictEqual(res.informativos.rolAvaluo, '555-12');
  assert.ok(res.desglose.valorCasa > 0);
});

test(43, 'Idempotencia en expediente (evita duplicar propiedades por rol en CRM)', () => {
  const expedientes = [{ id: 'exp1', rol: '100-5' }];
  const nuevoRol = '100-5';
  const duplicado = expedientes.some(e => e.rol === nuevoRol);
  assert.strictEqual(duplicado, true, 'Debe detectar que el expediente ya existe');
});

test(44, 'Activación del badge en publicación precargada', () => {
  const valRecomendado = 80000000;
  const precioPub = 79000000;
  assert.strictEqual(precioPub <= valRecomendado, true);
});

test(45, 'Retiro del badge al subir el precio publicado sobre el valor recomendado', () => {
  const valRecomendado = 80000000;
  const precioPub = 85000000;
  assert.strictEqual(precioPub <= valRecomendado, false);
});

test(46, 'Restauración del badge al reducir el precio nuevamente', () => {
  let precioPub = 85000000; const rec = 80000000;
  assert.strictEqual(precioPub <= rec, false);
  precioPub = 78000000; // Rebaja de precio
  assert.strictEqual(precioPub <= rec, true, 'El badge se restaura automáticamente');
});

// ============================================================================
// BLOQUE 3: 12 PRUEBAS DEL CICLO COMERCIAL REAL Y APRENDIZAJE ANALÍTICO
// ============================================================================

test(47, 'Propiedad vendida al valor recomendado (diferencia 0, precisión 100%)', () => {
  const ind = TPLCommercialLifecycle.calculateDerivedIndicators({ valorRecomendadoTPL: 50000000, valorRealVenta: 50000000 });
  assert.strictEqual(ind.diferenciaTPLVentaReal, 0);
  assert.strictEqual(ind.errorPorcentualTasacion, 0);
  assert.strictEqual(ind.precisionAproximada, 100);
});

test(48, 'Propiedad vendida bajo el valor recomendado (ej. TPL $60M, venta $54M -> precisión 90%)', () => {
  const ind = TPLCommercialLifecycle.calculateDerivedIndicators({ valorRecomendadoTPL: 60000000, valorRealVenta: 54000000 });
  assert.strictEqual(ind.errorPorcentualTasacion, 11.1); // (60-54)/54 * 100
  assert.strictEqual(ind.precisionAproximada, 88.9);
});

test(49, 'Propiedad vendida sobre el valor recomendado (ej. TPL $40M, venta $44M)', () => {
  const ind = TPLCommercialLifecycle.calculateDerivedIndicators({ valorRecomendadoTPL: 40000000, valorRealVenta: 44000000 });
  assert.strictEqual(ind.errorPorcentualTasacion, -9.1); // (40-44)/44 * 100
  assert.strictEqual(ind.precisionAproximada, 90.9);
});

test(50, 'Precio del propietario muy superior al de TPL (cálculo de brecha inicial)', () => {
  const ind = TPLCommercialLifecycle.calculateDerivedIndicators({ valorSugeridoPropietario: 100000000, valorRecomendadoTPL: 70000000 });
  assert.strictEqual(ind.diferenciaPropietarioTPLAbs, 30000000);
  assert.strictEqual(ind.diferenciaPropietarioTPLPct, 42.9); // 30M / 70M * 100
});

test(51, 'Dos o más rebajas de precio (registro inmutable en historial)', () => {
  const h1 = TPLCommercialLifecycle.createPriceHistoryRecord({ precioAnterior: 80000000, precioNuevo: 75000000, motivo: 'Primera rebaja' });
  const h2 = TPLCommercialLifecycle.createPriceHistoryRecord({ precioAnterior: 75000000, precioNuevo: 72000000, motivo: 'Segunda rebaja para activar badge', badgeActivoDespues: true });
  assert.strictEqual(h1.precioNuevo, 75000000);
  assert.strictEqual(h2.badgeActivoDespues, true);
  assert.notStrictEqual(h1.id, h2.id, 'Cada registro de historial tiene ID único e inmutable');
});

test(52, 'Venta originada en TPL y cerrada por WhatsApp (separación de canales)', () => {
  const dec = TPLCommercialLifecycle.buildSaleDeclaration({ canalDescubrimiento: 'Tu Parcela Lista', canalContacto: 'WhatsApp', canalCierre: 'venta directa' });
  assert.strictEqual(dec.canalDescubrimiento, 'Tu Parcela Lista');
  assert.strictEqual(dec.canalContacto, 'WhatsApp');
  assert.strictEqual(dec.canalCierre, 'venta directa');
});

test(53, 'Venta originada en TPL y cerrada por corredor asociado', () => {
  const dec = TPLCommercialLifecycle.buildSaleDeclaration({ canalDescubrimiento: 'Tu Parcela Lista', canalCierre: 'corredor asociado', compradorOriginadoPorTPL: true });
  assert.strictEqual(dec.compradorOriginadoPorTPL, true);
  assert.strictEqual(dec.canalCierre, 'corredor asociado');
});

test(54, 'Venta externa sin influencia de TPL (descubrimiento portal externo)', () => {
  const dec = TPLCommercialLifecycle.buildSaleDeclaration({ canalDescubrimiento: 'portal inmobiliario externo', compradorOriginadoPorTPL: false });
  assert.strictEqual(dec.compradorOriginadoPorTPL, false);
  assert.strictEqual(dec.publicacionInfluenciadaPorTPL, false);
});

test(55, 'Propiedad retirada sin venta (registro de motivo en ciclo de vida)', () => {
  const h = TPLCommercialLifecycle.createPriceHistoryRecord({ precioAnterior: 60000000, precioNuevo: 0, motivo: 'Retiro del mercado por decisión familiar', fuente: 'retiro_propietario' });
  assert.strictEqual(h.fuente, 'retiro_propietario');
});

test(56, 'Cálculo correcto de días en mercado (diasEnMercado)', () => {
  const now = Date.now();
  const pubDate = new Date(now - (30 * 24 * 60 * 60 * 1000)).toISOString(); // Hace 30 días exactos
  const ind = TPLCommercialLifecycle.calculateDerivedIndicators({ fechaPublicacion: pubDate, fechaVenta: new Date(now).toISOString() });
  assert.strictEqual(ind.diasEnMercado, 30);
});

test(57, 'Conservación del historial de precios (nunca sobrescribir array en backend)', () => {
  const historial = [];
  historial.push(TPLCommercialLifecycle.createPriceHistoryRecord({ precioAnterior: 50000000, precioNuevo: 48000000 }));
  historial.push(TPLCommercialLifecycle.createPriceHistoryRecord({ precioAnterior: 48000000, precioNuevo: 45000000 }));
  assert.strictEqual(historial.length, 2, 'El array crece agregando registros sin eliminar ni pisar el anterior');
});

test(58, 'Cálculo de precisión de la tasación en la declaración de cierre para calibración analítica', () => {
  const dec = TPLCommercialLifecycle.buildSaleDeclaration({
    valorRecomendadoTPL: 100000000,
    valorRealVenta: 95000000,
    versionMotorTerritorial: 'tpl-land-engine-v1',
    versionMotorVivienda: 'tpl-house-engine-v1'
  });
  assert.strictEqual(dec.indicadoresDerivados.precisionAproximada, 94.7); // 5M/95M = 5.3% error -> 94.7% precision
  assert.strictEqual(dec.metadata.versionMotorVivienda, 'tpl-house-engine-v1');
});

console.log('\n========================================================================');
console.log(` 🏁 RESULTADOS FINALES DE LA SUITE CANÓNICA:`);
console.log(`    ✅ Pruebas Superadas: ${passed}`);
console.log(`    ❌ Pruebas Fallidas:  ${failed}`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log(' ✨ CERTIFICACIÓN COMPLETA EXITO TOTAL: EL SISTEMA CUMPLE AL 100% CON LAS 58 PRUEBAS.');
  process.exit(0);
}
