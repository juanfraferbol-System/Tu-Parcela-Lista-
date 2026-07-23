(() => {
  'use strict';

  let records = [];
  let record = null;
  const esc = (value) => String(value ?? '').replace(
    /[&<>'"]/g,
    (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[character])
  );

  function repository() {
    if (!window.TPLLandingRepository) {
      throw new Error('El repositorio de Landing no está disponible.');
    }
    return window.TPLLandingRepository;
  }

  function status(message, type = '') {
    const node = document.getElementById('landing-engine-status');
    if (!node) return;
    node.textContent = message;
    node.className = `landing-engine-status ${type}`.trim();
  }

  function formatDate(value) {
    if (!value) return 'Sin actualización registrada';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Sin actualización registrada'
      : date.toLocaleString('es-CL');
  }

  function score(landing = {}) {
    const parts = {
      hero: landing.title && landing.subtitle && landing.heroImage ? 15 : 0,
      gallery: Array.isArray(landing.gallery) ? Math.min(15, landing.gallery.filter(Boolean).length * 4) : 0,
      video: landing.videoUrl ? 10 : 0,
      cta: landing.ctaPrimary && landing.ctaSecondary ? 15 : landing.ctaPrimary ? 9 : 0,
      seo: landing.seoTitle && landing.seoDescription ? 20 : landing.seoTitle || landing.seoDescription ? 10 : 0,
      analytics: landing.analyticsEnabled ? 10 : 0,
      speed: landing.heroImage && !landing.heroImage.match(/\.(png|jpg|jpeg)$/i) ? 10 : 6,
      form: landing.formEnabled ? 5 : 0
    };
    return Object.values(parts).reduce((total, value) => total + value, 0);
  }

  function install() {
    const nav = document.querySelector('.sidebar-nav');
    const main = document.querySelector('.main-content');
    if (!nav || !main || document.getElementById('view-landing-engine')) return;

    const link = document.createElement('a');
    link.href = '#';
    link.className = 'nav-item';
    link.dataset.target = 'view-landing-engine';
    link.innerHTML = '<i data-lucide="panels-top-left"></i> Landing Engine';
    nav.append(link);

    const view = document.createElement('div');
    view.id = 'view-landing-engine';
    view.className = 'dashboard-section';
    view.style.display = 'none';
    view.innerHTML = `
      <section class="business-hero landing-engine-hero">
        <div>
          <span class="eyebrow">TPL BUSINESS</span>
          <h2>Landing Engine</h2>
          <p>Los borradores y la versión pública se administran desde Supabase.</p>
        </div>
      </section>
      <p id="landing-engine-status" class="landing-engine-status" role="status" aria-live="polite"></p>
      <div id="landing-list" class="landing-grid"></div>`;
    main.append(view);

    link.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelectorAll('.dashboard-section').forEach((section) => {
        section.classList.remove('active-section');
        section.style.display = 'none';
      });
      document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
      view.style.display = 'block';
      view.classList.add('active-section');
      link.classList.add('active');
      const title = document.getElementById('topbar-title');
      if (title) title.textContent = 'Landing Engine';
      load();
    });

    document.addEventListener('click', handleClick);
    window.lucide?.createIcons();
  }

  async function load() {
    status('Cargando configuración…');
    try {
      records = await repository().listAdmin();
      record = records[0] || null;
      render();
      status('');
    } catch (error) {
      console.error('Landing Engine:', error);
      status(error.code === '42501'
        ? 'No tienes permisos para administrar esta Landing.'
        : `Error al cargar: ${error.message}`, 'error');
    }
  }

  function render() {
    const root = document.getElementById('landing-list');
    if (!root) return;
    if (!records.length) {
      root.innerHTML = '<p>No existen Landings preparadas todavía.</p>';
      return;
    }
    root.innerHTML = records.map((item) => {
      const landing = item.draft || item.published || {};
      const stateLabel = {
        borrador: 'Borrador',
        publicada: 'Publicada',
        archivada: 'Archivada'
      }[item.status] || item.status;
      return `
      <article class="landing-card">
        <div class="landing-card-image" style="background-image:url('${esc(landing.heroImage)}')">
          <span class="landing-state ${esc(item.status)}">${esc(stateLabel)}</span>
          <div class="landing-score good"><strong>${score(landing)}</strong><span>/100</span></div>
        </div>
        <div class="landing-card-body">
          <span class="eyebrow">${esc(landing.template || 'parcela-premium')}</span>
          <h3>${esc(landing.title || 'Landing sin título')}</h3>
          <p>Última actualización: ${esc(formatDate(item.updatedAt))}</p>
          <p>Código: ${esc(item.code)}</p>
          <div class="landing-actions">
            <button data-landing-edit="${esc(item.code)}">Editar</button>
            <a href="/plataforma/landing/?id=${encodeURIComponent(item.code)}&preview=1" target="_blank" rel="noopener">Vista previa</a>
            <a href="${esc(landing.publicUrl || '/caburgua-premium')}" target="_blank" rel="noopener">Vista pública</a>
            <button class="business-primary" data-landing-publish="${esc(item.code)}">Publicar cambios</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function editor(code) {
    record = records.find((item) => item.code === code) || null;
    if (!record) return;
    const landing = record.draft || record.published || {};
    let modal = document.getElementById('landing-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'landing-modal';
      modal.className = 'business-modal';
      document.body.append(modal);
    }
    modal.innerHTML = `
      <div class="business-modal-box landing-modal-box">
        <div class="business-modal-head">
          <h3>Editar borrador</h3>
          <button type="button" class="business-secondary" data-landing-close>Cerrar</button>
        </div>
        <div class="business-modal-body">
          <form id="landing-form" class="business-form">
            <label class="wide">Título principal<input name="title" required maxlength="180" value="${esc(landing.title)}"></label>
            <label class="wide">Subtítulo<textarea name="subtitle" rows="2" maxlength="300">${esc(landing.subtitle)}</textarea></label>
            <label>Texto superior<input name="eyebrow" maxlength="120" value="${esc(landing.eyebrow)}"></label>
            <label>Precio<input name="price" maxlength="80" value="${esc(landing.price)}"></label>
            <label>Ubicación<input name="location" maxlength="160" value="${esc(landing.location)}"></label>
            <label>Imagen hero<input name="heroImage" value="${esc(landing.heroImage)}"></label>
            <label class="wide">Descripción<textarea name="description" rows="4" maxlength="1200">${esc(landing.description)}</textarea></label>
            <label class="wide">Galería (una URL por línea)<textarea name="gallery" rows="5">${esc((landing.gallery || []).join('\n'))}</textarea></label>
            <label class="wide">Beneficios (uno por línea)<textarea name="benefits" rows="5">${esc((landing.benefits || []).join('\n'))}</textarea></label>
            <label>CTA principal<input name="ctaPrimary" value="${esc(landing.ctaPrimary || 'Agendar visita')}"></label>
            <label>CTA secundario<input name="ctaSecondary" value="${esc(landing.ctaSecondary || 'Hablar por WhatsApp')}"></label>
            <label>WhatsApp<input name="whatsapp" value="${esc(landing.whatsapp)}"></label>
            <label>Video URL<input name="videoUrl" value="${esc(landing.videoUrl)}"></label>
            <label class="wide">Enlace de Google Maps<input name="mapUrl" type="url" value="${esc(landing.mapUrl)}" placeholder="https://www.google.com/maps/…"></label>
            <label>Latitud pública<input name="mapLatitude" type="number" min="-90" max="90" step="any" value="${esc(landing.mapLatitude)}" placeholder="-39.253"></label>
            <label>Longitud pública<input name="mapLongitude" type="number" min="-180" max="180" step="any" value="${esc(landing.mapLongitude)}" placeholder="-71.796"></label>
            <label>Zoom del mapa<input name="mapZoom" type="number" min="11" max="19" step="1" value="${esc(landing.mapZoom || 16)}"></label>
            <p class="wide">La Landing usa primero latitud y longitud. Si están vacías, intenta obtenerlas desde el enlace de Google Maps.</p>
            <label class="wide">Título SEO<input name="seoTitle" maxlength="180" value="${esc(landing.seoTitle)}"></label>
            <label class="wide">Descripción SEO<textarea name="seoDescription" rows="2" maxlength="320">${esc(landing.seoDescription)}</textarea></label>
            <label class="landing-check"><input type="checkbox" name="formEnabled" ${landing.formEnabled ? 'checked' : ''}> Formulario activo</label>
            <label class="landing-check"><input type="checkbox" name="analyticsEnabled" ${landing.analyticsEnabled ? 'checked' : ''}> Analytics conectado</label>
            <label class="landing-check"><input type="checkbox" name="adsReady" ${landing.adsReady ? 'checked' : ''}> Lista para Google Ads</label>
            <p id="landing-save-status" class="wide landing-engine-status" role="status" aria-live="polite"></p>
            <div class="wide business-modal-foot">
              <button type="button" class="business-secondary" data-landing-close>Cancelar</button>
              <button class="business-primary" type="submit">Guardar borrador</button>
            </div>
          </form>
        </div>
      </div>`;
    modal.classList.add('open');
    document.getElementById('landing-form').addEventListener('submit', saveDraft);
  }

  function configuration(form) {
    const old = record.draft || record.published || {};
    const values = Object.fromEntries(new FormData(form));
    const mapLatitude = values.mapLatitude === '' ? null : Number(values.mapLatitude);
    const mapLongitude = values.mapLongitude === '' ? null : Number(values.mapLongitude);
    const mapZoom = values.mapZoom === '' ? 16 : Number(values.mapZoom);
    return {
      ...old,
      title: values.title.trim(),
      subtitle: values.subtitle.trim(),
      eyebrow: values.eyebrow.trim(),
      price: values.price.trim(),
      location: values.location.trim(),
      heroImage: values.heroImage.trim(),
      description: values.description.trim(),
      gallery: values.gallery.split(/\n+/).map((item) => item.trim()).filter(Boolean),
      benefits: values.benefits.split(/\n+/).map((item) => item.trim()).filter(Boolean),
      ctaPrimary: values.ctaPrimary.trim(),
      ctaSecondary: values.ctaSecondary.trim(),
      whatsapp: values.whatsapp.replace(/\D/g, ''),
      videoUrl: values.videoUrl.trim(),
      mapUrl: values.mapUrl.trim(),
      mapLatitude: Number.isFinite(mapLatitude) ? mapLatitude : null,
      mapLongitude: Number.isFinite(mapLongitude) ? mapLongitude : null,
      mapZoom: Number.isFinite(mapZoom) ? mapZoom : 16,
      seoTitle: values.seoTitle.trim(),
      seoDescription: values.seoDescription.trim(),
      formEnabled: form.formEnabled.checked,
      analyticsEnabled: form.analyticsEnabled.checked,
      adsReady: form.adsReady.checked,
      id: record.code,
      slug: record.slug
    };
  }

  async function saveDraft(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const node = document.getElementById('landing-save-status');
    const button = form.querySelector('[type="submit"]');
    if (!form.reportValidity()) return;
    button.disabled = true;
    button.textContent = 'Guardando…';
    node.textContent = 'Guardando…';
    node.className = 'wide landing-engine-status';
    try {
      const draft = configuration(form);
      const result = await repository().saveDraft(record.code, draft);
      record = { ...record, draft, updatedAt: result.updatedAt, updatedBy: result.updatedBy };
      records = records.map((item) => item.code === record.code ? record : item);
      node.textContent = 'Cambios guardados.';
      node.className = 'wide landing-engine-status success';
      render();
    } catch (error) {
      console.error('Landing Engine guardar:', error);
      node.textContent = `Error al guardar: ${error.message}`;
      node.className = 'wide landing-engine-status error';
    } finally {
      button.disabled = false;
      button.textContent = 'Guardar borrador';
    }
  }

  async function publish(code) {
    record = records.find((item) => item.code === code) || null;
    const button = document.querySelector(`[data-landing-publish="${CSS.escape(code)}"]`);
    if (!record || !button) return;
    button.disabled = true;
    button.textContent = 'Publicando…';
    status('Publicando cambios…');
    try {
      const result = await repository().publish(record.code);
      record = await repository().getAdmin(record.code);
      records = records.map((item) => item.code === record.code ? record : item);
      render();
      status(`Publicado correctamente. Versión ${result.version}.`, 'success');
    } catch (error) {
      console.error('Landing Engine publicar:', error);
      status(`Error al publicar: ${error.message}`, 'error');
      button.disabled = false;
      button.textContent = 'Publicar cambios';
    }
  }

  function close() {
    document.getElementById('landing-modal')?.classList.remove('open');
  }

  function handleClick(event) {
    const edit = event.target.closest('[data-landing-edit]');
    const publishButton = event.target.closest('[data-landing-publish]');
    if (edit) editor(edit.dataset.landingEdit);
    if (publishButton) publish(publishButton.dataset.landingPublish);
    if (event.target.closest('[data-landing-close]') || event.target.id === 'landing-modal') close();
  }

  document.addEventListener('DOMContentLoaded', install);
})();
