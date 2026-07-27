/**
 * ============================================================================
 * TU PARCELA LISTA - COTIZADOR V2 (FASE A1: ARQUITECTURA Y CONTRATO)
 * Módulo de Motor de Cálculo Puro (`TPL.CalculatorEngine`)
 * ============================================================================
 * Expone en el ámbito global:
 *   - `window.TPL.CalculatorEngine`: Motor matemático determinista puro.
 *
 * REGLAS DE SEGURIDAD (FASE A1):
 *   1. Funciones 100% puras sin dependencias del DOM ni variables de navegador.
 *   2. Compatible con entorno Node.js y navegador web para pruebas automatizadas.
 *   3. No altera la interfaz web en producción (usado en segundo plano en Shadow Running).
 * ============================================================================
 */

(function(global) {
  'use strict';

  global.TPL = global.TPL || {};
  global.TPL.Project = global.TPL.Project || {};

  /**
   * Obtiene los metros cuadrados construidos de la vivienda con fallback seguro.
   */
  function getSuperficieConstruida(vivienda) {
    if (!vivienda || typeof vivienda !== 'object') return 0;
    const m2 = Number(vivienda.superficieM2);
    return !isNaN(m2) && m2 > 0 ? m2 : 0;
  }

  /**
   * Obtiene el valor por metro cuadrado del sistema constructivo.
   */
  function getValorM2Construccion(sistemaConstructivo) {
    if (!sistemaConstructivo || typeof sistemaConstructivo !== 'object') return 0;
    const val = Number(sistemaConstructivo.valorM2Clp);
    return !isNaN(val) && val > 0 ? val : 0;
  }

  /**
   * Calcula el subtotal del terreno.
   */
  function computeSubtotalTerreno(terreno) {
    if (!terreno || typeof terreno !== 'object') return 0;
    if (terreno.seleccionado === false) return 0;
    const prec = Number(terreno.precioClp);
    return !isNaN(prec) && prec > 0 ? Math.round(prec) : 0;
  }

  /**
   * Calcula el subtotal de construcción (m² x valor m² del sistema).
   */
  function computeSubtotalConstruccion(vivienda) {
    const m2 = getSuperficieConstruida(vivienda);
    const valM2 = getValorM2Construccion(vivienda?.sistemaConstructivo);
    return Math.round(m2 * valM2);
  }

  /**
   * Calcula el subtotal de etapas obligatorias (ej. Estudio de suelo, si aplica).
   */
  function computeSubtotalEtapas(etapasObligatorias) {
    if (!etapasObligatorias || !Array.isArray(etapasObligatorias)) return 0;
    let suma = 0;
    etapasObligatorias.forEach(etapa => {
      if (etapa && typeof etapa === 'object' && !etapa.incluidoEnPrecioBase) {
        const costo = Number(etapa.costoClp);
        if (!isNaN(costo) && costo > 0) suma += Math.round(costo);
      }
    });
    return suma;
  }

  /**
   * Calcula el precio total de un ítem opcional y actualiza su atributo precioTotalClp.
   */
  function computeOpcionalItem(item, superficieCasaM2, superficieTerrenoM2) {
    if (!item || typeof item !== 'object') return { ...item, precioTotalClp: 0 };
    if (item.bloqueadoPorInclusion === true) {
      return { ...item, precioTotalClp: 0 };
    }

    const valorUnitario = Number(item.precioUnitarioClp) || 0;
    if (valorUnitario <= 0) {
      return { ...item, precioTotalClp: 0 };
    }

    let qty = 1;
    const unidad = String(item.unidad || '').toLowerCase();
    const regla = String(item.reglaCalculo || '').toLowerCase();

    if (unidad === 'mt2' || regla === 'proporcional_m2_casa' || item.tipoCalculo2 === 'casa') {
      qty = superficieCasaM2 > 0 ? superficieCasaM2 : 1;
    } else if (regla === 'proporcional_m2_terreno' || item.tipoCalculo2 === 'parcela') {
      qty = superficieTerrenoM2 > 0 ? superficieTerrenoM2 : 1;
    } else {
      const parsedQty = Number(item.cantidad);
      qty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;
    }

    const totalItem = Math.round(valorUnitario * qty);
    return {
      ...item,
      cantidad: qty,
      precioTotalClp: totalItem
    };
  }

  /**
   * Evalúa y calcula el proyecto completo retornando un nuevo objeto inmutable
   * con la sección .totales y los opcionales computados.
   */
  function compute(projectStateObj) {
    if (!projectStateObj || typeof projectStateObj !== 'object') {
      return null;
    }

    // Clonar para inmutabilidad y cálculo puro
    const result = JSON.parse(JSON.stringify(projectStateObj));

    const supCasaM2 = getSuperficieConstruida(result.vivienda);
    const supTerrenoM2 = Number(result.terreno?.superficieM2) || 0;

    // 1. Subtotales
    const subTerreno = computeSubtotalTerreno(result.terreno);
    const subConstruccion = computeSubtotalConstruccion(result.vivienda);
    const subEtapas = computeSubtotalEtapas(result.etapasObligatorias);

    // 2. Opcionales
    let subOpcionales = 0;
    if (result.opcionales && Array.isArray(result.opcionales.items)) {
      result.opcionales.items = result.opcionales.items.map(ex => {
        const computedEx = computeOpcionalItem(ex, supCasaM2, supTerrenoM2);
        subOpcionales += Number(computedEx.precioTotalClp) || 0;
        return computedEx;
      });
    }

    // 3. Total Estimado
    const totalGeneral = subTerreno + subConstruccion + subEtapas + subOpcionales;

    // 4. Actualizar sección .totales
    result.totales = {
      subtotalTerrenoClp: subTerreno,
      subtotalConstruccionClp: subConstruccion,
      subtotalEtapasObligatoriasClp: subEtapas,
      subtotalOpcionalesClp: subOpcionales,
      totalEstimadoClp: totalGeneral,
      moneda: 'CLP',
      tratamientoIva: result.totales?.tratamientoIva || 'iva_incluido_referential'
    };

    // 5. Metricas calculadas secundarias
    if (!result.metricas) result.metricas = {};
    result.metricas.superficieConstruidaM2 = supCasaM2;
    result.metricas.superficieTerrenoM2 = supTerrenoM2;
    if (!result.metricas.perimetroEstimadoMetros && supTerrenoM2 > 0) {
      result.metricas.perimetroEstimadoMetros = Math.round(Math.sqrt(supTerrenoM2) * 4);
    }

    return result;
  }

  // API Pública de Cálculo
  global.TPL.CalculatorEngine = {
    compute,
    getSuperficieConstruida,
    getValorM2Construccion,
    computeSubtotalTerreno,
    computeSubtotalConstruccion,
    computeSubtotalEtapas,
    computeOpcionalItem
  };

})(typeof window !== 'undefined' ? window : globalThis);
