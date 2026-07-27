/**
 * ============================================================================
 * TU PARCELA LISTA - COTIZADOR V2 (FASE A1: ARQUITECTURA Y CONTRATO)
 * Módulo de Adaptadores en Modo Observación (`TPL.Services`)
 * ============================================================================
 * Expone en el ámbito global:
 *   - `window.TPL.Services`: Adaptadores de escucha para CRM, PDF, WhatsApp y Telemetría.
 *   - `window.TPL_OBSERVER_LOGS`: Arreglo de auditoría de adaptadores salientes.
 *
 * REGLAS DE SEGURIDAD (FASE A1):
 *   1. No interfiere con el envío vigente ni reemplaza las funciones salientes de V1.
 *   2. Verifica en segundo plano que el objeto canónico cumpla los límites técnicos (< 15 KB).
 *   3. Compara en silencio paridad de totales y reporta anomalías.
 * ============================================================================
 */

(function(global) {
  'use strict';

  global.TPL = global.TPL || {};
  global.TPL.Services = global.TPL.Services || {};
  global.TPL_OBSERVER_LOGS = global.TPL_OBSERVER_LOGS || [];

  /**
   * Retorna fecha y hora ISO actual.
   */
  function nowISO() {
    return new Date().toISOString();
  }

  /**
   * Registra un log de observación en memoria y consola.
   */
  function logObservation(serviceName, status, details) {
    const entry = {
      id: `obs_${serviceName}_${Date.now()}`,
      timestamp: nowISO(),
      service: serviceName,
      status, // 'PARITY_OK' | 'DIVERGENCE_DETECTED' | 'SIZE_WARNING' | 'OBSERVED'
      details
    };
    global.TPL_OBSERVER_LOGS.push(entry);
    if (global.TPL_OBSERVER_LOGS.length > 100) global.TPL_OBSERVER_LOGS.shift();

    if (typeof console !== 'undefined' && console.info) {
      console.info(`[TPL.Services.${serviceName}] ${status}:`, details);
    }
    return entry;
  }

  /**
   * Adaptador de Observación CRM / Supabase.
   * Verifica tamaño del payload canónico (< 15 KB) y paridad de monto total.
   */
  const CRMObserver = {
    observe: function(legacyPayload) {
      const canonState = global.ProyectoTPL || {};
      const serialized = JSON.stringify(canonState);
      const sizeBytes = new Blob([serialized]).size;
      const sizeKB = Number((sizeBytes / 1024).toFixed(2));

      let status = 'PARITY_OK';
      const warnings = [];

      if (sizeKB >= 15) {
        status = 'SIZE_WARNING';
        warnings.push(`Objeto canónico excede límite sugerido de 15 KB (${sizeKB} KB)`);
      }

      const legacyVal = Number(legacyPayload?.valor || legacyPayload?.monto || 0);
      const canonVal = Number(canonState?.totales?.totalEstimadoClp || 0);
      if (legacyVal > 0 && Math.abs(legacyVal - canonVal) > 1) {
        status = 'DIVERGENCE_DETECTED';
        warnings.push(`Monto CRM difiere: Heredado=$${legacyVal} vs Canónico=$${canonVal}`);
      }

      return logObservation('CRMObserver', status, {
        sizeKB,
        legacyVal,
        canonVal,
        warnings,
        canonicalId: canonState?.meta?.idLocalTemporal
      });
    }
  };

  /**
   * Adaptador de Observación PDF Engine.
   */
  const PDFObserver = {
    observe: function(clientData, totalLegacy) {
      const canonVal = Number(global.ProyectoTPL?.totales?.totalEstimadoClp || 0);
      const status = Math.abs(Number(totalLegacy || 0) - canonVal) <= 1 ? 'PARITY_OK' : 'DIVERGENCE_DETECTED';
      return logObservation('PDFObserver', status, {
        legacyTotal: totalLegacy,
        canonicalTotal: canonVal,
        modalidad: global.ProyectoTPL?.meta?.modalidadProyecto
      });
    }
  };

  /**
   * Adaptador de Observación WhatsApp / Mensajería.
   */
  const WhatsAppObserver = {
    observe: function(outgoingText) {
      const canonVal = Number(global.ProyectoTPL?.totales?.totalEstimadoClp || 0);
      const hasCanonicalTotalInText = typeof outgoingText === 'string' && 
        outgoingText.replace(/\./g, '').includes(String(canonVal));

      return logObservation('WhatsAppObserver', 'OBSERVED', {
        outgoingTextLength: outgoingText ? outgoingText.length : 0,
        canonicalTotalMatch: hasCanonicalTotalInText,
        canonicalTotal: canonVal
      });
    }
  };

  /**
   * Adaptador de Observación Analytics / Telemetría.
   * Monitorea eventos y previene duplicaciones en la capa canónica.
   */
  const lastEvents = {};
  const AnalyticsObserver = {
    observe: function(eventName, eventData) {
      const now = Date.now();
      const lastTime = lastEvents[eventName] || 0;
      const isDuplicate = (now - lastTime) < 2000; // Deduplicación en ventana de 2 segundos
      lastEvents[eventName] = now;

      let status = 'OBSERVED';
      if (isDuplicate) {
        status = 'DUPLICATE_DETECTED';
      }

      return logObservation('AnalyticsObserver', status, {
        eventName,
        isDuplicate,
        timeSinceLastMs: now - lastTime,
        data: eventData
      });
    }
  };

  /**
   * Inicializa y envuelve los observadores sobre las APIs globales existentes.
   */
  function initObservers() {
    // Envolver apiSaveLead en modo observación
    if (typeof global.apiSaveLead === 'function' && !global.apiSaveLead._isObserved) {
      const originalSave = global.apiSaveLead;
      const observedSave = async function(payload) {
        try {
          CRMObserver.observe(payload);
        } catch (e) {}
        return await originalSave.apply(this, arguments);
      };
      observedSave._isObserved = true;
      global.apiSaveLead = observedSave;
      if (typeof global.window !== 'undefined') global.window.apiSaveLead = observedSave;
    }

    // Envolver TPLLaunch.track en modo observación
    if (global.TPLLaunch && typeof global.TPLLaunch.track === 'function' && !global.TPLLaunch.track._isObserved) {
      const originalTrack = global.TPLLaunch.track;
      const observedTrack = function(evt, data) {
        try {
          AnalyticsObserver.observe(evt, data);
        } catch (e) {}
        return originalTrack.apply(this, arguments);
      };
      observedTrack._isObserved = true;
      global.TPLLaunch.track = observedTrack;
    }
  }

  // API Pública
  global.TPL.Services = {
    CRMObserver,
    PDFObserver,
    WhatsAppObserver,
    AnalyticsObserver,
    initObservers,
    getLogs: function() { return global.TPL_OBSERVER_LOGS; }
  };

  // Inicialización automática si el DOM ya está listo
  if (typeof document !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(initObservers, 500);
    } else {
      document.addEventListener('DOMContentLoaded', () => setTimeout(initObservers, 500));
    }
  }

})(typeof window !== 'undefined' ? window : globalThis);
