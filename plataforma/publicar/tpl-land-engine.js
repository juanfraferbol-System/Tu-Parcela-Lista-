(function(global){
  'use strict';

  const RULES = Object.freeze({
    surfaceBands: Object.freeze([
      Object.freeze({ upTo: 7000, rate: 2000 }),
      Object.freeze({ upTo: 10000, rate: 1000 }),
      Object.freeze({ upTo: Infinity, rate: 500 })
    ]),
    cityDistanceMultipliers: Object.freeze([
      Object.freeze({ maxKm: 10, multiplier: 10, label: '0 a 10 km' }),
      Object.freeze({ maxKm: 15, multiplier: 6, label: 'Más de 10 hasta 15 km' }),
      Object.freeze({ maxKm: 25, multiplier: 4, label: 'Más de 15 hasta 25 km' }),
      Object.freeze({ maxKm: 35, multiplier: 3, label: 'Más de 25 hasta 35 km' }),
      Object.freeze({ maxKm: 45, multiplier: 2, label: 'Más de 35 hasta 45 km' }),
      Object.freeze({ maxKm: Infinity, multiplier: 1, label: 'Más de 45 km' })
    ]),
    quickFactor: 0.90,
    patientFactor: 1.10,
    minimumAdjustmentFactor: 0.10
  });

  const normalize = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

  function roundPrice(value){
    return Math.round(Number(value || 0) / 10000) * 10000;
  }

  function calculateSurfaceBase(area){
    const safeArea = Math.max(0, Number(area) || 0);
    let previous = 0;
    let total = 0;
    const bands = [];

    for(const band of RULES.surfaceBands){
      const bandArea = Math.max(0, Math.min(safeArea, band.upTo) - previous);
      if(bandArea > 0){
        const amount = bandArea * band.rate;
        total += amount;
        bands.push({ from: previous + 1, to: Number.isFinite(band.upTo) ? Math.min(safeArea, band.upTo) : safeArea, area: bandArea, rate: band.rate, amount });
      }
      previous = band.upTo;
      if(safeArea <= band.upTo) break;
    }
    return { base: Math.round(total), area: safeArea, bands };
  }

  function distanceRule(distanceKm){
    const km = Math.max(0, Number(distanceKm) || 0);
    const band = RULES.cityDistanceMultipliers.find(item => km <= item.maxKm) || RULES.cityDistanceMultipliers.at(-1);
    return { distanceKm: km, multiplier: band.multiplier, label: band.label };
  }

  function santiagoAdjustment(region, comuna, sector){
    const r = normalize(region);
    if(!r.includes('metropolitana')) return null;
    const c = normalize(comuna);
    const s = normalize(sector);
    const premiumSector = /chicureo|la dehesa|lo barnechea/.test(`${c} ${s}`);
    const highDemand = /colina|calera de tango|pirque|buin|paine|lampa/.test(c);
    if(premiumSector) return { key:'santiago_premium', label:'Santiago · sector premium', pct:2.00 };
    if(highDemand) return { key:'santiago_alta_demanda', label:'Santiago · zona de alta demanda', pct:1.50 };
    return { key:'santiago_general', label:'Región Metropolitana de Santiago', pct:1.00 };
  }

  function citySpecialAdjustment(region, comuna, sector){
    const santiago = santiagoAdjustment(region, comuna, sector);
    if(santiago) return santiago;
    const c = normalize(comuna);
    if(c.includes('vina del mar')) return { key:'vina_del_mar', label:'Viña del Mar', pct:1.00 };
    return null;
  }

  function calculate(input){
    const area = Math.max(0, Number(input.area) || 0);
    if(!area) return { error:'La superficie debe ser mayor que cero.' };
    const distanceKm = Number(input.distanceKm);
    if(!Number.isFinite(distanceKm) || distanceKm < 0) return { error:'No fue posible determinar la distancia a una ciudad principal.' };

    const surfacePricing = calculateSurfaceBase(area);
    const distance = distanceRule(distanceKm);
    const commercialBase = Math.round(surfacePricing.base * distance.multiplier);
    const adjustments = [];
    const add = (key, label, pct, detail='') => adjustments.push({ key, label, pct, detail, amount:Math.round(commercialBase * pct) });

    const rol = normalize(input.rol);
    if(rol.includes('rol propio')) add('rol_propio','Rol propio',0.05);
    else if(rol) add('sin_rol_propio','Sin rol propio o situación equivalente',-0.15);

    const electricity = normalize(input.electricity);
    if(/conectada|empalme instalado/.test(electricity)) add('luz_conectada','Empalme o conexión eléctrica',0.15);
    else if(/postacion|factibilidad/.test(electricity)) add('luz_factible','Factibilidad eléctrica',0.10);

    const topography = normalize(input.topography);
    if(/completamente plana|mayormente plana/.test(topography)) add('terreno_plano','Terreno plano',0.20);

    const nature = (input.nature || []).map(normalize);
    if(nature.some(item => item.includes('rio dentro') || item === 'rio')) add('acceso_rio','Acceso a río',0.30);
    if(nature.some(item => item.includes('vertiente'))) add('vertiente','Vertiente natural',0.20);

    const tourism = normalize(input.tourism);
    if(tourism === 'nacional') add('turismo_nacional','Sector turístico nacional',3.00);
    else if(tourism === 'local') add('turismo_local','Sector turístico local',0.20);

    const view = normalize(input.view);
    if(view.includes('mar')) add('vista_mar','Vista al mar',0.30);
    else if(view.includes('lago') || view.includes('laguna')) add('vista_lago','Vista a lago o laguna',0.30);
    else if(view.includes('cordillera')) add('vista_cordillera','Vista a cordillera',0.20);

    const routeKm = Math.max(0, Number(input.routeDistanceKm) || 0);
    const routePenaltyPct = Math.min(routeKm, 30) / 100;
    if(routeKm > 0) add(
      'distancia_ruta',
      `Distancia a ruta principal (${routeKm.toFixed(1)} km)`,
      -routePenaltyPct,
      routeKm > 30 ? '-1% por km, con descuento máximo de -30%' : '-1% por cada kilómetro'
    );

    const fencing = normalize(input.fencing);
    if(fencing.includes('completamente')) add('cercada','Completamente cercada',0.10);
    else if(fencing.includes('sin cierre')) add('sin_cierre','Sin cierre perimetral',-0.10);

    if(normalize(input.condominium) === 'si') add('condominio','Propiedad en condominio o loteo',0.20);

    const gate = normalize(input.gate);
    if(/porton instalado|porton automatico|acceso controlado/.test(gate)) add('porton','Portón o acceso controlado',0.05);

    const vegetation = normalize(input.vegetation);
    if(vegetation.includes('bosque nativo') || nature.some(item => item.includes('bosque nativo'))) add('bosque_nativo','Bosque nativo',0.10);

    const soil = normalize(input.soil);
    if(soil.includes('seco')) add('suelo_seco','Suelo seco',-0.05);

    const cityAdj = citySpecialAdjustment(input.region, input.comuna, input.sector);
    if(cityAdj) add(cityAdj.key, cityAdj.label, cityAdj.pct);

    const totalPct = adjustments.reduce((sum,item) => sum + item.pct, 0);
    const appliedFactor = Math.max(RULES.minimumAdjustmentFactor, 1 + totalPct);
    const ideal = roundPrice(commercialBase * appliedFactor);
    const quick = roundPrice(ideal * RULES.quickFactor);
    const patient = roundPrice(ideal * RULES.patientFactor);
    const asking = Number(input.asking) || 0;
    const diff = asking && ideal ? ((asking - ideal) / ideal * 100) : 0;

    return {
      quick, ideal, patient, reference:ideal, low:quick, high:patient,
      asking, diff, area, location:input.location || '', region:input.region || '', comuna:input.comuna || '',
      base:surfacePricing.base, surfacePricing, commercialBase,
      cityDistance:distance, distanceMultiplier:distance.multiplier,
      nearestCity: input.nearestCity ? { name:input.nearestCity.name, distanceKm:Number(distanceKm.toFixed(1)) } : null,
      adjustments, totalPct, adjustmentFactor:appliedFactor,
      score:Math.max(35,Math.min(95,55 + Math.min(30, adjustments.length * 3))),
      coverage:'reglas_tpl_propietario_v1', source:'tpl_land_engine_local', persisted:false,
      method:'tpl-land-engine-v1',
      cautions: distanceKm > 45 ? ['Para distancias superiores a 45 km se utiliza multiplicador ×1 hasta definir un tramo adicional.'] : []
    };
  }

  global.TPLLandEngine = Object.freeze({ RULES, calculateSurfaceBase, distanceRule, calculate });
})(window);
