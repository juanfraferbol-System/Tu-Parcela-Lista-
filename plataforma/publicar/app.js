(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const form=$('#publisherForm');
const DRAFT_KEY='tpl_publicador_smart_fields_v3_plans';
const SECTIONS=['tipo','datos','ubicacion','fotos','precio','vista','anunciante','planes','publicar'];
const REGIONS={
  'Región de Ñuble':['Bulnes','Chillán','Chillán Viejo','Cobquecura','Coelemu','Coihueco','El Carmen','Ninhue','Ñiquén','Pemuco','Pinto','Portezuelo','Quillón','Quirihue','Ránquil','San Carlos','San Fabián','San Ignacio','San Nicolás','Trehuaco','Yungay'],
  'Región del Biobío':['Alto Biobío','Antuco','Arauco','Cabrero','Cañete','Chiguayante','Concepción','Contulmo','Coronel','Curanilahue','Florida','Hualpén','Hualqui','Laja','Lebu','Los Álamos','Los Ángeles','Lota','Mulchén','Nacimiento','Negrete','Penco','Quilaco','Quilleco','San Pedro de la Paz','San Rosendo','Santa Bárbara','Santa Juana','Talcahuano','Tirúa','Tomé','Tucapel','Yumbel'],
  'Región de La Araucanía':['Angol','Carahue','Cholchol','Collipulli','Cunco','Curacautín','Curarrehue','Ercilla','Freire','Galvarino','Gorbea','Lautaro','Loncoche','Lonquimay','Los Sauces','Lumaco','Melipeuco','Nueva Imperial','Padre Las Casas','Perquenco','Pitrufquén','Pucón','Purén','Renaico','Saavedra','Temuco','Teodoro Schmidt','Toltén','Traiguén','Victoria','Vilcún','Villarrica'],
  'Región de Los Ríos':['Corral','Futrono','La Unión','Lago Ranco','Lanco','Los Lagos','Máfil','Mariquina','Paillaco','Panguipulli','Río Bueno','Valdivia'],
  'Región de Los Lagos':['Ancud','Calbuco','Castro','Chaitén','Chonchi','Cochamó','Curaco de Vélez','Dalcahue','Fresia','Frutillar','Futaleufú','Hualaihué','Llanquihue','Los Muermos','Maullín','Osorno','Palena','Puerto Montt','Puerto Octay','Puerto Varas','Puqueldón','Purranque','Puyehue','Queilén','Quellón','Quemchi','Quinchao','Río Negro','San Juan de la Costa','San Pablo']
};
const OWNER_PLANS=[
 {id:'prop_base',urgency:'baja',urgencyLabel:'Urgencia baja',name:'Corretaje TPL',price:'$0 para comenzar · 2% + IVA al vender',fee:'$0',commission:'2% + IVA',description:'Tu Parcela Lista te acompaña durante todo el proceso comercial y solo cobra si la propiedad se vende.',items:['Publicación y optimización profesional del anuncio','Generación automática de título y descripción comercial','Recepción, filtro y seguimiento de interesados','Informes sobre visitas, contactos y comportamiento del anuncio','Recomendaciones de precio, presentación y estrategia','Acompañamiento comercial hasta el cierre'],recommended:true,button:'Comenzar sin pago inicial'},
 {id:'prop_impulso',urgency:'leve',urgencyLabel:'Urgencia leve',name:'Impulso',price:'$50.000 una vez · 2% + IVA al vender',fee:'$50.000',commission:'2% + IVA',description:'Para dar mayor visibilidad al anuncio y comenzar una campaña enfocada en captar interesados.',items:['Todo lo incluido en Corretaje TPL','Landing comercial usando parcela.html','Activación inicial de campaña en Google Ads','Optimización del anuncio para conversión','Posición destacada dentro de Tu Parcela Lista','Informe semanal de rendimiento'],button:'Elegir Impulso'},
 {id:'prop_fuerte',urgency:'alta',urgencyLabel:'Urgencia alta',name:'Impulso Fuerte',price:'$98.000 una vez · 2% + IVA al vender',fee:'$98.000',commission:'2% + IVA',description:'Una estrategia más constante para propiedades que necesitan acelerar consultas y visitas.',items:['Todo lo incluido en Impulso','Campaña de mayor alcance y seguimiento','Video corto generado con IA','Creatividades adicionales para publicidad','Ajustes de campaña según comportamiento','Prioridad alta e informe avanzado'],button:'Elegir Impulso Fuerte'},
 {id:'prop_agresivo',urgency:'critica',urgencyLabel:'Urgencia muy alta',name:'Impulso Agresivo',price:'$200.000 una vez · 2% + IVA al vender',fee:'$200.000',commission:'2% + IVA',description:'Máxima intensidad comercial para propietarios que necesitan dar verdadera urgencia a la venta.',items:['Todo lo incluido en Impulso Fuerte','Estrategia comercial personalizada','Campaña intensiva y optimización continua','Landing y contenidos publicitarios premium','Prioridad máxima en la plataforma','Seguimiento preferente e informe completo'],button:'Elegir Impulso Agresivo'}
];
const BROKER_PLANS=[
 {id:'corr_canje',urgencyLabel:'Inicio',name:'Plan Canje',price:'$0 mensual · 1% + IVA por comprador TPL',fee:'$0/mes',commission:'1% + IVA',description:'Para corredores que quieren publicar sin costo fijo y compartir el resultado cuando TPL aporta al comprador.',items:['Hasta 20 propiedades activas','Generación IA de títulos y descripciones','CRM y agenda básicos','Registro de interesados y visitas','Estadísticas por anuncio','Comisión solo cuando TPL aporta al comprador'],recommended:true,button:'Elegir Plan Canje'},
 {id:'corr_impulso',urgencyLabel:'Crecimiento',name:'Corredor Impulso',price:'$50.000 mensual · 0,75% + IVA',fee:'$50.000/mes',commission:'0,75% + IVA',description:'Más herramientas, mejor exposición y una comisión menor por compradores aportados por la plataforma.',items:['Hasta 20 propiedades activas','IA comercial para todos los anuncios','3 publicaciones destacadas','CRM con seguimiento de interesados','Landing por propiedad','Reportes mensuales'],button:'Elegir Corredor Impulso'},
 {id:'corr_profesional',urgencyLabel:'Profesional',name:'Corredor Profesional',price:'$98.000 mensual · 0,5% + IVA',fee:'$98.000/mes',commission:'0,5% + IVA',description:'Para corredores con cartera activa que necesitan automatización, prioridad y mejores herramientas comerciales.',items:['Hasta 20 propiedades activas','IA avanzada y mejora automática de anuncios','8 publicaciones destacadas','Automatizaciones y pipeline comercial','Reportes por propiedad y por interesado','Prioridad alta en derivación de contactos'],button:'Elegir Corredor Profesional'},
 {id:'corr_elite',urgencyLabel:'Máxima capacidad',name:'Corredor Elite',price:'$200.000 mensual · Sin comisión TPL',fee:'$200.000/mes',commission:'0%',description:'La modalidad más completa para operar hasta 20 propiedades con máxima exposición y sin compartir comisión.',items:['Hasta 20 propiedades activas','IA y optimización ilimitada de anuncios','Publicaciones destacadas y prioridad máxima','CRM completo y automatizaciones','Landing premium por propiedad','Sin comisión para TPL por compradores derivados'],button:'Elegir Corredor Elite'}
];
const state={type:'',photos:[],coordinates:null,photoCoordinates:null,map:null,marker:null,valuation:null,plan:null,recommendedPlan:null,completed:new Set(),current:'tipo',saveTimer:null,generated:{title:'',description:''},copyEdited:false};
const normalize=v=>(v||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const number=v=>Number(String(v||'').replace(/[^0-9]/g,''))||0;
const formatDigits=v=>number(v)?new Intl.NumberFormat('es-CL').format(number(v)):'';
const money=v=>number(v)?new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(number(v)):'Precio por completar';
const escapeHTML=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const val=id=>$(id.startsWith('#')?id:'#'+id)?.value?.trim()||'';
const checked=name=>$$(`input[name="${name}"]:checked`).map(x=>x.value);
const listText=(items)=>items.filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' y $1');
const sentence=s=>s?String(s).charAt(0).toUpperCase()+String(s).slice(1):'';

function initLocations(){const r=$('#region');Object.keys(REGIONS).forEach(name=>r.add(new Option(name,name)));r.addEventListener('change',()=>fillCommunes(r.value));}
function fillCommunes(region,selected=''){const c=$('#comuna');c.innerHTML='<option value="">Selecciona</option>';(REGIONS[region]||[]).forEach(name=>c.add(new Option(name,name)));c.disabled=!region;if(selected)c.value=selected;}
function normalizePropertyType(type){
  const value=String(type||'').trim().toLowerCase();

  if(['parcela','campo','terreno','parcela o campo'].includes(value)){
    return 'parcela';
  }

  if(value==='casa'){
    return 'casa';
  }

  if(['parcela_con_casa','parcela con casa','casa con parcela'].includes(value)){
    return 'parcela_con_casa';
  }

  return '';
}

function setType(type){
  const normalizedType=normalizePropertyType(type);

  state.type=normalizedType;
  document.body.dataset.propertyType=normalizedType;

  $('#detailsTitle').textContent=normalizedType==='casa'
    ?'Completa las características de la casa'
    :normalizedType==='parcela_con_casa'
      ?'Completa las características del terreno y de la casa'
      :'Completa las características de la parcela o campo';

  $$('.form-section').forEach(section=>section.dataset.type=normalizedType);

  generateCopy();
  updatePreview();
  saveDraft();
}
function clearError(name){const e=$(`[data-error-for="${name}"]`);if(e)e.textContent='';const input=form.elements[name]||$(`#${name}`);if(input?.classList)input.classList.remove('input-error');}
function error(name,msg){const e=$(`[data-error-for="${name}"]`);if(e)e.textContent=msg;const input=form.elements[name]||$(`#${name}`);if(input?.classList)input.classList.add('input-error');}
function validate(section){let ok=true;const require=(name,msg)=>{const el=form.elements[name]||$(`#${name}`);clearError(name);if(!el?.value?.trim()){error(name,msg);ok=false;}};
 if(section==='tipo'&&!form.tipo.value){error('tipo','Selecciona parcela, parcela con casa o casa.');ok=false;}
 if(section==='datos'){['region','comuna','localidad'].forEach(n=>require(n,'Completa este dato.'));if(state.type==='casa')require('casaSuperficie','Indica la superficie construida.');else if(state.type==='parcela_con_casa'){require('superficie','Indica la superficie del terreno.');require('casaSuperficie','Indica la superficie construida.');}else require('superficie','Indica la superficie del terreno.');}
 if(section==='fotos'){
   if(state.photos.length===0){error('fotos','Agrega al menos una fotografía para continuar.');ok=false;}
   else if(!state.coordinates){
     error('fotos','Antes de continuar necesitamos la ubicación de la propiedad. Puedes volver a Ubicación o intentar recuperarla desde tus fotografías.');
     $('#photoLocationFallback').hidden=false;
     $('#photoLocationFallback').scrollIntoView({behavior:'smooth',block:'center'});
     ok=false;
   }
 }
 if(section==='precio'){require('precio','Indica el precio de venta.');if(!form.urgencia.value){error('urgencia','Selecciona qué tan pronto necesitas vender.');ok=false;}}
 if(section==='anunciante'){if(!form.anunciante.value){error('anunciante','Selecciona propietario o corredor.');ok=false;}['nombre','telefono','email'].forEach(n=>require(n,'Completa este dato.'));}
 if(section==='planes'&&!syncPlanSelection()){alert('Selecciona un plan para continuar.');ok=false;}
 return ok;
}
function goTo(id,validateCurrent=true){syncPlanSelection();if(validateCurrent&&!validate(state.current))return;state.completed.add(state.current);state.current=id;updateProgress();if(id==='vista'){generateCopy(true);updatePreview();}if(id==='planes')renderPlans();if(id==='publicar')renderFinal();document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});saveDraft();}
function updateProgress(){const idx=SECTIONS.indexOf(state.current);$$('#progressSteps button').forEach((b,i)=>{b.classList.toggle('current',b.dataset.target===state.current);b.classList.toggle('done',state.completed.has(b.dataset.target)||i<idx)});const completed=Math.max(state.completed.size,idx);const pct=Math.min(100,Math.round(completed/(SECTIONS.length-1)*100));$('#progressPercent').textContent=pct+'%';$('#progressRing').style.setProperty('--progress',pct+'%');}
function initObserver(){const io=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!visible)return;state.current=visible.target.id;updateProgress();},{rootMargin:'-20% 0px -60% 0px',threshold:[.1,.3,.6]});$$('.observable').forEach(s=>io.observe(s));}

