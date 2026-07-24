(function (window) {
  'use strict';

  window.tplBusiness = Object.freeze({
    infrastructure: Object.freeze({
      supabaseUrl: 'https://qxavbqhyqaqalpzbhwmh.supabase.co',
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXZicWh5cWFxYWxwemJod21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA',
      storageKey: 'sb-qxavbqhyqaqalpzbhwmh-auth-token',
      clientInfo: 'tu-parcela-lista-tpl-business',
      portalPath: '/plataforma/tpl-business/'
    }),
    brand: Object.freeze({
      name: 'TPL Business',
      eyebrow: 'Mi Proyecto',
      support: 'Tecnología y gestión comercial por Tu Parcela Lista'
    }),
    copy: Object.freeze({
      heroEyebrow: 'Mi Proyecto',
      heroTitle: 'Tu proyecto ya está en marcha.',
      heroSubtitle: 'Revisa cómo se presenta tu propiedad, consulta resultados reales y descubre oportunidades para vender mejor.',
      heroCta: 'Continuar con mi proyecto',
      landingKicker: 'Tu principal vitrina comercial',
      landingTitle: 'Tu Landing Premium',
      statusTitle: 'Estado de mi proyecto',
      statusDescription: 'Una vista simple de lo que ya está funcionando y de lo que puedes incorporar.',
      resultsTitle: 'Mis resultados',
      resultsDescription: 'Actividad real registrada para este proyecto. Nunca mostramos cifras simuladas.',
      healthTitle: 'Salud del proyecto',
      growthTitle: '¿Cómo quieres crecer?',
      growthDescription: 'Elige el resultado que buscas y solicita la herramienta que puede ayudarte.',
      plansTitle: 'Opciones para hacer crecer mi proyecto',
      requestsTitle: 'Mis solicitudes',
      advisorLabel: 'Asesor Comercial',
      advisorTitle: 'Oportunidades recomendadas para tu proyecto',
      advisorDescription: 'Estas recomendaciones son configuradas por el equipo comercial. La IA se incorporará en una etapa posterior.'
    }),
    growthGroups: Object.freeze([
      Object.freeze({
        id: 'interesados',
        title: 'Conseguir más interesados',
        description: 'Aumenta la visibilidad y facilita que nuevas personas consulten.',
        outcome: 'Más alcance y oportunidades de contacto.'
      }),
      Object.freeze({
        id: 'organizar',
        title: 'Organizar clientes',
        description: 'Mantén consultas, visitas y seguimientos bajo control.',
        outcome: 'Menos oportunidades perdidas.'
      }),
      Object.freeze({
        id: 'analizar',
        title: 'Analizar resultados',
        description: 'Comprende qué acciones acercan la propiedad a una venta.',
        outcome: 'Decisiones basadas en actividad real.'
      }),
      Object.freeze({
        id: 'automatizar',
        title: 'Automatizar',
        description: 'Prepara una gestión más constante y eficiente.',
        outcome: 'Más continuidad con menos trabajo manual.'
      })
    ]),
    growthStages: Object.freeze([
      Object.freeze({ id: 'comenzar', name: 'Comenzar', description: 'Presentar correctamente la propiedad y recibir consultas.' }),
      Object.freeze({ id: 'crecer', name: 'Crecer', description: 'Aumentar visibilidad y generar nuevas oportunidades.' }),
      Object.freeze({ id: 'optimizar', name: 'Optimizar', description: 'Organizar contactos, medir y mejorar el seguimiento.' }),
      Object.freeze({ id: 'escalar', name: 'Escalar', description: 'Incorporar automatización e inteligencia comercial.' })
    ]),
    statusOrder: Object.freeze([
      'publicacion',
      'landing_premium',
      'crm',
      'whatsapp',
      'agenda',
      'google_ads',
      'video',
      'recorrido_360'
    ])
  });
})(window);
