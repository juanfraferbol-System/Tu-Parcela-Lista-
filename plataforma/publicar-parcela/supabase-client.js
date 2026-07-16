import { supabaseConfig } from './supabase-config.js';
// Utilizamos la versión de CDN global @supabase/supabase-js@2 inyectada en HTML
let supabaseInstance = null;

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;
  if (!window.supabase) {
    console.warn('Supabase JS library not loaded. Falling back to mock.');
    return null;
  }
  supabaseInstance = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return supabaseInstance;
}