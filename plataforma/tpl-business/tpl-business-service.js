(function (window) {
  'use strict';

  function client() {
    return window.TPLBusinessAuth.getClient();
  }

  function readableError(error, fallback) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (message.includes('email not confirmed')) return 'Confirma tu correo antes de ingresar.';
    if (message.includes('sesión requerida') || message.includes('jwt')) return 'Tu sesión venció. Ingresa nuevamente.';
    if (message.includes('no tienes acceso')) return 'No tienes acceso a este proyecto.';
    if (message.includes('acceso administrativo')) return 'Esta vista requiere una cuenta administradora.';
    return fallback || 'No fue posible completar la operación.';
  }

  async function rpc(name, params, fallback) {
    const { data, error } = await client().rpc(name, params || {});
    if (error) {
      const normalized = new Error(readableError(error, fallback));
      normalized.cause = error;
      throw normalized;
    }
    return data;
  }

  function sanitizeLocalUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(String(value), window.location.origin);
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/')) return '';
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return '';
    }
  }

  async function getPortalSession() {
    return rpc('tpl_business_sesion_actual', {}, 'No fue posible validar tu cuenta.');
  }

  async function getProject(projectCode, adminPreview) {
    const safeCode = String(projectCode || '').trim().slice(0, 120) || null;
    if (adminPreview) {
      return rpc(
        'tpl_business_vista_cliente_admin',
        { p_proyecto_codigo: safeCode },
        'No fue posible abrir la vista administrativa.'
      );
    }
    return rpc(
      'tpl_business_proyecto_actual',
      { p_proyecto_codigo: safeCode },
      'No fue posible cargar tu proyecto.'
    );
  }

  async function requestActivation(input) {
    return rpc('tpl_business_registrar_solicitud', {
      p_proyecto_codigo: String(input.projectCode || '').trim().slice(0, 120),
      p_tipo: String(input.type || '').trim(),
      p_plan_id: input.planId || null,
      p_modulo_codigo: input.moduleCode || null,
      p_recomendacion: input.recommendation || null,
      p_mensaje: input.message || null
    }, 'No fue posible registrar tu solicitud.');
  }

  async function logLogout() {
    return rpc('tpl_business_registrar_cierre_sesion', {}, 'No fue posible registrar el cierre de sesión.');
  }

  window.TPLBusinessService = Object.freeze({
    readableError,
    sanitizeLocalUrl,
    getPortalSession,
    getProject,
    requestActivation,
    logLogout
  });
})(window);
