// js/categorias-estilo.js

const categoriasEstilo = {
  descanso: {
    id: "descanso",
    slug: "descanso",
    nombreCorto: "Descanso",
    titulo: "Descanso cerca de todo",
    subtitulo: "Tranquilidad y naturaleza sin alejarte demasiado.",
    descripcion: "Parcelas pensadas para personas que buscan tranquilidad, naturaleza y espacio, sin quedar demasiado alejadas de ciudades, pueblos y servicios.",
    imagenHero: "image/hammock_rest.jpg",
    paraQuien: "Familias, profesionales en teletrabajo y quienes buscan un refugio de fin de semana.",
    actividades: [
      "Segunda vivienda",
      "Escapadas de fin de semana",
      "Teletrabajo",
      "Vida familiar",
      "Huerto",
      "Quincho",
      "Casa de descanso"
    ],
    ventajas: [
      "Equilibrio entre naturaleza y conectividad",
      "Acceso más sencillo a salud, comercio y educación",
      "Menor sensación de aislamiento",
      "Facilidad para visitar la propiedad",
      "Más comodidad para construir"
    ],
    recomendaciones: "Asegúrate de revisar el tiempo de traslado real en distintos horarios y días de la semana.",
    preguntasFrecuentes: [
      { pregunta: "¿Están muy aisladas?", respuesta: "No. Filtramos para asegurar que tengas ciudades o servicios a menos de 50 minutos." },
      { pregunta: "¿Sirven para vivir todo el año?", respuesta: "Sí, gracias a su cercanía y accesibilidad son ideales para primera o segunda vivienda." }
    ],
    textoCta: "Cotizar parcela + casa de descanso",
    puntajeMinimo: 30
  },
  
  inversion: {
    id: "inversion",
    slug: "inversion",
    nombreCorto: "Inversión",
    titulo: "Inversión con potencial",
    subtitulo: "Alta proyección, buen tamaño y precio competitivo.",
    descripcion: "Parcelas seleccionadas por su relación entre precio, superficie, ubicación, conectividad y posibilidades de desarrollo.",
    imagenHero: "image/investment_handshake.jpg",
    paraQuien: "Inversionistas, emprendedores turísticos y quienes buscan plusvalía.",
    actividades: [
      "Construir más adelante",
      "Vivienda",
      "Arriendo turístico",
      "Cabañas",
      "Reventa futura",
      "Subdivisión (cuando sea legalmente posible)",
      "Emprendimiento rural",
      "Conservación del capital"
    ],
    ventajas: [
      "Precio competitivo y menor valor por m²",
      "Mayor superficie por el dinero pagado",
      "Cercanía a zonas con crecimiento",
      "Acceso a rutas principales",
      "Posibilidad de combinar parcela y casa",
      "Facilidad de pago en muchos casos"
    ],
    recomendaciones: "La clasificación entrega una orientación comparativa y no constituye una promesa de rentabilidad.",
    preguntasFrecuentes: [
      { pregunta: "¿Qué significa 'bajo precio por m²'?", respuesta: "Comparamos el valor total del terreno dividido por su superficie con el promedio del catálogo." },
      { pregunta: "¿Puedo subdividir?", respuesta: "Depende estrictamente de la normativa vigente. Debes asesorarte legalmente antes de comprar." }
    ],
    textoCta: "Cotizar proyecto de inversión",
    puntajeMinimo: 40
  },

  nativas: {
    id: "nativas",
    slug: "nativas",
    nombreCorto: "Nativas",
    titulo: "Naturaleza nativa",
    subtitulo: "Ecosistemas valiosos y bosque autóctono.",
    descripcion: "Parcelas con bosque nativo, especies autóctonas o entornos de alto valor natural.",
    imagenHero: "image/native_forest.jpg",
    paraQuien: "Amantes de la naturaleza, conservacionistas y quienes buscan desconexión total.",
    actividades: [
      "Descanso",
      "Conservación",
      "Senderismo",
      "Contemplación",
      "Turismo de naturaleza",
      "Cabaña rústica",
      "Proyecto autosustentable",
      "Educación ambiental",
      "Fotografía de naturaleza"
    ],
    ventajas: [
      "Privacidad absoluta",
      "Paisaje único e irrepetible",
      "Sombra natural permanente",
      "Alta biodiversidad",
      "Valor emocional invaluable",
      "Posibilidad de desconexión"
    ],
    recomendaciones: "Antes de realizar intervenciones sobre bosque o vegetación nativa, deben revisarse las autorizaciones, restricciones y normativa aplicable de CONAF.",
    preguntasFrecuentes: [
      { pregunta: "¿Puedo cortar árboles para construir?", respuesta: "Requieres planes de manejo aprobados por CONAF. Se recomienda intervenir lo mínimo posible." },
      { pregunta: "¿Qué especies hay?", respuesta: "Depende de la zona, pero suele haber robles, coigües, boldos, arrayanes, etc." }
    ],
    textoCta: "Cotizar refugio natural",
    puntajeMinimo: 20 // Basta con que coincida un criterio fuerte
  },

  agua: {
    id: "agua",
    slug: "agua",
    nombreCorto: "Con Agua",
    titulo: "Vida junto al agua",
    subtitulo: "Ríos, esteros o vertientes en tu propiedad.",
    descripcion: "Parcelas con río, estero, arroyo, vertiente, laguna u otro cuerpo de agua confirmado.",
    imagenHero: "image/river_water.jpg",
    paraQuien: "Familias, desarrolladores turísticos y quienes sueñan con el sonido del agua.",
    actividades: [
      "Descanso",
      "Paisajismo",
      "Senderos ribereños",
      "Contemplación",
      "Turismo rural",
      "Huerto",
      "Actividades familiares",
      "Proyecto de cabaña"
    ],
    ventajas: [
      "Alto atractivo paisajístico",
      "Experiencia natural inmersiva",
      "Sonidos relajantes del entorno",
      "Mayor diferenciación y escasez",
      "Gran potencial turístico"
    ],
    recomendaciones: "La existencia de agua no garantiza derechos de aprovechamiento, potabilidad, caudal permanente ni autorización de intervención. Estos antecedentes deben verificarse.",
    preguntasFrecuentes: [
      { pregunta: "¿El agua fluye todo el año?", respuesta: "Depende del predio. Consulta siempre si el caudal es permanente o estacional." },
      { pregunta: "¿Puedo extraer agua?", respuesta: "Requiere derechos de aprovechamiento de aguas (DAA) debidamente inscritos." }
    ],
    textoCta: "Cotizar parcela con agua",
    puntajeMinimo: 30
  }
};

window.categoriasEstilo = categoriasEstilo;
