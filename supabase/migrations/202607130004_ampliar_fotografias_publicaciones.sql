-- Amplía el manifiesto inmutable sin reescribir las migraciones ya aplicadas.
-- La implementación v1 queda privada y se reutiliza únicamente para crear los
-- datos de la publicación. Esta envoltura reserva hasta 12 fotos en la misma
-- transacción y valida un máximo final conjunto de 20 MB.

alter function public.crear_publicacion_pendiente(jsonb, uuid, jsonb)
  rename to crear_publicacion_pendiente_v1;

revoke all on function public.crear_publicacion_pendiente_v1(jsonb, uuid, jsonb)
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
  v_foto jsonb;
  v_primera jsonb;
  v_semilla jsonb;
  v_foto_id uuid;
  v_mime text;
  v_extension text;
  v_tamano bigint;
  v_orden integer;
  v_sha256 text;
  v_es_portada boolean;
  v_total_fotos bigint := 0;
  v_total_portadas integer := 0;
begin
  if p_idempotency_key is null or jsonb_typeof(p_datos) is distinct from 'object' then
    raise exception 'Datos de publicación inválidos';
  end if;

  if jsonb_typeof(p_fotos) is distinct from 'array' or
     jsonb_array_length(p_fotos) < 1 or jsonb_array_length(p_fotos) > 12 then
    raise exception 'Manifiesto de fotografías inválido';
  end if;

  for v_foto in select value from jsonb_array_elements(p_fotos) loop
    if jsonb_typeof(v_foto) is distinct from 'object' or
       coalesce(v_foto->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
       coalesce(v_foto->>'contenido_sha256', '') !~ '^[0-9a-f]{64}$' or
       coalesce(v_foto->>'tamano_bytes', '') !~ '^[0-9]+$' or
       coalesce(v_foto->>'orden', '') !~ '^[0-9]+$' or
       (v_foto ? 'es_portada' and coalesce(v_foto->>'es_portada', '') not in ('true', 'false')) then
      raise exception 'Manifiesto de fotografías inválido';
    end if;

    v_mime := v_foto->>'mime_type';
    v_tamano := (v_foto->>'tamano_bytes')::bigint;
    v_orden := (v_foto->>'orden')::integer;
    v_es_portada := case when v_foto ? 'es_portada'
      then (v_foto->>'es_portada')::boolean else v_orden = 0 end;

    if coalesce(v_mime, '') not in ('image/jpeg', 'image/png', 'image/webp') or
       v_tamano < 1 or v_orden < 0 or v_orden >= jsonb_array_length(p_fotos) then
      raise exception 'Manifiesto de fotografías inválido';
    end if;

    v_total_fotos := v_total_fotos + v_tamano;
    if v_es_portada then v_total_portadas := v_total_portadas + 1; end if;
  end loop;

  if v_total_fotos > 20971520 then
    raise exception 'Las fotografías superan el límite total permitido';
  end if;

  if v_total_portadas <> 1 or
     (select count(distinct value->>'id') from jsonb_array_elements(p_fotos)) <> jsonb_array_length(p_fotos) or
     (select count(distinct value->>'orden') from jsonb_array_elements(p_fotos)) <> jsonb_array_length(p_fotos) then
    raise exception using message = 'MANIFEST_DUPLICATE_ORDER',
      detail = 'El manifiesto requiere UUID y órdenes únicos y exactamente una portada';
  end if;

  select p.id, p.codigo_publico, p.creado_en
    into v_id, v_codigo, v_creado
  from public.publicaciones p
  where p.idempotency_key = p_idempotency_key;

  if found then
    if (select count(*) from public.publicacion_fotos pf where pf.publicacion_id = v_id) <> jsonb_array_length(p_fotos) or
       exists (
         select 1
         from jsonb_array_elements(p_fotos) f
         where not exists (
           select 1 from public.publicacion_fotos pf
           where pf.publicacion_id = v_id
             and pf.id = (f->>'id')::uuid
             and pf.orden = (f->>'orden')::integer
             and pf.mime_type = f->>'mime_type'
             and pf.tamano_bytes = (f->>'tamano_bytes')::bigint
             and pf.contenido_sha256 = f->>'contenido_sha256'
             and pf.es_portada = case when f ? 'es_portada'
               then (f->>'es_portada')::boolean else (f->>'orden')::integer = 0 end
         )
       ) then
      raise exception using message = 'MANIFEST_CONFLICT',
        detail = 'Hash, MIME, tamaño, cantidad, UUID, orden o portada diferentes';
    end if;
    return query select v_id, v_codigo, v_creado;
    return;
  end if;

  select value into v_primera
  from jsonb_array_elements(p_fotos)
  where (value->>'orden')::integer = 0;

  -- La v1 validaba 2 MB. Se le entrega tamaño 1 solo para crear la fila base;
  -- la metadata real se reemplaza antes de terminar esta misma transacción.
  v_semilla := jsonb_set(v_primera, '{tamano_bytes}', to_jsonb(1), false);
  select creada.id, creada.codigo_publico, creada.creado_en
    into v_id, v_codigo, v_creado
  from public.crear_publicacion_pendiente_v1(
    p_datos,
    p_idempotency_key,
    jsonb_build_array(v_semilla)
  ) creada;

  update public.publicacion_fotos pf
  set tamano_bytes = (v_primera->>'tamano_bytes')::bigint,
      contenido_sha256 = v_primera->>'contenido_sha256',
      es_portada = case when v_primera ? 'es_portada'
        then (v_primera->>'es_portada')::boolean else true end
  where pf.publicacion_id = v_id and pf.id = (v_primera->>'id')::uuid;

  for v_foto in
    select value from jsonb_array_elements(p_fotos)
    where (value->>'orden')::integer <> 0
  loop
    v_foto_id := (v_foto->>'id')::uuid;
    v_mime := v_foto->>'mime_type';
    v_tamano := (v_foto->>'tamano_bytes')::bigint;
    v_orden := (v_foto->>'orden')::integer;
    v_sha256 := v_foto->>'contenido_sha256';
    v_es_portada := case when v_foto ? 'es_portada'
      then (v_foto->>'es_portada')::boolean else false end;
    v_extension := case v_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' end;

    insert into public.publicacion_fotos (
      id, publicacion_id, bucket_id, storage_path, nombre_original,
      mime_type, tamano_bytes, contenido_sha256, orden, es_portada
    ) values (
      v_foto_id, v_id, 'publicaciones-pendientes',
      v_id::text || '/' || v_foto_id::text || '.' || v_extension,
      'foto-' || (v_orden + 1)::text || '.' || v_extension,
      v_mime, v_tamano, v_sha256, v_orden, v_es_portada
    );
  end loop;

  return query select v_id, v_codigo, v_creado;
end;
$$;

revoke all on function public.crear_publicacion_pendiente(jsonb, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.crear_publicacion_pendiente(jsonb, uuid, jsonb)
  to service_role;

-- El total final sigue limitado por la RPC y la Edge Function. El bucket deja
-- de imponer el antiguo máximo individual de 2 MB.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'],
    public = false
where id = 'publicaciones-pendientes';
