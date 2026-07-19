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
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { ok:false, error:'Método no permitido.' });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return json(500, { ok:false, error:'Configuración del servidor incompleta.' });
    const supabase = createClient(url, serviceKey, { auth:{ persistSession:false } });
    const form = await req.formData();
    const payload = JSON.parse(clean(form.get('payload')) || '{}');
    const tipo = clean(payload.tipo);
    if (!['casa','parcela'].includes(tipo)) return json(400, { ok:false, error:'Debes elegir Casa o Parcela.' });

    const required = ['titulo','descripcionFinal','region','comuna','precio','nombre','telefono','correo'];
    for (const field of required) if (!clean(payload[field])) return json(400, { ok:false, error:`Falta completar: ${field}.` });

    const codigo = clean(payload.codigo_temporal) || `TPL-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
    const files = form.getAll('photos').filter((x): x is File => x instanceof File);
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
      tipo,
      titulo: clean(payload.titulo),
      descripcion: clean(payload.descripcionFinal),
      region: clean(payload.region),
      comuna: clean(payload.comuna),
      localidad: clean(payload.localidad) || null,
      precio: Number(payload.precio) || 0,
      superficie_terreno_m2: tipo === 'parcela' ? numberOrNull(payload.superficie) : null,
      superficie_construida_m2: tipo === 'casa' ? numberOrNull(payload.casaSuperficie) : null,
      habitaciones: tipo === 'casa' ? numberOrNull(payload.habitaciones) : null,
      banos: tipo === 'casa' ? numberOrNull(payload.banos) : null,
      material: tipo === 'casa' ? clean(payload.material) || null : null,
      rol: tipo === 'parcela' ? clean(payload.rol) || null : null,
      agua: tipo === 'parcela' ? clean(payload.agua) || null : null,
      luz: tipo === 'parcela' ? clean(payload.luz) || null : null,
      urgencia: clean(payload.urgencia) || null,
      estado_propiedad: clean(payload.estadoPropiedad) || null,
      nombre_contacto: clean(payload.nombre),
      telefono_contacto: clean(payload.telefono),
      correo_contacto: clean(payload.correo).toLowerCase(),
      tipo_publicador: clean(payload.publicador) || null,
      fotos: uploaded,
      cotizacion: payload.cotizacion || {},
      plan_publicacion: clean(payload.cotizacion?.plan) || 'inicio',
      tasacion: payload.tasacion || {},
      latitud_privada: numberOrNull(payload.ubicacion?.lat),
      longitud_privada: numberOrNull(payload.ubicacion?.lng),
      ubicacion_fuente: clean(payload.ubicacion?.source) || null,
      ubicacion_publica_aproximada: payload.ubicacion?.publica_aproximada !== false,
      payload_original: payload
    };

    const { data, error } = await supabase.from('publicaciones_unificadas').insert(row).select('id,codigo_publico,creado_en').single();
    if (error) throw error;
    return json(200, { ok:true, ...data, fotos_subidas:uploaded.length });
  } catch (error) {
    console.error(error);
    return json(500, { ok:false, error:error instanceof Error ? error.message : 'No fue posible recibir la publicación.' });
  }
});
