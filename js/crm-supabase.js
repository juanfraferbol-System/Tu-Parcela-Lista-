let crmClient = globalThis.tplSupabase || globalThis.tplCrmSupabase || null;

export function getCrmSupabaseClient(options = {}) {
  if (globalThis.tplSupabase || globalThis.tplCrmSupabase) {
    crmClient = globalThis.tplSupabase || globalThis.tplCrmSupabase;
    globalThis.tplSupabase = crmClient;
    globalThis.tplCrmSupabase = crmClient;
    return crmClient;
  }

  if (typeof globalThis.TPL_getSupabaseClient === 'function') {
    crmClient = globalThis.TPL_getSupabaseClient();
    return crmClient;
  }

  if (crmClient) return crmClient;

  const config = options.config || globalThis.TPL_CRM_CONFIG || {};
  const url = config.supabaseUrl || config.url;
  const anonKey = config.supabaseAnonKey || config.anonKey;
  const factory = options.createClient || globalThis.supabase?.createClient;

  if (!url || !anonKey || typeof factory !== 'function') return null;

  crmClient = factory(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: config.storageKey || 'sb-qxavbqhyqaqalpzbhwmh-auth-token'
    },
    global: { headers: { 'X-Client-Info': 'tu-parcela-lista-crm-module' } }
  });

  globalThis.tplSupabase = crmClient;
  globalThis.tplCrmSupabase = crmClient;
  return crmClient;
}

export function resetCrmSupabaseClient() {
  crmClient = null;
}
