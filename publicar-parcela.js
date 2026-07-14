(function(){
  const STORAGE_KEY = 'tpl_publicaciones_parcelas';
  const ADMIN_EMAIL = 'tuparcelalista@gmail.com';
  const ADMIN_WA = '56988508361';

  const $ = (sel) => document.querySelector(sel);

  function getPublicaciones(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }

  function setPublicaciones(items){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function formatFecha(){
    return new Date().toLocaleString('es-CL', { dateStyle:'short', timeStyle:'short' });
  }

  function collectForm(form){
    const data = Object.fromEntries(new FormData(form).entries());
    data.id = 'PUB-' + Date.now();
    data.estado = 'Pendiente de aprobación';
    data.contactoVisible = data.modalidadPublicacion === 'Venta Asistida TPL' ? 'Asesores de Tu Parcela Lista' : `${data.nombre} / ${data.telefono}`;
    data.modeloComercial = data.modalidadPublicacion === 'Venta Asistida TPL' ? 'Sin costo inicial. TPL gestiona interesados. Comisión objetivo 2% al comprador, informada y considerada en el precio publicado.' : `Publicación directa pagada. Plan: ${data.planDirecto || 'Por definir'}. Informe: ${data.frecuenciaInforme || 'Semanal'}.`;
    data.fecha = formatFecha();
    data.fotos = Array.from(document.getElementById('fotos-publicacion')?.files || []).map(f => f.name);
    return data;
  }

  function buildMessage(data){
    return `Nueva solicitud para publicar parcela en Tu Parcela Lista\n\nModalidad: ${data.modalidadPublicacion || 'No indicada'}\nContacto visible: ${data.contactoVisible || 'Por definir'}\nModelo comercial: ${data.modeloComercial || 'Por definir'}\nTipo: ${data.tipoPublicador}\nNombre: ${data.nombre}\nTeléfono: ${data.telefono}\nCorreo: ${data.correo}\nComisión/acuerdo: ${data.comision || 'Por conversar'}\nPlan directo: ${data.planDirecto || 'No aplica'}\nInforme: ${data.frecuenciaInforme || 'Semanal'}\n\nParcela: ${data.nombreParcela}\nPrecio: ${data.precio}\nSuperficie: ${data.superficie} m²\nComuna: ${data.comuna}\nRegión: ${data.region || 'No indicada'}\nRol propio: ${data.rol}\nAgua: ${data.agua}\nLuz: ${data.luz}\nLat/Lng: ${data.lat || 's/i'}, ${data.lng || 's/i'}\nMaps: ${data.maps || 'No indicado'}\n\nDescripción:\n${data.descripcion}\n\nFotos seleccionadas: ${(data.fotos || []).join(', ') || 'No adjuntas en formulario local'}\n\nEstado: Pendiente de revisión\nID: ${data.id}`;
  }

  function setupPlans(){
    const radios = document.querySelectorAll('input[name="modalidadPublicacion"]');
    const explainer = $('#mode-explainer');
    const directOnly = document.querySelectorAll('.direct-only');
    const planButtons = document.querySelectorAll('[data-select-plan]');

    function update(){
      const value = document.querySelector('input[name="modalidadPublicacion"]:checked')?.value || 'Venta Asistida TPL';
      const isDirect = value === 'Publicación Directa';
      directOnly.forEach(el => el.classList.toggle('is-hidden', !isDirect));
      if(explainer){
        explainer.innerHTML = isDirect
          ? 'En esta modalidad los datos del dueño, corredor o empresa se muestran al comprador. Se contrata un plan mensual o trimestral según cantidad de propiedades.'
          : 'En esta modalidad los datos del propietario no se muestran públicamente. El contacto visible será Asesores de Tu Parcela Lista y TPL acompaña la venta.';
      }
    }

    radios.forEach(r => r.addEventListener('change', update));
    planButtons.forEach(btn => btn.addEventListener('click', () => {
      const value = btn.dataset.selectPlan;
      const radio = Array.from(radios).find(r => r.value === value);
      if(radio){ radio.checked = true; update(); }
    }));
    update();
  }

  function setupForm(){
    const form = $('#form-publicar-parcela');
    if(!form) return;

    const fileInput = $('#fotos-publicacion');
    const fileHelp = $('#file-help');
    fileInput?.addEventListener('change', () => {
      const names = Array.from(fileInput.files || []).map(f => f.name);
      fileHelp.textContent = names.length ? `${names.length} foto(s) seleccionada(s): ${names.join(', ')}` : 'Puedes seleccionar varias fotos.';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = collectForm(form);
      const list = getPublicaciones();
      list.unshift(data);
      setPublicaciones(list);

      const msg = buildMessage(data);
      const wa = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(msg)}`;
      const mail = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent('Nueva parcela para revisión - ' + data.nombreParcela)}&body=${encodeURIComponent(msg)}`;
      const waBtn = $('#publish-whatsapp');
      if(waBtn) waBtn.href = wa;

      const status = $('#publish-status');
      if(status){
        status.innerHTML = `✅ Solicitud guardada como <strong>pendiente de aprobación</strong>. <a href="${wa}" target="_blank" rel="noopener">Enviar por WhatsApp</a> o <a href="${mail}">enviar por correo</a>.`;
      }
      window.location.href = wa;
    });
  }

  function setupAdmin(){
    const listEl = $('#admin-publicaciones-list');
    if(!listEl) return;

    function render(){
      const items = getPublicaciones();
      if(!items.length){
        listEl.innerHTML = '<div class="admin-empty">Aún no hay publicaciones guardadas en este navegador.</div>';
        return;
      }
      listEl.innerHTML = items.map(item => `
        <article class="admin-publicacion-card">
          <div>
            <span class="pending-badge">${item.estado}</span>
            <h2>${item.nombreParcela || 'Sin nombre'}</h2>
            <p><strong>${item.comuna || ''}</strong> · ${item.superficie || ''} m² · ${item.precio || ''}</p>
            <p>${item.descripcion || ''}</p>
            <small>${item.fecha} · ${item.modalidadPublicacion || 'Sin modalidad'} · ${item.tipoPublicador} · ${item.nombre} · ${item.telefono}</small>
          </div>
          <div class="admin-card-actions">
            <a class="btn-publish-secondary" href="https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(buildMessage(item))}" target="_blank" rel="noopener">WhatsApp</a>
            <button class="btn-publish-primary" data-approve="${item.id}">Marcar aprobada</button>
          </div>
        </article>`).join('');
    }

    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-approve]');
      if(!btn) return;
      const id = btn.dataset.approve;
      const items = getPublicaciones().map(i => i.id === id ? {...i, estado:'Aprobada para carga'} : i);
      setPublicaciones(items);
      render();
    });

    $('#clear-publicaciones')?.addEventListener('click', () => {
      if(confirm('¿Limpiar registros locales?')){ setPublicaciones([]); render(); }
    });

    $('#export-publicaciones')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(getPublicaciones(), null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'publicaciones-parcelas.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    render();
  }

  function setupNav(){
    const toggle = $('#nav-toggle');
    const links = $('#nav-links');
    if(!toggle || !links) return;
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupPlans();
    setupForm();
    setupAdmin();
    setupNav();
  });
})();
