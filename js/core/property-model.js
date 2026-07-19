/* =========================================================
   TPL CORE 2.2 - Objeto Maestro de Propiedad
   Normaliza cualquier publicación al contrato común que usarán
   Publicador, CRM, Tasador, Flow, buscador y reportes.
========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TPL = root.TPL || {};
  root.TPL.propertyModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA_VERSION = 'tpl-property-v1';
  const num = (value) => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
  const text = (value) => String(value ?? '').trim();
  const array = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

  function makeId(input) {
    return text(input) || `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalize(raw) {
    const source = raw || {};
    const property = source.propiedad || source.property || {};
    const location = source.ubicacion || source.location || null;
    const contact = source.contacto || source.owner || {};
    const commercial = source.comercial || source.commercial || {};
    const media = source.medios || source.media || {};
    const plan = source.plan || {};
    const now = new Date().toISOString();
    const landArea = num(property.superficieTerreno ?? property.landArea);
    const builtArea = num(property.superficieConstruida ?? property.builtArea);
    const price = num(property.precio ?? property.price);
    const referenceArea = landArea || builtArea;

    return {
      schemaVersion: SCHEMA_VERSION,
      id: makeId(source.id || source.codigo),
      externalCode: text(source.codigo || source.externalCode),
      status: text(source.estado || source.status || 'borrador'),
      source: text(source.metadata?.origen || source.source || 'desconocido'),
      property: {
        type: text(property.tipo || property.type),
        subtype: text(property.subtipo || property.subtype),
        title: text(property.titulo || property.title),
        description: text(property.descripcion || property.description),
        price,
        landArea,
        builtArea,
        pricePerM2: num(property.precioM2) || (referenceArea && price ? Math.round(price / referenceArea) : 0)
      },
      location: location ? {
        region: text(property.region || location.region),
        commune: text(property.comuna || location.commune || location.comuna),
        locality: text(property.localidad || location.locality || location.localidad),
        lat: Number(location.lat) || null,
        lng: Number(location.lng) || null,
        mapsUrl: text(location.enlaceGoogleMaps || location.mapsUrl),
        approximatePublicLocation: Boolean(location.publicaAproximada ?? location.approximatePublicLocation),
        source: text(location.source)
      } : null,
      land: {
        ...(source.terreno || source.land || {}),
        naturaleza: array(source.terreno?.naturaleza || source.land?.nature)
      },
      house: {
        ...(source.casa || source.house || {}),
        extras: array(source.casa?.extras || source.house?.extras)
      },
      services: { ...(source.servicios || source.services || {}) },
      documentation: { ...(source.documentacion || source.documentation || {}) },
      contact: {
        role: text(contact.tipo || contact.role),
        name: text(contact.nombre || contact.name),
        phone: text(contact.telefono || contact.phone),
        email: text(contact.email)
      },
      commercial: {
        urgency: text(commercial.urgencia || commercial.urgency),
        urgencyLabel: text(commercial.urgenciaEtiqueta || commercial.urgencyLabel),
        urgencyScore: num(commercial.urgenciaPuntaje ?? commercial.urgencyScore),
        saleDeadline: text(commercial.plazoVenta || commercial.saleDeadline),
        timeOnMarket: text(commercial.tiempoEnVenta || commercial.timeOnMarket),
        priceNegotiation: text(commercial.negociacionPrecio || commercial.priceNegotiation),
        visitAvailability: text(commercial.disponibilidadVisitas || commercial.visitAvailability),
        suggestedProtocol: text(commercial.protocoloSugerido || commercial.suggestedProtocol),
        priceStrategy: text(commercial.estrategiaPrecio || commercial.priceStrategy)
      },
      plan: {
        id: text(plan.id),
        name: text(plan.nombre || plan.name),
        fee: text(plan.tarifa || plan.fee),
        commission: text(plan.comision || plan.commission),
        recommendedId: text(plan.recomendado || plan.recommendedId),
        matchesUrgency: Boolean(plan.coincideConUrgencia ?? plan.matchesUrgency)
      },
      valuation: source.tasacion || source.valuation || null,
      media: {
        photoCount: num(media.cantidadFotos ?? media.photoCount ?? source.fotos),
        coverIndex: num(media.portadaIndice ?? media.coverIndex)
      },
      integrations: { ...(source.integraciones || source.integrations || {}) },
      consent: { ...(source.consentimiento || source.consent || {}) },
      intelligence: source.inteligencia || source.intelligence || null,
      audit: {
        createdAt: text(source.metadata?.createdAt || source.audit?.createdAt || now),
        updatedAt: now,
        payloadVersion: text(source.version || source.schemaVersion || 'legacy')
      },
      raw: source
    };
  }

  function validate(model) {
    const errors = [];
    if (!model?.property?.type) errors.push('property.type');
    if (!model?.property?.price) errors.push('property.price');
    if (!model?.property?.landArea && !model?.property?.builtArea) errors.push('property.area');
    if (!model?.contact?.name) errors.push('contact.name');
    if (!model?.contact?.phone && !model?.contact?.email) errors.push('contact.channel');
    return { valid: errors.length === 0, errors };
  }

  return { SCHEMA_VERSION, normalize, validate };
});
