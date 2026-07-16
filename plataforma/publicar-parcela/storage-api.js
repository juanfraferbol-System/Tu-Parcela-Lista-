import { getSupabaseClient } from './supabase-client.js';
import { ensureAnonymousSession } from './auth-service.js';

const BUCKET_NAME = 'publicaciones-parcela';

export async function uploadImage(file, onProgress) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase no configurado");
  
  const user = await ensureAnonymousSession();
  if (!user) throw new Error("Sin sesión de usuario");

  const ext = file.name.split('.').pop();
  const fileName = crypto.randomUUID() + '.' + ext;
  const storagePath = user.id + '/' + fileName;

  // Supabase JS v2 no tiene onProgress nativo para uploads de forma sencilla, 
  // pero lo emulamos si es necesario o usamos XHR para progreso real.
  // Por simplicidad, usamos la API estándar.
  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) throw error;
  return { storagePath, fileName: file.name, mimeType: file.type, size: file.size };
}

export async function deleteImage(storagePath) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
}