function propertyLabel(){if(state.type==='casa')return val('tipoCasa')||'Casa';if(state.type==='parcela_con_casa')return 'Parcela con casa';const area=number(val('superficie'));return val('tipoTerreno')||(area>=10000?'Campo':'Parcela');}
function locationLabel(){return [val('localidad'),val('comuna')].filter(Boolean).join(', ')||val('region')||'';}
function keyLandHighlights(){const all=[];const nature=checked('naturaleza');if(nature.includes('Río dentro o junto a la propiedad'))all.push('río');else if(nature.includes('Estero'))all.push('estero');else if(nature.includes('Vertiente natural'))all.push('vertiente');if(nature.includes('Bosque nativo')||val('vegetacion')==='Bosque nativo')all.push('bosque nativo');if(val('topografia')==='Completamente plana'||val('topografia')==='Mayormente plana')all.push('terreno plano');if(val('vistaPrincipal'))all.push(val('vistaPrincipal').toLowerCase());if(val('rol')==='Rol propio')all.push('rol propio');return [...new Set(all)].slice(0,2);}
function keyHouseHighlights(){const all=[];const extras=checked('extrasCasa');if(extras.includes('Piscina'))all.push('piscina');if(extras.includes('Vista panorámica'))all.push('vista panorámica');if(extras.includes('Acceso a río o lago'))all.push('acceso a río o lago');if(extras.includes('Bosque o entorno nativo'))all.push('entorno nativo');if(extras.includes('Quincho'))all.push('quincho');if(val('estadoCasa')==='Nueva'||val('estadoCasa')==='Excelente')all.push(val('estadoCasa').toLowerCase());return all.slice(0,2);}
function redactionInput(){return{
 region:val('region'),comuna:val('comuna'),sector:val('localidad'),localidad:val('localidad'),tipoTerreno:val('tipoTerreno'),superficie:number(val('superficie')),rol:val('rol'),subdivision:val('subdivision'),usoSuelo:val('usoSuelo'),construccion:val('construccion'),topografia:val('topografia'),condicionSuelo:val('condicionSuelo'),vegetacion:val('vegetacion'),naturaleza:checked('naturaleza'),vistaPrincipal:val('vistaPrincipal'),agua:val('agua'),luz:val('luz'),acceso:val('acceso'),distanciaRutaPrincipalKm:number(val('distanciaRutaPrincipalKm')),
 tipoCasa:val('tipoCasa'),superficieConstruida:number(val('casaSuperficie')),superficieTerreno:number(val('casaTerreno')),habitaciones:val('habitaciones'),banos:val('banos'),pisos:val('pisos'),material:val('material'),estado:val('estadoCasa'),regularizacion:val('regularizacion'),anioCasa:number(val('anioCasa')),calidadCasa:val('calidadCasa'),remodelacionCasa:val('remodelacionCasa'),anioRemodelacionCasa:number(val('anioRemodelacionCasa')),centroUrbanoCasa:val('centroUrbanoCasa'),minutosCentroCasa:number(val('minutosCentroCasa')),kmCentroCasa:Number(val('kmCentroCasa'))||0,caminoCasa:val('caminoCasa'),aislacionCasa:val('aislacionCasa'),ventanasCasa:val('ventanasCasa'),aguaCasa:val('aguaCasa'),sanitario:val('sanitarioCasa'),calefaccion:val('calefaccion'),estacionamientos:val('estacionamientos'),extras:checked('extrasCasa')
};}
function generateLandCopy(){const input=redactionInput();if(window.TPL?.redaccion?.buildLand)return window.TPL.redaccion.buildLand(input);return{title:'',description:'',technicalDescription:''};}
function generateHouseCopy(){const input=redactionInput();input.agua=input.aguaCasa;return window.TPL?.redaccion?.buildHouse?window.TPL.redaccion.buildHouse(input):{title:'',description:'',technicalDescription:''};}
function generateCopy(force=false){if(!state.type)return;const generated=(state.type==='casa'||state.type==='parcela_con_casa')?generateHouseCopy():generateLandCopy();state.generated=generated;$('#titulo').value=generated.title;$('#descripcionFinal').value=generated.description;$('#generatedTitle').textContent=generated.title||'Completa algunos datos para crear el título';$('#generatedDescription').textContent=generated.description||'La descripción comercial se irá formando automáticamente aquí.';if(force||!state.copyEdited){$('#tituloEditable').value=generated.title;$('#descripcionEditable').value=generated.description;}updatePreview();}

