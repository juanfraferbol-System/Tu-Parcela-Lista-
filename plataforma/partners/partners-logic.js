// Red Partner TPL - postulación pública segura
const SUPABASE_URL = 'https://qxavbqhyqaqalpzbhwmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJxeGF2YnFoeXFhcWFscHpiaHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA';
const BUCKET = 'partner-postulaciones';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_GALLERY = 5;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const form = document.getElementById('partner-form');
const submitButton = document.getElementById('btn-submit');
const statusBox = document.getElementById('form-status');

function setStatus(message, type = 'info') {
  statusBox.textContent = message;
  statusBox.className = `form-status is-${type}`;
}

function splitValues(value) {
  return [...new Set(String(value || '').split(',').map(v => v.trim()).filter(Boolean))].slice(0, 20);
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').slice(0, 16);
}

function safeExtension(file) {
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  return map[file.type] || '';
}

function validateFile(file, label) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error(`${label}: formato no permitido.`);
  if (file.size > MAX_FILE_SIZE) throw new Error(`${label}: supera el máximo de 5 MB.`);
}

function validateFormFiles() {
  const logo = document.getElementById('logo_file').files[0];
  const gallery = [...document.getElementById('gallery_files').files];
  if (!logo) throw new Error('Debes seleccionar un logo o fotografía principal.');
  validateFile(logo, 'Logo');
  if (gallery.length > MAX_GALLERY) throw new Error(`Puedes subir como máximo ${MAX_GALLERY} imágenes de trabajos.`);
  gallery.forEach((file, index) => validateFile(file, `Imagen ${index + 1}`));
  return { logo, gallery };
}

async function callRpc(name, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const raw = data?.message || data?.error || text || 'No fue posible completar la solicitud.';
    const messages = {
      POSTULACION_RECIENTE_EXISTENTE: 'Ya existe una postulación reciente con este correo. TPL la revisará antes de recibir una nueva.',
      CONSENTIMIENTOS_REQUERIDOS: 'Debes aceptar los consentimientos obligatorios.',
      DESCRIPCION_MUY_CORTA: 'Describe tus servicios con al menos 40 caracteres.',
      CORREO_INVALIDO: 'Revisa el correo electrónico.',
      WHATSAPP_INVALIDO: 'Revisa el número de WhatsApp.'
    };
    const friendly = Object.entries(messages).find(([key]) => raw.includes(key))?.[1] || 'No fue posible enviar la postulación. Revisa los datos e inténtalo nuevamente.';
    throw new Error(friendly);
  }
  return data;
}

async function uploadFile(file, applicationId, uploadToken, filename) {
  const objectPath = `${applicationId}/${uploadToken}/${filename}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'false'
    },
    body: file
  });
  if (!response.ok) throw new Error('La postulación fue creada, pero falló la carga de una imagen. Conserva el código y contacta a soporte.');
  return objectPath;
}

function buildPayload() {
  return {
    nombre_comercial: document.getElementById('nombre_comercial').value.trim(),
    nombre_responsable: document.getElementById('nombre_responsable').value.trim(),
    telefono: normalizePhone(document.getElementById('telefono').value),
    whatsapp: normalizePhone(document.getElementById('whatsapp').value),
    correo: document.getElementById('correo').value.trim().toLowerCase(),
    descripcion_servicios: document.getElementById('descripcion_servicios').value.trim(),
    tipo_servicio: document.getElementById('tipo_servicio').value,
    especialidades: splitValues(document.getElementById('especialidades').value),
    region: document.getElementById('region').value,
    comunas_atendidas: splitValues(document.getElementById('comunas_atendidas').value),
    anos_experiencia: Number(document.getElementById('anos_experiencia').value || 0),
    disponibilidad: document.getElementById('disponibilidad').value,
    emite_factura: document.getElementById('emite_factura').checked,
    acepta_proyectos_tpl: document.getElementById('acepta_proyectos_tpl').checked,
    trabaja_bajo_marca_tpl: document.getElementById('trabaja_bajo_marca_tpl').checked,
    plan_solicitado: document.querySelector('input[name="plan"]:checked')?.value || 'partner',
    acepta_terminos: document.getElementById('acepta_terminos').checked,
    acepta_privacidad: document.getElementById('acepta_privacidad').checked,
    autoriza_contacto: document.getElementById('autoriza_contacto').checked
  };
}

for (const card of document.querySelectorAll('.plan-card')) {
  card.addEventListener('click', () => {
    document.querySelectorAll('.plan-card').forEach(item => item.classList.remove('active'));
    card.classList.add('active');
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  });
}

form?.addEventListener('submit', async event => {
  event.preventDefault();
  statusBox.className = 'form-status';
  if (!form.reportValidity()) return;

  submitButton.disabled = true;
  submitButton.textContent = 'Creando postulación segura…';

  try {
    const { logo, gallery } = validateFormFiles();
    const result = await callRpc('tpl_postular_partner', { p_payload: buildPayload() });
    const applicationId = result.id;
    const uploadToken = result.upload_token;

    setStatus(`Postulación ${result.codigo} creada. Subiendo imágenes…`, 'info');
    const logoPath = await uploadFile(logo, applicationId, uploadToken, `logo.${safeExtension(logo)}`);
    const galleryPaths = [];
    for (let index = 0; index < gallery.length; index += 1) {
      galleryPaths.push(await uploadFile(gallery[index], applicationId, uploadToken, `galeria-${index + 1}.${safeExtension(gallery[index])}`));
    }

    await callRpc('tpl_confirmar_archivos_partner', {
      p_id: applicationId,
      p_token: uploadToken,
      p_logo_path: logoPath,
      p_galeria_paths: galleryPaths
    });

    form.style.display = 'none';
    const success = document.getElementById('success-msg');
    success.innerHTML = `<strong>Postulación recibida correctamente</strong>Tu código de seguimiento es <b>${result.codigo}</b>. El plan quedó solicitado, no activado. TPL revisará tus antecedentes antes de habilitar cualquier perfil público o cobro.`;
    success.style.display = 'block';
    window.scrollTo({ top: document.getElementById('postulacion').offsetTop - 30, behavior: 'smooth' });
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Ocurrió un error inesperado.', 'error');
    submitButton.disabled = false;
    submitButton.textContent = 'Enviar Postulación';
  }
});
