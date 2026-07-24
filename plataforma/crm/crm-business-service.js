(function (window) {
  'use strict';

  function getClient() {
    const client = window.TPL_getSupabaseClient?.()
      || window.tplSupabase
      || window.tplCrmSupabase;
    if (!client) throw new Error('El cliente de Supabase no está disponible.');
    return client;
  }

  function assertOk(result, fallback) {
    if (result?.error) {
      const error = new Error(result.error.message || fallback);
      error.cause = result.error;
      throw error;
    }
    return result?.data;
  }

  function code(prefix, name) {
    const slug = String(name || 'registro')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 42) || 'registro';
    const suffix = Date.now().toString(36).slice(-6);
    return `${prefix}-${slug}-${suffix}`;
  }

  async function requireAdmin() {
    const client = getClient();
    const sessionResult = await client.auth.getSession();
    const session = assertOk(sessionResult, 'No fue posible validar la sesión.');
    if (!session?.session?.user) throw new Error('Debes iniciar sesión en el CRM.');

    const adminResult = await client.rpc('es_administrador_activo');
    const isAdmin = assertOk(adminResult, 'No fue posible validar los permisos administrativos.');
    if (!isAdmin) throw new Error('Esta sección requiere una cuenta administradora.');
    return session.session.user;
  }

  async function loadPanel() {
    const client = getClient();
    await requireAdmin();

    const [
      accountsResult,
      projectsResult,
      landingsResult,
      requestsResult,
      modulesResult,
      plansResult,
      projectModulesResult,
      opportunitiesResult,
      visitsResult
    ] = await Promise.all([
      client.from('tpl_business_cuentas')
        .select('id,codigo,nombre,estado,creado_en,actualizado_en')
        .order('actualizado_en', { ascending: false }),
      client.from('tpl_proyectos_comerciales')
        .select('id,codigo,cuenta_id,nombre,objetivo,propiedad_codigo,estado,creado_en,actualizado_en')
        .order('actualizado_en', { ascending: false }),
      client.from('tpl_landings_comerciales')
        .select('id,codigo,proyecto_comercial_id,slug,estado,publicado_en,actualizado_en')
        .order('actualizado_en', { ascending: false }),
      client.from('tpl_solicitudes_comerciales')
        .select('id,usuario_id,cuenta_id,proyecto_id,plan_id,modulo_codigo,recomendacion,tipo,mensaje,estado,gestionado_por,gestionado_en,creado_en,actualizado_en')
        .order('creado_en', { ascending: false })
        .limit(200),
      client.from('tpl_business_modulos_catalogo')
        .select('codigo,nombre,grupo,estado')
        .eq('estado', 'activo'),
      client.from('planes_comerciales')
        .select('id,nombre,estado,visible_tpl_business')
        .eq('estado', 'activo'),
      client.from('tpl_proyecto_modulos')
        .select('proyecto_id,modulo_codigo,estado'),
      client.from('crm_oportunidades')
        .select('id,proyecto_comercial_id,estado,etapa'),
      client.from('visitas')
        .select('id,proyecto_comercial_id,estado')
        .not('proyecto_comercial_id', 'is', null)
    ]);

    const accounts = assertOk(accountsResult, 'No fue posible cargar las cuentas.') || [];
    const projects = assertOk(projectsResult, 'No fue posible cargar los proyectos.') || [];
    const landings = assertOk(landingsResult, 'No fue posible cargar las landings.') || [];
    const requests = assertOk(requestsResult, 'No fue posible cargar las solicitudes.') || [];
    const modules = assertOk(modulesResult, 'No fue posible cargar los módulos.') || [];
    const plans = assertOk(plansResult, 'No fue posible cargar los planes.') || [];
    const projectModules = assertOk(projectModulesResult, 'No fue posible cargar el estado de módulos.') || [];
    const opportunities = assertOk(opportunitiesResult, 'No fue posible cargar las oportunidades.') || [];
    const visits = assertOk(visitsResult, 'No fue posible cargar las visitas.') || [];

    return {
      accounts,
      projects,
      landings,
      requests,
      modules,
      plans,
      projectModules,
      opportunities,
      visits
    };
  }

  async function saveAccount(input) {
    const client = getClient();
    await requireAdmin();
    const payload = {
      nombre: String(input.name || '').trim().slice(0, 160),
      estado: String(input.status || 'activo')
    };
    if (!payload.nombre) throw new Error('El nombre de la cuenta es obligatorio.');

    if (input.id) {
      const result = await client.from('tpl_business_cuentas')
        .update(payload)
        .eq('id', input.id)
        .select('id,codigo')
        .single();
      return assertOk(result, 'No fue posible actualizar la cuenta.');
    }

    const result = await client.from('tpl_business_cuentas')
      .insert({ ...payload, codigo: code('cli', payload.nombre) })
      .select('id,codigo')
      .single();
    return assertOk(result, 'No fue posible crear la cuenta.');
  }

  async function saveProject(input) {
    const client = getClient();
    await requireAdmin();
    const payload = {
      cuenta_id: input.accountId,
      nombre: String(input.name || '').trim().slice(0, 180),
      objetivo: String(input.objective || '').trim().slice(0, 600) || null,
      propiedad_codigo: String(input.propertyCode || '').trim().slice(0, 120) || null,
      estado: String(input.status || 'preparacion')
    };
    if (!payload.cuenta_id || !payload.nombre) {
      throw new Error('La cuenta y el nombre del proyecto son obligatorios.');
    }

    if (input.id) {
      const result = await client.from('tpl_proyectos_comerciales')
        .update(payload)
        .eq('id', input.id)
        .select('id,codigo')
        .single();
      return assertOk(result, 'No fue posible actualizar el proyecto.');
    }

    const result = await client.from('tpl_proyectos_comerciales')
      .insert({ ...payload, codigo: code('pro', payload.nombre) })
      .select('id,codigo')
      .single();
    return assertOk(result, 'No fue posible crear el proyecto.');
  }

  async function archiveAccount(id) {
    return saveAccountStatus(id, 'cerrado');
  }

  async function saveAccountStatus(id, status) {
    const client = getClient();
    await requireAdmin();
    const result = await client.from('tpl_business_cuentas')
      .update({ estado: status })
      .eq('id', id)
      .select('id')
      .single();
    return assertOk(result, 'No fue posible actualizar la cuenta.');
  }

  async function archiveProject(id) {
    const client = getClient();
    await requireAdmin();
    const result = await client.from('tpl_proyectos_comerciales')
      .update({ estado: 'cerrado' })
      .eq('id', id)
      .select('id')
      .single();
    return assertOk(result, 'No fue posible archivar el proyecto.');
  }

  async function updateRequest(id, status) {
    const client = getClient();
    const user = await requireAdmin();
    const allowed = ['solicitada', 'contactando', 'aprobada', 'activada', 'rechazada'];
    if (!allowed.includes(status)) throw new Error('Estado de solicitud inválido.');
    const result = await client.from('tpl_solicitudes_comerciales')
      .update({
        estado: status,
        gestionado_por: user.id,
        gestionado_en: new Date().toISOString()
      })
      .eq('id', id)
      .select('id,estado')
      .single();
    return assertOk(result, 'No fue posible actualizar la solicitud.');
  }

  window.TPLBusinessAdminService = Object.freeze({
    loadPanel,
    saveAccount,
    saveProject,
    archiveAccount,
    archiveProject,
    updateRequest
  });
})(window);
