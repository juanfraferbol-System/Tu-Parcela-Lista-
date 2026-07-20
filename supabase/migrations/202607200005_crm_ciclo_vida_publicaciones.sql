create or replace function public.crm_contadores_publicaciones()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  perform public.crm_exigir_administrador();
  return jsonb_build_object(
    'pendientes', (select count(*) from public.publicaciones p where p.estado = 'pendiente_revision'),
    'requieren_correccion', (select count(*) from public.publicaciones p where p.estado = 'requiere_cambios'),
    'aprobadas', (select count(*) from public.publicaciones p where p.estado = 'aprobada'),
    'rechazadas', (select count(*) from public.publicaciones p where p.estado = 'rechazada'),
    'pausadas', (select count(*) from public.publicaciones p where p.estado = 'pausada'),
    'vendidas', (select count(*) from public.publicaciones p where p.estado = 'vendida'),
    'archivadas', (select count(*) from public.publicaciones p where p.estado = 'archivada')
  );
end;
$$;

create or replace function public.crm_listar_publicaciones(
  p_estado text default null,
  p_desde date default null,
  p_hasta date default null,
  p_corredor text default null,
  p_comuna text default null,
  p_plan text default null
)
returns table (
  id uuid,
  codigo_publico text,
  estado text,
  corredor text,
  propiedad text,
  comuna text,
  plan text,
  creado_en timestamptz,
  actualizado_en timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  perform public.crm_exigir_administrador();
  if p_estado is not null and p_estado not in (
    'pendiente_revision','requiere_cambios','aprobada','rechazada','pausada','vendida','archivada'
  ) then
    raise exception using message = 'CRM_FILTER_INVALID';
  end if;

  return query
  select p.id, p.codigo_publico, p.estado::text,
    coalesce(p.contacto_organizacion, p.contacto_nombre),
    p.titulo_publico, p.comuna, coalesce(p.plan_contratado, p.plan_seleccionado),
    p.creado_en, p.actualizado_en
  from public.publicaciones p
  where (p_estado is null or p.estado::text = p_estado)
    and (p_desde is null or p.creado_en >= p_desde::timestamptz)
    and (p_hasta is null or p.creado_en < (p_hasta + 1)::timestamptz)
    and (p_corredor is null or coalesce(p.contacto_organizacion, p.contacto_nombre) ilike '%' || p_corredor || '%')
    and (p_comuna is null or p.comuna = p_comuna)
    and (p_plan is null or coalesce(p.plan_contratado, p.plan_seleccionado) = p_plan)
  order by
    case when p.estado = 'pendiente_revision' then 0
         when p.estado = 'requiere_cambios' then 1
         when p.estado = 'aprobada' then 2
         else 3 end,
    case when p.estado = 'pendiente_revision' then p.creado_en end asc,
    p.actualizado_en desc
  limit 500;
end;
$$;

create or replace function public.crm_moderar_publicacion(
  p_publicacion_id uuid,
  p_accion text,
  p_motivo text default null,
  p_categoria text default null,
  p_campos_correccion text[] default '{}',
  p_mensaje text default null,
  p_confirmar boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_admin uuid := public.crm_exigir_administrador();
  v_publicacion public.publicaciones%rowtype;
  v_anterior public.publicacion_estado;
  v_nuevo public.publicacion_estado;
  v_token text;
  v_token_hash text;
  v_acceso_id uuid;
  v_campos_validos constant text[] := array[
    'contacto_nombre','contacto_email','contacto_telefono','contacto_organizacion',
    'titulo_publico','descripcion_publica','precio_publicacion','superficie_m2',
    'region','comuna','sector','rol','agua','luz','acceso','topografia',
    'ciudad_principal','distancia_ciudad','facilidad_pago','detalle_facilidad_pago'
  ];
begin
  if p_publicacion_id is null or p_accion is null then raise exception using message = 'CRM_DECISION_INVALID'; end if;
  select * into v_publicacion from public.publicaciones p where p.id = p_publicacion_id for update;
  if not found then raise exception using message = 'CRM_PUBLICATION_NOT_FOUND'; end if;
  v_anterior := v_publicacion.estado;

  if p_accion = 'aprobar' then
    if not p_confirmar then raise exception using message = 'CRM_APPROVAL_CONFIRMATION_REQUIRED'; end if;
    if v_anterior <> 'pendiente_revision' then raise exception using message = 'CRM_STATE_TRANSITION_INVALID'; end if;
    v_nuevo := 'aprobada';
    update public.publicaciones p set estado = v_nuevo, publicada_en = now(), moderada_en = now(),
      moderada_por = v_admin, version_actual = version_actual + 1 where p.id = p_publicacion_id;
  elsif p_accion = 'solicitar_correcciones' then
    if v_anterior <> 'pendiente_revision' then raise exception using message = 'CRM_STATE_TRANSITION_INVALID'; end if;
    if length(trim(coalesce(p_motivo,''))) < 3 then raise exception using message = 'CRM_REASON_REQUIRED'; end if;
    if cardinality(coalesce(p_campos_correccion,'{}')) = 0 or not coalesce(p_campos_correccion,'{}') <@ v_campos_validos then
      raise exception using message = 'CRM_CORRECTION_FIELDS_INVALID';
    end if;
    if (select count(distinct campo) from unnest(p_campos_correccion) campo) <> cardinality(p_campos_correccion) then
      raise exception using message = 'CRM_CORRECTION_FIELDS_DUPLICATED';
    end if;
    v_nuevo := 'requiere_cambios';
    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
    update public.publicacion_correccion_accesos a set revocado_en = now()
      where a.publicacion_id = p_publicacion_id and a.utilizado_en is null and a.revocado_en is null;
    insert into public.publicacion_correccion_accesos (
      publicacion_id, token_hash, campos_permitidos, creado_por, expira_en
    ) values (
      p_publicacion_id, v_token_hash, p_campos_correccion, v_admin, now() + interval '7 days'
    ) returning id into v_acceso_id;
    update public.publicaciones p set estado = v_nuevo, publicada_en = null, moderada_en = now(),
      moderada_por = v_admin, version_actual = version_actual + 1 where p.id = p_publicacion_id;
  elsif p_accion = 'rechazar' then
    if not p_confirmar then raise exception using message = 'CRM_REJECTION_CONFIRMATION_REQUIRED'; end if;
    if v_anterior not in ('pendiente_revision','requiere_cambios') then raise exception using message = 'CRM_STATE_TRANSITION_INVALID'; end if;
    if length(trim(coalesce(p_motivo,''))) < 3 or length(trim(coalesce(p_categoria,''))) < 3 then
      raise exception using message = 'CRM_REJECTION_REASON_CATEGORY_REQUIRED';
    end if;
    v_nuevo := 'rechazada';
    update public.publicacion_correccion_accesos a set revocado_en = now()
      where a.publicacion_id = p_publicacion_id and a.utilizado_en is null and a.revocado_en is null;
    update public.publicaciones p set estado = v_nuevo, publicada_en = null, moderada_en = now(),
      moderada_por = v_admin, version_actual = version_actual + 1 where p.id = p_publicacion_id;
  elsif p_accion = 'revertir_rechazo' then
    if not p_confirmar then raise exception using message = 'CRM_REVERSAL_CONFIRMATION_REQUIRED'; end if;
    if v_anterior <> 'rechazada' then raise exception using message = 'CRM_STATE_TRANSITION_INVALID'; end if;
    if length(trim(coalesce(p_motivo,''))) < 3 then raise exception using message = 'CRM_REASON_REQUIRED'; end if;
    v_nuevo := 'pendiente_revision';
    update public.publicaciones p set estado = v_nuevo, publicada_en = null, moderada_en = now(),
      moderada_por = v_admin, version_actual = version_actual + 1 where p.id = p_publicacion_id;
  elsif p_accion = 'pausar' then
    if not p_confirmar or v_anterior <> 'aprobada' then raise exception using message = 'CRM_STATE_TRANSITION_INVALID'; end if;
    if length(trim(coalesce(p_motivo,''))) < 3 then raise exception using message = 'CRM_REASON_REQUIRED'; end if;
    v_nuevo := 'pausada';
    update public.publicaciones p set estado = v_nuevo, publicada_en = null, moderada_en = now(),
      moderada_por = v_admin, version_actual = version_actual + 1 where p.id = p_publicacion_id;
  elsif p_accion = 'reactivar' then
    if not p_confirmar or v_anterior <> 'pausada' then raise exception using message = 'CRM_STATE_TRANSITION_INVALID'; end if;
    if length(trim(coalesce(p_motivo,''))) < 3 then raise exception using message = 'CRM_REASON_REQUIRED'; end if;
    v_nuevo := 'aprobada';
    update public.publicaciones p set estado = v_nuevo, publicada_en = now(), moderada_en = now(),
      moderada_por = v_admin, version_actual = version_actual + 1 where p.id = p_publicacion_id;
  elsif p_accion = 'marcar_vendida' then
    if not p_confirmar or v_anterior not in ('aprobada','pausada') then raise exception using message = 'CRM_STATE_TRANSITION_INVALID'; end if;
    if length(trim(coalesce(p_motivo,''))) < 3 then raise exception using message = 'CRM_REASON_REQUIRED'; end if;
    v_nuevo := 'vendida';
    update public.publicaciones p set estado = v_nuevo, publicada_en = null, moderada_en = now(),
      moderada_por = v_admin, version_actual = version_actual + 1 where p.id = p_publicacion_id;
  elsif p_accion = 'archivar' then
    if not p_confirmar or v_anterior not in ('rechazada','pausada','vendida') then raise exception using message = 'CRM_STATE_TRANSITION_INVALID'; end if;
    if length(trim(coalesce(p_motivo,''))) < 3 then raise exception using message = 'CRM_REASON_REQUIRED'; end if;
    v_nuevo := 'archivada';
    update public.publicaciones p set estado = v_nuevo, publicada_en = null, moderada_en = now(),
      moderada_por = v_admin, version_actual = version_actual + 1 where p.id = p_publicacion_id;
  else
    raise exception using message = 'CRM_ACTION_INVALID';
  end if;

  insert into public.moderacion_registros (
    publicacion_id, estado_anterior, estado_nuevo, motivo, responsable_id, evidencia,
    accion, categoria, campos_correccion, mensaje_personalizado, administrador_id
  ) values (
    p_publicacion_id, v_anterior, v_nuevo, nullif(trim(p_motivo),''), v_admin,
    jsonb_build_object('confirmacion_explicita', p_confirmar, 'acceso_correccion_id', v_acceso_id),
    p_accion, nullif(trim(p_categoria),''), coalesce(p_campos_correccion,'{}'),
    nullif(trim(p_mensaje),''), v_admin
  );

  insert into public.publicacion_versiones (publicacion_id, version, origen, datos, creado_por)
  select p.id, p.version_actual, 'moderacion', to_jsonb(p), v_admin
  from public.publicaciones p where p.id = p_publicacion_id;

  if p_accion in ('aprobar','solicitar_correcciones','rechazar','pausar','reactivar','marcar_vendida','archivar') then
    insert into public.notificacion_cola (publicacion_id, tipo, destinatario_email, payload)
    values (
      p_publicacion_id,
      case p_accion
        when 'aprobar' then 'aprobacion'
        when 'solicitar_correcciones' then 'solicitud_correcciones'
        when 'rechazar' then 'rechazo'
        when 'pausar' then 'publicacion_pausada'
        when 'reactivar' then 'publicacion_reactivada'
        when 'marcar_vendida' then 'publicacion_vendida'
        else 'publicacion_archivada'
      end,
      v_publicacion.contacto_email,
      jsonb_strip_nulls(jsonb_build_object(
        'codigo_publico', v_publicacion.codigo_publico,
        'estado', v_nuevo,
        'motivo', nullif(trim(p_motivo),''),
        'categoria', nullif(trim(p_categoria),''),
        'campos_correccion', case when p_accion = 'solicitar_correcciones' then p_campos_correccion else null end,
        'mensaje', nullif(trim(p_mensaje),''),
        'acceso_correccion_id', v_acceso_id
      ))
    );
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'publicacion_id', p_publicacion_id,
    'codigo_publico', v_publicacion.codigo_publico,
    'estado_anterior', v_anterior,
    'estado_nuevo', v_nuevo,
    'correction_token', v_token,
    'correction_expires_at', case when v_token is not null then now() + interval '7 days' else null end
  ));
end;
$$;

revoke all on function public.crm_contadores_publicaciones() from public, anon, authenticated;
revoke all on function public.crm_listar_publicaciones(text,date,date,text,text,text) from public, anon, authenticated;
revoke all on function public.crm_moderar_publicacion(uuid,text,text,text,text[],text,boolean) from public, anon, authenticated;
grant execute on function public.crm_contadores_publicaciones() to authenticated;
grant execute on function public.crm_listar_publicaciones(text,date,date,text,text,text) to authenticated;
grant execute on function public.crm_moderar_publicacion(uuid,text,text,text,text[],text,boolean) to authenticated;
