export const QUALITY_COMMITMENT={version:'tpl-broker-quality-v1',title:'Compromiso de calidad TPL'};
export const USER_RATING_CATEGORIES=[
 {id:'atencion',label:'Atención y amabilidad'},
 {id:'rapidez',label:'Rapidez de respuesta'},
 {id:'claridad',label:'Claridad de la información'},
 {id:'visitas',label:'Cumplimiento de visitas'},
 {id:'experiencia',label:'Experiencia general'}
];
export const TPL_EVALUATION_LEVELS=[
 {id:'evaluacion',label:'En evaluación'},
 {id:'verificado',label:'Verificado TPL'},
 {id:'destacado',label:'Destacado TPL'},
 {id:'excelencia',label:'Excelencia TPL'}
];
export const TPL_EVALUATION_FACTORS=['Exactitud de la información','Actualización de anuncios','Tiempo de respuesta','Cumplimiento de visitas','Reclamos fundados','Colaboración con TPL'];
export const RESPONSE_TIME_CATEGORIES=[
 {id:'menos_1h',label:'Menos de 1 hora'},
 {id:'mismo_dia',label:'Durante el mismo día'},
 {id:'24h',label:'En 24 horas'},
 {id:'sin_datos',label:'Sin información suficiente'}
];
export const MODERATION_STATES=['activo','advertido','requiere_correccion','pausado','suspendido','retirado'];
export const MODERATION_SUBJECTS=['corredor','publicacion'];
export const MODERATION_RECORD_FIELDS=['motivo','fecha','responsable','evidencia','revision_apelacion'];
export function createQualityAcceptance(accepted=false,acceptedAt=null){return {accepted:Boolean(accepted),version:QUALITY_COMMITMENT.version,acceptedAt:accepted?acceptedAt:null};}

// Datos demostrativos: nunca se derivan del plan ni representan mediciones reales.
export const SIMULATED_REPUTATION={
 isSimulated:true,globalScore:4.7,ratingCount:18,tplLevel:'evaluacion',responseTime:'sin_datos',publicationCount:0,
 categories:{atencion:4.8,rapidez:4.5,claridad:4.7,visitas:4.6,experiencia:4.7},
 comments:[
  {id:'demo-1',author:'Ma*** R.',date:'2026-06-18',score:5,comment:'La información fue clara y la coordinación resultó sencilla.',interactionType:'consulta verificada',moderationStatus:'aprobado'},
  {id:'demo-2',author:'Jo*** P.',date:'2026-05-30',score:4,comment:'Buena atención durante la consulta inicial.',interactionType:'visita coordinada',moderationStatus:'aprobado'}
 ]
};
export function simulatedReputation(){return structuredClone(SIMULATED_REPUTATION);}