function initMap(){if(!window.L)return;state.map=L.map('map').setView([-37.2,-72.6],7);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(state.map);state.map.on('click',e=>setCoordinates(e.latlng.lat,e.latlng.lng,'Ubicación marcada en el mapa'));}
function setCoordinates(lat,lng,source){state.coordinates={lat:Number(lat),lng:Number(lng),source};if(state.marker)state.marker.setLatLng([lat,lng]);else state.marker=L.marker([lat,lng],{draggable:true}).addTo(state.map).on('dragend',e=>setCoordinates(e.target.getLatLng().lat,e.target.getLatLng().lng,'Marcador movido manualmente'));state.map.setView([lat,lng],15);$('#locationStatus').textContent=`${source}: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;saveDraft();}
function useGps(){if(!navigator.geolocation){$('#locationStatus').textContent='Este navegador no permite obtener ubicación.';return;}$('#locationStatus').textContent='Buscando tu ubicación…';navigator.geolocation.getCurrentPosition(p=>setCoordinates(p.coords.latitude,p.coords.longitude,'Ubicación obtenida por GPS'),e=>{$('#locationStatus').textContent=e.code===1?'Debes permitir el acceso a ubicación.':'No fue posible obtener el GPS. Puedes buscar o marcar en el mapa.';},{enableHighAccuracy:true,timeout:15000,maximumAge:30000});}
async function searchMap(){const q=$('#mapSearch').value.trim();if(q.length<3)return;$('#locationStatus').textContent='Buscando en el mapa…';try{const url=new URL('https://nominatim.openstreetmap.org/search');url.searchParams.set('format','jsonv2');url.searchParams.set('countrycodes','cl');url.searchParams.set('limit','1');url.searchParams.set('q',q);const res=await fetch(url,{headers:{Accept:'application/json'}}),data=await res.json();if(!data[0])throw new Error();setCoordinates(Number(data[0].lat),Number(data[0].lon),'Resultado de búsqueda');}catch{$('#locationStatus').textContent='No encontramos ese lugar. Prueba con comuna, sector y región o marca directamente en el mapa.';}}
function extractCoordinatesFromMapsText(text){
 const raw=String(text||'').trim();
 if(!raw)return null;
 const patterns=[/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,/[?&](?:q|query|ll|center)=(-?\d{1,2}\.\d+)%?2C(?:%20)?(-?\d{1,3}\.\d+)/i,/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/];
 for(const pattern of patterns){const match=raw.match(pattern);if(match){const lat=Number(match[1]),lng=Number(match[2]);if(Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180)return{lat,lng};}}
 return null;
}
const PUBLIC_SUPABASE=window.TPL_SUPABASE_CONFIG||{};
const GOOGLE_MAPS_RESOLVER_URL=`${String(PUBLIC_SUPABASE.url||'').replace(/\/$/,'')}/functions/v1/resolve-google-maps`;
const GOOGLE_MAPS_RESOLVER_ANON_KEY=String(PUBLIC_SUPABASE.anonKey||'');
function isGoogleMapsUrl(value){try{const url=new URL(String(value||'').trim());return ['http:','https:'].includes(url.protocol)&&/(^|\.)(google\.[a-z.]+|goo\.gl)$/i.test(url.hostname);}catch{return false;}}
async function resolveShortGoogleMapsLink(raw){
 const response=await fetch(GOOGLE_MAPS_RESOLVER_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':GOOGLE_MAPS_RESOLVER_ANON_KEY,'Authorization':`Bearer ${GOOGLE_MAPS_RESOLVER_ANON_KEY}`},body:JSON.stringify({url:raw})});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok||!payload?.ok||!payload?.coordinates)throw new Error(payload?.error||'coordinates_not_found');
 return {lat:Number(payload.coordinates.latitude),lng:Number(payload.coordinates.longitude)};
}
async function useGoogleMapsLink(){
 clearError('googleMapsLink');
 const input=$('#googleMapsLink'),button=$('#useGoogleMapsLink'),raw=input.value.trim();
 if(!raw){error('googleMapsLink','Pega el enlace de Google Maps o las coordenadas.');return;}
 const direct=extractCoordinatesFromMapsText(decodeURIComponent(raw));
 if(direct){setCoordinates(direct.lat,direct.lng,'Ubicación obtenida desde enlace de Google Maps');return;}
 if(!isGoogleMapsUrl(raw)){error('googleMapsLink','El enlace no parece pertenecer a Google Maps. Revisa que comience con https://maps.app.goo.gl o https://www.google.com/maps.');return;}
 const previousText=button.textContent;button.disabled=true;button.textContent='Leyendo enlace…';$('#locationStatus').textContent='Abriendo el enlace corto de Google Maps para obtener las coordenadas…';
 try{
  const coords=await resolveShortGoogleMapsLink(raw);
  if(!Number.isFinite(coords.lat)||!Number.isFinite(coords.lng))throw new Error('invalid_coordinates');
  setCoordinates(coords.lat,coords.lng,'Ubicación obtenida desde enlace corto de Google Maps');
  input.value=`https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  clearError('googleMapsLink');
 }catch(err){
  console.error('No fue posible resolver el enlace corto de Google Maps',err);
  error('googleMapsLink','El enlace es válido, pero el servidor no pudo obtener las coordenadas. Intenta nuevamente o marca el punto directamente en el mapa.');
  $('#locationStatus').textContent='No pudimos abrir el enlace corto. Puedes volver a intentarlo o marcar el lugar en el mapa.';
 }finally{button.disabled=false;button.textContent=previousText;}
}
async function inspectAllPhotoLocations(){
 const message=$('#photoLocationMessage'),useButton=$('#usePhotoLocation'),tryButton=$('#tryPhotoLocation');
 state.photoCoordinates=null;useButton.hidden=true;tryButton.disabled=true;message.textContent=' Revisando las fotografías…';
 if(!window.exifr){message.textContent=' No fue posible activar la lectura de ubicación. Vuelve a la sección Ubicación.';tryButton.disabled=false;return;}
 for(const photo of state.photos){try{const gps=await window.exifr.gps(photo.file);if(gps?.latitude&&gps?.longitude){state.photoCoordinates={lat:gps.latitude,lng:gps.longitude};break;}}catch{}}
 if(state.photoCoordinates){message.textContent=' Encontramos una ubicación guardada en una fotografía.';useButton.hidden=false;}
 else message.textContent=' Las fotografías no contienen ubicación GPS. Vuelve a Ubicación y pega un enlace, usa tu GPS o marca el punto en el mapa.';
 tryButton.disabled=false;
}
function humanBytes(bytes){if(!bytes)return'0 KB';const units=['B','KB','MB'];let value=bytes,unit=0;while(value>=1024&&unit<units.length-1){value/=1024;unit++;}return`${value.toFixed(unit?1:0)} ${units[unit]}`;}
function photoUrl(photo,size='medium'){return photo?.variants?.[size]?.url||photo?.url||'';}
function renderPhotos(){state.photos.forEach((p,i)=>{p.order=i;p.cover=i===0;});$('#photoGrid').innerHTML=state.photos.map((p,i)=>`<div class="photo-item ${i===0?'is-cover':''}" draggable="true" data-photo-index="${i}"><img src="${photoUrl(p,'medium')}" alt="Foto ${i+1}"><button type="button" data-remove="${i}" aria-label="Eliminar fotografía">×</button><div class="photo-actions"><button type="button" class="photo-cover" data-cover="${i}">${i===0?'Portada':'Usar de portada'}</button><span class="photo-meta">${humanBytes(p.variants?.large?.size||p.originalSize)}</span></div></div>`).join('');}
function updatePhotoProgress({current=0,total=0,percent=0,fileName=''}){const box=$('#photoProcessing');box.hidden=false;$('#photoProcessingCount').textContent=`${current} de ${total}`;$('#photoProgressBar').style.width=`${percent}%`;$('#photoProcessingDetail').textContent=fileName?`Optimizando ${fileName}`:'Redimensionando y comprimiendo sin perder calidad visible.';}
async function addPhotos(files){const available=Math.max(0,12-state.photos.length),selected=[...files].slice(0,available);if(!selected.length){if(available===0)error('fotos','Ya alcanzaste el máximo de 12 fotografías.');return;}if(!window.TPLPhotoOptimizer){error('fotos','El optimizador de fotografías no pudo iniciar. Recarga la página.');return;}const input=$('#fotosInput'),drop=$('#photoDrop');input.disabled=true;drop.classList.add('is-busy');clearError('fotos');updatePhotoProgress({current:0,total:selected.length,percent:0});const before=selected.reduce((s,f)=>s+f.size,0);try{const optimized=await window.TPLPhotoOptimizer.optimizeMany(selected,{onProgress:updatePhotoProgress});const errors=optimized.filter(x=>x.status==='error');const ready=optimized.filter(x=>x.status==='ready');state.photos.push(...ready);renderPhotos();$('#photoLocationFallback').hidden=true;updatePreview();saveDraft();const after=ready.reduce((sum,p)=>sum+Object.values(p.variants).reduce((s,v)=>s+v.size,0),0);$('#photoSummary').hidden=false;$('#photoSummary').textContent=`${ready.length} fotografía${ready.length===1?'':'s'} lista${ready.length===1?'':'s'}. Originales: ${humanBytes(before)} · versiones optimizadas: ${humanBytes(after)}.${errors.length?` ${errors.length} archivo(s) no pudieron procesarse.`:''}`;if(errors.length)error('fotos',errors.map(x=>x.message).join(' '));}finally{$('#photoProcessing').hidden=true;input.disabled=false;input.value='';drop.classList.remove('is-busy');}}
function removePhoto(index){const photo=state.photos[index];window.TPLPhotoOptimizer?.dispose?.(photo);state.photos.splice(index,1);renderPhotos();updatePreview();saveDraft();}
function setCover(index){if(index<=0)return;const [photo]=state.photos.splice(index,1);state.photos.unshift(photo);renderPhotos();updatePreview();saveDraft();}
function movePhoto(from,to){if(from===to||from<0||to<0)return;const [photo]=state.photos.splice(from,1);state.photos.splice(to,0,photo);renderPhotos();updatePreview();saveDraft();}

