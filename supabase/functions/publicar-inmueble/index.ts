import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (status:number, body:Record<string,unknown>) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
});

const clean = (value:unknown) => String(value ?? '').trim();
const numberOrNull = (value:unknown) => {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const pick = (...values:unknown[]) => values.find(value => value !== undefined && value !== null && clean(value) !== '');

function normalizePayload(payload:Record<string, any>) {
  const form = payload.formulario || {};
  const property = payload.propiedad || {};
  const contact = payload.contacto || {};
  const services = payload.servicios || {};
  const house = payload.casa || {};
  const commercial = payload.comercial || {};
  const location = payload.ubicacion || {};
  const documentation = payload.documentacion || {};
  const plan = payload.plan || {};

  const tipo = clean(pick(payload.tipo, property.tipo, form.tipo)).toLowerCase();
  return {
    tipo,
    codigo: clean(pick(payload.codigo_temporal, payload.codigo, payload.codigo_publico)),
    titulo: clean(pick(payload.titulo, property.titulo, form.titulo)),
    descripcion: clean(pick(payload.descripcionFinal, property.descripcionComercial, property.descripcion, form.descripcionFinal)),
    region: clean(pick(payload.region, property.region, form.region)),
    comuna: clean(pick(payload.comuna, property.comuna, form.comuna)),
    localidad: clean(pick(payload.localidad, property.localidad, form.localidad)),
    precio: numberOrNull(pick(payload.precio, property.precio, form.precioVenta)) || 0,
    superficieTerreno: numberOrNull(pick(payload.superficie, property.superficieTerreno, form.superficie, form.casaTerreno)),
    superficieConstruida: numberOrNull(pick(payload.casaSuperficie, property.superficieConstruida, form.casaSuperficie)),
    habitaciones: numberOrNull(pick(payload.habitaciones, house.habitaciones, form.habitaciones)),
    banos: numberOrNull(pick(payload.banos, house.banos, form.banos)),
    material: clean(pick(payload.material, house.material, form.material)),
    rol: clean(pick(payload.rol, documentation.rol, form.rol)),
    agua: clean(pick(payload.agua, services.agua, form.agua, form.aguaCasa)),
    luz: clean(pick(payload.luz, services.electricidad, form.luz)),
    distanciaRutaPrincipalKm: numberOrNull(pick(payload.distanciaRutaPrincipalKm, services.distanciaRutaPrincipalKm, form.distanciaRutaPrincipalKm)),
    urgencia: clean(pick(payload.urgencia, commercial.urgencia, form.urgencia)),
    estadoPropiedad: clean(pick(payload.estadoPropiedad, house.estado, form.estadoCasa)),
    nombre: clean(pick(payload.nombre, contact.nombre, form.nombre)),
    telefono: clean(pick(payload.telefono, contact.telefono, form.telefono)),
    correo: clean(pick(payload.correo, payload.email, contact.email, form.email)).toLowerCase(),
    publicador: clean(pick(payload.publicador, contact.tipo, form.anunciante)),
    plan: clean(pick(payload.plan_publicacion, plan.id, form.planSeleccionado)) || 'inicio',
    tasacion: payload.tasacion || {},
    ubicacion: {
      lat: numberOrNull(pick(location.lat, location.latitude)),
      lng: numberOrNull(pick(location.lng, location.longitude)),
      source: clean(pick(location.source, location.fuente)),
      publica_aproximada: location.publicaAproximada !== false && location.publica_aproximada !== false
    }
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { ok:false, error:'Método no permitido.' });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return json(500, { ok:false, error:'Configuración del servidor incompleta.' });

    const supabase = createClient(url, serviceKey, { auth:{ persistSession:false } });
    const formData = await req.formData();
    const originalPayload = JSON.parse(clean(formData.get('payload')) || '{}');
    const payload = normalizePayload(originalPayload);

    if (!['casa','parcela'].includes(payload.tipo)) return json(400, { ok:false, error:'Debes elegir Casa o Parcela.' });
    const required:Array<[string, unknown]> = [
      ['título', payload.titulo], ['descripción', payload.descripcion], ['región', payload.region],
      ['comuna', payload.comuna], ['precio', payload.precio], ['nombre', payload.nombre],
      ['teléfono', payload.telefono], ['correo', payload.correo]
    ];
    for (const [label, value] of required) if (!clean(value)) return json(400, { ok:false, error:`Falta completar: ${label}.` });

    const codigo = payload.codigo || `TPL-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
    const files = formData.getAll('photos').filter((x): x is File => x instanceof File);
    if (!files.length) return json(400, { ok:false, error:'Debes agregar al menos una fotografía.' });
    if (files.length > 12) return json(400, { ok:false, error:'Puedes subir hasta 12 fotografías.' });

    const uploaded:string[] = [];
    for (let i=0;i<files.length;i++) {
      const file = files[i];
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return json(400,{ok:false,error:`Formato no permitido: ${file.name}`});
      if (file.size > 12*1024*1024) return json(400,{ok:false,error:`La foto ${file.name} supera 12 MB.`});
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${codigo}/${String(i+1).padStart(2,'0')}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('publicaciones-unificadas').upload(path, file, { contentType:file.type, upsert:false });
      if (error) throw error;
      const { data } = supabase.storage.from('publicaciones-unificadas').getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }

    const row = {
      codigo_publico: codigo,
      tipo: payload.tipo,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      region: payload.region,
      comuna: payload.comuna,
      localidad: payload.localidad || null,
      precio: payload.precio,
      superficie_terreno_m2: payload.superficieTerreno,
      superficie_construida_m2: payload.superficieConstruida,
      habitaciones: payload.tipo === 'casa' ? payload.habitaciones : null,
      banos: payload.tipo === 'casa' ? payload.banos : null,
      material: payload.tipo === 'casa' ? payload.material || null : null,
      rol: payload.tipo === 'parcela' ? payload.rol || null : null,
      agua: payload.tipo === 'parcela' ? payload.agua || null : null,
      luz: payload.tipo === 'parcela' ? payload.luz || null : null,
      distancia_ruta_principal_km: payload.tipo === 'parcela' ? payload.distanciaRutaPrincipalKm : null,
      urgencia: payload.urgencia || null,
      estado_propiedad: payload.estadoPropiedad || null,
      nombre_contacto: payload.nombre,
      telefono_contacto: payload.telefono,
      correo_contacto: payload.correo,
      tipo_publicador: payload.publicador || null,
      fotos: uploaded,
      cotizacion: originalPayload.plan || originalPayload.cotizacion || {},
      plan_publicacion: payload.plan,
      tasacion: payload.tasacion,
      latitud_privada: payload.ubicacion.lat,
      longitud_privada: payload.ubicacion.lng,
      ubicacion_fuente: payload.ubicacion.source || null,
      ubicacion_publica_aproximada: payload.ubicacion.publica_aproximada,
      payload_original: originalPayload
    };

    const { data, error } = await supabase.from('publicaciones_unificadas').insert(row).select('id,codigo_publico,creado_en').single();
    if (error) throw error;
    return json(200, { ok:true, ...data, fotos_subidas:uploaded.length });
  } catch (error) {
    console.error(error);
    return json(500, { ok:false, error:error instanceof Error ? error.message : 'No fue posible recibir la publicación.' });
  }
});
