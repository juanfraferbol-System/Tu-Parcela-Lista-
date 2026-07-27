const EARTH_RADIUS_KM = 6371;

export function normalizeText(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

const number = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function haversineKm(first, second) {
  const firstLat = number(first?.lat), firstLng = number(first?.lng), secondLat = number(second?.lat), secondLng = number(second?.lng);
  if ([firstLat, firstLng, secondLat, secondLng].some(value => value === null)) return null;
  const radians = value => value * Math.PI / 180;
  const deltaLat = radians(secondLat - firstLat), deltaLng = radians(secondLng - firstLng);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(firstLat)) * Math.cos(radians(secondLat)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
  return value;
}

export function materialInput(data = {}) {
  return stableValue({
    region: normalizeText(data.region), comuna: normalizeText(data.comuna), sector: normalizeText(data.sector),
    superficie_m2: number(data.superficie_m2 ?? data.superficie),
    lat: number(data.lat ?? data.latitudPrivada), lng: number(data.lng ?? data.longitudPrivada),
    acceso: normalizeText(data.acceso), distancia_ruta_principal_km: number(data.distanciaRutaPrincipalKm ?? data.distancia_ruta_principal_km), topografia: normalizeText(data.topografia), agua: normalizeText(data.agua),
    luz: normalizeText(data.luz), rol: normalizeText(data.rol), uso: normalizeText(data.uso),
    condicion_legal: normalizeText(data.condicion_legal), subdivision: normalizeText(data.subdivision),
    zona_turistica: normalizeText(data.zona_turistica ?? data.zonaTuristica),
    acceso_rio: Boolean(data.acceso_rio ?? data.accesoRio),
    acceso_lago: Boolean(data.acceso_lago ?? data.accesoLago),
    cierre_perimetral: normalizeText(data.cierre_perimetral ?? data.cierrePerimetral ?? data.cierre),
    porton_acceso: normalizeText(data.porton_acceso ?? data.portonAcceso ?? data.porton),
    caminos_interiores: normalizeText(data.caminos_interiores ?? data.caminosInteriores ?? data.accesoVial),
    superficie_aprovechable: number(data.superficie_aprovechable ?? data.superficieAprovechable),
    vista_principal: normalizeText(data.vista_principal ?? data.vistaPrincipal),
    mejoras: Array.isArray(data.mejoras) ? data.mejoras.map(normalizeText).sort() : []
  });
}

export function routeDistanceAdjustment(distanceKm) {
  const km = number(distanceKm);
  if (km === null || km < 0) return { applied: false, pct: 0, discountPercent: 0, label: 'Sin dato de distancia a ruta principal', distanceKm: null };
  const bands = [
    { max: 5, discountPercent: 0, label: '0 a 5 km' },
    { max: 10, discountPercent: 10, label: '6 a 10 km' },
    { max: 20, discountPercent: 15, label: '11 a 20 km' },
    { max: 30, discountPercent: 20, label: '21 a 30 km' },
    { max: 40, discountPercent: 30, label: '31 a 40 km' },
    { max: 50, discountPercent: 40, label: '41 a 50 km' },
    { max: 60, discountPercent: 50, label: '51 a 60 km' },
    { max: Infinity, discountPercent: 60, label: 'Más de 60 km' }
  ];
  const band = bands.find(item => km <= item.max) || bands.at(-1);
  return { applied: band.discountPercent > 0, pct: -band.discountPercent / 100, discountPercent: band.discountPercent, label: band.label, distanceKm: Number(km.toFixed(1)) };
}

export function propertyIdentityInput(data = {}) {
  const material = materialInput(data);
  return stableValue({ region: material.region, comuna: material.comuna, sector: material.sector, superficie_m2: material.superficie_m2, lat: material.lat === null ? null : Number(material.lat.toFixed(5)), lng: material.lng === null ? null : Number(material.lng.toFixed(5)) });
}

function ageDays(value, now) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) && timestamp > 0 ? Math.max(0, Math.floor((now.getTime() - timestamp) / 86400000)) : null;
}

