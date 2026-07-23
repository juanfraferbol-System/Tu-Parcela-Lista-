(() => {
  'use strict';

  const landings = [{
    id: 'land-caburgua',
    projectId: 'pro-caburgua',
    clientId: 'cli-caburgua',
    businessAccountCode: 'cli-caburgua',
    commercialProjectCode: 'pro-caburgua',
    propertyId: 'caburgua',
    slug: 'caburgua-premium',
    publicUrl: '/caburgua-premium',
    status: 'published',
    template: 'parcela-premium',
    objective: 'agendar_visitas',
    title: 'Mirador del Villarrica — Parcela Premium en Caburgua',
    subtitle: '5.000 m² en condominio privado, vista al volcán Villarrica, acceso al río y aguas termales.',
    eyebrow: 'CABURGUA · REGIÓN DE LA ARAUCANÍA',
    price: '$200.000.000',
    location: 'Caburgua, Chile',
    heroImage: '/image/cesar_Caburgua/cesar_caburgua_(5).webp',
    gallery: [
      '/image/cesar_Caburgua/cesar_caburgua_(1).webp',
      '/image/cesar_Caburgua/cesar_caburgua_ (2).webp',
      '/image/cesar_Caburgua/cesar_caburgua_(3).webp',
      '/image/cesar_Caburgua/cesar_caburgua_ (4).webp'
    ],
    benefits: [
      'Vista privilegiada al volcán Villarrica',
      'Acceso al río dentro del condominio',
      'Aguas termales para disfrutar todo el año',
      'Rol propio, agua y energía eléctrica'
    ],
    features: [
      {
        title: 'Vista al volcán Villarrica',
        text: 'Un entorno natural privilegiado para disfrutar desde tu futuro proyecto.'
      },
      {
        title: 'Acceso al río',
        text: 'El condominio dispone de acceso al río para sus residentes.'
      },
      {
        title: 'Aguas termales',
        text: 'Un atributo especial para disfrutar el sector durante todo el año.'
      },
      {
        title: 'Rol propio',
        text: 'La parcela dispone de rol individual informado por su propietario o representante.'
      },
      {
        title: 'Agua disponible',
        text: 'El proyecto informa disponibilidad de agua para el desarrollo de la propiedad.'
      },
      {
        title: 'Energía eléctrica',
        text: 'Disponibilidad de energía eléctrica informada para el proyecto.'
      }
    ],
    description: 'Una oportunidad patrimonial única para construir una residencia de alto estándar, segunda vivienda o proyecto turístico en uno de los sectores con mayor demanda del sur de Chile.',
    ctaPrimary: 'Agendar visita',
    ctaSecondary: 'Hablar por WhatsApp',
    whatsapp: '56988508361',
    videoUrl: '',
    mapUrl: '',
    formEnabled: true,
    analyticsEnabled: false,
    adsReady: false,
    seoTitle: 'Parcela Premium en Caburgua con vista al Volcán Villarrica',
    seoDescription: 'Parcela de 5.000 m² en condominio privado de Caburgua, con acceso al río, aguas termales, rol propio, agua y luz.',
    tplBranding: {
      enabled: true,
      badgeText: 'Proyecto gestionado mediante TPL Business',
      supportText: 'Tecnología, registro de consultas y gestión comercial por Tu Parcela Lista.',
      footerText: 'Tecnología y gestión comercial por Tu Parcela Lista',
      ctaText: 'Quiero una landing como esta',
      ctaUrl: '/tecnologia.html',
      modalTitle: 'Respaldo tecnológico y comercial',
      modalContent: [
        'La información del proyecto es proporcionada por el propietario o representante.',
        'Las consultas y solicitudes son gestionadas mediante TPL Business.',
        'Las solicitudes pueden registrarse para seguimiento comercial.',
        'Tu Parcela Lista entrega la infraestructura tecnológica y comercial.'
      ],
      footerTheme: 'corporate'
    },
    updatedAt: '2026-07-23T00:00:00.000Z'
  }];

  window.TPL_PUBLIC_LANDINGS = Object.freeze(
    landings.map((landing) => Object.freeze(landing))
  );

  window.TPL_getPublicLanding = function TPL_getPublicLanding(idOrSlug) {
    const key = String(idOrSlug || '').trim();
    return window.TPL_PUBLIC_LANDINGS.find(
      (landing) => landing.id === key || landing.slug === key
    ) || null;
  };
})();
