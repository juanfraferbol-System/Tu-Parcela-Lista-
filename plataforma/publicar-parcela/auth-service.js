import { getSupabaseClient } from './supabase-client.js';

export async function ensureAnonymousSession() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    return session.user;
  }

  console.log("No session found. Signing in anonymously...");
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("Auth error:", error);
    throw new Error("No se pudo establecer sesión segura: " + error.message);
  }
  return data.user;
}