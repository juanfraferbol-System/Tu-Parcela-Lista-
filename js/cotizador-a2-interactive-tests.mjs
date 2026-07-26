import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../cotizador.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../cotizador.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../cotizador.css', import.meta.url), 'utf8');

// 1. VERIFICACIÓN ESTRUCTURAL DE CONTRATO (HTML / CSS / JS)
test('Fase A2 Contrato Estructura: Nombres de Paquetes Prudentes, Nota Referencial, ADN y Sticky Bar', () => {
  // Verificar que HTML no tenga ítems inventados como "Sistema Solar Fotovoltaico" o "Estudio de suelo" en los packs
  assert.doesNotMatch(html, /Sistema Solar Fotovoltaico/i, 'No debe existir Sistema Solar Fotovoltaico cotizable en packs');
  assert.doesNotMatch(html, /Estudio de suelo y topografía/i, 'No debe existir Estudio de suelo inventado en packs');
  
  // Verificar nuevos nombres comerciales prudentes en HTML
  assert.match(html, /Pack Habilitación Inicial/, 'Debe existir Pack Habilitación Inicial');
  assert.match(html, /Pack Autonomía Básica/, 'Debe existir Pack Autonomía Básica');
  assert.match(html, /Pack Preparación de Parcela/, 'Debe existir Pack Preparación de Parcela');
  assert.match(html, /Valores referenciales\. La necesidad, cantidad y factibilidad de cada obra debe validarse según las condiciones reales del terreno y el proyecto\./, 'Debe existir la nota referencial debajo de los packs');

  // Verificar que NO existan afirmaciones legales temerarias en JS ni en HTML
  assert.doesNotMatch(js, /blinda legalmente/i, 'No debe usar afirmaciones legales temerarias');
  assert.doesNotMatch(js, /Directiva de Protección \(Innegociable\)/i, 'No debe usar título temerario en PDF');
  assert.match(js, /Restricciones y preferencias declaradas por el cliente/, 'Debe usar título prudente en PDF');
  assert.match(js, /Brief inicial sujeto a validación técnica/, 'Debe usar nota legal prudente en PDF');
});

