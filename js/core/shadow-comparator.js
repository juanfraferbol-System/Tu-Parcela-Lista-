/**
 * ============================================================================
 * TU PARCELA LISTA - COTIZADOR V2 (FASE A1: ARQUITECTURA Y CONTRATO)
 * Módulo de Comparación en Paralelo (`TPL.ShadowComparator`)
 * ============================================================================
 * Expone en el ámbito global:
 *   - `window.TPL.ShadowComparator`: Evaluador y registrador de paridad matemática.
 *   - `window.TPL_SHADOW_REPORTS`: Arreglo circular con reportes estructurados de divergencia.
 *
 * REGLAS DE SEGURIDAD (FASE A1):
 *   1. No altera la interfaz ni interrumpe el flujo de UI del usuario en ningún escenario.
 *   2. Registra reportes estructurados completos (escenario, estado, diferencia, partida causante).
 *   3. Provee estadísticas agregadas para certificación bloqueante de Fase A1 (100% paridad).
 * ============================================================================
 */

(function(global) {
  'use strict';

  global.TPL = global.TPL || {};
  global.TPL.Project = global.TPL.Project || {};
  global.TPL_SHADOW_REPORTS = global.TPL_SHADOW_REPORTS || [];

  let totalComparisons = 0;
  let totalDivergences = 0;

  /**
   * Retorna fecha y hora ISO actual.
   */
  function nowISO() {
    return new Date().toISOString();
  }

  /**
   * Identifica qué partida del proyecto o subtotal generó la divergencia de monto.
   */
  function identifyDivergenceSource(legacyTotal, canonicalProject) {
    if (!canonicalProject || !canonicalProject.totales) {
      return 'Objeto canónico o sección .totales ausente';
    }

    const canonTotal = Number(canonicalProject.totales.totalEstimadoClp) || 0;
    const diff = canonTotal - Number(legacyTotal);

    if (diff === 0) return 'Sin divergencia';

    // Probar si el terreno explica exactamente la diferencia
    const subTerreno = Number(canonicalProject.totales.subtotalTerrenoClp) || 0;
    if (Math.abs(diff) === subTerreno && subTerreno > 0) {
      return `Subtotal Terreno ($${subTerreno} CLP)`;
    }

    // Probar si la construcción explica la diferencia
    const subConst = Number(canonicalProject.totales.subtotalConstruccionClp) || 0;
    if (Math.abs(diff) === subConst && subConst > 0) {
      return `Subtotal Construcción ($${subConst} CLP)`;
    }

    // Buscar en ítems opcionales si alguno coincide con el monto exacto de diferencia
    if (canonicalProject.opcionales && Array.isArray(canonicalProject.opcionales.items)) {
      for (const item of canonicalProject.opcionales.items) {
        const itemVal = Number(item.precioTotalClp) || 0;
        if (Math.abs(diff) === itemVal && itemVal > 0) {
          return `Ítem opcional: ${item.nombre || item.idCanonic} ($${itemVal} CLP)`;
        }
      }
    }

    return `Divergencia compuesta o no identificada linealmente (Diferencia: $${diff} CLP)`;
  }

  /**
   * Registra y almacena un reporte estructurado de divergencia.
   */
  function reportDivergence(reportData) {
    totalDivergences++;
    const fullReport = {
      id: `shadow_div_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: nowISO(),
      escenario: String(reportData.escenario || 'evaluacion_desconocida'),
      estadoEntrada: reportData.estadoEntrada || null,
      resultadoHeredado: Number(reportData.resultadoHeredado) || 0,
      resultadoCanonico: Number(reportData.resultadoCanonico) || 0,
      diferencia: Number(reportData.diferencia) || 0,
      partidaCausante: String(reportData.partidaCausante || 'No determinada')
    };

    global.TPL_SHADOW_REPORTS.push(fullReport);
    if (global.TPL_SHADOW_REPORTS.length > 200) {
      global.TPL_SHADOW_REPORTS.shift(); // Almacenar máximo los últimos 200 reportes
    }

    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[TPL.ShadowComparator] DIVERGENCIA DETECTADA EN PARALELO:', fullReport);
    }

    // Emitir evento para observadores o telemetría
    if (global.window && typeof global.window.dispatchEvent === 'function') {
      try {
        global.window.dispatchEvent(new CustomEvent('tpl_shadow_divergence', { detail: fullReport }));
      } catch (e) {}
    }

    return fullReport;
  }

  /**
   * Compara el resultado heredado contra el objeto canónico calculado en paralelo.
   */
  function compare(legacyResult, canonicalProjectObj, escenario = 'general') {
    totalComparisons++;

    const legacyTotal = typeof legacyResult === 'object' && legacyResult !== null ?
                        Number(legacyResult.total || legacyResult.totalAmount || 0) :
                        Number(legacyResult) || 0;

    const canonTotal = Number(canonicalProjectObj?.totales?.totalEstimadoClp) || 0;
    const diferencia = Math.abs(canonTotal - legacyTotal);

    // Tolerancia de redondeo de $1 CLP para paridad flotante
    if (diferencia > 1) {
      const causante = identifyDivergenceSource(legacyTotal, canonicalProjectObj);
      return reportDivergence({
        escenario,
        estadoEntrada: canonicalProjectObj,
        resultadoHeredado: legacyTotal,
        resultadoCanonico: canonTotal,
        diferencia,
        partidaCausante: causante
      });
    }

    return null; // Sin divergencia, 100% paridad matemática
  }

  /**
   * Obtiene estadísticas agregadas de la auditoría en paralelo.
   */
  function getSummaryStatistics() {
    const parityRate = totalComparisons > 0 ?
      ((totalComparisons - totalDivergences) / totalComparisons) * 100 : 100;

    return {
      totalComparisons,
      totalDivergences,
      parityRatePercentage: Number(parityRate.toFixed(2)),
      isApprovedForA2: totalComparisons > 0 && totalDivergences === 0,
      reportsCount: global.TPL_SHADOW_REPORTS.length
    };
  }

  /**
   * Limpia los reportes y estadísticas (útil entre ejecuciones de pruebas unitarias).
   */
  function clearReports() {
    global.TPL_SHADOW_REPORTS.length = 0;
    totalComparisons = 0;
    totalDivergences = 0;
  }

  // API Pública
  global.TPL.ShadowComparator = {
    compare,
    reportDivergence,
    identifyDivergenceSource,
    getReports: function() { return global.TPL_SHADOW_REPORTS; },
    getSummaryStatistics,
    clearReports
  };

})(typeof window !== 'undefined' ? window : globalThis);
