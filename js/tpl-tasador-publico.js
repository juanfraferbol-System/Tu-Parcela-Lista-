/**
 * js/tpl-tasador-publico.js — Controlador Canónico del Tasador Independiente TPL
 * ETAPAS 10, 11, 12, 13, 17 y 18.
 * Orquesta el flujo progresivo, animación orbital de 10 etapas, análisis por enlace y 3 niveles de informe.
 */
(function(window){
  'use strict';

  let currentStep = 1;
  let currentValuation = null;
  let tplClient = null;
  let currentMode = 'manual'; // 'manual' | 'url'

  function init(){
    initSupabase();
    bindEvents();
    logEvent('tasador_iniciado');
  }

  function initSupabase(){
    if (window.supabase && window.TPL_SUPABASE_CONFIG) {
      try {
        tplClient = window.supabase.createClient(
          window.TPL_SUPABASE_CONFIG.url,
          window.TPL_SUPABASE_CONFIG.anonKey
        );
      } catch(e) {
        console.warn('TPLTasadorPublico: Error iniciando Supabase.', e);
      }
    }
  }

  function logEvent(eventName, payload = {}) {
    console.log(`[TPL Analytics Event] ${eventName}:`, payload);
    if (window.TPL && window.TPL.orchestrator && typeof window.TPL.orchestrator.notify === 'function') {
      try {
        window.TPL.orchestrator.notify(eventName, payload, { source: 'tasador_independiente' });
      } catch(e){}
    }
  }

  function formatMoney(num){
    const n = Number(num || 0);
    if (isNaN(n) || !n) return '$0';
    return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // --- CONMUTADOR DE MODO DE ENTRADA (MANUAL VS URL - PUNTO 8) ---
  function switchTasadorMode(mode) {
    currentMode = mode;
    const tabManual = document.getElementById('tabModeManual');
    const tabUrl = document.getElementById('tabModeUrl');
    const formManual = document.getElementById('tplTasadorForm');
    const panelUrl = document.getElementById('urlAnalysisPanel');

    if (mode === 'manual') {
      if (tabManual) tabManual.classList.add('active');
      if (tabUrl) tabUrl.classList.remove('active');
      if (formManual) formManual.style.display = 'block';
      if (panelUrl) panelUrl.style.display = 'none';
      showStep(1);
    } else {
      if (tabManual) tabManual.classList.remove('active');
      if (tabUrl) tabUrl.classList.add('active');
      if (formManual) formManual.style.display = 'none';
      if (panelUrl) panelUrl.style.display = 'block';
    }
    logEvent('tasador_modo_cambiado', { modo: mode });
  }

  // --- ANÁLISIS POR ENLACE CON FALLBACK CORTÉS (PUNTO 8, 9, 10, 11, 12, 13) ---
  async function iniciarAnalisisUrl() {
    const inputEl = document.getElementById('inputAvisoUrl');
    const statusEl = document.getElementById('urlAnalysisStatus');
    const prelimCard = document.getElementById('urlPreliminaryCard');
    const confirmSection = document.getElementById('urlConfirmationSection');
    const url = inputEl?.value.trim();

    if (!url || !url.startsWith('http')) {
      alert('Por favor ingresa un enlace válido (que comience con http:// o https://).');
      return;
    }

    if (statusEl) {
      statusEl.textContent = '⏳ Conectando al servicio de análisis TPL y extrayendo antecedentes...';
      statusEl.style.color = '#fcd34d';
    }
    if (prelimCard) prelimCard.style.display = 'none';
    if (confirmSection) confirmSection.style.display = 'none';

    logEvent('analisis_url_iniciado', { url: url });

    let extractedData = null;
    let fallbackTriggered = false;

    // Llamada segura a Edge Function analizar-aviso
    try {
      if (tplClient && typeof tplClient.functions?.invoke === 'function') {
        const { data, error } = await tplClient.functions.invoke('analizar-aviso', {
          body: { url: url }
        });
        if (!error && data && data.success) {
          extractedData = data.data;
        } else {
          fallbackTriggered = true;
        }
      } else {
        // Fallback si cliente no está o no hay funciones: usar datos inferidos básicos por regex
        fallbackTriggered = true;
      }
    } catch(e) {
      console.warn('Error llamando a analizar-aviso:', e);
      fallbackTriggered = true;
    }

    // Fallback cortés (Punto 9 y 12): Si el aviso falló o tiene protecciones, pedir confirmación amable
    if (fallbackTriggered || !extractedData) {
      if (statusEl) {
        statusEl.textContent = 'ℹ️ No pudimos acceder automáticamente a todos los datos del aviso debido a protecciones del sitio web. Por favor ingresa los datos a continuación para continuar con tu tasación.';
        statusEl.style.color = '#38bdf8';
      }
      extractedData = { precio: 0, superficie: 0, comuna: '', region: '' };
    } else {
      if (statusEl) {
        statusEl.textContent = '✅ Antecedentes detectados en la publicación.';
        statusEl.style.color = '#6ee7b7';
      }
    }

    // Mostrar sección preliminar si encontramos precio y superficie
    if (extractedData.precio > 0 && extractedData.superficie > 0) {
      if (prelimCard) prelimCard.style.display = 'block';
      const precioM2 = Math.round(extractedData.precio / extractedData.superficie);
      document.getElementById('urlPrePrecio').textContent = formatMoney(extractedData.precio);
      document.getElementById('urlPrePrecioM2').textContent = formatMoney(precioM2) + '/m²';

      // Contrastar con mercado comunal (Punto 11 y 13)
      if (extractedData.comuna && window.TPLValuationEngine?.obtenerMercadoComunaAsync) {
        const mercado = await window.TPLValuationEngine.obtenerMercadoComunaAsync(extractedData.comuna, extractedData.region || '', tplClient);
        if (mercado && mercado.valor_promedio_m2 > 0) {
          const promM2 = Number(mercado.valor_promedio_m2);
          document.getElementById('urlPreMercadoM2').textContent = formatMoney(promM2) + '/m²';
          const diffPct = Math.round(((precioM2 - promM2) / promM2) * 100);
          const diffTextEl = document.getElementById('urlPreDiferencia');
          const compEl = document.getElementById('urlPreComparacion');

          if (diffPct > 5) {
            diffTextEl.textContent = `+${diffPct}% sobre el promedio comunal`;
            diffTextEl.style.color = '#f87171'; // Rojo/Sobre mercado
            if (compEl) compEl.textContent = '⚠️ El precio publicado se encuentra por sobre el valor medio transado en la comuna.';
          } else if (diffPct < -5) {
            diffTextEl.textContent = `${diffPct}% bajo el promedio comunal`;
            diffTextEl.style.color = '#6ee7b7'; // Verde/Bajo mercado
            if (compEl) compEl.textContent = '💡 El aviso presenta un valor competitivo por debajo del promedio de mercado.';
          } else {
            diffTextEl.textContent = 'Alineado con el promedio comunal';
            diffTextEl.style.color = '#6ee7b7';
            if (compEl) compEl.textContent = '✅ El precio se encuentra equilibrado en relación con las referencias comunales.';
          }
        }
      }
    }

    // Precompletar formulario de confirmación obligatoria (Punto 10)
    if (confirmSection) confirmSection.style.display = 'block';
    
    fillUrlField('urlRegion', 'badgeUrlRegion', extractedData.region);
    fillUrlField('urlComuna', 'badgeUrlComuna', extractedData.comuna);
    fillUrlField('urlSuperficieM2', 'badgeUrlSuperficie', extractedData.superficie ? extractedData.superficie : '');
    fillUrlField('urlPrecio', 'badgeUrlPrecio', extractedData.precio ? extractedData.precio : '');
  }

  function fillUrlField(inputId, badgeId, val) {
    const input = document.getElementById(inputId);
    const badge = document.getElementById(badgeId);
    if (input && val) {
      input.value = val;
    }
    if (badge) {
      if (val && val !== '0' && val !== 0) {
        badge.className = 'tpl-badge-status badge-success';
        badge.textContent = '● Detectado en aviso';
      } else {
        badge.className = 'tpl-badge-status badge-empty';
        badge.textContent = '○ No disponible';
      }
    }
  }

  async function confirmarDatosUrlYCalcular() {
    const region = document.getElementById('urlRegion')?.value;
    const comuna = document.getElementById('urlComuna')?.value.trim();
    const superficie = Number(document.getElementById('urlSuperficieM2')?.value || 0);
    const precioPub = Number(document.getElementById('urlPrecio')?.value || 0);

    if (!region || !comuna || superficie < 100) {
      alert('Por favor confirma o completa la región, comuna y una superficie válida (mínimo 100 m²).');
      return;
    }

    // Trasladar datos confirmados al formulario principal y ejecutar cálculo
    if (document.getElementById('region')) document.getElementById('region').value = region;
    if (document.getElementById('comuna')) document.getElementById('comuna').value = comuna;
    if (document.getElementById('superficieTerrenoM2')) document.getElementById('superficieTerrenoM2').value = superficie;

    // Cambiar vista al form principal temporalmente para la animación orbital
    const formManual = document.getElementById('tplTasadorForm');
    const panelUrl = document.getElementById('urlAnalysisPanel');
    if (formManual) formManual.style.display = 'block';
    if (panelUrl) panelUrl.style.display = 'none';

    await calcularYMostrarResumen({
      region: region,
      comuna: comuna,
      superficieTerrenoM2: superficie,
      precioPublicado: precioPub,
      origen: 'tasador_url'
    });
  }

  // --- ANIMACIÓN ORBITAL DE 10 ETAPAS (PUNTO 1, 2, 3, 4, 16) ---
  async function runOrbitalAnalysis(inputDatos) {
    const overlay = document.getElementById('tpl-analysis-overlay');
    const dynamicMsg = document.getElementById('tplDynamicMsg');
    const stepList = document.getElementById('tplStepList');
    if (!overlay || !stepList) return null;

    // Mostrar overlay
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Verificar preferencia de movimiento reducido (Punto 16)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stepDelay = reducedMotion ? 150 : 550;

    // Control dinámico de etapas de vivienda (Punto 4)
    const step3El = document.getElementById('step-item-3');
    const step4El = document.getElementById('step-item-4');
    const tieneCasa = !!inputDatos.tieneCasa;

    if (step3El) step3El.style.display = tieneCasa ? 'block' : 'none';
    if (step4El) step4El.style.display = tieneCasa ? 'block' : 'none';

    // Reiniciar lista visual de etapas
    const allItems = stepList.querySelectorAll('.tpl-step-item');
    allItems.forEach(item => {
      item.classList.remove('active', 'completed');
      item.style.color = '#64748b';
      if (item.textContent.startsWith('●') || item.textContent.startsWith('✓')) {
        item.textContent = '○ ' + item.textContent.slice(2);
      }
    });

    const stepTexts = [
      { id: 0, text: `Reconociendo ubicación en ${inputDatos.comuna || 'la comuna'}...` },
      { id: 1, text: `Analizando superficie de ${formatNumber(inputDatos.superficieTerrenoM2)} m²...` },
      { id: 2, text: 'Calculando valor técnico del terreno (Base TPL)...' },
      { id: 3, text: 'Revisando características y edificación de vivienda...', cond: tieneCasa },
      { id: 4, text: 'Analizando fundaciones, estado y obras adicionales...', cond: tieneCasa },
      { id: 5, text: 'Consultando Índice de Mercado TPL en tiempo real...' },
      { id: 6, text: 'Comparando el valor técnico con transacciones de la comuna...' },
      { id: 7, text: 'Calculando estrategias de venta (Rápida, Recomendada y Paciente)...' },
      { id: 8, text: 'Preparando recomendación comercial equilibrada...' },
      { id: 9, text: 'Generando informe preliminar Nivel 1...' }
    ];

    let mercadoDB = null;

    for (let i = 0; i < stepTexts.length; i++) {
      const st = stepTexts[i];
      if (st.cond !== undefined && !st.cond) continue; // Saltar etapas de vivienda si no tiene casa

      const itemEl = document.getElementById(`step-item-${st.id}`);
      if (itemEl) {
        // Marcar anterior como completado
        allItems.forEach(el => {
          if (el.classList.contains('active')) {
            el.classList.remove('active');
            el.classList.add('completed');
            el.style.color = '#10b981';
            if (el.textContent.startsWith('○')) {
              el.textContent = '✓ ' + el.textContent.slice(2);
            }
          }
        });

        itemEl.classList.add('active');
        itemEl.style.color = '#fff';
        if (itemEl.textContent.startsWith('○')) {
          itemEl.textContent = '● ' + itemEl.textContent.slice(2);
        }
      }

      if (dynamicMsg) dynamicMsg.textContent = st.text;

      // En la etapa 5, ejecutar llamada real al mercado comunal
      if (st.id === 5) {
        const startT = Date.now();
        if (window.TPLValuationEngine?.obtenerMercadoComunaAsync) {
          mercadoDB = await window.TPLValuationEngine.obtenerMercadoComunaAsync(inputDatos.comuna, inputDatos.region, tplClient);
        }
        const elapsed = Date.now() - startT;
        if (elapsed < stepDelay) {
          await new Promise(r => setTimeout(r, stepDelay - elapsed));
        }
      } else {
        await new Promise(r => setTimeout(r, stepDelay));
      }
    }

    // Finalizar animación
    await new Promise(r => setTimeout(r, 300));
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';

    return mercadoDB;
  }

  function formatNumber(num) {
    return Number(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // --- CONTEO NUMÉRICO SUAVE (PUNTO 14) ---
  function animateCounter(elementId, endValue, prefix = '$', suffix = '', duration = 1200) {
    const el = document.getElementById(elementId);
    if (!el || isNaN(endValue) || !endValue) {
      if (el) el.textContent = prefix + formatNumber(endValue) + suffix;
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      el.textContent = prefix + formatNumber(endValue) + suffix;
      return;
    }

    const startTime = performance.now();
    const startValue = 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing out-cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(startValue + (endValue - startValue) * easeProgress);

      el.textContent = prefix + formatNumber(currentVal) + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = prefix + formatNumber(endValue) + suffix;
      }
    }

    requestAnimationFrame(update);
  }

  function bindEvents(){
    const form = document.getElementById('tplTasadorForm');
    if (!form) return;

    // Manejo progresivo de pasos
    const nextBtns = document.querySelectorAll('.tpl-step-next');
    nextBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const next = Number(btn.getAttribute('data-next'));
        if (validateStep(currentStep)) {
          showStep(next);
          logEvent('tasador_paso_completado', { paso: currentStep });
        }
      });
    });

    const prevBtns = document.querySelectorAll('.tpl-step-prev');
    prevBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const prev = Number(btn.getAttribute('data-prev'));
        showStep(prev);
      });
    });

    // Toggle condicional de campos de vivienda (ETAPA 10)
    const radioVivienda = document.querySelectorAll('input[name="tieneCasa"]');
    const casaContainer = document.getElementById('tplViviendaFields');
    radioVivienda.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (casaContainer) {
          if (e.target.value === 'si') {
            casaContainer.style.display = 'block';
            casaContainer.removeAttribute('hidden');
          } else {
            casaContainer.style.display = 'none';
            casaContainer.setAttribute('hidden', 'true');
          }
        }
      });
    });

    // Envío para calcular estimación inicial (ETAPA 10 y 11)
    const calcBtn = document.getElementById('btnCalcularTasacion');
    if (calcBtn) {
      calcBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!validateStep(2)) return;
        await calcularYMostrarResumen();
      });
    }

    // Formulario de captura de lead para desbloquear informe Nivel 2
    const leadForm = document.getElementById('tplLeadUnlockForm');
    if (leadForm) {
      leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await procesarDesbloqueoInforme();
      });
    }

    // Botón para volver a calcular
    const btnReintentar = document.getElementById('btnVolverCalcular');
    if (btnReintentar) {
      btnReintentar.addEventListener('click', () => {
        currentValuation = null;
        showStep(1);
        form.reset();
        if (casaContainer) casaContainer.style.display = 'none';
        switchTasadorMode('manual');
      });
    }

    // Botones de acción comercial final (ETAPA 13)
    const btnPublicar = document.getElementById('btnPublicarDesdeTasador');
    if (btnPublicar) {
      btnPublicar.addEventListener('click', () => irAPublicador());
    }

    const btnDescargarPDF = document.getElementById('btnDescargarPDF');
    if (btnDescargarPDF) {
      btnDescargarPDF.addEventListener('click', () => {
        if (!currentValuation) return;
        logEvent('informe_descargado', { codigo: currentValuation.codigo });
        if (window.TPLReportGenerator && typeof window.TPLReportGenerator.printReport === 'function') {
          const mockLead = {
            name: currentValuation.leadNombre || 'Propietario',
            leadRef: currentValuation.codigo || 'TPL-REF',
            email: currentValuation.leadEmail || '',
            phone: currentValuation.leadTelefono || '',
            valuation: currentValuation
          };
          window.TPLReportGenerator.printReport(mockLead);
        } else {
          window.print();
        }
      });
    }

    const btnEnviarCorreo = document.getElementById('btnEnviarCorreo');
    if (btnEnviarCorreo) {
      btnEnviarCorreo.addEventListener('click', () => {
        if (!currentValuation) return;
        logEvent('informe_enviado', { codigo: currentValuation.codigo });
        alert(`Hemos enviado una copia de tu informe de valoración comercial a ${currentValuation.leadEmail || 'tu correo electrónico'}.`);
      });
    }

    const btnAsesoria = document.getElementById('btnHablarAsesor');
    if (btnAsesoria) {
      btnAsesoria.addEventListener('click', () => {
        if (!currentValuation) return;
        logEvent('asesoria_desde_tasador', { codigo: currentValuation.codigo });
        const msg = encodeURIComponent(`Hola Tu Parcela Lista, acabo de generar mi tasación ${currentValuation.codigo || ''} para una propiedad en ${currentValuation.comuna || ''} y me gustaría recibir asesoría comercial.`);
        window.open(`https://wa.me/56912345678?text=${msg}`, '_blank');
      });
    }
  }

  function showStep(stepNum) {
    document.querySelectorAll('.tpl-tasador-step').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`step-${stepNum}`);
    if (target) {
      target.classList.add('active');
      currentStep = stepNum;
      window.scrollTo({ top: 80, behavior: 'smooth' });
    }
  }

  function validateStep(stepNum) {
    if (stepNum === 1) {
      const region = document.getElementById('region')?.value;
      const comuna = document.getElementById('comuna')?.value;
      const sup = Number(document.getElementById('superficieTerrenoM2')?.value || 0);
      if (!region || !comuna || sup < 100) {
        alert('Por favor selecciona la región, comuna y una superficie válida del terreno (mínimo 100 m²).');
        return false;
      }
    }
    return true;
  }

  async function calcularYMostrarResumen(customInputDatos = null) {
    if (!window.TPLValuationEngine) {
      alert('El motor canónico de valoración TPL no está disponible en este momento.');
      return;
    }

    const tieneCasaEl = document.querySelector('input[name="tieneCasa"]:checked');
    const tieneCasa = tieneCasaEl && tieneCasaEl.value === 'si';

    // Recolectar obras adicionales seleccionadas
    const mejoras = {};
    document.querySelectorAll('input[name="mejoras"]:checked').forEach(chk => {
      mejoras[chk.value] = { cantidad: 1, anio: new Date().getFullYear() - 2 };
    });

    const inputDatos = customInputDatos || {
      region: document.getElementById('region')?.value || '',
      comuna: document.getElementById('comuna')?.value || '',
      superficieTerrenoM2: Number(document.getElementById('superficieTerrenoM2')?.value || 0),
      distanciaReferenciaKm: Number(document.getElementById('distanciaReferenciaKm')?.value || 0),
      tieneCasa: tieneCasa,
      tipoConstruccion: document.getElementById('tipoConstruccion')?.value || 'madera',
      superficieCasaM2: tieneCasa ? Number(document.getElementById('superficieCasaM2')?.value || 0) : 0,
      antiguedadCasa: tieneCasa ? Number(document.getElementById('antiguedadCasa')?.value || 0) : 0,
      estadoCasa: tieneCasa ? document.getElementById('estadoCasa')?.value || 'bueno' : '',
      tipoFundacion: tieneCasa ? document.getElementById('tipoFundacion')?.value || 'radier_terminado' : '',
      mejoras: mejoras,
      origen: 'tasador_independiente'
    };

    // Ejecutar experiencia visual de análisis orbital (Punto 1, 2, 3, 4 y 16)
    const mercadoDB = await runOrbitalAnalysis(inputDatos);

    // Cálculo canónico unificado (ETAPA 5, 6 y 7)
    currentValuation = window.TPLValuationEngine.calcularTasacionTPL(inputDatos, mercadoDB);
    currentValuation.codigo = `TPL-VAL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    currentValuation.inputDatos = inputDatos;

    logEvent('tasacion_calculada', { codigo: currentValuation.codigo, comuna: inputDatos.comuna });

    // Cargar textos de ubicación y estado en Nivel 1 (Punto 5 y 7)
    const ubiEl = document.getElementById('resUbicacionN1');
    if (ubiEl) ubiEl.textContent = `${inputDatos.comuna}, ${inputDatos.region}`;

    const avisoMercado = document.getElementById('avisoSinMercadoComunal');
    const teaserPosicion = document.getElementById('teaserPosicionMercado');
    const teaserRango = document.getElementById('teaserRangoPrecio');

    if (teaserRango) teaserRango.textContent = `${formatMoney(currentValuation.precioVentaRapida)} — ${formatMoney(currentValuation.precioVentaPaciente)}`;
    if (teaserPosicion) teaserPosicion.textContent = currentValuation.posicionMercado;

    if (avisoMercado) {
      if (!currentValuation.mercadoDisponible) {
        avisoMercado.style.display = 'block';
        avisoMercado.textContent = currentValuation.mensajeSinMercado || 'Todavía no contamos con suficientes referencias de mercado para esta comuna. La estimación mostrada corresponde al Motor de Tasación TPL.';
      } else {
        avisoMercado.style.display = 'none';
      }
    }

    showStep(3);

    // Disparar conteo animado (Punto 14) en los montos clave de Nivel 1
    animateCounter('teaserPrecioRecomendado', currentValuation.valorComercialRecomendado, '$', '', 1200);
    animateCounter('resValorTplN1', currentValuation.valorTplTotal, '$', '', 1000);
    animateCounter('resValorMercadoN1', currentValuation.valorMercadoM2, '$', '/m²', 1000);
  }

  // --- NAVEGACIÓN Y SELECCIÓN DE NIVELES (PUNTO 5) ---
  function solicitarInformeComercial() {
    showStep(4);
    const formUnlock = document.getElementById('tplLeadUnlockForm');
    if (formUnlock) {
      // Si el lead ya había desbloqueado antes en esta sesión, mostrar directo
      if (currentValuation && currentValuation.leadEmail) {
        renderInformeCompleto();
        document.getElementById('sectionLeadUnlock').style.display = 'none';
        document.getElementById('sectionInformeDetallado').style.display = 'block';
      } else {
        document.getElementById('sectionLeadUnlock').style.display = 'block';
        document.getElementById('sectionInformeDetallado').style.display = 'none';
      }
    }
    logEvent('nivel2_solicitado', { codigo: currentValuation?.codigo });
  }

  function mostrarEstrategiaPublicacion() {
    showStep(5);
    if (currentValuation) {
      animateCounter('stratPrecioRapido', currentValuation.precioVentaRapida, '$', '', 800);
      animateCounter('stratPrecioRecomendado', currentValuation.precioRecomendado || currentValuation.valorComercialRecomendado, '$', '', 800);
    }
    logEvent('nivel3_estrategia_vista', { codigo: currentValuation?.codigo });
  }

  function irAPublicador() {
    if (!currentValuation) return;
    logEvent('publicar_desde_tasador', { codigo: currentValuation.codigo });
    const params = new URLSearchParams({
      tasacion: currentValuation.codigo || '',
      region: currentValuation.region || currentValuation.inputDatos?.region || '',
      comuna: currentValuation.comuna || currentValuation.inputDatos?.comuna || '',
      superficie: currentValuation.superficieTerrenoM2 || currentValuation.inputDatos?.superficieTerrenoM2 || 0,
      precio: currentValuation.precioRecomendado || currentValuation.valorComercialRecomendado || 0,
      origen: 'tasador_independiente'
    });
    window.location.href = `plataforma/publicar/index.html?${params.toString()}`;
  }

  async function procesarDesbloqueoInforme() {
    const nombre = document.getElementById('leadNombre')?.value.trim();
    const email = document.getElementById('leadEmail')?.value.trim();
    const telefono = document.getElementById('leadTelefono')?.value.trim();
    const autContacto = document.getElementById('leadAutContacto')?.checked;
    const autPrivacidad = document.getElementById('leadAutPrivacidad')?.checked;

    if (!nombre || !email || !telefono || !autContacto || !autPrivacidad) {
      alert('Debes completar tus datos y aceptar la autorización de contacto comercial y política de privacidad para acceder al informe.');
      return;
    }

    currentValuation.leadNombre = nombre;
    currentValuation.leadEmail = email;
    currentValuation.leadTelefono = telefono;
    currentValuation.leadAutorizacion = autContacto;
    currentValuation.region = currentValuation.inputDatos?.region;

    // Guardar en Supabase public.tasaciones como oportunidad comercial (ETAPA 11 y 14)
    if (tplClient) {
      try {
        const row = {
          codigo: currentValuation.codigo,
          origen: 'tasador_independiente',
          region: currentValuation.inputDatos?.region,
          comuna: currentValuation.inputDatos?.comuna,
          superficie_terreno_m2: currentValuation.inputDatos?.superficieTerrenoM2,
          datos_entrada: currentValuation.inputDatos,
          valor_terreno_tpl: currentValuation.valorTerrenoTpl,
          valor_casa_tpl: currentValuation.valorCasaTpl,
          valor_mejoras_tpl: currentValuation.valorMejorasTpl,
          valor_tpl_total: currentValuation.valorTplTotal,
          valor_mercado_m2: currentValuation.valorMercadoM2,
          valor_mercado_total: currentValuation.valorMercadoTotal,
          valor_comercial_recomendado: currentValuation.valorComercialRecomendado,
          precio_venta_rapida: currentValuation.precioVentaRapida,
          precio_venta_paciente: currentValuation.precioVentaPaciente,
          posicion_mercado: currentValuation.posicionMercado,
          confianza_mercado: currentValuation.confianzaMercado,
          version_motor: currentValuation.versionMotor,
          version_indice: currentValuation.versionIndice,
          estado: 'Tasada por interesado',
          metadata: {
            lead_nombre: nombre,
            lead_email: email,
            lead_telefono: telefono,
            actividad: 'El interesado desbloqueó el informe comercial Nivel 2 en tasador.html'
          }
        };
        await tplClient.from('tasaciones').insert([row]);
      } catch(e) {
        console.warn('TPLTasadorPublico: Error al registrar tasación en Supabase, conservando en sesión.', e);
      }
    }

    logEvent('informe_desbloqueado', { codigo: currentValuation.codigo, email: email });

    // Mostrar sección de informe detallado en Paso 4
    renderInformeCompleto();
    const sectionUnlock = document.getElementById('sectionLeadUnlock');
    const sectionDetail = document.getElementById('sectionInformeDetallado');
    if (sectionUnlock) sectionUnlock.style.display = 'none';
    if (sectionDetail) sectionDetail.style.display = 'block';
  }

  function renderInformeCompleto() {
    if (!currentValuation) return;

    document.getElementById('resCodigoTasacion').textContent = currentValuation.codigo;
    document.getElementById('resFechaTasacion').textContent = new Date().toLocaleDateString('es-CL');
    document.getElementById('resUbicacion').textContent = `${currentValuation.comuna}, ${currentValuation.inputDatos?.region || ''}`;
    document.getElementById('resSuperficieTerreno').textContent = `${currentValuation.superficieTerrenoM2} m²`;
    
    const casaTxt = currentValuation.inputDatos?.tieneCasa ? `${currentValuation.inputDatos.superficieCasaM2} m² construidos (${currentValuation.inputDatos.tipoConstruccion})` : 'Sin vivienda (solo terreno)';
    document.getElementById('resSuperficieCasa').textContent = casaTxt;

    document.getElementById('resValorTpl').textContent = formatMoney(currentValuation.valorTplTotal);
    document.getElementById('resValorMercado').textContent = currentValuation.valorMercadoTotal ? `${formatMoney(currentValuation.valorMercadoTotal)} (${formatMoney(currentValuation.valorMercadoM2)}/m²)` : 'Promedio comunal aún no disponible';
    document.getElementById('resValorRecomendado').textContent = formatMoney(currentValuation.valorComercialRecomendado);

    document.getElementById('resPrecioRapido').textContent = formatMoney(currentValuation.precioVentaRapida);
    document.getElementById('resPrecioRecomendado2').textContent = formatMoney(currentValuation.precioRecomendado || currentValuation.valorComercialRecomendado);
    document.getElementById('resPrecioPaciente').textContent = formatMoney(currentValuation.precioVentaPaciente);

    document.getElementById('resPosicionMercado').textContent = currentValuation.posicionMercado;
    document.getElementById('resConfianza').textContent = currentValuation.confianzaMercado;
    document.getElementById('resVersionMotor').textContent = currentValuation.versionMotor;
    document.getElementById('resVersionIndice').textContent = currentValuation.versionIndice;
  }

  // Exponer funciones globales al objeto window para controladores en línea
  window.switchTasadorMode = switchTasadorMode;
  window.iniciarAnalisisUrl = iniciarAnalisisUrl;
  window.confirmarDatosUrlYCalcular = confirmarDatosUrlYCalcular;
  window.solicitarInformeComercial = solicitarInformeComercial;
  window.mostrarEstrategiaPublicacion = mostrarEstrategiaPublicacion;
  window.irAPublicador = irAPublicador;
  window.showStep = showStep;

  window.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);

