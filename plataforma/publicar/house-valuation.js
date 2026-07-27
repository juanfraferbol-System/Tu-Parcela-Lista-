(()=>{
'use strict';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const num=v=>Number(v)||0;
const yearNow=new Date().getFullYear();

function getHouseConfig() {
  const cfg = window.TPL_VALUATION_CONFIG && window.TPL_VALUATION_CONFIG.houseRules;
  if (cfg) return cfg;
  return {
    baseM2: {madera:{value:520000},metalcon:{value:600000},sip:{value:650000},albanileria:{value:720000},hormigon:{value:820000},mixta:{value:680000}},
    quality: {economica:{value:-.10},estandar:{value:0},buena:{value:.07},premium:{value:.15}},
    condition: {nueva:{value:.06},excelente:{value:.04},'muy buena':{value:.02},buena:{value:0},'necesita mejoras':{value:-.10},'para remodelar':{value:-.22}},
    regularization: {'recepcion final':{value:.04},'totalmente regularizada':{value:.04},'regularizada parcialmente':{value:-.04},'en tramite':{value:-.07},'sin regularizar':{value:-.15},'no lo se':{value:-.05}},
    sanitary: {"alcantarillado o fosa normalizada":{value:0.04},"fosa informal o pozo negro":{value:-0.18},"sin sistema":{value:-0.25}},
    waterSupply: {"red publica o apr":{value:0.04},"pozo propio profundo":{value:0.02},"camion aljibe o precario":{value:-0.12}},
    sanitaryDensityThreshold: {value:0.35},
    sanitaryDensityDiscountPct: {value:-0.06},
    maxPositive: {value:.35},
    maxNegative: {value:-.55}
  };
}

function valOf(item) {
  if (!item || item.enabled === false) return 0;
  return typeof item.value === 'number' ? item.value : (typeof item.pct === 'number' ? item.pct : 0);
}

function mapOf(obj) {
  if (!obj) return {};
  const res = {};
  for (const [k, v] of Object.entries(obj)) res[norm(k)] = valOf(v);
  return res;
}

const RULES={
 get baseM2() { return mapOf(getHouseConfig().baseM2); },
 get quality() { return mapOf(getHouseConfig().quality); },
 get condition() { return mapOf(getHouseConfig().condition); },
 get regularization() { return mapOf(getHouseConfig().regularization); },
 get sanitary() { return mapOf(getHouseConfig().sanitary); },
 get waterSupply() { return mapOf(getHouseConfig().waterSupply); },
 get maxPositive() { return valOf(getHouseConfig().maxPositive) || 0.35; },
 get maxNegative() { return valOf(getHouseConfig().maxNegative) || -0.55; },
 remodeling:{parcial:.02,importante:.05,integral:.08},
 road:{pavimentado:.04,'ripio en buen estado':.02,'ripio transitable':0,'tierra en buen estado':-.03,'acceso dificil':-.08},
 insulation:{buena:.03,estandar:0,deficiente:-.05},
 windows:{termopanel:.03,'vidrio simple en buen estado':0,'vidrio simple antiguo':-.03},
 extras:{terraza:.02,quincho:.03,piscina:.04,bodega:.015,logia:.01,chimenea:.015,'jardin formado':.02,'vista panoramica':.04,'acceso a rio o lago':.04,'bosque o entorno nativo':.025},
 age:[{max:5,pct:0},{max:10,pct:-.03},{max:15,pct:-.06},{max:20,pct:-.10},{max:30,pct:-.16},{max:40,pct:-.24},{max:50,pct:-.32},{max:999,pct:-.40}],
 centerMinutes:[{max:10,pct:.06},{max:20,pct:.04},{max:30,pct:.02},{max:45,pct:0},{max:60,pct:-.03},{max:999,pct:-.07}],
 centerKm:[{max:5,pct:.06},{max:12,pct:.04},{max:20,pct:.02},{max:35,pct:0},{max:55,pct:-.03},{max:999,pct:-.07}]
};
function pick(map,value){return map[norm(value)]||0;}
function bracket(list,value){if(!value)return 0;return (list.find(x=>value<=x.max)||list[list.length-1]).pct;}
function calculate(input={}){
 const area=num(input.area); if(!area)return {error:'Indica la superficie construida de la casa.'};
 const material=norm(input.material); const baseM2=RULES.baseM2[material];
 if(!baseM2)return {error:'Selecciona el material principal para calcular el valor de la vivienda.'};
 const adjustments=[]; const add=(label,pct)=>{if(pct)adjustments.push({label,pct});};
 add('Calidad constructiva',pick(RULES.quality,input.quality));
 add('Estado de conservación',pick(RULES.condition,input.condition));
 add('Regularización de la vivienda',pick(RULES.regularization,input.regularization));
 const age=input.year?Math.max(0,yearNow-num(input.year)):0; if(input.year)add(`Antigüedad aproximada: ${age} años`,bracket(RULES.age,age));
 add('Remodelación informada',pick(RULES.remodeling,input.remodeling));
 const proximity=input.minutesToCenter?bracket(RULES.centerMinutes,num(input.minutesToCenter)):bracket(RULES.centerKm,num(input.kmToCenter));
 add(input.minutesToCenter?'Tiempo al centro urbano':'Distancia al centro urbano',proximity);
 add('Tipo de camino',pick(RULES.road,input.road)); add('Aislación térmica',pick(RULES.insulation,input.insulation)); add('Ventanas',pick(RULES.windows,input.windows));
 const wNorm = norm(input.water || input.aguaCasa);
 if (wNorm.includes('red') || wNorm.includes('apr') || wNorm === 'mixta') add('Agua potable / APR', pick(RULES.waterSupply, 'red publica o apr'));
 else if (wNorm.includes('pozo') || wNorm.includes('vertiente')) add('Agua de pozo', pick(RULES.waterSupply, 'pozo propio profundo'));
 else if (wNorm.includes('camion') || wNorm.includes('precario')) add('Abastecimiento precario de agua', pick(RULES.waterSupply, 'camion aljibe o precario'));
 const sNorm = norm(input.sanitary || input.sanitarioCasa);
 if (sNorm.includes('alcantarillado') || sNorm.includes('fosa septica') || sNorm.includes('normalizada') || sNorm.includes('planta')) add('Sistema sanitario normalizado', pick(RULES.sanitary, 'alcantarillado o fosa normalizada'));
 else if (sNorm.includes('pozo negro') || sNorm.includes('informal') || sNorm === 'no lo se') add('Sistema sanitario informal', pick(RULES.sanitary, 'fosa informal o pozo negro'));
 else if (sNorm.includes('sin')) add('Sin descarga sanitaria', pick(RULES.sanitary, 'sin sistema'));
 const dorms = num(input.bedrooms), banos = num(input.bathrooms);
 if (dorms > 0 && banos > 0 && (banos / dorms) < (valOf(getHouseConfig().sanitaryDensityThreshold) || 0.35)) {
   add(`Déficit densidad sanitaria (${banos} baño/s para ${dorms} dorms)`, valOf(getHouseConfig().sanitaryDensityDiscountPct) || -0.06);
 }
 for(const extra of input.extras||[])add(extra,pick(RULES.extras,extra));
 let total=adjustments.reduce((s,x)=>s+x.pct,0); total=Math.max(RULES.maxNegative,Math.min(RULES.maxPositive,total));
 const base=Math.round(area*baseM2); const ideal=Math.round(base*(1+total)/10000)*10000;
 const quick=Math.round(ideal*.92/10000)*10000,patient=Math.round(ideal*1.09/10000)*10000,asking=num(input.asking),diff=asking&&ideal?((asking-ideal)/ideal*100):0;
 const auditedFields=[input.material,input.quality,input.condition,input.year,input.regularization,input.remodeling,input.minutesToCenter||input.kmToCenter,input.road,input.insulation,input.windows,input.water||input.aguaCasa,input.sanitary||input.sanitarioCasa,input.heating,input.parking,input.bedrooms,input.bathrooms,input.floors];
 const completeness=auditedFields.filter(value=>value!==null&&value!==undefined&&value!=='').length;
 const fieldCoverage={present:completeness,total:auditedFields.length,pct:Math.round(completeness/auditedFields.length*100),label:completeness>=14?'Completa':completeness>=9?'Suficiente':'Inicial'};
 const cautions=[];
 if(!input.water&&!input.aguaCasa||!input.sanitary&&!input.sanitarioCasa)cautions.push('Agua y solución sanitaria son fundamentales para la valorización de la vivienda.');
 if(!input.bedrooms||!input.bathrooms)cautions.push('Dormitorios y baños determinan el Índice de Densidad Sanitaria de la construcción.');
 cautions.push('Valor estimado solo de la construcción. No incluye el terreno.');
 return {quick,ideal,patient,reference:ideal,low:quick,high:patient,asking,diff,area,location:input.location,region:input.region,base,basePriceM2:baseM2,totalPct:total,adjustments,score:Math.min(92,35+Math.round(fieldCoverage.pct*.57)),coverage:'reglas_construccion',fieldCoverage,cautions,method:'tpl-house-rules-pilot-v2',houseOnly:true,urbanReference:input.urbanReference||'',note:'Valor estimado solo de la construcción. No incluye el terreno ni modifica el tasador de parcelas.'};
}
window.TPLHouseValuation={RULES,calculate};
})();

