alter table public.moderacion_registros
  drop constraint moderacion_accion_valida,
  add constraint moderacion_accion_valida check (
    accion in (
      'legado','aprobar','solicitar_correcciones','rechazar','revertir_rechazo',
      'reenvio_corredor','confirmar_plan_ia','revocar_plan_ia'
    )
  );

alter table public.publicacion_analisis_visual
  drop constraint publicacion_analisis_visual_estado_valido,
  add constraint publicacion_analisis_visual_estado_valido check (
    estado in ('pendiente_autorizacion','pendiente_analisis','procesando','completado','rechazado','error','revocado')
  );

alter table public.notificacion_cola
  drop constraint notificacion_tipo_valido,
  add constraint notificacion_tipo_valido check (
    tipo in (
      'recepcion','aprobacion','solicitud_correcciones','rechazo','correccion_recibida',
      'plan_ia_activado','plan_ia_revocado'
    )
  );

create or replace function public.crm_estado_plan_ia(p_publicacion_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_publicacion public.publicaciones%rowtype;
  v_entitlement public.publicacion_ia_entitlements%rowtype;
begin
  perform public.crm_exigir_administrador();
  select * into v_publicacion from public.publicaciones p where p.id = p_publicacion_id;
  if not found then raise exception using message = 'CRM_PUBLICATION_NOT_FOUND'; end if;
  select * into v_entitlement from public.publicacion_ia_entitlements e
    where e.publicacion_id = p_publicacion_id
    order by e.emitido_en desc limit 1;
  return jsonb_build_object(
    'plan_solicitado', v_publicacion.plan_seleccionado,
    'plan_contratado', v_publicacion.plan_contratado,
    'tipo_publicador', v_publicacion.tipo_publicador,
    'elegible', v_publicacion.tipo_publicador = 'corredor' and coalesce(v_publicacion.plan_seleccionado,'') in ('gold','platinum'),
    'entitlement_id', v_entitlement.id,
    'entitlement_estado', v_entitlement.estado,
    'entitlement_activo', coalesce(v_entitlement.estado = 'activo', false),
    'emitido_en', v_entitlement.emitido_en,
    'revocado_en', v_entitlement.revocado_en,
    'consentimiento', v_publicacion.analisis_ia_consentimiento
  );
end;
$$;

create or replace function public.crm_gestionar_plan_ia(
  p_publicacion_id uuid,
  p_accion text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_admin uuid := public.crm_exigir_administrador();
  v_publicacion public.publicaciones%rowtype;
  v_entitlement public.publicacion_ia_entitlements%rowtype;
  v_entitlement_id uuid;
  v_plan text;
  v_estado_anterior text := 'sin_entitlement';
  v_estado_nuevo text;
begin
  if p_publicacion_id is null or p_accion not in ('confirmar','revocar') or length(trim(coalesce(p_motivo,''))) < 3 then
    raise exception using message = 'CRM_AI_ACTION_INVALID';
  end if;
  select * into v_publicacion from public.publicaciones p where p.id = p_publicacion_id for update;
  if not found then raise exception using message = 'CRM_PUBLICATION_NOT_FOUND'; end if;
  v_plan := v_publicacion.plan_seleccionado;
  if v_publicacion.tipo_publicador <> 'corredor' or coalesce(v_plan,'') not in ('gold','platinum') then
    raise exception using message = 'CRM_AI_PLAN_NOT_ELIGIBLE';
  end if;
  select * into v_entitlement from public.publicacion_ia_entitlements e
    where e.publicacion_id = p_publicacion_id or e.idempotency_key = v_publicacion.idempotency_key
    order by (e.publicacion_id = p_publicacion_id) desc, e.emitido_en desc limit 1 for update;
  if found then v_estado_anterior := v_entitlement.estado; end if;

  if p_accion = 'confirmar' then
    if found and v_entitlement.estado = 'activo' then raise exception using message = 'CRM_AI_ENTITLEMENT_ALREADY_ACTIVE'; end if;
    v_entitlement_id := public.confirmar_plan_analisis_visual(
      v_publicacion.idempotency_key,
      v_plan,
      'crm_admin_manual:' || v_admin::text
    );
    v_estado_nuevo := 'activo';
    update public.publicaciones p set plan_contratado = v_plan, analisis_ia_incluido = true,
      version_actual = version_actual + 1 where p.id = p_publicacion_id;
  else
    if not found or v_entitlement.estado <> 'activo' then raise exception using message = 'CRM_AI_ENTITLEMENT_NOT_ACTIVE'; end if;
    v_entitlement_id := v_entitlement.id;
    update public.publicacion_ia_entitlements e set estado = 'revocado', revocado_en = now(),
      permite_reanalisis_una_vez = false where e.id = v_entitlement.id;
    update public.publicacion_analisis_visual a set estado = 'revocado', actualizado_en = now()
      where a.publicacion_id = p_publicacion_id and a.estado in ('pendiente_autorizacion','pendiente_analisis','procesando');
    update public.publicaciones p set version_actual = version_actual + 1 where p.id = p_publicacion_id;
    v_estado_nuevo := 'revocado';
  end if;

  insert into public.moderacion_registros (
    publicacion_id, estado_anterior, estado_nuevo, motivo, responsable_id, evidencia,
    accion, administrador_id
  ) values (
    p_publicacion_id, v_publicacion.estado, v_publicacion.estado, trim(p_motivo), v_admin,
    jsonb_build_object(
      'plan', v_plan,
      'entitlement_id', v_entitlement_id,
      'entitlement_estado_anterior', v_estado_anterior,
      'entitlement_estado_nuevo', v_estado_nuevo
    ),
    case when p_accion = 'confirmar' then 'confirmar_plan_ia' else 'revocar_plan_ia' end,
    v_admin
  );
  insert into public.publicacion_versiones (publicacion_id, version, origen, datos, creado_por)
  select p.id, p.version_actual, 'moderacion', to_jsonb(p), v_admin
  from public.publicaciones p where p.id = p_publicacion_id;
  insert into public.notificacion_cola (publicacion_id, tipo, destinatario_email, payload)
  values (
    p_publicacion_id,
    case when p_accion = 'confirmar' then 'plan_ia_activado' else 'plan_ia_revocado' end,
    v_publicacion.contacto_email,
    jsonb_build_object('codigo_publico', v_publicacion.codigo_publico, 'plan', v_plan, 'estado', v_estado_nuevo)
  );
  return jsonb_build_object(
    'publicacion_id', p_publicacion_id,
    'plan', v_plan,
    'entitlement_id', v_entitlement_id,
    'estado_anterior', v_estado_anterior,
    'estado_nuevo', v_estado_nuevo,
    'consentimiento', v_publicacion.analisis_ia_consentimiento
  );
end;
$$;

revoke all on function public.crm_estado_plan_ia(uuid) from public, anon, authenticated;
revoke all on function public.crm_gestionar_plan_ia(uuid,text,text) from public, anon, authenticated;
revoke execute on function public.confirmar_plan_analisis_visual(uuid,text,text) from service_role;
grant execute on function public.crm_estado_plan_ia(uuid) to authenticated;
grant execute on function public.crm_gestionar_plan_ia(uuid,text,text) to authenticated;

-- confirmar_plan_analisis_visual queda ejecutable solo por su propietario y se
-- invoca desde la envoltura SECURITY DEFINER anterior. preparar_analisis_visual
-- y las funciones que completan el análisis continúan limitadas a service_role.
-- El navegador administrativo solo usa la envoltura, que valida auth.uid(),
-- perfil activo y el plan solicitado almacenado en la publicación.
