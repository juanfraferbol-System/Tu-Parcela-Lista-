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
  const safeMapUrl = (() => {
    try {
      const url = new URL(String(landing.mapUrl || ''), location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  })();
  const safeVideoUrl = (() => {
    try {
      const url = new URL(String(landing.videoUrl || ''), location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  })();
  const directVideo = /\.(mp4|webm|ogg)(?:$|[?#])/i.test(safeVideoUrl);
  const videoEmbedUrl = (() => {
    if (!safeVideoUrl || directVideo) return safeVideoUrl;
    try {
      const url = new URL(safeVideoUrl);
      let videoId = '';
      if (url.hostname.includes('youtu.be')) videoId = url.pathname.split('/').filter(Boolean)[0] || '';
      if (url.hostname.includes('youtube.com')) {
        videoId = url.searchParams.get('v')
          || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1]
          || '';
      }
      if (videoId) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
      return url.href;
    } catch {
      return '';
    }
  })();
  const withVideoParams = (url, expanded = false) => {
    if (!url || directVideo) return url;
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('autoplay', '1');
      parsed.searchParams.set('playsinline', '1');
      if (!expanded) {
        parsed.searchParams.set('mute', '1');
        parsed.searchParams.set('muted', '1');
        parsed.searchParams.set('controls', '0');
        parsed.searchParams.set('loop', '1');
        const youtubeId = parsed.pathname.match(/\/embed\/([^/?]+)/)?.[1];
        if (youtubeId) parsed.searchParams.set('playlist', youtubeId);
      } else {
        parsed.searchParams.set('controls', '1');
      }
      return parsed.href;
    } catch {
      return url;
    }
  };

  const checkIcon = `
    <svg class="feature-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 6 9 17l-5-5"></path>
    </svg>`;
  const arrowIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 12h14M13 6l6 6-6 6"></path>
    </svg>`;
  const whatsappIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.45L3 20l1.15-4.2A8.5 8.5 0 1 1 20 11.5Z"></path>
      <path d="M8.4 8.1c.35 2.2 2.1 4 4.35 4.45"></path>
    </svg>`;
  const configuredFeatures = Array.isArray(landing.features) && landing.features.length
    ? landing.features
    : (landing.benefits || []).map((title) => ({ title, text: '' }));
  const features = configuredFeatures.filter(Boolean).map((feature) => {
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

  const galleryImages = Array.isArray(landing.gallery) ? landing.gallery.filter(Boolean) : [];
  const gallery = galleryImages.map((image, index) => `
    <button class="gallery-item" type="button" data-gallery-index="${index}" aria-label="Ampliar fotografía ${index + 1}">
      <img
        src="${esc(image)}"
        alt="${esc(landing.title)} foto ${index + 1}"
        loading="lazy"
        decoding="async">
      <span>${String(index + 1).padStart(2, '0')}</span>
    </button>`).join('');

  root.innerHTML = `
    ${preview ? '<aside class="preview-notice" role="status">Vista previa del borrador guardado. La página pública no cambia hasta seleccionar “Publicar cambios”.</aside>' : ''}
    <header class="top">
      <a href="/" class="brand"><span>TPL</span><strong>TU PARCELA LISTA</strong></a>
      <nav>
        <a href="#beneficios">Beneficios</a>
        <a href="#galeria">Galería</a>
        <a href="#contacto" class="nav-cta">${esc(landing.ctaPrimary || 'Agendar visita')} ${arrowIcon}</a>
      </nav>
    </header>
    <section class="hero" style="--hero:url('${esc(landing.heroImage)}')">
      <div class="overlay"></div>
      <div class="hero-content">
        <span class="hero-kicker">${esc(landing.eyebrow || 'PROYECTO PREMIUM')}</span>
        <h1>${esc(landing.title)}</h1>
        <p class="hero-summary">${esc(landing.subtitle)}</p>
        <div class="hero-meta">
          <div><small>VALOR DE PUBLICACIÓN</small><strong>${esc(landing.price)}</strong></div>
          <div><small>UBICACIÓN</small><span>${esc(landing.location)}</span></div>
        </div>
        <div class="hero-actions">
          <a href="#contacto" class="primary">${esc(landing.ctaPrimary || 'Agendar visita')} ${arrowIcon}</a>
          <a
            href="${esc(whatsappUrl)}"
            class="secondary"
            data-landing-action="whatsapp_click"
            target="_blank"
            rel="noopener">${whatsappIcon}${esc(landing.ctaSecondary || 'WhatsApp')}</a>
        </div>
      </div>
      <a class="hero-scroll" href="#historia" aria-label="Conocer la historia de esta propiedad"><span></span>DESCUBRIR</a>
    </section>
    <section id="historia" class="section intro editorial-story">
      <div class="editorial-heading">
        <span class="editorial-number">01</span>
        <div>
          <span class="kicker">HISTORIA DEL PROYECTO</span>
          <h2>Un lugar para vivir, invertir y disfrutar</h2>
        </div>
      </div>
      <div class="editorial-copy">
        <p>${esc(landing.description)}</p>
        <div class="editorial-signature"><span></span><strong>${esc(landing.location || 'Sur de Chile')}</strong><small>Una propiedad presentada para descubrir con calma.</small></div>
      </div>
    </section>
    <section id="beneficios" class="features-section" aria-labelledby="features-title">
      <div class="features-heading">
        <span class="section-index">02</span>
        <span class="kicker">${esc(landing.featuresKicker || 'LO QUE HACE ESPECIAL A ESTA PROPIEDAD')}</span>
        <h2 id="features-title">Características importantes</h2>
        <p>Conoce de manera simple los principales atributos informados para esta parcela.</p>
      </div>
      <div class="features-grid">${features}</div>
    </section>
    ${safeVideoUrl ? `
      <section class="section video-showcase" aria-labelledby="video-showcase-title">
        <div class="video-heading">
          <span class="section-index">03</span>
          <span class="kicker">VISTA PREVIA</span>
          <h2 id="video-showcase-title">Una primera mirada al proyecto</h2>
          <p>El video se reproduce en formato compacto. Ábrelo para disfrutarlo en pantalla completa.</p>
        </div>
        <button class="video-preview-card" type="button" data-video-open aria-haspopup="dialog" aria-controls="landing-video-modal">
          <span class="video-preview-media">
            ${directVideo
              ? `<video autoplay muted loop playsinline preload="metadata" aria-hidden="true"><source src="${esc(safeVideoUrl)}"></video>`
              : `<iframe src="${esc(withVideoParams(videoEmbedUrl))}" title="Vista previa silenciosa del proyecto" tabindex="-1" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture"></iframe>`}
          </span>
          <span class="video-preview-overlay"></span>
          <span class="video-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5Z"></path></svg></span>
          <span class="video-preview-label"><small>VIDEO DEL PROYECTO</small><strong>Ver experiencia completa</strong></span>
        </button>
      </section>` : ''}
    <section id="galeria" class="section">
      <div class="section-heading-row">
        <div><span class="section-index">${safeVideoUrl ? '04' : '03'}</span><span class="kicker">GALERÍA EDITORIAL</span><h2>Conoce el entorno</h2></div>
        <p>Recorre cada imagen y descubre los detalles que hacen especial a esta propiedad.</p>
      </div>
      <div class="gallery">${gallery}</div>
    </section>
    ${safeMapUrl ? `
      <section class="section landing-location" aria-labelledby="landing-location-title">
        <div class="location-copy">
          <span class="section-index">${safeVideoUrl ? '05' : '04'}</span>
          <span class="kicker">UBICACIÓN Y ENTORNO</span>
          <h2 id="landing-location-title">Conoce el sector</h2>
          <p>${esc(landing.location || 'Ubicación informada por el propietario o representante.')}</p>
        </div>
        <a href="${esc(safeMapUrl)}" target="_blank" rel="noopener noreferrer">
          <span>Explorar ubicación</span><small>Abrir en Google Maps</small>${arrowIcon}
        </a>
      </section>` : ''}
    <section id="contacto" class="contact">
      <div class="contact-copy">
        <span class="section-index">${safeVideoUrl ? '06' : '05'}</span>
        <span class="kicker">AGENDA TU VISITA</span>
        <h2>Conoce esta propiedad en persona.</h2>
        <p>Déjanos tus datos para resolver tus dudas, recibir información o coordinar una visita.</p>
        <div class="contact-promise"><span>${checkIcon}</span><p><strong>Atención personalizada</strong><small>Tu solicitud quedará registrada para realizar seguimiento comercial.</small></p></div>
      </div>
      ${landing.formEnabled ? `
        <form id="landing-contact-form" class="contact-card" novalidate>
          <div class="form-heading"><small>CONTACTO PRIVADO</small><strong>Hablemos de tu próxima visita</strong></div>
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
          <span class="support-kicker">RESPALDO COMERCIAL</span>
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
      <div class="footer-main">
        <a href="/" class="footer-monogram" aria-label="Ir a Tu Parcela Lista">TPL</a>
        <div class="footer-branding">
          <strong>${esc(branding?.footerText || 'TU PARCELA LISTA')}</strong>
          <span>${esc(branding?.badgeText || 'En tu proyecto de campo te acompañamos.')}</span>
        </div>
        <nav aria-label="Navegación final">
          <a href="#historia">Historia</a><a href="#beneficios">Características</a><a href="#galeria">Galería</a><a href="#contacto">Contacto</a>
        </nav>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Tu Parcela Lista</span>
        <span>Tecnología y gestión comercial mediante TPL Business</span>
        ${branding?.ctaText && branding?.ctaUrl ? `<a class="footer-cta" href="${esc(branding.ctaUrl)}">${esc(branding.ctaText)} ${arrowIcon}</a>` : ''}
      </div>
    </footer>
    <nav class="mobile-conversion-bar" aria-label="Acciones rápidas">
      <a href="${esc(whatsappUrl)}" data-landing-action="whatsapp_click" target="_blank" rel="noopener">${whatsappIcon}<span>WhatsApp</span></a>
      <a href="#contacto" class="mobile-primary"><span>${esc(landing.ctaPrimary || 'Agendar visita')}</span>${arrowIcon}</a>
    </nav>
    ${galleryImages.length ? `
      <div class="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Galería ampliada" hidden>
        <div class="gallery-lightbox-backdrop" data-gallery-close></div>
        <button class="gallery-lightbox-close" type="button" data-gallery-close aria-label="Cerrar galería">×</button>
        <button class="gallery-lightbox-prev" type="button" data-gallery-prev aria-label="Fotografía anterior">‹</button>
        <figure><img alt=""><figcaption></figcaption></figure>
        <button class="gallery-lightbox-next" type="button" data-gallery-next aria-label="Fotografía siguiente">›</button>
      </div>` : ''}
    ${safeVideoUrl ? `
      <div id="landing-video-modal" class="video-modal" role="dialog" aria-modal="true" aria-labelledby="landing-video-title" hidden>
        <div class="video-modal-backdrop" data-video-close></div>
        <div class="video-modal-panel">
          <div class="video-modal-heading">
            <div><small>VIDEO DEL PROYECTO</small><strong id="landing-video-title">${esc(landing.title)}</strong></div>
            <button type="button" data-video-close aria-label="Cerrar video">×</button>
          </div>
          <div class="video-modal-media">
            ${directVideo
              ? `<video controls playsinline preload="metadata"><source src="${esc(safeVideoUrl)}"></video>`
              : `<iframe data-video-frame-src="${esc(withVideoParams(videoEmbedUrl, true))}" title="Video completo de ${esc(landing.title)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>`}
          </div>
        </div>
      </div>` : ''}`;

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
    syncModalLock();
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

  const galleryModal = document.querySelector('.gallery-lightbox');
  const galleryModalImage = galleryModal?.querySelector('figure img');
  const galleryCaption = galleryModal?.querySelector('figcaption');
  const galleryButtons = [...document.querySelectorAll('[data-gallery-index]')];
  let galleryIndex = 0;
  let galleryReturnFocus = null;

  function syncModalLock() {
    const modalIsOpen = [brandingModal, galleryModal, videoModal]
      .some((element) => element && !element.hidden);
    document.body.classList.toggle('modal-open', modalIsOpen);
  }

  function showGalleryImage(index) {
    if (!galleryImages.length || !galleryModalImage || !galleryCaption) return;
    galleryIndex = (index + galleryImages.length) % galleryImages.length;
    galleryModalImage.src = galleryImages[galleryIndex];
    galleryModalImage.alt = `${landing.title} foto ${galleryIndex + 1}`;
    galleryCaption.textContent = `${String(galleryIndex + 1).padStart(2, '0')} / ${String(galleryImages.length).padStart(2, '0')}`;
  }

  function openGallery(index, opener) {
    if (!galleryModal) return;
    galleryReturnFocus = opener;
    showGalleryImage(index);
    galleryModal.hidden = false;
    galleryModal.classList.add('open');
    syncModalLock();
    galleryModal.querySelector('[data-gallery-close]:not(.gallery-lightbox-backdrop)')?.focus();
  }

  function closeGallery() {
    if (!galleryModal || galleryModal.hidden) return;
    galleryModal.classList.remove('open');
    galleryModal.hidden = true;
    galleryModalImage?.removeAttribute('src');
    syncModalLock();
    galleryReturnFocus?.focus();
  }

  galleryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      openGallery(Number(button.dataset.galleryIndex || 0), button);
    });
  });
  galleryModal?.querySelectorAll('[data-gallery-close]').forEach((element) => {
    element.addEventListener('click', closeGallery);
  });
  galleryModal?.querySelector('[data-gallery-prev]')?.addEventListener('click', () => {
    showGalleryImage(galleryIndex - 1);
  });
  galleryModal?.querySelector('[data-gallery-next]')?.addEventListener('click', () => {
    showGalleryImage(galleryIndex + 1);
  });

  const videoModal = document.getElementById('landing-video-modal');
  const videoOpener = document.querySelector('[data-video-open]');
  const videoFrame = videoModal?.querySelector('iframe');
  const expandedVideo = videoModal?.querySelector('video');

  function openVideoModal() {
    if (!videoModal) return;
    videoModal.hidden = false;
    videoModal.classList.add('open');
    if (videoFrame?.dataset.videoFrameSrc) videoFrame.src = videoFrame.dataset.videoFrameSrc;
    expandedVideo?.play().catch(() => {});
    syncModalLock();
    videoModal.querySelector('[data-video-close]:not(.video-modal-backdrop)')?.focus();
  }

  function closeVideoModal() {
    if (!videoModal || videoModal.hidden) return;
    videoModal.classList.remove('open');
    videoModal.hidden = true;
    if (videoFrame) videoFrame.removeAttribute('src');
    expandedVideo?.pause();
    syncModalLock();
    videoOpener?.focus();
  }

  videoOpener?.addEventListener('click', openVideoModal);
  videoModal?.querySelectorAll('[data-video-close]').forEach((element) => {
    element.addEventListener('click', closeVideoModal);
  });

  function trapFocus(container, event) {
    if (event.key !== 'Tab' || !container || container.hidden) return;
    const focusable = [...container.querySelectorAll('button,a[href],[tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.disabled);
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
  }

  galleryModal?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') showGalleryImage(galleryIndex - 1);
    if (event.key === 'ArrowRight') showGalleryImage(galleryIndex + 1);
    trapFocus(galleryModal, event);
  });
  videoModal?.addEventListener('keydown', (event) => trapFocus(videoModal, event));

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    document.querySelector('.video-preview-media video')?.pause();
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (galleryModal && !galleryModal.hidden) closeGallery();
    if (videoModal && !videoModal.hidden) closeVideoModal();
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
