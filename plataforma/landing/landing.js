(async () => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const pathSlug = location.pathname.split('/').filter(Boolean).at(-1);
  const landingKey = params.get('id')
    || (pathSlug && pathSlug !== 'landing' ? pathSlug : 'land-caburgua');
  const preview = params.get('preview') === '1';
  const root = document.getElementById('landing-root');

  const esc = (value) => String(value ?? '').replace(
    /[&<>'"]/g,
    (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[character])
  );

  root.innerHTML = '<section class="missing" role="status"><p>Cargando proyecto…</p></section>';

  let landing = null;
  try {
    if (preview) {
      const admin = await window.TPLLandingRepository?.getAdmin(landingKey);
      landing = admin?.draft || null;
      if (landing) {
        landing.updatedAt = admin.updatedAt;
        landing.updatedBy = admin.updatedBy;
      }
    } else {
      landing = await window.TPLLandingRepository?.getPublished(landingKey);
    }
  } catch (error) {
    console.error('TPL Landing: no fue posible cargar la configuración canónica.', error);
    root.innerHTML = `
      <section class="missing" role="alert">
        <h1>No pudimos cargar el proyecto</h1>
        <p>Recarga la página. Si el problema continúa, comunícate con Tu Parcela Lista.</p>
        <button type="button" onclick="location.reload()">Reintentar</button>
      </section>`;
    return;
  }

  if (!landing) {
    root.innerHTML = `
      <section class="missing">
        <h1>Landing no disponible</h1>
        <p>Comprueba el enlace o vuelve a Tu Parcela Lista.</p>
        <a class="primary" href="/">Volver al inicio</a>
      </section>`;
    return;
  }

  root.dataset.landingId = landing.id || '';
  root.dataset.landingMode = preview ? 'preview' : 'public';
  document.title = landing.seoTitle || landing.title || 'Landing Premium';

  const whatsappNumber = String(landing.whatsapp || '').replace(/\D/g, '');
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, quiero información sobre ${landing.title}`)}`
    : '#contacto';

  const checkIcon = `
    <svg class="feature-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 6 9 17l-5-5"></path>
    </svg>`;
  const configuredFeatures = Array.isArray(landing.features) && landing.features.length
    ? landing.features
    : (landing.benefits || []).map((title) => ({ title, text: '' }));
  const features = configuredFeatures.map((feature) => {
    const item = typeof feature === 'string' ? { title: feature, text: '' } : feature;
    return `
      <article class="feature-card">
        <span class="feature-icon">${checkIcon}</span>
        <div>
          <h3>${esc(item.title)}</h3>
          ${item.text ? `<p>${esc(item.text)}</p>` : ''}
        </div>
      </article>`;
  }).join('');

  const branding = landing.tplBranding?.enabled ? landing.tplBranding : null;
  const brandingContent = Array.isArray(branding?.modalContent)
    ? branding.modalContent
    : [branding?.modalContent].filter(Boolean);
  const brandingParagraphs = brandingContent.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
  const footerTheme = /^[a-z0-9-]+$/i.test(branding?.footerTheme || '')
    ? branding.footerTheme
    : 'corporate';

  const gallery = (landing.gallery || []).map((image, index) => `
    <img
      src="${esc(image)}"
      alt="${esc(landing.title)} foto ${index + 1}"
      loading="lazy"
      decoding="async">`).join('');

  root.innerHTML = `
    ${preview ? '<aside class="preview-notice" role="status">Vista previa del borrador guardado. La página pública no cambia hasta seleccionar “Publicar cambios”.</aside>' : ''}
    <header class="top">
      <a href="/" class="brand">TU PARCELA LISTA</a>
      <nav>
        <a href="#beneficios">Beneficios</a>
        <a href="#galeria">Galería</a>
        <a href="#contacto" class="nav-cta">${esc(landing.ctaPrimary || 'Agendar visita')}</a>
      </nav>
    </header>
    <section class="hero" style="--hero:url('${esc(landing.heroImage)}')">
      <div class="overlay"></div>
      <div class="hero-content">
        <span>${esc(landing.eyebrow || 'PROYECTO PREMIUM')}</span>
        <h1>${esc(landing.title)}</h1>
        <p>${esc(landing.subtitle)}</p>
        <div class="hero-meta">
          <strong>${esc(landing.price)}</strong>
          <span>${esc(landing.location)}</span>
        </div>
        <div class="hero-actions">
          <a href="#contacto" class="primary">${esc(landing.ctaPrimary || 'Agendar visita')}</a>
          <a
            href="${esc(whatsappUrl)}"
            class="secondary"
            data-landing-action="whatsapp_click"
            target="_blank"
            rel="noopener">${esc(landing.ctaSecondary || 'WhatsApp')}</a>
        </div>
      </div>
    </section>
    <section id="beneficios" class="section intro">
      <div>
        <span class="kicker">UNA OPORTUNIDAD ÚNICA</span>
        <h2>Un lugar para vivir, invertir y disfrutar</h2>
      </div>
      <p>${esc(landing.description)}</p>
    </section>
    <section class="features-section" aria-labelledby="features-title">
      <div class="features-heading">
        <span class="kicker">LO QUE HACE ESPECIAL A CABURGUA</span>
        <h2 id="features-title">Características importantes</h2>
        <p>Conoce de manera simple los principales atributos informados para esta parcela.</p>
      </div>
      <div class="features-grid">${features}</div>
    </section>
    ${landing.videoUrl ? `
      <section class="section video">
        <iframe src="${esc(landing.videoUrl)}" title="Video del proyecto" allowfullscreen></iframe>
      </section>` : ''}
    <section id="galeria" class="section">
      <span class="kicker">GALERÍA</span>
      <h2>Conoce el entorno</h2>
      <div class="gallery">${gallery}</div>
    </section>
    <section id="contacto" class="contact">
      <div>
        <span class="kicker">AGENDA TU VISITA</span>
        <h2>Da el siguiente paso</h2>
        <p>Déjanos tus datos para resolver tus dudas o solicitar una visita.</p>
      </div>
      ${landing.formEnabled ? `
        <form id="landing-contact-form" novalidate>
          <label>
            <span>Nombre</span>
            <input name="nombre" autocomplete="name" maxlength="120" required placeholder="Tu nombre">
          </label>
          <label>
            <span>Teléfono o WhatsApp</span>
            <input name="telefono" type="tel" autocomplete="tel" maxlength="24" placeholder="+56 9...">
          </label>
          <label>
            <span>Correo</span>
            <input name="correo" type="email" autocomplete="email" maxlength="180" placeholder="nombre@correo.cl">
          </label>
          <label>
            <span>Fecha preferida para visitar</span>
            <input name="fecha_visita" type="datetime-local">
          </label>
          <label>
            <span>Consulta opcional</span>
            <textarea name="mensaje" rows="3" maxlength="1000" placeholder="Cuéntanos qué te gustaría saber"></textarea>
          </label>
          <label class="consent">
            <input name="acepta_tratamiento" type="checkbox" required>
            <span>Acepto que Tu Parcela Lista use estos datos para contactarme sobre esta propiedad.</span>
          </label>
          <div class="contact-actions">
            <button type="submit" data-submit-action="informacion_solicitada">Solicitar información</button>
            <button type="button" class="visit-button" data-submit-action="visita_solicitada">Solicitar visita</button>
          </div>
          <p id="landing-form-status" class="form-status" role="status" aria-live="polite"></p>
        </form>` : `
        <a
          class="primary"
          href="${esc(whatsappUrl)}"
          data-landing-action="whatsapp_click"
          target="_blank"
          rel="noopener">${esc(landing.ctaSecondary || 'Hablar por WhatsApp')}</a>`}
    </section>
    ${branding ? `
      <section class="tpl-brand-support" aria-labelledby="tpl-brand-title">
        <div>
          <button
            id="tpl-brand-title"
            class="tpl-brand-badge"
            type="button"
            data-branding-open
            aria-haspopup="dialog"
            aria-controls="tpl-branding-modal">
            ${checkIcon}
            <span>${esc(branding.badgeText)}</span>
          </button>
          <p>${esc(branding.supportText)}</p>
        </div>
      </section>
      <div
        id="tpl-branding-modal"
        class="tpl-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpl-modal-title"
        hidden>
        <div class="tpl-modal-backdrop" data-branding-close></div>
        <div class="tpl-modal-panel" role="document">
          <button class="tpl-modal-close" type="button" data-branding-close aria-label="Cerrar información">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M18 6 6 18M6 6l12 12"></path>
            </svg>
          </button>
          <span class="kicker">TPL BUSINESS</span>
          <h2 id="tpl-modal-title">${esc(branding.modalTitle)}</h2>
          <div class="tpl-modal-content">${brandingParagraphs}</div>
          <button class="tpl-modal-confirm" type="button" data-branding-close>Entendido</button>
        </div>
      </div>` : ''}
    <footer class="landing-footer footer-theme-${footerTheme}">
      <div class="footer-branding">
        <strong>${esc(branding?.footerText || 'TU PARCELA LISTA')}</strong>
        <span>${esc(branding?.badgeText || 'En tu proyecto de campo te acompañamos.')}</span>
      </div>
      ${branding?.ctaText && branding?.ctaUrl ? `
        <a class="footer-cta" href="${esc(branding.ctaUrl)}">${esc(branding.ctaText)}</a>` : ''}
    </footer>`;

  function status(message, type = '') {
    const element = document.getElementById('landing-form-status');
    if (!element) return;
    element.textContent = message;
    element.className = `form-status ${type}`.trim();
  }

  function setBusy(form, busy, action) {
    form.dataset.submitting = busy ? 'true' : 'false';
    form.querySelectorAll('[data-submit-action]').forEach((button) => {
      button.disabled = busy;
      if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
      if (busy && button.dataset.submitAction === action) button.textContent = 'Enviando…';
      if (!busy) button.textContent = button.dataset.originalText;
    });
  }

  function formPayload(form) {
    const data = new FormData(form);
    return {
      contact: {
        nombre: data.get('nombre'),
        telefono: data.get('telefono'),
        correo: data.get('correo'),
        aceptaTratamiento: data.get('acepta_tratamiento') === 'on'
      },
      detail: {
        fechaVisita: data.get('fecha_visita'),
        mensaje: data.get('mensaje')
      }
    };
  }

  function validate(form, action) {
    const data = new FormData(form);
    if (!String(data.get('nombre') || '').trim()) return 'Ingresa tu nombre.';
    const phone = String(data.get('telefono') || '').replace(/\D/g, '');
    const email = String(data.get('correo') || '').trim();
    if (!phone && !email) return 'Ingresa un teléfono o correo.';
    if (phone && phone.length < 8) return 'Revisa el número de teléfono.';
    if (email && !form.elements.correo.checkValidity()) return 'Revisa el correo ingresado.';
    if (data.get('acepta_tratamiento') !== 'on') return 'Debes aceptar el uso de tus datos para poder contactarte.';
    if (action === 'visita_solicitada') {
      const date = String(data.get('fecha_visita') || '');
      if (!date) return 'Selecciona una fecha y hora para solicitar la visita.';
      if (Date.parse(date) <= Date.now()) return 'Selecciona una fecha futura.';
    }
    return '';
  }

  async function submitLead(form, action) {
    if (form.dataset.submitting === 'true') return;
    const validationError = validate(form, action);
    if (validationError) {
      status(validationError, 'error');
      return;
    }
    if (!window.TPLLandingCRM) {
      status('No pudimos conectar con el sistema. Intenta nuevamente.', 'error');
      return;
    }

    const keyName = `idempotency${action}`;
    form.dataset[keyName] ||= window.TPLLandingCRM.newIdempotencyKey();
    setBusy(form, true, action);
    status(action === 'visita_solicitada' ? 'Registrando tu solicitud de visita…' : 'Registrando tu consulta…');

    try {
      const result = await window.TPLLandingCRM.capture({
        landingCode: landing.id,
        action,
        idempotencyKey: form.dataset[keyName],
        ...formPayload(form)
      });
      if (result.duplicate) {
        status('Tu solicitud ya estaba registrada. No creamos un contacto duplicado.', 'success');
      } else if (action === 'visita_solicitada') {
        status('Solicitud de visita registrada. Te contactaremos para confirmarla.', 'success');
      } else {
        status('Consulta registrada. Un asesor te contactará pronto.', 'success');
      }
      form.reset();
      delete form.dataset[keyName];
    } catch (error) {
      console.error('TPL Landing CRM:', error);
      status('No pudimos registrar la solicitud. Revisa tu conexión e intenta nuevamente.', 'error');
    } finally {
      setBusy(form, false, action);
    }
  }

  const form = document.getElementById('landing-contact-form');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    submitLead(form, 'informacion_solicitada');
  });
  form?.querySelector('[data-submit-action="visita_solicitada"]')?.addEventListener('click', () => {
    submitLead(form, 'visita_solicitada');
  });

  const brandingModal = document.getElementById('tpl-branding-modal');
  const brandingOpener = document.querySelector('[data-branding-open]');

  function modalFocusable() {
    return brandingModal
      ? [...brandingModal.querySelectorAll('button,a[href],[tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.disabled)
      : [];
  }

  function openBrandingModal() {
    if (!brandingModal) return;
    brandingModal.hidden = false;
    brandingModal.classList.add('open');
    document.body.classList.add('modal-open');
    modalFocusable()[0]?.focus();
  }

  function closeBrandingModal() {
    if (!brandingModal || brandingModal.hidden) return;
    brandingModal.classList.remove('open');
    brandingModal.hidden = true;
    document.body.classList.remove('modal-open');
    brandingOpener?.focus();
  }

  brandingOpener?.addEventListener('click', openBrandingModal);
  brandingModal?.querySelectorAll('[data-branding-close]').forEach((element) => {
    element.addEventListener('click', closeBrandingModal);
  });
  brandingModal?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeBrandingModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = modalFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.querySelectorAll('[data-landing-action="whatsapp_click"]').forEach((link) => {
    link.addEventListener('click', () => {
      if (!window.TPLLandingCRM) return;
      link.dataset.idempotency ||= window.TPLLandingCRM.newIdempotencyKey();
      window.TPLLandingCRM.capture({
        landingCode: landing.id,
        action: 'whatsapp_click',
        idempotencyKey: link.dataset.idempotency
      }).catch((error) => console.warn('No se pudo registrar el clic de WhatsApp:', error));
    });
  });
})();
