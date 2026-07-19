const EARTH_RADIUS_KM=6371;

export function normalizeText(value=''){
 return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}

const number=value=>{
 const parsed=Number(value);
 return Number.isFinite(parsed)?parsed:null;
};

export function haversineKm(first,second){
 const firstLat=number(first?.lat),firstLng=number(first?.lng),secondLat=number(second?.lat),secondLng=number(second?.lng);
 if([firstLat,firstLng,secondLat,secondLng].some(value=>value===null))return null;
 const radians=value=>value*Math.PI/180;
 const deltaLat=radians(secondLat-firstLat),deltaLng=radians(secondLng-firstLng);
 const a=Math.sin(deltaLat/2)**2+Math.cos(radians(firstLat))*Math.cos(radians(secondLat))*Math.sin(deltaLng/2)**2;
 return 2*EARTH_RADIUS_KM*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export function stableValue(value){
 if(Array.isArray(value))return value.map(stableValue);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stableValue(value[key])]));
 return value;
}

export function materialInput(data={}){
 return stableValue({
  region:normalizeText(data.region),comuna:normalizeText(data.comuna),sector:normalizeText(data.sector),
  superficie_m2:number(data.superficie_m2??data.superficie),
  lat:number(data.lat??data.latitudPrivada),lng:number(data.lng??data.longitudPrivada),
  acceso:normalizeText(data.acceso),distancia_ruta_principal_km:number(data.distanciaRutaPrincipalKm??data.distancia_ruta_principal_km),topografia:normalizeText(data.topografia),agua:normalizeText(data.agua),
  luz:normalizeText(data.luz),rol:normalizeText(data.rol),uso:normalizeText(data.uso),
  condicion_legal:normalizeText(data.condicion_legal),subdivision:normalizeText(data.subdivision),
  mejoras:Array.isArray(data.mejoras)?data.mejoras.map(normalizeText).sort():[]
 });
}


export function routeDistanceAdjustment(distanceKm){
 const km=number(distanceKm);
 if(km===null||km<0)return {applied:false,pct:0,discountPercent:0,label:'Sin dato de distancia a ruta principal',distanceKm:null};
 const bands=[
  {max:5,discountPercent:0,label:'0 a 5 km'},
  {max:10,discountPercent:10,label:'6 a 10 km'},
  {max:20,discountPercent:15,label:'11 a 20 km'},
  {max:30,discountPercent:20,label:'21 a 30 km'},
  {max:40,discountPercent:30,label:'31 a 40 km'},
  {max:50,discountPercent:40,label:'41 a 50 km'},
  {max:60,discountPercent:50,label:'51 a 60 km'},
  {max:Infinity,discountPercent:60,label:'Más de 60 km'}
 ];
 const band=bands.find(item=>km<=item.max)||bands.at(-1);
 return {applied:band.discountPercent>0,pct:-band.discountPercent/100,discountPercent:band.discountPercent,label:band.label,distanceKm:Number(km.toFixed(1))};
}

export function propertyIdentityInput(data={}){
 const material=materialInput(data);
 return stableValue({region:material.region,comuna:material.comuna,sector:material.sector,superficie_m2:material.superficie_m2,lat:material.lat===null?null:Number(material.lat.toFixed(5)),lng:material.lng===null?null:Number(material.lng.toFixed(5))});
}

function ageDays(value,now){
 const timestamp=new Date(value||0).getTime();
 return Number.isFinite(timestamp)&&timestamp>0?Math.max(0,Math.floor((now.getTime()-timestamp)/86400000)):null;
}

function surfaceSimilarity(subjectSurface,comparableSurface){
 const smaller=Math.min(subjectSurface,comparableSurface),larger=Math.max(subjectSurface,comparableSurface);
 return larger>0?smaller/larger:0;
}

function featureSimilarity(subject,comparable){
 const fields=['acceso','topografia','agua','luz','rol'];
 const available=fields.filter(field=>normalizeText(subject[field])&&normalizeText(comparable[field]));
 if(!available.length)return .5;
 return available.filter(field=>normalizeText(subject[field])===normalizeText(comparable[field])).length/available.length;
}

function sourceWeight(sourceType){
 if(sourceType==='precio_final_verificado')return 1;
 if(sourceType==='precio_final_declarado')return .8;
 return .55;
}

