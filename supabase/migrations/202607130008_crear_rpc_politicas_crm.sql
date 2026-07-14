insert into public.publicacion_versiones (publicacion_id, version, origen, datos)
select p.id, p.version_actual, 'recepcion', to_jsonb(p)
from public.publicaciones p
where not exists (
  select 1 from public.publicacion_versiones v where v.publicacion_id = p.id
);

create or replace function public.es_administrador_activo()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.tipo = 'administrador'
      and p.activo = true
  );
$$;

create or replace function public.crm_exigir_administrador()
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null or not public.es_administrador_activo() then
    raise exception using message = 'CRM_ACCESS_DENIED';
  end if;
  return v_usuario;
end;
$$;

create or replace function public.crm_sesion_actual()
returns table (usuario_id uuid, nombre text, tipo text)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_admin uuid := public.crm_exigir_administrador();
begin
  return query
  select p.id, p.nombre, p.tipo
  from public.profiles p
  where p.id = v_admin and p.activo = true;
end;
$$;

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
    'rechazadas', (select count(*) from public.publicaciones p where p.estado = 'rechazada')
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
  if p_estado is not null and p_estado not in ('pendiente_revision','requiere_cambios','aprobada','rechazada') then
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
    case when p.estado = 'pendiente_revision' then 0 else 1 end,
    case when p.estado = 'pendiente_revision' then p.creado_en end asc,
    p.actualizado_en desc
  limit 500;
end;
$$;

