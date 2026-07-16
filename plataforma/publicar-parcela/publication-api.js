import { getSupabaseClient } from './supabase-client.js';
import { ensureAnonymousSession } from './auth-service.js';

export async function createDraft(draftData) {
  const supabase = getSupabaseClient();
  if (!supabase) return { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36), mock: true }; // Fallback

  const user = await ensureAnonymousSession();
  
  const payload = {
    usuario_id: user.id,
    tipo_publicador: draftData.tipoPublicador || 'dueno',
    estado: 'borrador',
    datos_parcela: draftData.parcela || {},
    datos_publicador: draftData.publicador || {},
    titulo_publico: draftData.titulo_publico || 'Borrador sin título'
  };

  const { data, error } = await supabase
    .from('publicaciones_parcela')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDraft(publicacionId, draftData) {
  const supabase = getSupabaseClient();
  if (!supabase) return { mock: true };

  const payload = {
    datos_parcela: draftData.parcela || {},
    datos_publicador: draftData.publicador || {},
    titulo_publico: draftData.titulo_publico
  };

  const { error } = await supabase
    .from('publicaciones_parcela')
    .update(payload)
    .eq('id', publicacionId)
    .eq('estado', 'borrador');

  if (error) throw error;
  return true;
}

export async function submitForReview(publicacionId) {
  const supabase = getSupabaseClient();
  if (!supabase) return { mock: true, code: 'TPL-MOCK-001' };

  const { data, error } = await supabase
    .from('publicaciones_parcela')
    .update({ 
      estado: 'pendiente_revision', 
      publicacion_enviada_en: new Date().toISOString() 
    })
    .eq('id', publicacionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveImageRecord(publicacionId, imageMeta, orden, esPortada) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const user = await ensureAnonymousSession();
  
  const payload = {
    publicacion_id: publicacionId,
    usuario_id: user.id,
    storage_path: imageMeta.storagePath,
    nombre_original: imageMeta.fileName,
    mime_type: imageMeta.mimeType,
    tamano_bytes: imageMeta.size,
    orden,
    es_portada: esPortada
  };

  const { error } = await supabase.from('publicacion_imagenes').insert([payload]);
  if (error) throw error;
}