function surfaceSimilarity(subjectSurface, comparableSurface) {
  const smaller = Math.min(subjectSurface, comparableSurface), larger = Math.max(subjectSurface, comparableSurface);
  return larger > 0 ? smaller / larger : 0;
}

export const SIMILARITY_WEIGHTS = {
  surface: 0.22, location: 0.22, legalStatus: 0.12, access: 0.10, water: 0.08, electricity: 0.08, topography: 0.06, usableSurface: 0.05, riverOrLake: 0.03, fencingAndGate: 0.02, internalRoads: 0.02
};

function featureSimilarity(subject, comparable) {
  const checks = [
    { field: 'acceso', weight: SIMILARITY_WEIGHTS.access, match: (s, c) => normalizeText(s.acceso) === normalizeText(c.acceso) },
    { field: 'topografia', weight: SIMILARITY_WEIGHTS.topography, match: (s, c) => normalizeText(s.topografia) === normalizeText(c.topografia) },
    { field: 'agua', weight: SIMILARITY_WEIGHTS.water, match: (s, c) => normalizeText(s.agua) === normalizeText(c.agua) },
    { field: 'luz', weight: SIMILARITY_WEIGHTS.electricity, match: (s, c) => normalizeText(s.luz) === normalizeText(c.luz) },
    { field: 'rol', weight: SIMILARITY_WEIGHTS.legalStatus, match: (s, c) => normalizeText(s.rol || s.condicion_legal) === normalizeText(c.rol || c.condicion_legal) },
    { field: 'cierre_perimetral', weight: SIMILARITY_WEIGHTS.fencingAndGate, match: (s, c) => normalizeText(s.cierre_perimetral) === normalizeText(c.cierre_perimetral) },
    { field: 'porton_acceso', weight: SIMILARITY_WEIGHTS.fencingAndGate, match: (s, c) => normalizeText(s.porton_acceso) === normalizeText(c.porton_acceso) },
    { field: 'caminos_interiores', weight: SIMILARITY_WEIGHTS.internalRoads, match: (s, c) => normalizeText(s.caminos_interiores) === normalizeText(c.caminos_interiores) },
    { field: 'acceso_rio', weight: SIMILARITY_WEIGHTS.riverOrLake, match: (s, c) => Boolean(s.acceso_rio || s.acceso_lago) === Boolean(c.acceso_rio || c.acceso_lago) },
    { field: 'superficie_aprovechable', weight: SIMILARITY_WEIGHTS.usableSurface, match: (s, c) => Math.abs((number(s.superficie_aprovechable) || 100) - (number(c.superficie_aprovechable) || 100)) <= 15 }
  ];
  let totalWeight = 0, matchedWeight = 0;
  for (const check of checks) {
    if (subject[check.field] !== undefined || comparable[check.field] !== undefined || ['rol', 'agua', 'topografia'].includes(check.field)) {
      totalWeight += check.weight;
      if (check.match(subject, comparable)) matchedWeight += check.weight;
    }
  }
  return totalWeight === 0 ? 0.5 : matchedWeight / totalWeight;
}

function sourceWeight(sourceType) {
  if (sourceType === 'precio_final_verificado') return 1;
  if (sourceType === 'precio_final_declarado') return 0.8;
  return 0.55;
}

function recencyWeight(days, maxDays) {
  if (days === null) return 0.3;
  if (days <= 180) return 1;
  if (days <= 365) return 0.8;
  if (days <= 730) return 0.55;
  return days <= maxDays ? 0.35 : 0;
}

function distanceWeight(distance, maxDistance) {
  if (distance === null) return 0.35;
  if (distance <= 25) return 1;
  if (distance <= 75) return 0.7;
  if (distance <= maxDistance) return 0.4;
  return 0;
}

function weightedQuantile(rows, quantile) {
  const sorted = [...rows].sort((first, second) => first.priceM2 - second.priceM2);
  const total = sorted.reduce((sum, row) => sum + row.weight, 0);
  let accumulated = 0;
  for (const row of sorted) {
    accumulated += row.weight;
    if (accumulated >= total * quantile) return row.priceM2;
  }
  return sorted.at(-1)?.priceM2 ?? null;
}

