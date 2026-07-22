(function (global) {
  'use strict';

  const config = Object.freeze({
    supabaseUrl: 'https://qxavbqhyqaqalpzbhwmh.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXZicWh5cWFxYWxwemJod21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA',
    officialPath: '/plataforma/crm/',
    projectRef: 'qxavbqhyqaqalpzbhwmh',
    storageKey: 'sb-qxavbqhyqaqalpzbhwmh-auth-token'
  });

  global.TPL_CRM_CONFIG = config;

  global.TPL_getSupabaseClient = function TPL_getSupabaseClient() {
    const existing = global.tplSupabase || global.tplCrmSupabase;
    if (existing) {
      global.tplSupabase = existing;
      global.tplCrmSupabase = existing;
      return existing;
    }

    if (!global.supabase?.createClient) return null;

    const client = global.supabase.createClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storageKey: config.storageKey
        },
        global: {
          headers: { 'X-Client-Info': 'tu-parcela-lista-crm' }
        }
      }
    );

    global.tplSupabase = client;
    global.tplCrmSupabase = client;
    return client;
  };
})(window);
