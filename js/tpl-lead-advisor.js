(function () {
  'use strict';

  const VERSION = 'v4-context-chat';
  const IDLE_MS = 45000;
  const AUTO_KEY = 'tpl_advisor_auto_sections_v4';
  const VIEW_KEY = 'tpl_advisor_parcel_views_v1';
  const CAPTURED = 'tpl_advisor_captured_v1';
  const QUEUE = 'tpl_advisor_pending_v1';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };
  const sread = (key, fallback) => {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  };
  const swrite = (key, value) => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
  };

  const pageType = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/plataforma/publicar')) return 'publicar';
    if (path.endsWith('/parcela.html') || path.endsWith('parcela.html')) return 'parcela';
    if (path.endsWith('/cotizador.html') || path.endsWith('cotizador.html')) return 'cotizador';
    if (path.endsWith('/index.html') || path === '/' || path.endsWith('/')) return 'index';
    return 'otro';
  };

  const contexts = {
    hero: {
      match: ['.hero', '#decision-flow'],
      title: 'Tu proyecto comienza aquí',
      info: 'En esta parte puedes decidir si quieres buscar solo una parcela o armar un proyecto completo con parcela y casa.',
      suggestions: [
        { label: 'Buscar por presupuesto', action: 'scroll', target: '#decision-flow' },
        { label: 'Ver parcelas disponibles', action: 'scroll', target: '#parcelas-anchor' }
      ]
    },
    parcelas: {
      match: ['#parcelas-anchor', '#parcelas-container', '#map-layout', '#experiencias-parcelas'],
      title: 'Te ayudo a comparar parcelas',
      info: 'Puedes filtrar por precio, superficie, agua, facilidad de pago, ubicación y otras características importantes.',
      suggestions: [
        { label: 'Mostrar las más económicas', action: 'click', target: '#filter-economic' },
        { label: 'Buscar parcelas con agua', action: 'click', target: '#filter-water' }
      ]
    },
    casas: {
      match: ['#casas-section', '#diseño-propio'],
      title: 'Elige una casa compatible',
      info: 'Aquí puedes seleccionar una casa prefabricada para la parcela elegida o iniciar un diseño propio.',
      suggestions: [
        { label: 'Ver casas disponibles', action: 'scroll', target: '#casas-container' },
        { label: 'Crear diseño propio', action: 'scroll', target: '#diseño-propio' }
      ]
    },
    cotizador: {
      match: ['#cotizador-section', '#fundaciones-container', '#automaticos-box', '#deferred-extras-box'],
      title: 'Configura tu proyecto sin duplicar costos',
      info: 'Los planes de instalación incluyen distintas partidas. Los extras que ya vienen incorporados se ocultan automáticamente.',
      suggestions: [
        { label: 'Comparar planes', action: 'scroll', target: '#fundaciones-container' },
        { label: 'Revisar extras', action: 'scroll', target: '#deferred-extras-box' }
      ]
    },
    faq: {
      match: ['.tpl-faq-section'],
      title: 'Resolvamos tus dudas',
      info: 'Esta sección reúne respuestas sobre compra, instalación, costos y funcionamiento de Tu Parcela Lista.',
      suggestions: [
        { label: 'Abrir primera pregunta', action: 'click', target: '.tpl-faq-section button, .tpl-faq-section summary' },
        { label: 'Hablar con un asesor', action: 'contact' }
      ]
    },
    quienes: {
      match: ['#quienes-somos', '#contacto', '.section-footer-info'],
      title: 'Conoce a Tu Parcela Lista',
      info: 'Acompañamos el proceso desde la búsqueda del terreno hasta la elección e instalación de la vivienda.',
      suggestions: [
        { label: 'Ver formas de contacto', action: 'scroll', target: '#contacto' },
        { label: 'Solicitar orientación', action: 'contact' }
      ]
    },
    detalle: {
      match: ['#property-content', '.property-detail', '.detail-layout', '.property-hero', 'main'],
      page: 'parcela',
      title: 'Estás revisando una propiedad',
      info: 'Puedo ayudarte a entender sus características, comparar alternativas o avanzar hacia una cotización con casa.',
      suggestions: [
        { label: 'Cotizar con una casa', action: 'findText', text: 'Cotizar' },
        { label: 'Ver otras parcelas', action: 'navigate', target: 'index.html#parcelas-anchor' }
      ]
    },
    publicar_tipo: {
      match: ['#tipo', '[data-step="tipo"]'],
      page: 'publicar',
      title: 'Primero define qué publicarás',
      info: 'La información solicitada cambia según el tipo de propiedad. El tasador de casa funciona separado del tasador de parcelas.',
      suggestions: [
        { label: 'Publicar una casa', action: 'findText', text: 'Casa' },
        { label: 'Entender cada opción', action: 'message', message: 'Selecciona Casa cuando exista una vivienda construida. Usa Parcela o Campo cuando publiques únicamente el terreno.' }
      ]
    },
    publicar_caracteristicas: {
      match: ['#caracteristicas', '[data-step="caracteristicas"]'],
      page: 'publicar',
      title: 'Completa los datos que mejoran la tasación',
      info: 'En una casa importan superficie construida, material, antigüedad, estado, regularización, remodelaciones y cercanía al centro urbano.',
      suggestions: [
        { label: 'Ver campos importantes', action: 'message', message: 'Prioriza m² construidos, año, material, estado, recepción final, minutos al centro y nivel de remodelación.' },
        { label: 'Ir al tasador', action: 'scroll', target: '#precio' }
      ]
    },
    publicar_ubicacion: {
      match: ['#ubicacion', '[data-step="ubicacion"]'],
      page: 'publicar',
      title: 'La ubicación mejora la precisión',
      info: 'Puedes pegar un enlace de Google Maps, usar el GPS o marcar manualmente el punto.',
      suggestions: [
        { label: 'Usar mi ubicación', action: 'click', target: '#useGps' },
        { label: 'Pegar enlace de Maps', action: 'focus', target: '#googleMapsLink' }
      ]
    },
    publicar_fotos: {
      match: ['#fotos', '[data-step="fotos"]'],
      page: 'publicar',
      title: 'Las fotografías ayudan a vender mejor',
      info: 'Usa imágenes claras, horizontales y variadas. La primera fotografía funcionará como portada.',
      suggestions: [
        { label: 'Seleccionar fotografías', action: 'click', target: '#photoDrop' },
        { label: 'Consejos para la portada', action: 'message', message: 'Elige una foto luminosa, sin textos superpuestos y que muestre la vista más atractiva de la propiedad.' }
      ]
    },
    publicar_precio: {
      match: ['#precio', '[data-step="precio"]'],
      page: 'publicar',
      title: 'Define un precio con respaldo',
      info: 'El Tasador TPL analiza la vivienda por separado. En casas con parcela, el valor del terreno se conserva independiente.',
      suggestions: [
        { label: 'Ejecutar tasador', action: 'click', target: '#runValuation' },
        { label: 'Cómo se calcula', action: 'message', message: 'La casa considera m², material, calidad, antigüedad, estado, remodelación, regularización, accesos y equipamiento.' }
      ]
    },
    generic: {
      match: ['main', 'body'],
      title: 'Hola, soy tu Asesor TPL',
      info: 'Puedo explicarte la sección que estás viendo y ayudarte a elegir el siguiente paso.',
      suggestions: [
        { label: 'Volver al inicio', action: 'navigate', target: 'index.html' },
        { label: 'Hablar con un asesor', action: 'contact' }
      ]
    }
  };

  let activeContext = null;
  let lastContextKey = '';
  let idleTimer = 0;
  let activityTimer = 0;
  let lastActivity = Date.now();
  let autoOpened = false;

  function currentParcel() {
    const params = new URLSearchParams(location.search);
    return {
      code: params.get('id') || localStorage.getItem('selectedParcelaId') || '',
      title: ($('h1')?.textContent || document.title || '').trim().replace(/\s+/g, ' ').slice(0, 100)
    };
  }

  function recordParcelView() {
    if (pageType() !== 'parcela') return;
    const parcel = currentParcel();
    if (!parcel.code) return;
    const list = read(VIEW_KEY, []).filter((item) => item?.codigo !== parcel.code);
    list.unshift({ codigo: parcel.code, visto_en: new Date().toISOString() });
    write(VIEW_KEY, list.slice(0, 12));
  }

  function visibleScore(element) {
    if (!element || element.offsetParent === null) return -1;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const visible = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
    if (!visible) return -1;
    const centerDistance = Math.abs((rect.top + rect.bottom) / 2 - viewportHeight / 2);
    return visible - centerDistance * 0.18;
  }

  function getContext() {
    const type = pageType();
    let best = null;
    let bestScore = -Infinity;

    Object.entries(contexts).forEach(([key, context]) => {
      if (context.page && context.page !== type) return;
      context.match.forEach((selector) => {
        $$(selector).forEach((element) => {
          const score = visibleScore(element);
          if (score > bestScore) {
            bestScore = score;
            best = { key, element, ...context };
          }
        });
      });
    });

    if (!best || bestScore < 0) return { key: 'generic', element: document.body, ...contexts.generic };
    if (type === 'parcela' && best.key === 'generic') return { key: 'detalle', element: $('main') || document.body, ...contexts.detalle };
    return best;
  }

  function personIcon() {
    return '<span class="tpl-advisor-person" aria-hidden="true"><i></i><b></b></span>';
  }

  function renderShell() {
    if ($('#tpl-advisor-root')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="tpl-advisor-root" id="tpl-advisor-root">
        <div class="tpl-advisor-nudge" id="tpl-advisor-nudge" role="status" aria-live="polite" hidden>
          <button type="button" class="tpl-advisor-nudge-close" aria-label="Cerrar sugerencia">×</button>
          <strong id="tpl-advisor-nudge-title">¿Necesitas ayuda?</strong>
          <span id="tpl-advisor-nudge-text">Puedo explicarte esta sección.</span>
        </div>
        <button type="button" class="tpl-advisor-launch" id="tpl-advisor-launch" aria-label="Abrir Asesor TPL">
          ${personIcon()}<span class="tpl-advisor-launch-label">Asesor TPL</span><i class="tpl-advisor-online-dot" aria-hidden="true"></i>
        </button>
        <section class="tpl-advisor-chat" id="tpl-advisor-chat" role="dialog" aria-modal="false" aria-labelledby="tpl-advisor-chat-title" hidden>
          <header class="tpl-advisor-chat-header">
            <div class="tpl-advisor-avatar">${personIcon()}<i aria-hidden="true"></i></div>
            <div><strong id="tpl-advisor-chat-title">Asesor TPL</strong><span>En línea · ayuda contextual</span></div>
            <button type="button" id="tpl-advisor-minimize" aria-label="Cerrar chat">×</button>
          </header>
          <div class="tpl-advisor-chat-body" id="tpl-advisor-chat-body" aria-live="polite"></div>
          <div class="tpl-advisor-quick-actions" id="tpl-advisor-quick-actions"></div>
          <footer class="tpl-advisor-chat-footer">
            <input id="tpl-advisor-input" maxlength="300" placeholder="Escribe una consulta…" autocomplete="off">
            <button type="button" id="tpl-advisor-send" aria-label="Enviar mensaje">➤</button>
          </footer>
        </section>
      </div>`);
  }

  function bubble(text, sender = 'advisor', options = {}) {
    const body = $('#tpl-advisor-chat-body');
    if (!body) return;
    const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const node = document.createElement('div');
    node.className = `tpl-advisor-row is-${sender}`;
    node.innerHTML = `
      ${sender === 'advisor' ? `<div class="tpl-advisor-mini-avatar">${personIcon()}</div>` : ''}
      <div class="tpl-advisor-bubble ${options.highlight ? 'is-highlight' : ''}">
        <div>${esc(text)}</div><small>${time}${sender === 'user' ? ' ✓✓' : ''}</small>
      </div>`;
    body.appendChild(node);
    body.scrollTop = body.scrollHeight;
  }

  function setSuggestions(suggestions = []) {
    const box = $('#tpl-advisor-quick-actions');
    if (!box) return;
    box.innerHTML = suggestions.slice(0, 2).map((suggestion, index) => `
      <button type="button" data-suggestion="${index}">${esc(suggestion.label)}</button>`).join('');
    box._suggestions = suggestions.slice(0, 2);
  }

  function open(source = 'manual', forceContext) {
    renderShell();
    const chat = $('#tpl-advisor-chat');
    const nudge = $('#tpl-advisor-nudge');
    if (nudge) nudge.hidden = true;
    chat.hidden = false;
    requestAnimationFrame(() => chat.classList.add('is-open'));

    const context = forceContext || getContext();
    activeContext = context;
    const body = $('#tpl-advisor-chat-body');
    body.innerHTML = '';

    const parcel = currentParcel();
    let greeting = context.info;
    if (pageType() === 'parcela' && parcel.title) greeting = `Estás viendo ${parcel.title}. ${context.info}`;

    bubble(source === 'idle' ? 'Veo que llevas un momento revisando esta parte.' : 'Hola, soy el Asesor TPL.');
    setTimeout(() => bubble(greeting, 'advisor', { highlight: true }), 100);
    setSuggestions(context.suggestions);
    $('#tpl-advisor-input')?.focus({ preventScroll: true });
  }

  function close() {
    const chat = $('#tpl-advisor-chat');
    if (!chat) return;
    chat.classList.remove('is-open');
    setTimeout(() => { chat.hidden = true; }, 180);
  }

  function performSuggestion(suggestion) {
    if (!suggestion) return;
    bubble(suggestion.label, 'user');

    if (suggestion.action === 'scroll') {
      const target = $(suggestion.target);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => bubble('Listo. Te llevé a esa parte de la página.'), 450);
      } else bubble('No pude encontrar esa sección en esta página.');
    } else if (suggestion.action === 'click') {
      const target = $(suggestion.target);
      if (target) {
        target.click();
        bubble('Listo. Activé esa opción por ti.');
      } else bubble('Esa opción todavía no está disponible en esta vista.');
    } else if (suggestion.action === 'focus') {
      const target = $(suggestion.target);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => target.focus(), 400);
        bubble('Te marqué el campo que debes completar.');
      }
    } else if (suggestion.action === 'navigate') {
      location.href = suggestion.target;
    } else if (suggestion.action === 'findText') {
      const needle = String(suggestion.text || '').toLowerCase();
      const target = $$('button,a,label').find((el) => el.textContent.toLowerCase().includes(needle));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => target.click(), 450);
        bubble('Encontré la opción y te llevé hasta ella.');
      } else bubble('No encontré ese botón en la sección actual.');
    } else if (suggestion.action === 'message') {
      setTimeout(() => bubble(suggestion.message), 180);
    } else if (suggestion.action === 'contact') {
      showContactFlow();
    }
  }

  function showContactFlow() {
    bubble('Quiero hablar con un asesor', 'user');
    bubble('Perfecto. Déjame tu nombre y WhatsApp en un solo mensaje, por ejemplo: “Juan, +56 9 1234 5678”.');
    setSuggestions([
      { label: 'Prefiero WhatsApp', action: 'message', message: 'Escribe tu nombre y número con código +56. Un asesor podrá continuar el contacto.' },
      { label: 'Seguir explorando', action: 'message', message: 'Puedes continuar revisando la página. Estaré disponible en este botón cuando me necesites.' }
    ]);
  }

  function answer(text) {
    const normalized = text.toLowerCase();
    if (/precio|valor|cu[aá]nto/.test(normalized)) {
      return 'Los valores dependen de la parcela, la casa, el plan de instalación y los extras. En el cotizador puedes ver cada componente por separado.';
    }
    if (/agua|luz|servicio/.test(normalized)) {
      return 'Revisa los distintivos y la ficha de cada propiedad. También puedes usar los filtros para encontrar parcelas con agua o luz.';
    }
    if (/casa|prefabricada|vivienda/.test(normalized)) {
      return 'Puedes elegir una casa del catálogo, cotizarla junto a una parcela o iniciar un diseño propio. Los planes ocultan los extras que ya incluyen.';
    }
    if (/tasador|tasaci[oó]n/.test(normalized)) {
      return pageType() === 'publicar'
        ? 'El tasador de casas considera construcción, material, antigüedad, estado, remodelación, regularización y cercanía. El tasador de parcelas permanece separado.'
        : 'El tasador está disponible dentro del publicador y entrega una referencia orientativa según los datos ingresados.';
    }
    if (/contact|whatsapp|asesor|persona/.test(normalized)) {
      showContactFlow();
      return '';
    }
    return activeContext?.info || 'Puedo ayudarte con la sección actual, explicar una función o llevarte al siguiente paso.';
  }

  function sendMessage() {
    const input = $('#tpl-advisor-input');
    const value = input?.value.trim();
    if (!value) return;
    bubble(value, 'user');
    input.value = '';
    const response = answer(value);
    if (response) setTimeout(() => bubble(response), 220);
  }

  function showNudge(context) {
    renderShell();
    const chat = $('#tpl-advisor-chat');
    if (chat && !chat.hidden) return;
    const nudge = $('#tpl-advisor-nudge');
    $('#tpl-advisor-nudge-title').textContent = context.title;
    $('#tpl-advisor-nudge-text').textContent = 'Puedo explicarte esta sección y darte dos opciones para avanzar.';
    nudge.hidden = false;
    requestAnimationFrame(() => nudge.classList.add('is-visible'));
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    const context = getContext();
    lastContextKey = context.key;
    idleTimer = setTimeout(() => {
      const current = getContext();
      if (current.key !== lastContextKey) return scheduleIdle();
      const shown = sread(AUTO_KEY, []);
      const token = `${pageType()}:${current.key}`;
      if (shown.includes(token)) return;
      shown.push(token);
      swrite(AUTO_KEY, shown.slice(-20));
      activeContext = current;
      showNudge(current);
      setTimeout(() => {
        const nudge = $('#tpl-advisor-nudge');
        if (nudge && !nudge.hidden) open('idle', current);
      }, 6500);
    }, IDLE_MS);
  }

  function markActivity(event) {
    if (event?.target?.closest?.('#tpl-advisor-root')) return;
    lastActivity = Date.now();
    clearTimeout(activityTimer);
    activityTimer = setTimeout(scheduleIdle, 220);
  }

  function bind() {
    renderShell();
    $('#tpl-advisor-launch').addEventListener('click', () => open('manual'));
    $('#tpl-advisor-minimize').addEventListener('click', close);
    $('.tpl-advisor-nudge-close').addEventListener('click', (event) => {
      event.stopPropagation();
      const nudge = $('#tpl-advisor-nudge');
      nudge.classList.remove('is-visible');
      setTimeout(() => { nudge.hidden = true; }, 180);
    });
    $('#tpl-advisor-nudge').addEventListener('click', () => open('idle', activeContext || getContext()));
    $('#tpl-advisor-quick-actions').addEventListener('click', (event) => {
      const button = event.target.closest('[data-suggestion]');
      if (!button) return;
      const suggestions = $('#tpl-advisor-quick-actions')._suggestions || [];
      performSuggestion(suggestions[Number(button.dataset.suggestion)]);
    });
    $('#tpl-advisor-send').addEventListener('click', sendMessage);
    $('#tpl-advisor-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); sendMessage(); }
    });
    ['scroll', 'mousemove', 'pointerdown', 'keydown', 'touchstart'].forEach((name) => {
      window.addEventListener(name, markActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearTimeout(idleTimer); else scheduleIdle();
    });
  }

  async function flushQueue() {
    const pending = read(QUEUE, null);
    if (!pending || !window.tplSupabase) return;
    const { error } = await window.tplSupabase.rpc('tpl_captar_comprador_asesor', { p_datos: pending.datos });
    if (!error) {
      localStorage.removeItem(QUEUE);
      write(CAPTURED, true);
    }
  }

  function init() {
    recordParcelView();
    bind();
    scheduleIdle();
    flushQueue();
    window.addEventListener('online', flushQueue);
    window.TPL = window.TPL || {};
    window.TPL.advisor = { open, close, getContext, version: VERSION };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