create or replace function public.crm_detalle_publicacion(p_publicacion_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_resultado jsonb;
begin
  perform public.crm_exigir_administrador();
  if p_publicacion_id is null then raise exception using message = 'CRM_PUBLICATION_REQUIRED'; end if;

  select jsonb_build_object(
    'publicacion', to_jsonb(p) - 'idempotency_key',
    'fotos', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.orden)
      from public.publicacion_fotos f where f.publicacion_id = p.id
    ), '[]'::jsonb),
    'moderacion', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.creado_en desc)
      from public.moderacion_registros m where m.publicacion_id = p.id
    ), '[]'::jsonb),
    'versiones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'version', v.version, 'origen', v.origen, 'creado_por', v.creado_por, 'creado_en', v.creado_en
      ) order by v.version desc)
      from public.publicacion_versiones v where v.publicacion_id = p.id
    ), '[]'::jsonb),
    'analisis_visual', (
      select to_jsonb(a)
      from public.publicacion_analisis_visual a
      where a.publicacion_id = p.id
      order by a.creado_en desc limit 1
    )
  ) into v_resultado
  from public.publicaciones p
  where p.id = p_publicacion_id;

  if v_resultado is null then raise exception using message = 'CRM_PUBLICATION_NOT_FOUND'; end if;
  return v_resultado;
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

  if p_accion in ('aprobar','solicitar_correcciones','rechazar') then
    insert into public.notificacion_cola (publicacion_id, tipo, destinatario_email, payload)
    values (
      p_publicacion_id,
      case p_accion when 'aprobar' then 'aprobacion' when 'solicitar_correcciones' then 'solicitud_correcciones' else 'rechazo' end,
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

create or replace function public.cargar_correccion_publicacion(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_acceso public.publicacion_correccion_accesos%rowtype;
  v_publicacion public.publicaciones%rowtype;
  v_datos jsonb;
begin
  if coalesce(p_token_hash,'') !~ '^[0-9a-f]{64}$' then raise exception using message = 'CORRECTION_TOKEN_INVALID'; end if;
  select * into v_acceso from public.publicacion_correccion_accesos a
    where a.token_hash = p_token_hash and a.utilizado_en is null and a.revocado_en is null and a.expira_en > now();
  if not found then raise exception using message = 'CORRECTION_ACCESS_INVALID_OR_EXPIRED'; end if;
  select * into v_publicacion from public.publicaciones p where p.id = v_acceso.publicacion_id and p.estado = 'requiere_cambios';
  if not found then raise exception using message = 'CORRECTION_STATE_INVALID'; end if;

  select coalesce(jsonb_object_agg(item.key, item.value), '{}'::jsonb) into v_datos
  from jsonb_each(jsonb_build_object(
    'contacto_nombre', v_publicacion.contacto_nombre,
    'contacto_email', v_publicacion.contacto_email,
    'contacto_telefono', v_publicacion.contacto_telefono,
    'contacto_organizacion', v_publicacion.contacto_organizacion,
    'titulo_publico', v_publicacion.titulo_publico,
    'descripcion_publica', v_publicacion.descripcion_publica,
    'precio_publicacion', v_publicacion.precio_publicacion,
    'superficie_m2', v_publicacion.superficie_m2,
    'region', v_publicacion.region, 'comuna', v_publicacion.comuna, 'sector', v_publicacion.sector,
    'rol', v_publicacion.rol, 'agua', v_publicacion.agua, 'luz', v_publicacion.luz,
    'acceso', v_publicacion.acceso, 'topografia', v_publicacion.topografia,
    'ciudad_principal', v_publicacion.ciudad_principal,
    'distancia_ciudad', v_publicacion.distancia_ciudad,
    'facilidad_pago', v_publicacion.facilidad_pago,
    'detalle_facilidad_pago', v_publicacion.detalle_facilidad_pago
  )) item where item.key = any(v_acceso.campos_permitidos);

  return jsonb_build_object(
    'codigo_publico', v_publicacion.codigo_publico,
    'campos_permitidos', v_acceso.campos_permitidos,
    'datos', v_datos,
    'expira_en', v_acceso.expira_en,
    'fotografias_conservadas', (select count(*) from public.publicacion_fotos f where f.publicacion_id = v_publicacion.id)
  );
end;
$$;

create or replace function public.reenviar_correccion_publicacion(p_token_hash text, p_cambios jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_acceso public.publicacion_correccion_accesos%rowtype;
  v_publicacion public.publicaciones%rowtype;
  v_claves text[];
begin
  if coalesce(p_token_hash,'') !~ '^[0-9a-f]{64}$' or jsonb_typeof(p_cambios) is distinct from 'object' then
    raise exception using message = 'CORRECTION_PAYLOAD_INVALID';
  end if;
  if octet_length(p_cambios::text) > 65536 then raise exception using message = 'CORRECTION_PAYLOAD_TOO_LARGE'; end if;
  select coalesce(array_agg(k.key), array[]::text[]) into v_claves
  from jsonb_object_keys(p_cambios) as k(key);
  select * into v_acceso from public.publicacion_correccion_accesos a
    where a.token_hash = p_token_hash and a.utilizado_en is null and a.revocado_en is null and a.expira_en > now()
    for update;
  if not found then raise exception using message = 'CORRECTION_ACCESS_INVALID_OR_EXPIRED'; end if;
  if cardinality(v_claves) = 0 or not v_claves <@ v_acceso.campos_permitidos then
    raise exception using message = 'CORRECTION_FIELDS_NOT_ALLOWED';
  end if;
  select * into v_publicacion from public.publicaciones p where p.id = v_acceso.publicacion_id and p.estado = 'requiere_cambios' for update;
  if not found then raise exception using message = 'CORRECTION_STATE_INVALID'; end if;
  if p_cambios ? 'contacto_email' and (length(coalesce(p_cambios->>'contacto_email','')) > 320 or p_cambios->>'contacto_email' !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception using message = 'CORRECTION_EMAIL_INVALID';
  end if;
  if p_cambios ? 'titulo_publico' and length(trim(p_cambios->>'titulo_publico')) not between 3 and 160 then raise exception using message = 'CORRECTION_TITLE_INVALID'; end if;
  if p_cambios ? 'descripcion_publica' and length(trim(p_cambios->>'descripcion_publica')) not between 30 and 10000 then raise exception using message = 'CORRECTION_DESCRIPTION_INVALID'; end if;
  if p_cambios ? 'precio_publicacion' and coalesce(p_cambios->>'precio_publicacion','') !~ '^[0-9]+$' then raise exception using message = 'CORRECTION_PRICE_INVALID'; end if;
  if p_cambios ? 'superficie_m2' and coalesce(p_cambios->>'superficie_m2','') !~ '^[0-9]+([.][0-9]+)?$' then raise exception using message = 'CORRECTION_SURFACE_INVALID'; end if;

  update public.publicaciones p set
    contacto_nombre = case when p_cambios ? 'contacto_nombre' then trim(p_cambios->>'contacto_nombre') else p.contacto_nombre end,
    contacto_email = case when p_cambios ? 'contacto_email' then lower(trim(p_cambios->>'contacto_email')) else p.contacto_email end,
    contacto_telefono = case when p_cambios ? 'contacto_telefono' then nullif(trim(p_cambios->>'contacto_telefono'),'') else p.contacto_telefono end,
    contacto_organizacion = case when p_cambios ? 'contacto_organizacion' then nullif(trim(p_cambios->>'contacto_organizacion'),'') else p.contacto_organizacion end,
    titulo_publico = case when p_cambios ? 'titulo_publico' then trim(p_cambios->>'titulo_publico') else p.titulo_publico end,
    descripcion_publica = case when p_cambios ? 'descripcion_publica' then trim(p_cambios->>'descripcion_publica') else p.descripcion_publica end,
    precio_publicacion = case when p_cambios ? 'precio_publicacion' then (p_cambios->>'precio_publicacion')::bigint else p.precio_publicacion end,
    superficie_m2 = case when p_cambios ? 'superficie_m2' then (p_cambios->>'superficie_m2')::numeric else p.superficie_m2 end,
    region = case when p_cambios ? 'region' then trim(p_cambios->>'region') else p.region end,
    comuna = case when p_cambios ? 'comuna' then trim(p_cambios->>'comuna') else p.comuna end,
    sector = case when p_cambios ? 'sector' then trim(p_cambios->>'sector') else p.sector end,
    rol = case when p_cambios ? 'rol' then nullif(trim(p_cambios->>'rol'),'') else p.rol end,
    agua = case when p_cambios ? 'agua' then nullif(trim(p_cambios->>'agua'),'') else p.agua end,
    luz = case when p_cambios ? 'luz' then nullif(trim(p_cambios->>'luz'),'') else p.luz end,
    acceso = case when p_cambios ? 'acceso' then nullif(trim(p_cambios->>'acceso'),'') else p.acceso end,
    topografia = case when p_cambios ? 'topografia' then nullif(trim(p_cambios->>'topografia'),'') else p.topografia end,
    ciudad_principal = case when p_cambios ? 'ciudad_principal' then nullif(trim(p_cambios->>'ciudad_principal'),'') else p.ciudad_principal end,
    distancia_ciudad = case when p_cambios ? 'distancia_ciudad' then nullif(trim(p_cambios->>'distancia_ciudad'),'') else p.distancia_ciudad end,
    facilidad_pago = case when p_cambios ? 'facilidad_pago' then (p_cambios->>'facilidad_pago')::boolean else p.facilidad_pago end,
    detalle_facilidad_pago = case when p_cambios ? 'detalle_facilidad_pago' then nullif(trim(p_cambios->>'detalle_facilidad_pago'),'') else p.detalle_facilidad_pago end,
    ubicacion_publica_aproximada = concat_ws(', ',
      case when p_cambios ? 'sector' then nullif(trim(p_cambios->>'sector'),'') else p.sector end,
      case when p_cambios ? 'comuna' then nullif(trim(p_cambios->>'comuna'),'') else p.comuna end,
      case when p_cambios ? 'region' then nullif(trim(p_cambios->>'region'),'') else p.region end
    ),
    datos_formulario = p.datos_formulario || p_cambios,
    estado = 'pendiente_revision', publicada_en = null, moderada_en = null, moderada_por = null,
    version_actual = p.version_actual + 1
  where p.id = v_acceso.publicacion_id;

  update public.publicacion_correccion_accesos a set utilizado_en = now() where a.id = v_acceso.id;
  insert into public.moderacion_registros (
    publicacion_id, estado_anterior, estado_nuevo, motivo, evidencia, accion, campos_correccion
  ) values (
    v_acceso.publicacion_id, 'requiere_cambios', 'pendiente_revision', 'Correcciones reenviadas por el publicador',
    jsonb_build_object('acceso_correccion_id', v_acceso.id), 'reenvio_corredor', v_claves
  );
  insert into public.publicacion_versiones (publicacion_id, version, origen, datos)
  select p.id, p.version_actual, 'correccion_corredor', to_jsonb(p) from public.publicaciones p where p.id = v_acceso.publicacion_id;
  insert into public.notificacion_cola (publicacion_id, tipo, destinatario_email, payload)
  values (v_acceso.publicacion_id, 'correccion_recibida', v_publicacion.contacto_email,
    jsonb_build_object('codigo_publico', v_publicacion.codigo_publico, 'estado', 'pendiente_revision'));
  return jsonb_build_object('publicacion_id', v_acceso.publicacion_id, 'codigo_publico', v_publicacion.codigo_publico, 'estado', 'pendiente_revision');
end;
$$;

revoke all on function public.es_administrador_activo() from public, anon, authenticated;
revoke all on function public.crm_exigir_administrador() from public, anon, authenticated;
revoke all on function public.crm_sesion_actual() from public, anon, authenticated;
revoke all on function public.crm_contadores_publicaciones() from public, anon, authenticated;
revoke all on function public.crm_listar_publicaciones(text,date,date,text,text,text) from public, anon, authenticated;
revoke all on function public.crm_detalle_publicacion(uuid) from public, anon, authenticated;
revoke all on function public.crm_moderar_publicacion(uuid,text,text,text,text[],text,boolean) from public, anon, authenticated;
revoke all on function public.cargar_correccion_publicacion(text) from public, anon, authenticated;
revoke all on function public.reenviar_correccion_publicacion(text,jsonb) from public, anon, authenticated;

grant execute on function public.es_administrador_activo() to authenticated;
grant execute on function public.crm_sesion_actual() to authenticated;
grant execute on function public.crm_contadores_publicaciones() to authenticated;
grant execute on function public.crm_listar_publicaciones(text,date,date,text,text,text) to authenticated;
grant execute on function public.crm_detalle_publicacion(uuid) to authenticated;
grant execute on function public.crm_moderar_publicacion(uuid,text,text,text,text[],text,boolean) to authenticated;
grant execute on function public.cargar_correccion_publicacion(text) to service_role;
grant execute on function public.reenviar_correccion_publicacion(text,jsonb) to service_role;

grant select on storage.objects to authenticated;
drop policy if exists "crm administradores leen fotos pendientes" on storage.objects;
create policy "crm administradores leen fotos pendientes"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'publicaciones-pendientes'
  and public.es_administrador_activo()
);

-- No existen políticas INSERT, UPDATE o DELETE para authenticated/anon.
-- Las tablas de negocio continúan sin privilegios directos para el navegador.
