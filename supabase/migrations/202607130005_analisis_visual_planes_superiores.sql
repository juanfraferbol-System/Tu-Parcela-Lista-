-- Análisis visual exclusivo de planes Gold y Platinum.
-- No concede acceso al navegador: toda operación se realiza mediante funciones
-- service_role con search_path fijo y tablas con RLS sin políticas públicas.

alter table public.publicaciones
  add column plan_contratado text,
  add column analisis_ia_incluido boolean not null default false,
  add column analisis_ia_consentimiento boolean not null default false,
  add column analisis_ia_consentimiento_en timestamptz;

alter table public.publicaciones
  add constraint publicaciones_plan_contratado_valido
    check (plan_contratado is null or plan_contratado in ('inicio','profesional','gold','platinum'));

create table public.publicacion_ia_entitlements (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null,
  publicacion_id uuid references public.publicaciones(id) on delete cascade,
  plan_contratado text not null,
  estado text not null default 'activo',
  referencia_confirmacion text,
  emitido_en timestamptz not null default now(),
  revocado_en timestamptz,
  permite_reanalisis_una_vez boolean not null default false,
  constraint publicacion_ia_entitlements_idempotency_unique unique (idempotency_key),
  constraint publicacion_ia_entitlements_publicacion_unique unique (publicacion_id),
  constraint publicacion_ia_entitlements_plan_permitido check (plan_contratado in ('gold','platinum')),
  constraint publicacion_ia_entitlements_estado_valido check (estado in ('activo','revocado'))
);

create table public.publicacion_analisis_visual (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  entitlement_id uuid references public.publicacion_ia_entitlements(id) on delete set null,
  plan_contratado text,
  analisis_ia_incluido boolean not null,
  consentimiento boolean not null,
  consentimiento_en timestamptz,
  estado text not null,
  analisis_utilizado boolean not null default false,
  utilizado_en timestamptz,
  modelo text,
  detalle text not null default 'low',
  foto_hashes text[] not null,
  conjunto_hash text not null,
  autorizacion_reanalisis boolean not null default false,
  sugerencias jsonb,
  sugerencias_aceptadas jsonb,
  sugerencias_estado text,
  sugerencias_revisadas_en timestamptz,
  codigo_error text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint publicacion_analisis_visual_publicacion_hash_unique unique (publicacion_id, conjunto_hash),
  constraint publicacion_analisis_visual_plan_valido check (plan_contratado is null or plan_contratado in ('gold','platinum')),
  constraint publicacion_analisis_visual_estado_valido check (estado in ('pendiente_autorizacion','pendiente_analisis','procesando','completado','rechazado','error')),
  constraint publicacion_analisis_visual_detalle_low check (detalle = 'low'),
  constraint publicacion_analisis_visual_hashes_validos check (
    cardinality(foto_hashes) between 1 and 5 and
    array_position(foto_hashes, null) is null
  ),
  constraint publicacion_analisis_visual_sugerencias_estado check (sugerencias_estado is null or sugerencias_estado in ('pendiente','aceptada','editada','rechazada'))
);

create unique index publicacion_analisis_visual_un_inicial_idx
  on public.publicacion_analisis_visual (publicacion_id)
  where autorizacion_reanalisis = false;

alter table public.publicacion_ia_entitlements enable row level security;
alter table public.publicacion_analisis_visual enable row level security;
revoke all on public.publicacion_ia_entitlements from public, anon, authenticated;
revoke all on public.publicacion_analisis_visual from public, anon, authenticated;

alter function public.crear_publicacion_pendiente(jsonb, uuid, jsonb)
  rename to crear_publicacion_pendiente_v2;
revoke all on function public.crear_publicacion_pendiente_v2(jsonb, uuid, jsonb)
  from public, anon, authenticated, service_role;