function recencyWeight(days,maxDays){
 if(days===null)return .3;
 if(days<=180)return 1;
 if(days<=365)return .8;
 if(days<=730)return .55;
 return days<=maxDays?.35:0;
}

function distanceWeight(distance,maxDistance){
 if(distance===null)return .35;
 if(distance<=25)return 1;
 if(distance<=75)return .7;
 if(distance<=maxDistance)return .4;
 return 0;
}

function weightedQuantile(rows,quantile){
 const sorted=[...rows].sort((first,second)=>first.priceM2-second.priceM2);
 const total=sorted.reduce((sum,row)=>sum+row.weight,0);
 let accumulated=0;
 for(const row of sorted){
  accumulated+=row.weight;
  if(accumulated>=total*quantile)return row.priceM2;
 }
 return sorted.at(-1)?.priceM2??null;
}

function deduplicate(rows){
 const selected=new Map();
 for(const row of rows){
  const coordinateKey=row.lat!==null&&row.lng!==null?`${Number(row.lat).toFixed(4)}:${Number(row.lng).toFixed(4)}`:`${normalizeText(row.comuna)}:${normalizeText(row.sector)}:${Math.round(row.surface/500)}`;
  const existing=selected.get(coordinateKey);
  if(!existing||new Date(row.date||0)>new Date(existing.date||0))selected.set(coordinateKey,row);
 }
 return [...selected.values()];
}

