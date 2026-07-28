/**
 * js/tpl-valuation-engine.js — Motor Universal Compartido de Tasación e Inteligencia de Mercado TPL
 * ETAPAS 2, 3, 4, 5, 6 y 7 de la Implementación Integral.
 *
 * REGLA PRINCIPAL: No crear dos tasadores diferentes. Un único motor de cálculo reutilizable por:
 * - Publicar Parcela
 * - tasador.html (Tasador independiente)
 * - CRM y Base de datos
 * - Informe HTML y PDF
 *
 * Consume sin alterar:
 * - TPLLandEngine (Terrenos: tramos 7.000m², 10.000m², factor comercial 0.75, distancia 45-60km)
 * - TPLHouseEngine (Vivienda: madera $270k, sólida $350k, dep 5 años, fundaciones, mejoras)
 */
(function(global){
  'use strict';

  // Intentar cargar motores core en entornos Node/CommonJS si no están globales
  if (typeof global.TPLLandEngine === 'undefined' && typeof require !== 'undefined') {
    try { global.TPLLandEngine = require('../plataforma/publicar/tpl-land-engine.js'); } catch(e){}
  }
  if (typeof global.TPLHouseEngine === 'undefined' && typeof require !== 'undefined') {
    try { global.TPLHouseEngine = require('../plataforma/publicar/tpl-house-engine.js'); } catch(e){}
  }

  const ENGINE_VERSION = 'TPL-VALUATION-CORE-v2026-07';
  const INDEX_VERSION_DEFAULT = 'IM-TPL-2026-07';

  // ETAPA 6: Configuración centralizada de estrategias de precio
  const RULES = Object.freeze({
    estrategias: Object.freeze({
      rapidaFactor: 0.95,
      recomendadaFactor: 1.00,
      pacienteFactor: 1.06,
      explicacionRapida: "Precio competitivo para generar mayor interés.",
      explicacionRecomendada: "Equilibrio entre la tasación técnica y el mercado comunal.",
      explicacionPaciente: "Precio para propietarios dispuestos a esperar una oferta superior."
    }),
    posicionMercado: Object.freeze({
      muyConveniente: -15, // <= -15%
      competitiva: -5,    // -15% a -5%
      alineada: 5,        // -5% a 5%
      sobreMercado: 15    // 5% a 15%, > 15% es Muy sobre el mercado
    })
  });

  // ETAPA 4: Fuente Canónica: mercado_comunas en base de datos. Sin valores hardcodeados.
  const DEFAULT_MARKET_INDEX = Object.freeze({});

  /**
   * Normaliza texto de comuna para búsquedas tolerantes (mayúsculas, acentos, Ñipas -> Ránquil, espacios).
   */
  function normalizarNombreComuna(comunaStr) {
    if (!comunaStr) return '';
    const norm = String(comunaStr)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
    return norm;
  }

  /**
   * Redondea valores comerciales a múltiplos de $10.000 sin alterar datos internos.
   * Ejemplo: $34.153.847 -> $34.150.000
   */
  function roundCommercial(val) {
    if (val === null || val === undefined || isNaN(val)) return null;
    const num = Number(val);
    if (!isFinite(num) || num <= 0) return 0;
    return Math.round(num / 10000) * 10000;
  }

  /**
   * Obtiene índice de mercado desde fallback en memoria o estructura pasada.
   */
  function obtenerMercadoLocal(comuna, region) {
    return null; // La fuente canónica única es la tabla mercado_comunas en BD
  }

  /**
   * Consulta asíncrona de índice de mercado a Supabase (Única fuente canónica).
   * Resuelve automáticamente nombres normalizados y aliases (ej: Ñipas -> Ránquil).
   */
  async function obtenerMercadoComunaAsync(comuna, region, supabaseClient) {
    if (!supabaseClient || !comuna) return null;

    try {
      const comunaNorm = normalizarNombreComuna(comuna);
      // Traer comunas activas de la base de datos (fuente canónica única)
      const { data, error } = await supabaseClient
        .from('mercado_comunas')
        .select('*')
        .eq('activo', true);
        
      if (!error && Array.isArray(data)) {
        // Buscar coincidencia por nombre normalizado, comuna o aliases
        const match = data.find(item => {
          if (normalizarNombreComuna(item.comuna) === comunaNorm || normalizarNombreComuna(item.nombre_normalizado) === comunaNorm) {
            return true;
          }
          if (item.aliases && Array.isArray(item.aliases)) {
            return item.aliases.some(alias => normalizarNombreComuna(alias) === comunaNorm);
          }
          if (typeof item.aliases === 'string') {
            try {
              const arr = JSON.parse(item.aliases);
              if (Array.isArray(arr) && arr.some(alias => normalizarNombreComuna(alias) === comunaNorm)) return true;
            } catch(e){}
          }
          return false;
        });

        if (match) {
          return {
            id: match.id,
            region: match.region,
            comuna: match.comuna,
            nombre_normalizado: match.nombre_normalizado,
            valor_promedio_m2: Number(match.valor_promedio_m2) || 0,
            valor_parcela_tipo_5000: Number(match.valor_parcela_tipo_5000) || 0,
            rango_bajo_m2: Number(match.rango_bajo_m2) || 0,
            rango_alto_m2: Number(match.rango_alto_m2) || 0,
            comparables_revisados: Number(match.comparables_revisados) || 0,
            comparables_validos: Number(match.comparables_validos) || 0,
            confianza: match.confianza || 'Media',
            fuentes: match.fuentes || [],
            fecha_actualizacion: match.fecha_actualizacion,
            version: match.version || INDEX_VERSION_DEFAULT
          };
        }
      }
    } catch(e) {
      console.warn('TPLValuationEngine: Error consultando mercado_comunas.', e);
    }
    return null;
  }

  /**
   * Clasificación de posición frente al mercado (ETAPA 7).
   */
  function clasificarPosicionMercado(valorTpl, valorMercado) {
    if (!valorMercado || !valorTpl || valorMercado <= 0) return 'No evaluado (sin referencia comunal)';
    const diffPct = ((valorTpl - valorMercado) / valorMercado) * 100;
    if (diffPct <= RULES.posicionMercado.muyConveniente) return 'Muy conveniente';
    if (diffPct <= RULES.posicionMercado.competitiva) return 'Competitiva';
    if (diffPct <= RULES.posicionMercado.alineada) return 'Alineada con el mercado';
    if (diffPct <= RULES.posicionMercado.sobreMercado) return 'Sobre el mercado';
    return 'Muy sobre el mercado';
  }

  /**
   * ETAPA 2: Función Principal Unificada de Cálculo
   * @param {Object} datosPropiedad
   * @param {Object} [indiceMercadoExterno] - Índice preobtenido opcional
   */
  function calcularTasacionTPL(datosPropiedad, indiceMercadoExterno = null) {
    const p = datosPropiedad || {};
    const superficieTerrenoM2 = Math.max(0, Number(p.superficieTerrenoM2 || p.superficie || 0));
    const comuna = String(p.comuna || '').trim();
    const region = String(p.region || '').trim();

    // 1. Invocar Motor Canónico TPL (TPLHouseEngine o TPLLandEngine)
    let valorTerrenoTpl = 0;
    let valorCasaTpl = 0;
    let valorMejorasTpl = 0;
    let valorTplTotal = 0;
    let desgloseTecnico = null;

    if (global.TPLHouseEngine && typeof global.TPLHouseEngine.calculate === 'function') {
      const houseInput = {
        superficie: superficieTerrenoM2,
        region: region,
        comuna: comuna,
        distanciaKm: p.distanciaReferenciaKm !== undefined && p.distanciaReferenciaKm !== null ? Number(p.distanciaReferenciaKm) : null,
        incluyeVivienda: Boolean(p.tieneCasa || (Number(p.superficieCasaM2) > 0)),
        materialPrincipal: p.tipoConstruccion || p.materialPrincipal || 'madera',
        superficieCasa: Number(p.superficieCasaM2 || p.superficieCasa || 0),
        antiguedad: Number(p.antiguedadCasa || p.antiguedad || 0),
        estadoConservacion: p.estadoCasa || p.estadoConservacion || 'excelente',
        fundacion: p.tipoFundacion || p.fundacion || 'radier_terminado',
        obrasAdicionales: p.mejoras || p.obrasAdicionales || {},
        caracteristicaDiferenciadora: p.caracteristicaDiferenciadora || ''
      };
      const houseRes = global.TPLHouseEngine.calculate(houseInput);
      desgloseTecnico = houseRes;
      if (houseRes && houseRes.desglose) {
        valorTerrenoTpl = Number(houseRes.desglose.terreno) || 0;
        const casaVal = (houseRes.desglose.casa && houseRes.desglose.casa.incluida !== false) ? Number(houseRes.desglose.casa.valorTotalCasa || 0) : 0;
        const fundVal = (houseRes.desglose.fundacion) ? Number(houseRes.desglose.fundacion.valorTotalFundacion || 0) : 0;
        valorCasaTpl = casaVal + fundVal;
        valorMejorasTpl = Number(houseRes.desglose.sumaObrasAdicionales) || 0;
        valorTplTotal = Number(houseRes.valorComercialTotal) || (valorTerrenoTpl + valorCasaTpl + valorMejorasTpl);
      }
    } else if (global.TPLLandEngine && typeof global.TPLLandEngine.calculate === 'function') {
      const landInput = {
        area: superficieTerrenoM2,
        region: region,
        comuna: comuna,
        distanceKm: p.distanciaReferenciaKm !== undefined && p.distanciaReferenciaKm !== null ? Number(p.distanciaReferenciaKm) : 0
      };
      const landRes = global.TPLLandEngine.calculate(landInput);
      desgloseTecnico = landRes;
      if (landRes) {
        valorTerrenoTpl = Number(landRes.ideal || landRes.reference) || 0;
        valorTplTotal = valorTerrenoTpl;
      }
    } else {
      // Regla de respaldo puro si los motores no estuvieran cargados
      const baseCalc = superficieTerrenoM2 <= 7000 ? superficieTerrenoM2 * 2000 : 7000 * 2000 + (superficieTerrenoM2 - 7000) * 1000;
      valorTerrenoTpl = Math.round(baseCalc * 0.75);
      valorTplTotal = valorTerrenoTpl;
    }

    // 2. Obtener Índice de Mercado Comunal (ETAPA 4)
    const mercadoInfo = indiceMercadoExterno || obtenerMercadoLocal(comuna, region);
    const valorMercadoM2 = mercadoInfo && mercadoInfo.valor_promedio_m2 ? Number(mercadoInfo.valor_promedio_m2) : null;
    const valorMercadoTotal = valorMercadoM2 ? Math.round(superficieTerrenoM2 * valorMercadoM2) : null;
    const confianzaMercado = mercadoInfo ? (mercadoInfo.confianza || 'Media') : 'Sin referencias vigentes';
    const versionIndice = mercadoInfo ? (mercadoInfo.version || INDEX_VERSION_DEFAULT) : 'N/A';

    // 3. Cálculo del Valor Comercial Recomendado (ETAPA 5)
    let valorComercialRecomendadoBruto = valorTplTotal;
    if (valorMercadoTotal !== null && valorMercadoTotal > 0) {
      valorComercialRecomendadoBruto = (valorTplTotal + valorMercadoTotal) / 2;
    }
    const valorComercialRecomendado = roundCommercial(valorComercialRecomendadoBruto);

    // 4. Estrategias de Precio (ETAPA 6)
    const precioVentaRapida = roundCommercial(valorComercialRecomendadoBruto * RULES.estrategias.rapidaFactor);
    const precioVentaPaciente = roundCommercial(valorComercialRecomendadoBruto * RULES.estrategias.pacienteFactor);

    // 5. Posición frente al Mercado (ETAPA 7)
    const diferenciaMercadoPorcentaje = valorMercadoTotal ? Number((((valorTplTotal - valorMercadoTotal) / valorMercadoTotal) * 100).toFixed(1)) : null;
    const posicionMercado = clasificarPosicionMercado(valorTplTotal, valorMercadoTotal);

    // 6. Formateo y Salida Esperada
    return {
      valorTerrenoTpl: Math.round(valorTerrenoTpl),
      valorCasaTpl: Math.round(valorCasaTpl),
      valorMejorasTpl: Math.round(valorMejorasTpl),
      valorTplTotal: Math.round(valorTplTotal),
      valorMercadoM2: valorMercadoM2,
      valorMercadoTotal: valorMercadoTotal,
      valorComercialRecomendado: valorComercialRecomendado,
      precioVentaRapida: precioVentaRapida,
      precioRecomendado: valorComercialRecomendado,
      precioVentaPaciente: precioVentaPaciente,
      diferenciaMercadoPorcentaje: diferenciaMercadoPorcentaje,
      posicionMercado: posicionMercado,
      confianzaMercado: confianzaMercado,
      comuna: comuna || 'No informada',
      superficieTerrenoM2: superficieTerrenoM2,
      versionMotor: ENGINE_VERSION,
      versionIndice: versionIndice,
      fechaCalculo: new Date().toISOString(),
      // Atributos explicativos e informativos para interfaces y PDF
      explicaciones: {
        rapida: RULES.estrategias.explicacionRapida,
        recomendada: RULES.estrategias.explicacionRecomendada,
        paciente: RULES.estrategias.explicacionPaciente,
        posicion: "Posición estimada frente al mercado según referencias comunales vigentes.",
        avisoLegal: "Esta tasación corresponde a una estimación referencial basada en los datos proporcionados, el Motor de Tasación TPL y referencias de mercado de la comuna. No reemplaza una tasación bancaria, judicial ni pericial."
      },
      mercadoDisponible: Boolean(valorMercadoTotal !== null && valorMercadoTotal > 0),
      mensajeSinMercado: !Boolean(valorMercadoTotal !== null && valorMercadoTotal > 0) ? "Todavía no contamos con suficientes referencias de mercado para esta comuna. La estimación mostrada corresponde al Motor de Tasación TPL." : null,
      desgloseTecnico: desgloseTecnico
    };
  }

  const exportObj = Object.freeze({
    ENGINE_VERSION,
    RULES,
    DEFAULT_MARKET_INDEX,
    normalizarNombreComuna,
    roundCommercial,
    obtenerMercadoLocal,
    obtenerMercadoComunaAsync,
    clasificarPosicionMercado,
    calcularTasacionTPL
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = exportObj;
  global.TPLValuationEngine = exportObj;
})(typeof window !== 'undefined' ? window : globalThis);
