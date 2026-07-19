(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.TPL=root.TPL||{};
  root.TPL.redaccion=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const COMMUNE_ADJECTIVES={
    'Cañete':['histórica','encantadora','tradicional','atractiva'],
    'Florida':['tranquila','natural','acogedora','campestre'],
    'Nacimiento':['histórica','natural','tradicional','acogedora'],
    'Yumbel':['tradicional','histórica','acogedora','conectada'],
    'Quillón':['atractiva','turística','soleada','acogedora'],
    'Chillán':['dinámica','consolidada','atractiva','tradicional'],
    'Los Ángeles':['consolidada','dinámica','bien conectada','atractiva'],
    'Santa Juana':['natural','tranquila','campestre','acogedora'],
    'Cabrero':['creciente','bien conectada','atractiva','tranquila'],
    'Bulnes':['acogedora','tradicional','tranquila','atractiva'],
    'Concepción':['consolidada','dinámica','estratégica','atractiva'],
    'Arauco':['costera','histórica','natural','atractiva'],
    'Lebu':['costera','histórica','natural','atractiva'],
    'Contulmo':['natural','pintoresca','tranquila','atractiva'],
    'Pucón':['turística','lacustre','atractiva','reconocida'],
    'Villarrica':['lacustre','turística','atractiva','reconocida'],
    'Valdivia':['fluvial','atractiva','histórica','consolidada'],
    'Puerto Varas':['lacustre','turística','atractiva','reconocida']
  };

  const COMMON_ADJECTIVES=['atractiva','tranquila','acogedora','tradicional'];
  const CONNECTORS=['Además','Asimismo','A su vez','Sumado a ello','Entre sus atributos'];
  const CLOSINGS_LAND=[
    'Una alternativa para quienes buscan amplitud, tranquilidad y contacto con la naturaleza.',
    'Una propiedad con condiciones interesantes para desarrollar un proyecto rural, familiar o de inversión.',
    'Una oportunidad para quienes valoran el espacio, el entorno natural y las posibilidades de desarrollo.',
    'Una opción atractiva para proyectar una nueva etapa en un entorno rural.'
  ];
  const CLOSINGS_HOUSE=[
    'Una propiedad pensada para quienes buscan comodidad, tranquilidad y una buena conexión con su entorno.',
    'Una alternativa funcional para vivir, descansar o desarrollar un proyecto familiar.',
    'Una vivienda con atributos que permiten disfrutar de mayor espacio y calidad de vida.',
    'Una opción atractiva para quienes buscan una casa con carácter, funcionalidad y entorno.'
  ];

  function clean(value){return String(value??'').trim();}
  function normalize(value){return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function formatNumber(value){const n=Number(String(value??'').replace(/[^0-9]/g,''));return n?new Intl.NumberFormat('es-CL').format(n):'';}
  function number(value){return Number(String(value??'').replace(/[^0-9]/g,''))||0;}
  function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function pick(items,seed,offset=0){if(!items?.length)return'';return items[(hash(seed)+offset)%items.length];}
  function sentence(value){const s=clean(value);return s?s.charAt(0).toUpperCase()+s.slice(1):'';}
  function joinNatural(items){const list=items.filter(Boolean);if(list.length<2)return list[0]||'';return `${list.slice(0,-1).join(', ')} y ${list.at(-1)}`;}
  function propertyWord(input){const explicit=clean(input.tipoTerreno);if(explicit)return explicit;return number(input.superficie)>=10000?'Campo':'Parcela';}
  function locationPhrase(input,seed){const region=clean(input.region),commune=clean(input.comuna),sector=clean(input.sector||input.localidad);const parts=[];
    if(region)parts.push(`En la ${region}`);
    if(commune){const adjective=pick(COMMUNE_ADJECTIVES[commune]||COMMON_ADJECTIVES,seed,1);parts.push(`${region?'en':'En'} la ${adjective} comuna de ${commune}`);}
    if(sector)parts.push(`específicamente en el sector de ${sector}`);
    return parts.join(', ');
  }
  function areaPhrase(area){const formatted=formatNumber(area);if(!formatted)return'';const n=number(area);
    if(n<=6000)return`con una superficie total de ${formatted} m²`;
    if(n<=8000)return`con una gran superficie de ${formatted} m²`;
    if(n<=10000)return`con una superficie de ${formatted} m², suficiente para desarrollar proyectos de mayor amplitud`;
    return`con una extensa superficie de ${formatted} m², que entrega amplitud y múltiples posibilidades de desarrollo`;
  }
  function legalPhrase(input){const parts=[];const rol=normalize(input.rol);
    if(rol==='rol propio')parts.push('se encuentra al día con su rol');
    else if(rol==='rol compartido')parts.push('cuenta con rol compartido');
    else if(rol==='en tramite')parts.push('cuenta con rol actualmente en trámite');
    const subdivision=normalize(input.subdivision);
    if(subdivision==='subdivision aprobada')parts.push('cuenta con subdivisión aprobada');
    else if(subdivision==='en proceso de subdivision')parts.push('mantiene un proceso de subdivisión actualmente en curso');
    if(!parts.length)return'';
    return sentence(joinNatural(parts))+'.';
  }
  function topographyPhrase(value){const v=normalize(value);if(!v)return'';
    if(v==='mixta')return'Su topografía combina sectores planos con llamativos desniveles.';
    if(v==='completamente plana')return'Su topografía es completamente plana.';
    if(v==='mayormente plana')return'Su topografía es mayormente plana.';
    if(v==='lomaje suave')return'Su topografía presenta un atractivo lomaje suave.';
    if(v==='con pendiente')return'Su topografía presenta sectores con pendiente.';
    if(v==='escarpada')return'Su topografía presenta desniveles marcados.';
    return`Su topografía es ${clean(value).toLowerCase()}.`;
  }
  function soilPhrase(value){const v=normalize(value);if(!v||v==='no evaluado')return'';
    const map={
      'suelo agricola':'El suelo es apto para uso agrícola.',
      'pradera':'El terreno presenta sectores de pradera.',
      'seco y firme':'El suelo se presenta seco y firme.',
      'humedo':'El terreno presenta sectores de suelo húmedo.',
      'pedregoso':'El suelo presenta características pedregosas.',
      'arenoso':'El suelo presenta una composición arenosa.'
    };return map[v]||'';
  }
  function usePhrase(value){const v=normalize(value);if(!v||v==='no lo se')return'';return v==='mixto'?'El suelo permite considerar usos mixtos.':`El suelo es apto para uso ${clean(value).toLowerCase()}.`;}
  function constructionPhrase(value){return normalize(value)==='apta para construir'?'La propiedad ha sido informada como apta para construir.':'';}
  function waterPhrase(value){const v=normalize(value);const map={
    'pozo inscrito':'Cuenta con pozo inscrito como fuente de abastecimiento de agua.',
    'pozo':'Dispone de pozo como alternativa de abastecimiento de agua.',
    'apr conectada':'Cuenta con conexión a sistema de Agua Potable Rural.',
    'apr cercana':'Existe una red de Agua Potable Rural cercana, cuya conexión debe ser confirmada.',
    'vertiente':'Cuenta con una vertiente natural dentro de la propiedad.',
    'derechos de agua':'Cuenta con derechos de agua informados por el propietario.',
    'factibilidad':'Existe factibilidad de abastecimiento de agua, sujeta a confirmación.',
    'sin agua habilitada':'',
    'no lo se':''
  };return map[v]||'';}
  function electricityPhrase(value){const v=normalize(value);const map={
    'conectada':'Cuenta con suministro eléctrico instalado.',
    'empalme instalado':'Dispone de empalme eléctrico instalado.',
    'postacion en el frente':'Cuenta con postación eléctrica en el frente de la propiedad.',
    'postacion cercana':'Existe postación eléctrica cercana, cuya conexión deberá confirmarse.',
    'factibilidad':'Cuenta con factibilidad eléctrica informada, sujeta a evaluación.',
    'sistema solar':'Dispone de un sistema de energía solar.',
    'sin electricidad':'',
    'no lo se':''
  };return map[v]||'';}
  function accessPhrase(value){const v=normalize(value);const map={
    'camino pavimentado':'El acceso se realiza por camino pavimentado.',
    'ripio en buen estado':'El acceso se realiza por un camino de ripio en buen estado.',
    'ripio transitable':'El acceso se realiza por camino de ripio transitable.',
    'camino de tierra':'El último tramo de acceso corresponde a un camino de tierra.',
    'servidumbre inscrita':'El acceso se realiza mediante una servidumbre inscrita.',
    'acceso por mejorar':'El acceso presenta sectores que requieren mejoras.'
  };return map[v]||'';}
  function routePhrase(km){const n=number(km);if(!n)return'';if(n<=5)return'Se encuentra a pocos kilómetros de la ruta o carretera principal.';if(n<=10)return`Está ubicada a aproximadamente ${n} km de la ruta o carretera principal.`;return`El acceso a la ruta o carretera principal se encuentra a aproximadamente ${n} km.`;}

  function buildLand(input={}){
    const seed=JSON.stringify([input.region,input.comuna,input.sector||input.localidad,input.superficie,input.tipoTerreno,input.rol,input.topografia]);
    const label=propertyWord(input);const area=number(input.superficie);const location=locationPhrase(input,seed);const areaText=areaPhrase(area);
    const introVariants=[
      `${location}${location?', ':''}se encuentra esta ${label.toLowerCase()}${areaText?' '+areaText:''}.`,
      `${location}${location?', ':''}se presenta esta ${label.toLowerCase()}${areaText?' '+areaText:''}.`,
      `${location}${location?', ':''}está disponible esta ${label.toLowerCase()}${areaText?' '+areaText:''}.`
    ];
    const paragraphs=[sentence(pick(introVariants,seed,2)),legalPhrase(input),constructionPhrase(input.construccion),topographyPhrase(input.topografia)];
    const soil=soilPhrase(input.condicionSuelo);const use=usePhrase(input.usoSuelo);if(soil)paragraphs.push(soil);else if(use)paragraphs.push(use);
    const access=[accessPhrase(input.acceso),routePhrase(input.distanciaRutaPrincipalKm)].filter(Boolean);if(access.length)paragraphs.push(access.join(' '));
    const services=[waterPhrase(input.agua),electricityPhrase(input.luz)].filter(Boolean);if(services.length)paragraphs.push(services.join(' '));
    const environment=[];if(clean(input.vegetacion)&&normalize(input.vegetacion)!=='sin vegetacion destacada')environment.push(`vegetación ${clean(input.vegetacion).toLowerCase()}`);if(clean(input.vistaPrincipal))environment.push(clean(input.vistaPrincipal).toLowerCase());if(Array.isArray(input.naturaleza))environment.push(...input.naturaleza.map(x=>clean(x).toLowerCase()));
    if(environment.length)paragraphs.push(`${pick(CONNECTORS,seed,4)}, su entorno destaca por ${joinNatural([...new Set(environment)])}.`);
    paragraphs.push(pick(CLOSINGS_LAND,seed,6));
    const highlights=[];if(input.naturaleza?.length)highlights.push(clean(input.naturaleza[0]).toLowerCase());if(clean(input.vistaPrincipal))highlights.push(clean(input.vistaPrincipal).toLowerCase());if(normalize(input.rol)==='rol propio')highlights.push('rol propio');
    let title=`${label}${area?` de ${formatNumber(area)} m²`:''}`;if(highlights.length)title+=` con ${joinNatural(highlights.slice(0,2))}`;if(clean(input.comuna))title+=` en ${clean(input.comuna)}`;
    return{title:sentence(title).slice(0,90),description:paragraphs.filter(Boolean).join('\n\n'),technicalDescription:paragraphs.filter(Boolean).slice(0,-1).join(' '),style:'rural_profesional'};
  }

  function buildHouse(input={}){
    const seed=JSON.stringify([input.region,input.comuna,input.sector||input.localidad,input.tipoCasa,input.superficieConstruida,input.habitaciones,input.banos,input.material]);
    const label=clean(input.tipoCasa)||'Casa';const location=locationPhrase(input,seed);const built=number(input.superficieConstruida);const land=number(input.superficieTerreno);
    const intro=[
      `${location}${location?', ':''}se encuentra esta ${label.toLowerCase()} pensada para aprovechar sus espacios de manera funcional.`,
      `${location}${location?', ':''}está disponible esta ${label.toLowerCase()} con una propuesta cómoda y bien distribuida.`,
      `${location}${location?', ':''}se presenta esta ${label.toLowerCase()} con atributos adecuados para la vida familiar.`
    ];
    const distribution=[];if(built)distribution.push(`${formatNumber(built)} m² construidos`);if(land)distribution.push(`${formatNumber(land)} m² de terreno`);if(clean(input.habitaciones))distribution.push(`${clean(input.habitaciones)} dormitorios`);if(clean(input.banos))distribution.push(`${clean(input.banos)} baños`);if(clean(input.pisos))distribution.push(clean(input.pisos).toLowerCase());
    const paragraphs=[sentence(pick(intro,seed,1))];if(distribution.length)paragraphs.push(`La propiedad ofrece ${joinNatural(distribution)}.`);
    const build=[];if(clean(input.material))build.push(`construcción en ${clean(input.material).toLowerCase()}`);if(clean(input.estado))build.push(`estado ${clean(input.estado).toLowerCase()}`);if(clean(input.regularizacion)&&normalize(input.regularizacion)!=='no lo se')build.push(clean(input.regularizacion).toLowerCase());if(build.length)paragraphs.push(`${pick(CONNECTORS,seed,3)}, presenta ${joinNatural(build)}.`);
    const services=[];if(clean(input.agua))services.push(`abastecimiento de agua mediante ${clean(input.agua).toLowerCase()}`);if(clean(input.sanitario))services.push(clean(input.sanitario).toLowerCase());if(clean(input.calefaccion))services.push(`calefacción ${clean(input.calefaccion).toLowerCase()}`);if(clean(input.estacionamientos))services.push(`${clean(input.estacionamientos)} estacionamientos`);if(services.length)paragraphs.push(`En servicios y equipamiento dispone de ${joinNatural(services)}.`);
    if(input.extras?.length)paragraphs.push(`${pick(CONNECTORS,seed,5)}, incorpora ${joinNatural(input.extras.map(x=>clean(x).toLowerCase()))}.`);
    paragraphs.push(pick(CLOSINGS_HOUSE,seed,7));
    let title=label;if(clean(input.habitaciones))title+=` de ${clean(input.habitaciones)} dormitorios`;if(clean(input.comuna))title+=` en ${clean(input.comuna)}`;
    return{title:sentence(title).slice(0,90),description:paragraphs.filter(Boolean).join('\n\n'),technicalDescription:paragraphs.filter(Boolean).slice(0,-1).join(' '),style:'casa_profesional'};
  }

  function buildPartner(input={}){
    const seed=JSON.stringify(input);const name=clean(input.nombre)||'Empresa partner';const specialty=clean(input.especialidad)||'servicios especializados';const city=clean(input.ciudad||input.comuna);const years=number(input.anosExperiencia);
    const variants=[
      `${name} es una empresa dedicada a ${specialty.toLowerCase()}${city?` con presencia en ${city}`:''}${years?` y más de ${years} años de experiencia`:''}.`,
      `Con experiencia en ${specialty.toLowerCase()}, ${name}${city?` desarrolla proyectos en ${city} y sus alrededores`: ' desarrolla soluciones para sus clientes'}${years?` respaldada por una trayectoria de más de ${years} años`:''}.`,
      `${name} ofrece ${specialty.toLowerCase()}${city?` en ${city}`:''}, combinando experiencia, atención profesional y orientación al cumplimiento de cada proyecto.`
    ];
    return{title:`${name} · ${sentence(specialty)}`.slice(0,90),description:sentence(pick(variants,seed,2)),technicalDescription:sentence(pick(variants,seed,2)),style:'partner_profesional'};
  }

  return{buildLand,buildHouse,buildPartner,COMMUNE_ADJECTIVES};
});
