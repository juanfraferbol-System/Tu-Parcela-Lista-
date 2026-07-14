export const BROKER_COMMON_BENEFITS=['Contacto directo con el corredor','WhatsApp directo','Correo electrónico','Fotografías','Ubicación en mapa','Galería de imágenes','Descripción optimizada por TPL','Cotizador de parcela + casa','Contacto directo con compradores','Administración desde su panel'];

// Entitlement estable: nunca depende del orden visual ni del nombre comercial.
export const VISUAL_ANALYSIS_ALLOWED_PLAN_IDS=Object.freeze(['gold','platinum']);
export const planIncludesVisualAnalysis=planId=>VISUAL_ANALYSIS_ALLOWED_PLAN_IDS.includes(String(planId||''));
export const VISUAL_ANALYSIS_COMPARISON_ROWS=Object.freeze([
 {label:'Análisis visual de fotografías',inicio:'Análisis visual con IA: no incluido',profesional:'Análisis visual con IA: no incluido',gold:'Incluido',platinum:'Incluido'},
 {label:'Descripción enriquecida',inicio:'Manual',profesional:'Manual',gold:'Incluida con IA',platinum:'Incluida con IA'},
 {label:'Características visibles sugeridas',inicio:'No incluido',profesional:'No incluido',gold:'Incluidas',platinum:'Incluidas'},
 {label:'Sugerencia de fotografía de portada',inicio:'No incluido',profesional:'No incluido',gold:'Incluida',platinum:'Incluida'}
]);

export const BROKER_PLANS=[
 {id:'inicio',name:'Plan Inicio',badge:'🚀 Comienza Gratis',theme:'start',priceLabel:'Gratis',price:0,limit:1,tagline:'Ideal para comenzar a publicar.',cta:'Comenzar gratis',includes:['1 publicación activa','Página profesional básica',...BROKER_COMMON_BENEFITS,'Estadísticas básicas de visitas'],excludes:['Gestión de interesados','Publicaciones destacadas','Prioridad especial en resultados','Agenda de visitas']},
 {id:'profesional',name:'Plan Profesional',badge:'⭐ Más elegido',theme:'recommended',priceLabel:'$47.000',price:47000,limit:5,tagline:'Gestión profesional para una cartera en crecimiento.',cta:'Elegir Profesional',inherits:'inicio',includes:['Hasta 5 publicaciones activas','Página profesional personalizada','Logo y presentación','Estadísticas avanzadas','Gestión de interesados','Una publicación destacada','Prioridad media en resultados','Agenda de visitas','Acceso a servicios audiovisuales','Soporte prioritario'],excludes:[]},
 {id:'gold',name:'Plan Gold',badge:'👑 Premium',theme:'gold',priceLabel:'$78.900',price:78900,limit:10,tagline:'Más exposición y herramientas comerciales.',cta:'Elegir Gold',inherits:'profesional',includes:['Hasta 10 publicaciones activas','Página Premium','Estadísticas completas','Tres publicaciones destacadas','Prioridad alta en resultados','Acceso preferente a servicios audiovisuales','Soporte preferente'],excludes:[]},
 {id:'platinum',name:'Plan Platinum',badge:'◆ Mayor capacidad',theme:'platinum',priceLabel:'$120.000',price:120000,limit:20,tagline:'Máxima capacidad, prioridad y soporte dedicado.',cta:'Elegir Platinum',inherits:'gold',includes:['Hasta 20 publicaciones activas','Página Platinum','Seis publicaciones destacadas','Prioridad máxima en resultados','Prioridad máxima en servicios audiovisuales','Soporte dedicado'],excludes:[]}
];

export const PLAN_COMPARISON=[
 ['Precio','Gratis','$47.000','$78.900','$120.000'],
 ['Publicaciones activas','1','5','10','20'],
 ['Contacto directo con el corredor','Sí','Sí','Sí','Sí'],
 ['Página profesional','Básica','Profesional','Premium','Platinum'],
 ['Logo y presentación','Básico','Sí','Sí','Sí'],
 ['Estadísticas','Básicas','Avanzadas','Completas','Completas'],
 ['Gestión de interesados','No','Sí','Sí','Sí'],
 ['Publicaciones destacadas','No','1','3','6'],
 ['Prioridad en resultados','Normal','Media','Alta','Máxima'],
 ['Agenda de visitas','No','Sí','Sí','Sí'],
 ['Acceso a servicios audiovisuales','Opcional','Disponible','Preferente','Prioridad máxima'],
 ['Soporte','Normal','Prioritario','Preferente','Dedicado']
];

export function resolvedPlanBenefits(planId){const plan=BROKER_PLANS.find(item=>item.id===planId);if(!plan)return[];return [...(plan.inherits?resolvedPlanBenefits(plan.inherits):[]),...plan.includes];}
