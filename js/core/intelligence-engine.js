/* =========================================================
   TPL CORE 2.2 - Inteligencia comercial determinística
   Calcula calidad, prioridad y próximas acciones sin depender
   todavía de servicios externos de IA.
========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TPL = root.TPL || {};
  root.TPL.intelligence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function truthy(value) { return value !== null && value !== undefined && String(value).trim() !== ''; }

  function quality(model) {
    let score = 0;
    const improvements = [];
    const add = (condition, points, suggestion) => {
      if (condition) score += points;
      else if (suggestion) improvements.push(suggestion);
    };
    add(Boolean(model.location?.lat && model.location?.lng), 15, 'Confirmar la ubicación exacta en el mapa');
    add(model.media.photoCount >= 6, 20, model.media.photoCount ? 'Agregar al menos 6 fotografías variadas' : 'Agregar fotografías de la propiedad');
    add(truthy(model.documentation?.rol) && model.documentation.rol !== 'No lo sé', 15, 'Confirmar la situación del rol');
    add(model.property.price > 0, 10, 'Ingresar el precio de venta');
    add(model.property.landArea > 0 || model.property.builtArea > 0, 10, 'Confirmar la superficie');
    add(truthy(model.services?.agua), 5, 'Informar disponibilidad de agua');
    add(truthy(model.services?.electricidad), 5, 'Informar disponibilidad eléctrica');
    add(truthy(model.property.title) && model.property.title.length >= 20, 5, 'Mejorar el título comercial');
    add(truthy(model.property.description) && model.property.description.length >= 120, 5, 'Ampliar la descripción comercial');
    add(truthy(model.commercial.urgency), 5, 'Definir el nivel de urgencia');
    add(Boolean(model.contact.email && model.contact.phone), 10, 'Completar correo y WhatsApp');
    score = Math.min(100, score);
    return {
      score,
      level: score >= 85 ? 'Excelente' : score >= 65 ? 'Buena' : score >= 45 ? 'Mejorable' : 'Incompleta',
      improvements
    };
  }

  function priority(model, qualityResult) {
    const urgency = Math.max(0, Math.min(100, Number(model.commercial.urgencyScore) || 0));
    const paymentNeeded = Boolean(model.integrations?.flow?.requerido);
    const missingQuality = 100 - qualityResult.score;
    const score = Math.min(100, Math.round(urgency * 0.65 + missingQuality * 0.25 + (paymentNeeded ? 10 : 0)));
    return {
      score,
      level: score >= 80 ? 'Crítica' : score >= 55 ? 'Alta' : score >= 35 ? 'Media' : 'Normal'
    };
  }

  function nextActions(model, qualityResult, priorityResult) {
    const actions = [];
    qualityResult.improvements.slice(0, 3).forEach((label, index) => actions.push({
      id: `quality_${index + 1}`,
      type: 'MEJORAR_PUBLICACION',
      priority: priorityResult.level,
      label,
      responsible: model.contact.role === 'corredor' ? 'corredor' : 'propietario'
    }));
    if (!model.plan.matchesUrgency && model.plan.recommendedId) actions.push({
      id: 'review_plan', type: 'REVISAR_PLAN', priority: 'Alta',
      label: 'Revisar si el plan elegido responde al nivel de urgencia', responsible: 'comercial'
    });
    if (model.integrations?.flow?.requerido) actions.push({
      id: 'confirm_payment', type: 'CONFIRMAR_PAGO', priority: 'Alta',
      label: 'Confirmar el pago en Flow antes de activar la campaña', responsible: 'sistema'
    });
    if ((model.commercial.urgencyScore || 0) >= 70) actions.push({
      id: 'commercial_contact', type: 'CONTACTO_COMERCIAL', priority: 'Alta',
      label: 'Contactar al anunciante dentro de las próximas 24 horas', responsible: 'comercial'
    });
    return actions;
  }

  function analyze(model) {
    const qualityResult = quality(model);
    const priorityResult = priority(model, qualityResult);
    return {
      generatedAt: new Date().toISOString(),
      quality: qualityResult,
      commercialPriority: priorityResult,
      nextActions: nextActions(model, qualityResult, priorityResult),
      signals: {
        urgency: model.commercial.urgency,
        urgencyScore: model.commercial.urgencyScore,
        planMatchesUrgency: model.plan.matchesUrgency,
        requiresPayment: Boolean(model.integrations?.flow?.requerido)
      }
    };
  }

  return { analyze, quality, priority, nextActions };
});