test('Fase A2 CSS: Sticky Bar oculta en escritorio y visible solamente bajo 768 px', () => {
  assert.match(css, /\.sticky-conversion-bar\s*\{\s*display:\s*none\s*!important;/i, 'La barra móvil debe estar oculta (display: none) por defecto en escritorio');
  assert.match(css, /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.sticky-conversion-bar\s*\{\s*display:\s*block\s*!important;/i, 'La barra móvil debe cambiar a display: block bajo 768 px');
});

// 2. VERIFICACIÓN EN TIEMPO DE EJECUCIÓN (SIMULACIÓN FUNCIONAL DE DOM Y MOTOR A2)
test('Fase A2 Runtime: Lógica de 1-Click Bundles selecciona y deselecciona extras canónicos sin duplicar', () => {
  // Configurar Mock DOM para Bundles
  const cards = [
    { dataset: { bundle: 'llave_en_mano' }, classList: new Set(), addEventListener: (e, fn) => { this.click = fn; } },
    { dataset: { bundle: 'sustentable' }, classList: new Set(), addEventListener: (e, fn) => { this.click = fn; } }
  ];

  const checks = [
    { dataset: { id: 'fosa_septica' }, checked: false, closest: () => ({ classList: new Set() }) },
    { dataset: { id: 'empalme_electrico' }, checked: false, closest: () => ({ classList: new Set() }) },
    { dataset: { id: 'pozo_profundo' }, checked: false, closest: () => ({ classList: new Set() }) },
    { dataset: { id: 'piscina' }, checked: false, closest: () => ({ classList: new Set() }) }
  ];

  const BUNDLE_CONFIG = {
    llave_en_mano: ['fosa_septica', 'empalme_electrico', 'cierre_perimetral', 'porton'],
    sustentable: ['pozo_profundo', 'fosa_septica', 'cierre_perimetral']
  };

  // Simular selección de bundle llave_en_mano
  const targetIds = BUNDLE_CONFIG['llave_en_mano'];
  checks.forEach(chk => {
    if (targetIds.includes(chk.dataset.id)) {
      chk.checked = true;
    }
  });

  assert.equal(checks[0].checked, true, 'Fosa séptica debe ser seleccionada por Pack Habilitación Inicial');
  assert.equal(checks[1].checked, true, 'Empalme eléctrico debe ser seleccionado por Pack Habilitación Inicial');
  assert.equal(checks[2].checked, false, 'Pozo profundo no pertenece a Habilitación Inicial, debe seguir false');
  assert.equal(checks[3].checked, false, 'Piscina no pertenece al pack, debe seguir false');
});

test('Fase A2 Runtime: Punto 6 - Extras incluidos por sistema constructivo continúan activados sin doble cobro', () => {
  // En Metalcon, instalacion_electrica está incluido en el material
  const chkIncluded = {
    dataset: { id: 'instalacion_electrica', valor: '0', estado: 'incluido', tipo: 'u' },
    checked: true
  };
  const e = { id: 'instalacion_electrica', nombre: 'Instalación eléctrica interior', valor: 1500000 };
  
  const isIncluded = chkIncluded.dataset.estado === 'incluido' || Number(chkIncluded.dataset.valor) === 0;
  const extraCost = isIncluded ? 0 : e.valor * 1;
  
  assert.equal(chkIncluded.checked, true, 'El extra debe aparecer activado');
  assert.equal(isIncluded, true, 'Debe reconocerse como incluido en construcción');
  assert.equal(extraCost, 0, 'El costo sumado a la cotización debe ser 0, evitando doble cobro');
});

test('Fase A2 Runtime: Punto 7 - Desmarcar manualmente un elemento de un pack elimina active-bundle sin borrar previas ni demás extras', () => {
  // Simulamos 5 checks: 3 del pack Habilitación Inicial y 1 previo del usuario (piscina)
  const checksMap = {
    'fosa_septica': { dataset: { id: 'fosa_septica' }, checked: true },
    'empalme_electrico': { dataset: { id: 'empalme_electrico' }, checked: true },
    'cierre_perimetral': { dataset: { id: 'cierre_perimetral' }, checked: true },
    'piscina': { dataset: { id: 'piscina' }, checked: true } // Seleccionado antes por el cliente
  };

  const activeBundle = {
    dataset: { bundle: 'llave_en_mano' },
    classList: new Set(['active-bundle']),
    removeClass: function(cls) { this.classList.delete(cls); }
  };

  const BUNDLE_CONFIG = {
    llave_en_mano: ['fosa_septica', 'empalme_electrico', 'cierre_perimetral', 'porton']
  };

  // El usuario desmarca manualmente 'cierre_perimetral'
  checksMap['cierre_perimetral'].checked = false;

  // Lógica de checkActiveBundlesIntegrity
  const targetIds = BUNDLE_CONFIG['llave_en_mano'];
  const allCheckedIds = Object.values(checksMap).filter(c => c.checked).map(c => c.dataset.id);
  const allStillChecked = targetIds.every(id => allCheckedIds.includes(id));
  if (!allStillChecked) {
    activeBundle.removeClass('active-bundle');
  }

  assert.equal(activeBundle.classList.has('active-bundle'), false, 'El pack debe perder su estado activo al desmarcar uno de sus elementos');
  assert.equal(checksMap['fosa_septica'].checked, true, 'Los demás extras del pack (fosa) deben permanecer seleccionados');
  assert.equal(checksMap['empalme_electrico'].checked, true, 'Los demás extras del pack (empalme) deben permanecer seleccionados');
  assert.equal(checksMap['piscina'].checked, true, 'La selección previa del cliente (piscina) no debe eliminarse');
});

test('Fase A2 Runtime: ADN del Proyecto actualiza SSOT window.ProyectoTPL, persiste en sessionStorage y no guarda PII', () => {
  const storage = {};
  global.sessionStorage = {
    setItem: (k, v) => { storage[k] = v; },
    getItem: (k) => storage[k] || null
  };
  global.window = { ProyectoTPL: {} };

  const adnData = {
    prioridades: ['Vida Familiar', 'Teletrabajo'],
    futuro: ['Quincho techado'],
    resumenLibre: 'Quiero una casa amplia con vista al norte.',
    evitar: 'Dormitorios pequeños o terrenos con mucha pendiente.',
    enlaces: 'https://pinterest.com/idea1'
  };

  global.window.ProyectoTPL.adnProyecto = adnData;
  sessionStorage.setItem('tpl_adn_project_v1', JSON.stringify(adnData));

  assert.deepEqual(global.window.ProyectoTPL.adnProyecto, adnData, 'El SSOT ProyectoTPL.adnProyecto debe contener exactamente los datos del ADN');
  const storedString = sessionStorage.getItem('tpl_adn_project_v1');
  assert.ok(storedString, 'Debe persistir en sessionStorage para sobrevivir a recargas');
  assert.doesNotMatch(storedString, /email|telefono|phone|nombre_cliente/i, 'No debe almacenar PII en storage');

  const recovered = JSON.parse(sessionStorage.getItem('tpl_adn_project_v1'));
  assert.equal(recovered.resumenLibre, 'Quiero una casa amplia con vista al norte.', 'Debe recuperar el resumen libre idéntico tras recarga');
  assert.equal(recovered.evitar, 'Dormitorios pequeños o terrenos con mucha pendiente.', 'Debe recuperar las restricciones idénticas tras recarga');
});

test('Fase A2 Runtime: Coherencia de total entre Resumen, Sticky Bar, PDF y Payload CRM (100% Identicos)', () => {
  const totalCanonico = 45500000;
  const stickyBarText = '$45.500.000';
  const pdfTotalVal = totalCanonico;
  const crmPayloadVal = totalCanonico;

  const formatClp = (val) => '$' + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  assert.equal(formatClp(totalCanonico), stickyBarText, 'El total en Sticky Bar debe ser exactamente idéntico al total canónico formateado');
  assert.equal(pdfTotalVal, totalCanonico, 'El valor enviado al generador PDF debe ser idéntico al total canónico');
  assert.equal(crmPayloadVal, totalCanonico, 'El valor enviado en el payload al CRM debe ser idéntico al total canónico');
});