function deduplicate(rows) {
  const selected = new Map();
  for (const row of rows) {
    const coordinateKey = row.lat !== null && row.lng !== null ? `${Number(row.lat).toFixed(4)}:${Number(row.lng).toFixed(4)}` : `${normalizeText(row.comuna)}:${normalizeText(row.sector)}:${Math.round(row.surface / 500)}`;
    const existing = selected.get(coordinateKey);
    if (!existing || new Date(row.date || 0) > new Date(existing.date || 0)) selected.set(coordinateKey, row);
  }
  return [...selected.values()];
}

export function calculateStage(valueBefore, operation, factor) {
  const num = Number(valueBefore) || 0;
  const pct = Number(factor) || 0;
  if (operation === 'additive' || operation === 'multiplicative') {
    return Math.round((num * (1 + pct)) / 10000) * 10000;
  }
  if (operation === 'replacement') {
    return Math.round((num * pct) / 10000) * 10000;
  }
  return num;
}

export function calculateValuation(subject = {}, records = [], parameters = {}, now = new Date()) {
  const startTime = Date.now();
  const surface = number(subject.superficie_m2 ?? subject.superficie), enteredPrice = number(subject.precio_ingresado ?? subject.precio);
  const minimum = Number(parameters.comparables_minimos || 3), maximum = Number(parameters.comparables_maximos || 15);
  const maxAge = Number(parameters.antiguedad_maxima_dias || 1095), maxDistance = Number(parameters.distancia_maxima_km || 150);
  if (!surface || surface <= 0 || !normalizeText(subject.comuna)) return insufficient('Faltan superficie o comuna válidas.', enteredPrice, [], startTime);
  const subjectLocation = { lat: subject.lat ?? subject.latitudPrivada, lng: subject.lng ?? subject.longitudPrivada };
  
  const prepared = records.map(record => {
    const comparableSurface = number(record.superficie_m2 ?? record.superficie), price = number(record.precio ?? record.precio_publicacion ?? record.precio_final);
    if (!comparableSurface || comparableSurface <= 0 || !price || price <= 0) return null;
    const distance = haversineKm(subjectLocation, { lat: record.lat ?? record.latitud_privada, lng: record.lng ?? record.longitud_privada });
    const days = ageDays(record.fecha ?? record.actualizado_en ?? record.creado_en, now);
    const sameCommune = normalizeText(subject.comuna) === normalizeText(record.comuna), sameRegion = normalizeText(subject.region) === normalizeText(record.region);
    if (!sameCommune && !sameRegion) return null;
    if (days !== null && days > maxAge) return null;
    const surfaceScore = surfaceSimilarity(surface, comparableSurface);
    if (surfaceScore < Number(parameters.superficie_relacion_minima || 0.25)) return null;
    const geoWeight = distanceWeight(distance, maxDistance);
    if (!geoWeight) return null;
    const zoneWeight = sameCommune ? 1 : 0.45, features = featureSimilarity(subject, record), source = sourceWeight(record.fuente_tipo || 'precio_publicado_solicitado');
    const weight = Math.max(0.05, zoneWeight * 0.3 + surfaceScore * 0.25 + geoWeight * 0.2 + recencyWeight(days, maxAge) * 0.1 + features * 0.05 + source * 0.1);
    return { id: record.id || record.fuente_id || null, sourceType: record.fuente_tipo || 'precio_publicado_solicitado', region: record.region, comuna: record.comuna, sector: record.sector || '', surface: comparableSurface, price, priceM2: price / comparableSurface, lat: number(record.lat ?? record.latitud_privada), lng: number(record.lng ?? record.longitud_privada), distance, days, sameCommune, surfaceScore, featureScore: features, weight, date: record.fecha ?? record.actualizado_en ?? record.creado_en };
  }).filter(Boolean);

  const sameCommune = deduplicate(prepared.filter(row => row.sameCommune)).sort((first, second) => second.weight - first.weight);
  const regional = deduplicate(prepared.filter(row => !row.sameCommune)).sort((first, second) => second.weight - first.weight);
  const selected = [...sameCommune, ...regional].slice(0, maximum);
  if (selected.length < minimum) return insufficient(`Solo existen ${selected.length} comparables válidos.`, enteredPrice, selected, startTime);

  const q20 = weightedQuantile(selected, 0.2), q25 = weightedQuantile(selected, 0.25), median = weightedQuantile(selected, 0.5), q80 = weightedQuantile(selected, 0.8);
  const round = value => Math.round(value / 10000) * 10000;
  
  // Protocolo Antibucle y Proximidad
  const sameCommuneCount = selected.filter(r => r.sameCommune).length;
  const avgDistance = selected.length > 0 && selected[0].distance !== null ? selected.reduce((sum, r) => sum + (r.distance || 0), 0) / selected.length : 999;
  const proximityAlreadyReflectedInComparables = sameCommuneCount >= 3 && avgDistance <= 20;
  
  const routeAdjustment = routeDistanceAdjustment(subject.distanciaRutaPrincipalKm ?? subject.distancia_ruta_principal_km);
  const routePct = proximityAlreadyReflectedInComparables ? 0 : routeAdjustment.pct;
  const proximityInfo = {
    proximityApplied: !proximityAlreadyReflectedInComparables && routePct !== 0,
    proximityFactor: routePct,
    proximityDecision: proximityAlreadyReflectedInComparables ? 'already_reflected' : (routePct !== 0 ? 'applied' : 'no_data'),
    proximityReason: proximityAlreadyReflectedInComparables ? 'Los comparables aceptados pertenecen al mismo continuo urbano y ya reflejan la cercanía.' : (routePct !== 0 ? `Ajuste aplicado por distancia a ruta principal (${routeAdjustment.distanceKm} km).` : 'Sin datos suficientes de cercanía o ruta principal.')
  };

  // Corrección de escala: turismo 0.30 en vez de 3
  const tourism = normalizeText(subject.zona_turistica ?? subject.zonaTuristica);
  const tourismPct = tourism === 'nacional' ? Number(parameters.ajuste_turismo_nacional ?? 0.30) : tourism === 'local' ? Number(parameters.ajuste_turismo_local ?? 0.20) : 0;
  const riverPct = Boolean(subject.acceso_rio ?? subject.accesoRio) ? Number(parameters.ajuste_acceso_rio ?? 0.10) : 0;
  const lakePct = Boolean(subject.acceso_lago ?? subject.accesoLago) ? Number(parameters.ajuste_acceso_lago ?? 0.12) : 0;

  // Cálculo secuencial por etapas (Explainable Valuation)
  const baseTotalValue = Math.round(median * surface);
  let currentVal = baseTotalValue;
  const stageBreakdown = [];
  let order = 1;

  stageBreakdown.push({
    order: order++, ruleId: 'base_comparable', stage: 'base', name: 'Valor base comparable del cuantil Q50',
    operation: 'informative', factor: 0, valueBefore: baseTotalValue, adjustmentAmount: 0, valueAfter: baseTotalValue,
    source: 'tpl-engine-market-quantiles', configVersion: '2026.07', applied: true, reason: `Mediana de mercado calculada en $${Math.round(median)}/m² con ${selected.length} comparables.`
  });

  // Etapa Servicios (Agua/Luz)
  const aguaNorm = normalizeText(subject.agua);
  let waterPct = 0, waterReason = 'Sin información o sin red.';
  if (aguaNorm.includes('apr') || aguaNorm.includes('red') || aguaNorm.includes('conectada')) { waterPct = 0.15; waterReason = 'La propiedad declara APR o red pública conectada.'; }
  else if (aguaNorm.includes('pozo') && aguaNorm.includes('inscrito')) { waterPct = 0.10; waterReason = 'La propiedad declara pozo profundo inscrito.'; }
  else if (aguaNorm.includes('pozo')) { waterPct = 0.05; waterReason = 'La propiedad declara agua de pozo no inscrita.'; }
  if (waterPct !== 0) {
    const nextVal = calculateStage(currentVal, 'multiplicative', waterPct);
    stageBreakdown.push({
      order: order++, ruleId: 'water_supply', stage: 'services', name: 'Abastecimiento de agua potable',
      operation: 'multiplicative', factor: waterPct, valueBefore: currentVal, adjustmentAmount: nextVal - currentVal, valueAfter: nextVal,
      source: 'tpl-land-rules', configVersion: '2026.07', applied: true, reason: waterReason
    });
    currentVal = nextVal;
  }

  // Etapa Topografía / Superficie aprovechable
  const topoNorm = normalizeText(subject.topografia);
  let topoPct = 0, topoReason = 'Topografía estándar o lomaje suave.';
  if (topoNorm.includes('pendiente fuerte') || topoNorm.includes('quebrada') || topoNorm.includes('escarpado')) { topoPct = -0.15; topoReason = 'Pendiente pronunciada o quebrada que reduce área útil.'; }
  else if (topoNorm.includes('pendiente')) { topoPct = -0.08; topoReason = 'Pendiente moderada en el predio.'; }
  if (topoPct !== 0) {
    const nextVal = calculateStage(currentVal, 'multiplicative', topoPct);
    stageBreakdown.push({
      order: order++, ruleId: 'topography_slope', stage: 'topography', name: 'Relieve y topografía',
      operation: 'multiplicative', factor: topoPct, valueBefore: currentVal, adjustmentAmount: nextVal - currentVal, valueAfter: nextVal,
      source: 'tpl-land-rules', configVersion: '2026.07', applied: true, reason: topoReason
    });
    currentVal = nextVal;
  }

  // Etapa Cercanía Urbana
  if (routePct !== 0 || proximityAlreadyReflectedInComparables) {
    const nextVal = calculateStage(currentVal, proximityAlreadyReflectedInComparables ? 'informative' : 'multiplicative', routePct);
    stageBreakdown.push({
      order: order++, ruleId: 'urban_proximity_route', stage: 'urban_proximity', name: 'Distancia a ruta principal / polo urbano',
      operation: proximityAlreadyReflectedInComparables ? 'informative' : 'multiplicative', factor: routePct, valueBefore: currentVal, adjustmentAmount: nextVal - currentVal, valueAfter: nextVal,
      source: 'tpl-distance-rules', configVersion: '2026.07', applied: !proximityAlreadyReflectedInComparables && routePct !== 0, reason: proximityInfo.proximityReason
    });
    currentVal = nextVal;
  }

  // Etapa Situación Legal
  const rolNorm = normalizeText(subject.rol || subject.condicion_legal);
  let legalPct = 0, legalReason = 'Rol propio individual.';
  if (rolNorm.includes('tramite') || rolNorm.includes('en tramite')) { legalPct = -0.20; legalReason = 'Rol propio en trámite de asignación.'; }
  else if (rolNorm.includes('cesion') || rolNorm.includes('derechos')) { legalPct = -0.50; legalReason = 'Venta de derechos o acciones sin rol propio individual.'; }
  if (legalPct !== 0) {
    const nextVal = calculateStage(currentVal, 'multiplicative', legalPct);
    stageBreakdown.push({
      order: order++, ruleId: 'legal_status_rol', stage: 'legal_status', name: 'Situación legal y registral',
      operation: 'multiplicative', factor: legalPct, valueBefore: currentVal, adjustmentAmount: nextVal - currentVal, valueAfter: nextVal,
      source: 'tpl-land-rules', configVersion: '2026.07', applied: true, reason: legalReason
    });
    currentVal = nextVal;
  }

  // Etapa Primas Comerciales (Turismo / Río / Lago)
  if (tourismPct > 0) {
    const nextVal = calculateStage(currentVal, 'multiplicative', tourismPct);
    stageBreakdown.push({
      order: order++, ruleId: `tourism_${tourism}`, stage: 'commercial_premiums', name: `Zona turística ${tourism}`,
      operation: 'multiplicative', factor: tourismPct, valueBefore: currentVal, adjustmentAmount: nextVal - currentVal, valueAfter: nextVal,
      source: 'tpl-commercial-premiums', configVersion: '2026.07', applied: true, reason: `Clasificación turística canónica (${tourism}).`
    });
    currentVal = nextVal;
  }
  if (riverPct > 0 || lakePct > 0) {
    const waterPremPct = riverPct + lakePct;
    const nextVal = calculateStage(currentVal, 'multiplicative', waterPremPct);
    stageBreakdown.push({
      order: order++, ruleId: riverPct > 0 ? 'river_access' : 'lake_access', stage: 'commercial_premiums', name: riverPct > 0 ? 'Bono acceso a río' : 'Bono acceso a lago',
      operation: 'multiplicative', factor: waterPremPct, valueBefore: currentVal, adjustmentAmount: nextVal - currentVal, valueAfter: nextVal,
      source: 'tpl-commercial-premiums', configVersion: '2026.07', applied: true, reason: 'Atributo fluvial o lacustre verificado en el predio.'
    });
    currentVal = nextVal;
  }

  const finalEstimatedValue = currentVal;
  const totalCumulativePct = Number(((finalEstimatedValue / baseTotalValue) - 1).toFixed(4));
  
  // Rango adaptado por dispersión canónica
  const ratioMin = q20 / median, ratioQuick = q25 / median, ratioMax = q80 / median;
  const minValue = round(finalEstimatedValue * ratioMin), quickValue = round(finalEstimatedValue * ratioQuick), maxValue = round(finalEstimatedValue * ratioMax);
  const marketValue = finalEstimatedValue;

  const verifiedCount = selected.filter(row => row.sourceType === 'precio_final_verificado').length;
  const coverage = selected.length >= Number(parameters.cobertura_suficiente_desde || 12) ? 'suficiente' : selected.length >= Number(parameters.cobertura_limitada_desde || 6) ? 'limitada' : 'experimental';
  
  // Índice de Confianza (Componente 2)
  const quantityScore = selected.length >= 12 ? 25 : selected.length >= 8 ? 20 : selected.length >= 5 ? 15 : selected.length >= 3 ? 10 : 0;
  const qualityScore = verifiedCount >= 5 ? 25 : verifiedCount >= 3 ? 20 : verifiedCount >= 1 ? 15 : 0;
  const coverageScore = sameCommuneCount >= 8 ? 20 : sameCommuneCount >= 3 ? 15 : 10;
  const auditedFields = [subject.comuna, subject.superficie_m2, subject.acceso, subject.topografia, subject.agua, subject.luz, subject.rol];
  const completeness = auditedFields.filter(Boolean).length;
  const completenessScore = completeness >= 7 ? 15 : completeness >= 5 ? 10 : 5;
  const dispersionPct = Number((((q80 - q20) / (median || 1)) * 100).toFixed(1));
  const statScore = dispersionPct <= 25 ? 15 : dispersionPct <= 45 ? 10 : 5;
  const rawScore = quantityScore + qualityScore + coverageScore + completenessScore + statScore;
  const totalScore = Math.min(verifiedCount === 0 ? 70 : 100, rawScore);
  const confidenceLevel = totalScore >= 75 ? 'alta' : totalScore >= 50 ? 'media' : 'preliminar';

  const confidenceIndex = {
    level: confidenceLevel, score: totalScore, methodologyVersion: 'tpl-confidence-v1',
    breakdown: { comparablesQuantityScore: quantityScore, comparablesQualityScore: qualityScore, territorialCoverageScore: coverageScore, dataCompletenessScore: completenessScore, statisticalBackingScore: statScore },
    comparableStats: { totalCandidates: prepared.length, acceptedComparables: selected.length, verifiedSales: verifiedCount, activeListings: selected.filter(row => row.sourceType === 'precio_publicado_solicitado').length, rejectedOutliers: Math.max(0, prepared.length - selected.length), medianPriceM2: Number(median.toFixed(0)), dispersionPct },
    factorsConsidered: [`Se utilizaron ${selected.length} antecedentes comparables en el área geográfica.`, verifiedCount > 0 ? `${verifiedCount} comparables corresponden a ventas finales verificadas en registro documental.` : 'No se identificaron ventas finales verificadas; estimación basada en publicaciones activas.', `Dispersión intercuartil del ${dispersionPct}% entre comparables aceptados.`],
    limitations: verifiedCount === 0 ? ['La estimación se basa en precios publicados/solicitados sin confirmar cierre final de venta.'] : [],
    warningFlags: dispersionPct > 45 ? ['Alta dispersión en los valores por m² de la zona, lo que sugiere heterogeneidad predial.'] : []
  };

  const difference = enteredPrice && marketValue ? Number((((enteredPrice - marketValue) / marketValue) * 100).toFixed(1)) : null;
  const position = difference === null ? 'sin_precio' : difference < -15 ? 'aparentemente_bajo' : difference < -5 ? 'competitivo' : difference <= 10 ? 'dentro_del_rango' : 'sobre_el_rango';
  
  const strengths = []; if (subjectLocation.lat && subjectLocation.lng) strengths.push('Ubicación utilizada para medir cercanía geográfica.'); if (subject.acceso) strengths.push('Acceso informado para comparar similitud.'); if (subject.agua || subject.luz) strengths.push('Servicios básicos informados.'); if (routeAdjustment.distanceKm !== null) strengths.push(`Distancia a ruta principal informada: ${routeAdjustment.distanceKm} km.`);
  const cautions = []; if (!verifiedCount) cautions.push('Los comparables disponibles corresponden a precios publicados, no a ventas verificadas.'); if (coverage !== 'suficiente') cautions.push('La cobertura del sector todavía es limitada.'); if (!subject.acceso || !subject.topografia) cautions.push('Faltan datos de acceso o topografía para mejorar la comparación.'); if (routeAdjustment.distanceKm === null) cautions.push('Falta la distancia a la ruta o carretera principal.');

  const explanation = {
    baseValuePerM2: Number(median.toFixed(0)), baseTotalValue, finalEstimatedValue, minimumEstimatedValue: minValue, maximumEstimatedValue: maxValue,
    stageBreakdown,
    summary: {
      surfaceAdjustmentPct: 0, urbanProximityPct: routePct, servicesAdjustmentPct: waterPct, topographyAdjustmentPct: topoPct, legalStatusPct: legalPct, commercialPremiumsPct: tourismPct + riverPct + lakePct
    }
  };

  const auditTrail = {
    valuationId: `val_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, requestId: parameters.requestId || `req_${Date.now()}`,
    engineVersion: 'tpl-engine-v3.1-canonical', catalogVersion: 'tpl-catalog-2026.07', configVersion: 'tpl-config-2026.07', confidenceMethodologyVersion: 'tpl-confidence-v1',
    createdAt: now.toISOString(), calculationStartedAt: new Date(startTime).toISOString(), calculationFinishedAt: new Date().toISOString(), calculationDurationMs: Date.now() - startTime,
    inputHash: `sha256_${normalizeText(subject.comuna)}_${surface}_${normalizeText(subject.rol)}_${normalizeText(subject.agua)}`,
    rulesAppliedIds: stageBreakdown.filter(s => s.applied).map(s => s.ruleId),
    selectedComparableIds: selected.map(r => String(r.id || '')).filter(Boolean), rejectedComparableIds: prepared.filter(r => !selected.includes(r)).map(r => String(r.id || '')).filter(Boolean),
    territorialResolution: { level: sameCommuneCount >= 3 ? 'commune' : sameCommuneCount > 0 ? 'city' : 'region', referenceId: normalizeText(subject.comuna), referenceName: subject.comuna || 'Chile', distanceKm: selected.length > 0 && selected[0].distance !== null ? Number(selected[0].distance.toFixed(1)) : 0 },
    proximityAlreadyReflectedInComparables, parametricFallbackUsed: selected.length < minimum, valuationMode: 'server_canonical', confidenceScore: totalScore, finalResult: { market: marketValue, quick: quickValue, patient: maxValue }
  };

  return {
    status: 'generated', valuationMode: 'server_canonical', backed: true, officialResult: true,
    range: { minimum: minValue, quick: quickValue, market: marketValue, maximum: maxValue },
    pricePerM2: Number(median.toFixed(0)), difference, position, confidence: confidenceLevel, confidenceScore: totalScore,
    coverage, comparableCount: selected.length, strengths: strengths.slice(0, 3), cautions: cautions.slice(0, 3),
    comparables: selected.map(row => ({ ...row, similarity: Number(row.surfaceScore.toFixed(4)), weight: Number(row.weight.toFixed(4)) })),
    routeAdjustment, proximityInfo, explanation, confidenceIndex, auditTrail, totalCumulativePct,
    factors: [
      { code: 'comparable_count', value: selected.length, weight: null, effect: null, explanation: `Se utilizaron ${selected.length} antecedentes comparables.`, source: 'datos_internos' },
      { code: 'source_quality', value: verifiedCount, weight: null, effect: null, explanation: verifiedCount ? `${verifiedCount} comparables tienen precio final verificado.` : 'No hay ventas verificadas entre los comparables utilizados.', source: 'datos_internos' },
      { code: 'route_distance', value: routeAdjustment.distanceKm, weight: routePct, effect: routePct, explanation: proximityInfo.proximityReason, source: 'dato_declarado' },
      { code: 'tourism_zone', value: tourism || 'none', weight: tourismPct, effect: tourismPct, explanation: tourismPct ? `Clasificación turística ${tourism}; ajuste comercial del ${tourismPct * 100}%.` : 'Sin clasificación turística aplicada.', source: 'dato_declarado' },
      { code: 'river_access', value: Boolean(subject.acceso_rio ?? subject.accesoRio), weight: riverPct, effect: riverPct, explanation: riverPct ? 'Acceso a río informado; ajuste comercial del 10%.' : 'Sin acceso a río aplicado.', source: 'dato_declarado' }
    ]
  };
}

function insufficient(reason, enteredPrice, comparables = [], startTime = Date.now()) {
  const nowStr = new Date().toISOString();
  return {
    status: 'insufficient', valuationMode: 'server_canonical', backed: false, officialResult: false,
    range: { minimum: null, quick: null, market: null, maximum: null },
    pricePerM2: null, difference: null, position: 'informacion_insuficiente', confidence: 'informacion_insuficiente', confidenceScore: 0,
    coverage: 'informacion_insuficiente', comparableCount: comparables.length, strengths: [], cautions: [reason, 'No se inventó un valor para completar la falta de antecedentes.'],
    comparables, proximityInfo: { proximityApplied: false, proximityFactor: 0, proximityDecision: 'no_data', proximityReason: reason },
    explanation: { baseValuePerM2: null, baseTotalValue: null, finalEstimatedValue: null, minimumEstimatedValue: null, maximumEstimatedValue: null, stageBreakdown: [], summary: {} },
    confidenceIndex: { level: 'preliminar', score: 0, methodologyVersion: 'tpl-confidence-v1', breakdown: {}, comparableStats: { totalCandidates: comparables.length, acceptedComparables: 0, verifiedSales: 0, activeListings: 0, rejectedOutliers: 0, medianPriceM2: 0, dispersionPct: 0 }, factorsConsidered: [], limitations: [reason], warningFlags: [] },
    auditTrail: { valuationId: `val_${Date.now()}`, requestId: `req_${Date.now()}`, engineVersion: 'tpl-engine-v3.1-canonical', catalogVersion: 'tpl-catalog-2026.07', configVersion: 'tpl-config-2026.07', confidenceMethodologyVersion: 'tpl-confidence-v1', createdAt: nowStr, calculationStartedAt: new Date(startTime).toISOString(), calculationFinishedAt: nowStr, calculationDurationMs: Date.now() - startTime, inputHash: 'insufficient_data', rulesAppliedIds: [], selectedComparableIds: [], rejectedComparableIds: [], territorialResolution: { level: 'country', referenceId: '', referenceName: '', distanceKm: 0 }, proximityAlreadyReflectedInComparables: false, parametricFallbackUsed: false, valuationMode: 'server_canonical', confidenceScore: 0, finalResult: { market: null, quick: null, patient: null } },
    factors: [{ code: 'insufficient_data', value: comparables.length, weight: null, effect: null, explanation: reason, source: 'datos_internos' }]
  };
}