export function calculateValuation(subject={},records=[],parameters={},now=new Date()){
 const surface=number(subject.superficie_m2??subject.superficie),enteredPrice=number(subject.precio_ingresado??subject.precio);
 const minimum=Number(parameters.comparables_minimos||3),maximum=Number(parameters.comparables_maximos||15);
 const maxAge=Number(parameters.antiguedad_maxima_dias||1095),maxDistance=Number(parameters.distancia_maxima_km||150);
 if(!surface||surface<=0||!normalizeText(subject.comuna))return insufficient('Faltan superficie o comuna válidas.',enteredPrice);
 const subjectLocation={lat:subject.lat??subject.latitudPrivada,lng:subject.lng??subject.longitudPrivada};
 const prepared=records.map(record=>{
  const comparableSurface=number(record.superficie_m2??record.superficie),price=number(record.precio??record.precio_publicacion??record.precio_final);
  if(!comparableSurface||comparableSurface<=0||!price||price<=0)return null;
  const distance=haversineKm(subjectLocation,{lat:record.lat??record.latitud_privada,lng:record.lng??record.longitud_privada});
  const days=ageDays(record.fecha??record.actualizado_en??record.creado_en,now);
  const sameCommune=normalizeText(subject.comuna)===normalizeText(record.comuna),sameRegion=normalizeText(subject.region)===normalizeText(record.region);
  if(!sameCommune&&!sameRegion)return null;
  if(days!==null&&days>maxAge)return null;
  const surfaceScore=surfaceSimilarity(surface,comparableSurface);
  if(surfaceScore<Number(parameters.superficie_relacion_minima||.25))return null;
  const geoWeight=distanceWeight(distance,maxDistance);
  if(!geoWeight)return null;
  const zoneWeight=sameCommune?1:.45,features=featureSimilarity(subject,record),source=sourceWeight(record.fuente_tipo||'precio_publicado_solicitado');
  const weight=Math.max(.05,zoneWeight*.3+surfaceScore*.25+geoWeight*.2+recencyWeight(days,maxAge)*.1+features*.05+source*.1);
  return {id:record.id||record.fuente_id||null,sourceType:record.fuente_tipo||'precio_publicado_solicitado',region:record.region,comuna:record.comuna,sector:record.sector||'',surface:comparableSurface,price,priceM2:price/comparableSurface,lat:number(record.lat??record.latitud_privada),lng:number(record.lng??record.longitud_privada),distance,days,sameCommune,surfaceScore,featureScore:features,weight,date:record.fecha??record.actualizado_en??record.creado_en};
 }).filter(Boolean);
 const sameCommune=deduplicate(prepared.filter(row=>row.sameCommune)).sort((first,second)=>second.weight-first.weight);
 const regional=deduplicate(prepared.filter(row=>!row.sameCommune)).sort((first,second)=>second.weight-first.weight);
 const selected=[...sameCommune,...regional].slice(0,maximum);
 if(selected.length<minimum)return insufficient(`Solo existen ${selected.length} comparables válidos.`,enteredPrice,selected);
 const q20=weightedQuantile(selected,.2),q25=weightedQuantile(selected,.25),median=weightedQuantile(selected,.5),q80=weightedQuantile(selected,.8);
 const round=value=>Math.round(value/10000)*10000;
 const routeAdjustment=routeDistanceAdjustment(subject.distanciaRutaPrincipalKm??subject.distancia_ruta_principal_km);
 const applyRouteAdjustment=value=>round(value*(1+routeAdjustment.pct));
 const minValue=applyRouteAdjustment(q20*surface),quickValue=applyRouteAdjustment(q25*surface),marketValue=applyRouteAdjustment(median*surface),maxValue=applyRouteAdjustment(q80*surface);
 const verifiedCount=selected.filter(row=>row.sourceType==='precio_final_verificado').length;
 const coverage=selected.length>=Number(parameters.cobertura_suficiente_desde||12)?'suficiente':selected.length>=Number(parameters.cobertura_limitada_desde||6)?'limitada':'experimental';
 const confidence=selected.length>=12&&verifiedCount>=3?'alta':selected.length>=6?'media':'baja';
 const confidenceScore=confidence==='alta'?85:confidence==='media'?65:40;
 const difference=enteredPrice&&marketValue?Number((((enteredPrice-marketValue)/marketValue)*100).toFixed(1)):null;
 const position=difference===null?'sin_precio':difference < -15?'aparentemente_bajo':difference < -5?'competitivo':difference <=10?'dentro_del_rango':'sobre_el_rango';
 const strengths=[];if(subjectLocation.lat&&subjectLocation.lng)strengths.push('Ubicación utilizada para medir cercanía geográfica.');if(subject.acceso)strengths.push('Acceso informado para comparar similitud.');if(subject.agua||subject.luz)strengths.push('Servicios básicos informados.');if(routeAdjustment.distanceKm!==null)strengths.push(`Distancia a ruta principal informada: ${routeAdjustment.distanceKm} km.`);
 const cautions=[];if(!verifiedCount)cautions.push('Los comparables disponibles corresponden a precios publicados, no a ventas verificadas.');if(coverage!=='suficiente')cautions.push('La cobertura del sector todavía es limitada.');if(!subject.acceso||!subject.topografia)cautions.push('Faltan datos de acceso o topografía para mejorar la comparación.');if(routeAdjustment.distanceKm===null)cautions.push('Falta la distancia a la ruta o carretera principal.');
 return {status:'generated',range:{minimum:minValue,quick:quickValue,market:marketValue,maximum:maxValue},pricePerM2:Number(median.toFixed(0)),difference,position,confidence,confidenceScore,coverage,comparableCount:selected.length,strengths:strengths.slice(0,3),cautions:cautions.slice(0,3),comparables:selected.map(row=>({...row,similarity:Number(row.surfaceScore.toFixed(4)),weight:Number(row.weight.toFixed(4))})),routeAdjustment,factors:[{code:'comparable_count',value:selected.length,weight:null,effect:null,explanation:`Se utilizaron ${selected.length} antecedentes comparables.`,source:'datos_internos'},{code:'source_quality',value:verifiedCount,weight:null,effect:null,explanation:verifiedCount?`${verifiedCount} comparables tienen precio final verificado.`:'No hay ventas verificadas entre los comparables utilizados.',source:'datos_internos'},{code:'route_distance',value:routeAdjustment.distanceKm,weight:routeAdjustment.pct,effect:routeAdjustment.pct,explanation:routeAdjustment.distanceKm===null?'No se informó distancia a ruta principal.':`Distancia informada de ${routeAdjustment.distanceKm} km; ajuste del ${routeAdjustment.discountPercent}% según tramo ${routeAdjustment.label}.`,source:'dato_declarado'}]};
}

function insufficient(reason,enteredPrice,comparables=[]){
 return {status:'insufficient',range:{minimum:null,quick:null,market:null,maximum:null},pricePerM2:null,difference:null,position:'informacion_insuficiente',confidence:'informacion_insuficiente',confidenceScore:0,coverage:'informacion_insuficiente',comparableCount:comparables.length,strengths:[],cautions:[reason,'No se inventó un valor para completar la falta de antecedentes.'],comparables,factors:[{code:'insufficient_data',value:comparables.length,weight:null,effect:null,explanation:reason,source:'datos_internos'}]};
}
