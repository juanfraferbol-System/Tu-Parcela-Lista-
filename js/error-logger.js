// js/error-logger.js
// Sistema centralizado de manejo de errores

window.TplErrorLogger = {
  /**
   * Registra un error en el sistema.
   * @param {string} modulo - Ej: 'Cotizador', 'Publicar Parcela'
   * @param {string} accion - Ej: 'Guardar Lead', 'Subir Imagen'
   * @param {string} tipo - Ej: 'Error de Red', 'Validación'
   * @param {string} mensajeTecnico - Mensaje original del catch
   * @param {object} contexto - Datos seguros (sin claves)
   * @param {string} prioridad - 'baja', 'media', 'alta', 'crítico'
   */
  log: async function(modulo, accion, tipo, mensajeTecnico, contexto = null, prioridad = 'media') {
    const errorData = {
      modulo,
      accion,
      tipo,
      mensaje_tecnico: typeof mensajeTecnico === 'object' ? JSON.stringify(mensajeTecnico) : String(mensajeTecnico),
      contexto: contexto || {},
      estado: 'pendiente',
      prioridad,
      fecha: new Date().toISOString()
    };

    console.error(`[TPL ERROR - ${modulo}] ${accion}:`, mensajeTecnico);

    // Intentar guardar en Supabase si está disponible
    if (window.supabase) {
      try {
        // Asume que existe una tabla 'sistema_logs'
        await window.supabase.from('sistema_logs').insert([errorData]);
      } catch (err) {
        // Fallback silencioso si no existe la tabla
        console.warn("No se pudo guardar el log en Supabase.", err);
      }
    } else {
      // Guardar localmente como fallback para desarrollo
      const logs = JSON.parse(localStorage.getItem('tpl_error_logs') || '[]');
      logs.push(errorData);
      localStorage.setItem('tpl_error_logs', JSON.stringify(logs.slice(-50)));
    }
  },

  /**
   * Muestra un mensaje amigable al usuario ocultando el detalle técnico
   */
  showUserMessage: function(userMessage = "No pudimos completar la acción. Revisa tu conexión e inténtalo nuevamente.") {
    // Si existe una función global de toast/alerta, usarla
    if (window.showToast) {
      window.showToast(userMessage, 'error');
    } else {
      alert(userMessage);
    }
  }
};
