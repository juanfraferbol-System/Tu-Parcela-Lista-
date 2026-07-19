/* =========================================================
   TPL CORE 2.2 - Cerebro Central
   Une modelo maestro, inteligencia y motor de eventos.
========================================================= */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TPL = root.TPL || {};
  root.TPL.orchestrator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  function dependencies() {
    const tpl = root.TPL || {};
    return { model: tpl.propertyModel, intelligence: tpl.intelligence, events: tpl.events };
  }

  function preparePublication(rawPayload, options) {
    const { model, intelligence, events } = dependencies();
    if (!model || !intelligence) return rawPayload;
    const master = model.normalize(rawPayload);
    const validation = model.validate(master);
    const analysis = intelligence.analyze(master);
    master.intelligence = analysis;
    master.validation = validation;

    const enriched = {
      ...rawPayload,
      version: rawPayload.version || 'publicador-tpl-v7-core-2.2',
      schemaVersion: model.SCHEMA_VERSION,
      objetoMaestro: master,
      inteligencia: analysis,
      calidad: {
        score: analysis.quality.score,
        nivel: analysis.quality.level,
        mejoras: analysis.quality.improvements
      },
      automatizaciones: {
        prioridadComercial: analysis.commercialPriority,
        proximasAcciones: analysis.nextActions,
        eventosPendientes: ['PUBLICACION_CREADA', ...(rawPayload.integraciones?.flow?.requerido ? ['PAGO_PENDIENTE'] : [])]
      }
    };

    if (options?.emit !== false) events?.emit?.('PUBLICACION_PREPARADA', { publication: enriched }, options || {});
    return enriched;
  }

  function notify(name, payload, metadata) {
    return dependencies().events?.emit?.(name, payload, metadata);
  }

  return { preparePublication, notify };
});
