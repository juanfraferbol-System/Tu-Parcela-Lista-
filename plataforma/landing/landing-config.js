(() => {
  'use strict';

  function client() {
    if (window.tplSupabase) return window.tplSupabase;
    if (window.tplCrmSupabase) return window.tplCrmSupabase;
    const config = window.TPL_SUPABASE_CONFIG || {};
    const url = config.url || config.supabaseUrl;
    const key = config.anonKey || config.supabaseAnonKey;
    if (!window.supabase?.createClient || !url || !key) return null;
    window.tplSupabase = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sb-qxavbqhyqaqalpzbhwmh-auth-token'
      }
    });
    return window.tplSupabase;
  }

  async function rpc(name, params) {
    const supabase = client();
    if (!supabase) throw new Error('No se pudo iniciar la conexión con Supabase.');
    const { data, error } = await supabase.rpc(name, params);
    if (error) {
      const failure = new Error(error.message || 'Error de Supabase.');
      failure.code = error.code || '';
      throw failure;
    }
    return data;
  }

  const repository = {
    async listAdmin() {
      return rpc('tpl_listar_landings_admin', {});
    },

    async getPublished(identifier) {
      const result = await rpc('tpl_obtener_landing_publica', {
        p_identificador: String(identifier || '').trim()
      });
      if (!result?.config) return null;
      return {
        ...result.config,
        status: result.status,
        version: result.version,
        updatedAt: result.updatedAt,
        publishedAt: result.publishedAt
      };
    },

    async getAdmin(identifier) {
      return rpc('tpl_obtener_landing_admin', {
        p_identificador: String(identifier || '').trim()
      });
    },

    async saveDraft(code, configuration) {
      return rpc('tpl_guardar_borrador_landing', {
        p_landing_codigo: String(code || '').trim(),
        p_configuracion: configuration
      });
    },

    async publish(code) {
      return rpc('tpl_publicar_landing', {
        p_landing_codigo: String(code || '').trim()
      });
    }
  };

  window.TPLLandingRepository = Object.freeze(repository);
  window.TPL_getPublicLanding = (identifier) => repository.getPublished(identifier);
})();
