/**
 * ============================================================================
 * TU PARCELA LISTA - COTIZADOR V2 (FASE A1: ARQUITECTURA Y CONTRATO)
 * Módulo de Estado y Persistencia Resiliente (`TPL.ProjectState`)
 * ============================================================================
 * Expone en el ámbito global:
 *   - `window.TPL.ProjectState`: Controlador inmutable de persistencia y estado.
 *   - `window.ProyectoTPL`: Objeto canónico de solo lectura/mutación controlada.
 *
 * REGLAS DE SEGURIDAD (FASE A1):
 *   1. No modifica el DOM ni altera la interfaz gráfica.
 *   2. No purga silenciosamente cachés corruptas (protocolo en 7 pasos).
 *   3. Excluye estrictamente PII (nombre, teléfono, email) al persistir en localStorage.
 *   4. Compatible con Node.js y navegadores web para pruebas unitarias.
 * ============================================================================
 */

(function(global) {
  'use strict';

  global.TPL = global.TPL || {};
  global.TPL.Project = global.TPL.Project || {};

  const STORAGE_KEY = 'tpl_project_v3_state';
  const CURRENT_SCHEMA_VERSION = '2.1.0';

  /**
   * Genera un ID local temporal para seguimiento antes de confirmación en Supabase/CRM.
   */
  function generateLocalId() {
    const timestamp = Date.now();
    const randomHex = Math.random().toString(16).substring(2, 8);
    return `tpl_local_${timestamp}_${randomHex}`;
  }

  /**
   * Retorna fecha y hora ISO actual en UTC.
   */
  function nowISO() {
    return new Date().toISOString();
  }

  /**
   * Crea una instancia por defecto del esquema canónico ampliado.
   */
  function createDefaultProject() {
    const currentISO = nowISO();
    return {
      versionSchema: CURRENT_SCHEMA_VERSION,
      meta: {
        idLocalTemporal: generateLocalId(),
        idRealConfirmado: null,
        estadoSincronizacion: 'local_only',
        erroresSincronizacion: [],
        creadoEn: currentISO,
        modificadoEn: currentISO,
        modalidadProyecto: 'parcela_casa', // 'parcela_casa' | 'solo_casa' | 'diseno_propio'
        origenProyecto: 'cotizador_web'
      },
      terreno: {
        seleccionado: true,
        id: null,
        rol: '',
        nombre: '',
        superficieM2: 5000,
        precioClp: 0,
        clasificacionPrecio: 'referencial', // 'confirmado' | 'referencial' | 'pendiente_evaluacion'
        vigenciaPrecio: '2026-08-30'
      },
      vivienda: {
        id: null,
        nombre: '',
        superficieM2: 0,
        habitaciones: 0,
        banos: 0,
        precioBaseClp: 0,
        clasificacionPrecio: 'referencial',
        sistemaConstructivo: {
          idCanonic: 'madera_economica',
          materialReal: 'Madera',
          nombreComercial: 'Madera', // Mantiene denominación V1 durante Fase A1
          valorM2Clp: 270000,
          inclusiones: ['Estructura principal en madera', 'Techumbre básica'],
          exclusiones: ['Fundaciones especiales', 'Urbanización exterior']
        }
      },
      etapasObligatorias: [],
      opcionales: {
        items: []
      },
      metricas: {
        perimetroEstimadoMetros: 284, // raiz(5000) * 4 aprox
        superficieConstruidaM2: 0,
        superficieTerrenoM2: 5000
      },
      totales: {
        subtotalTerrenoClp: 0,
        subtotalConstruccionClp: 0,
        subtotalEtapasObligatoriasClp: 0,
        subtotalOpcionalesClp: 0,
        totalEstimadoClp: 0,
        moneda: 'CLP',
        tratamientoIva: 'iva_incluido_referential'
      },
      cliente: {
        consentimientoContacto: false,
        nombre: '',
        telefono: '',
        email: '',
        comentario: ''
      },
      telemetria: {
        versionCatalogo: '20260723-catalog-v2',
        utms: {
          source: '',
          medium: '',
          campaign: '',
          content: ''
        }
      },
      historialModificaciones: [
        {
          timestamp: currentISO,
          accion: 'init_project',
          detalle: 'Proyecto canónico inicializado por defecto'
        }
      ]
    };
  }

  // Inicializar el puntero en global
  global.ProyectoTPL = createDefaultProject();

  /**
   * Agrega un registro al historial de modificaciones manteniendo un tope de 50 entradas.
   */
  function logModification(project, accion, detalle) {
    if (!project.historialModificaciones || !Array.isArray(project.historialModificaciones)) {
      project.historialModificaciones = [];
    }
    project.historialModificaciones.push({
      timestamp: nowISO(),
      accion: String(accion),
      detalle: String(detalle)
    });
    if (project.historialModificaciones.length > 50) {
      project.historialModificaciones = project.historialModificaciones.slice(-50);
    }
    project.meta.modificadoEn = nowISO();
  }

  /**
   * Guarda el estado actual en localStorage excluyendo estrictamente PII sensible.
   */
  function saveToStorage(projectObj) {
    const target = projectObj || global.ProyectoTPL;
    if (!target || typeof target !== 'object') return false;

    try {
      // Clonar para sanear PII antes de persistir
      const cleanCopy = JSON.parse(JSON.stringify(target));
      if (cleanCopy.cliente) {
        cleanCopy.cliente.nombre = '';
        cleanCopy.cliente.telefono = '';
        cleanCopy.cliente.email = '';
        cleanCopy.cliente.comentario = '';
      }
      
      const serialized = JSON.stringify(cleanCopy);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, serialized);
        return true;
      }
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[TPL.ProjectState] Error al persistir en storage:', err.message);
      }
    }
    return false;
  }

  /**
   * Protocolo Seguro de Recuperación de Caché en 7 Pasos.
   * No purga silenciosamente si encuentra JSON corrupto o esquema antiguo.
   */
  function loadFromStorage() {
    if (typeof localStorage === 'undefined') {
      global.ProyectoTPL = createDefaultProject();
      return { success: true, recovered: false, mode: 'memory_only' };
    }

    const rawString = localStorage.getItem(STORAGE_KEY);
    if (!rawString) {
      global.ProyectoTPL = createDefaultProject();
      return { success: true, recovered: false, mode: 'new_default' };
    }

    let parsed = null;
    let parseError = null;

    // 1. Validar sintaxis JSON
    try {
      parsed = JSON.parse(rawString);
    } catch (err) {
      parseError = err;
    }

    // 2. Intentar migración o validar esquema
    const isSchemaValid = parsed && typeof parsed === 'object' &&
                          parsed.versionSchema && parsed.meta &&
                          parsed.terreno && parsed.vivienda &&
                          parsed.opcionales && parsed.totales;

    if (isSchemaValid && parsed.versionSchema === CURRENT_SCHEMA_VERSION) {
      // Hidratación limpia
      global.ProyectoTPL = parsed;
      return { success: true, recovered: false, mode: 'clean_hydration' };
    }

    // Si llegamos aquí, el esquema es antiguo, inválido o el JSON estaba corrupto.
    // 3. Conservar copia de respaldo en localStorage
    const backupKey = `tpl_project_v3_corrupted_backup_${Date.now()}`;
    try {
      localStorage.setItem(backupKey, rawString);
    } catch (e) {
      // Si el storage está lleno, intentamos al menos en memoria
    }

    // 4. Recuperar los campos válidos en un nuevo objeto por defecto
    const newProject = createDefaultProject();
    let recoveredSections = [];
    let lostSections = [];

    if (parsed && typeof parsed === 'object') {
      // Intentar recuperar parcela
      if (parsed.terreno && typeof parsed.terreno === 'object') {
        newProject.terreno = { ...newProject.terreno, ...parsed.terreno };
        recoveredSections.push('terreno');
      } else {
        lostSections.push('terreno');
      }

      // Intentar recuperar vivienda
      if (parsed.vivienda && typeof parsed.vivienda === 'object') {
        newProject.vivienda = { ...newProject.vivienda, ...parsed.vivienda };
        recoveredSections.push('vivienda');
      } else {
        lostSections.push('vivienda');
      }

      // Intentar recuperar opcionales
      if (parsed.opcionales && typeof parsed.opcionales === 'object' && Array.isArray(parsed.opcionales.items)) {
        newProject.opcionales.items = parsed.opcionales.items;
        recoveredSections.push('opcionales');
      } else {
        lostSections.push('opcionales');
      }

      // Intentar recuperar telemetría
      if (parsed.telemetria && typeof parsed.telemetria === 'object') {
        newProject.telemetria = { ...newProject.telemetria, ...parsed.telemetria };
      }
    } else {
      lostSections = ['terreno', 'vivienda', 'opcionales', 'totales'];
    }

    // 5. Registrar el error técnico en el objeto y consola
    const errorMsg = parseError ? `Corrupción JSON: ${parseError.message}` : `Esquema incompatible (Versión encontrada: ${parsed?.versionSchema || 'nula'})`;
    newProject.meta.erroresSincronizacion.push({
      timestamp: nowISO(),
      error: errorMsg,
      respaldoGuardadoEn: backupKey
    });

    logModification(newProject, 'schema_recovery', `Recuperado parcial: [${recoveredSections.join(', ')}]. Perdido: [${lostSections.join(', ')}]`);

    // 6. Reiniciar solamente si no existe recuperación segura (lo asignamos al global)
    global.ProyectoTPL = newProject;
    saveToStorage(newProject);

    // 7. Informar (a través del bus o retorno para que el orquestador advierta)
    const notification = {
      type: 'TPL_SCHEMA_RECOVERED',
      recoveredSections,
      lostSections,
      backupKey,
      message: lostSections.length > 0
        ? `Se recuperaron algunas selecciones anteriores del proyecto. Es posible que debas verificar: ${lostSections.join(', ')}.`
        : 'Proyecto actualizado al nuevo formato V2 de forma segura.'
    };

    if (global.window && typeof global.window.dispatchEvent === 'function') {
      try {
        global.window.dispatchEvent(new CustomEvent('tpl_state_recovered', { detail: notification }));
      } catch (e) {}
    }

    return {
      success: true,
      recovered: true,
      mode: 'partial_recovery',
      notification,
      backupKey
    };
  }

  /**
   * Construye una instancia canónica de ProyectoTPL leyendo desde el estado heredado V1
   * (localStorage: selectedParcelaId, selectedCasaId, checkboxes DOM o catálogos globales).
   * Vital para Shadow Running en Fase A1 sin alterar la lógica de UI.
   */
  function buildFromLegacy(legacyOptions = {}) {
    const project = createDefaultProject();
    project.meta.origenProyecto = 'legacy_shadow_migration';

    // Resolver parcelas desde catálogo global si está disponible
    const parcelasArray = typeof global.getParcelasArray === 'function' ? global.getParcelasArray() : (global.parcelas || []);
    const casasArray = typeof global.getCasasArray === 'function' ? global.getCasasArray() : (global.casas || []);
    const extrasArray = typeof global.extrasOpcionales !== 'undefined' ? global.extrasOpcionales : [];

    let parcelaId = null;
    let casaId = null;

    if (typeof localStorage !== 'undefined') {
      parcelaId = localStorage.getItem('selectedParcelaId');
      casaId = localStorage.getItem('selectedCasaId');
    }
    if (legacyOptions.parcelaId !== undefined) parcelaId = legacyOptions.parcelaId;
    if (legacyOptions.casaId !== undefined) casaId = legacyOptions.casaId;

    // Hidratar terreno heredado
    if (parcelaId && String(parcelaId) !== 'general' && String(parcelaId) !== 'null' && String(parcelaId) !== '') {
      const p = parcelasArray.find(item => String(item.id) === String(parcelaId));
      if (p) {
        project.terreno.seleccionado = true;
        project.terreno.id = String(p.id);
        project.terreno.rol = p.rol || p.rol_sii || '';
        project.terreno.nombre = p.nombre || `Parcela ${p.id}`;
        
        // Parsear precio string "16.500.000" o número
        let prec = 0;
        if (typeof p.precio === 'number') prec = p.precio;
        else if (typeof p.precio === 'string') prec = Number(p.precio.replace(/\./g, '').replace(/[^0-9]/g, '')) || 0;
        project.terreno.precioClp = prec;
        
        let sup = 5000;
        if (typeof p.superficie === 'number') sup = p.superficie;
        else if (typeof p.tamano === 'number') sup = p.tamano;
        else if (typeof p.tamano === 'string') sup = Number(p.tamano.replace(/\./g, '').replace(/[^0-9]/g, '')) || 5000;
        project.terreno.superficieM2 = sup;
      }
    } else {
      project.terreno.seleccionado = false;
      project.terreno.precioClp = 0;
      if (casaId) {
        project.meta.modalidadProyecto = 'solo_casa';
      } else {
        project.meta.modalidadProyecto = 'diseno_propio';
      }
    }

    // Hidratar vivienda heredada
    if (casaId && String(casaId) !== 'null' && String(casaId) !== '') {
      const c = casasArray.find(item => String(item.id) === String(casaId));
      if (c) {
        project.vivienda.id = String(c.id);
        project.vivienda.nombre = c.nombre || `Casa ${c.id}`;
        
        let m2 = 0;
        if (typeof c.superficie === 'number') m2 = c.superficie;
        else if (typeof c.superficie === 'string') m2 = Number(c.superficie.replace(/[^0-9.]/g, '')) || 0;
        else if (typeof c.tamano === 'number') m2 = c.tamano;
        project.vivienda.superficieM2 = m2;
        project.vivienda.habitaciones = Number(c.dormitorios || c.habitaciones || 0);
        project.vivienda.banos = Number(c.banos || c.baños || 0);
        
        let precBase = 0;
        if (typeof c.precio === 'number') precBase = c.precio;
        else if (typeof c.precio === 'string') precBase = Number(c.precio.replace(/\./g, '').replace(/[^0-9]/g, '')) || 0;
        project.vivienda.precioBaseClp = precBase;
      }
    }

    // Sistema constructivo heredado (por defecto o desde DOM en web)
    let sysId = legacyOptions.sysId;
    if (!sysId && typeof document !== 'undefined') {
      const checkedSys = document.querySelector('input[name="construction_type"]:checked') ||
                         document.querySelector('.construction-btn.active');
      if (checkedSys) sysId = checkedSys.value || checkedSys.dataset.id;
    }
    sysId = sysId || 'madera_economica';
    
    // Mapeo básico de precios de sistema constructivo según CONSTRUCTION_TYPES
    const sysMap = {
      'madera_economica': { mat: 'Madera', nom: 'Madera', val: 270000 },
      'metalcon_simple': { mat: 'Metalcon', nom: 'Metalcon', val: 370000 },
      'premium_madera_metalcon': { mat: 'Madera o Metalcon', nom: 'Madera o Metalcon premium', val: 420000 },
      'cemento': { mat: 'Hormigón', nom: 'Hormigón / Cemento', val: 720000 }
    };
    if (sysMap[sysId]) {
      project.vivienda.sistemaConstructivo.idCanonic = sysId;
      project.vivienda.sistemaConstructivo.materialReal = sysMap[sysId].mat;
      project.vivienda.sistemaConstructivo.nombreComercial = sysMap[sysId].nom;
      project.vivienda.sistemaConstructivo.valorM2Clp = sysMap[sysId].val;
    }

    // Hidratar opcionales desde DOM (si existe) o desde array de ítems pasados
    const items = [];
    if (legacyOptions.checkedExtras && Array.isArray(legacyOptions.checkedExtras)) {
      legacyOptions.checkedExtras.forEach(ex => {
        const catItem = extrasArray.find(x => String(x.id) === String(ex.id)) || {};
        items.push({
          idCanonic: String(ex.id),
          codigoCatalogo: catItem.codigo || `SRV-${ex.id}`,
          nombre: catItem.nombre || ex.nombre || String(ex.id),
          categoria: catItem.categoria || 'opcional',
          unidad: catItem.tipoCalculo || 'unidad',
          reglaCalculo: catItem.tipoCalculo === 'mt2' ? 'proporcional_m2_casa' : 'unitario_x_cantidad',
          cantidad: Number(ex.qty || 1),
          precioUnitarioClp: Number(catItem.valor || ex.valor || 0),
          precioTotalClp: Number(catItem.valor || ex.valor || 0) * Number(ex.qty || 1),
          bloqueadoPorInclusion: false,
          fuenteCanonica: 'legacy_bridge'
        });
      });
    } else if (typeof document !== 'undefined') {
      const extraChecks = document.querySelectorAll('#opcionales-container .extra-check:checked, .extra-check-upsell:checked');
      extraChecks.forEach(chk => {
        const id = chk.dataset.id || chk.id;
        const valor = Number(chk.dataset.valor || chk.dataset.price || 0);
        const tipo = chk.dataset.tipo || 'unidad';
        let qty = 1;
        const qtyInput = document.querySelector(`.extra-qty[data-id="${id}"]`);
        if (qtyInput) qty = Number(qtyInput.value) || 1;
        else if (tipo === 'mt2') qty = project.vivienda.superficieM2 || 1;

        const catItem = extrasArray.find(x => String(x.id) === String(id)) || {};
        items.push({
          idCanonic: String(id),
          codigoCatalogo: catItem.codigo || `SRV-${id}`,
          nombre: catItem.nombre || chk.dataset.nombre || String(id),
          categoria: catItem.categoria || 'opcional',
          unidad: tipo,
          reglaCalculo: tipo === 'mt2' ? 'proporcional_m2_casa' : 'unitario_x_cantidad',
          cantidad: qty,
          precioUnitarioClp: valor,
          precioTotalClp: valor * qty,
          bloqueadoPorInclusion: false,
          fuenteCanonica: 'dom_checkbox'
        });
      });
    }

    project.opcionales.items = items;
    return project;
  }

  // API Pública de Estado
  global.TPL.ProjectState = {
    createDefaultProject,
    loadFromStorage,
    saveToStorage,
    buildFromLegacy,
    get: function() { return global.ProyectoTPL; },
    set: function(newProject) {
      if (newProject && typeof newProject === 'object') {
        global.ProyectoTPL = newProject;
        logModification(global.ProyectoTPL, 'state_replace', 'Reemplazo total de estado');
        saveToStorage(global.ProyectoTPL);
      }
    },
    logModification
  };

})(typeof window !== 'undefined' ? window : globalThis);