const TPL_VALUATION_RULES={
 basePriceM2:2000,
 surfacePricing:{
  progressiveLimitM2:40000,
  largeLandStartM2:40000,
  largeLandRateM2:1000,
  largeLandMaxM2:250000,
  largeLandFinalPct:-.30,
  bands:[
   {upTo:7000,rate:2000},
   {upTo:10000,rate:1000},
   {upTo:20000,rate:500},
   {upTo:40000,rate:250}
  ]
 },
 enabledRegions:['Región del Biobío','Región de Ñuble'],
 majorCities:[
  {name:'Concepción',lat:-36.8201,lng:-73.0444,weight:1.30},
  {name:'Chillán',lat:-36.6066,lng:-72.1034,weight:1.15},
  {name:'Los Ángeles',lat:-37.4697,lng:-72.3537,weight:1.10}
 ],
 distanceBands:[
  {max:10,pct:5.00,label:'0 a 10 km'},
  {max:20,pct:3.00,label:'10 a 20 km'},
  {max:30,pct:1.50,label:'20 a 30 km'},
  {max:40,pct:1.00,label:'30 a 40 km'},
  {max:50,pct:.90,label:'40 a 50 km'},
  {max:60,pct:.50,label:'50 a 60 km'},
  {max:80,pct:.20,label:'60 a 80 km'},
  {max:Infinity,pct:0,label:'Más de 80 km'}
 ],
 adjustments:{waterfront:2.00,electricConnected:.25,electricFeasible:.10,electricUnavailable:-.10,nativeForest:.20,fruitTrees:.25,plantation:-.05},
 globalAdjustments:{rolPropio:.10,rolTramite:-.20,cesionDerechos:-.50,condominio:.10,market:-.20},
 routeDistanceBands:[{max:5,pct:0,label:'0 a 5 km'},{max:10,pct:-.10,label:'6 a 10 km'},{max:20,pct:-.15,label:'11 a 20 km'},{max:30,pct:-.20,label:'21 a 30 km'},{max:40,pct:-.30,label:'31 a 40 km'},{max:50,pct:-.40,label:'41 a 50 km'},{max:60,pct:-.50,label:'51 a 60 km'},{max:Infinity,pct:-.60,label:'Más de 60 km'}],
 accessibility:{routeFactor:1.20,averageSpeedKmh:60,bands:[
  {minKm:80,pct:-.40,label:'Más de 80 km'},
  {minKm:70,pct:-.30,label:'Más de 70 km'},
  {minKm:60,pct:-.20,label:'Más de 60 km'},
  {minMinutes:60,pct:-.20,label:'Más de 1 hora de viaje'}
 ]}
};
function comparableData(){return window.TPL_VALUATION_DATA||window.VALUATION_DATA||{};}
function valuationInputs(){
 const type=state.type||form.tipo.value;
 const asking=number(val('precioVenta'));
 const area=type==='casa'?number(val('casaSuperficie')):number(val('superficie'));
 const location=[val('localidad'),val('comuna'),val('region')].filter(Boolean).join(', ');
 return {type,asking,area,location,region:val('region')};
}
function haversineKm(a,b){
 const toRad=n=>n*Math.PI/180,R=6371;
 const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);
 const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
 return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function nearestMajorCity(){
 if(!state.coordinates)return null;
 return TPL_VALUATION_RULES.majorCities.map(city=>({...city,distanceKm:haversineKm(state.coordinates,city)})).sort((a,b)=>a.distanceKm-b.distanceKm)[0]||null;
}
function distanceRule(distanceKm){return TPL_VALUATION_RULES.distanceBands.find(x=>distanceKm<=x.max)||TPL_VALUATION_RULES.distanceBands.at(-1);}
function calculateSurfaceBase(area){
 const cfg=TPL_VALUATION_RULES.surfacePricing;
 const safeArea=Math.max(0,Number(area)||0);
 if(safeArea>cfg.largeLandStartM2){
  const billableArea=Math.min(safeArea,cfg.largeLandMaxM2);
  return {base:Math.round(billableArea*cfg.largeLandRateM2),mode:'large_land_flat',billableArea,rate:cfg.largeLandRateM2,capped:safeArea>cfg.largeLandMaxM2,bands:[]};
 }
 let previous=0,total=0;
 const applied=[];
 for(const band of cfg.bands){
  const bandArea=Math.max(0,Math.min(safeArea,band.upTo)-previous);
  if(bandArea>0){total+=bandArea*band.rate;applied.push({from:previous+1,to:Math.min(safeArea,band.upTo),area:bandArea,rate:band.rate,amount:Math.round(bandArea*band.rate)});}
  previous=band.upTo;
  if(safeArea<=band.upTo)break;
 }
 return {base:Math.round(total),mode:'progressive',billableArea:safeArea,rate:null,capped:false,bands:applied};
}
function accessibilityRule(distanceKm){
 const cfg=TPL_VALUATION_RULES.accessibility;
 const estimatedRoadKm=distanceKm*cfg.routeFactor;
 const estimatedMinutes=Math.round(estimatedRoadKm/cfg.averageSpeedKmh*60);
 let band=null;
 if(distanceKm>80)band=cfg.bands.find(x=>x.minKm===80);
 else if(distanceKm>70)band=cfg.bands.find(x=>x.minKm===70);
 else if(distanceKm>60)band=cfg.bands.find(x=>x.minKm===60);
 else if(estimatedMinutes>60)band=cfg.bands.find(x=>x.minMinutes===60);
 return {applied:!!band,pct:band?.pct||0,label:band?.label||'Sin penalización',distanceKm:Number(distanceKm.toFixed(1)),estimatedRoadKm:Number(estimatedRoadKm.toFixed(1)),estimatedMinutes,source:'estimacion_interna_sin_api_rutas'};
}
function mainRouteAdjustment(distanceKm){const km=Number(distanceKm);if(!Number.isFinite(km)||km<0)return{applied:false,pct:0,label:'Sin dato',distanceKm:null};const band=TPL_VALUATION_RULES.routeDistanceBands.find(x=>km<=x.max)||TPL_VALUATION_RULES.routeDistanceBands.at(-1);return{applied:band.pct<0,pct:band.pct,label:band.label,distanceKm:Number(km.toFixed(1))};}
function calculateLandRuleValuation({asking,area,location,region}){
 const surfacePricing=calculateSurfaceBase(area);
 const base=surfacePricing.base,adjustments=[];
 const add=(label,pct,detail='')=>adjustments.push({label,pct,amount:Math.round(base*pct),detail});
 const city=nearestMajorCity();
 if(city){
  const band=distanceRule(city.distanceKm);
  const weightedPct=band.pct*city.weight;
  if(weightedPct)add(`Cercanía a ${city.name}`,weightedPct,`${city.distanceKm.toFixed(1)} km · tramo ${band.label} · factor ciudad ${city.weight.toFixed(2)}`);
 }
 const nature=checked('naturaleza'),natureText=normalize(nature.join(' '));
 if(/rio dentro|laguna|lago con borde|lago/.test(natureText))add('Río, laguna o lago con borde/acceso',TPL_VALUATION_RULES.adjustments.waterfront);
 const electricity=normalize(val('luz'));
 if(/conectada|empalme instalado/.test(electricity))add('Empalme eléctrico instalado',TPL_VALUATION_RULES.adjustments.electricConnected);
 else if(/postacion|factibilidad/.test(electricity))add('Factibilidad eléctrica',TPL_VALUATION_RULES.adjustments.electricFeasible);
 else if(/sin electricidad/.test(electricity))add('Sin factibilidad eléctrica',TPL_VALUATION_RULES.adjustments.electricUnavailable);
 const vegetation=normalize(val('vegetacion'));
 if(/arboles frutales/.test(vegetation))add('Árboles frutales',TPL_VALUATION_RULES.adjustments.fruitTrees);
 else if(/bosque nativo/.test(vegetation)||natureText.includes('bosque nativo'))add('Bosque nativo',TPL_VALUATION_RULES.adjustments.nativeForest);
 else if(/pinos|eucaliptus|plantacion forestal/.test(vegetation))add('Pinos o eucaliptus',TPL_VALUATION_RULES.adjustments.plantation);
 const totalPct=adjustments.reduce((sum,x)=>sum+x.pct,0);
 let calculated=Math.max(base,Math.round(base*(1+totalPct)));
 const globalAdjustments=[];
 const rol=normalize(val('rol'));
 if(rol.includes('rol propio'))globalAdjustments.push({key:'rol_propio',pct:TPL_VALUATION_RULES.globalAdjustments.rolPropio});
 else if(rol.includes('en tramite'))globalAdjustments.push({key:'rol_en_tramite',pct:TPL_VALUATION_RULES.globalAdjustments.rolTramite});
 else if(rol.includes('cesion de derechos'))globalAdjustments.push({key:'cesion_derechos',pct:TPL_VALUATION_RULES.globalAdjustments.cesionDerechos});
 const isCondominium=normalize(val('condominio'))==='si'||normalize(val('privacidad')).includes('condominio');
 if(isCondominium)globalAdjustments.push({key:'condominio',pct:TPL_VALUATION_RULES.globalAdjustments.condominio});
 for(const adjustment of globalAdjustments)calculated=Math.round(calculated*(1+adjustment.pct));
 const largeLandAdjustment=area>TPL_VALUATION_RULES.surfacePricing.largeLandStartM2?{applied:true,pct:TPL_VALUATION_RULES.surfacePricing.largeLandFinalPct,label:'Ajuste interno por campo de gran superficie'}:{applied:false,pct:0,label:'No aplica'};
 if(largeLandAdjustment.applied)calculated=Math.round(calculated*(1+largeLandAdjustment.pct));
 const accessibility=city?accessibilityRule(city.distanceKm):{applied:false,pct:0,label:'Sin ubicación suficiente',distanceKm:null,estimatedRoadKm:null,estimatedMinutes:null,source:'sin_coordenadas'};
 if(accessibility.applied)calculated=Math.round(calculated*(1+accessibility.pct));
 const routeAdjustment=mainRouteAdjustment(number(val('distanciaRutaPrincipalKm')));
 if(routeAdjustment.applied)calculated=Math.round(calculated*(1+routeAdjustment.pct));
 calculated=Math.round(calculated*(1+TPL_VALUATION_RULES.globalAdjustments.market));
 const ideal=Math.round(calculated/10000)*10000;
 const quick=Math.round(ideal*.91/10000)*10000;
 const patient=Math.round(ideal*1.10/10000)*10000;
 const diff=asking?((asking-ideal)/ideal*100):0;
 const positivePct=adjustments.filter(x=>x.pct>0).reduce((s,x)=>s+x.pct,0),negativePct=Math.abs(adjustments.filter(x=>x.pct<0).reduce((s,x)=>s+x.pct,0));
 const accessibilityPenalty=accessibility.applied?Math.abs(accessibility.pct)*35:0;
 const score=Math.max(0,Math.min(100,Math.round(35+Math.min(45,positivePct*12)-negativePct*30+(city&&city.distanceKm<=60?15:0)-accessibilityPenalty)));
 return {quick,ideal,patient,reference:ideal,low:quick,high:patient,diff,asking,area,location,region,base,basePriceM2:TPL_VALUATION_RULES.basePriceM2,surfacePricing,totalPct,adjustments,globalAdjustments,largeLandAdjustment,accessibility,routeAdjustment,marketFactor:TPL_VALUATION_RULES.globalAdjustments.market,nearestCity:city?{name:city.name,distanceKm:Number(city.distanceKm.toFixed(1)),weight:city.weight}:null,score,method:'tpl-rules-biobio-nuble-v4-surface-route-distance'};
}
function calculateComparableValuation({type,asking,area,location,region}){
 const raw=comparableData(),source=type==='casa'?(raw.casas||raw.houses||[]):(raw.parcelas||raw.land||[]);
 const list=source.map(x=>({...x,precio:number(x.precio||x.valor),area:number(x.superficie||x.m2||x.area)})).filter(x=>x.precio&&x.area).map(x=>({...x,ppm:x.precio/x.area})).sort((a,b)=>Math.abs(a.area-area)-Math.abs(b.area-area)).slice(0,8);
 if(!list.length)return {error:'Todavía no existen comparables suficientes para esta propiedad. El Tasador TPL por reglas está disponible actualmente para parcelas de Biobío y Ñuble.'};
 const values=list.map(x=>x.ppm).sort((a,b)=>a-b),median=values[Math.floor(values.length/2)],ideal=Math.round(median*area/10000)*10000;
 const quick=Math.round(ideal*.91/10000)*10000,patient=Math.round(ideal*1.10/10000)*10000,diff=asking?((asking-ideal)/ideal*100):0;
 return {quick,ideal,patient,reference:ideal,low:quick,high:patient,diff,asking,area,location,region,comparables:list.slice(0,3),adjustments:[{label:'Valor de propiedades comparables',pct:0}],method:'comparables'};
}
function calculateValuation(){
 const inputs=valuationInputs();
 if(!inputs.area)return {error:'Indica primero la superficie de la propiedad para poder calcular una referencia.'};
 if(inputs.type==='casa'&&window.TPLHouseValuation?.calculate){
   return window.TPLHouseValuation.calculate({
     area:inputs.area,asking:inputs.asking,location:inputs.location,region:inputs.region,
     material:val('material'),quality:val('calidadCasa'),condition:val('estadoCasa'),year:number(val('anioCasa')),
     regularization:val('regularizacion'),remodeling:val('remodelacionCasa'),remodelingYear:number(val('anioRemodelacionCasa')),
     urbanReference:val('centroUrbanoCasa'),minutesToCenter:number(val('minutosCentroCasa')),kmToCenter:Number(val('kmCentroCasa'))||0,
     road:val('caminoCasa'),insulation:val('aislacionCasa'),windows:val('ventanasCasa'),water:val('aguaCasa'),sanitary:val('sanitarioCasa'),
     heating:val('calefaccion'),parking:val('estacionamientos'),extras:checked('extrasCasa')
   });
 }
 if(inputs.type!=='casa'&&TPL_VALUATION_RULES.enabledRegions.includes(inputs.region))return calculateLandRuleValuation(inputs);
 return calculateComparableValuation(inputs);
}
function openValuationModal(){
 const valuationSession=window.TPLValuationCRM?.start?.({inputs:valuationInputs(),form:dataObject(),source:'boton_tasador'});
 state.valuationSessionId=valuationSession?.id||null;
 const modal=$('#valuationModal'),loading=$('#valuationLoading'),results=$('#valuationResults'),errorBox=$('#valuationModalError');
 modal.hidden=false;modal.setAttribute('aria-hidden','false');document.body.classList.add('valuation-modal-open');
 loading.hidden=false;results.hidden=true;errorBox.hidden=true;$('#valuationSignals').innerHTML='';$('#valuationThinkingBar').style.width='4%';
 const messages=['Revisando ubicación y superficie…','Buscando propiedades comparables…','Analizando acceso, agua y electricidad…','Evaluando atributos y documentación…','Calculando estrategias de venta…','Preparando tu recomendación comercial…'];
 const signals=['Ubicación identificada','Superficie incorporada','Atributos considerados','Comparables analizados'];
 let i=0;
 const timer=setInterval(()=>{i++;$('#valuationThinkingText').textContent=messages[Math.min(i,messages.length-1)];$('#valuationThinkingBar').style.width=Math.min(96,12+i*17)+'%';if(i<=signals.length)$('#valuationSignals').insertAdjacentHTML('beforeend',`<span>✓ ${signals[i-1]}</span>`);},620);
 setTimeout(()=>{clearInterval(timer);const result=calculateValuation();loading.hidden=true;if(result.error){errorBox.hidden=false;errorBox.innerHTML=`<strong>No pudimos completar el análisis</strong><p>${escapeHTML(result.error)}</p><button type="button" class="btn primary" data-close-valuation>Volver al formulario</button>`;return;}state.valuation=result;window.TPLValuationCRM?.complete?.(state.valuationSessionId,{result,form:dataObject()});renderValuationModal(result);saveDraft();},3900);
}
function closeValuationModal(){window.TPLValuationCRM?.event?.(state.valuationSessionId,'tasador_cerrado',{selectedStrategy:state.valuation?.selectedStrategy||null});const modal=$('#valuationModal');modal.hidden=true;modal.setAttribute('aria-hidden','true');document.body.classList.remove('valuation-modal-open');}
function valuationCard(key,label,price,time,description,recommended=false){return `<article class="valuation-option ${recommended?'recommended':''}"><div class="valuation-option-top"><small>${label}</small>${recommended?'<span>RECOMENDADO POR TPL</span>':''}</div><strong>${money(price)}</strong><p>${description}</p><div class="valuation-sale-time"><small>TIEMPO ORIENTATIVO DE VENTA</small><b>${time}</b></div><button type="button" class="btn ${recommended?'primary':'ghost'}" data-use-valuation="${key}">Usar este precio</button></article>`;}
function renderValuationModal(r){
 const current=r.asking?`<div class="valuation-current"><span>Tu precio informado</span><strong>${money(r.asking)}</strong><em>${Math.abs(r.diff).toFixed(1)}% ${r.diff>=0?'sobre':'bajo'} la recomendación TPL</em></div>`:'';
 const confidence=r.score>=80?'Alta':r.score>=55?'Media':'Inicial';
 $('#valuationResults').hidden=false;
 $('#valuationResults').innerHTML=`<div class="valuation-result-heading"><p class="eyebrow">Análisis completado</p><h3>Encontramos tres estrategias posibles</h3><p>${escapeHTML(r.location||'Tu propiedad')} · ${formatDigits(r.area)} m²</p></div><div class="valuation-private-summary"><div><small>CONFIANZA DE LA ESTIMACIÓN</small><strong>${confidence}</strong></div><p>La recomendación considera ubicación, conectividad, antecedentes documentales, características del terreno y comportamiento comercial. La fórmula interna del Tasador TPL es confidencial.</p></div>${current}<div class="valuation-options">${valuationCard('quick','Venta rápida',r.quick,'1 a 3 meses','Mayor competitividad para aumentar consultas y acelerar decisiones.')}${valuationCard('ideal','Precio ideal',r.ideal,'3 a 6 meses','El mejor equilibrio estimado entre valor y probabilidad de venta.',true)}${valuationCard('patient','Venta paciente',r.patient,'6 a 12 meses o más','Para propietarios con menor urgencia que pueden esperar mejores condiciones.')}</div><p class="valuation-disclaimer">Estimación comercial orientativa para apoyar la publicación. No reemplaza una tasación bancaria o pericial. Tu Parcela Lista no muestra públicamente su fórmula, valores base ni porcentajes internos.</p>`;
}
function applyValuationPrice(key){
 if(!state.valuation)return;const price=state.valuation[key];if(!price)return;
 $('#precioVenta').value=formatDigits(price);state.valuation.selectedStrategy=key;state.valuation.selectedPrice=price;window.TPLValuationCRM?.select?.(state.valuationSessionId,{strategy:key,price,asking:state.valuation.asking,ideal:state.valuation.ideal});
 generateCopy();updatePreview();saveDraft();
 $('#valuationResult').hidden=false;$('#valuationResult').innerHTML=`<p class="eyebrow">Estrategia seleccionada</p><h3>${key==='quick'?'Venta rápida':key==='patient'?'Venta paciente':'Precio ideal recomendado'}</h3>${key==='quick'?'<div class="valuation-backed-confirmation"><strong>✓ Valor respaldado por Tu Parcela Lista</strong><span>La publicación mostrará el distintivo Precio recomendado mientras conserve este valor.</span></div>':''}<div class="valuation-metrics"><div><small>Precio elegido</small><strong>${money(price)}</strong></div><div><small>Tiempo orientativo</small><strong>${key==='quick'?'1 a 3 meses':key==='patient'?'6 a 12+ meses':'3 a 6 meses'}</strong></div><div><small>Referencia TPL</small><strong>${money(state.valuation.ideal)}</strong></div></div><button type="button" class="btn ghost" id="reviewValuationAgain">Revisar las 3 alternativas</button>`;
 closeValuationModal();
 setTimeout(()=>$('#reviewValuationAgain')?.addEventListener('click',()=>{renderValuationModal(state.valuation);$('#valuationLoading').hidden=true;$('#valuationResults').hidden=false;$('#valuationModal').hidden=false;$('#valuationModal').setAttribute('aria-hidden','false');document.body.classList.add('valuation-modal-open');}),0);
}
function runValuation(){openValuationModal();}

