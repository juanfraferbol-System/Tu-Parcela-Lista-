// js/config-negocio.js
// Configuración Centralizada de Negocio y Automatizaciones para TPL

window.TPL_CONFIG = {
  lanzamiento: {
    modo: 'piloto_limitado',
    modulosPublicos: ['catalogo', 'ficha_parcela', 'cotizador', 'publicar_parcela'],
    modulosOcultos: ['contratistas', 'pagos_directos', 'automatizaciones_mensajeria', 'avances_hitos']
  },

  embudo: [
    'visitante', 'vio_parcela', 'solicito_informacion', 'solicito_visita',
    'inicio_cotizacion', 'guardo_cotizacion', 'activo_proyecto', 'contactado',
    'negociando', 'cerro', 'abandono'
  ],

  // 1. Plazos de Seguimiento (en días)
  seguimiento: {
    nuevo_interesado_alerta: 0,       // Tarea inmediata
    cotizacion_sin_activar: 2,        // Días para contactar si no activó
    visita_recordatorio_previo: 1,    // Días antes de la visita
    visita_seguimiento_post: 1        // Días después de la visita
  },

  // 2. Sistema de Puntuación de Leads (Lead Scoring)
  scoring: {
    // Señales Positivas
    presupuesto_suficiente: 30,
    solicito_visita: 40,
    creo_cotizacion: 20,
    activo_proyecto: 50,
    tiene_parcela_elegida: 15,
    incluyo_casa: 10,
    indico_urgencia: 25,
    
    // Señales Negativas (Degradación)
    dias_sin_respuesta: -5,           // Por cada día
    abandono_cotizador: -10,

    // Clasificación Automática
    obtenerClasificacion: function(score) {
      if (score >= 80) return 'Alta Prioridad';
      if (score >= 40) return 'Prioridad Media';
      if (score >= 10) return 'Prioridad Baja';
      if (score < 10) return 'Seguimiento Pendiente';
      return 'Sin Actividad';
    }
  },

  // 3. Evaluar cliente basado en interacciones
  calcularScoreCliente: function(interacciones) {
    let score = 0;
    
    // Evaluaciones
    if (interacciones.visita) score += this.scoring.solicito_visita;
    if (interacciones.cotizacion_guardada) score += this.scoring.creo_cotizacion;
    if (interacciones.proyecto_activado) score += this.scoring.activo_proyecto;
    if (interacciones.presupuesto && interacciones.presupuesto > 30000000) score += this.scoring.presupuesto_suficiente;
    if (interacciones.casa) score += this.scoring.incluyo_casa;
    if (interacciones.urgencia) score += this.scoring.indico_urgencia;
    
    // Penalizaciones
    if (interacciones.dias_inactivo) {
      score += (interacciones.dias_inactivo * this.scoring.dias_sin_respuesta);
    }

    // Límite mínimo
    if (score < 0) score = 0;

    return {
      score_numerico: score,
      clasificacion: this.scoring.obtenerClasificacion(score)
    };
  }
};
