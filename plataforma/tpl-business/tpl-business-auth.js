(function (window) {
  'use strict';

  const config = window.tplBusiness?.infrastructure;
  let client = null;

  function getClient() {
    if (client) return client;
    if (!config?.supabaseUrl || !config?.supabaseAnonKey || !window.supabase?.createClient) {
      throw new Error('TPL Business no pudo inicializar la conexión segura.');
    }

    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: config.storageKey
      },
      global: {
        headers: { 'X-Client-Info': config.clientInfo }
      }
    });

    return client;
  }

  async function getSession() {
    const { data, error } = await getClient().auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function signIn(email, password) {
    const { data, error } = await getClient().auth.signInWithPassword({
      email: String(email || '').trim(),
      password: String(password || '')
    });
    if (error) throw error;
    return data.session || null;
  }

  async function requestRecovery(email) {
    const redirectTo = new URL(config.portalPath, window.location.origin);
    redirectTo.searchParams.set('mode', 'recovery');
    const { error } = await getClient().auth.resetPasswordForEmail(
      String(email || '').trim(),
      { redirectTo: redirectTo.toString() }
    );
    if (error) throw error;
  }

  async function updatePassword(password) {
    const { data, error } = await getClient().auth.updateUser({
      password: String(password || '')
    });
    if (error) throw error;
    return data.user;
  }

  async function signOut() {
    const { error } = await getClient().auth.signOut();
    if (error) throw error;
  }

  function onAuthStateChange(callback) {
    return getClient().auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  window.TPLBusinessAuth = Object.freeze({
    getClient,
    getSession,
    signIn,
    requestRecovery,
    updatePassword,
    signOut,
    onAuthStateChange
  });
})(window);