function updatePreview(){const type=form.tipo.value||state.type;$('#previewType').textContent=type==='casa'?'Casa':propertyLabel();$('#previewTitle').textContent=$('#tituloEditable').value||state.generated.title||'Tu propiedad aparecerá aquí';$('#previewLocation').textContent=[val('localidad'),val('comuna'),val('region')].filter(Boolean).join(', ')||'Ubicación por completar';$('#previewPrice').textContent=money(val('precioVenta'));const tplBadge=$('#previewTplValueBadge');const backed=state.valuation?.selectedStrategy==='quick'&&number(val('precioVenta'))===Number(state.valuation?.quick||0);if(tplBadge)tplBadge.hidden=!backed;$('#previewDescription').textContent=$('#descripcionEditable').value||state.generated.description||'La descripción comercial aparecerá aquí.';const hasPhoto=Boolean(photoUrl(state.photos[0],'large'));const photo=$('#previewPhoto'),placeholder=$('#previewPlaceholder'),wrap=$('#previewImageWrap');if(hasPhoto){photo.src=photoUrl(state.photos[0],'large');photo.hidden=false;placeholder.hidden=true;wrap.classList.remove('preview-image-empty');}else{photo.removeAttribute('src');photo.hidden=true;placeholder.hidden=false;wrap.classList.add('preview-image-empty');}const features=type==='casa'?[number(val('casaSuperficie'))&&formatDigits(val('casaSuperficie'))+' m²',val('habitaciones')&&val('habitaciones')+' dormitorios',val('banos')&&val('banos')+' baños',val('estadoCasa')]:[number(val('superficie'))&&formatDigits(val('superficie'))+' m²',val('topografia'),val('rol'),val('agua')];$('#previewFeatures').innerHTML=features.filter(Boolean).map(x=>`<span>${escapeHTML(x)}</span>`).join('');}
const URGENCY_CONFIG={
 baja:{label:'Urgencia baja',publicLabel:'Sin apuro',ownerPlan:'prop_base',brokerPlan:'corr_canje',score:10,protocol:'Seguimiento normal, informe mensual y optimización orgánica.',strategy:'Puedes probar el rango superior del valor referencial y observar la respuesta del mercado.'},
 leve:{label:'Urgencia leve',publicLabel:'Quiero comenzar a moverla',ownerPlan:'prop_impulso',brokerPlan:'corr_impulso',score:35,protocol:'Revisión semanal, campaña inicial y alerta si el interés es bajo.',strategy:'Conviene equilibrar precio y velocidad para aumentar consultas sin sacrificar valor.'},
 alta:{label:'Urgencia alta',publicLabel:'Necesito vender pronto',ownerPlan:'prop_fuerte',brokerPlan:'corr_profesional',score:70,protocol:'Prioridad alta, revisión de precio y seguimiento frecuente de interesados.',strategy:'Conviene publicar dentro de la zona competitiva del rango y reforzar la difusión.'},
 critica:{label:'Urgencia muy alta',publicLabel:'Quiero máxima exposición',ownerPlan:'prop_agresivo',brokerPlan:'corr_elite',score:100,protocol:'Prioridad máxima, estrategia intensiva y alertas comerciales inmediatas.',strategy:'Se recomienda una estrategia rápida, máxima exposición y evaluación frecuente del precio.'}
};
function urgencyValue(){return form.querySelector('input[name="urgencia"]:checked')?.value||form.urgencia?.value||'';}
function syncPlanSelection(){const hidden=$('#selectedPlanInput');const domValue=hidden?.value||form.querySelector('input[name="plan"]:checked')?.value||'';if(domValue)state.plan=domValue;return state.plan||'';}
function recommendedPlanId(){const cfg=URGENCY_CONFIG[urgencyValue()];if(!cfg)return null;return form.anunciante?.value==='corredor'?cfg.brokerPlan:cfg.ownerPlan;}
function updateUrgency(){const key=urgencyValue(),cfg=URGENCY_CONFIG[key];state.recommendedPlan=recommendedPlanId();$('#urgencyStatus').textContent=cfg?.label||'Sin seleccionar';$('#urgencyStatus').classList.toggle('active',!!cfg);const box=$('#urgencyRecommendation');if(!cfg){box.hidden=true;box.innerHTML='';return;}const plan=[...OWNER_PLANS,...BROKER_PLANS].find(p=>p.id===state.recommendedPlan);box.hidden=false;box.innerHTML=`<div><small>ESTRATEGIA RECOMENDADA</small><strong>${escapeHTML(plan?.name||'Plan por definir')}</strong><p>${escapeHTML(cfg.strategy)}</p></div><span>${escapeHTML(cfg.protocol)}</span>`;clearError('urgencia');}
const IMPROVEMENT_LABELS={empalme_electrico:'Empalme eléctrico',cerco_perimetral:'Cerco perimetral',porton_acceso:'Portón de acceso',camino_acceso:'Mejoramiento del camino',agua:'Solución de agua',limpieza_terreno:'Limpieza del terreno',topografia:'Estudio topográfico',aporte_fosa:'Aporte para fosa séptica'};
function detectPartnerNeeds(){
 const needs=[];const electricity=val('luz').toLowerCase(),water=(val('agua')||val('aguaCasa')).toLowerCase(),access=val('acceso').toLowerCase(),closure=val('cierre').toLowerCase(),gate=val('porton').toLowerCase(),sanitary=val('sanitarioCasa').toLowerCase();
 if(/sin electricidad|no lo sé|postación cercana|factibilidad/.test(electricity)||!electricity)needs.push({id:'empalme_electrico',label:'Empalme eléctrico',reason:'La propiedad no informa una conexión eléctrica operativa.',category:'electricidad'});
 if(/sin agua|no lo sé/.test(water)||!water)needs.push({id:'agua',label:'Solución de agua',reason:'No existe una solución de agua confirmada.',category:'agua'});
 if(/acceso por mejorar|camino de tierra/.test(access))needs.push({id:'camino_acceso',label:'Mejoramiento del camino',reason:'El acceso fue informado como mejorable.',category:'caminos'});
 if(/sin cierre|sin cerco|abierto|no/.test(closure)||!closure)needs.push({id:'cerco_perimetral',label:'Cerco perimetral',reason:'No se informó un cierre perimetral completo.',category:'cercos'});
 if(/sin portón|no/.test(gate)||!gate)needs.push({id:'porton_acceso',label:'Portón de acceso',reason:'No se informó un portón de acceso.',category:'cercos'});
 if(state.type==='casa'&&(/sin|no/.test(sanitary)||!sanitary))needs.push({id:'fosa_septica',label:'Sistema sanitario o fosa séptica',reason:'No se informó una solución sanitaria operativa.',category:'sanitario'});
 return needs;
}
function updateNegotiationModule(){
 const mode=val('negociacionPrecio');const box=$('#ownerImprovements');if(!box)return;const enabled=mode==='mejoras'||mode==='ofertas_y_mejoras';box.hidden=!enabled;
 const needs=detectPartnerNeeds(),target=$('#detectedPartnerNeeds');
 if(target){target.hidden=!needs.length;target.innerHTML=needs.length?`<strong>Oportunidades detectadas por TPL</strong><p>Según los datos de la propiedad, estas obras podrían mejorar su presentación o completar el proyecto:</p><div>${needs.map(n=>`<button type="button" data-suggest-improvement="${n.id}"><span>+</span>${escapeHTML(n.label)}<small>${escapeHTML(n.reason)}</small></button>`).join('')}</div>`:'';}
 target?.querySelectorAll('[data-suggest-improvement]').forEach(btn=>btn.addEventListener('click',()=>{const input=form.querySelector(`input[name="mejorasOfrecidas"][value="${btn.dataset.suggestImprovement}"]`);if(input){input.checked=true;btn.classList.add('selected');saveDraft();}}));
}
function negotiationData(raw){const improvements=checked('mejorasOfrecidas');const needs=detectPartnerNeeds();return{modalidad:raw.negociacionPrecio||'',aceptaOfertas:['ofertas','ofertas_y_mejoras'].includes(raw.negociacionPrecio),aceptaMejoras:['mejoras','ofertas_y_mejoras'].includes(raw.negociacionPrecio),mejorasOfrecidas:improvements.map(id=>({id,nombre:IMPROVEMENT_LABELS[id]||id,estado:'disponible_para_negociar'})),montoMaximo:Number(raw.montoMaximoMejoras)||null,montoMaximoTexto:raw.montoMaximoMejoras==='personalizado'?'A definir':raw.montoMaximoMejoras||'',momento:raw.momentoMejoras||'',detalle:raw.detalleMejoras||'',necesidadesDetectadas:needs,advertencia:'Las mejoras son beneficios disponibles para negociar y solo se convierten en compromiso al incorporarse formalmente a una reserva o contrato.'};}

