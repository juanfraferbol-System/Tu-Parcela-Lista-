(function (window) {
  'use strict';

  window.tplBusiness = Object.freeze({
    brand: {
      name: 'TPL Business',
      eyebrow: 'Mi Proyecto'
    },
    hero: {
      eyebrow: 'Mi Proyecto',
      title: 'Tu proyecto ya está en marcha.',
      subtitle: 'Ahora descubre cómo conseguir más consultas, organizar tus clientes y vender más rápido.',
      primaryCta: 'Continuar con mi proyecto',
      primaryCtaUrl: '#estado',
      projectLabel: 'Venta de propiedad'
    },
    projectStatus: {
      title: 'Estado de mi proyecto',
      description: 'Una vista simple de lo que ya está funcionando y de las oportunidades que puedes incorporar.',
      items: [
        { name: 'Publicación', status: 'Activo', tone: 'active', icon: 'window' },
        { name: 'Landing', status: 'Disponible', tone: 'available', icon: 'layout' },
        { name: 'CRM', status: 'Disponible', tone: 'available', icon: 'users' },
        { name: 'Google Ads', status: 'Pendiente', tone: 'pending', icon: 'target' },
        { name: 'WhatsApp', status: 'Activo', tone: 'active', icon: 'message' },
        { name: 'Video', status: 'Pendiente', tone: 'pending', icon: 'video' },
        { name: '360°', status: 'Próximamente', tone: 'soon', icon: 'rotate' }
      ]
    },
    metrics: [
      { label: 'Consultas', value: '—', note: 'Se mostrará al conectar tu actividad' },
      { label: 'Visitas', value: '—', note: 'Se mostrará al activar la agenda' },
      { label: 'WhatsApp', value: '—', note: 'Se mostrará al conectar el canal' },
      { label: 'Conversiones', value: '—', note: 'Se mostrará al activar medición' },
      { label: 'Valor potencial', value: '—', note: 'Se mostrará con oportunidades' }
    ],
    projectHealth: {
      title: 'Salud del Proyecto',
      score: 82,
      summary: 'Tu proyecto tiene una base sólida para seguir creciendo.',
      strengths: [
        'Fotografías completas',
        'Descripción optimizada',
        'Consultas recibidas'
      ],
      opportunities: [
        'Agregar video',
        'Activar Landing Premium',
        'Crear campañas Google Ads',
        'Conectar CRM'
      ]
    },
    growthGroups: [
      {
        id: 'interesados',
        title: 'Conseguir más interesados',
        description: 'Haz que más personas descubran tu propiedad y den el siguiente paso.',
        icon: 'megaphone',
        tools: ['Landing Premium', 'Google Ads', 'Meta Ads', 'SEO'],
        detail: 'Reúne las herramientas enfocadas en visibilidad y captación para presentar mejor tu propiedad y atraer consultas relevantes.',
        outcome: 'Más alcance y más oportunidades de contacto.'
      },
      {
        id: 'organizar',
        title: 'Organizar clientes',
        description: 'Mantén cada consulta, visita y seguimiento bajo control.',
        icon: 'users',
        tools: ['CRM', 'Agenda', 'WhatsApp', 'Seguimiento'],
        detail: 'Organiza la relación con cada interesado para saber qué necesita, cuándo contactarlo y cuál es el próximo paso.',
        outcome: 'Menos oportunidades perdidas y un seguimiento más claro.'
      },
      {
        id: 'analizar',
        title: 'Analizar resultados',
        description: 'Comprende qué acciones acercan realmente tu propiedad a una venta.',
        icon: 'chart',
        tools: ['Dashboard', 'Conversiones', 'Reportes'],
        detail: 'Agrupa indicadores comerciales para ayudarte a distinguir actividad de resultados y tomar mejores decisiones.',
        outcome: 'Decisiones basadas en señales claras.'
      },
      {
        id: 'automatizar',
        title: 'Automatizar',
        description: 'Ahorra tiempo sin perder cercanía con tus interesados.',
        icon: 'spark',
        tools: ['IA Comercial', 'Automatizaciones', 'Recordatorios'],
        detail: 'Prepara tareas y recomendaciones que podrán apoyar la gestión comercial sin convertir la experiencia en un software complejo.',
        outcome: 'Más constancia con menos trabajo manual.'
      }
    ],
    growthStages: {
      title: 'Etapas de crecimiento',
      description: 'Cada etapa fortalece una parte distinta de la venta de tu propiedad.',
      currentStage: 'Comenzar',
      items: [
        { name: 'Comenzar', description: 'Lograr que tu propiedad esté bien presentada y lista para recibir consultas.' },
        { name: 'Crecer', description: 'Aumentar la visibilidad y generar nuevas oportunidades comerciales.' },
        { name: 'Optimizar', description: 'Organizar contactos, medir resultados y mejorar el seguimiento.' },
        { name: 'Escalar', description: 'Automatizar tareas y aplicar inteligencia a la gestión comercial.' }
      ]
    },
    aiAdvisor: {
      label: 'Asesor Comercial',
      greeting: 'Hola Juan.',
      title: 'Detecté oportunidades para mejorar tu proyecto.',
      description: 'Estas recomendaciones están preparadas como una guía de próximos pasos. La función inteligente se activará en una etapa posterior.',
      recommendations: [
        'Agregar video',
        'Activar Landing Premium',
        'Configurar Google Ads',
        'Crear seguimiento automático'
      ],
      ctaText: 'Aplicar recomendación',
      availabilityText: 'Disponible próximamente'
    },
    footer: {
      statement: 'Tecnología y gestión comercial para vender mejor tu propiedad.',
      copyright: 'TPL Business',
      links: [
        { label: 'Mi proyecto', href: '#estado' },
        { label: 'Resultados', href: '#resultados' },
        { label: 'Cómo crecer', href: '#crecimiento' }
      ]
    }
  });
})(window);
