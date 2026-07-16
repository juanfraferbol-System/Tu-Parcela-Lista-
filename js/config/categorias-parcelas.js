export const CATEGORIAS_PARCELAS = {
  descanso: {
    id: 'descanso',
    slug: 'descanso',
    nombre: 'Descanso',
    titulo: 'Descanso Cerca de Todo',
    subtitulo: 'Tranquilidad sin quedar demasiado aislado',
    descripcion: 'Parcelas para descansar, vivir o escaparse durante el fin de semana sin alejarse demasiado de la ciudad. Encuentra el equilibrio perfecto entre la paz de la naturaleza y la comodidad urbana.',
    actividades: [
      'Fines de semana',
      'Segunda vivienda',
      'Vida familiar',
      'Huerta',
      'Teletrabajo',
      'Descanso sin aislamiento'
    ],
    apoyoTpl: [
      'Búsqueda por distancia exacta',
      'Selección de casas prefabricadas adecuadas',
      'Cálculo completo del proyecto',
      'Coordinación de visitas',
      'Evaluación de accesos y servicios'
    ],
    imagenHero: 'image/hammock_rest.jpg',
    puntajeMinimo: 60,
    reglas: {
      distanciaMaximaMinutos: 30, // Ciudad principal a menos de 30 mins
      requiereNaturaleza: true
    }
  },
  inversion: {
    id: 'inversion',
    slug: 'inversion',
    nombre: 'Inversión',
    titulo: 'Inversión Inteligente',
    subtitulo: 'Atractivas por precio, conectividad y crecimiento',
    descripcion: 'Oportunidades seleccionadas por su bajo precio, excelente ubicación y altas posibilidades de crecimiento. Ideal para asegurar tu patrimonio o iniciar un proyecto rentable.',
    actividades: [
      'Primera inversión',
      'Compra para construcción futura',
      'Reventa a mediano plazo',
      'Arriendo turístico',
      'Proyecto familiar',
      'Compra con facilidad de pago'
    ],
    apoyoTpl: [
      'Análisis de precio frente a mercado',
      'Evaluación de potencial comercial',
      'Estudio de cercanía a rutas proyectadas',
      'Escenario de parcela más casa para arriendo'
    ],
    imagenHero: 'image/investment_handshake.jpg',
    puntajeMinimo: 60,
    reglas: {
      precioMaximoRelativo: 0.8, // 20% más baratas que el promedio de la zona
      requiereConectividad: true
    }
  },
  nativas: {
    id: 'nativas',
    slug: 'nativas',
    nombre: 'Nativas y Salvajes',
    titulo: 'Inmersión Natural',
    subtitulo: 'Desconexión, bosques y privacidad total',
    descripcion: 'Parcelas para desconectarse, vivir rodeado de naturaleza y disfrutar mayor privacidad. Un refugio lejos del ruido de la ciudad, rodeado de flora y fauna nativa.',
    actividades: [
      'Conservación ambiental',
      'Senderismo y trekking',
      'Vida autosustentable',
      'Construcción de cabañas',
      'Desconexión total',
      'Contemplación y descanso'
    ],
    apoyoTpl: [
      'Asesoría en soluciones solares/off-grid',
      'Estudio de extracción de agua',
      'Evaluación de accesos rurales',
      'Casas apropiadas para sectores extremos',
      'Proveedores especializados'
    ],
    imagenHero: 'image/native_forest.jpg',
    puntajeMinimo: 60,
    reglas: {
      distanciaMinimaMinutos: 40,
      palabrasClave: ['nativo', 'selva', 'virgen', 'aislado', 'cordillera']
    }
  },
  agua: {
    id: 'agua',
    slug: 'agua',
    nombre: 'Con Agua',
    titulo: 'Vida Junto al Agua',
    subtitulo: 'El agua como parte de tu experiencia',
    descripcion: 'Parcelas donde el agua forma parte del paisaje y de la experiencia del lugar. Ríos, vertientes y esteros que dan vida a tu proyecto.',
    actividades: [
      'Contemplación y relax',
      'Paisajismo natural',
      'Senderos por la ribera',
      'Turismo rural',
      'Descanso familiar',
      'Pesca y actividades (si son permitidas)'
    ],
    apoyoTpl: [
      'Revisión técnica del curso de agua',
      'Asesoría en derechos de agua',
      'Evaluación de riesgo de inundación',
      'Casas con terrazas hacia el agua'
    ],
    notaEspecial: 'La existencia, uso, acceso y condiciones jurídicas del cuerpo de agua deben verificarse exhaustivamente antes de la promesa de compraventa.',
    imagenHero: 'image/river_water.jpg',
    puntajeMinimo: 60,
    reglas: {
      palabrasClave: ['río', 'estero', 'arroyo', 'vertiente', 'laguna', 'lago', 'borde']
    }
  }
};