function planWarning(plan){const recommended=state.recommendedPlan;if(!recommended||plan.id===recommended)return '';const cfg=URGENCY_CONFIG[urgencyValue()];return cfg?`Has indicado “${cfg.publicLabel}”. Este plan puede usarse, pero recomendamos ${[...OWNER_PLANS,...BROKER_PLANS].find(p=>p.id===recommended)?.name||'otro plan'} para responder mejor a ese nivel de urgencia.`:'';}
function renderPlans(){const role=form.anunciante?.value||'propietario',plans=role==='corredor'?BROKER_PLANS:OWNER_PLANS;state.recommendedPlan=recommendedPlanId();syncPlanSelection();
 $('#plansTitle').textContent=role==='corredor'?'Planes mensuales para corredores':'Planes para propietarios';
 $('#plansIntro').textContent=role==='corredor'?'Publica hasta 20 propiedades y reduce progresivamente la comisión hasta llegar a 0%.':'Tu Parcela Lista te acompaña en todos los planes. La recomendación se adapta al nivel de urgencia que seleccionaste.';
 $('#planPromise').innerHTML=role==='corredor'
  ?'<div><small>IMPORTANTE</small><strong>Más plan, menos comisión.</strong></div><span>Todos incluyen IA, CRM y herramientas comerciales. Los pagos mensuales se prepararán para Flow.</span>'
  :'<div><small>IMPORTANTE</small><strong>Tu dinero no se pierde.</strong></div><span>Lo que pagues por Impulso, Impulso Fuerte o Impulso Agresivo se descuenta íntegramente de la comisión del 2% cuando la venta se concreta mediante Tu Parcela Lista.</span>';
 $('#plansGrid').innerHTML=plans.map((p,i)=>{const isRecommended=p.id===state.recommendedPlan,isSelected=state.plan===p.id,warning=isSelected?planWarning(p):'';return `<article class="plan-card ${isRecommended?'recommended':''} ${isSelected?'selected':''}" data-plan-id="${p.id}"><input class="plan-radio-native" type="radio" name="plan" value="${p.id}" ${isSelected?'checked':''} aria-label="Seleccionar ${escapeHTML(p.name)}">${isRecommended?'<span class="plan-badge">RECOMENDADO PARA TI</span>':''}<div class="plan-head"><div><small>${escapeHTML(p.urgencyLabel||'PLAN')}</small><h3>${p.name}</h3></div><span class="plan-number">0${i+1}</span></div><div class="plan-price">${p.price}</div><p>${p.description}</p><ul>${p.items.map(item=>`<li><span>✓</span>${item}</li>`).join('')}</ul>${warning?`<p class="plan-warning">${escapeHTML(warning)}</p>`:''}<button type="button" class="plan-select-btn ${isSelected?'selected':''}" data-select-plan="${p.id}">${isSelected?'Plan elegido':p.button}</button></article>`}).join('');
 $('#plansComparison').innerHTML=`<div class="comparison-title"><div><p class="eyebrow">Compara antes de elegir</p><h3>Qué mejora en cada plan</h3></div><small>Desliza horizontalmente en el celular</small></div><div class="comparison-scroll"><table><thead><tr><th>Plan</th><th>Nivel</th><th>Pago</th><th>Comisión</th><th>Difusión</th><th>Informes</th><th>CRM</th><th>Prioridad</th></tr></thead><tbody>${plans.map((p,i)=>`<tr class="${p.id===state.recommendedPlan?'recommended-row':''}"><th>${p.name}${p.id===state.recommendedPlan?' · Recomendado':''}</th><td>${p.urgencyLabel||'—'}</td><td>${p.fee}</td><td>${p.commission}</td><td>${role==='corredor'?(i===0?'Estándar':i===1?'Mejorada':i===2?'Alta':'Máxima'):(i===0?'Orgánica':i===1?'Google Ads inicial':i===2?'Campaña ampliada':'Campaña intensiva')}</td><td>${i===0?'Mensual':i===1?'Semanal':i===2?'Avanzado':'Completo'}</td><td>${i===0?'Básico':i===1?'Seguimiento':i===2?'Automatizado':'Completo'}</td><td>${i===0?'Normal':i===1?'Destacada':i===2?'Alta':'Máxima'}</td></tr>`).join('')}</tbody></table></div>`;
}
function selectedPlanObject(){const selected=syncPlanSelection();return [...OWNER_PLANS,...BROKER_PLANS].find(p=>p.id===selected);}
function renderFinal(){
 generateCopy(true);updatePreview();
 const plan=selectedPlanObject(),urgency=URGENCY_CONFIG[urgencyValue()];
 const planError=$('#finalPlanError');
 if(planError)planError.textContent=plan?'':'Aún no has elegido un plan. Vuelve al paso anterior para seleccionar uno.';
 $('#finalSummary').classList.toggle('missing-plan',!plan);
 $('#finalSummary').innerHTML=`
  <div class="final-choice-grid">
   <div class="final-choice"><small>PRIORIDAD DE VENTA</small><strong>${escapeHTML(urgency?.publicLabel||'No informada')}</strong><span>${escapeHTML(urgency?.label||'Debes indicar qué tan pronto deseas vender')}</span></div>
   <div class="final-choice"><small>PLAN ELEGIDO</small><strong>${escapeHTML(plan?.name||'Ningún plan seleccionado')}</strong><span>${escapeHTML(plan?.price||'Vuelve al paso 8 para elegir un plan')}</span></div>
  </div>
  <button type="button" class="btn ghost small" data-edit-plans>${plan?'Cambiar plan':'Elegir plan'}</button>`;
 $('#submitBtn').textContent='Enviar publicación a revisión';
 $('#submitBtn').disabled=!plan;
}
function calculateListingQuality(d){let score=0;const reasons=[];if(d.ubicacion){score+=15}else reasons.push('Completar ubicación');const photoCount=Number(d.medios?.cantidadFotos||0);if(photoCount>=6)score+=20;else if(photoCount>0)score+=10;else reasons.push('Agregar fotografías');if(d.documentacion?.rol&&d.documentacion.rol!=='No lo sé')score+=15;else reasons.push('Confirmar situación del rol');if(d.precio)score+=10;if(d.propiedad.superficieTerreno||d.propiedad.superficieConstruida)score+=10;if(d.servicios.agua)score+=5;if(d.servicios.electricidad)score+=5;if(d.comercial.urgencia)score+=10;if(d.contacto.email&&d.contacto.telefono)score+=10;return{score:Math.min(100,score),nivel:score>=85?'Excelente':score>=65?'Buena':score>=45?'Mejorable':'Incompleta',mejoras:reasons};}
function dataObject(){const raw=Object.fromEntries(new FormData(form).entries()),urgency=URGENCY_CONFIG[raw.urgencia]||null,plan=selectedPlanObject();const d={
 version:'publicador-tpl-v15-redaccion-inteligente',
 formulario:{...raw,tipo:raw.tipo||state.type},
 propiedad:{tipo:raw.tipo||state.type,subtipo:propertyLabel(),region:raw.region||'',comuna:raw.comuna||'',localidad:raw.localidad||'',superficieTerreno:number(val('superficie'))||number(val('casaTerreno')),superficieConstruida:number(val('casaSuperficie')),precio:number(val('precioVenta')),precioM2:0,titulo:$('#tituloEditable').value||state.generated.title,descripcion:$('#descripcionEditable').value||state.generated.description,descripcionComercial:$('#descripcionEditable').value||state.generated.description,descripcionTecnica:state.generated.technicalDescription||'',estiloRedaccion:state.generated.style||'tpl_profesional'},
 ubicacion:state.coordinates?{...state.coordinates,enlaceGoogleMaps:val('googleMapsLink'),publicaAproximada:$('#publicApproximate').checked}:null,
 documentacion:{rol:val('rol'),condominio:val('condominio'),subdivision:val('subdivision'),usoSuelo:val('usoSuelo'),factibilidadConstruccion:val('construccion'),regularizacionCasa:val('regularizacion')},
 terreno:{topografia:val('topografia'),suelo:val('condicionSuelo'),vegetacion:val('vegetacion'),vista:val('vistaPrincipal'),orientacion:val('orientacion'),privacidad:val('privacidad'),forma:val('formaTerreno'),frenteMetros:number(val('frente')),naturaleza:checked('naturaleza')},
 servicios:{agua:val('agua')||val('aguaCasa'),electricidad:val('luz'),sanitario:val('sanitarioCasa'),calefaccion:val('calefaccion'),acceso:val('acceso'),distanciaRutaPrincipalKm:number(val('distanciaRutaPrincipalKm')),cierre:val('cierre'),porton:val('porton')},
 casa:{tipo:val('tipoCasa'),habitaciones:val('habitaciones'),banos:val('banos'),pisos:val('pisos'),material:val('material'),estado:val('estadoCasa'),anio:val('anioCasa'),calidad:val('calidadCasa'),remodelacion:val('remodelacionCasa'),anioRemodelacion:val('anioRemodelacionCasa'),centroUrbano:val('centroUrbanoCasa'),minutosCentro:number(val('minutosCentroCasa')),kmCentro:Number(val('kmCentroCasa'))||0,camino:val('caminoCasa'),aislacion:val('aislacionCasa'),ventanas:val('ventanasCasa'),regularizacion:val('regularizacion'),agua:val('aguaCasa'),sanitario:val('sanitarioCasa'),calefaccion:val('calefaccion'),estacionamientos:val('estacionamientos'),extras:checked('extrasCasa')},
 comercial:{urgencia:raw.urgencia||'',urgenciaEtiqueta:urgency?.label||'',urgenciaPuntaje:urgency?.score||0,plazoVenta:raw.plazoVenta||'',tiempoEnVenta:raw.tiempoEnVenta||'',negociacionPrecio:raw.negociacionPrecio||'',negociacion:negotiationData(raw),disponibilidadVisitas:raw.disponibilidadVisitas||'',protocoloSugerido:urgency?.protocol||'',estrategiaPrecio:urgency?.strategy||''},
 contacto:{tipo:raw.anunciante||'',nombre:raw.nombre||'',telefono:raw.telefono||'',email:raw.email||''},
 plan:{id:state.plan,nombre:plan?.name||'',precioTexto:plan?.price||'',tarifa:plan?.fee||'',comision:plan?.commission||'',recomendado:state.recommendedPlan,coincideConUrgencia:state.plan===state.recommendedPlan},
 promocion:{urgente:urgencyValue()==='alta'||urgencyValue()==='critica',urgenteGratis:urgencyValue()==='alta'&&!plan?.fee,destacadoPago:Boolean(plan?.fee&&plan?.fee!=='$0'),nivel:urgencyValue()==='critica'?'maxima':urgencyValue()==='alta'?'alta':'normal',presupuestoTexto:plan?.fee||'$0',estado:plan?.fee&&plan?.fee!=='$0'?'pendiente_pago':'sin_pago',prioridadGrilla:urgencyValue()==='critica'?100:urgencyValue()==='alta'?60:0},
 tasacion:{resultado:state.valuation,variablesUsadas:{ubicacion:!!state.coordinates,superficie:true,terreno:state.type!=='casa',casa:state.type==='casa'||state.type==='parcela_con_casa',urgencia:raw.urgencia||''},valorRespaldadoTPL:Boolean(state.valuation?.quick)&&number(val('precioVenta'))<=Number(state.valuation?.quick||0),distintivoPublico:Boolean(state.valuation?.quick)&&number(val('precioVenta'))<=Number(state.valuation?.quick||0)?{activo:true,titulo:'Valor respaldado por Tu Parcela Lista',etiqueta:'Precio recomendado',tipo:'tpl_valor_respaldado',motivo:state.valuation?.selectedStrategy==='quick'?'venta_rapida_seleccionada':'precio_manual_igual_o_inferior'}:{activo:false}},
 medios:{cantidadFotos:state.photos.length,portadaIndice:0,fotos:state.photos.map((p,i)=>({id:p.id,orden:i,portada:i===0,nombreOriginal:p.originalName,tamanoOriginal:p.originalSize,anchoOriginal:p.width,altoOriginal:p.height,variantes:Object.fromEntries(Object.entries(p.variants||{}).map(([k,v])=>[k,{nombre:v.file?.name,tamano:v.size,ancho:v.width,alto:v.height,tipo:'image/webp'}]))}))},
 distintivos:{valorRespaldadoTPL:state.valuation?.selectedStrategy==='quick'&&number(val('precioVenta'))===Number(state.valuation?.quick||0),precioRecomendado:state.valuation?.selectedStrategy==='quick'&&number(val('precioVenta'))===Number(state.valuation?.quick||0),texto:'Valor respaldado por Tu Parcela Lista',badge:'Precio recomendado'},integraciones:{flow:{requerido:!!plan&&plan.fee!=='$0'&&plan.fee!=='$0/mes',estado:'pendiente_configuracion'},crm:{estado:'listo_para_sincronizar'},tasador:{estado:'datos_preparados'}},
 consentimiento:{terminos:$('#acceptTerms')?.checked||false},
 metadata:{origen:'publicador_web',createdAt:new Date().toISOString()}
 };
 const area=d.propiedad.superficieTerreno||d.propiedad.superficieConstruida;d.propiedad.precioM2=area&&d.propiedad.precio?Math.round(d.propiedad.precio/area):0;d.calidad=calculateListingQuality(d);return window.TPL?.orchestrator?.preparePublication?window.TPL.orchestrator.preparePublication(d,{source:'publicador',emit:false}):d;}