create function public.crear_publicacion_pendiente(
  p_datos jsonb,
  p_idempotency_key uuid,
  p_fotos jsonb
)
returns table (id uuid, codigo_publico text, creado_en timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_id uuid;
  v_codigo text;
  v_creado timestamptz;
  v_tipo text;
  v_plan text;
  v_consentimiento boolean;
  v_incluido boolean;
  v_hashes text[];
  v_conjunto_hash text;
  v_entitlement_id uuid;
begin
  if p_idempotency_key is null or jsonb_typeof(p_datos) is distinct from 'object' then
    raise exception 'Datos de publicación inválidos';
  end if;

  v_tipo := coalesce(p_datos->>'tipoPublicador', p_datos->>'tipo_publicador', '');
  v_plan := coalesce(p_datos->>'planCorredor', p_datos#>>'{commercial,plan}', '');
  v_consentimiento := coalesce((p_datos#>>'{analisisVisual,consent}')::boolean, false);
  v_incluido := v_tipo = 'corredor' and v_plan = any(array['gold','platinum']);

  if v_consentimiento and not v_incluido then
    raise exception using message = 'VISUAL_ANALYSIS_NOT_INCLUDED',
      detail = 'Solo gold y platinum incluyen análisis visual';
  end if;

  select creada.id, creada.codigo_publico, creada.creado_en
    into v_id, v_codigo, v_creado
  from public.crear_publicacion_pendiente_v2(p_datos, p_idempotency_key, p_fotos) creada;

  update public.publicaciones p
  set analisis_ia_incluido = v_incluido,
      analisis_ia_consentimiento = v_consentimiento and v_incluido,
      analisis_ia_consentimiento_en = case when v_consentimiento and v_incluido
        then coalesce(p.analisis_ia_consentimiento_en, now()) else null end
  where p.id = v_id;

  if v_consentimiento and v_incluido then
    select array_agg(pf.contenido_sha256 order by pf.orden)
      into v_hashes
    from (
      select contenido_sha256, orden
      from public.publicacion_fotos
      where publicacion_id = v_id
      order by orden
      limit 5
    ) pf;
    v_conjunto_hash := encode(extensions.digest(array_to_string(v_hashes, ':'), 'sha256'), 'hex');

    select e.id into v_entitlement_id
    from public.publicacion_ia_entitlements e
    where e.idempotency_key = p_idempotency_key
      and e.plan_contratado = v_plan
      and e.estado = 'activo';

    if v_entitlement_id is not null then
      update public.publicacion_ia_entitlements e set publicacion_id = v_id where e.id = v_entitlement_id;
      update public.publicaciones p set plan_contratado = v_plan where p.id = v_id;
    end if;

    insert into public.publicacion_analisis_visual (
      publicacion_id, entitlement_id, plan_contratado, analisis_ia_incluido,
      consentimiento, consentimiento_en, estado, foto_hashes, conjunto_hash,
      sugerencias_aceptadas, sugerencias_estado
    ) values (
      v_id, v_entitlement_id, case when v_entitlement_id is null then null else v_plan end,
      true, true, now(), case when v_entitlement_id is null then 'pendiente_autorizacion' else 'pendiente_analisis' end,
      v_hashes, v_conjunto_hash,
      case when p_datos#>>'{analisisVisual,reviewStatus}' in ('accepted','edited') and jsonb_typeof(p_datos#>'{analisisVisual,acceptedSuggestions}') = 'object'
        then p_datos#>'{analisisVisual,acceptedSuggestions}' else null end,
      case p_datos#>>'{analisisVisual,reviewStatus}' when 'accepted' then 'aceptada' when 'edited' then 'editada' when 'rejected' then 'rechazada' else null end
    )
    on conflict (publicacion_id, conjunto_hash) do update
    set entitlement_id = coalesce(public.publicacion_analisis_visual.entitlement_id, excluded.entitlement_id),
        plan_contratado = coalesce(public.publicacion_analisis_visual.plan_contratado, excluded.plan_contratado),
        sugerencias_aceptadas = case
          when p_datos#>>'{analisisVisual,reviewStatus}' = 'rejected' then null
          when p_datos#>>'{analisisVisual,reviewStatus}' in ('accepted','edited') and jsonb_typeof(p_datos#>'{analisisVisual,acceptedSuggestions}') = 'object'
            then p_datos#>'{analisisVisual,acceptedSuggestions}'
          else public.publicacion_analisis_visual.sugerencias_aceptadas end,
        sugerencias_estado = case p_datos#>>'{analisisVisual,reviewStatus}'
          when 'accepted' then 'aceptada' when 'edited' then 'editada' when 'rejected' then 'rechazada'
          else public.publicacion_analisis_visual.sugerencias_estado end,
        sugerencias_revisadas_en = case when p_datos#>>'{analisisVisual,reviewStatus}' in ('accepted','edited','rejected') then now()
          else public.publicacion_analisis_visual.sugerencias_revisadas_en end,
        actualizado_en = now();
  end if;

  return query select v_id, v_codigo, v_creado;
end;
$$;

create function public.confirmar_plan_analisis_visual(
  p_idempotency_key uuid,
  p_plan_contratado text,
  p_referencia_confirmacion text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_publicacion_id uuid;
  v_plan_seleccionado text;
  v_entitlement_id uuid;
begin
  if p_idempotency_key is null or p_plan_contratado not in ('gold','platinum') or
     nullif(btrim(coalesce(p_referencia_confirmacion,'')), '') is null then
    raise exception 'Confirmación de plan inválida';
  end if;
  select p.id, p.plan_seleccionado into v_publicacion_id, v_plan_seleccionado
  from public.publicaciones p where p.idempotency_key = p_idempotency_key;
  if v_publicacion_id is not null and v_plan_seleccionado <> p_plan_contratado then
    raise exception using message = 'PLAN_CONFIRMATION_MISMATCH';
  end if;
  insert into public.publicacion_ia_entitlements (
    idempotency_key, publicacion_id, plan_contratado, estado, referencia_confirmacion
  ) values (
    p_idempotency_key, v_publicacion_id, p_plan_contratado, 'activo', left(p_referencia_confirmacion, 200)
  )
  on conflict (idempotency_key) do update
    set publicacion_id = coalesce(excluded.publicacion_id, public.publicacion_ia_entitlements.publicacion_id),
        plan_contratado = excluded.plan_contratado,
        estado = 'activo', referencia_confirmacion = excluded.referencia_confirmacion,
        emitido_en = now(), revocado_en = null
  returning id into v_entitlement_id;
  if v_publicacion_id is not null then
    update public.publicaciones p set plan_contratado = p_plan_contratado where p.id = v_publicacion_id;
    update public.publicacion_analisis_visual a
      set entitlement_id = v_entitlement_id, plan_contratado = p_plan_contratado,
          estado = case when a.estado = 'pendiente_autorizacion' then 'pendiente_analisis' else a.estado end,
          actualizado_en = now()
      where a.publicacion_id = v_publicacion_id;
  end if;
  return v_entitlement_id;
end;
$$;

create function public.preparar_analisis_visual(
  p_publicacion_id uuid,
  p_modelo text
)
returns table (
  estado text, debe_analizar boolean, analisis_id uuid,
  foto_paths text[], foto_mimes text[], foto_hashes text[], reutilizado boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_publicacion public.publicaciones%rowtype;
  v_entitlement public.publicacion_ia_entitlements%rowtype;
  v_analisis public.publicacion_analisis_visual%rowtype;
  v_paths text[];
  v_mimes text[];
  v_hashes text[];
  v_conjunto_hash text;
  v_reanalisis boolean := false;
begin
  select * into v_publicacion from public.publicaciones p where p.id = p_publicacion_id;
  if not found or v_publicacion.tipo_publicador <> 'corredor' or
     coalesce(v_publicacion.plan_seleccionado, '') not in ('gold','platinum') or
     not v_publicacion.analisis_ia_consentimiento then
    return query select 'not_requested'::text, false, null::uuid, null::text[], null::text[], null::text[], false;
    return;
  end if;
  select * into v_entitlement from public.publicacion_ia_entitlements e
  where e.publicacion_id = p_publicacion_id and e.estado = 'activo'
    and e.plan_contratado = v_publicacion.plan_seleccionado;
  if not found then
    return query select 'pending_plan_confirmation'::text, false, null::uuid, null::text[], null::text[], null::text[], false;
    return;
  end if;
  select array_agg(x.storage_path order by x.orden), array_agg(x.mime_type order by x.orden), array_agg(x.contenido_sha256 order by x.orden)
    into v_paths, v_mimes, v_hashes
  from (
    select storage_path, mime_type, contenido_sha256, orden
    from public.publicacion_fotos where publicacion_id = p_publicacion_id
    order by orden limit 5
  ) x;
  if coalesce(cardinality(v_hashes),0) < 1 then raise exception 'VISUAL_ANALYSIS_MISSING_PHOTOS'; end if;
  v_conjunto_hash := encode(extensions.digest(array_to_string(v_hashes, ':'), 'sha256'), 'hex');
  select * into v_analisis from public.publicacion_analisis_visual a
    where a.publicacion_id = p_publicacion_id and a.conjunto_hash = v_conjunto_hash;
  if found and v_analisis.estado in ('completado','error','procesando') then
    return query select v_analisis.estado, false, v_analisis.id, null::text[], null::text[], v_hashes, v_analisis.estado = 'completado';
    return;
  end if;
  if exists (select 1 from public.publicacion_analisis_visual a where a.publicacion_id = p_publicacion_id and a.analisis_utilizado and a.conjunto_hash <> v_conjunto_hash) then
    if not v_entitlement.permite_reanalisis_una_vez then raise exception using message = 'VISUAL_REANALYSIS_REQUIRES_ADMIN'; end if;
    v_reanalisis := true;
    update public.publicacion_ia_entitlements e set permite_reanalisis_una_vez = false where e.id = v_entitlement.id;
  end if;
  insert into public.publicacion_analisis_visual (
    publicacion_id, entitlement_id, plan_contratado, analisis_ia_incluido,
    consentimiento, consentimiento_en, estado, modelo, foto_hashes,
    conjunto_hash, autorizacion_reanalisis
  ) values (
    p_publicacion_id, v_entitlement.id, v_entitlement.plan_contratado, true,
    true, v_publicacion.analisis_ia_consentimiento_en, 'procesando', left(p_modelo,100),
    v_hashes, v_conjunto_hash, v_reanalisis
  )
  on conflict (publicacion_id, conjunto_hash) do update
    set estado = 'procesando', modelo = excluded.modelo, entitlement_id = excluded.entitlement_id,
        actualizado_en = now()
  returning * into v_analisis;
  return query select 'procesando'::text, true, v_analisis.id, v_paths, v_mimes, v_hashes, false;
end;
$$;

create function public.completar_analisis_visual(
  p_analisis_id uuid,
  p_modelo text,
  p_sugerencias jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if jsonb_typeof(p_sugerencias) is distinct from 'object' or pg_column_size(p_sugerencias) > 32768 then
    raise exception 'Sugerencias visuales inválidas';
  end if;
  update public.publicacion_analisis_visual a
  set estado='completado', analisis_utilizado=true, utilizado_en=now(), modelo=left(p_modelo,100),
      sugerencias=p_sugerencias, sugerencias_estado='pendiente', codigo_error=null, actualizado_en=now()
  where a.id=p_analisis_id and a.estado='procesando';
  if not found then raise exception 'Análisis visual no disponible para completar'; end if;
end;
$$;

create function public.marcar_error_analisis_visual(
  p_analisis_id uuid,
  p_codigo_error text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.publicacion_analisis_visual a
  set estado='error', analisis_utilizado=true, utilizado_en=now(),
      codigo_error=left(coalesce(p_codigo_error,'visual_analysis_unavailable'),100), actualizado_en=now()
  where a.id=p_analisis_id and a.estado='procesando';
end;
$$;

revoke all on function public.crear_publicacion_pendiente(jsonb, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.confirmar_plan_analisis_visual(uuid, text, text) from public, anon, authenticated;
revoke all on function public.preparar_analisis_visual(uuid, text) from public, anon, authenticated;
revoke all on function public.completar_analisis_visual(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.marcar_error_analisis_visual(uuid, text) from public, anon, authenticated;

grant execute on function public.crear_publicacion_pendiente(jsonb, uuid, jsonb) to service_role;
grant execute on function public.confirmar_plan_analisis_visual(uuid, text, text) to service_role;
grant execute on function public.preparar_analisis_visual(uuid, text) to service_role;
grant execute on function public.completar_analisis_visual(uuid, text, jsonb) to service_role;
grant execute on function public.marcar_error_analisis_visual(uuid, text) to service_role;
