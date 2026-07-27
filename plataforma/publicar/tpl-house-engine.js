/**
 * TPL HOUSE & IMPROVEMENTS VALUATION ENGINE
 * Motor canónico integral para valorización de viviendas, fundaciones/radier,
 * las 14 obras adicionales obligatorias y característica diferenciadora (+10%).
 * Orquesta con TPLLandEngine sin duplicar jamás su fórmula territorial.
 * Versión: tpl-house-engine-v1
 */
(function(global){
  'use strict';

  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const yearNow = new Date().getFullYear();

  const RULES = Object.freeze({
    module: 'tpl-house-engine-v1',
    version: '2026-07-27',
    materials: Object.freeze({
      madera: { baseM2: 270000, depAnnualM2: 10000, minM2: 70000, label: 'Madera' },
      metalcon: { baseM2: 350000, depAnnualM2: 8000, minM2: 120000, label: 'Construcción Sólida (Metalcon)' },
      albanileria: { baseM2: 350000, depAnnualM2: 8000, minM2: 120000, label: 'Construcción Sólida (Albañilería)' },
      hormigon: { baseM2: 350000, depAnnualM2: 8000, minM2: 120000, label: 'Construcción Sólida (Hormigón)' },
      mixta: { baseM2: 350000, depAnnualM2: 8000, minM2: 120000, label: 'Construcción Sólida (Mixta)' },
      solida: { baseM2: 350000, depAnnualM2: 8000, minM2: 120000, label: 'Construcción Sólida' }
    }),
    conditionDiscountsM2: Object.freeze({
      excelente: 0,
      nueva: 0,
      bueno: 0,
      buena: 0,
      estandar: 0,
      normal: 0,
      aceptable: -2000,
      regular: -2000,
      malo: -5000,
      mala: -5000,
      'necesita mejoras': -5000,
      deteriorado: -10000,
      deteriorada: -10000,
      'para remodelar': -10000
    }),
    foundations: Object.freeze({
      radier_terminado: { priceM2: 20000, label: 'Radier terminado' },
      base_simple: { priceM2: 5000, label: 'Base simple, pilotes, poyos o estructura básica' },
      sin_fundacion: { priceM2: 0, label: 'Sin fundación valorizable' }
    }),
    additionalWorks: Object.freeze({
      quincho_abierto: { base: 180000, unit: 'm2', depType: 'linear_material', label: 'Quincho abierto' },
      quincho_cerrado: { base: 280000, unit: 'm2', depType: 'linear_material', label: 'Quincho cerrado' },
      terraza_sin_techo: { base: 80000, unit: 'm2', depType: 'linear_material', label: 'Terraza sin techo' },
      terraza_techada: { base: 140000, unit: 'm2', depType: 'linear_material', label: 'Terraza techada' },
      bodega_madera: { base: 150000, unit: 'm2', depType: 'linear_10k', label: 'Bodega de madera' },
      bodega_solida: { base: 250000, unit: 'm2', depType: 'linear_8k', label: 'Bodega sólida' },
      galpon: { base: 120000, unit: 'm2', depType: 'linear_material', label: 'Galpón simple' },
      cobertizo: { base: 90000, unit: 'm2', depType: 'linear_material', label: 'Cobertizo' },
      estacionamiento_techado: { base: 90000, unit: 'm2', depType: 'linear_material', label: 'Estacionamiento techado' },
      piscina_fibra: { base: 650000, unit: 'm2', depType: 'pct_5', label: 'Piscina de fibra (espejo de agua)' },
      piscina_hormigon: { base: 900000, unit: 'm2', depType: 'pct_3', label: 'Piscina de hormigón (espejo de agua)' },
      tinaja_simple: { base: 1500000, unit: 'unidad', depType: 'pct_7', label: 'Tinaja simple' },
      tinaja_equipada: { base: 2500000, unit: 'unidad', depType: 'pct_7', label: 'Tinaja equipada o calefaccionada' },
      porton_automatico: { base: 1500000, unit: 'unidad', depType: 'pct_5', label: 'Portón automático' }
    }),
    differentiatingBonusPct: 0.10,
    minWorkFloorRatio: 0.25, // Protección piso mínimo 25% en obras adicionales
    quickFactor: 0.90,
    patientFactor: 1.10
  });

  /**
   * Valida si la descripción de característica diferenciadora es apta para bonificación del 10%
   */
  function isDifferentiatingFeatureValid(text) {
    if (!text || typeof text !== 'string') return false;
    const clean = text.trim();
    if (clean.length < 15) return false;
    const normalized = norm(clean);
    const negations = [
      'no', 'nada', 'ninguna', 'normal', 'no se', 'desconocido', 'ninguno',
      'sin caracteristica', 'sin nada', 'casa normal', 'parcela normal', 'no tiene',
      'nada en especial', 'ninguna en particular', 'casa normal sin nada'
    ];
    if (negations.some(kw => normalized === kw || normalized.includes(kw))) return false;
    // Comprobar que no sean puros signos o caracteres repetidos sin contenido silábico/alfabético
    if (!/[a-z0-9]{3,}/i.test(clean)) return false;
    return true;
  }

  /**
   * Calcula el valor depreciado de una obra adicional
   */
  function calculateWorkValue(workKey, qty, houseEffectiveAge, houseMaterialNorm, customYear) {
    const workDef = RULES.additionalWorks[workKey];
    if (!workDef || !qty || qty <= 0) return null;
    
    const baseTotal = Math.round(workDef.base * qty);
    const ageToUse = customYear && customYear <= yearNow ? Math.max(0, yearNow - customYear) : num(houseEffectiveAge);
    const yearsDep = Math.max(0, ageToUse - 5); // Período de gracia 0-5 años
    
    let depTotal = 0;
    if (yearsDep > 0) {
      if (workDef.depType === 'linear_10k') {
        depTotal = Math.round(10000 * yearsDep * qty);
      } else if (workDef.depType === 'linear_8k') {
        depTotal = Math.round(8000 * yearsDep * qty);
      } else if (workDef.depType === 'linear_material') {
        const rate = (houseMaterialNorm === 'madera') ? 10000 : 8000;
        depTotal = Math.round(rate * yearsDep * qty);
      } else if (workDef.depType === 'pct_5') {
        depTotal = Math.round(baseTotal * (yearsDep * 0.05));
      } else if (workDef.depType === 'pct_3') {
        depTotal = Math.round(baseTotal * (yearsDep * 0.03));
      } else if (workDef.depType === 'pct_7') {
        depTotal = Math.round(baseTotal * (yearsDep * 0.07));
      }
    }

    const minFloor = Math.round(baseTotal * RULES.minWorkFloorRatio);
    const depreciatedValue = Math.max(minFloor, baseTotal - depTotal);

    return {
      key: workKey,
      label: workDef.label,
      quantity: qty,
      unit: workDef.unit,
      baseUnit: workDef.base,
      baseTotal,
      depreciation: baseTotal - depreciatedValue,
      depreciatedValue,
      effectiveAgeUsed: ageToUse,
      protectedByFloor: (baseTotal - depTotal) < minFloor
    };
  }

  /**
   * Orquestador e integral de tasación (Terreno + Casa + Fundaciones + Obras + Diferenciador)
   * Delega exclusivamente la tasación de suelo a TPLLandEngine.calculate(...)
   */
  function calculate(input = {}) {
    // 1. Resolver motor de terreno (Nunca duplicar su fórmula)
    const landInput = {
      ...input,
      area: num(input.area || input.superficie || 0),
      distanceKm: input.distanceKm !== undefined ? num(input.distanceKm) : (input.distanciaCarreteraKm !== undefined ? num(input.distanciaCarreteraKm) : 10)
    };

    let landResult = null;
    if (global.TPLLandEngine && typeof global.TPLLandEngine.calculate === 'function') {
      landResult = global.TPLLandEngine.calculate(landInput);
    } else {
      const landVal = num(input.valorTerreno || input.landValue || 0);
      landResult = { ideal: landVal, reference: landVal, area: landInput.area };
    }
    const valorTerreno = num(landResult.ideal || landResult.reference || 0);

    // Antigüedad efectiva de la propiedad / vivienda (disponible siempre para obras adicionales)
    const anioConst = num(input.anioConstruccion || input.year);
    const anioRemodel = num(input.anioRemodelacion || input.remodelingYear);
    const remodelacionIntegral = Boolean(input.remodelacionIntegral || (anioRemodel > 0 && (yearNow - anioRemodel <= 30)));

    let effectiveAge = 0;
    if (remodelacionIntegral && anioRemodel > 0 && anioRemodel <= yearNow) {
      effectiveAge = Math.max(0, yearNow - anioRemodel);
    } else if (anioConst > 0 && anioConst <= yearNow) {
      effectiveAge = Math.max(0, yearNow - anioConst);
    } else {
      effectiveAge = num(input.antiguedadCasa || input.age || 0);
    }

    // 2. ¿Incluye vivienda?
    const incluyeVivienda = Boolean(input.incluyeVivienda !== false && (input.areaCasa > 0 || input.superficieCasa > 0 || input.materialCasa || input.material || input.incluyeVivienda === true));
    const areaCasa = num(input.areaCasa || input.superficieCasa || 0);
    const matNorm = norm(input.materialCasa || input.material || 'solida');
    const matDef = RULES.materials[matNorm] || RULES.materials.solida;
    
    let valorCasa = 0;
    let valorFinalM2 = 0;
    let depAntiguedadM2 = 0;
    let depEstadoM2 = 0;
    let pisoMinimoAplicado = false;

    if (incluyeVivienda && areaCasa > 0) {
      // Depreciación por antigüedad (período de gracia 0-5 años)
      const aniosDepreciables = Math.max(0, effectiveAge - 5);
      depAntiguedadM2 = aniosDepreciables * matDef.depAnnualM2;

      // Descuento por estado general
      const condNorm = norm(input.estadoCasa || input.condition || 'bueno');
      depEstadoM2 = Math.abs(RULES.conditionDiscountsM2[condNorm] || 0);

      // Fórmula con piso mínimo de protección
      const calcedM2 = matDef.baseM2 - depAntiguedadM2 - depEstadoM2;
      valorFinalM2 = Math.max(matDef.minM2, calcedM2);
      if (calcedM2 < matDef.minM2) pisoMinimoAplicado = true;

      valorCasa = Math.round(valorFinalM2 * areaCasa);
    }

    // 3. Fundaciones o Radier
    const fundNorm = norm(input.tipoFundacion || input.foundation || 'radier_terminado');
    let fundDef = RULES.foundations.radier_terminado;
    if (fundNorm.includes('simple') || fundNorm.includes('pilote') || fundNorm.includes('poyo') || fundNorm.includes('basica')) {
      fundDef = RULES.foundations.base_simple;
    } else if (fundNorm.includes('sin') || fundNorm === 'no') {
      fundDef = RULES.foundations.sin_fundacion;
    }
    const areaFundacion = input.superficieFundacion !== undefined && input.superficieFundacion !== null ? num(input.superficieFundacion) : areaCasa;
    const valorFundacion = incluyeVivienda ? Math.round(fundDef.priceM2 * areaFundacion) : 0;

    // 4. Obras Adicionales (14 obligatorias)
    const obrasEvaluadas = [];
    let sumaObrasAdicionales = 0;
    const inputObras = input.obrasAdicionales || input.extras || {};

    if (typeof inputObras === 'object' && inputObras !== null) {
      for (const [key, val] of Object.entries(inputObras)) {
        const qty = num(val && typeof val === 'object' ? (val.cantidad || val.superficie || val.qty) : val);
        const customYear = val && typeof val === 'object' ? num(val.anio || val.year) : null;
        if (qty > 0 && RULES.additionalWorks[key]) {
          const wRes = calculateWorkValue(key, qty, effectiveAge, matNorm, customYear);
          if (wRes) {
            obrasEvaluadas.push(wRes);
            sumaObrasAdicionales += wRes.depreciatedValue;
          }
        }
      }
    }

    // 5. Característica Diferenciadora (+10% una sola vez sobre suma consolidada)
    const textoDiferenciador = String(input.caracteristicaDiferenciadora || input.differentiatingFeature || '').trim();
    const tieneDiferenciador = isDifferentiatingFeatureValid(textoDiferenciador);
    const factorDiferenciador = tieneDiferenciador ? (1 + RULES.differentiatingBonusPct) : 1.00;

    const subtotalPropiedad = valorTerreno + valorCasa + valorFundacion + sumaObrasAdicionales;
    const valorComercialTotal = Math.round(subtotalPropiedad * factorDiferenciador);

    // Redondeo de estrategia comercial a 10.000
    const ideal = Math.round(valorComercialTotal / 10000) * 10000;
    const quick = Math.round((ideal * RULES.quickFactor) / 10000) * 10000;
    const patient = Math.round((ideal * RULES.patientFactor) / 10000) * 10000;

    // 6. Atributos informativos que no alteran valor
    const informativos = {
      dormitorios: num(input.dormitorios || input.bedrooms),
      banos: num(input.banos || input.bathrooms),
      superficieCocina: num(input.superficieCocina || input.kitchenArea),
      pisos: num(input.pisos || input.floors || 1),
      anioConstruccion: num(input.anioConstruccion || input.year),
      anioRemodelacion: num(input.anioRemodelacion || input.remodelingYear),
      materialPrincipalLabel: matDef.label,
      rolAvaluo: String(input.rolAvaluo || input.rol || '').trim() || null,
      sinRolConocido: Boolean(input.sinRolConocido),
      conservador: String(input.conservador || '').trim() || null,
      foja: String(input.foja || '').trim() || null,
      numInscripcion: String(input.numInscripcion || '').trim() || null,
      anioInscripcion: num(input.anioInscripcion) || null,
      estadoDocumental: String(input.estadoDocumental || 'no informado')
    };

    return {
      quick,
      ideal,
      patient,
      reference: ideal,
      low: quick,
      high: patient,
      valorComercialTotal: ideal,
      subtotalPropiedad,
      desglose: {
        valorTerreno,
        valorCasa,
        valorFundacion,
        sumaObrasAdicionales,
        bonificaciónDiferenciadora: Math.round(subtotalPropiedad * (factorDiferenciador - 1))
      },
      vivienda: incluyeVivienda ? {
        incluida: true,
        superficieM2: areaCasa,
        material: matNorm,
        materialLabel: matDef.label,
        baseM2: matDef.baseM2,
        antiguedadEfectiva: effectiveAge,
        depreciacionAntiguedadM2: depAntiguedadM2,
        descuentoEstadoM2: depEstadoM2,
        valorFinalM2,
        valorTotalCasa: valorCasa,
        pisoMinimoAplicado,
        remodelacionIntegral: Boolean(input.remodelacionIntegral || (input.anioRemodelacion > 0))
      } : { incluida: false },
      fundacion: {
        tipo: fundNorm,
        label: fundDef.label,
        superficieM2: areaFundacion,
        precioM2: fundDef.priceM2,
        valorTotalFundacion: valorFundacion
      },
      obrasAdicionales: obrasEvaluadas,
      caracteristicaDiferenciadora: {
        texto: textoDiferenciador,
        valida: tieneDiferenciador,
        factorAplicado: factorDiferenciador
      },
      informativos,
      landResult,
      metadata: {
        module: RULES.module,
        version: RULES.version,
        territorialEngineVersion: landResult && landResult.method ? landResult.method : 'tpl-land-engine-v1',
        calculatedAt: new Date().toISOString()
      },
      method: RULES.module
    };
  }

  const exportObj = Object.freeze({ RULES, calculate, isDifferentiatingFeatureValid, calculateWorkValue });
  if (typeof module !== 'undefined' && module.exports) module.exports = exportObj;
  global.TPLHouseEngine = exportObj;
})(typeof window !== 'undefined' ? window : globalThis);