function saveDraft(){clearTimeout(state.saveTimer);state.saveTimer=setTimeout(()=>{try{const data=dataObject();data.completed=[...state.completed];data.current=state.current;localStorage.setItem(DRAFT_KEY,JSON.stringify(data));$('#saveState').textContent='Borrador guardado';}catch{}},250);}
function restoreDraft(){try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(!d)return;const src=d.formulario||d;for(const [k,v] of Object.entries(src)){if(['naturaleza','extrasCasa','mejorasOfrecidas'].includes(k)){(v||[]).forEach(value=>{const el=$(`input[name="${k}"][value="${CSS.escape(value)}"]`);if(el)el.checked=true;});continue;}const el=form.elements[k];if(!el||v==null||typeof v==='object')continue;if(el instanceof RadioNodeList){[...el].forEach(r=>r.checked=r.value===v);}else el.value=v;}if(src.region)fillCommunes(src.region,src.comuna);state.type=src.tipo||d.propiedad?.tipo||'';state.plan=d.plan?.id||d.plan||null;const planInput=$('#selectedPlanInput');if(planInput)planInput.value=state.plan||'';state.recommendedPlan=d.plan?.recomendado||null;state.valuation=d.tasacion?.resultado||d.tasacion||null;state.coordinates=d.ubicacion||null;state.completed=new Set(d.completed||[]);state.current=d.current||'tipo';setType(state.type);if(d.propiedad?.titulo||d.titulo){$('#tituloEditable').value=d.propiedad?.titulo||d.titulo;state.copyEdited=true;}if(d.propiedad?.descripcion||d.descripcionFinal){$('#descripcionEditable').value=d.propiedad?.descripcion||d.descripcionFinal;state.copyEdited=true;}if(state.coordinates)setTimeout(()=>setCoordinates(state.coordinates.lat,state.coordinates.lng,state.coordinates.source||'Ubicación restaurada'),500);updateUrgency();updateProgress();updatePreview();}catch(err){console.warn('No fue posible restaurar el borrador',err);localStorage.removeItem(DRAFT_KEY);}}
async function submit(e){e.preventDefault();const plan=selectedPlanObject();if(!plan){$('#submitState').textContent='Primero debes elegir un plan en el paso 8.';renderFinal();return;}if(!$('#acceptTerms').checked){$('#submitState').textContent='Marca la casilla para confirmar que revisaste el plan y autorizas el uso de tus datos para gestionar la publicación.';return;}const payload=dataObject(),code='TPL-'+new Date().getFullYear()+'-'+Math.floor(100000+Math.random()*900000);payload.codigo=code;window.TPL?.orchestrator?.notify?.('PUBLICACION_CREADA',{codigo:code,publication:payload},{source:'publicador'});const btn=$('#submitBtn');btn.disabled=true;btn.textContent='Procesando…';$('#submitState').textContent='Guardando la publicación y preparando las integraciones…';try{const result=window.TPLIntegration?await window.TPLIntegration.submitPublication(payload,state.photos):{mode:'local'};if(result?.paymentUrl){$('#submitState').textContent='Redirigiendo al pago seguro…';location.href=result.paymentUrl;return;}if(result?.mode!=='remote'){const saved=JSON.parse(localStorage.getItem('tpl_publicaciones_prueba')||'[]');saved.push({...payload,integrationResult:result});localStorage.setItem('tpl_publicaciones_prueba',JSON.stringify(saved));}window.TPLValuationCRM?.markPublished?.(state.valuationSessionId,{publicationCode:result?.publication?.codigo_publico||code,payload});const crmResult=result?.mode==='remote'?null:window.TPLCRM?.registerPublication?.(payload,result);if(crmResult)window.TPL?.orchestrator?.notify?.('CRM_SINCRONIZADO',{codigo:code,propertyId:crmResult.dossier.id,ownerId:crmResult.dossier.ownerId,tasks:crmResult.tasks.length},{source:'publicador-crm'});localStorage.removeItem(DRAFT_KEY);const node=$('#successTemplate').content.cloneNode(true);const finalCode=result?.publication?.codigo_publico||code;node.querySelector('.success-code').textContent=finalCode;const msg=node.querySelector('p:not(.eyebrow)');if(msg)msg.textContent=result?.mode==='remote'?'La propiedad fue enviada correctamente para revisión y sincronización con el CRM.':'La publicación quedó guardada en modo de prueba. La conexión real se activará al configurar Supabase y Flow.';$('.publisher-content').replaceChildren(node);window.scrollTo({top:0,behavior:'smooth'});}catch(err){console.error(err);$('#submitState').textContent=err.message||'No fue posible completar el envío. El borrador sigue guardado.';btn.disabled=false;btn.textContent=selectedPlanObject()?.button||'Guardar publicación';}}

