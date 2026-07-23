(()=>{
'use strict';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const num=v=>Number(v)||0;
const yearNow=new Date().getFullYear();
const RULES={
 baseM2:{madera:520000,metalcon:600000,sip:650000,albanileria:720000,hormigon:820000,mixta:680000},
 quality:{economica:-.10,estandar:0,buena:.07,premium:.15},
 condition:{nueva:.06,excelente:.04,'muy buena':.02,buena:0,'necesita mejoras':-.10,'para remodelar':-.22},
 regularization:{'recepcion final':.04,'totalmente regularizada':.04,'regularizada parcialmente':-.04,'en tramite':-.07,'sin regularizar':-.15,'no lo se':-.05},
 remodeling:{parcial:.02,importante:.05,integral:.08},
 road:{pavimentado:.04,'ripio en buen estado':.02,'ripio transitable':0,'tierra en buen estado':-.03,'acceso dificil':-.08},
 insulation:{buena:.03,estandar:0,deficiente:-.05},
 windows:{termopanel:.03,'vidrio simple en buen estado':0,'vidrio simple antiguo':-.03},
 extras:{terraza:.02,quincho:.03,piscina:.04,bodega:.015,logia:.01,chimenea:.015,'jardin formado':.02,'vista panoramica':.04,'acceso a rio o lago':.04,'bosque o entorno nativo':.025},
 age:[{max:5,pct:0},{max:10,pct:-.03},{max:15,pct:-.06},{max:20,pct:-.10},{max:30,pct:-.16},{max:40,pct:-.24},{max:50,pct:-.32},{max:999,pct:-.40}],
 centerMinutes:[{max:10,pct:.06},{max:20,pct:.04},{max:30,pct:.02},{max:45,pct:0},{max:60,pct:-.03},{max:999,pct:-.07}],
 centerKm:[{max:5,pct:.06},{max:12,pct:.04},{max:20,pct:.02},{max:35,pct:0},{max:55,pct:-.03},{max:999,pct:-.07}],
 maxPositive:.35,maxNegative:-.55
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
 for(const extra of input.extras||[])add(extra,pick(RULES.extras,extra));
 let total=adjustments.reduce((s,x)=>s+x.pct,0); total=Math.max(RULES.maxNegative,Math.min(RULES.maxPositive,total));
 const base=Math.round(area*baseM2); const ideal=Math.round(base*(1+total)/10000)*10000;
 const quick=Math.round(ideal*.92/10000)*10000,patient=Math.round(ideal*1.09/10000)*10000,asking=num(input.asking),diff=asking&&ideal?((asking-ideal)/ideal*100):0;
 const auditedFields=[input.material,input.quality,input.condition,input.year,input.regularization,input.remodeling,input.minutesToCenter||input.kmToCenter,input.road,input.insulation,input.windows,input.water,input.sanitary,input.heating,input.parking,input.bedrooms,input.bathrooms,input.floors];
 const completeness=auditedFields.filter(value=>value!==null&&value!==undefined&&value!=='').length;
 const fieldCoverage={present:completeness,total:auditedFields.length,pct:Math.round(completeness/auditedFields.length*100),label:completeness>=14?'Completa':completeness>=9?'Suficiente':'Inicial'};
 const cautions=[];
 if(!input.water||!input.sanitary)cautions.push('Agua y solución sanitaria mejoran la calidad del informe, pero no alteran el precio sin una regla comercial aprobada.');
 if(!input.bedrooms||!input.bathrooms)cautions.push('Dormitorios y baños fueron auditados como cobertura; aún no cuentan con ponderación monetaria propia.');
 cautions.push('Valor estimado solo de la construcción. No incluye el terreno.');
 return {quick,ideal,patient,reference:ideal,low:quick,high:patient,asking,diff,area,location:input.location,region:input.region,base,basePriceM2:baseM2,totalPct:total,adjustments,score:Math.min(92,35+Math.round(fieldCoverage.pct*.57)),coverage:'reglas_construccion',fieldCoverage,cautions,method:'tpl-house-rules-pilot-v2',houseOnly:true,urbanReference:input.urbanReference||'',note:'Valor estimado solo de la construcción. No incluye el terreno ni modifica el tasador de parcelas.'};
}
window.TPLHouseValuation={RULES,calculate};
})();
