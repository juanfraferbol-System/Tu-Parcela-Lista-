// partners-logic.js
// Supabase logic for Red de Partners TPL Onboarding

// 1. Configuracion de Supabase (Reutilizamos la llave anonima de la app)
const SUPABASE_URL = 'https://qxavbqhyqaqalpzbhwmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXZicWh5cWFxYWxwemJod21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA';

// 2. Interacciones de la UI (Selección de Plan)
const planCards = document.querySelectorAll('.plan-card');
planCards.forEach(card => {
  card.addEventListener('click', () => {
    planCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  });
});

// Función para subir archivos a Supabase Storage
async function uploadFileToSupabase(file, bucket, path) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: formData
  });

  if (!response.ok) {
    console.error('Error subiendo archivo', response);
    throw new Error('Fallo al subir archivo');
  }

  // Devolver URL pública
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// Función para generar un slug amigable
function generateSlug(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// 3. Envío del Formulario
document.getElementById('partner-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('btn-submit');
  btn.textContent = 'Enviando postulación...';
  btn.disabled = true;

  try {
    const nombreComercial = document.getElementById('nombre_comercial').value.trim();
    let slug = generateSlug(nombreComercial) + '-' + Math.floor(Math.random() * 1000);

    // 3.1 Subir Logo
    const logoInput = document.getElementById('logo_file');
    let logoUrl = null;
    if (logoInput.files.length > 0) {
      const file = logoInput.files[0];
      const ext = file.name.split('.').pop();
      const path = `${slug}/logo.${ext}`;
      logoUrl = await uploadFileToSupabase(file, 'logos_partners', path);
    }

    // 3.2 Subir Galería (Opcional)
    const galleryInput = document.getElementById('gallery_files');
    const galleryUrls = [];
    if (galleryInput.files.length > 0) {
      for (let i = 0; i < galleryInput.files.length; i++) {
        const file = galleryInput.files[i];
        const ext = file.name.split('.').pop();
        const path = `${slug}/galeria_${i}.${ext}`;
        const url = await uploadFileToSupabase(file, 'logos_partners', path);
        galleryUrls.push(url);
      }
    }

    // 3.3 Construir el Payload
    const payload = {
      nombre_comercial: nombreComercial,
      nombre_responsable: document.getElementById('nombre_responsable').value.trim(),
      telefono: document.getElementById('telefono').value.trim(),
      whatsapp: document.getElementById('whatsapp').value.trim(),
      correo: document.getElementById('correo').value.trim(),
      descripcion_servicios: document.getElementById('descripcion_servicios').value.trim(),
      tipo_servicio: document.getElementById('tipo_servicio').value,
      especialidades: document.getElementById('especialidades').value.trim(),
      region: document.getElementById('region').value,
      comunas_atendidas: document.getElementById('comunas_atendidas').value.trim(),
      anos_experiencia: parseInt(document.getElementById('anos_experiencia').value),
      disponibilidad: document.getElementById('disponibilidad').value,
      emite_factura: document.getElementById('emite_factura').checked,
      acepta_proyectos_tpl: document.getElementById('acepta_proyectos_tpl').checked,
      trabaja_bajo_marca_tpl: document.getElementById('trabaja_bajo_marca_tpl').checked,
      plan_elegido: document.querySelector('input[name="plan"]:checked').value,
      logo_url: logoUrl,
      galeria_urls: galleryUrls,
      slug: slug,
      estado_verificacion: 'pendiente'
    };

    // 3.4 Insertar en Supabase (Tabla contratistas / partners)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/contratistas`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      document.getElementById('partner-form').style.display = 'none';
      document.getElementById('success-msg').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const errData = await response.json();
      console.error(errData);
      alert('Hubo un error al guardar los datos. Por favor, intenta de nuevo.');
      btn.textContent = 'Enviar Postulación';
      btn.disabled = false;
    }

  } catch (err) {
    console.error(err);
    alert('Ocurrió un error en la conexión o subida de archivos.');
    btn.textContent = 'Enviar Postulación';
    btn.disabled = false;
  }
});