function bind(){
 $$('input[name="tipo"]').forEach(r=>r.addEventListener('change',()=>{setType(r.value);clearError('tipo');}));
 $$('.next-section').forEach(b=>b.addEventListener('click',()=>goTo(b.dataset.next,true)));$$('.previous-section').forEach(b=>b.addEventListener('click',()=>goTo(b.dataset.prev,false)));$$('#progressSteps button').forEach(b=>b.addEventListener('click',()=>goTo(b.dataset.target,false)));
 form.addEventListener('input',e=>{const id=e.target.id||e.target.name;if(['superficie','casaSuperficie','casaTerreno','precioVenta','frente'].includes(id))e.target.value=formatDigits(e.target.value);clearError(e.target.name||id);if(!['tituloEditable','descripcionEditable'].includes(id)){generateCopy();}else{state.copyEdited=true;$('#titulo').value=$('#tituloEditable').value;$('#descripcionFinal').value=$('#descripcionEditable').value;}updatePreview();saveDraft();});
 form.addEventListener('change',e=>{clearError(e.target.name||e.target.id);if(e.target.name==='tipo')setType(e.target.value);if(e.target.id==='region')fillCommunes(e.target.value);if(e.target.name==='anunciante'){state.plan=null;const planInput=$('#selectedPlanInput');if(planInput)planInput.value='';updateUrgency();renderPlans();}if(e.target.name==='urgencia'){updateUrgency();renderPlans();}if(e.target.name==='plan'){state.plan=e.target.value;const planInput=$('#selectedPlanInput');if(planInput)planInput.value=e.target.value;}generateCopy();updatePreview();saveDraft();});
 $('#regenerateCopy').addEventListener('click',()=>{state.copyEdited=false;generateCopy(true);});$('#restoreGenerated').addEventListener('click',()=>{state.copyEdited=false;generateCopy(true);});
 $('#tituloEditable').addEventListener('input',()=>{$('#titulo').value=$('#tituloEditable').value;});$('#descripcionEditable').addEventListener('input',()=>{$('#descripcionFinal').value=$('#descripcionEditable').value;});
 $('#useGoogleMapsLink').addEventListener('click',useGoogleMapsLink);$('#googleMapsLink').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();useGoogleMapsLink();}});$('#useGps').addEventListener('click',useGps);$('#focusMapSearch').addEventListener('click',()=>$('#mapSearch').focus());$('#focusMap').addEventListener('click',()=>{document.getElementById('map').scrollIntoView({behavior:'smooth',block:'center'});$('#locationStatus').textContent='Haz clic sobre el lugar exacto dentro del mapa.';});$('#searchMap').addEventListener('click',searchMap);$('#mapSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchMap();}});
 const photoInput=$('#fotosInput'),photoDrop=$('#photoDrop'),photoGrid=$('#photoGrid');photoInput.addEventListener('change',e=>addPhotos(e.target.files));['dragenter','dragover'].forEach(type=>photoDrop.addEventListener(type,e=>{e.preventDefault();photoDrop.classList.add('drag-over');}));['dragleave','drop'].forEach(type=>photoDrop.addEventListener(type,e=>{e.preventDefault();photoDrop.classList.remove('drag-over');}));photoDrop.addEventListener('drop',e=>addPhotos(e.dataTransfer.files));photoGrid.addEventListener('click',e=>{const remove=e.target.dataset.remove,cover=e.target.dataset.cover;if(remove!=null)removePhoto(Number(remove));else if(cover!=null)setCover(Number(cover));});let dragIndex=null;photoGrid.addEventListener('dragstart',e=>{const item=e.target.closest('[data-photo-index]');if(!item)return;dragIndex=Number(item.dataset.photoIndex);item.classList.add('dragging');});photoGrid.addEventListener('dragover',e=>{e.preventDefault();const item=e.target.closest('[data-photo-index]');$$('.photo-item',photoGrid).forEach(x=>x.classList.remove('drag-target'));item?.classList.add('drag-target');});photoGrid.addEventListener('drop',e=>{e.preventDefault();const item=e.target.closest('[data-photo-index]');if(item&&dragIndex!=null)movePhoto(dragIndex,Number(item.dataset.photoIndex));dragIndex=null;});photoGrid.addEventListener('dragend',()=>{$$('.photo-item',photoGrid).forEach(x=>x.classList.remove('dragging','drag-target'));dragIndex=null;});$('#tryPhotoLocation').addEventListener('click',inspectAllPhotoLocations);$('#usePhotoLocation').addEventListener('click',()=>{if(!state.photoCoordinates)return;setCoordinates(state.photoCoordinates.lat,state.photoCoordinates.lng,'Ubicación recuperada desde una fotografía');$('#photoLocationFallback').hidden=true;clearError('fotos');});$('#backToLocation').addEventListener('click',()=>goTo('ubicacion',false));
 $('#runValuation').addEventListener('click',runValuation);$('#valuationModal').addEventListener('click',e=>{if(e.target.closest('[data-close-valuation]'))closeValuationModal();const use=e.target.closest('[data-use-valuation]');if(use)applyValuationPrice(use.dataset.useValuation);});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#valuationModal').hidden)closeValuationModal();});$('#plansGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-select-plan]');const card=e.target.closest('[data-plan-id]');const id=btn?.dataset.selectPlan||card?.dataset.planId;if(!id)return;state.plan=id;const planInput=$('#selectedPlanInput');if(planInput)planInput.value=id;renderPlans();saveDraft();});$('#finalSummary').addEventListener('click',e=>{if(e.target.closest('[data-edit-plans]'))goTo('planes',false);});form.addEventListener('submit',submit);
 const toggle=$('#menuToggle'),nav=$('#mainNav');toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});nav.addEventListener('click',()=>nav.classList.remove('open'));
 window.addEventListener('beforeunload',()=>{window.TPLValuationCRM?.markAbandoned?.(state.valuationSessionId,{form:dataObject(),reason:'salida_sin_publicar'});try{localStorage.setItem(DRAFT_KEY,JSON.stringify({...dataObject(),completed:[...state.completed],current:state.current}));}catch{}});
}
form.addEventListener('change',e=>{if(['negociacionPrecio','luz','agua','aguaCasa','acceso','cierre','porton','sanitarioCasa'].includes(e.target?.name||e.target?.id))updateNegotiationModule();});
try{initLocations();initMap();bind();restoreDraft();updateUrgency();updateNegotiationModule();initObserver();updateProgress();generateCopy();updatePreview();}catch(err){console.error(err);$('#startupError').hidden=false;$('#startupError').textContent='El publicador no pudo iniciar correctamente. Recarga con Ctrl + F5 y revisa que todos los archivos estén dentro de plataforma/publicar/.';}
})();
