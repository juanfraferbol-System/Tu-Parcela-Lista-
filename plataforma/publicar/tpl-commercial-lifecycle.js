/**
 * TPL COMMERCIAL LIFECYCLE MODULE
 * Gestión de ciclo de vida, historial inmutable de precios, separación de canales,
 * cálculo de precisión analítica y declaración de cierre para el aprendizaje del tasador.
 * Versión: tpl-commercial-lifecycle-v1
 */
(function(global){
  'use strict';

  const CHANNELS_CATALOG = Object.freeze([
    'Tu Parcela Lista',
    'corredor asociado',
    'portal inmobiliario externo',
    'Facebook Marketplace',
    'redes sociales',
    'WhatsApp',
    'referido',
    'letrero',
    'venta directa',
    'otro'
  ]);

  const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

  /**
   * Calcula los indicadores derivados del ciclo comercial
   * No altera automáticamente las reglas del motor en la primera versión.
   */
  function calculateDerivedIndicators({
    valorSugeridoPropietario,
    valorRecomendadoTPL,
    precioInicialPublicacion,
    precioFinalPublicado,
    valorRealVenta,
    fechaPublicacion,
    fechaVenta,
    consultasRecibidas = 0,
    visitasRealizadas = 0,
    ofertasRecibidas = 0
  }) {
    const valProp = num(valorSugeridoPropietario);
    const valTpl = num(valorRecomendadoTPL);
    const valVenta = num(valorRealVenta);
    const precioInit = num(precioInicialPublicacion || valProp);
    const precioFinal = num(precioFinalPublicado || valVenta);

    const difPropTplAbs = Math.abs(valProp - valTpl);
    const difPropTplPct = valTpl > 0 ? Number(((valProp - valTpl) / valTpl * 100).toFixed(1)) : 0;
    
    let difTplVentaReal = 0;
    let errorPctTasacion = 0;
    let precisionAprox = null;

    if (valVenta > 0 && valTpl > 0) {
      difTplVentaReal = valTpl - valVenta;
      errorPctTasacion = Number(((valTpl - valVenta) / valVenta * 100).toFixed(1));
      precisionAprox = Math.max(0, Number((100 - Math.abs(errorPctTasacion)).toFixed(1)));
    }

    let diasMercado = 0;
    if (fechaPublicacion) {
      const start = new Date(fechaPublicacion).getTime();
      const end = fechaVenta ? new Date(fechaVenta).getTime() : Date.now();
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        diasMercado = Math.round((end - start) / (1000 * 60 * 60 * 24));
      }
    }

    const reduccionTotal = Math.max(0, precioInit - (precioFinal || valVenta));
    const convConsultasVisitas = consultasRecibidas > 0 ? Number((visitasRealizadas / consultasRecibidas * 100).toFixed(1)) : 0;
    const convVisitasOfertas = visitasRealizadas > 0 ? Number((ofertasRecibidas / visitasRealizadas * 100).toFixed(1)) : 0;
    const convOfertasVenta = ofertasRecibidas > 0 ? Number((1 / ofertasRecibidas * 100).toFixed(1)) : 0;

    return {
      diferenciaPropietarioTPLAbs: difPropTplAbs,
      diferenciaPropietarioTPLPct: difPropTplPct,
      diferenciaTPLVentaReal: difTplVentaReal,
      errorPorcentualTasacion: errorPctTasacion,
      precisionAproximada: precisionAprox,
      diasEnMercado: diasMercado,
      reduccionTotalPrecio: reduccionTotal,
      conversionConsultasVisitas: convConsultasVisitas,
      conversionVisitasOfertas: convVisitasOfertas,
      conversionOfertasVenta: convOfertasVenta
    };
  }

  /**
   * Genera un registro inmutable de historial de precio
   * Nunca sobrescribe valores anteriores en el array de historial.
   */
  function createPriceHistoryRecord({
    precioAnterior,
    precioNuevo,
    motivo,
    usuarioId = null,
    badgeActivoAntes = false,
    badgeActivoDespues = false,
    fuente = 'cambio_precio_propietario'
  }) {
    return {
      id: 'ph_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
      precioAnterior: num(precioAnterior),
      precioNuevo: num(precioNuevo),
      fecha: new Date().toISOString(),
      usuarioProceso: usuarioId || 'propietario_o_sistema',
      motivo: String(motivo || 'Actualización de precio comercial'),
      badgeActivoAntes: Boolean(badgeActivoAntes),
      badgeActivoDespues: Boolean(badgeActivoDespues),
      fuente: String(fuente)
    };
  }

  /**
   * Construye el objeto de declaración de venta al cierre
   */
  function buildSaleDeclaration(input = {}) {
    const indicators = calculateDerivedIndicators(input);
    
    return {
      valorRealVenta: num(input.valorRealVenta || input.precioVendido),
      fechaEfectiva: input.fechaEfectiva || input.fechaVenta || new Date().toISOString(),
      canalDescubrimiento: String(input.canalDescubrimiento || 'Tu Parcela Lista'),
      canalContacto: String(input.canalContacto || 'WhatsApp'),
      canalCierre: String(input.canalCierre || 'corredor asociado'),
      compradorOriginadoPorTPL: Boolean(input.compradorOriginadoPorTPL),
      publicacionInfluenciadaPorTPL: Boolean(input.publicacionInfluenciadaPorTPL || input.compradorOriginadoPorTPL),
      observacionesCierre: String(input.observacionesCierre || ''),
      indicadoresDerivados: indicators,
      metadata: {
        versionMotorTerritorial: input.versionMotorTerritorial || 'tpl-land-engine-v1',
        versionMotorVivienda: input.versionMotorVivienda || 'tpl-house-engine-v1',
        versionModuloUbicacion: input.versionModuloUbicacion || 'tpl-location-service-v1',
        versionReglas: input.versionReglas || '2026-07-27',
        declaradoEn: new Date().toISOString()
      }
    };
  }

  const exportObj = Object.freeze({
    CHANNELS_CATALOG,
    calculateDerivedIndicators,
    createPriceHistoryRecord,
    buildSaleDeclaration
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = exportObj;
  global.TPLCommercialLifecycle = exportObj;
})(typeof window !== 'undefined' ? window : globalThis);
