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
      name: 'Mi Proyecto',
      eyebrow: 'Centro de Negocios',
      support: 'Tu equipo trabajando para tu proyecto.'
    }),
    copy: Object.freeze({
      heroEyebrow: 'Tu espacio exclusivo',
      heroTitle: 'Tu proyecto ya está en marcha.',
      heroSubtitle: 'Revisa cuántas personas están interesadas, mira el alcance de tu Landing y descubre qué podemos hacer para ayudarte a vender mejor.',
      heroCta: 'Ver mi proyecto',
      landingKicker: 'Tu página exclusiva',
      landingTitle: 'Para captar interesados',
      statusTitle: 'Avance de mi proyecto',
      statusDescription: 'Mira lo que ya tenemos funcionando y lo que podemos preparar a continuación.',
      resultsTitle: 'Tus resultados',
      resultsDescription: 'Cifras reales de personas interactuando con tu proyecto.',
      healthTitle: '¿Cómo podemos mejorar?',
      growthTitle: 'Te acompañamos a crecer',
      growthDescription: 'Elige lo que necesitas y nosotros prepararemos la herramienta adecuada.',
      plansTitle: 'Opciones para hacer crecer mi proyecto',
      requestsTitle: 'Mis solicitudes',
      advisorLabel: 'Próxima recomendación',
      advisorTitle: 'Oportunidades recomendadas para tu proyecto',
      advisorDescription: 'El equipo de Tu Parcela Lista revisa constantemente tu proyecto para sugerirte el mejor siguiente paso.'
    }),
    growthGroups: Object.freeze([
      Object.freeze({
        id: 'interesados',
        title: 'Llegar a más personas',
        description: 'Estamos ayudando a que más personas encuentren tu proyecto.',
        outcome: 'Más alcance y oportunidades de contacto.'
      }),
      Object.freeze({
        id: 'organizar',
        title: 'Organizar a los interesados',
        description: 'Aquí puedes revisar de forma ordenada a todas las personas interesadas en tu proyecto.',
        outcome: 'Tranquilidad y control total de tus contactos.'
      }),
      Object.freeze({
        id: 'analizar',
        title: 'Analizar mis resultados',
        description: 'Revisa de forma transparente y simple qué acciones están funcionando.',
        outcome: 'Decisiones basadas en datos reales y comprobables.'
      }),
      Object.freeze({
        id: 'automatizar',
        title: 'Delegar el trabajo',
        description: 'Deja que nosotros nos encarguemos de enviar correos y realizar seguimientos.',
        outcome: 'Ahorro de tiempo e impacto profesional continuo.'
      })
    ]),
    growthStages: Object.freeze([
      Object.freeze({ id: 'comenzar', name: 'Comenzar', description: 'Presentar correctamente la propiedad y recibir consultas.' }),
      Object.freeze({ id: 'crecer', name: 'Crecer', description: 'Aumentar visibilidad y generar nuevas oportunidades.' }),
      Object.freeze({ id: 'optimizar', name: 'Optimizar', description: 'Organizar contactos, medir y mejorar el seguimiento.' }),
      Object.freeze({ id: 'escalar', name: 'Escalar', description: 'Incorporar automatización y acompañamiento constante.' })
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
