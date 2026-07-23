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
const isUuid = (value:string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function sha256Hex(file:File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function normalizePlan(value:unknown) {
  const plan = clean(value).toLowerCase();
  const mapping:Record<string,string> = {
    prop_base: 'inicio',
    prop_impulso: 'profesional',
    prop_fuerte: 'gold',
    prop_agresivo: 'platinum',
    corr_canje: 'inicio',
    corr_impulso: 'profesional',
    corr_profesional: 'gold',
    corr_elite: 'platinum',
    inicio: 'inicio',
    profesional: 'profesional',
    gold: 'gold',
    platinum: 'platinum'
  };
  return { original: plan || 'prop_base', crm: mapping[plan] || 'inicio' };
}

function normalizePublisher(value:unknown) {
  const type = clean(value).toLowerCase();
  return type === 'corredor' ? 'corredor' : 'dueno';
}

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
    publicador: normalizePublisher(pick(payload.publicador, contact.tipo, form.anunciante)),
    plan: normalizePlan(pick(payload.plan_publicacion, plan.id, form.planSeleccionado)),
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

  const uploadedPaths:string[] = [];
  let createdPublicationId:string | null = null;
  let supabase:any = null;

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return json(500, { ok:false, error:'Configuración del servidor incompleta.' });

    supabase = createClient(url, serviceKey, { auth:{ persistSession:false } });
    const formData = await req.formData();
    const originalPayload = JSON.parse(clean(formData.get('payload')) || '{}');
    const payload = normalizePayload(originalPayload);
    const incomingIdempotency = clean(formData.get('idempotency_key'));
    const idempotencyKey = isUuid(incomingIdempotency) ? incomingIdempotency : crypto.randomUUID();
    const coverIndexRaw = Number(clean(formData.get('cover_index')) || originalPayload.medios?.portadaIndice || 0);
    const coverIndex = Number.isInteger(coverIndexRaw) && coverIndexRaw >= 0 ? coverIndexRaw : 0;

    const { data: existing } = await supabase
      .from('publicaciones')
      .select('id,codigo_publico,creado_en')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existing) return json(200, { ok:true, ...existing, duplicate_prevented:true });

    if (!['casa','parcela','parcela_con_casa'].includes(payload.tipo)) return json(400, { ok:false, error:'Debes elegir Casa, Parcela o Parcela con casa.' });
    const required:Array<[string, unknown]> = [
      ['título', payload.titulo], ['descripción', payload.descripcion], ['región', payload.region],
      ['comuna', payload.comuna], ['precio', payload.precio], ['nombre', payload.nombre],
      ['teléfono', payload.telefono], ['correo', payload.correo]
    ];
    for (const [label, value] of required) if (!clean(value)) return json(400, { ok:false, error:`Falta completar: ${label}.` });

    const codigoRecibido = String(payload.codigo || '').trim();
    const codigoValido = /^TPL-(?:PUB-)?[0-9]{4}-[0-9]{6}$/.test(codigoRecibido);
    const numeroAleatorio = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    const codigo = codigoValido ? codigoRecibido : `TPL-PUB-${new Date().getUTCFullYear()}-${numeroAleatorio}`;

    const files = formData.getAll('photos').filter((x): x is File => x instanceof File);
    if (!files.length) return json(400, { ok:false, error:'Debes agregar al menos una fotografía.' });
    if (files.length > 12) return json(400, { ok:false, error:'Puedes subir hasta 12 fotografías.' });
    for (const file of files) {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return json(400,{ok:false,error:`Formato no permitido: ${file.name}`});
      if (file.size > 12*1024*1024) return json(400,{ok:false,error:`La foto ${file.name} supera 12 MB.`});
    }

    const row = {
      codigo_publico: codigo,
      idempotency_key: idempotencyKey,
      estado: 'pendiente_revision',
      tipo_publicador: payload.publicador,
      contacto_nombre: payload.nombre,
      contacto_email: payload.correo,
      contacto_telefono: payload.telefono || null,
      contacto_organizacion: payload.publicador === 'corredor'
        ? clean(originalPayload.contacto?.empresa || originalPayload.formulario?.empresa) || null
        : null,
      titulo_publico: payload.titulo,
      descripcion_publica: payload.descripcion,
      descripcion_origen_privada: originalPayload.propiedad?.descripcionTecnica || originalPayload.propiedad?.descripcion || payload.descripcion || null,
      precio_publicacion: payload.precio || null,
      monto_liquido: payload.precio || null,
      superficie_m2: payload.tipo === 'casa'
        ? (payload.superficieConstruida || payload.superficieTerreno || null)
        : (payload.superficieTerreno || null),
      region: payload.region,
      comuna: payload.comuna,
      sector: payload.localidad || 'Sin especificar',
      ubicacion_publica_aproximada: payload.ubicacion.publica_aproximada ? 'aproximada' : 'privada',
      latitud_privada: payload.ubicacion.lat,
      longitud_privada: payload.ubicacion.lng,
      rol: payload.rol || null,
      agua: payload.agua || null,
      luz: payload.luz || null,
      acceso: clean(originalPayload.terreno?.acceso || originalPayload.formulario?.acceso) || null,
      topografia: clean(originalPayload.terreno?.topografia || originalPayload.formulario?.topografia) || null,
      naturaleza: Array.isArray(originalPayload.terreno?.naturaleza) ? originalPayload.terreno.naturaleza : [],
      cuerpos_agua: Array.isArray(originalPayload.terreno?.cuerposAgua) ? originalPayload.terreno.cuerposAgua : [],
      servicios: Array.isArray(originalPayload.servicios?.seleccionados) ? originalPayload.servicios.seleccionados : [],
      ciudad_principal: clean(originalPayload.formulario?.ciudadPrincipal) || null,
      distancia_ciudad: clean(originalPayload.formulario?.distanciaCiudad) || null,
      facilidad_pago: Boolean(originalPayload.comercial?.facilidadPago),
      detalle_facilidad_pago: clean(originalPayload.comercial?.detalleFacilidadPago) || null,
      plan_seleccionado: payload.plan.crm,
      modelo_comercial: originalPayload.comercial || {},
      datos_formulario: {
        ...originalPayload,
        tipo: payload.tipo,
        superficie_terreno_m2: payload.superficieTerreno || null,
        superficie_construida_m2: payload.superficieConstruida || null,
        habitaciones: payload.habitaciones || null,
        banos: payload.banos || null,
        material: payload.material || null,
        tipo_publicador_normalizado: payload.publicador,
        plan_original: payload.plan.original,
        plan_crm: payload.plan.crm,
        imagen_principal: null,
        imagenes: [],
        tasacion: payload.tasacion || {},
        ubicacion_fuente: payload.ubicacion.source || null,
        distancia_ruta_principal_km: payload.distanciaRutaPrincipalKm || null
      },
      plan_contratado: payload.plan.crm,
      analisis_ia_incluido: false,
      analisis_ia_consentimiento: false,
      version_actual: 1,
      tipo_precio_actual: 'precio_publicado_solicitado',
      precio_propietario_solicitado: payload.precio || null,
      precio_publico: payload.precio || null,
      consentimiento_uso_ubicacion: Boolean(payload.ubicacion.lat && payload.ubicacion.lng),
      consentimiento_uso_ubicacion_en: payload.ubicacion.lat && payload.ubicacion.lng ? new Date().toISOString() : null,
      distancia_ruta_principal_km: payload.distanciaRutaPrincipalKm || null
    };

    const { data: publication, error: publicationError } = await supabase
      .from('publicaciones')
      .insert(row)
      .select('id,codigo_publico,creado_en')
      .single();
    if (publicationError) throw publicationError;
    createdPublicationId = publication.id;

    const photoRows:any[] = [];
    const uploadedUrls:string[] = [];
    for (let i=0;i<files.length;i++) {
      const file = files[i];
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
      const photoId = crypto.randomUUID();
      const path = `${publication.id}/${photoId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('publicaciones-pendientes')
        .upload(path, file, { contentType:file.type, upsert:false });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      photoRows.push({
        id: photoId,
        publicacion_id: publication.id,
        bucket_id: 'publicaciones-pendientes',
        storage_path: path,
        nombre_original: clean(file.name) || `foto-${i+1}.${ext}`,
        mime_type: file.type,
        tamano_bytes: file.size,
        contenido_sha256: await sha256Hex(file),
        orden: i,
        es_portada: i === Math.min(coverIndex, files.length - 1)
      });
      uploadedUrls.push(path);
    }

    const { error: photosError } = await supabase.from('publicacion_fotos').insert(photoRows);
    if (photosError) throw photosError;

    const coverPhoto = photoRows.find(photo => photo.es_portada) || photoRows[0];
    const { error: updateError } = await supabase
      .from('publicaciones')
      .update({
        datos_formulario: {
          ...row.datos_formulario,
          imagen_principal: coverPhoto?.storage_path || null,
          imagenes: uploadedUrls,
          bucket_imagenes: 'publicaciones-pendientes'
        }
      })
      .eq('id', publication.id);
    if (updateError) throw updateError;

    return json(200, { ok:true, ...publication, fotos_subidas:photoRows.length, duplicate_prevented:false });
  } catch (error) {
    console.error(error);
    if (supabase && uploadedPaths.length) {
      try { await supabase.storage.from('publicaciones-pendientes').remove(uploadedPaths); } catch {}
    }
    if (supabase && createdPublicationId) {
      try { await supabase.from('notificacion_cola').delete().eq('publicacion_id', createdPublicationId); } catch {}
      try { await supabase.from('publicacion_versiones').delete().eq('publicacion_id', createdPublicationId); } catch {}
      try { await supabase.from('publicaciones').delete().eq('id', createdPublicationId); } catch {}
    }
    return json(500, { ok:false, error:error instanceof Error ? error.message : 'No fue posible recibir la publicación.' });
  }
});
