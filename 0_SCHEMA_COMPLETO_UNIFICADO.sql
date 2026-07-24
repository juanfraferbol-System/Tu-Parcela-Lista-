-- Source: 202607130001_crear_publicaciones.sql
DO $$ BEGIN
  CREATE TYPE public.publicacion_estado AS ENUM (
  'borrador',
  'pendiente_revision',
  'aprobada',
  'rechazada',
  'pausada'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.publicador_tipo AS ENUM ('dueno', 'corredor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

create table if not exists public.publicaciones (
  id uuid primary key default gen_random_uuid(),
  codigo_publico text not null unique,
  idempotency_key uuid not null,
  estado public.publicacion_estado not null default 'pendiente_revision',
  tipo_publicador public.publicador_tipo not null,
  contacto_nombre text not null,
  contacto_email text not null,
  contacto_telefono text,
  contacto_organizacion text,
  titulo_publico text not null,
  descripcion_publica text not null,
  descripcion_origen_privada text,
  precio_publicacion bigint check (precio_publicacion is null or precio_publicacion >= 0),
  monto_liquido bigint check (monto_liquido is null or monto_liquido >= 0),
  superficie_m2 numeric check (superficie_m2 is null or superficie_m2 > 0),
  region text not null,
  comuna text not null,
  sector text not null,
  ubicacion_publica_aproximada text not null,
  latitud_privada numeric,
  longitud_privada numeric,
  rol text,
  agua text,
  luz text,
  acceso text,
  topografia text,
  naturaleza text[] not null default '{}',
  cuerpos_agua text[] not null default '{}',
  servicios text[] not null default '{}',
  ciudad_principal text,
  distancia_ciudad text,
  facilidad_pago boolean,
  detalle_facilidad_pago text,
  plan_seleccionado text,
  modelo_comercial jsonb not null default '{}'::jsonb,
  datos_formulario jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint publicaciones_idempotency_key_unique unique (idempotency_key),
  constraint publicaciones_codigo_formato check (codigo_publico ~ '^TPL-PUB-[0-9]{4}-[0-9]{6}$'),
  constraint publicaciones_coordenadas_validas check (
    (latitud_privada is null or latitud_privada between -90 and 90)
    and (longitud_privada is null or longitud_privada between -180 and 180)
  )
);

create table if not exists public.publicacion_borradores (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid references public.publicaciones(id) on delete cascade,
  idempotency_key uuid not null,
  codigo_local text,
  version integer not null default 1 check (version > 0),
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint publicacion_borradores_idempotency_key_unique unique (idempotency_key)
);

create table if not exists public.publicacion_fotos (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  bucket_id text not null default 'publicaciones-pendientes',
  storage_path text not null,
  nombre_original text not null,
  mime_type text not null,
  tamano_bytes bigint not null check (tamano_bytes > 0 and tamano_bytes <= 2097152),
  contenido_sha256 text not null,
  orden integer not null default 0 check (orden >= 0),
  es_portada boolean not null default false,
  creado_en timestamptz not null default now(),
  constraint publicacion_fotos_publicacion_path_unique unique (publicacion_id, storage_path),
  constraint publicacion_fotos_publicacion_orden_unique unique (publicacion_id, orden),
  constraint publicacion_fotos_bucket_privado check (bucket_id = 'publicaciones-pendientes'),
  constraint publicacion_fotos_mime_permitido check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint publicacion_fotos_sha256_valido check (contenido_sha256 ~ '^[0-9a-f]{64}$'),
  constraint publicacion_fotos_ruta_publicacion check (split_part(storage_path, '/', 1) = publicacion_id::text)
);

create table if not exists public.moderacion_registros (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  estado_anterior public.publicacion_estado,
  estado_nuevo public.publicacion_estado not null,
  motivo text,
  responsable_id uuid,
  evidencia jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index publicaciones_estado_idx on public.publicaciones (estado, creado_en desc);
create index publicaciones_codigo_idx on public.publicaciones (codigo_publico);
create index publicacion_fotos_publicacion_idx on public.publicacion_fotos (publicacion_id, orden);
create index moderacion_publicacion_idx on public.moderacion_registros (publicacion_id, creado_en desc);

-- RLS se activa en la misma migración que crea las tablas. Hasta que la
-- tercera migración otorgue permisos concretos, los roles web no tienen acceso.
alter table public.publicaciones enable row level security;
alter table public.publicacion_borradores enable row level security;
alter table public.publicacion_fotos enable row level security;
alter table public.moderacion_registros enable row level security;

create or replace function public.actualizar_timestamp()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger publicaciones_actualizar_timestamp
before update on public.publicaciones
for each row execute function public.actualizar_timestamp();

create trigger borradores_actualizar_timestamp
before update on public.publicacion_borradores
for each row execute function public.actualizar_timestamp();

create or replace function public.generar_codigo_publicacion()
returns text
language plpgsql
volatile
set search_path = pg_catalog
as $$
begin
  return 'TPL-PUB-' || extract(year from now())::integer || '-' ||
    lpad(floor(random() * 1000000)::integer::text, 6, '0');
end;
$$;

alter table public.publicaciones
  alter column codigo_publico set default public.generar_codigo_publicacion();

-- SECURITY DEFINER es necesario únicamente para resolver una inserción
-- idempotente y devolver id/código sin conceder SELECT sobre publicaciones.
-- La función valida el payload, fuerza pendiente_revision y nunca devuelve PII.
create or replace function public.crear_publicacion_pendiente(
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
  v_intento integer := 0;
  v_tipo public.publicador_tipo;
  v_nombre text;
  v_email text;
  v_foto jsonb;
  v_foto_id uuid;
  v_mime text;
  v_extension text;
  v_tamano bigint;
  v_orden integer;
  v_sha256 text;
  v_total_fotos bigint := 0;
begin
  if p_idempotency_key is null then
    raise exception 'Identificador de idempotencia inválido';
  end if;

  if jsonb_typeof(p_datos) is distinct from 'object' then
    raise exception 'Datos de publicación inválidos';
  end if;

  if octet_length(p_datos::text) > 102400 then
    raise exception 'Los datos de publicación superan el límite permitido';
  end if;

  if jsonb_typeof(p_fotos) is distinct from 'array' then
    raise exception 'Manifiesto de fotografías inválido';
  end if;

  if jsonb_array_length(p_fotos) < 1 or jsonb_array_length(p_fotos) > 6 then
    raise exception 'Manifiesto de fotografías inválido';
  end if;

  if coalesce(p_datos->>'tipoPublicador', '') not in ('dueno', 'corredor') then
    raise exception 'Tipo de publicador inválido';
  end if;

  v_tipo := (p_datos->>'tipoPublicador')::public.publicador_tipo;
  v_nombre := nullif(trim(case when v_tipo = 'corredor'
    then p_datos->>'representanteNombre' else p_datos->>'nombreDueno' end), '');
  v_email := nullif(trim(case when v_tipo = 'corredor'
    then p_datos->>'correoCorredor' else p_datos->>'correoDueno' end), '');

  if v_nombre is null or length(v_nombre) > 200 or
     v_email is null or length(v_email) > 320 or
     v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Nombre y correo de contacto son obligatorios';
  end if;

  if length(coalesce(p_datos->>'titulo_publico', '')) > 160 or
     length(coalesce(p_datos->>'descripcion_publica', '')) > 10000 then
    raise exception 'El contenido público supera el límite permitido';
  end if;

  for v_foto in select value from jsonb_array_elements(p_fotos) loop
    if jsonb_typeof(v_foto) is distinct from 'object' or
       coalesce(v_foto->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
       coalesce(v_foto->>'contenido_sha256', '') !~ '^[0-9a-f]{64}$' or
       coalesce(v_foto->>'tamano_bytes', '') !~ '^[0-9]+$' or
       coalesce(v_foto->>'orden', '') !~ '^[0-9]+$' then
      raise exception 'Manifiesto de fotografías inválido';
    end if;

    v_mime := v_foto->>'mime_type';
    v_tamano := (v_foto->>'tamano_bytes')::bigint;
    v_orden := (v_foto->>'orden')::integer;
    if coalesce(v_mime, '') not in ('image/jpeg', 'image/png', 'image/webp') or
       v_tamano < 1 or v_tamano > 2097152 or
       v_orden < 0 or v_orden >= jsonb_array_length(p_fotos) then
      raise exception 'Manifiesto de fotografías inválido';
    end if;
    v_total_fotos := v_total_fotos + v_tamano;
  end loop;

  if v_total_fotos > 6291456 then
    raise exception 'Las fotografías superan el límite total permitido';
  end if;

  if (select count(distinct value->>'id') from jsonb_array_elements(p_fotos)) <> jsonb_array_length(p_fotos) or
     (select count(distinct value->>'orden') from jsonb_array_elements(p_fotos)) <> jsonb_array_length(p_fotos) then
    raise exception using message = 'MANIFEST_DUPLICATE_ORDER',
      detail = 'El manifiesto contiene UUID u órdenes duplicados';
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
         )
       ) then
      raise exception using message = 'MANIFEST_CONFLICT',
        detail = 'Hash, MIME, tamaño, cantidad, UUID u orden diferentes';
    end if;
    return query select v_id, v_codigo, v_creado;
    return;
  end if;

  loop
    v_intento := v_intento + 1;
    v_codigo := public.generar_codigo_publicacion();
    begin
      insert into public.publicaciones (
        codigo_publico, idempotency_key, estado, tipo_publicador,
        contacto_nombre, contacto_email, contacto_telefono, contacto_organizacion,
        titulo_publico, descripcion_publica, descripcion_origen_privada,
        precio_publicacion, monto_liquido, superficie_m2,
        region, comuna, sector, ubicacion_publica_aproximada,
        latitud_privada, longitud_privada, rol, agua, luz, acceso, topografia,
        naturaleza, cuerpos_agua, servicios, ciudad_principal, distancia_ciudad,
        facilidad_pago, detalle_facilidad_pago, plan_seleccionado,
        modelo_comercial, datos_formulario
      ) values (
        v_codigo, p_idempotency_key, 'pendiente_revision', v_tipo,
        v_nombre, v_email,
        nullif(trim(case when v_tipo = 'corredor' then coalesce(p_datos->>'whatsappCorredor', p_datos->>'telefonoCorredor') else p_datos->>'telefonoDueno' end), ''),
        nullif(trim(p_datos->>'corredoraNombre'), ''),
        coalesce(nullif(trim(p_datos->>'titulo_publico'), ''), 'Publicación pendiente'),
        coalesce(nullif(trim(p_datos->>'descripcion_publica'), ''), 'Descripción pendiente'),
        nullif(p_datos->>'descripcion_origen', ''),
        nullif(p_datos->>'precio', '')::bigint,
        nullif(p_datos->>'montoLiquido', '')::bigint,
        nullif(p_datos->>'superficie', '')::numeric,
        coalesce(nullif(trim(p_datos->>'region'), ''), 'Sin región'),
        coalesce(nullif(trim(p_datos->>'comuna'), ''), 'Sin comuna'),
        coalesce(nullif(trim(p_datos->>'sector'), ''), 'Sin sector'),
        concat_ws(', ', nullif(trim(p_datos->>'sector'), ''), nullif(trim(p_datos->>'comuna'), ''), nullif(trim(p_datos->>'region'), '')),
        nullif(p_datos->>'latitudPrivada', '')::numeric,
        nullif(p_datos->>'longitudPrivada', '')::numeric,
        nullif(p_datos->>'rol', ''), nullif(p_datos->>'agua', ''), nullif(p_datos->>'luz', ''),
        nullif(p_datos->>'acceso', ''), nullif(p_datos->>'topografia', ''),
        case when jsonb_typeof(p_datos->'naturaleza') = 'array' then array(select jsonb_array_elements_text(p_datos->'naturaleza')) else '{}' end,
        case when jsonb_typeof(p_datos->'cuerposAgua') = 'array' then array(select jsonb_array_elements_text(p_datos->'cuerposAgua')) else '{}' end,
        case when jsonb_typeof(p_datos->'servicios') = 'array' then array(select jsonb_array_elements_text(p_datos->'servicios')) else '{}' end,
        nullif(p_datos->>'ciudadPrincipal', ''), nullif(p_datos->>'distanciaCiudad', ''),
        case when p_datos->>'facilidadPago' = 'si' then true when p_datos->>'facilidadPago' = 'no' then false else null end,
        nullif(p_datos->>'detalleFacilidad', ''),
        nullif(coalesce(p_datos->>'planCorredor', p_datos#>>'{commercial,plan}'), ''),
        coalesce(p_datos->'commercial', '{}'::jsonb), p_datos
      ) returning publicaciones.id, publicaciones.creado_en into v_id, v_creado;

      for v_foto in select value from jsonb_array_elements(p_fotos) loop
        v_foto_id := (v_foto->>'id')::uuid;
        v_mime := v_foto->>'mime_type';
        v_tamano := (v_foto->>'tamano_bytes')::bigint;
        v_orden := (v_foto->>'orden')::integer;
        v_sha256 := v_foto->>'contenido_sha256';
        v_extension := case v_mime
          when 'image/jpeg' then 'jpg'
          when 'image/png' then 'png'
          when 'image/webp' then 'webp'
        end;

        insert into public.publicacion_fotos (
          id, publicacion_id, bucket_id, storage_path, nombre_original,
          mime_type, tamano_bytes, contenido_sha256, orden, es_portada
        ) values (
          v_foto_id, v_id, 'publicaciones-pendientes',
          v_id::text || '/' || v_foto_id::text || '.' || v_extension,
          'foto-' || (v_orden + 1)::text || '.' || v_extension,
          v_mime, v_tamano, v_sha256, v_orden, v_orden = 0
        );
      end loop;

      return query select v_id, v_codigo, v_creado;
      return;
    exception when unique_violation then
      -- Si otra solicitud con la misma clave ganó la carrera, devuelve solo
      -- sus identificadores seguros. Si chocó el código aleatorio, reintenta.
      select p.id, p.codigo_publico, p.creado_en
        into v_id, v_codigo, v_creado
      from public.publicaciones p
      where p.idempotency_key = p_idempotency_key;

      if found then
        return query
          select * from public.crear_publicacion_pendiente(p_datos, p_idempotency_key, p_fotos);
        return;
      end if;

      if v_intento >= 10 then raise; end if;
    end;
  end loop;
end;
$$;

-- Evita la ventana de ejecución implícita que PostgreSQL concede a PUBLIC al
-- crear funciones. La tercera migración concede acceso solo a service_role.
revoke all on function public.crear_publicacion_pendiente(jsonb, uuid, jsonb) from public;


-- Source: 202607130002_crear_storage_publicaciones.sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'publicaciones-pendientes',
  'publicaciones-pendientes',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- Source: 202607130003_crear_politicas_rls.sql
alter table public.publicaciones enable row level security;
alter table public.publicacion_borradores enable row level security;
alter table public.publicacion_fotos enable row level security;
alter table public.moderacion_registros enable row level security;

revoke all on public.publicaciones from anon, authenticated;
revoke all on public.publicacion_borradores from anon, authenticated;
revoke all on public.publicacion_fotos from anon, authenticated;
revoke all on public.moderacion_registros from anon, authenticated;
revoke all on storage.objects from anon, authenticated;

-- No se crea ninguna política para anon/authenticated. El navegador no puede
-- insertar, listar, actualizar ni borrar filas. La Edge Function usa su cliente
-- servidor exclusivamente después de validar todo el multipart/form-data.

revoke all on function public.actualizar_timestamp() from public;
revoke all on function public.generar_codigo_publicacion() from public;
revoke all on function public.crear_publicacion_pendiente(jsonb, uuid, jsonb) from public;

grant execute on function public.crear_publicacion_pendiente(jsonb, uuid, jsonb) to service_role;

-- No se crea ninguna política sobre storage.objects para anon/authenticated.
-- Por tanto la publishable/anon key no puede INSERT, SELECT, UPDATE ni DELETE.
-- La única escritura la realiza la Edge Function con credencial secreta del
-- runtime, usando una ruta generada en servidor: <publicacion_uuid>/<foto_uuid>.<ext>.


-- Source: 202607130004_ampliar_fotografias_publicaciones.sql
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


-- Source: 202607130005_analisis_visual_planes_superiores.sql
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

create table if not exists public.publicacion_ia_entitlements (
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

create table if not exists public.publicacion_analisis_visual (
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


-- Source: 202607130006_preparar_estados_crm.sql
-- El valor se agrega en una migración independiente. PostgreSQL no permite
-- utilizar de forma segura un valor enum nuevo dentro de la misma transacción.
alter type public.publicacion_estado add value if not exists 'requiere_cambios';


-- Source: 202607130007_crear_base_crm_moderacion.sql
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tipo text not null,
  activo boolean not null default false,
  nombre text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint profiles_tipo_valido check (tipo in ('administrador')),
  constraint profiles_nombre_valido check (length(trim(nombre)) between 2 and 160)
);

alter table public.publicaciones
  add column publicada_en timestamptz,
  add column moderada_en timestamptz,
  add column moderada_por uuid references public.profiles(id) on delete set null,
  add column version_actual integer not null default 1 check (version_actual > 0);

alter table public.moderacion_registros
  add column accion text not null default 'legado',
  add column categoria text,
  add column campos_correccion text[] not null default '{}',
  add column mensaje_personalizado text,
  add column administrador_id uuid references public.profiles(id) on delete restrict,
  add constraint moderacion_accion_valida check (
    accion in ('legado','aprobar','solicitar_correcciones','rechazar','revertir_rechazo','reenvio_corredor')
  ),
  add constraint moderacion_campos_sin_nulos check (array_position(campos_correccion, null) is null);

create table if not exists public.publicacion_versiones (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete restrict,
  version integer not null check (version > 0),
  origen text not null,
  datos jsonb not null,
  creado_por uuid references public.profiles(id) on delete set null,
  creado_en timestamptz not null default now(),
  constraint publicacion_versiones_origen_valido check (
    origen in ('recepcion','moderacion','correccion_corredor')
  ),
  constraint publicacion_versiones_publicacion_version_unique unique (publicacion_id, version)
);

create table if not exists public.publicacion_correccion_accesos (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete restrict,
  token_hash text not null unique,
  campos_permitidos text[] not null,
  creado_por uuid not null references public.profiles(id) on delete restrict,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null,
  utilizado_en timestamptz,
  revocado_en timestamptz,
  constraint correccion_token_hash_valido check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint correccion_campos_requeridos check (cardinality(campos_permitidos) > 0),
  constraint correccion_expiracion_valida check (expira_en > creado_en)
);

create table if not exists public.notificacion_cola (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete restrict,
  tipo text not null,
  destinatario_email text not null,
  payload jsonb not null default '{}'::jsonb,
  estado text not null default 'pendiente',
  intentos integer not null default 0,
  proveedor text,
  proveedor_id text,
  ultimo_error_codigo text,
  creado_en timestamptz not null default now(),
  procesado_en timestamptz,
  constraint notificacion_tipo_valido check (
    tipo in ('recepcion','aprobacion','solicitud_correcciones','rechazo','correccion_recibida')
  ),
  constraint notificacion_estado_valido check (estado in ('pendiente','procesando','enviado','fallido')),
  constraint notificacion_email_valido check (
    length(destinatario_email) <= 320 and destinatario_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint notificacion_intentos_valido check (intentos between 0 and 20)
);

create index profiles_admin_activo_idx on public.profiles (activo, tipo);
create index publicaciones_crm_bandeja_idx on public.publicaciones (estado, creado_en, actualizado_en);
create index publicaciones_crm_filtros_idx on public.publicaciones (comuna, plan_seleccionado, tipo_publicador);
create index publicacion_versiones_historial_idx on public.publicacion_versiones (publicacion_id, version desc);
create index correccion_accesos_publicacion_idx on public.publicacion_correccion_accesos (publicacion_id, creado_en desc);
create index notificacion_cola_estado_idx on public.notificacion_cola (estado, creado_en);

alter table public.profiles enable row level security;
alter table public.publicacion_versiones enable row level security;
alter table public.publicacion_correccion_accesos enable row level security;
alter table public.notificacion_cola enable row level security;

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.publicacion_versiones from public, anon, authenticated;
revoke all on public.publicacion_correccion_accesos from public, anon, authenticated;
revoke all on public.notificacion_cola from public, anon, authenticated;

create or replace function public.crm_actualizar_profile_timestamp()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger profiles_actualizar_timestamp
before update on public.profiles
for each row execute function public.crm_actualizar_profile_timestamp();

create or replace function public.crm_bloquear_mutacion_auditoria()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception using message = 'AUDIT_LOG_IMMUTABLE';
end;
$$;

create trigger moderacion_registros_inmutables
before update or delete on public.moderacion_registros
for each row execute function public.crm_bloquear_mutacion_auditoria();

create or replace function public.crm_registrar_recepcion()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.publicacion_versiones (
    publicacion_id, version, origen, datos
  ) values (
    new.id, new.version_actual, 'recepcion', to_jsonb(new)
  );

  insert into public.notificacion_cola (
    publicacion_id, tipo, destinatario_email, payload
  ) values (
    new.id,
    'recepcion',
    new.contacto_email,
    jsonb_build_object('codigo_publico', new.codigo_publico, 'estado', new.estado)
  );
  return new;
end;
$$;

create trigger publicaciones_registrar_recepcion
after insert on public.publicaciones
for each row execute function public.crm_registrar_recepcion();

revoke all on function public.crm_actualizar_profile_timestamp() from public, anon, authenticated;
revoke all on function public.crm_bloquear_mutacion_auditoria() from public, anon, authenticated;
revoke all on function public.crm_registrar_recepcion() from public, anon, authenticated;


-- Source: 202607130008_crear_rpc_politicas_crm.sql
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


-- Source: 202607130009_control_admin_planes_ia.sql
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


-- Source: 202607160002_sprint_1_core.sql
-- 1. Tabla Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    nombre text NOT NULL,
    apellido text,
    correo text UNIQUE,
    telefono text,
    whatsapp text,
    comuna text,
    region text,
    medio_contacto_preferido text,
    presupuesto_estimado numeric,
    observaciones text,
    acepta_tratamiento_datos bool DEFAULT false,
    estado text DEFAULT 'nuevo',
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

-- 2. Tabla Casas
CREATE TABLE IF NOT EXISTS public.casas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo text UNIQUE,
    nombre text NOT NULL,
    descripcion text,
    superficie_m2 numeric NOT NULL,
    habitaciones int4 NOT NULL,
    banos int4 NOT NULL,
    precio_base numeric NOT NULL,
    tipo_construccion text,
    plano_url text,
    imagen_principal_url text,
    imagenes jsonb DEFAULT '[]'::jsonb,
    activa bool DEFAULT true,
    destacada bool DEFAULT false,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

-- 3. Tabla Extras
CREATE TABLE IF NOT EXISTS public.extras (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo text UNIQUE,
    nombre text NOT NULL,
    descripcion text,
    categoria text NOT NULL,
    tipo_calculo text NOT NULL,
    precio_base numeric NOT NULL,
    unidad text,
    activo bool DEFAULT true,
    requiere_contratista bool DEFAULT false,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

-- 4. Tabla Proyectos
CREATE TABLE IF NOT EXISTS public.proyectos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_proyecto text UNIQUE,
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
    parcela_id uuid REFERENCES public.publicaciones(id) ON DELETE SET NULL,
    casa_id uuid REFERENCES public.casas(id) ON DELETE SET NULL,
    modalidad text NOT NULL DEFAULT 'llave_en_mano',
    estado text NOT NULL DEFAULT 'cotizacion_enviada',
    subtotal numeric NOT NULL DEFAULT 0,
    descuentos numeric NOT NULL DEFAULT 0,
    total numeric NOT NULL DEFAULT 0,
    fecha_inicio_estimada date,
    origen text,
    observaciones_cliente text,
    observaciones_internas text,
    activado_en timestamptz,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

-- 5. Tabla Proyecto Items
CREATE TABLE IF NOT EXISTS public.proyecto_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE CASCADE,
    tipo text NOT NULL,
    referencia_id text, -- Usamos text para soportar IDs legacy o UUIDs sin constrain duro
    nombre text NOT NULL,
    descripcion text,
    cantidad numeric NOT NULL DEFAULT 1,
    unidad text,
    precio_unitario numeric NOT NULL DEFAULT 0,
    subtotal numeric NOT NULL DEFAULT 0,
    datos_snapshot jsonb DEFAULT '{}'::jsonb,
    orden int4 DEFAULT 0,
    creado_en timestamptz DEFAULT now()
);

-- Secuencia para Nro de Proyecto
CREATE SEQUENCE IF NOT EXISTS proyectos_numero_seq START 1;

CREATE OR REPLACE FUNCTION generar_numero_proyecto()
RETURNS trigger AS $$
BEGIN
    IF NEW.numero_proyecto IS NULL THEN
        NEW.numero_proyecto := 'TPL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('proyectos_numero_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generar_numero_proyecto ON public.proyectos;
CREATE TRIGGER tr_generar_numero_proyecto
BEFORE INSERT ON public.proyectos
FOR EACH ROW
EXECUTE FUNCTION generar_numero_proyecto();

-- Privilegios y RLS
GRANT SELECT, INSERT, UPDATE ON public.clientes TO anon;
GRANT SELECT, INSERT ON public.proyectos TO anon;
GRANT SELECT, INSERT ON public.proyecto_items TO anon;

GRANT ALL ON public.clientes TO authenticated;
GRANT ALL ON public.casas TO authenticated;
GRANT ALL ON public.extras TO authenticated;
GRANT ALL ON public.proyectos TO authenticated;
GRANT ALL ON public.proyecto_items TO authenticated;

-- Grant usage on sequences so anon can insert to proyectos
GRANT USAGE ON SEQUENCE proyectos_numero_seq TO anon;
GRANT USAGE ON SEQUENCE proyectos_numero_seq TO authenticated;

GRANT SELECT ON public.casas TO anon;
GRANT SELECT ON public.extras TO anon;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_items ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Anon puede interactuar con clientes" ON public.clientes;
CREATE POLICY "Anon puede interactuar con clientes" ON public.clientes FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon puede insertar proyectos" ON public.proyectos;
CREATE POLICY "Anon puede insertar proyectos" ON public.proyectos FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon puede leer su propio proyecto recien creado" ON public.proyectos;
CREATE POLICY "Anon puede leer su propio proyecto recien creado" ON public.proyectos FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon puede insertar proyecto_items" ON public.proyecto_items;
CREATE POLICY "Anon puede insertar proyecto_items" ON public.proyecto_items FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura publica de casas" ON public.casas;
CREATE POLICY "Lectura publica de casas" ON public.casas FOR SELECT TO anon USING (activa = true);

DROP POLICY IF EXISTS "Lectura publica de extras" ON public.extras;
CREATE POLICY "Lectura publica de extras" ON public.extras FOR SELECT TO anon USING (activo = true);

-- Políticas Admin
DROP POLICY IF EXISTS "Admin clientes" ON public.clientes;
CREATE POLICY "Admin clientes" ON public.clientes TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin casas" ON public.casas;
CREATE POLICY "Admin casas" ON public.casas TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin extras" ON public.extras;
CREATE POLICY "Admin extras" ON public.extras TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin proyectos" ON public.proyectos;
CREATE POLICY "Admin proyectos" ON public.proyectos TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin proyecto_items" ON public.proyecto_items;
CREATE POLICY "Admin proyecto_items" ON public.proyecto_items TO authenticated USING (true);

-- Función RPC para insertar todo de una vez desde la web
CREATE OR REPLACE FUNCTION crear_proyecto_completo(
  p_cliente_nombre text,
  p_cliente_email text,
  p_cliente_telefono text,
  p_parcela_id uuid,
  p_casa_codigo text,
  p_total numeric,
  p_extras jsonb
) RETURNS text AS $$
DECLARE
  v_cliente_id uuid;
  v_proyecto_id uuid;
  v_numero_proyecto text;
  v_casa_id uuid;
  v_extra jsonb;
BEGIN
  -- 1. Buscar o crear cliente (por email)
  SELECT id INTO v_cliente_id FROM public.clientes WHERE correo = p_cliente_email LIMIT 1;
  IF v_cliente_id IS NULL THEN
    INSERT INTO public.clientes (nombre, correo, telefono, estado)
    VALUES (p_cliente_nombre, p_cliente_email, p_cliente_telefono, 'nuevo')
    RETURNING id INTO v_cliente_id;
  END IF;

  -- Buscar uuid de la casa a partir del codigo
  IF p_casa_codigo IS NOT NULL THEN
    SELECT id INTO v_casa_id FROM public.casas WHERE codigo = p_casa_codigo LIMIT 1;
  END IF;

  -- 2. Crear Proyecto
  INSERT INTO public.proyectos (cliente_id, parcela_id, casa_id, total, estado, modalidad)
  VALUES (v_cliente_id, p_parcela_id, v_casa_id, p_total, 'cotizacion_enviada', 'llave_en_mano')
  RETURNING id, numero_proyecto INTO v_proyecto_id, v_numero_proyecto;

  -- 3. Crear Items
  -- 3.1 Parcela
  IF p_parcela_id IS NOT NULL THEN
    INSERT INTO public.proyecto_items (proyecto_id, tipo, referencia_id, nombre, cantidad)
    VALUES (v_proyecto_id, 'parcela', p_parcela_id::text, 'Parcela seleccionada', 1);
  END IF;

  -- 3.2 Casa
  IF v_casa_id IS NOT NULL THEN
    INSERT INTO public.proyecto_items (proyecto_id, tipo, referencia_id, nombre, cantidad)
    VALUES (v_proyecto_id, 'casa', v_casa_id::text, 'Casa seleccionada', 1);
  END IF;

  -- 3.3 Extras
  IF p_extras IS NOT NULL AND jsonb_array_length(p_extras) > 0 THEN
    FOR v_extra IN SELECT * FROM jsonb_array_elements(p_extras)
    LOOP
      INSERT INTO public.proyecto_items (proyecto_id, tipo, referencia_id, nombre, cantidad, precio_unitario)
      VALUES (
        v_proyecto_id, 
        'extra', 
        v_extra->>'id', 
        v_extra->>'nombre', 
        COALESCE((v_extra->>'cantidad')::numeric, 1),
        COALESCE((v_extra->>'precio')::numeric, 0)
      );
    END LOOP;
  END IF;

  RETURN v_numero_proyecto;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION crear_proyecto_completo(text, text, text, uuid, text, numeric, jsonb) TO anon;


-- Source: 202607160003_migracion_catalogos_data.sql
-- MIGRACIÓN CATÁLOGO DE CASAS Y EXTRAS

-- === INSERCIÓN DE CASAS ===

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura18',
  'Casa prefabricada 18m²',
  null,
  18,
  1,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp","image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura24',
  'Casa prefabricada 24m²',
  null,
  24,
  2,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp","image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura36',
  'Casa prefabricada 36m²',
  null,
  36,
  2,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura42',
  'Casa prefabricada 42m²',
  null,
  42,
  3,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura48',
  'Casa prefabricada 48m²',
  null,
  48,
  3,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/medianas/48_caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura54',
  'Casa prefabricada 48m²',
  null,
  54,
  3,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_render.webp","image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura72',
  'Casa prefabricada 72m²',
  null,
  72,
  3,
  2,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/medianas/72_2a_render.webp","image/casas/pre_fabricadas/36mts2/medianas/72_2a_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura84_1',
  'Casa prefabricada 82mts2,',
  null,
  84,
  4,
  2,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp","image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura84_2',
  'Casa prefabricada 84mts2 de 6 aguas,',
  null,
  84,
  4,
  2,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura108',
  'Casa prefabricada 108mts2 de 6 aguas,',
  null,
  108,
  6,
  2,
  undefined,
  'Modular',
  'image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp',
  null,
  '["image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp","image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura120',
  'Casa prefabricada 120mts2 de 6 aguas,',
  null,
  120,
  6,
  2,
  undefined,
  'Modular',
  'image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp',
  null,
  '["image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'Innova18',
  'Casa Moderna madera full 18mts2,',
  null,
  18,
  1,
  1,
  undefined,
  'Modular',
  'image/casas/pro/innova/innova_1_habitacion_plano.webp',
  null,
  '["image/casas/pro/innova/innova_1_habitacion_foto.webp","image/casas/pro/innova/innova_1_habitacion_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'Innova54',
  'Casa Moderna completa full 54mts2,',
  null,
  54,
  3,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pro/innova/innova_3_habitaciones_foto_1.webp","image/casas/pro/innova/innova_3_habitaciones_foto_2.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'Nogal72',
  'Casa Moderna completa full 72mts2,',
  null,
  72,
  3,
  2,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pro/nogales/Alfa_72_mt2_.webp","image/casas/pro/nogales/Alfa_72_mt2_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

-- === INSERCIÓN DE EXTRAS ===

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'Instalacion_+_base_pilotes_madera',
  'Instalación Pilotes de madera + Casa Full',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'Instalacion_+_base_radier',
  'Instalación radier y Casa Full',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'Instalacion completa radier + llave en mano full + piso ceramico',
  'Instalacion completa llave en mano full',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'Instalacion_electrica',
  'Instalación eléctrica incl/materiales',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'piso ceramico',
  'Instalación piso cerámico incl/materiales',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'pintura',
  'Servicio pintura con materiales',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'instalacion_sanitaria',
  'Instalación sanitaria incl/materiales',
  'Red sanitaria interior referencial según modelo de casa.',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'artefactos_cocina',
  'Artefactos cocina',
  'Kit referencial de artefactos de cocina según disponibilidad.',
  'general',
  'unidad',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'artefactos_bano',
  'Artefactos baño',
  'Artefactos sanitarios básicos para baño.',
  'general',
  'unidad',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'fosa_septica',
  'Fosa séptica con instalación precio referencial estimado',
  'Instalación de fosa y kit de drenaje',
  'general',
  'unidad',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'pozo_profundo',
  'Pozo profundo según profundidad',
  'Excavación de pozo de agua potable',
  'general',
  'metro',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'cierre_perimetral',
  'Cerco de alambre de púas según perímetro de la parcela',
  'Cercado perimetral estimado desde los m² de la parcela seleccionada.',
  'general',
  'metro',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'porton',
  'Portón acceso',
  'Portón de madera/fierro para acceso principal',
  'general',
  'unidad',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'empalme_electrico',
  'Empalme eléctrico',
  'Acometida y poste para conexión a red eléctrica',
  'general',
  'unidad',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'maquinaria',
  'Maquinaria retroescavadora',
  'Horas de retroexcavadora/nivelación',
  'general',
  'hora',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'piscina',
  'Piscina',
  'Construcción de piscina de hormigón/fibra',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'quincho',
  'Quincho',
  'Quincho premium de asados techado',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'terraza',
  'Terraza',
  'Terraza exterior en madera impregnada',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;


-- Source: 202607160004_sprint_2_contratistas.sql
-- Migración Sprint 2: Smart Match Contratistas

-- 1. Tabla de Contratistas
CREATE TABLE IF NOT EXISTS public.contratistas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_empresa TEXT NOT NULL,
    telefono TEXT NOT NULL,
    ubicacion_base TEXT,
    calificacion TEXT,
    precio_radier TEXT,
    precio_kit_basico TEXT,
    precio_llave_en_mano TEXT,
    notas_capacidades TEXT,
    estado TEXT DEFAULT 'disponible',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para contratistas
ALTER TABLE public.contratistas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública contratistas" ON public.contratistas;
CREATE POLICY "Lectura pública contratistas" ON public.contratistas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin contratistas" ON public.contratistas;
CREATE POLICY "Admin contratistas" ON public.contratistas USING (true) WITH CHECK (true);

-- 2. Tabla de Asignaciones (Match)
CREATE TABLE IF NOT EXISTS public.asignaciones_proyectos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE CASCADE,
    contratista_id UUID REFERENCES public.contratistas(id) ON DELETE CASCADE,
    estado TEXT DEFAULT 'pendiente', -- pendiente, aceptado, rechazado, finalizado
    notas_seguimiento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para asignaciones
ALTER TABLE public.asignaciones_proyectos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública asignaciones" ON public.asignaciones_proyectos;
CREATE POLICY "Lectura pública asignaciones" ON public.asignaciones_proyectos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin asignaciones" ON public.asignaciones_proyectos;
CREATE POLICY "Admin asignaciones" ON public.asignaciones_proyectos USING (true) WITH CHECK (true);


-- Source: 202607160005_migracion_publicaciones_parcela.sql
-- 1. Tabla de Publicaciones
create table if not exists public.publicaciones_parcela (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references auth.users(id),
    tipo_publicador text,
    estado text default 'borrador',
    schema_version int default 1,
    descripcion_origen text,
    descripcion_publica text,
    titulo_publico text,
    datos_parcela jsonb default '{}'::jsonb,
    datos_publicador jsonb default '{}'::jsonb,
    modelo_comercial text,
    plan_corredor text,
    monto_liquido numeric,
    porcentaje_servicio numeric,
    monto_servicio numeric,
    precio_publicacion numeric,
    publicacion_enviada_en timestamptz,
    creada_en timestamptz default now(),
    actualizada_en timestamptz default now()
);

-- 2. Imágenes de la Publicación
create table if not exists public.publicacion_imagenes (
    id uuid primary key default gen_random_uuid(),
    publicacion_id uuid references public.publicaciones_parcela(id) on delete cascade,
    usuario_id uuid references auth.users(id),
    storage_path text not null,
    nombre_original text,
    mime_type text,
    tamano_bytes bigint,
    orden int default 0,
    es_portada bool default false,
    estado text default 'activa',
    creada_en timestamptz default now()
);

-- 3. Tabla Corredores
create table if not exists public.corredores (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid unique references auth.users(id) on delete cascade,
    nombre_corredora text not null,
    representante text,
    correo text not null,
    telefono text,
    whatsapp text,
    anos_experiencia int,
    rut text,
    sitio_web text,
    red_social text,
    logo_path text,
    presentacion text,
    plan_actual text default 'Inicio',
    puntuacion_promedio numeric default 0,
    cantidad_evaluaciones int default 0,
    tiempo_respuesta_categoria text,
    nivel_tpl text,
    estado text default 'activo',
    creado_en timestamptz default now(),
    actualizado_en timestamptz default now()
);

-- 4. Planes Corredor
create table if not exists public.planes_corredor (
    id uuid primary key default gen_random_uuid(),
    nombre_plan text unique not null,
    precio numeric not null,
    limite_publicaciones int not null,
    beneficios jsonb default '[]'::jsonb,
    activo bool default true
);

INSERT INTO public.planes_corredor (nombre_plan, precio, limite_publicaciones, beneficios) VALUES
('Inicio', 0, 1, '["1 publicación básica"]'::jsonb),
('Profesional', 47000, 5, '["5 publicaciones", "Soporte email"]'::jsonb),
('Gold', 78900, 10, '["10 publicaciones", "Destacados"]'::jsonb),
('Platinum', 120000, 20, '["20 publicaciones", "IA Premium"]'::jsonb);

-- 5. Aceptaciones
create table if not exists public.aceptaciones_publicacion (
    id uuid primary key default gen_random_uuid(),
    publicacion_id uuid references public.publicaciones_parcela(id) on delete cascade,
    usuario_id uuid references auth.users(id),
    tipo_aceptacion text not null,
    version int,
    texto_hash text,
    datos_evidencia jsonb,
    fecha timestamptz default now()
);

-- 6. Historial (Logs inmutables)
create table if not exists public.historial_publicacion (
    id uuid primary key default gen_random_uuid(),
    publicacion_id uuid references public.publicaciones_parcela(id) on delete cascade,
    usuario_id uuid references auth.users(id),
    tipo_evento text not null,
    titulo text,
    detalle text,
    datos jsonb default '{}'::jsonb,
    fecha timestamptz default now()
);

-- =========== FASE 2: RLS Y POLÍTICAS =========== --

ALTER TABLE public.publicaciones_parcela ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacion_imagenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corredores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes_corredor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aceptaciones_publicacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_publicacion ENABLE ROW LEVEL SECURITY;

-- Funciones de ayuda
CREATE OR REPLACE FUNCTION es_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT false; 
$$;

-- Políticas de lectura
CREATE POLICY "Dueño lee su publicación" ON public.publicaciones_parcela FOR SELECT USING (usuario_id = auth.uid() OR es_admin());
CREATE POLICY "Lectura pública parcelas aprobadas" ON public.publicaciones_parcela FOR SELECT USING (estado IN ('aprobada', 'publicada', 'vendida'));
CREATE POLICY "Lectura planes" ON public.planes_corredor FOR SELECT USING (true);

-- Políticas de escritura (Publicaciones)
CREATE POLICY "Crear solicitud propia" ON public.publicaciones_parcela FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "Actualizar solicitud propia en borrador" ON public.publicaciones_parcela FOR UPDATE USING (usuario_id = auth.uid() AND estado IN ('borrador', 'requiere_cambios')) WITH CHECK (usuario_id = auth.uid() AND estado IN ('borrador', 'requiere_cambios', 'pendiente_revision'));

-- Políticas (Corredores)
CREATE POLICY "Dueño administra su perfil" ON public.corredores FOR ALL USING (usuario_id = auth.uid() OR es_admin());

-- Políticas (Imágenes)
CREATE POLICY "Dueño sube imágenes" ON public.publicacion_imagenes FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "Dueño gestiona imágenes" ON public.publicacion_imagenes FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY "Dueño borra imágenes" ON public.publicacion_imagenes FOR DELETE USING (usuario_id = auth.uid());
CREATE POLICY "Lectura pública imágenes" ON public.publicacion_imagenes FOR SELECT USING (true);


-- Source: 202607170001_seguridad_roles.sql
-- Habilitar RLS en tablas Core del CRM y Cotizador
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicaciones_parcela ENABLE ROW LEVEL SECURITY;

-- Permitir inserciones anónimas en publicaciones_parcela
ALTER TABLE public.publicaciones_parcela ALTER COLUMN usuario_id DROP NOT NULL;
CREATE POLICY "Public insert publicaciones_parcela" ON public.publicaciones_parcela
    FOR INSERT WITH CHECK (true);


-- 1. Políticas para tabla CASAS (Catálogo)
-- Público puede leer casas activas
CREATE POLICY "Public read active casas" ON public.casas
    FOR SELECT USING (activa = true);
-- Admin (service_role o autenticado con rol especial) puede hacer todo
CREATE POLICY "Admin full access casas" ON public.casas
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- 2. Políticas para tabla EXTRAS
CREATE POLICY "Public read active extras" ON public.extras
    FOR SELECT USING (activo = true);
CREATE POLICY "Admin full access extras" ON public.extras
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- 3. Políticas para tabla CLIENTES
-- Público puede insertar (al llenar formulario de visita o cotización)
CREATE POLICY "Public insert clientes" ON public.clientes
    FOR INSERT WITH CHECK (true);
-- Cliente autenticado puede ver sus propios datos
CREATE POLICY "User read own cliente" ON public.clientes
    FOR SELECT USING (auth.uid() = usuario_id);
-- Admin puede ver y editar todo
CREATE POLICY "Admin full access clientes" ON public.clientes
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- 4. Políticas para tabla PROYECTOS (Cotizaciones guardadas/activadas)
-- Público puede insertar
CREATE POLICY "Public insert proyectos" ON public.proyectos
    FOR INSERT WITH CHECK (true);
-- Si el proyecto tiene un cliente asociado a un auth.uid, ese usuario puede verlo
CREATE POLICY "User read own proyectos" ON public.proyectos
    FOR SELECT USING (
        cliente_id IN (SELECT id FROM public.clientes WHERE usuario_id = auth.uid())
    );
CREATE POLICY "Admin full access proyectos" ON public.proyectos
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- 5. Políticas para tabla PROYECTO_ITEMS
CREATE POLICY "Public insert proyecto_items" ON public.proyecto_items
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access proyecto_items" ON public.proyecto_items
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- 6. Políticas para tabla VISITAS
CREATE POLICY "Public insert visitas" ON public.visitas
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access visitas" ON public.visitas
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- Revocar accesos peligrosos por defecto si existieran
REVOKE UPDATE, DELETE ON public.clientes FROM anon;
REVOKE UPDATE, DELETE ON public.proyectos FROM anon;
REVOKE UPDATE, DELETE ON public.visitas FROM anon;


-- Source: 202607170002_lanzamiento_comercial.sql
-- Capa comercial de lanzamiento: embudo, eventos sin PII, tareas y scoring explicable.
alter table public.clientes add column if not exists score integer not null default 0;
alter table public.clientes add column if not exists prioridad text not null default 'Sin actividad';
alter table public.clientes add column if not exists etapa text not null default 'visitante';
alter table public.clientes add column if not exists etapa_ingresada_en timestamptz not null default now();
alter table public.clientes add column if not exists ultimo_contacto_en timestamptz;
alter table public.clientes add column if not exists ultima_interaccion_en timestamptz not null default now();
alter table public.clientes add column if not exists origen text;
alter table public.clientes add column if not exists urgencia text;
alter table public.clientes add column if not exists motivo_perdida text;
alter table public.clientes add column if not exists score_detalle jsonb not null default '{}'::jsonb;

create table if not exists public.crm_eventos (
  id bigint generated always as identity primary key,
  evento text not null,
  etapa text,
  cliente_id uuid references public.clientes(id) on delete set null,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  publicacion_id uuid references public.publicaciones(id) on delete set null,
  origen text,
  pagina text,
  metadata jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  constraint crm_eventos_sin_pii check (not (metadata ?| array['nombre','correo','email','telefono','phone','rut','direccion','notas','mensaje']))
);


create table if not exists public.crm_configuracion (
  clave text primary key,
  valor_numero numeric,
  descripcion text not null,
  actualizado_en timestamptz not null default now()
);
insert into public.crm_configuracion(clave,valor_numero,descripcion) values
  ('nuevo_interesado_horas',0,'Plazo para contactar un nuevo interesado'),
  ('consulta_sin_respuesta_horas',24,'Plazo para alertar una consulta no revisada'),
  ('cotizacion_sin_activar_dias',2,'Plazo para seguir una cotización sin activar'),
  ('visita_recordatorio_previo_dias',1,'Recordatorio anterior a una visita'),
  ('visita_seguimiento_post_dias',1,'Seguimiento posterior a una visita')
on conflict (clave) do nothing;
alter table public.crm_configuracion enable row level security;
drop policy if exists "Administradores gestionan configuracion comercial" on public.crm_configuracion;
create policy "Administradores gestionan configuracion comercial" on public.crm_configuracion for all to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.tipo='administrador' and p.activo)) with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.tipo='administrador' and p.activo));
grant select,update on public.crm_configuracion to authenticated;

create or replace function public.crm_metadata_evento_segura(p_metadata jsonb)
returns boolean language sql immutable as $$
  select coalesce(bool_and(key = any(array['parcela_id','parcela_codigo','casa_id','casa_codigo','extra_codigo','tipo_constructivo','origen','paso','resultado','motivo','valor','filtros_activos','duracion_segundos','publicacion_id','fecha_visita'])),true)
  from jsonb_object_keys(coalesce(p_metadata,'{}'::jsonb)) key;
$$;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='crm_eventos_metadata_permitida') then
    alter table public.crm_eventos add constraint crm_eventos_metadata_permitida check (public.crm_metadata_evento_segura(metadata));
  end if;
end $$;
create table if not exists public.crm_tareas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  estado text not null default 'pendiente',
  prioridad text not null default 'media',
  vence_en timestamptz,
  origen_evento_id bigint references public.crm_eventos(id) on delete set null,
  resuelta_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (tipo, cliente_id, proyecto_id, origen_evento_id)
);

create index if not exists crm_eventos_fecha_idx on public.crm_eventos (creado_en desc);
create index if not exists crm_eventos_embudo_idx on public.crm_eventos (etapa, creado_en desc);
create index if not exists crm_tareas_pendientes_idx on public.crm_tareas (estado, vence_en);
create index if not exists clientes_embudo_idx on public.clientes (etapa, etapa_ingresada_en);

alter table public.crm_eventos enable row level security;
alter table public.crm_tareas enable row level security;
drop policy if exists "Publico registra eventos comerciales sin PII" on public.crm_eventos;
create policy "Publico registra eventos comerciales sin PII" on public.crm_eventos for insert to anon, authenticated with check (cliente_id is null and proyecto_id is null and publicacion_id is null and evento = any(array['parcela_view','filtros_usados','mapa_abierto','whatsapp_click','cotizador_iniciado','casa_seleccionada','tipo_constructivo_seleccionado','extra_seleccionado','cotizacion_guardada','pdf_generado','publicacion_iniciada','publicacion_finalizada']) and public.crm_metadata_evento_segura(metadata));
drop policy if exists "Administradores leen eventos comerciales" on public.crm_eventos;
create policy "Administradores leen eventos comerciales" on public.crm_eventos for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.tipo = 'administrador' and p.activo));
drop policy if exists "Administradores gestionan eventos comerciales" on public.crm_eventos;
create policy "Administradores gestionan eventos comerciales" on public.crm_eventos for all to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.tipo='administrador' and p.activo)) with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.tipo='administrador' and p.activo));
drop policy if exists "Administradores gestionan tareas" on public.crm_tareas;
create policy "Administradores gestionan tareas" on public.crm_tareas for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.tipo = 'administrador' and p.activo)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.tipo = 'administrador' and p.activo));
grant insert on public.crm_eventos to anon, authenticated;
grant usage, select on sequence public.crm_eventos_id_seq to anon, authenticated;
grant select, insert, update on public.crm_tareas to authenticated;

create or replace function public.crm_procesar_evento_lanzamiento() returns trigger language plpgsql security definer set search_path = public as $$
declare v_etapa text; v_titulo text; v_tipo text; v_vence timestamptz; v_prioridad text := 'media'; v_plazo numeric; v_fecha_visita timestamptz;
begin
  v_etapa := coalesce(new.etapa, case new.evento when 'parcela_view' then 'vio_parcela' when 'informacion_solicitada' then 'solicito_informacion' when 'visita_solicitada' then 'solicito_visita' when 'cotizador_iniciado' then 'inicio_cotizacion' when 'cotizacion_guardada' then 'guardo_cotizacion' when 'proyecto_activado' then 'activo_proyecto' when 'contacto_registrado' then 'contactado' when 'negociacion_iniciada' then 'negociando' when 'oportunidad_ganada' then 'cerro' when 'oportunidad_perdida' then 'abandono' else null end);
  if new.cliente_id is not null and v_etapa is not null then update public.clientes set etapa=v_etapa, etapa_ingresada_en=case when etapa is distinct from v_etapa then now() else etapa_ingresada_en end, ultima_interaccion_en=now(), origen=coalesce(origen,new.origen), actualizado_en=now() where id=new.cliente_id; end if;
  case new.evento when 'informacion_solicitada' then v_tipo:='contactar_nuevo'; v_titulo:='Contactar nuevo interesado'; v_vence:=now(); v_prioridad:='alta'; when 'visita_solicitada' then v_tipo:='confirmar_visita'; v_titulo:='Confirmar visita solicitada'; v_vence:=now(); v_prioridad:='alta'; when 'cotizacion_guardada' then select valor_numero into v_plazo from public.crm_configuracion where clave='cotizacion_sin_activar_dias'; v_tipo:='seguir_cotizacion'; v_titulo:='Revisar cotización sin activar'; v_vence:=now()+make_interval(days=>coalesce(v_plazo,2)::integer); when 'proyecto_activado' then v_tipo:='revisar_proyecto'; v_titulo:='Revisar proyecto activado'; v_vence:=now(); v_prioridad:='alta'; else null; end case;
  if v_tipo is not null and new.cliente_id is not null then insert into public.crm_tareas(cliente_id,proyecto_id,tipo,titulo,prioridad,vence_en,origen_evento_id) values(new.cliente_id,new.proyecto_id,v_tipo,v_titulo,v_prioridad,v_vence,new.id) on conflict do nothing; end if;
  if new.evento='informacion_solicitada' and new.cliente_id is not null then select valor_numero into v_plazo from public.crm_configuracion where clave='consulta_sin_respuesta_horas'; insert into public.crm_tareas(cliente_id,tipo,titulo,prioridad,vence_en,origen_evento_id) values(new.cliente_id,'revisar_sin_respuesta','Verificar consulta sin respuesta','media',now()+make_interval(hours=>coalesce(v_plazo,24)::integer),new.id) on conflict do nothing; end if;
  if new.evento='visita_solicitada' and new.cliente_id is not null and nullif(new.metadata->>'fecha_visita','') is not null then begin v_fecha_visita:=(new.metadata->>'fecha_visita')::timestamptz; select valor_numero into v_plazo from public.crm_configuracion where clave='visita_recordatorio_previo_dias'; insert into public.crm_tareas(cliente_id,tipo,titulo,prioridad,vence_en,origen_evento_id) values(new.cliente_id,'recordar_visita','Recordatorio previo a visita','alta',v_fecha_visita-make_interval(days=>coalesce(v_plazo,1)::integer),new.id) on conflict do nothing; select valor_numero into v_plazo from public.crm_configuracion where clave='visita_seguimiento_post_dias'; insert into public.crm_tareas(cliente_id,tipo,titulo,prioridad,vence_en,origen_evento_id) values(new.cliente_id,'seguimiento_post_visita','Seguimiento posterior a visita','media',v_fecha_visita+make_interval(days=>coalesce(v_plazo,1)::integer),new.id) on conflict do nothing; exception when others then null; end; end if;
  return new;
end; $$;
drop trigger if exists tr_crm_procesar_evento_lanzamiento on public.crm_eventos;
create trigger tr_crm_procesar_evento_lanzamiento after insert on public.crm_eventos for each row execute function public.crm_procesar_evento_lanzamiento();
create or replace view public.crm_resumen_embudo with (security_invoker=true) as select etapa,count(*)::integer personas,avg(extract(epoch from(now()-etapa_ingresada_en))/86400)::numeric(10,2) dias_promedio from public.clientes group by etapa;
grant select on public.crm_resumen_embudo to authenticated;
-- Registro público mediante RPC: evita exponer SELECT/UPDATE de clientes al rol anónimo.
drop policy if exists "Anon puede interactuar con clientes" on public.clientes;
drop policy if exists "Public insert clientes" on public.clientes;
drop policy if exists "Anon puede insertar proyectos" on public.proyectos;
drop policy if exists "Public insert proyectos" on public.proyectos;
revoke all on public.clientes from anon;
revoke all on public.proyectos from anon;
revoke all on public.proyecto_items from anon;

drop policy if exists "Admin full access clientes" on public.clientes;
create policy "Admin full access clientes" on public.clientes for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Admin full access proyectos" on public.proyectos;
create policy "Admin full access proyectos" on public.proyectos for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Admin full access proyecto_items" on public.proyecto_items;
create policy "Admin full access proyecto_items" on public.proyecto_items for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Admin full access casas" on public.casas;
create policy "Admin full access casas" on public.casas for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Admin full access extras" on public.extras;
create policy "Admin full access extras" on public.extras for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

do $$
begin
  if to_regclass('public.visitas') is not null then
    execute 'drop policy if exists "Admin full access visitas" on public.visitas';
    execute 'create policy "Admin full access visitas" on public.visitas for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo())';
  end if;
end
$$;

create or replace function public.crm_registrar_oportunidad_publica(
  p_cliente jsonb,
  p_proyecto jsonb default null,
  p_evento text default 'informacion_solicitada',
  p_etapa text default 'solicito_informacion',
  p_origen text default 'web',
  p_pagina text default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_cliente_id uuid;
  v_proyecto_id uuid;
  v_correo text := nullif(lower(trim(p_cliente->>'correo')),'');
  v_telefono text := nullif(regexp_replace(coalesce(p_cliente->>'telefono',''),'[^0-9+]','','g'),'');
  v_total numeric := coalesce(nullif(p_proyecto->>'cotizacion_referencial','')::numeric,nullif(p_proyecto->>'total','')::numeric,0);
  v_score integer := 0;
  v_prioridad text;
  v_score_detalle jsonb;
  v_parcela uuid;
  v_casa uuid;
begin
  if p_evento <> all(array['informacion_solicitada','visita_solicitada','cotizacion_guardada','proyecto_activado']) then raise exception 'Evento comercial no permitido'; end if;
  if p_etapa <> all(array['solicito_informacion','solicito_visita','guardo_cotizacion','activo_proyecto']) then raise exception 'Etapa comercial no permitida'; end if;
  if nullif(trim(p_cliente->>'nombre'),'') is null then raise exception 'Nombre requerido'; end if;
  if v_correo is null and v_telefono is null then raise exception 'Correo o teléfono requerido'; end if;
  select id into v_cliente_id from public.clientes where (v_correo is not null and lower(correo)=v_correo) or (v_telefono is not null and regexp_replace(coalesce(telefono,''),'[^0-9+]','','g')=v_telefono) order by creado_en desc limit 1;
  if p_evento='visita_solicitada' then v_score:=v_score+40; end if;
  if p_evento in ('cotizacion_guardada','proyecto_activado') then v_score:=v_score+20; end if;
  if p_evento='proyecto_activado' then v_score:=v_score+50; end if;
  if v_total>=30000000 then v_score:=v_score+30; end if;
  if nullif(p_proyecto->>'casa_id','') is not null then v_score:=v_score+10; end if;
  if p_cliente->>'urgencia'='alta' then v_score:=v_score+25; end if;
  v_prioridad:=case when v_score>=80 then 'Alta prioridad' when v_score>=40 then 'Prioridad media' when v_score>=10 then 'Prioridad baja' else 'Seguimiento pendiente' end;
  v_score_detalle:=jsonb_build_object('visita',case when p_evento='visita_solicitada' then 40 else 0 end,'cotizacion',case when p_evento in ('cotizacion_guardada','proyecto_activado') then 20 else 0 end,'proyecto_activado',case when p_evento='proyecto_activado' then 50 else 0 end,'presupuesto_suficiente',case when v_total>=30000000 then 30 else 0 end,'incluyo_casa',case when nullif(p_proyecto->>'casa_id','') is not null then 10 else 0 end,'urgencia',case when p_cliente->>'urgencia'='alta' then 25 else 0 end);
  if v_cliente_id is null then
    insert into public.clientes(nombre,apellido,correo,telefono,whatsapp,comuna,region,presupuesto_estimado,observaciones,acepta_tratamiento_datos,estado,score,prioridad,score_detalle,etapa,etapa_ingresada_en,ultima_interaccion_en,origen,urgencia)
    values(trim(p_cliente->>'nombre'),p_cliente->>'apellido',v_correo,v_telefono,p_cliente->>'whatsapp',p_cliente->>'comuna',p_cliente->>'region',coalesce(nullif(p_cliente->>'presupuesto_estimado','')::numeric,v_total),p_cliente->>'observaciones',coalesce((p_cliente->>'acepta_tratamiento_datos')::boolean,false),coalesce(p_cliente->>'estado','nuevo'),v_score,v_prioridad,v_score_detalle,p_etapa,now(),now(),p_origen,p_cliente->>'urgencia') returning id into v_cliente_id;
  else
    update public.clientes set score=greatest(score,v_score),prioridad=case when v_score>score then v_prioridad else prioridad end,score_detalle=case when v_score>=score then v_score_detalle else score_detalle end,ultima_interaccion_en=now(),origen=coalesce(origen,p_origen),actualizado_en=now() where id=v_cliente_id;
  end if;
  if p_proyecto is not null then
    if coalesce(p_proyecto->>'parcela_id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then v_parcela:=(p_proyecto->>'parcela_id')::uuid; end if;
    if coalesce(p_proyecto->>'casa_id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then v_casa:=(p_proyecto->>'casa_id')::uuid; end if;
    if p_evento='proyecto_activado' then
      select id into v_proyecto_id from public.proyectos where cliente_id=v_cliente_id and estado='cotizacion_generada' order by creado_en desc limit 1;
    end if;
    if v_proyecto_id is null then
      insert into public.proyectos(cliente_id,parcela_id,casa_id,modalidad,estado,subtotal,total,origen,activado_en,observaciones_cliente)
      values(v_cliente_id,v_parcela,v_casa,coalesce(p_proyecto->>'modalidad','llave_en_mano'),coalesce(p_proyecto->>'estado','cotizacion_generada'),v_total,v_total,p_origen,case when p_evento='proyecto_activado' then now() else null end,p_cliente->>'observaciones') returning id into v_proyecto_id;
    else
      update public.proyectos set parcela_id=coalesce(v_parcela,parcela_id),casa_id=coalesce(v_casa,casa_id),estado='activo',subtotal=v_total,total=v_total,activado_en=now(),actualizado_en=now() where id=v_proyecto_id;
    end if;
  end if;
  insert into public.crm_eventos(evento,etapa,cliente_id,proyecto_id,origen,pagina,metadata)
  values(p_evento,p_etapa,v_cliente_id,v_proyecto_id,left(p_origen,120),left(p_pagina,180),jsonb_strip_nulls(jsonb_build_object('parcela_codigo',left(p_metadata->>'parcela_codigo',80),'casa_codigo',left(p_metadata->>'casa_codigo',80),'fecha_visita',left(p_metadata->>'fecha_visita',40),'valor',p_metadata->'valor','origen',left(p_origen,120))));
  return jsonb_build_object('success',true,'clienteId',v_cliente_id,'proyectoId',v_proyecto_id,'score',v_score,'prioridad',v_prioridad);
end; $$;
revoke all on function public.crm_registrar_oportunidad_publica(jsonb,jsonb,text,text,text,text,jsonb) from public;
grant execute on function public.crm_registrar_oportunidad_publica(jsonb,jsonb,text,text,text,text,jsonb) to anon,authenticated;


-- Source: 202607170003_cerrar_exposicion_publicaciones.sql
revoke select on table public.publicaciones from anon, authenticated;

create or replace view public.publicaciones_publicas
with (security_barrier = true)
as
select
  p.id,
  p.codigo_publico,
  p.estado,
  p.titulo_publico,
  p.descripcion_publica,
  p.precio_publicacion,
  p.superficie_m2,
  p.region,
  p.comuna,
  p.sector,
  p.ubicacion_publica_aproximada,
  round(p.latitud_privada, 3) as latitud_publica,
  round(p.longitud_privada, 3) as longitud_publica,
  p.rol,
  p.agua,
  p.luz,
  p.acceso,
  p.topografia,
  p.naturaleza,
  p.cuerpos_agua,
  p.servicios,
  p.ciudad_principal,
  p.distancia_ciudad,
  p.facilidad_pago,
  p.detalle_facilidad_pago,
  p.publicada_en,
  p.actualizado_en,
  p.datos_formulario ->> 'old_id' as identificador_legacy,
  p.datos_formulario ->> 'imagen_principal' as imagen_principal,
  coalesce(p.datos_formulario -> 'imagenes', '[]'::jsonb) as imagenes,
  p.datos_formulario ->> 'destacada' as destacada,
  p.datos_formulario ->> 'tiempoConcepcion' as tiempo_concepcion
from public.publicaciones p
where p.estado = 'aprobada';

revoke all on table public.publicaciones_publicas from public;
grant select on table public.publicaciones_publicas to anon, authenticated;

comment on view public.publicaciones_publicas is
  'Catalogo publico sanitizado. Excluye contacto, relato privado, coordenadas exactas, idempotencia, formulario completo y modelo comercial.';


-- Source: 202607170004_tasador_tpl_mvp.sql
alter table public.publicaciones add column if not exists usuario_id uuid references auth.users(id) on delete set null;
alter table public.publicaciones add column if not exists tipo_precio_actual text not null default 'precio_publicado_solicitado';
alter table public.publicaciones add column if not exists precio_propietario_solicitado bigint check (precio_propietario_solicitado is null or precio_propietario_solicitado >= 0);
alter table public.publicaciones add column if not exists porcentaje_servicio numeric(7,4) check (porcentaje_servicio is null or porcentaje_servicio between 0 and 1);
alter table public.publicaciones add column if not exists monto_servicio bigint check (monto_servicio is null or monto_servicio >= 0);
alter table public.publicaciones add column if not exists precio_publico bigint check (precio_publico is null or precio_publico >= 0);
alter table public.publicaciones add column if not exists latitud_publica numeric;
alter table public.publicaciones add column if not exists longitud_publica numeric;
alter table public.publicaciones add column if not exists precision_ubicacion text;
alter table public.publicaciones add column if not exists consentimiento_uso_ubicacion boolean not null default false;
alter table public.publicaciones add column if not exists consentimiento_uso_ubicacion_en timestamptz;

update public.publicaciones
set precio_publico = precio_publicacion,
    tipo_precio_actual = 'precio_publicado_solicitado'
where precio_publico is null;

insert into public.crm_configuracion(clave,valor_numero,descripcion)
values('partner_service_percent',0.02,'Porcentaje configurable del Servicio Partner TPL')
on conflict (clave) do nothing;

alter table public.publicaciones drop constraint if exists publicaciones_tipo_precio_actual_valido;
alter table public.publicaciones add constraint publicaciones_tipo_precio_actual_valido check (
  tipo_precio_actual in (
    'precio_publicado_solicitado',
    'precio_negociado_declarado',
    'precio_final_declarado',
    'precio_final_verificado'
  )
);

create table if not exists public.planes_comerciales (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  tipo_usuario text not null check (tipo_usuario in ('propietario','corredor','administrador')),
  precio_clp bigint not null default 0 check (precio_clp >= 0),
  periodo text not null default 'ciclo_facturacion' check (periodo in ('sin_periodo','ciclo_facturacion','credito')),
  limite_publicaciones integer check (limite_publicaciones is null or limite_publicaciones >= 0),
  limite_tasaciones integer check (limite_tasaciones is null or limite_tasaciones >= 0),
  nivel_informe text not null default 'basico' check (nivel_informe in ('basico','premium')),
  permite_pdf boolean not null default false,
  permite_comparables boolean not null default false,
  permite_historial boolean not null default false,
  permite_revision_humana boolean not null default false,
  politica_uso_razonable jsonb not null default '{}'::jsonb,
  estado text not null default 'borrador' check (estado in ('borrador','activo','inactivo','retirado')),
  vigente_desde timestamptz,
  vigente_hasta timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.suscripciones_comerciales (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.planes_comerciales(id) on delete restrict,
  estado text not null default 'pendiente' check (estado in ('pendiente','activa','pausada','vencida','cancelada')),
  ciclo_inicia_en timestamptz,
  ciclo_termina_en timestamptz,
  proveedor_pago text,
  referencia_externa text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (proveedor_pago, referencia_externa)
);

create table if not exists public.creditos_tasador (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  cantidad_total integer not null check (cantidad_total > 0),
  cantidad_disponible integer not null check (cantidad_disponible >= 0 and cantidad_disponible <= cantidad_total),
  vence_en timestamptz,
  origen text not null,
  referencia_externa text,
  creado_en timestamptz not null default now()
);

create table if not exists public.configuracion_tasador (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  estado text not null default 'borrador' check (estado in ('borrador','activa','retirada')),
  algoritmo text not null default 'mediana_comparables_v1',
  parametros jsonb not null,
  vigente_desde timestamptz,
  aprobado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now()
);

create unique index configuracion_tasador_una_activa_idx
on public.configuracion_tasador ((estado)) where estado = 'activa';

insert into public.configuracion_tasador(version,estado,algoritmo,parametros,vigente_desde)
values (
  'tpl-mvp-1.0.0',
  'activa',
  'mediana_comparables_v1',
  jsonb_build_object(
    'comparables_minimos',3,
    'comparables_maximos',15,
    'cobertura_suficiente_desde',12,
    'cobertura_limitada_desde',6,
    'cobertura_experimental_desde',3,
    'antiguedad_maxima_dias',1095,
    'distancia_maxima_km',150,
    'superficie_relacion_minima',0.25,
    'umbral_cambio_precio_porcentaje',10,
    'niveles_permitidos',jsonb_build_array('basica'),
    'fuentes_precio_permitidas',jsonb_build_array('precio_publicado_solicitado','precio_final_declarado','precio_final_verificado')
  ),
  now()
)
on conflict (version) do nothing;

create table if not exists public.historial_precios_publicacion (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  tipo_precio text not null check (tipo_precio in ('precio_publicado_solicitado','precio_propietario_solicitado','comision_servicio','precio_publico','precio_negociado_declarado','precio_final_declarado','precio_final_verificado')),
  monto bigint not null check (monto >= 0),
  moneda text not null default 'CLP',
  fuente text not null,
  nivel_verificacion text not null default 'sin_verificar' check (nivel_verificacion in ('sin_verificar','limitada','documental','verificada')),
  motivo text,
  usuario_id uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now()
);

insert into public.historial_precios_publicacion(publicacion_id,tipo_precio,monto,fuente,nivel_verificacion,motivo,creado_en)
select p.id,'precio_publicado_solicitado',p.precio_publicacion,'migracion_publicaciones','sin_verificar','Precio solicitado/publicado existente; no corresponde a venta.',p.creado_en
from public.publicaciones p
where p.precio_publicacion is not null
and not exists (
  select 1 from public.historial_precios_publicacion h
  where h.publicacion_id = p.id and h.tipo_precio = 'precio_publicado_solicitado'
);

create table if not exists public.ventas_declaradas (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid references public.publicaciones(id) on delete set null,
  usuario_id uuid references auth.users(id) on delete set null,
  region text not null,
  comuna text not null,
  sector text,
  superficie_m2 numeric not null check (superficie_m2 > 0),
  precio_final bigint not null check (precio_final > 0),
  fecha_venta date,
  fecha_precision text not null default 'aproximada' check (fecha_precision in ('exacta','aproximada','mes','desconocida')),
  fuente text not null,
  tipo_fuente text not null check (tipo_fuente in ('propietario','corredor','administrador','documento','fuente_publica_autorizada')),
  nivel_verificacion text not null default 'limitada' check (nivel_verificacion in ('limitada','declarada','documental','verificada')),
  evidencia_storage_path text,
  permite_uso_agregado boolean not null default false,
  mantener_privado boolean not null default true,
  hubo_comision boolean,
  motivo_cierre text,
  tipo_comprador text,
  observaciones text,
  revisado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now()
);

create table if not exists public.publicacion_eventos (
  id bigint generated always as identity primary key,
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  evento text not null check (evento in ('creada','publicada','precio_cambiado','pausada','reactivada','consulta_recibida','visita_solicitada','reservada','venta_declarada','cerrada')),
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create table if not exists public.tasaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  publicacion_id uuid references public.publicaciones(id) on delete set null,
  sesion_anonima_id uuid,
  access_token_hash text not null unique check (access_token_hash ~ '^[0-9a-f]{64}$'),
  propiedad_key text not null check (propiedad_key ~ '^[0-9a-f]{64}$'),
  huella_material text not null check (huella_material ~ '^[0-9a-f]{64}$'),
  nivel text not null default 'basica' check (nivel in ('basica','premium')),
  estado text not null default 'generada_automaticamente' check (estado in ('generada_automaticamente','pendiente_revision','revisada','ajustada','rechazada_datos_insuficientes')),
  datos_entrada jsonb not null,
  precio_ingresado bigint check (precio_ingresado is null or precio_ingresado >= 0),
  valor_minimo bigint,
  valor_mercado bigint,
  valor_maximo bigint,
  venta_rapida bigint,
  precio_m2 numeric,
  diferencia_porcentual numeric,
  confianza text not null check (confianza in ('alta','media','baja','informacion_insuficiente')),
  confianza_puntaje numeric not null default 0 check (confianza_puntaje between 0 and 100),
  cobertura text not null check (cobertura in ('suficiente','limitada','experimental','informacion_insuficiente')),
  resumen_factores jsonb not null default '{}'::jsonb,
  algoritmo_version text not null,
  configuracion_id uuid not null references public.configuracion_tasador(id) on delete restrict,
  precio_final_elegido bigint,
  decision_usuario text check (decision_usuario in ('mantener_original','adoptar_mercado','otro','sin_decision')),
  recalculada_desde uuid references public.tasaciones(id) on delete set null,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create unique index tasaciones_basica_usuario_propiedad_idx
on public.tasaciones ((coalesce(usuario_id,'00000000-0000-0000-0000-000000000000'::uuid)),propiedad_key,nivel)
where nivel = 'basica' and estado <> 'rechazada_datos_insuficientes';

create table if not exists public.tasacion_comparables (
  id uuid primary key default gen_random_uuid(),
  tasacion_id uuid not null references public.tasaciones(id) on delete cascade,
  publicacion_comparable_id uuid references public.publicaciones(id) on delete set null,
  fuente_tipo text not null,
  fuente_id text,
  datos_snapshot jsonb not null,
  precio_m2 numeric not null check (precio_m2 > 0),
  distancia_km numeric,
  antiguedad_dias integer,
  similitud numeric not null check (similitud between 0 and 1),
  peso numeric not null check (peso between 0 and 1),
  incluido boolean not null default true,
  motivo_descarte text,
  creado_en timestamptz not null default now()
);

create table if not exists public.tasacion_factores (
  id uuid primary key default gen_random_uuid(),
  tasacion_id uuid not null references public.tasaciones(id) on delete cascade,
  codigo text not null,
  valor_entrada jsonb,
  peso numeric,
  efecto numeric,
  explicacion text,
  fuente text,
  creado_en timestamptz not null default now()
);

create table if not exists public.consumos_tasador (
  id uuid primary key default gen_random_uuid(),
  tasacion_id uuid references public.tasaciones(id) on delete set null,
  usuario_id uuid references auth.users(id) on delete set null,
  sesion_anonima_id uuid,
  propiedad_key text not null,
  plan_id uuid references public.planes_comerciales(id) on delete set null,
  suscripcion_id uuid references public.suscripciones_comerciales(id) on delete set null,
  credito_id uuid references public.creditos_tasador(id) on delete set null,
  tipo_uso text not null check (tipo_uso in ('gratuita_propiedad','incluida_plan','credito','reapertura','administrador')),
  consumio_unidad boolean not null,
  abuse_signal_hash text,
  ciclo_inicia_en timestamptz,
  ciclo_termina_en timestamptz,
  idempotency_key uuid not null unique,
  creado_en timestamptz not null default now()
);

create table if not exists public.revisiones_tasacion (
  id uuid primary key default gen_random_uuid(),
  tasacion_id uuid not null references public.tasaciones(id) on delete cascade,
  revisor_id uuid not null references auth.users(id) on delete restrict,
  estado_anterior text not null,
  estado_nuevo text not null,
  motivo text not null,
  resultado_anterior jsonb not null,
  resultado_nuevo jsonb not null,
  creado_en timestamptz not null default now()
);

create index tasaciones_usuario_fecha_idx on public.tasaciones(usuario_id,creada_en desc);
create index tasaciones_publicacion_fecha_idx on public.tasaciones(publicacion_id,creada_en desc);
create index tasaciones_cobertura_idx on public.tasaciones(cobertura,confianza,creada_en desc);
create index tasacion_comparables_tasacion_idx on public.tasacion_comparables(tasacion_id,peso desc);
create index historial_precios_publicacion_fecha_idx on public.historial_precios_publicacion(publicacion_id,creado_en desc);
create index ventas_declaradas_zona_idx on public.ventas_declaradas(comuna,sector,fecha_venta desc);
create index publicacion_eventos_historial_idx on public.publicacion_eventos(publicacion_id,creado_en desc);
create index consumos_tasador_usuario_fecha_idx on public.consumos_tasador(usuario_id,creado_en desc);

alter table public.planes_comerciales enable row level security;
alter table public.suscripciones_comerciales enable row level security;
alter table public.creditos_tasador enable row level security;
alter table public.configuracion_tasador enable row level security;
alter table public.historial_precios_publicacion enable row level security;
alter table public.ventas_declaradas enable row level security;
alter table public.publicacion_eventos enable row level security;
alter table public.tasaciones enable row level security;
alter table public.tasacion_comparables enable row level security;
alter table public.tasacion_factores enable row level security;
alter table public.consumos_tasador enable row level security;
alter table public.revisiones_tasacion enable row level security;

revoke all on public.planes_comerciales, public.suscripciones_comerciales, public.creditos_tasador,
  public.configuracion_tasador, public.historial_precios_publicacion, public.ventas_declaradas,
  public.publicacion_eventos, public.tasaciones, public.tasacion_comparables, public.tasacion_factores,
  public.consumos_tasador, public.revisiones_tasacion from anon, authenticated;

grant select on public.planes_comerciales to authenticated;
grant select on public.suscripciones_comerciales, public.creditos_tasador, public.tasaciones,
  public.tasacion_comparables, public.tasacion_factores, public.consumos_tasador to authenticated;
grant select,insert,update on public.planes_comerciales, public.suscripciones_comerciales,
  public.creditos_tasador, public.configuracion_tasador, public.historial_precios_publicacion,
  public.ventas_declaradas, public.publicacion_eventos, public.tasaciones,
  public.tasacion_comparables, public.tasacion_factores, public.consumos_tasador,
  public.revisiones_tasacion to authenticated;

create policy planes_comerciales_lectura_activos on public.planes_comerciales
for select to authenticated using (estado = 'activo' or public.es_administrador_activo());
create policy planes_comerciales_admin on public.planes_comerciales
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy suscripciones_propias on public.suscripciones_comerciales
for select to authenticated using (usuario_id = auth.uid() or public.es_administrador_activo());
create policy suscripciones_admin on public.suscripciones_comerciales
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy creditos_propios on public.creditos_tasador
for select to authenticated using (usuario_id = auth.uid() or public.es_administrador_activo());
create policy creditos_admin on public.creditos_tasador
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy configuracion_tasador_admin on public.configuracion_tasador
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy historial_precios_admin on public.historial_precios_publicacion
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy ventas_declaradas_propias on public.ventas_declaradas
for select to authenticated using (usuario_id = auth.uid() or public.es_administrador_activo());
create policy ventas_declaradas_admin on public.ventas_declaradas
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy publicacion_eventos_admin on public.publicacion_eventos
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy tasaciones_propias on public.tasaciones
for select to authenticated using (usuario_id = auth.uid() or public.es_administrador_activo());
create policy tasaciones_admin on public.tasaciones
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy tasacion_comparables_propios on public.tasacion_comparables
for select to authenticated using (exists(select 1 from public.tasaciones t where t.id=tasacion_id and (t.usuario_id=auth.uid() or public.es_administrador_activo())));
create policy tasacion_comparables_admin on public.tasacion_comparables
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy tasacion_factores_propios on public.tasacion_factores
for select to authenticated using (exists(select 1 from public.tasaciones t where t.id=tasacion_id and (t.usuario_id=auth.uid() or public.es_administrador_activo())));
create policy tasacion_factores_admin on public.tasacion_factores
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy consumos_tasador_propios on public.consumos_tasador
for select to authenticated using (usuario_id=auth.uid() or public.es_administrador_activo());
create policy consumos_tasador_admin on public.consumos_tasador
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy revisiones_tasacion_admin on public.revisiones_tasacion
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());

create or replace function public.registrar_tasacion_mvp(
  p_tasacion jsonb,
  p_comparables jsonb,
  p_factores jsonb,
  p_consumo jsonb
)
returns table (id uuid, creada_en timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_creada timestamptz;
  v_comparable jsonb;
  v_factor jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'Acceso denegado'; end if;
  insert into public.tasaciones(
    usuario_id,publicacion_id,sesion_anonima_id,access_token_hash,propiedad_key,huella_material,
    nivel,estado,datos_entrada,precio_ingresado,valor_minimo,valor_mercado,valor_maximo,
    venta_rapida,precio_m2,diferencia_porcentual,confianza,confianza_puntaje,cobertura,
    resumen_factores,algoritmo_version,configuracion_id,decision_usuario
  ) values (
    nullif(p_tasacion->>'usuario_id','')::uuid,nullif(p_tasacion->>'publicacion_id','')::uuid,
    nullif(p_tasacion->>'sesion_anonima_id','')::uuid,p_tasacion->>'access_token_hash',
    p_tasacion->>'propiedad_key',p_tasacion->>'huella_material',coalesce(p_tasacion->>'nivel','basica'),
    p_tasacion->>'estado',p_tasacion->'datos_entrada',nullif(p_tasacion->>'precio_ingresado','')::bigint,
    nullif(p_tasacion->>'valor_minimo','')::bigint,nullif(p_tasacion->>'valor_mercado','')::bigint,
    nullif(p_tasacion->>'valor_maximo','')::bigint,nullif(p_tasacion->>'venta_rapida','')::bigint,
    nullif(p_tasacion->>'precio_m2','')::numeric,nullif(p_tasacion->>'diferencia_porcentual','')::numeric,
    p_tasacion->>'confianza',coalesce((p_tasacion->>'confianza_puntaje')::numeric,0),
    p_tasacion->>'cobertura',coalesce(p_tasacion->'resumen_factores','{}'::jsonb),
    p_tasacion->>'algoritmo_version',(p_tasacion->>'configuracion_id')::uuid,'sin_decision'
  ) returning tasaciones.id,tasaciones.creada_en into v_id,v_creada;

  for v_comparable in select value from jsonb_array_elements(coalesce(p_comparables,'[]'::jsonb)) loop
    insert into public.tasacion_comparables(
      tasacion_id,publicacion_comparable_id,fuente_tipo,fuente_id,datos_snapshot,precio_m2,
      distancia_km,antiguedad_dias,similitud,peso,incluido,motivo_descarte
    ) values (
      v_id,nullif(v_comparable->>'publicacion_comparable_id','')::uuid,v_comparable->>'fuente_tipo',
      v_comparable->>'fuente_id',v_comparable->'datos_snapshot',(v_comparable->>'precio_m2')::numeric,
      nullif(v_comparable->>'distancia_km','')::numeric,nullif(v_comparable->>'antiguedad_dias','')::integer,
      (v_comparable->>'similitud')::numeric,(v_comparable->>'peso')::numeric,
      coalesce((v_comparable->>'incluido')::boolean,true),v_comparable->>'motivo_descarte'
    );
  end loop;

  for v_factor in select value from jsonb_array_elements(coalesce(p_factores,'[]'::jsonb)) loop
    insert into public.tasacion_factores(tasacion_id,codigo,valor_entrada,peso,efecto,explicacion,fuente)
    values(v_id,v_factor->>'codigo',v_factor->'valor_entrada',nullif(v_factor->>'peso','')::numeric,
      nullif(v_factor->>'efecto','')::numeric,v_factor->>'explicacion',v_factor->>'fuente');
  end loop;

  insert into public.consumos_tasador(
    tasacion_id,usuario_id,sesion_anonima_id,propiedad_key,plan_id,suscripcion_id,credito_id,
    tipo_uso,consumio_unidad,abuse_signal_hash,ciclo_inicia_en,ciclo_termina_en,idempotency_key
  ) values (
    v_id,nullif(p_consumo->>'usuario_id','')::uuid,nullif(p_consumo->>'sesion_anonima_id','')::uuid,
    p_tasacion->>'propiedad_key',nullif(p_consumo->>'plan_id','')::uuid,
    nullif(p_consumo->>'suscripcion_id','')::uuid,nullif(p_consumo->>'credito_id','')::uuid,
    p_consumo->>'tipo_uso',coalesce((p_consumo->>'consumio_unidad')::boolean,true),p_consumo->>'abuse_signal_hash',
    nullif(p_consumo->>'ciclo_inicia_en','')::timestamptz,nullif(p_consumo->>'ciclo_termina_en','')::timestamptz,
    (p_consumo->>'idempotency_key')::uuid
  );
  return query select v_id,v_creada;
end;
$$;

revoke all on function public.registrar_tasacion_mvp(jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.registrar_tasacion_mvp(jsonb,jsonb,jsonb,jsonb) to service_role;


-- Source: 202607180001_publicador_unificado.sql
create table if not exists public.publicaciones_unificadas (
  id uuid primary key default gen_random_uuid(),
  codigo_publico text unique not null,
  tipo text not null check (tipo in ('casa','parcela')),
  estado text not null default 'pendiente_revision',
  titulo text not null,
  descripcion text not null,
  region text not null,
  comuna text not null,
  localidad text,
  precio numeric not null default 0,
  superficie_terreno_m2 numeric,
  superficie_construida_m2 numeric,
  habitaciones integer,
  banos integer,
  material text,
  rol text,
  agua text,
  luz text,
  urgencia text,
  estado_propiedad text,
  nombre_contacto text not null,
  telefono_contacto text not null,
  correo_contacto text not null,
  tipo_publicador text,
  fotos jsonb not null default '[]'::jsonb,
  cotizacion jsonb not null default '{}'::jsonb,
  payload_original jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.publicaciones_unificadas enable row level security;
revoke all on public.publicaciones_unificadas from anon;
grant select, insert, update, delete on public.publicaciones_unificadas to authenticated;

drop policy if exists "Administradores gestionan publicaciones unificadas" on public.publicaciones_unificadas;
create policy "Administradores gestionan publicaciones unificadas"
on public.publicaciones_unificadas for all to authenticated
using (true) with check (true);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('publicaciones-unificadas','publicaciones-unificadas',true,12582912,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=12582912,allowed_mime_types=excluded.allowed_mime_types;


-- Source: 202607180002_publicador_unificado_v2.sql
alter table public.publicaciones_unificadas
  add column if not exists plan_publicacion text not null default 'inicio',
  add column if not exists tasacion jsonb not null default '{}'::jsonb,
  add column if not exists latitud_privada double precision,
  add column if not exists longitud_privada double precision,
  add column if not exists ubicacion_fuente text,
  add column if not exists ubicacion_publica_aproximada boolean not null default true;

comment on column public.publicaciones_unificadas.latitud_privada is 'Coordenada exacta para gestión interna; no exponer directamente en el portal público.';
comment on column public.publicaciones_unificadas.longitud_privada is 'Coordenada exacta para gestión interna; no exponer directamente en el portal público.';
comment on column public.publicaciones_unificadas.tasacion is 'Resultado orientativo del Tasador TPL; no constituye tasación formal.';


-- Source: 202607190001_valor_respaldado_catalogo_publico.sql
-- TPL V11: publica de forma segura el distintivo de precio respaldado.
-- Ejecutar completo en Supabase > SQL Editor > New query.

create or replace view public.publicaciones_publicas
with (security_barrier = true)
as
select
  p.id,
  p.codigo_publico,
  p.estado,
  p.titulo_publico,
  p.descripcion_publica,
  p.precio_publicacion,
  p.superficie_m2,
  p.region,
  p.comuna,
  p.sector,
  p.ubicacion_publica_aproximada,
  round(p.latitud_privada, 3) as latitud_publica,
  round(p.longitud_privada, 3) as longitud_publica,
  p.rol,
  p.agua,
  p.luz,
  p.acceso,
  p.topografia,
  p.naturaleza,
  p.cuerpos_agua,
  p.servicios,
  p.ciudad_principal,
  p.distancia_ciudad,
  p.facilidad_pago,
  p.detalle_facilidad_pago,
  p.publicada_en,
  p.actualizado_en,
  p.datos_formulario ->> 'old_id' as identificador_legacy,
  p.datos_formulario ->> 'imagen_principal' as imagen_principal,
  coalesce(p.datos_formulario -> 'imagenes', '[]'::jsonb) as imagenes,
  p.datos_formulario ->> 'destacada' as destacada,
  p.datos_formulario ->> 'tiempoConcepcion' as tiempo_concepcion,
  coalesce(
    (p.datos_formulario #>> '{distintivos,valorRespaldadoTPL}')::boolean,
    (p.datos_formulario #>> '{tasacion,valorRespaldadoTPL}')::boolean,
    (p.datos_formulario #>> '{tasacionTPL,valorRespaldadoTPL}')::boolean,
    false
  ) as valor_respaldado_tpl,
  coalesce(
    nullif(p.datos_formulario #>> '{tasacion,resultado,quick}', '')::numeric,
    nullif(p.datos_formulario #>> '{tasacionTPL,result,quick}', '')::numeric,
    nullif(p.datos_formulario #>> '{tasacionTPL,resultado,quick}', '')::numeric,
    nullif(p.datos_formulario #>> '{distintivos,precioRecomendadoValor}', '')::numeric
  ) as precio_recomendado_tpl
from public.publicaciones p
where p.estado = 'aprobada';

revoke all on table public.publicaciones_publicas from public;
grant select on table public.publicaciones_publicas to anon, authenticated;

comment on view public.publicaciones_publicas is
  'Catálogo público sanitizado. Incluye el distintivo comercial TPL, pero excluye contacto, relato privado, coordenadas exactas, fórmulas y variables internas del Tasador.';


-- Source: 202607190002_promocion_urgente_destacada.sql
-- TPL V12: respaldo automático de precio + venta urgente + urgente destacado.
-- Ejecutar completo en Supabase > SQL Editor > New query.

create or replace view public.publicaciones_publicas
with (security_barrier = true)
as
with base as (
  select
    p.*,
    coalesce(
      nullif(p.datos_formulario #>> '{tasacion,resultado,quick}', '')::numeric,
      nullif(p.datos_formulario #>> '{tasacionTPL,result,quick}', '')::numeric,
      nullif(p.datos_formulario #>> '{tasacionTPL,resultado,quick}', '')::numeric,
      nullif(p.datos_formulario #>> '{distintivos,precioRecomendadoValor}', '')::numeric
    ) as precio_venta_rapida_tpl,
    coalesce(
      (p.datos_formulario #>> '{promocion,urgente}')::boolean,
      (p.datos_formulario #>> '{comercial,ventaUrgente}')::boolean,
      false
    ) as venta_urgente,
    coalesce(
      (p.datos_formulario #>> '{promocion,destacadoPago}')::boolean,
      (p.datos_formulario #>> '{comercial,urgenteDestacado}')::boolean,
      false
    ) as urgente_destacado,
    coalesce(
      nullif(p.datos_formulario #>> '{promocion,prioridadGrilla}', '')::integer,
      0
    ) as prioridad_promocion
  from public.publicaciones p
)
select
  b.id,
  b.codigo_publico,
  b.estado,
  b.titulo_publico,
  b.descripcion_publica,
  b.precio_publicacion,
  b.superficie_m2,
  b.region,
  b.comuna,
  b.sector,
  b.ubicacion_publica_aproximada,
  round(b.latitud_privada, 3) as latitud_publica,
  round(b.longitud_privada, 3) as longitud_publica,
  b.rol,
  b.agua,
  b.luz,
  b.acceso,
  b.topografia,
  b.naturaleza,
  b.cuerpos_agua,
  b.servicios,
  b.ciudad_principal,
  b.distancia_ciudad,
  b.facilidad_pago,
  b.detalle_facilidad_pago,
  b.publicada_en,
  b.actualizado_en,
  b.datos_formulario ->> 'old_id' as identificador_legacy,
  b.datos_formulario ->> 'imagen_principal' as imagen_principal,
  coalesce(b.datos_formulario -> 'imagenes', '[]'::jsonb) as imagenes,
  b.datos_formulario ->> 'destacada' as destacada,
  b.datos_formulario ->> 'tiempoConcepcion' as tiempo_concepcion,
  (
    b.precio_venta_rapida_tpl is not null
    and b.precio_publicacion is not null
    and b.precio_publicacion <= b.precio_venta_rapida_tpl
  ) as valor_respaldado_tpl,
  b.precio_venta_rapida_tpl as precio_recomendado_tpl,
  b.venta_urgente,
  b.urgente_destacado,
  case
    when b.urgente_destacado then greatest(b.prioridad_promocion, 100)
    when b.venta_urgente then greatest(b.prioridad_promocion, 50)
    else b.prioridad_promocion
  end as prioridad_promocion
from base b
where b.estado = 'aprobada';

revoke all on table public.publicaciones_publicas from public;
grant select on table public.publicaciones_publicas to anon, authenticated;

comment on view public.publicaciones_publicas is
  'Catálogo público sanitizado. Calcula respaldo TPL cuando el precio publicado es igual o inferior a Venta rápida e incluye estados comerciales de urgencia sin exponer datos privados ni fórmulas.';


-- Source: 202607190003_distancia_ruta_principal_tasador.sql
-- Distancia a ruta o carretera principal para Publicador y Tasador TPL.

alter table if exists public.publicaciones
  add column if not exists distancia_ruta_principal_km numeric;

alter table if exists public.publicaciones_unificadas
  add column if not exists distancia_ruta_principal_km numeric;

alter table if exists public.publicaciones
  drop constraint if exists publicaciones_distancia_ruta_principal_valida;
alter table if exists public.publicaciones
  add constraint publicaciones_distancia_ruta_principal_valida
  check (distancia_ruta_principal_km is null or distancia_ruta_principal_km between 0 and 999);

alter table if exists public.publicaciones_unificadas
  drop constraint if exists publicaciones_unificadas_distancia_ruta_principal_valida;
alter table if exists public.publicaciones_unificadas
  add constraint publicaciones_unificadas_distancia_ruta_principal_valida
  check (distancia_ruta_principal_km is null or distancia_ruta_principal_km between 0 and 999);

create or replace function public.tpl_sincronizar_distancia_ruta_principal()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.distancia_ruta_principal_km is null then
    new.distancia_ruta_principal_km := nullif(coalesce(
      new.datos_formulario->>'distanciaRutaPrincipalKm',
      new.datos_formulario->>'distancia_ruta_principal_km'
    ), '')::numeric;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tpl_distancia_ruta_principal on public.publicaciones;
create trigger trg_tpl_distancia_ruta_principal
before insert or update of datos_formulario, distancia_ruta_principal_km
on public.publicaciones
for each row execute function public.tpl_sincronizar_distancia_ruta_principal();

update public.publicaciones
set distancia_ruta_principal_km = nullif(coalesce(
  datos_formulario->>'distanciaRutaPrincipalKm',
  datos_formulario->>'distancia_ruta_principal_km'
), '')::numeric
where distancia_ruta_principal_km is null
  and coalesce(datos_formulario->>'distanciaRutaPrincipalKm', datos_formulario->>'distancia_ruta_principal_km', '') ~ '^[0-9]+([.][0-9]+)?$';

comment on column public.publicaciones.distancia_ruta_principal_km is
  'Distancia declarada por el publicador hasta la ruta o carretera principal más cercana.';


-- Source: 202607200001_cerebro_tpl_v1.sql
-- Migración de compatibilidad.
-- Esta versión ya fue aplicada en el proyecto remoto antes de Cerebro TPL v2.
-- Se conserva localmente para mantener alineado el historial de migraciones de Supabase.


-- Source: 202607200002_cerebro_tpl_v2.sql
-- CEREBRO TPL v2: recorrido unificado, sesiones anónimas y embudo confiable.

create or replace function public.crm_metadata_evento_segura(p_metadata jsonb)
returns boolean language sql immutable as $$
  select coalesce(bool_and(key = any(array[
    'session_id','journey_id','parcela_id','parcela_codigo','casa_id','casa_codigo',
    'extra_codigo','tipo_constructivo','origen','paso','resultado','motivo','valor',
    'filtros_activos','filtro_tipo','duracion_segundos','publicacion_id','fecha_visita',
    'dispositivo','pagina_anterior','accion','estado_proyecto','total_estimado','cantidad_extras'
  ])),true)
  from jsonb_object_keys(coalesce(p_metadata,'{}'::jsonb)) key;
$$;

drop policy if exists "Publico registra eventos comerciales sin PII" on public.crm_eventos;
create policy "Publico registra eventos comerciales sin PII"
on public.crm_eventos for insert to anon, authenticated
with check (
  cliente_id is null and proyecto_id is null and publicacion_id is null
  and evento = any(array[
    'sitio_visitado','sesion_finalizada','busqueda_realizada','parcela_view','filtros_usados',
    'mapa_abierto','whatsapp_click','cotizador_iniciado','casa_seleccionada',
    'tipo_constructivo_seleccionado','extra_seleccionado','cotizacion_guardada','pdf_generado',
    'publicacion_iniciada','publicacion_finalizada','reserva_iniciada','pago_iniciado'
  ])
  and public.crm_metadata_evento_segura(metadata)
);

create index if not exists crm_eventos_journey_idx
on public.crm_eventos ((metadata->>'journey_id'), creado_en desc);

create index if not exists crm_eventos_session_idx
on public.crm_eventos ((metadata->>'session_id'), creado_en desc);

drop view if exists public.crm_cerebro_resumen;

create view public.crm_cerebro_resumen
with (security_invoker=true) as
select
  date_trunc('day', creado_en) as dia,
  count(*) filter (where evento='sitio_visitado')::integer as visitas,
  count(distinct metadata->>'session_id') filter (where metadata ? 'session_id')::integer as sesiones,
  count(distinct metadata->>'journey_id') filter (where metadata ? 'journey_id')::integer as recorridos,
  count(*) filter (where evento='busqueda_realizada')::integer as busquedas,
  count(*) filter (where evento='parcela_view')::integer as parcelas_vistas,
  count(*) filter (where evento='cotizador_iniciado')::integer as cotizadores_iniciados,
  count(*) filter (where evento='cotizacion_guardada')::integer as cotizaciones_guardadas,
  count(*) filter (where evento='whatsapp_click')::integer as contactos_whatsapp,
  count(*) filter (where evento='reserva_iniciada')::integer as reservas_iniciadas,
  count(*) filter (where evento='publicacion_finalizada')::integer as publicaciones_finalizadas
from public.crm_eventos
group by date_trunc('day', creado_en)
order by dia desc;

grant select on public.crm_cerebro_resumen to authenticated;


-- Source: 202607200003_publicador_crm_fotos_idempotencia.sql
-- Ajustes seguros para el publicador unificado y el CRM.
-- Permite conservar las imágenes optimizadas del publicador moderno y mejora
-- la búsqueda de reintentos por clave de idempotencia.

alter table public.publicacion_fotos
  drop constraint if exists publicacion_fotos_tamano_bytes_check;

alter table public.publicacion_fotos
  add constraint publicacion_fotos_tamano_bytes_check
  check (tamano_bytes > 0 and tamano_bytes <= 12582912);

create unique index if not exists publicaciones_idempotency_key_unique_idx
  on public.publicaciones (idempotency_key);

create index if not exists publicaciones_tipo_inmueble_json_idx
  on public.publicaciones ((datos_formulario->>'tipo'));


-- Source: 202607200004_estados_ciclo_vida_publicaciones.sql
-- Amplía el ciclo de vida sin cambiar el significado actual de "aprobada".
-- "aprobada" continúa siendo el estado visible en el catálogo público.
alter type public.publicacion_estado add value if not exists 'vendida';
alter type public.publicacion_estado add value if not exists 'archivada';


-- Source: 202607200005_crm_ciclo_vida_publicaciones.sql
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


-- Source: 202607200006_asesor_compradores_tpl.sql
-- Asesor de Compradores TPL v1
-- Captura consentida, trazabilidad de intereses y continuidad comercial.

alter table public.clientes add column if not exists plazo_compra text;
alter table public.clientes add column if not exists canal_preferido text;
alter table public.clientes add column if not exists frecuencia_contacto text;
alter table public.clientes add column if not exists horario_contacto text;
alter table public.clientes add column if not exists objetivo_compra text;
alter table public.clientes add column if not exists preferencias_busqueda jsonb not null default '{}'::jsonb;
alter table public.clientes add column if not exists asesor_virtual_activo boolean not null default false;
alter table public.clientes add column if not exists journey_id text;

create table if not exists public.cliente_intereses (
  id bigint generated by default as identity primary key,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null default 'parcela',
  propiedad_codigo text,
  origen_propiedad_codigo text,
  accion text not null default 'vista',
  motivo_descarte text,
  metadata jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists cliente_intereses_cliente_fecha_idx
on public.cliente_intereses(cliente_id, creado_en desc);
create index if not exists cliente_intereses_propiedad_idx
on public.cliente_intereses(propiedad_codigo, creado_en desc);

alter table public.cliente_intereses enable row level security;

drop policy if exists "Administradores gestionan intereses" on public.cliente_intereses;
create policy "Administradores gestionan intereses"
on public.cliente_intereses for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.tipo='administrador' and p.activo))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.tipo='administrador' and p.activo));

grant select, insert, update, delete on public.cliente_intereses to authenticated;
grant usage, select on sequence public.cliente_intereses_id_seq to authenticated;

create or replace function public.tpl_captar_comprador_asesor(p_datos jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_cliente_id uuid;
  v_nombre text := nullif(trim(p_datos->>'nombre'),'');
  v_canal text := lower(nullif(trim(p_datos->>'canal'),'');
  v_correo text := nullif(lower(trim(p_datos->>'correo')),'');
  v_whatsapp text := nullif(regexp_replace(coalesce(p_datos->>'whatsapp',''),'[^0-9+]','','g'),'');
  v_journey text := nullif(trim(p_datos->>'journey_id'),'');
  v_propiedad text;
  v_vista jsonb;
begin
  if coalesce((p_datos->>'acepta_contacto')::boolean,false) is not true then
    raise exception 'Se requiere autorización de contacto';
  end if;
  if v_canal not in ('whatsapp','correo','ambos') then
    raise exception 'Canal inválido';
  end if;
  if v_canal in ('correo','ambos') and (v_correo is null or v_correo !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'Correo inválido';
  end if;
  if v_canal in ('whatsapp','ambos') and (v_whatsapp is null or length(regexp_replace(v_whatsapp,'[^0-9]','','g')) < 8) then
    raise exception 'WhatsApp inválido';
  end if;

  select id into v_cliente_id
  from public.clientes
  where (v_correo is not null and correo=v_correo)
     or (v_whatsapp is not null and coalesce(whatsapp,telefono)=v_whatsapp)
  order by actualizado_en desc nulls last
  limit 1;

  if v_cliente_id is null then
    insert into public.clientes(
      nombre,correo,telefono,whatsapp,medio_contacto_preferido,canal_preferido,
      plazo_compra,frecuencia_contacto,horario_contacto,objetivo_compra,
      preferencias_busqueda,acepta_tratamiento_datos,asesor_virtual_activo,
      journey_id,estado,etapa,origen,urgencia,ultima_interaccion_en
    ) values (
      coalesce(v_nombre,'Cliente TPL'),v_correo,v_whatsapp,v_whatsapp,v_canal,v_canal,
      nullif(p_datos->>'plazo_compra',''),nullif(p_datos->>'frecuencia',''),
      nullif(p_datos->>'horario',''),nullif(p_datos->>'objetivo',''),
      coalesce(p_datos->'preferencias','{}'::jsonb),true,true,v_journey,
      'nuevo','busqueda_activa','asesor_tpl_web',nullif(p_datos->>'urgencia',''),now()
    ) returning id into v_cliente_id;
  else
    update public.clientes set
      nombre=coalesce(v_nombre,nombre), correo=coalesce(v_correo,correo),
      telefono=coalesce(v_whatsapp,telefono), whatsapp=coalesce(v_whatsapp,whatsapp),
      medio_contacto_preferido=v_canal, canal_preferido=v_canal,
      plazo_compra=coalesce(nullif(p_datos->>'plazo_compra',''),plazo_compra),
      frecuencia_contacto=coalesce(nullif(p_datos->>'frecuencia',''),frecuencia_contacto),
      horario_contacto=coalesce(nullif(p_datos->>'horario',''),horario_contacto),
      objetivo_compra=coalesce(nullif(p_datos->>'objetivo',''),objetivo_compra),
      preferencias_busqueda=preferencias_busqueda || coalesce(p_datos->'preferencias','{}'::jsonb),
      acepta_tratamiento_datos=true, asesor_virtual_activo=true,
      journey_id=coalesce(v_journey,journey_id), estado='activo', etapa='busqueda_activa',
      ultima_interaccion_en=now(), actualizado_en=now()
    where id=v_cliente_id;
  end if;

  for v_vista in select value from jsonb_array_elements(coalesce(p_datos->'parcelas_vistas','[]'::jsonb)) loop
    v_propiedad := nullif(trim(coalesce(v_vista->>'codigo',v_vista#>>'{}')),'');
    if v_propiedad is not null then
      insert into public.cliente_intereses(cliente_id,tipo,propiedad_codigo,accion,metadata)
      values(v_cliente_id,'parcela',v_propiedad,'vista',jsonb_build_object('origen','captacion_asesor_tpl'));
    end if;
  end loop;

  insert into public.cliente_intereses(cliente_id,tipo,accion,motivo_descarte,metadata)
  values(v_cliente_id,'busqueda','solicito_asesor',nullif(p_datos->>'motivo_no_encontro',''),
    jsonb_build_object('plazo_compra',p_datos->>'plazo_compra','canal',v_canal,'journey_id',v_journey));

  return jsonb_build_object('ok',true,'cliente_id',v_cliente_id,'estado','busqueda_activa');
end;
$$;

revoke all on function public.tpl_captar_comprador_asesor(jsonb) from public;
grant execute on function public.tpl_captar_comprador_asesor(jsonb) to anon, authenticated;


-- Source: 202607220001_consolidar_crm_produccion.sql
-- Consolidación del CRM Tu Parcela Lista.
-- Ejecutar una sola vez después de las migraciones anteriores.

begin;

grant usage on schema public to authenticated;

-- El CRM debe operar solamente para administradores activos.
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
      and coalesce(p.activo, true) = true
  );
$$;

revoke all on function public.es_administrador_activo() from public, anon;
grant execute on function public.es_administrador_activo() to authenticated;

-- Completa el modelo de contratistas esperado por la interfaz sin perder campos antiguos.
do $$
begin
  if to_regclass('public.contratistas') is not null then
    alter table public.contratistas add column if not exists nombre_comercial text;
    alter table public.contratistas add column if not exists whatsapp text;
    alter table public.contratistas add column if not exists region text;
    alter table public.contratistas add column if not exists comunas_atendidas text;
    alter table public.contratistas add column if not exists tipo_servicio text;
    alter table public.contratistas add column if not exists rating numeric(3,2) default 0;
    alter table public.contratistas add column if not exists plan_elegido text default 'gratis';
    alter table public.contratistas add column if not exists estado_verificacion text default 'pendiente';

    update public.contratistas
    set nombre_comercial = coalesce(nullif(nombre_comercial, ''), nombre_empresa),
        whatsapp = coalesce(nullif(whatsapp, ''), telefono),
        region = coalesce(nullif(region, ''), ubicacion_base),
        tipo_servicio = coalesce(nullif(tipo_servicio, ''), notas_capacidades),
        estado_verificacion = coalesce(nullif(estado_verificacion, ''), 'pendiente')
    where nombre_comercial is null
       or whatsapp is null
       or region is null
       or tipo_servicio is null
       or estado_verificacion is null;
  end if;
end
$$;

-- Privilegios mínimos de tablas que usa directamente el dashboard.
do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'profiles','clientes','crm_tareas','proyectos','crm_eventos','publicaciones',
    'contratistas','tasaciones','configuracion_tasador'
  ] loop
    if to_regclass('public.' || tabla) is not null then
      execute format('grant select on table public.%I to authenticated', tabla);
    end if;
  end loop;

  foreach tabla in array array['clientes','crm_tareas','crm_eventos','contratistas'] loop
    if to_regclass('public.' || tabla) is not null then
      execute format('grant insert, update on table public.%I to authenticated', tabla);
    end if;
  end loop;
end
$$;

-- Políticas administrativas uniformes para las tablas internas del CRM.
do $$
declare
  tabla text;
  policy_name text;
begin
  foreach tabla in array array[
    'profiles','clientes','crm_tareas','proyectos','crm_eventos','publicaciones',
    'contratistas','tasaciones','configuracion_tasador'
  ] loop
    if to_regclass('public.' || tabla) is not null then
      execute format('alter table public.%I enable row level security', tabla);
      policy_name := 'CRM administradores ' || tabla;
      execute format('drop policy if exists %I on public.%I', policy_name, tabla);
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo())',
        policy_name,
        tabla
      );
    end if;
  end loop;
end
$$;

-- La vista del embudo hereda la seguridad de clientes.
do $$
begin
  if to_regclass('public.crm_resumen_embudo') is not null then
    grant select on public.crm_resumen_embudo to authenticated;
  end if;
end
$$;

-- Funciones RPC utilizadas por crm.js.
do $$
declare
  signature text;
begin
  foreach signature in array array[
    'public.crm_sesion_actual()',
    'public.crm_contadores_publicaciones()',
    'public.crm_listar_publicaciones(text,date,date,text,text,text)',
    'public.crm_detalle_publicacion(uuid)',
    'public.crm_moderar_publicacion(uuid,text,text,text,text[],text,boolean)'
  ] loop
    if to_regprocedure(signature) is not null then
      execute 'grant execute on function ' || signature || ' to authenticated';
    end if;
  end loop;
end
$$;

commit;


-- Source: 202607220002_edicion_catalogos_crm.sql
-- Edición administrativa de parcelas/publicaciones y casas desde el CRM.

create or replace function public.crm_guardar_publicacion_admin(
  p_publicacion_id uuid,
  p_datos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_admin uuid := public.crm_exigir_administrador();
  v_resultado jsonb;
begin
  if p_publicacion_id is null or jsonb_typeof(p_datos) is distinct from 'object' then
    raise exception using message = 'CRM_PUBLICATION_DATA_INVALID';
  end if;

  update public.publicaciones p set
    titulo_publico = trim(coalesce(p_datos->>'titulo_publico', p.titulo_publico)),
    descripcion_publica = trim(coalesce(p_datos->>'descripcion_publica', p.descripcion_publica)),
    precio_publicacion = case when p_datos ? 'precio_publicacion' and nullif(p_datos->>'precio_publicacion','') is not null then (p_datos->>'precio_publicacion')::bigint else null end,
    superficie_m2 = case when p_datos ? 'superficie_m2' and nullif(p_datos->>'superficie_m2','') is not null then (p_datos->>'superficie_m2')::numeric else null end,
    rol = nullif(trim(p_datos->>'rol'), ''),
    region = trim(coalesce(p_datos->>'region', p.region)),
    comuna = trim(coalesce(p_datos->>'comuna', p.comuna)),
    sector = trim(coalesce(p_datos->>'sector', p.sector)),
    ubicacion_publica_aproximada = trim(coalesce(p_datos->>'ubicacion_publica_aproximada', p.ubicacion_publica_aproximada)),
    ciudad_principal = nullif(trim(p_datos->>'ciudad_principal'), ''),
    distancia_ciudad = nullif(trim(p_datos->>'distancia_ciudad'), ''),
    latitud_privada = case when p_datos ? 'latitud_privada' and nullif(p_datos->>'latitud_privada','') is not null then (p_datos->>'latitud_privada')::numeric else null end,
    longitud_privada = case when p_datos ? 'longitud_privada' and nullif(p_datos->>'longitud_privada','') is not null then (p_datos->>'longitud_privada')::numeric else null end,
    agua = nullif(trim(p_datos->>'agua'), ''),
    luz = nullif(trim(p_datos->>'luz'), ''),
    acceso = nullif(trim(p_datos->>'acceso'), ''),
    topografia = nullif(trim(p_datos->>'topografia'), ''),
    naturaleza = coalesce(array(select jsonb_array_elements_text(coalesce(p_datos->'naturaleza','[]'::jsonb))), '{}'),
    cuerpos_agua = coalesce(array(select jsonb_array_elements_text(coalesce(p_datos->'cuerpos_agua','[]'::jsonb))), '{}'),
    servicios = coalesce(array(select jsonb_array_elements_text(coalesce(p_datos->'servicios','[]'::jsonb))), '{}'),
    facilidad_pago = coalesce((p_datos->>'facilidad_pago')::boolean, false),
    detalle_facilidad_pago = nullif(trim(p_datos->>'detalle_facilidad_pago'), ''),
    contacto_nombre = trim(coalesce(p_datos->>'contacto_nombre', p.contacto_nombre)),
    contacto_email = trim(coalesce(p_datos->>'contacto_email', p.contacto_email)),
    contacto_telefono = nullif(trim(p_datos->>'contacto_telefono'), ''),
    contacto_organizacion = nullif(trim(p_datos->>'contacto_organizacion'), ''),
    plan_seleccionado = nullif(trim(p_datos->>'plan_seleccionado'), ''),
    datos_formulario = coalesce(p_datos->'datos_formulario', p.datos_formulario),
    actualizado_en = now()
  where p.id = p_publicacion_id;

  if not found then raise exception using message = 'CRM_PUBLICATION_NOT_FOUND'; end if;

  insert into public.moderacion_registros(publicacion_id, estado_nuevo, motivo, responsable_id, evidencia)
  select p.id, p.estado, 'Edición administrativa desde CRM', v_admin,
    jsonb_build_object('accion','edicion_manual','actualizado_en',now())
  from public.publicaciones p where p.id = p_publicacion_id;

  select to_jsonb(p) - 'idempotency_key' into v_resultado from public.publicaciones p where p.id = p_publicacion_id;
  return v_resultado;
end;
$$;

create or replace function public.crm_listar_casas_admin()
returns setof public.casas
language plpgsql stable security definer set search_path = pg_catalog
as $$ begin perform public.crm_exigir_administrador(); return query select * from public.casas order by destacada desc, activa desc, superficie_m2, nombre; end; $$;

create or replace function public.crm_detalle_casa_admin(p_casa_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = pg_catalog
as $$ declare v jsonb; begin perform public.crm_exigir_administrador(); select to_jsonb(c) into v from public.casas c where c.id=p_casa_id; if v is null then raise exception using message='CRM_HOUSE_NOT_FOUND'; end if; return v; end; $$;

create or replace function public.crm_guardar_casa_admin(p_casa_id uuid, p_datos jsonb)
returns jsonb
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_id uuid; v_result jsonb;
begin
  perform public.crm_exigir_administrador();
  if jsonb_typeof(p_datos) is distinct from 'object' then raise exception using message='CRM_HOUSE_DATA_INVALID'; end if;
  if nullif(trim(p_datos->>'nombre'),'') is null then raise exception using message='CRM_HOUSE_NAME_REQUIRED'; end if;

  if p_casa_id is null then
    insert into public.casas(codigo,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,tipo_construccion,plano_url,imagen_principal_url,imagenes,activa,destacada)
    values(nullif(trim(p_datos->>'codigo'),''),trim(p_datos->>'nombre'),nullif(trim(p_datos->>'descripcion'),''),(p_datos->>'superficie_m2')::numeric,(p_datos->>'habitaciones')::int,(p_datos->>'banos')::int,(p_datos->>'precio_base')::numeric,nullif(trim(p_datos->>'tipo_construccion'),''),nullif(trim(p_datos->>'plano_url'),''),nullif(trim(p_datos->>'imagen_principal_url'),''),coalesce(p_datos->'imagenes','[]'::jsonb),coalesce((p_datos->>'activa')::boolean,true),coalesce((p_datos->>'destacada')::boolean,false)) returning id into v_id;
  else
    update public.casas c set codigo=nullif(trim(p_datos->>'codigo'),''),nombre=trim(p_datos->>'nombre'),descripcion=nullif(trim(p_datos->>'descripcion'),''),superficie_m2=(p_datos->>'superficie_m2')::numeric,habitaciones=(p_datos->>'habitaciones')::int,banos=(p_datos->>'banos')::int,precio_base=(p_datos->>'precio_base')::numeric,tipo_construccion=nullif(trim(p_datos->>'tipo_construccion'),''),plano_url=nullif(trim(p_datos->>'plano_url'),''),imagen_principal_url=nullif(trim(p_datos->>'imagen_principal_url'),''),imagenes=coalesce(p_datos->'imagenes','[]'::jsonb),activa=coalesce((p_datos->>'activa')::boolean,true),destacada=coalesce((p_datos->>'destacada')::boolean,false),actualizado_en=now() where c.id=p_casa_id returning id into v_id;
    if v_id is null then raise exception using message='CRM_HOUSE_NOT_FOUND'; end if;
  end if;
  select to_jsonb(c) into v_result from public.casas c where c.id=v_id; return v_result;
end;
$$;

revoke all on function public.crm_guardar_publicacion_admin(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.crm_listar_casas_admin() from public,anon,authenticated;
revoke all on function public.crm_detalle_casa_admin(uuid) from public,anon,authenticated;
revoke all on function public.crm_guardar_casa_admin(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.crm_guardar_publicacion_admin(uuid,jsonb) to authenticated;
grant execute on function public.crm_listar_casas_admin() to authenticated;
grant execute on function public.crm_detalle_casa_admin(uuid) to authenticated;
grant execute on function public.crm_guardar_casa_admin(uuid,jsonb) to authenticated;


-- Source: 202607220003_motor_automatizacion_comercial.sql
-- ============================================================
-- TPL CRM 2.0 — MOTOR DE AUTOMATIZACIÓN COMERCIAL Y OPERATIVA
-- Ejecutar después de 202607220001 y 202607220002
-- No elimina datos existentes.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Ampliación segura de clientes para priorización automática
alter table public.clientes add column if not exists score integer not null default 0;
alter table public.clientes add column if not exists prioridad text not null default 'frio';
alter table public.clientes add column if not exists probabilidad_compra integer not null default 0;
alter table public.clientes add column if not exists valor_proyecto_estimado numeric not null default 0;
alter table public.clientes add column if not exists urgencia text;
alter table public.clientes add column if not exists ultima_interaccion_en timestamptz;
alter table public.clientes add column if not exists ultimo_contacto_en timestamptz;
alter table public.clientes add column if not exists proxima_accion text;
alter table public.clientes add column if not exists proxima_accion_en timestamptz;
alter table public.clientes add column if not exists score_detalle jsonb not null default '{}'::jsonb;
alter table public.clientes add column if not exists visitas_sitio integer not null default 0;
alter table public.clientes add column if not exists aperturas_cotizacion integer not null default 0;
alter table public.clientes add column if not exists respuestas_whatsapp integer not null default 0;
alter table public.clientes add column if not exists etapa text not null default 'nuevo';
alter table public.clientes add column if not exists origen text;

-- 2) Visitas
create table if not exists public.visitas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  publicacion_id uuid references public.publicaciones(id) on delete set null,
  responsable_id uuid references auth.users(id) on delete set null,
  fecha_solicitada timestamptz,
  fecha_confirmada timestamptz,
  estado text not null default 'solicitada',
  observaciones text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- 3) Reservas de parcelas
create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  publicacion_id uuid not null references public.publicaciones(id) on delete restrict,
  monto numeric not null default 0,
  estado text not null default 'solicitada',
  vence_en timestamptz,
  comprobante_url text,
  condiciones text,
  validada_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- 4) Plan de construcción y etapas
create table if not exists public.planes_construccion (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null unique references public.proyectos(id) on delete cascade,
  contratista_id uuid references public.contratistas(id) on delete set null,
  estado text not null default 'pendiente_contratista',
  fecha_inicio_estimada date,
  fecha_termino_estimada date,
  monto_contratado numeric not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.etapas_trabajo (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planes_construccion(id) on delete cascade,
  orden integer not null,
  nombre text not null,
  descripcion text,
  porcentaje_proyecto numeric not null default 0,
  porcentaje_pago numeric not null default 0,
  monto numeric not null default 0,
  estado text not null default 'pendiente',
  fecha_inicio_estimada date,
  fecha_termino_estimada date,
  requiere_aprobacion boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique(plan_id, orden)
);

create table if not exists public.avances_trabajo (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references public.etapas_trabajo(id) on delete cascade,
  contratista_id uuid references public.contratistas(id) on delete set null,
  descripcion text not null,
  porcentaje_avance numeric not null check (porcentaje_avance between 0 and 100),
  archivos jsonb not null default '[]'::jsonb,
  materiales jsonb not null default '[]'::jsonb,
  problemas text,
  estado_revision text not null default 'pendiente_cliente',
  enviado_en timestamptz not null default now(),
  revisado_en timestamptz
);

create table if not exists public.observaciones_avance (
  id uuid primary key default gen_random_uuid(),
  avance_id uuid not null references public.avances_trabajo(id) on delete cascade,
  autor_tipo text not null,
  autor_id uuid,
  comentario text not null,
  creado_en timestamptz not null default now()
);

create table if not exists public.solicitudes_pago (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references public.etapas_trabajo(id) on delete cascade,
  avance_id uuid references public.avances_trabajo(id) on delete set null,
  monto_solicitado numeric not null check (monto_solicitado >= 0),
  estado text not null default 'pendiente_aprobacion',
  comprobante_url text,
  solicitado_en timestamptz not null default now(),
  aprobado_en timestamptz,
  pagado_en timestamptz
);

-- 5) Cola de notificaciones multicanal
create table if not exists public.notificaciones_salida (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  destinatario text not null,
  canal text not null check (canal in ('whatsapp','sms','email','interno')),
  plantilla text not null,
  asunto text,
  mensaje text not null,
  enlace text,
  payload jsonb not null default '{}'::jsonb,
  estado text not null default 'pendiente',
  intentos integer not null default 0,
  ultimo_error text,
  programada_para timestamptz not null default now(),
  enviada_en timestamptz,
  creado_en timestamptz not null default now()
);

create index if not exists idx_notificaciones_salida_pendientes on public.notificaciones_salida(estado, programada_para);
create index if not exists idx_clientes_prioridad_score on public.clientes(score desc, ultima_interaccion_en desc);
create index if not exists idx_visitas_estado_fecha on public.visitas(estado, fecha_solicitada);
create index if not exists idx_reservas_estado_vence on public.reservas(estado, vence_en);

-- 6) Motor de puntaje comercial
create or replace function public.tpl_recalcular_prioridad_cliente(p_cliente_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.clientes%rowtype;
  v_visitas integer := 0;
  v_reservas integer := 0;
  v_compras integer := 0;
  v_proyectos integer := 0;
  v_score integer := 0;
  v_prob integer := 0;
  v_prioridad text;
  v_accion text;
  v_accion_en timestamptz;
begin
  perform public.crm_exigir_administrador();
  select * into c from public.clientes where id = p_cliente_id;
  if not found then raise exception 'Cliente no encontrado'; end if;

  select count(*) into v_visitas from public.visitas where cliente_id=p_cliente_id and estado not in ('cancelada');
  select count(*) into v_reservas from public.reservas where cliente_id=p_cliente_id and estado in ('solicitada','pendiente_pago','pagada','validada');
  select count(*) into v_compras from public.reservas where cliente_id=p_cliente_id and estado in ('compra_confirmada');
  select count(*) into v_proyectos from public.proyectos where cliente_id=p_cliente_id;

  v_score := least(1000,
      least(coalesce(c.visitas_sitio,0),20) * 5
    + least(coalesce(c.aperturas_cotizacion,0),20) * 8
    + least(coalesce(c.respuestas_whatsapp,0),10) * 15
    + v_visitas * 120
    + v_reservas * 280
    + v_compras * 500
    + v_proyectos * 60
    + case when coalesce(c.presupuesto_estimado,0) >= 30000000 then 80 else 0 end
    + case when c.urgencia in ('alta','muy_alta') then 100 when c.urgencia='media' then 40 else 0 end
    + case when c.ultima_interaccion_en > now()-interval '48 hours' then 50 else 0 end
  );

  v_prob := least(99, greatest(1, round(v_score / 10.0)::integer));
  v_prioridad := case
    when v_score >= 850 then 'muy_caliente'
    when v_score >= 650 then 'prioritario'
    when v_score >= 400 then 'interesado'
    when v_score >= 180 then 'activo'
    else 'frio' end;

  if v_compras > 0 then
    v_accion := 'Activar o revisar plan de construcción'; v_accion_en := now();
  elsif v_reservas > 0 then
    v_accion := 'Confirmar pago o vencimiento de reserva'; v_accion_en := now();
  elsif v_visitas > 0 then
    v_accion := 'Confirmar o hacer seguimiento de visita'; v_accion_en := now();
  elsif c.ultimo_contacto_en is null or c.ultimo_contacto_en < now()-interval '3 days' then
    v_accion := 'Llamar al cliente'; v_accion_en := now();
  else
    v_accion := 'Esperar próxima interacción'; v_accion_en := now()+interval '2 days';
  end if;

  update public.clientes
  set score=v_score,
      probabilidad_compra=v_prob,
      prioridad=v_prioridad,
      proxima_accion=v_accion,
      proxima_accion_en=v_accion_en,
      score_detalle=jsonb_build_object(
        'visitas_sitio',coalesce(c.visitas_sitio,0),
        'aperturas_cotizacion',coalesce(c.aperturas_cotizacion,0),
        'respuestas_whatsapp',coalesce(c.respuestas_whatsapp,0),
        'visitas_solicitadas',v_visitas,
        'reservas',v_reservas,
        'compras',v_compras,
        'proyectos',v_proyectos
      ),
      actualizado_en=now()
  where id=p_cliente_id;

  return jsonb_build_object('cliente_id',p_cliente_id,'score',v_score,'prioridad',v_prioridad,'probabilidad',v_prob,'proxima_accion',v_accion);
end $$;

-- 7) Registro de comportamiento del sitio
create or replace function public.tpl_registrar_comportamiento_cliente(
  p_cliente_id uuid,
  p_evento text,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.crm_exigir_administrador();
  update public.clientes set
    visitas_sitio = visitas_sitio + case when p_evento in ('visita_sitio','vista_parcela','vista_casa') then 1 else 0 end,
    aperturas_cotizacion = aperturas_cotizacion + case when p_evento in ('cotizacion_abierta','pdf_descargado') then 1 else 0 end,
    respuestas_whatsapp = respuestas_whatsapp + case when p_evento='whatsapp_respondido' then 1 else 0 end,
    ultima_interaccion_en=now(),
    valor_proyecto_estimado=greatest(valor_proyecto_estimado,coalesce(nullif(p_metadata->>'valor','')::numeric,0)),
    actualizado_en=now()
  where id=p_cliente_id;

  insert into public.crm_eventos(evento,etapa,cliente_id,origen,pagina,metadata)
  values(p_evento,coalesce(p_metadata->>'etapa','comportamiento'),p_cliente_id,coalesce(p_metadata->>'origen','sitio'),p_metadata->>'pagina',p_metadata);

  return public.tpl_recalcular_prioridad_cliente(p_cliente_id);
end $$;

-- 8) Flujo automatizado visita -> reserva -> compra -> construcción
create or replace function public.tpl_solicitar_visita(
  p_cliente_id uuid,
  p_publicacion_id uuid,
  p_fecha timestamptz,
  p_observaciones text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_dest text;
begin
  perform public.crm_exigir_administrador();
  insert into public.visitas(cliente_id,publicacion_id,fecha_solicitada,observaciones)
  values(p_cliente_id,p_publicacion_id,p_fecha,p_observaciones) returning id into v_id;

  select coalesce(contacto_telefono,contacto_email,'crm') into v_dest from public.publicaciones where id=p_publicacion_id;
  insert into public.notificaciones_salida(cliente_id,destinatario,canal,plantilla,mensaje,payload)
  values(p_cliente_id,v_dest,case when v_dest like '%@%' then 'email' else 'whatsapp' end,'visita_nueva','Nueva solicitud de visita pendiente de confirmación',jsonb_build_object('visita_id',v_id,'publicacion_id',p_publicacion_id,'fecha',p_fecha));

  perform public.tpl_recalcular_prioridad_cliente(p_cliente_id);
  return v_id;
end $$;

create or replace function public.tpl_crear_reserva(
  p_cliente_id uuid,
  p_proyecto_id uuid,
  p_publicacion_id uuid,
  p_monto numeric,
  p_horas_vigencia integer default 48
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  perform public.crm_exigir_administrador();
  insert into public.reservas(cliente_id,proyecto_id,publicacion_id,monto,estado,vence_en)
  values(p_cliente_id,p_proyecto_id,p_publicacion_id,p_monto,'pendiente_pago',now()+make_interval(hours=>greatest(p_horas_vigencia,1))) returning id into v_id;
  update public.proyectos set estado='reserva_pendiente',actualizado_en=now() where id=p_proyecto_id;
  insert into public.notificaciones_salida(cliente_id,proyecto_id,destinatario,canal,plantilla,mensaje,payload)
  select p_cliente_id,p_proyecto_id,coalesce(whatsapp,telefono,correo),'whatsapp','reserva_creada','Tu reserva fue creada. Completa el pago antes del vencimiento.',jsonb_build_object('reserva_id',v_id,'monto',p_monto)
  from public.clientes where id=p_cliente_id;
  perform public.tpl_recalcular_prioridad_cliente(p_cliente_id);
  return v_id;
end $$;

create or replace function public.tpl_confirmar_compra_y_activar_construccion(p_reserva_id uuid)
returns uuid
language plpgsql security definer set search_path=public as $$
declare r public.reservas%rowtype; v_plan uuid; v_total numeric;
begin
  perform public.crm_exigir_administrador();
  select * into r from public.reservas where id=p_reserva_id for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  update public.reservas set estado='compra_confirmada',validada_en=now(),actualizado_en=now() where id=p_reserva_id;
  update public.proyectos set estado='contratista_por_asignar',actualizado_en=now() where id=r.proyecto_id;
  select total into v_total from public.proyectos where id=r.proyecto_id;
  insert into public.planes_construccion(proyecto_id,monto_contratado)
  values(r.proyecto_id,coalesce(v_total,0))
  on conflict(proyecto_id) do update set actualizado_en=now()
  returning id into v_plan;

  insert into public.etapas_trabajo(plan_id,orden,nombre,descripcion,porcentaje_proyecto,porcentaje_pago,monto)
  values
   (v_plan,1,'Inicio y preparación','Limpieza, trazado e instalación de faena',10,10,coalesce(v_total,0)*0.10),
   (v_plan,2,'Fundaciones','Excavaciones, radier o fundaciones',20,20,coalesce(v_total,0)*0.20),
   (v_plan,3,'Estructura','Muros, estructura y techumbre',30,25,coalesce(v_total,0)*0.25),
   (v_plan,4,'Instalaciones','Electricidad, agua y saneamiento',15,20,coalesce(v_total,0)*0.20),
   (v_plan,5,'Terminaciones','Pisos, pintura, puertas y artefactos',20,15,coalesce(v_total,0)*0.15),
   (v_plan,6,'Entrega','Revisión, observaciones y recepción final',5,10,coalesce(v_total,0)*0.10)
  on conflict(plan_id,orden) do nothing;

  insert into public.notificaciones_salida(cliente_id,proyecto_id,destinatario,canal,plantilla,mensaje,payload)
  select r.cliente_id,r.proyecto_id,coalesce(whatsapp,telefono,correo),'whatsapp','compra_confirmada','Compra confirmada. Se activó la búsqueda de contratista y tu plan de construcción.',jsonb_build_object('plan_id',v_plan)
  from public.clientes where id=r.cliente_id;
  perform public.tpl_recalcular_prioridad_cliente(r.cliente_id);
  return v_plan;
end $$;

-- 9) Avances y aprobación del cliente
create or replace function public.tpl_publicar_avance(
  p_etapa_id uuid,
  p_contratista_id uuid,
  p_descripcion text,
  p_porcentaje numeric,
  p_archivos jsonb default '[]'::jsonb,
  p_monto_solicitado numeric default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_avance uuid; v_proyecto uuid; v_cliente uuid;
begin
  perform public.crm_exigir_administrador();
  insert into public.avances_trabajo(etapa_id,contratista_id,descripcion,porcentaje_avance,archivos)
  values(p_etapa_id,p_contratista_id,p_descripcion,p_porcentaje,p_archivos) returning id into v_avance;
  update public.etapas_trabajo set estado='pendiente_revision',actualizado_en=now() where id=p_etapa_id;
  select pc.proyecto_id,p.cliente_id into v_proyecto,v_cliente
  from public.etapas_trabajo e join public.planes_construccion pc on pc.id=e.plan_id join public.proyectos p on p.id=pc.proyecto_id
  where e.id=p_etapa_id;
  if p_monto_solicitado is not null then
    insert into public.solicitudes_pago(etapa_id,avance_id,monto_solicitado) values(p_etapa_id,v_avance,p_monto_solicitado);
  end if;
  insert into public.notificaciones_salida(cliente_id,proyecto_id,destinatario,canal,plantilla,mensaje,payload)
  select v_cliente,v_proyecto,coalesce(whatsapp,telefono,correo),'whatsapp','avance_nuevo','El contratista subió un nuevo avance para tu revisión.',jsonb_build_object('avance_id',v_avance,'etapa_id',p_etapa_id)
  from public.clientes where id=v_cliente;
  return v_avance;
end $$;

create or replace function public.tpl_revisar_avance(p_avance_id uuid,p_decision text,p_comentario text default null)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare a public.avances_trabajo%rowtype; v_estado text;
begin
  perform public.crm_exigir_administrador();
  if p_decision not in ('aprobado','observado') then raise exception 'Decisión inválida'; end if;
  select * into a from public.avances_trabajo where id=p_avance_id for update;
  if not found then raise exception 'Avance no encontrado'; end if;
  v_estado := case when p_decision='aprobado' then 'aprobado' else 'observado' end;
  update public.avances_trabajo set estado_revision=v_estado,revisado_en=now() where id=p_avance_id;
  update public.etapas_trabajo set estado=case when p_decision='aprobado' and a.porcentaje_avance>=100 then 'completada' when p_decision='aprobado' then 'en_progreso' else 'observada' end,actualizado_en=now() where id=a.etapa_id;
  if nullif(trim(p_comentario),'') is not null then insert into public.observaciones_avance(avance_id,autor_tipo,comentario) values(p_avance_id,'cliente',p_comentario); end if;
  if p_decision='aprobado' then update public.solicitudes_pago set estado='aprobada',aprobado_en=now() where avance_id=p_avance_id and estado='pendiente_aprobacion'; end if;
  return jsonb_build_object('success',true,'estado',v_estado);
end $$;

-- 10) RPC del Top clientes del día
create or replace function public.crm_clientes_prioritarios(p_limite integer default 20)
returns table(
  id uuid,nombre text,correo text,telefono text,whatsapp text,score integer,prioridad text,
  probabilidad_compra integer,valor_proyecto_estimado numeric,etapa text,ultima_interaccion_en timestamptz,
  proxima_accion text,proxima_accion_en timestamptz,score_detalle jsonb
)
language plpgsql security definer set search_path=public as $$
begin
  perform public.crm_exigir_administrador();
  return query
  select c.id,trim(concat_ws(' ',c.nombre,c.apellido)),c.correo,c.telefono,c.whatsapp,c.score,c.prioridad,
         c.probabilidad_compra,c.valor_proyecto_estimado,c.etapa,c.ultima_interaccion_en,
         c.proxima_accion,c.proxima_accion_en,c.score_detalle
  from public.clientes c
  order by c.score desc,c.proxima_accion_en asc nulls last,c.ultima_interaccion_en desc nulls last
  limit greatest(1,least(coalesce(p_limite,20),100));
end;
$$;

-- 10.1) Recalcular la prioridad de todos los clientes desde el CRM
create or replace function public.crm_recalcular_prioridades_clientes()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_cliente record;
  v_total integer := 0;
begin
  perform public.crm_exigir_administrador();
  for v_cliente in select id from public.clientes loop
    perform public.tpl_recalcular_prioridad_cliente(v_cliente.id);
    v_total := v_total + 1;
  end loop;
  return jsonb_build_object('success',true,'clientes_recalculados',v_total);
end $$;

-- 11) RLS administrativa estricta
alter table public.visitas enable row level security;
alter table public.reservas enable row level security;
alter table public.planes_construccion enable row level security;
alter table public.etapas_trabajo enable row level security;
alter table public.avances_trabajo enable row level security;
alter table public.observaciones_avance enable row level security;
alter table public.solicitudes_pago enable row level security;
alter table public.notificaciones_salida enable row level security;

do $$ declare t text; begin
  foreach t in array array['visitas','reservas','planes_construccion','etapas_trabajo','avances_trabajo','observaciones_avance','solicitudes_pago','notificaciones_salida'] loop
    execute format('drop policy if exists "CRM administradores %1$s" on public.%1$I',t);
    execute format('create policy "CRM administradores %1$s" on public.%1$I for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo())',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;

revoke all on function public.tpl_recalcular_prioridad_cliente(uuid) from public;
revoke all on function public.tpl_registrar_comportamiento_cliente(uuid,text,jsonb) from public;
revoke all on function public.tpl_solicitar_visita(uuid,uuid,timestamptz,text) from public;
revoke all on function public.tpl_crear_reserva(uuid,uuid,uuid,numeric,integer) from public;
revoke all on function public.tpl_confirmar_compra_y_activar_construccion(uuid) from public;
revoke all on function public.tpl_publicar_avance(uuid,uuid,text,numeric,jsonb,numeric) from public;
revoke all on function public.tpl_revisar_avance(uuid,text,text) from public;
revoke all on function public.crm_clientes_prioritarios(integer) from public;
revoke all on function public.crm_recalcular_prioridades_clientes() from public;

grant execute on function public.tpl_recalcular_prioridad_cliente(uuid) to authenticated;
grant execute on function public.tpl_registrar_comportamiento_cliente(uuid,text,jsonb) to authenticated;
grant execute on function public.tpl_solicitar_visita(uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.tpl_crear_reserva(uuid,uuid,uuid,numeric,integer) to authenticated;
grant execute on function public.tpl_confirmar_compra_y_activar_construccion(uuid) to authenticated;
grant execute on function public.tpl_publicar_avance(uuid,uuid,text,numeric,jsonb,numeric) to authenticated;
grant execute on function public.tpl_revisar_avance(uuid,text,text) to authenticated;
grant execute on function public.crm_clientes_prioritarios(integer) to authenticated;
grant execute on function public.crm_recalcular_prioridades_clientes() to authenticated;


-- Source: 202607220004_clientes_con_plan_prioridad.sql
-- TPL CRM 2.2 - Clientes con plan y salud de proyectos
-- Ejecutar después de 202607220003_motor_automatizacion_comercial.sql

begin;

alter table public.proyectos add column if not exists plan_nombre text;
alter table public.proyectos add column if not exists plan_comprado_en timestamptz;
alter table public.proyectos add column if not exists ejecutivo_responsable_id uuid references public.profiles(id) on delete set null;
alter table public.proyectos add column if not exists ultimo_contacto_cliente_en timestamptz;
alter table public.proyectos add column if not exists proximo_contacto_cliente_en timestamptz;
alter table public.proyectos add column if not exists satisfaccion_cliente integer check (satisfaccion_cliente between 0 and 100);
alter table public.proyectos add column if not exists cliente_conforme boolean;
alter table public.proyectos add column if not exists reclamo_abierto boolean not null default false;
alter table public.proyectos add column if not exists riesgo_manual text check (riesgo_manual is null or riesgo_manual in ('verde','amarillo','rojo'));
alter table public.proyectos add column if not exists motivo_riesgo text;

create table if not exists public.contactos_cliente_proyecto (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  canal text not null check (canal in ('telefono','whatsapp','correo','reunion','sistema','otro')),
  resultado text,
  notas text,
  contacto_util boolean not null default true,
  realizado_por uuid references public.profiles(id) on delete set null,
  realizado_en timestamptz not null default now(),
  proximo_contacto_en timestamptz
);

create index if not exists idx_contactos_cliente_proyecto_proyecto_fecha
  on public.contactos_cliente_proyecto(proyecto_id, realizado_en desc);
create index if not exists idx_planes_construccion_proyecto_estado
  on public.planes_construccion(proyecto_id, estado);
create index if not exists idx_etapas_trabajo_plan_estado
  on public.etapas_trabajo(plan_id, estado, orden);

alter table public.contactos_cliente_proyecto enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='contactos_cliente_proyecto'
      and policyname='Administradores gestionan contactos de proyectos'
  ) then
    create policy "Administradores gestionan contactos de proyectos"
      on public.contactos_cliente_proyecto
      for all to authenticated
      using (public.es_admin())
      with check (public.es_admin());
  end if;
end $$;

create or replace function public.crm_registrar_contacto_cliente_plan(
  p_proyecto_id uuid,
  p_canal text,
  p_resultado text default null,
  p_notas text default null,
  p_contacto_util boolean default true,
  p_proximo_contacto_en timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_contacto_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Acceso denegado';
  end if;
  if p_canal not in ('telefono','whatsapp','correo','reunion','sistema','otro') then
    raise exception 'Canal inválido';
  end if;

  select cliente_id into v_cliente_id
  from public.proyectos
  where id = p_proyecto_id;

  if v_cliente_id is null then
    raise exception 'Proyecto o cliente no encontrado';
  end if;

  insert into public.contactos_cliente_proyecto(
    proyecto_id, cliente_id, canal, resultado, notas,
    contacto_util, realizado_por, proximo_contacto_en
  ) values (
    p_proyecto_id, v_cliente_id, p_canal, p_resultado, p_notas,
    p_contacto_util, auth.uid(), p_proximo_contacto_en
  ) returning id into v_contacto_id;

  if p_contacto_util then
    update public.proyectos
      set ultimo_contacto_cliente_en = now(),
          proximo_contacto_cliente_en = p_proximo_contacto_en,
          actualizado_en = now()
    where id = p_proyecto_id;

    update public.clientes
      set ultimo_contacto_en = now(),
          proxima_accion = case when p_proximo_contacto_en is null then proxima_accion else 'Contactar cliente con plan' end,
          proxima_accion_en = coalesce(p_proximo_contacto_en, proxima_accion_en),
          actualizado_en = now()
    where id = v_cliente_id;
  end if;

  return v_contacto_id;
end;
$$;

create or replace function public.crm_clientes_con_plan(p_limite integer default 100)
returns table (
  proyecto_id uuid,
  numero_proyecto text,
  cliente_id uuid,
  cliente_nombre text,
  correo text,
  telefono text,
  whatsapp text,
  plan_nombre text,
  proyecto_estado text,
  total numeric,
  plan_estado text,
  etapa_actual text,
  etapa_estado text,
  avance_porcentaje numeric,
  ultima_actualizacion timestamptz,
  ultimo_contacto timestamptz,
  dias_sin_contacto integer,
  dias_sin_actualizacion integer,
  observaciones_pendientes integer,
  pagos_pendientes integer,
  etapas_atrasadas integer,
  satisfaccion integer,
  salud text,
  puntaje_salud integer,
  proxima_accion text,
  fecha_proxima_accion timestamptz
)
language sql
security definer
set search_path = public
as $$
with base as (
  select
    p.id proyecto_id,
    p.numero_proyecto,
    c.id cliente_id,
    trim(concat_ws(' ', c.nombre, c.apellido)) cliente_nombre,
    c.correo,
    c.telefono,
    c.whatsapp,
    coalesce(nullif(p.plan_nombre,''), 'Plan contratado') plan_nombre,
    p.estado proyecto_estado,
    p.total,
    pc.id plan_id,
    pc.estado plan_estado,
    p.satisfaccion_cliente,
    p.riesgo_manual,
    p.reclamo_abierto,
    coalesce(
      p.ultimo_contacto_cliente_en,
      (select max(ccp.realizado_en) from public.contactos_cliente_proyecto ccp where ccp.proyecto_id=p.id and ccp.contacto_util),
      p.plan_comprado_en,
      p.activado_en,
      p.creado_en
    ) ultimo_contacto,
    greatest(p.actualizado_en, coalesce(pc.actualizado_en,p.actualizado_en),
      coalesce((select max(a.enviado_en) from public.avances_trabajo a join public.etapas_trabajo e on e.id=a.etapa_id where e.plan_id=pc.id),p.actualizado_en)
    ) ultima_actualizacion,
    p.proximo_contacto_cliente_en
  from public.proyectos p
  join public.clientes c on c.id=p.cliente_id
  left join public.planes_construccion pc on pc.proyecto_id=p.id
  where p.plan_comprado_en is not null
     or pc.id is not null
     or p.estado in ('reservado','comprado','proyecto_activo','construccion','en_construccion','entregado','garantia')
), calc as (
  select b.*,
    coalesce((select e.nombre from public.etapas_trabajo e where e.plan_id=b.plan_id order by case when e.estado in ('en_progreso','pendiente_revision','observada') then 0 else 1 end, e.orden limit 1),'Preparación') etapa_actual,
    coalesce((select e.estado from public.etapas_trabajo e where e.plan_id=b.plan_id order by case when e.estado in ('en_progreso','pendiente_revision','observada') then 0 else 1 end, e.orden limit 1),'pendiente') etapa_estado,
    coalesce((select sum(least(100,greatest(0,coalesce(a.porcentaje_avance,case when e.estado='completada' then 100 else 0 end))) * e.porcentaje_proyecto/100)
      from public.etapas_trabajo e left join lateral (select max(av.porcentaje_avance) porcentaje_avance from public.avances_trabajo av where av.etapa_id=e.id) a on true where e.plan_id=b.plan_id),0) avance_porcentaje,
    coalesce((select count(*) from public.observaciones_avance o join public.avances_trabajo a on a.id=o.avance_id join public.etapas_trabajo e on e.id=a.etapa_id where e.plan_id=b.plan_id and a.estado_revision='observado'),0)::int observaciones_pendientes,
    coalesce((select count(*) from public.solicitudes_pago sp join public.etapas_trabajo e on e.id=sp.etapa_id where e.plan_id=b.plan_id and sp.estado in ('pendiente_aprobacion','aprobada')),0)::int pagos_pendientes,
    coalesce((select count(*) from public.etapas_trabajo e where e.plan_id=b.plan_id and e.fecha_termino_estimada < current_date and e.estado not in ('completada','cancelada')),0)::int etapas_atrasadas,
    floor(extract(epoch from (now()-b.ultimo_contacto))/86400)::int dias_sin_contacto,
    floor(extract(epoch from (now()-b.ultima_actualizacion))/86400)::int dias_sin_actualizacion
  from base b
), scored as (
  select c.*,
    greatest(0,least(100,
      100
      - case when c.dias_sin_contacto > 7 then 35 when c.dias_sin_contacto >= 3 then 15 else 0 end
      - case when c.dias_sin_actualizacion > 7 then 25 when c.dias_sin_actualizacion >= 3 then 10 else 0 end
      - least(30,c.etapas_atrasadas*15)
      - least(20,c.observaciones_pendientes*10)
      - case when c.reclamo_abierto then 35 else 0 end
      + case when c.satisfaccion_cliente >= 90 then 5 else 0 end
    ))::int puntaje_calculado
  from calc c
)
select
  s.proyecto_id,s.numero_proyecto,s.cliente_id,s.cliente_nombre,s.correo,s.telefono,s.whatsapp,
  s.plan_nombre,s.proyecto_estado,s.total,s.plan_estado,s.etapa_actual,s.etapa_estado,
  round(s.avance_porcentaje,1),s.ultima_actualizacion,s.ultimo_contacto,
  s.dias_sin_contacto,s.dias_sin_actualizacion,s.observaciones_pendientes,s.pagos_pendientes,s.etapas_atrasadas,
  coalesce(s.satisfaccion_cliente,s.puntaje_calculado) satisfaccion,
  coalesce(s.riesgo_manual,
    case when s.reclamo_abierto or s.etapas_atrasadas>0 or s.dias_sin_contacto>7 or s.puntaje_calculado<55 then 'rojo'
         when s.observaciones_pendientes>0 or s.pagos_pendientes>0 or s.dias_sin_contacto>=3 or s.dias_sin_actualizacion>=3 or s.puntaje_calculado<80 then 'amarillo'
         else 'verde' end) salud,
  s.puntaje_calculado,
  case
    when s.reclamo_abierto then 'Resolver reclamo hoy'
    when s.etapas_atrasadas>0 then 'Contactar contratista y cliente'
    when s.dias_sin_contacto>7 then 'Llamar al cliente hoy'
    when s.observaciones_pendientes>0 then 'Resolver observaciones'
    when s.pagos_pendientes>0 then 'Revisar pago pendiente'
    when s.dias_sin_actualizacion>=3 then 'Solicitar actualización de avance'
    when s.proximo_contacto_cliente_en is not null then 'Cumplir próximo contacto'
    else 'Mantener informado' end proxima_accion,
  coalesce(s.proximo_contacto_cliente_en,
    case when s.dias_sin_contacto>=3 then now() else s.ultimo_contacto + interval '3 days' end
  ) fecha_proxima_accion
from scored s
order by
  case coalesce(s.riesgo_manual,case when s.reclamo_abierto or s.etapas_atrasadas>0 or s.dias_sin_contacto>7 or s.puntaje_calculado<55 then 'rojo' when s.observaciones_pendientes>0 or s.pagos_pendientes>0 or s.dias_sin_contacto>=3 or s.dias_sin_actualizacion>=3 or s.puntaje_calculado<80 then 'amarillo' else 'verde' end)
    when 'rojo' then 1 when 'amarillo' then 2 else 3 end,
  s.dias_sin_contacto desc,
  s.total desc
limit greatest(1,least(coalesce(p_limite,100),500));
$$;

grant execute on function public.crm_clientes_con_plan(integer) to authenticated;
grant execute on function public.crm_registrar_contacto_cliente_plan(uuid,text,text,text,boolean,timestamptz) to authenticated;

commit;


-- Source: 202607220005_partners_seguridad_base.sql
-- TPL Partners - Base segura de postulaciones, perfiles públicos y administración CRM
-- Ejecutar después de 202607220004 (si corresponde). Idempotente en lo esencial.
create extension if not exists unaccent;

create extension if not exists pgcrypto;

-- 1) Cerrar políticas históricas demasiado amplias.
drop policy if exists "Lectura pública contratistas" on public.contratistas;
drop policy if exists "Admin contratistas" on public.contratistas;
drop policy if exists "Lectura pública asignaciones" on public.asignaciones_proyectos;
drop policy if exists "Admin asignaciones" on public.asignaciones_proyectos;

alter table public.contratistas enable row level security;
alter table public.asignaciones_proyectos enable row level security;

drop policy if exists "CRM administra contratistas"
on public.contratistas;

create policy "CRM administra contratistas"
on public.contratistas for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "CRM administra asignaciones"
on public.asignaciones_proyectos;

create policy "CRM administra asignaciones"
on public.asignaciones_proyectos for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

-- 2) Ampliar la ficha operativa sin romper datos antiguos.
alter table public.contratistas
  add column if not exists nombre_comercial text,
  add column if not exists nombre_responsable text,
  add column if not exists whatsapp text,
  add column if not exists correo text,
  add column if not exists descripcion_servicios text,
  add column if not exists tipo_servicio text,
  add column if not exists especialidades text[] not null default '{}',
  add column if not exists region text,
  add column if not exists comunas_atendidas text[] not null default '{}',
  add column if not exists anos_experiencia integer not null default 0,
  add column if not exists disponibilidad text,
  add column if not exists emite_factura boolean not null default false,
  add column if not exists acepta_proyectos_tpl boolean not null default true,
  add column if not exists trabaja_bajo_marca_tpl boolean not null default false,
  add column if not exists plan_solicitado text not null default 'partner',
  add column if not exists plan_activo text not null default 'partner',
  add column if not exists plan_estado text not null default 'sin_pago',
  add column if not exists plan_inicio timestamptz,
  add column if not exists plan_vencimiento timestamptz,
  add column if not exists logo_url text,
  add column if not exists galeria_urls text[] not null default '{}',
  add column if not exists slug text,
  add column if not exists estado_verificacion text not null default 'pendiente',
  add column if not exists visible_publicamente boolean not null default false,
  add column if not exists rating numeric(3,2) not null default 0,
  add column if not exists trabajos_realizados integer not null default 0,
  add column if not exists actualizado_en timestamptz not null default now();

create unique index if not exists contratistas_slug_unique
on public.contratistas (lower(slug)) where slug is not null;

alter table public.contratistas drop constraint if exists contratistas_plan_solicitado_check;
alter table public.contratistas add constraint contratistas_plan_solicitado_check
check (plan_solicitado in ('partner','ideal','empresa','premium'));
alter table public.contratistas drop constraint if exists contratistas_plan_activo_check;
alter table public.contratistas add constraint contratistas_plan_activo_check
check (plan_activo in ('partner','ideal','empresa','premium'));
alter table public.contratistas drop constraint if exists contratistas_estado_verificacion_check;
alter table public.contratistas add constraint contratistas_estado_verificacion_check
check (estado_verificacion in ('pendiente','antecedentes','verificado','rechazado','suspendido'));

-- 3) Bandeja privada de postulaciones.
create table if not exists public.partner_postulaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  upload_token uuid not null default gen_random_uuid(),
  nombre_comercial text not null,
  nombre_responsable text not null,
  telefono text not null,
  whatsapp text not null,
  correo text not null,
  descripcion_servicios text not null,
  tipo_servicio text not null,
  especialidades text[] not null default '{}',
  region text not null,
  comunas_atendidas text[] not null default '{}',
  anos_experiencia integer not null default 0,
  disponibilidad text not null,
  emite_factura boolean not null default false,
  acepta_proyectos_tpl boolean not null default true,
  trabaja_bajo_marca_tpl boolean not null default false,
  plan_solicitado text not null default 'partner',
  logo_path text,
  galeria_paths text[] not null default '{}',
  acepta_terminos boolean not null,
  acepta_privacidad boolean not null,
  autoriza_contacto boolean not null,
  version_terminos text not null default '2026-07-22',
  estado text not null default 'pendiente',
  motivo_estado text,
  contratista_id uuid references public.contratistas(id) on delete set null,
  revisado_por uuid references auth.users(id) on delete set null,
  revisado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint partner_postulaciones_plan_check check (plan_solicitado in ('partner','ideal','empresa','premium')),
  constraint partner_postulaciones_estado_check check (estado in ('pendiente','antecedentes','aprobada','rechazada','cancelada')),
  constraint partner_postulaciones_experiencia_check check (anos_experiencia between 0 and 80),
  constraint partner_postulaciones_consentimiento_check check (acepta_terminos and acepta_privacidad and autoriza_contacto)
);

create index if not exists partner_postulaciones_estado_idx on public.partner_postulaciones(estado, creado_en desc);
create index if not exists partner_postulaciones_correo_idx on public.partner_postulaciones(lower(correo));

alter table public.partner_postulaciones enable row level security;
drop policy if exists "CRM administra postulaciones partner" on public.partner_postulaciones;
create policy "CRM administra postulaciones partner"
on public.partner_postulaciones for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

-- 4) RPC pública validada. No permite elegir estado ni activar planes.
create or replace function public.tpl_postular_partner(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_codigo text;
  v_token uuid;
  v_correo text := lower(trim(coalesce(p_payload->>'correo','')));
  v_plan text := lower(trim(coalesce(p_payload->>'plan_solicitado','partner')));
  v_especialidades text[];
  v_comunas text[];
begin
  if length(trim(coalesce(p_payload->>'nombre_comercial',''))) < 2 then raise exception 'NOMBRE_COMERCIAL_INVALIDO'; end if;
  if length(trim(coalesce(p_payload->>'nombre_responsable',''))) < 3 then raise exception 'RESPONSABLE_INVALIDO'; end if;
  if v_correo !~ '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then raise exception 'CORREO_INVALIDO'; end if;
  if length(regexp_replace(coalesce(p_payload->>'whatsapp',''),'\D','','g')) < 9 then raise exception 'WHATSAPP_INVALIDO'; end if;
  if length(trim(coalesce(p_payload->>'descripcion_servicios',''))) < 40 then raise exception 'DESCRIPCION_MUY_CORTA'; end if;
  if v_plan not in ('partner','ideal','empresa','premium') then raise exception 'PLAN_INVALIDO'; end if;
  if coalesce((p_payload->>'acepta_terminos')::boolean,false) is not true
     or coalesce((p_payload->>'acepta_privacidad')::boolean,false) is not true
     or coalesce((p_payload->>'autoriza_contacto')::boolean,false) is not true then
    raise exception 'CONSENTIMIENTOS_REQUERIDOS';
  end if;
  if exists (
    select 1 from public.partner_postulaciones
    where lower(correo)=v_correo and estado in ('pendiente','antecedentes') and creado_en > now()-interval '14 days'
  ) then raise exception 'POSTULACION_RECIENTE_EXISTENTE'; end if;

  select coalesce(array_agg(trim(x)) filter (where trim(x)<>''),'{}') into v_especialidades
  from jsonb_array_elements_text(coalesce(p_payload->'especialidades','[]'::jsonb)) x;
  select coalesce(array_agg(trim(x)) filter (where trim(x)<>''),'{}') into v_comunas
  from jsonb_array_elements_text(coalesce(p_payload->'comunas_atendidas','[]'::jsonb)) x;

  v_id := gen_random_uuid();
  v_token := gen_random_uuid();
  v_codigo := 'TPL-PAR-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(v_id::text,'-',''),1,8));

  insert into public.partner_postulaciones(
    id,codigo,upload_token,nombre_comercial,nombre_responsable,telefono,whatsapp,correo,
    descripcion_servicios,tipo_servicio,especialidades,region,comunas_atendidas,
    anos_experiencia,disponibilidad,emite_factura,acepta_proyectos_tpl,
    trabaja_bajo_marca_tpl,plan_solicitado,acepta_terminos,acepta_privacidad,
    autoriza_contacto
  ) values (
    v_id,v_codigo,v_token,trim(p_payload->>'nombre_comercial'),trim(p_payload->>'nombre_responsable'),
    trim(p_payload->>'telefono'),trim(p_payload->>'whatsapp'),v_correo,
    trim(p_payload->>'descripcion_servicios'),trim(p_payload->>'tipo_servicio'),v_especialidades,
    trim(p_payload->>'region'),v_comunas,greatest(0,least(80,coalesce((p_payload->>'anos_experiencia')::integer,0))),
    trim(p_payload->>'disponibilidad'),coalesce((p_payload->>'emite_factura')::boolean,false),
    coalesce((p_payload->>'acepta_proyectos_tpl')::boolean,true),
    coalesce((p_payload->>'trabaja_bajo_marca_tpl')::boolean,false),v_plan,true,true,true
  );

  return jsonb_build_object('id',v_id,'codigo',v_codigo,'upload_token',v_token);
end;
$$;
revoke all on function public.tpl_postular_partner(jsonb) from public;
grant execute on function public.tpl_postular_partner(jsonb) to anon, authenticated;

-- Registrar rutas cargadas sin exponer la fila completa.
create or replace function public.tpl_confirmar_archivos_partner(p_id uuid,p_token uuid,p_logo_path text,p_galeria_paths text[])
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update public.partner_postulaciones
  set logo_path=nullif(trim(p_logo_path),''), galeria_paths=coalesce(p_galeria_paths,'{}'), actualizado_en=now()
  where id=p_id and upload_token=p_token and estado='pendiente';
  return found;
end; $$;
revoke all on function public.tpl_confirmar_archivos_partner(uuid,uuid,text,text[]) from public;
grant execute on function public.tpl_confirmar_archivos_partner(uuid,uuid,text,text[]) to anon,authenticated;

-- 5) Aprobación administrativa transaccional.
create or replace function public.tpl_revisar_postulacion_partner(p_id uuid,p_accion text,p_motivo text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare p public.partner_postulaciones%rowtype; v_contratista uuid; v_slug text;
begin
  if not public.es_administrador_activo() then raise exception 'NO_AUTORIZADO'; end if;
  select * into p from public.partner_postulaciones where id=p_id for update;
  if not found then raise exception 'POSTULACION_NO_EXISTE'; end if;
  if p_accion='antecedentes' then
    update public.partner_postulaciones set estado='antecedentes',motivo_estado=p_motivo,revisado_por=auth.uid(),revisado_en=now(),actualizado_en=now() where id=p_id;
    return null;
  elsif p_accion='rechazar' then
    update public.partner_postulaciones set estado='rechazada',motivo_estado=p_motivo,revisado_por=auth.uid(),revisado_en=now(),actualizado_en=now() where id=p_id;
    return null;
  elsif p_accion<>'aprobar' then raise exception 'ACCION_INVALIDA'; end if;

  v_slug := lower(regexp_replace(regexp_replace(unaccent(p.nombre_comercial),'[^a-zA-Z0-9]+','-','g'),'(^-|-$)','','g')) || '-' || substr(replace(p.id::text,'-',''),1,6);
  insert into public.contratistas(
    nombre_empresa,nombre_comercial,nombre_responsable,telefono,whatsapp,correo,descripcion_servicios,
    tipo_servicio,especialidades,region,comunas_atendidas,ubicacion_base,anos_experiencia,disponibilidad,
    emite_factura,acepta_proyectos_tpl,trabaja_bajo_marca_tpl,plan_solicitado,plan_activo,plan_estado,
    slug,estado_verificacion,visible_publicamente,estado,actualizado_en
  ) values (
    p.nombre_comercial,p.nombre_comercial,p.nombre_responsable,p.telefono,p.whatsapp,p.correo,p.descripcion_servicios,
    p.tipo_servicio,p.especialidades,p.region,p.comunas_atendidas,p.region,p.anos_experiencia,p.disponibilidad,
    p.emite_factura,p.acepta_proyectos_tpl,p.trabaja_bajo_marca_tpl,p.plan_solicitado,'partner','sin_pago',
    v_slug,'verificado',false,'Activo',now()
  ) returning id into v_contratista;

  update public.partner_postulaciones set estado='aprobada',contratista_id=v_contratista,motivo_estado=p_motivo,
    revisado_por=auth.uid(),revisado_en=now(),actualizado_en=now() where id=p_id;
  return v_contratista;
end; $$;
revoke all on function public.tpl_revisar_postulacion_partner(uuid,text,text) from public;
grant execute on function public.tpl_revisar_postulacion_partner(uuid,text,text) to authenticated;

-- 6) Vista pública limitada. Solo verificados, visibles y con plan apto.
drop view if exists public.partners_publicos;
create view public.partners_publicos with (security_invoker=true) as
select id,coalesce(nombre_comercial,nombre_empresa) nombre_comercial,descripcion_servicios,tipo_servicio,
       especialidades,region,comunas_atendidas,anos_experiencia,disponibilidad,logo_url,galeria_urls,
       slug,rating,trabajos_realizados,whatsapp,correo,plan_activo
from public.contratistas
where estado_verificacion='verificado' and visible_publicamente=true and estado='Activo'
  and plan_activo in ('ideal','empresa','premium') and plan_estado='activo';

grant select on public.partners_publicos to anon,authenticated;

drop policy if exists "Público lee partners aprobados"
on public.contratistas;

create policy "Público lee partners aprobados"
on public.contratistas for select to anon,authenticated
using (estado_verificacion='verificado' and visible_publicamente=true and estado='Activo'
       and plan_activo in ('ideal','empresa','premium') and plan_estado='activo');

-- 7) Storage privado para antecedentes. Solo carga controlada y lectura administrativa.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('partner-postulaciones','partner-postulaciones',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=5242880,
allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists "Postulante carga archivos partner" on storage.objects;
create policy "Postulante carga archivos partner" on storage.objects for insert to anon,authenticated
with check (
  bucket_id='partner-postulaciones'
  and exists (
    select 1 from public.partner_postulaciones p
    where p.id::text=(storage.foldername(name))[1]
      and p.upload_token::text=(storage.foldername(name))[2]
      and p.estado='pendiente'
  )
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','pdf')
);

drop policy if exists "CRM lee archivos partner" on storage.objects;
create policy "CRM lee archivos partner" on storage.objects for select to authenticated
using (bucket_id='partner-postulaciones' and public.es_administrador_activo());

drop policy if exists "CRM administra archivos partner" on storage.objects;
create policy "CRM administra archivos partner" on storage.objects for all to authenticated
using (bucket_id='partner-postulaciones' and public.es_administrador_activo())
with check (bucket_id='partner-postulaciones' and public.es_administrador_activo());

comment on table public.partner_postulaciones is 'Bandeja privada de postulaciones. Una postulación no activa automáticamente un plan ni un perfil público.';


-- Source: 202607220006_negociacion_mejoras_oportunidades_partner.sql
-- TPL: negociación flexible, mejoras ofrecidas y oportunidades automáticas para Partners
-- Modelo consolidado: las propiedades publicadas viven en public.publicaciones.

begin;

alter table public.publicaciones
  add column if not exists modalidad_negociacion text,
  add column if not exists acepta_ofertas boolean not null default false,
  add column if not exists acepta_mejoras boolean not null default false,
  add column if not exists mejoras_ofrecidas jsonb not null default '[]'::jsonb,
  add column if not exists condiciones_mejoras jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'publicaciones_modalidad_negociacion_check'
  ) then
    alter table public.publicaciones
      add constraint publicaciones_modalidad_negociacion_check
      check (
        modalidad_negociacion is null
        or modalidad_negociacion in ('precio_fijo','ofertas','mejoras','flexible')
      );
  end if;
end $$;

create table if not exists public.necesidades_propiedad (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  tipo_servicio text not null,
  origen text not null default 'ia_publicador',
  motivo text,
  prioridad text not null default 'media'
    check (prioridad in ('baja','media','alta','critica')),
  estado text not null default 'detectada'
    check (estado in (
      'detectada','ofrecida_al_propietario','aceptada','descartada',
      'cotizando','contratada','ejecutada','verificada'
    )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.propuestas_negociacion (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  tipo text not null check (tipo in ('precio','mejora','mixta')),
  precio_publicado numeric check (precio_publicado is null or precio_publicado >= 0),
  precio_ofrecido numeric check (precio_ofrecido is null or precio_ofrecido >= 0),
  mejoras_solicitadas jsonb not null default '[]'::jsonb,
  condiciones text,
  estado text not null default 'enviada'
    check (estado in (
      'borrador','enviada','en_revision','contraoferta','aceptada','rechazada',
      'incorporada_reserva','incorporada_contrato','ejecutada','verificada'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oportunidades_partner (
  id uuid primary key default gen_random_uuid(),
  necesidad_id uuid not null references public.necesidades_propiedad(id) on delete cascade,
  partner_id uuid references public.contratistas(id) on delete set null,
  estado text not null default 'disponible'
    check (estado in (
      'disponible','invitada','vista','interesado','cotizada',
      'seleccionada','rechazada','vencida'
    )),
  precio_referencial numeric check (precio_referencial is null or precio_referencial >= 0),
  plazo_dias integer check (plazo_dias is null or plazo_dias >= 0),
  propuesta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (necesidad_id, partner_id)
);

create index if not exists idx_necesidades_propiedad_publicacion
  on public.necesidades_propiedad(publicacion_id, estado, tipo_servicio);
create index if not exists idx_propuestas_negociacion_publicacion
  on public.propuestas_negociacion(publicacion_id, estado);
create index if not exists idx_oportunidades_partner_estado
  on public.oportunidades_partner(partner_id, estado);

alter table public.necesidades_propiedad enable row level security;
alter table public.propuestas_negociacion enable row level security;
alter table public.oportunidades_partner enable row level security;

drop policy if exists "CRM administra necesidades propiedad" on public.necesidades_propiedad;
create policy "CRM administra necesidades propiedad"
on public.necesidades_propiedad for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "CRM administra propuestas negociacion" on public.propuestas_negociacion;
create policy "CRM administra propuestas negociacion"
on public.propuestas_negociacion for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "CRM administra oportunidades partner" on public.oportunidades_partner;
create policy "CRM administra oportunidades partner"
on public.oportunidades_partner for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

grant select, insert, update, delete on
  public.necesidades_propiedad,
  public.propuestas_negociacion,
  public.oportunidades_partner
to authenticated;

comment on table public.necesidades_propiedad is
  'Necesidades detectadas por reglas o IA a partir de carencias informadas en una publicación.';
comment on table public.propuestas_negociacion is
  'Ofertas de precio, mejoras o combinaciones enviadas por compradores.';
comment on table public.oportunidades_partner is
  'Derivación jerárquica de necesidades a Partners compatibles por especialidad y zona.';

commit;


-- Source: 202607220007_parcelas_con_casa_fotos_publicas.sql
begin;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('publicaciones-publicas','publicaciones-publicas',true,12582912,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.publicacion_fotos drop constraint if exists publicacion_fotos_bucket_privado;
alter table public.publicacion_fotos add constraint publicacion_fotos_bucket_valido
check (bucket_id in ('publicaciones-pendientes','publicaciones-publicas'));

drop view if exists public.publicaciones_publicas;

create view public.publicaciones_publicas

with (security_barrier = true)
as
with base as (
  select p.*,
    coalesce(nullif(p.datos_formulario #>> '{tasacion,resultado,quick}','')::numeric,nullif(p.datos_formulario #>> '{tasacionTPL,result,quick}','')::numeric,nullif(p.datos_formulario #>> '{tasacionTPL,resultado,quick}','')::numeric,nullif(p.datos_formulario #>> '{distintivos,precioRecomendadoValor}','')::numeric) precio_venta_rapida_tpl,
    coalesce((p.datos_formulario #>> '{promocion,urgente}')::boolean,(p.datos_formulario #>> '{comercial,ventaUrgente}')::boolean,false) venta_urgente,
    coalesce((p.datos_formulario #>> '{promocion,destacadoPago}')::boolean,(p.datos_formulario #>> '{comercial,urgenteDestacado}')::boolean,false) urgente_destacado,
    coalesce(nullif(p.datos_formulario #>> '{promocion,prioridadGrilla}','')::integer,0) prioridad_promocion
  from public.publicaciones 
)
select b.id,b.codigo_publico,b.estado,
  coalesce(nullif(b.datos_formulario->>'tipo',''),'parcela') tipo_inmueble,
  b.titulo_publico,b.descripcion_publica,b.precio_publicacion,b.superficie_m2,
  nullif(b.datos_formulario->>'superficie_terreno_m2','')::numeric superficie_terreno_m2,
  nullif(b.datos_formulario->>'superficie_construida_m2','')::numeric superficie_construida_m2,
  nullif(b.datos_formulario->>'habitaciones','')::numeric habitaciones,
  nullif(b.datos_formulario->>'banos','')::numeric banos,
  b.datos_formulario->>'material' material,
  b.region,b.comuna,b.sector,b.ubicacion_publica_aproximada,round(b.latitud_privada,3) latitud_publica,round(b.longitud_privada,3) longitud_publica,
  b.rol,b.agua,b.luz,b.acceso,b.topografia,b.naturaleza,b.cuerpos_agua,b.servicios,b.ciudad_principal,b.distancia_ciudad,b.facilidad_pago,b.detalle_facilidad_pago,b.publicada_en,b.actualizado_en,
  b.datos_formulario->>'old_id' identificador_legacy,b.datos_formulario->>'imagen_principal' imagen_principal,coalesce(b.datos_formulario->'imagenes','[]'::jsonb) imagenes,b.datos_formulario->>'destacada' destacada,b.datos_formulario->>'tiempoConcepcion' tiempo_concepcion,
  (b.precio_venta_rapida_tpl is not null and b.precio_publicacion is not null and b.precio_publicacion<=b.precio_venta_rapida_tpl) valor_respaldado_tpl,
  b.precio_venta_rapida_tpl precio_recomendado_tpl,b.venta_urgente,b.urgente_destacado,
  case when b.urgente_destacado then greatest(b.prioridad_promocion,100) when b.venta_urgente then greatest(b.prioridad_promocion,50) else b.prioridad_promocion end prioridad_promocion
from base b where b.estado='aprobada';

revoke all on table public.publicaciones_publicas from public;
grant select on table public.publicaciones_publicas to anon, authenticated;

commit;


-- Source: 202607220010_tpl_studio_ai.sql
-- TPL Studio AI: base desacoplada del proveedor de inteligencia artificial.
create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  project_id uuid,
  partner_id uuid,
  name text not null,
  project_type text not null default 'parcela_casa',
  source_data jsonb not null default '{}'::jsonb,
  tone text,
  audience text,
  status text not null default 'draft' check (status in ('draft','prepared','queued','processing','completed','failed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_storyboards (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  version integer not null default 1,
  scenes jsonb not null default '[]'::jsonb,
  narration text,
  music_direction text,
  duration_seconds integer not null default 30,
  created_at timestamptz not null default now(),
  unique(campaign_id,version)
);

create table if not exists public.marketing_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  asset_type text not null,
  format text,
  status text not null default 'prepared',
  provider text,
  provider_job_id text,
  source_url text,
  output_url text,
  prompt jsonb not null default '{}'::jsonb,
  estimated_cost numeric(12,2),
  actual_cost numeric(12,2),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.marketing_render_queue (
  id bigint generated always as identity primary key,
  asset_id uuid not null references public.marketing_assets(id) on delete cascade,
  priority smallint not null default 5,
  status text not null default 'pending' check (status in ('pending','reserved','processing','completed','failed','cancelled')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_campaigns_status on public.marketing_campaigns(status,created_at desc);
create index if not exists idx_marketing_assets_campaign on public.marketing_assets(campaign_id,status);
create index if not exists idx_marketing_render_queue_ready on public.marketing_render_queue(status,priority,available_at);

alter table public.marketing_campaigns enable row level security;
alter table public.marketing_storyboards enable row level security;
alter table public.marketing_assets enable row level security;
alter table public.marketing_render_queue enable row level security;

create policy "owners read campaigns" on public.marketing_campaigns for select using (owner_id = auth.uid() or public.es_admin());
create policy "owners create campaigns" on public.marketing_campaigns for insert with check (owner_id = auth.uid() or public.es_admin());
create policy "owners update campaigns" on public.marketing_campaigns for update using (owner_id = auth.uid() or public.es_admin());
create policy "campaign members read storyboards" on public.marketing_storyboards for select using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin())));
create policy "campaign members manage storyboards" on public.marketing_storyboards for all using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin()))) with check (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin())));
create policy "campaign members read assets" on public.marketing_assets for select using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin())));
create policy "campaign members manage assets" on public.marketing_assets for all using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin()))) with check (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and (c.owner_id=auth.uid() or public.es_admin())));
create policy "admins manage render queue" on public.marketing_render_queue for all using (public.es_admin()) with check (public.es_admin());


-- Source: 202607230001_tpl_business_leads_landing.sql
-- TPL Business — Fase 2
-- Flujo comercial reutilizable para Landing Premium.
-- No elimina ni renombra estructuras existentes.

begin;

create extension if not exists pgcrypto;

create table if not exists public.tpl_business_cuentas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  estado text not null default 'activo',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint tpl_business_cuentas_estado_check
    check (estado in ('activo','pausado','cerrado'))
);

create table if not exists public.tpl_proyectos_comerciales (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  cuenta_id uuid not null references public.tpl_business_cuentas(id) on delete restrict,
  nombre text not null,
  objetivo text,
  propiedad_codigo text,
  estado text not null default 'preparacion',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint tpl_proyectos_comerciales_estado_check
    check (estado in ('preparacion','activo','pausado','ganado','perdido','cerrado'))
);

create table if not exists public.tpl_landings_comerciales (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  proyecto_comercial_id uuid not null references public.tpl_proyectos_comerciales(id) on delete cascade,
  slug text not null unique,
  plantilla text not null default 'parcela-premium',
  estado text not null default 'borrador',
  version_config integer not null default 1,
  publicado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint tpl_landings_comerciales_estado_check
    check (estado in ('borrador','publicada','pausada','archivada'))
);

create table if not exists public.crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  proyecto_comercial_id uuid not null references public.tpl_proyectos_comerciales(id) on delete restrict,
  landing_id uuid references public.tpl_landings_comerciales(id) on delete set null,
  etapa text not null default 'nuevo',
  estado text not null default 'abierta',
  origen_primero text,
  origen_ultimo text,
  atribucion_primera jsonb not null default '{}'::jsonb,
  atribucion_ultima jsonb not null default '{}'::jsonb,
  primera_interaccion_en timestamptz not null default now(),
  ultima_interaccion_en timestamptz not null default now(),
  ganado_en timestamptz,
  perdido_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (cliente_id, proyecto_comercial_id),
  constraint crm_oportunidades_etapa_check check (
    etapa in (
      'nuevo','solicito_informacion','contactado','calificado',
      'solicito_visita','visita_confirmada','visita_realizada',
      'negociando','reservado','ganado','perdido'
    )
  ),
  constraint crm_oportunidades_estado_check
    check (estado in ('abierta','ganada','perdida','archivada'))
);

create table if not exists public.crm_interacciones_landing (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid references public.crm_oportunidades(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  proyecto_comercial_id uuid not null references public.tpl_proyectos_comerciales(id) on delete restrict,
  landing_id uuid not null references public.tpl_landings_comerciales(id) on delete restrict,
  tipo text not null,
  canal text not null default 'landing',
  session_id text,
  journey_id text,
  idempotency_key text unique,
  atribucion jsonb not null default '{}'::jsonb,
  detalle jsonb not null default '{}'::jsonb,
  nota text,
  creado_en timestamptz not null default now(),
  constraint crm_interacciones_landing_tipo_check
    check (tipo in ('informacion_solicitada','whatsapp_click','visita_solicitada')),
  constraint crm_interacciones_landing_canal_check
    check (canal in ('landing','whatsapp','formulario','agenda'))
);

alter table public.crm_eventos
  add column if not exists proyecto_comercial_id uuid
    references public.tpl_proyectos_comerciales(id) on delete set null,
  add column if not exists landing_id uuid
    references public.tpl_landings_comerciales(id) on delete set null,
  add column if not exists oportunidad_id uuid
    references public.crm_oportunidades(id) on delete set null;

alter table public.crm_tareas
  add column if not exists proyecto_comercial_id uuid
    references public.tpl_proyectos_comerciales(id) on delete set null,
  add column if not exists landing_id uuid
    references public.tpl_landings_comerciales(id) on delete set null,
  add column if not exists oportunidad_id uuid
    references public.crm_oportunidades(id) on delete set null;

alter table public.visitas
  add column if not exists proyecto_comercial_id uuid
    references public.tpl_proyectos_comerciales(id) on delete set null,
  add column if not exists landing_id uuid
    references public.tpl_landings_comerciales(id) on delete set null,
  add column if not exists oportunidad_id uuid
    references public.crm_oportunidades(id) on delete set null;

create index if not exists crm_oportunidades_embudo_idx
  on public.crm_oportunidades (proyecto_comercial_id, estado, etapa, ultima_interaccion_en desc);
create index if not exists crm_interacciones_landing_fecha_idx
  on public.crm_interacciones_landing (proyecto_comercial_id, creado_en desc);
create index if not exists crm_interacciones_landing_cliente_idx
  on public.crm_interacciones_landing (cliente_id, creado_en desc);
create index if not exists visitas_proyecto_comercial_idx
  on public.visitas (proyecto_comercial_id, estado, fecha_solicitada);

insert into public.tpl_business_cuentas (codigo,nombre,estado)
values ('cli-caburgua','Caburgua Premium','activo')
on conflict (codigo) do update
set nombre=excluded.nombre, estado=excluded.estado, actualizado_en=now();

insert into public.tpl_proyectos_comerciales (
  codigo,cuenta_id,nombre,objetivo,propiedad_codigo,estado
)
select
  'pro-caburgua',
  c.id,
  'Venta Parcela Caburgua Premium',
  'Generar consultas calificadas y agendar visitas',
  'caburgua',
  'activo'
from public.tpl_business_cuentas c
where c.codigo='cli-caburgua'
on conflict (codigo) do update
set
  cuenta_id=excluded.cuenta_id,
  nombre=excluded.nombre,
  objetivo=excluded.objetivo,
  propiedad_codigo=excluded.propiedad_codigo,
  estado=excluded.estado,
  actualizado_en=now();

insert into public.tpl_landings_comerciales (
  codigo,proyecto_comercial_id,slug,plantilla,estado,version_config,publicado_en
)
select
  'land-caburgua',
  p.id,
  'caburgua-premium',
  'parcela-premium',
  'publicada',
  1,
  now()
from public.tpl_proyectos_comerciales p
where p.codigo='pro-caburgua'
on conflict (codigo) do update
set
  proyecto_comercial_id=excluded.proyecto_comercial_id,
  slug=excluded.slug,
  plantilla=excluded.plantilla,
  estado=excluded.estado,
  version_config=greatest(public.tpl_landings_comerciales.version_config,excluded.version_config),
  publicado_en=coalesce(public.tpl_landings_comerciales.publicado_en,excluded.publicado_en),
  actualizado_en=now();

alter table public.tpl_business_cuentas enable row level security;
alter table public.tpl_proyectos_comerciales enable row level security;
alter table public.tpl_landings_comerciales enable row level security;
alter table public.crm_oportunidades enable row level security;
alter table public.crm_interacciones_landing enable row level security;

drop policy if exists "Administradores gestionan cuentas TPL Business" on public.tpl_business_cuentas;
create policy "Administradores gestionan cuentas TPL Business"
on public.tpl_business_cuentas for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Administradores gestionan proyectos comerciales" on public.tpl_proyectos_comerciales;
create policy "Administradores gestionan proyectos comerciales"
on public.tpl_proyectos_comerciales for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Administradores gestionan landings comerciales" on public.tpl_landings_comerciales;
create policy "Administradores gestionan landings comerciales"
on public.tpl_landings_comerciales for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Administradores gestionan oportunidades" on public.crm_oportunidades;
create policy "Administradores gestionan oportunidades"
on public.crm_oportunidades for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Administradores gestionan interacciones landing" on public.crm_interacciones_landing;
create policy "Administradores gestionan interacciones landing"
on public.crm_interacciones_landing for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

revoke all on public.tpl_business_cuentas from anon;
revoke all on public.tpl_proyectos_comerciales from anon;
revoke all on public.tpl_landings_comerciales from anon;
revoke all on public.crm_oportunidades from anon;
revoke all on public.crm_interacciones_landing from anon;

grant select,insert,update,delete on public.tpl_business_cuentas to authenticated;
grant select,insert,update,delete on public.tpl_proyectos_comerciales to authenticated;
grant select,insert,update,delete on public.tpl_landings_comerciales to authenticated;
grant select,insert,update,delete on public.crm_oportunidades to authenticated;
grant select,insert,update,delete on public.crm_interacciones_landing to authenticated;

create or replace function public.tpl_registrar_interaccion_landing(
  p_landing_codigo text,
  p_accion text,
  p_contacto jsonb default '{}'::jsonb,
  p_atribucion jsonb default '{}'::jsonb,
  p_detalle jsonb default '{}'::jsonb,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_landing public.tpl_landings_comerciales%rowtype;
  v_proyecto public.tpl_proyectos_comerciales%rowtype;
  v_cliente_id uuid;
  v_oportunidad_id uuid;
  v_interaccion_id uuid;
  v_evento_id bigint;
  v_visita_id uuid;
  v_nombre text := nullif(trim(p_contacto->>'nombre'),'');
  v_correo text := nullif(lower(trim(p_contacto->>'correo')),'');
  v_telefono text := nullif(regexp_replace(coalesce(p_contacto->>'telefono',''),'[^0-9]','','g'),'');
  v_acepta boolean := coalesce((p_contacto->>'acepta_tratamiento_datos')::boolean,false);
  v_fecha_visita timestamptz;
  v_etapa text;
  v_canal text;
  v_origen text;
  v_atribucion jsonb;
  v_detalle jsonb;
  v_idempotency text := nullif(left(trim(p_idempotency_key),120),'');
  v_duplicate boolean := false;
begin
  if p_accion <> all(array['informacion_solicitada','whatsapp_click','visita_solicitada']) then
    raise exception 'Acción comercial no permitida';
  end if;

  select * into v_landing
  from public.tpl_landings_comerciales
  where codigo=left(trim(p_landing_codigo),80)
    and estado='publicada';
  if v_landing.id is null then raise exception 'Landing no disponible'; end if;

  select * into v_proyecto
  from public.tpl_proyectos_comerciales
  where id=v_landing.proyecto_comercial_id
    and estado in ('preparacion','activo');
  if v_proyecto.id is null then raise exception 'Proyecto comercial no disponible'; end if;

  v_atribucion:=jsonb_strip_nulls(jsonb_build_object(
    'utm_source',nullif(left(p_atribucion->>'utm_source',120),''),
    'utm_medium',nullif(left(p_atribucion->>'utm_medium',120),''),
    'utm_campaign',nullif(left(p_atribucion->>'utm_campaign',160),''),
    'utm_content',nullif(left(p_atribucion->>'utm_content',160),''),
    'utm_term',nullif(left(p_atribucion->>'utm_term',160),''),
    'gclid',nullif(left(p_atribucion->>'gclid',240),''),
    'referrer',nullif(left(p_atribucion->>'referrer',300),''),
    'pagina_origen',nullif(left(p_atribucion->>'pagina_origen',180),''),
    'session_id',nullif(left(p_atribucion->>'session_id',120),''),
    'journey_id',nullif(left(p_atribucion->>'journey_id',120),'')
  ));
  v_detalle:=jsonb_strip_nulls(jsonb_build_object(
    'fecha_visita',nullif(left(p_detalle->>'fecha_visita',40),''),
    'dispositivo',nullif(left(p_detalle->>'dispositivo',30),'')
  ));
  v_origen:=coalesce(v_atribucion->>'utm_source','landing');
  if nullif(v_atribucion->>'session_id','') is not null
    and (
      select count(*)
      from public.crm_interacciones_landing
      where landing_id=v_landing.id
        and session_id=v_atribucion->>'session_id'
        and creado_en>now()-interval '1 hour'
    )>=20 then
    raise exception 'Demasiados intentos. Intenta nuevamente más tarde';
  end if;
  v_canal:=case p_accion
    when 'whatsapp_click' then 'whatsapp'
    when 'visita_solicitada' then 'agenda'
    else 'formulario'
  end;
  v_etapa:=case p_accion
    when 'visita_solicitada' then 'solicito_visita'
    when 'informacion_solicitada' then 'solicito_informacion'
    else 'nuevo'
  end;

  if v_idempotency is not null then
    select id,cliente_id,oportunidad_id into v_interaccion_id,v_cliente_id,v_oportunidad_id
    from public.crm_interacciones_landing
    where idempotency_key=v_idempotency;
    if v_interaccion_id is not null then
      return jsonb_build_object(
        'success',true,'duplicate',true,'interactionId',v_interaccion_id,
        'clienteId',v_cliente_id,'oportunidadId',v_oportunidad_id
      );
    end if;
  end if;

  if p_accion <> 'whatsapp_click' then
    if v_nombre is null or length(v_nombre)>120 then raise exception 'Nombre requerido'; end if;
    if v_correo is null and v_telefono is null then raise exception 'Correo o teléfono requerido'; end if;
    if v_correo is not null and v_correo !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'Correo inválido';
    end if;
    if v_telefono is not null and length(regexp_replace(v_telefono,'[^0-9]','','g'))<8 then
      raise exception 'Teléfono inválido';
    end if;
    if not v_acepta then raise exception 'Debes aceptar el tratamiento de datos'; end if;

    perform pg_advisory_xact_lock(hashtext(coalesce(v_correo,v_telefono)));

    select id into v_cliente_id
    from public.clientes
    where
      (v_correo is not null and lower(correo)=v_correo)
      or
      (v_telefono is not null and regexp_replace(coalesce(telefono,''),'[^0-9]','','g')=v_telefono)
    order by creado_en asc
    limit 1;

    if v_cliente_id is null then
      insert into public.clientes (
        nombre,correo,telefono,whatsapp,acepta_tratamiento_datos,
        estado,etapa,etapa_ingresada_en,ultima_interaccion_en,origen,
        score,prioridad
      ) values (
        left(v_nombre,120),v_correo,v_telefono,v_telefono,true,
        'nuevo',v_etapa,now(),now(),left(v_origen,120),
        case when p_accion='visita_solicitada' then 40 else 10 end,
        case when p_accion='visita_solicitada' then 'Prioridad media' else 'Prioridad baja' end
      )
      returning id into v_cliente_id;
    else
      update public.clientes
      set
        nombre=coalesce(nullif(nombre,''),left(v_nombre,120)),
        correo=coalesce(correo,v_correo),
        telefono=coalesce(telefono,v_telefono),
        whatsapp=coalesce(whatsapp,v_telefono),
        acepta_tratamiento_datos=acepta_tratamiento_datos or v_acepta,
        ultima_interaccion_en=now(),
        origen=coalesce(origen,left(v_origen,120)),
        score=greatest(score,case when p_accion='visita_solicitada' then 40 else 10 end),
        prioridad=case
          when p_accion='visita_solicitada' and score<40 then 'Prioridad media'
          when p_accion='informacion_solicitada' and score<10 then 'Prioridad baja'
          else prioridad
        end,
        actualizado_en=now()
      where id=v_cliente_id;
    end if;

    select id into v_interaccion_id
    from public.crm_interacciones_landing
    where cliente_id=v_cliente_id
      and landing_id=v_landing.id
      and tipo=p_accion
      and creado_en>now()-interval '10 minutes'
    order by creado_en desc
    limit 1;

    if v_interaccion_id is not null then
      select oportunidad_id into v_oportunidad_id
      from public.crm_interacciones_landing
      where id=v_interaccion_id;
      return jsonb_build_object(
        'success',true,'duplicate',true,'interactionId',v_interaccion_id,
        'clienteId',v_cliente_id,'oportunidadId',v_oportunidad_id
      );
    end if;

    insert into public.crm_oportunidades (
      cliente_id,proyecto_comercial_id,landing_id,etapa,estado,
      origen_primero,origen_ultimo,atribucion_primera,atribucion_ultima,
      primera_interaccion_en,ultima_interaccion_en
    ) values (
      v_cliente_id,v_proyecto.id,v_landing.id,v_etapa,'abierta',
      left(v_origen,120),left(v_origen,120),v_atribucion,v_atribucion,now(),now()
    )
    on conflict (cliente_id,proyecto_comercial_id) do update
    set
      landing_id=excluded.landing_id,
      etapa=case
        when public.crm_oportunidades.etapa in ('ganado','perdido') then public.crm_oportunidades.etapa
        when excluded.etapa='solicito_visita' then excluded.etapa
        when public.crm_oportunidades.etapa='nuevo' then excluded.etapa
        else public.crm_oportunidades.etapa
      end,
      origen_ultimo=excluded.origen_ultimo,
      atribucion_ultima=excluded.atribucion_ultima,
      ultima_interaccion_en=now(),
      actualizado_en=now()
    returning id into v_oportunidad_id;
  end if;

  insert into public.crm_interacciones_landing (
    oportunidad_id,cliente_id,proyecto_comercial_id,landing_id,
    tipo,canal,session_id,journey_id,idempotency_key,
    atribucion,detalle,nota
  ) values (
    v_oportunidad_id,v_cliente_id,v_proyecto.id,v_landing.id,
    p_accion,v_canal,v_atribucion->>'session_id',v_atribucion->>'journey_id',
    v_idempotency,v_atribucion,v_detalle,nullif(left(p_detalle->>'mensaje',1000),'')
  )
  returning id into v_interaccion_id;

  if p_accion='visita_solicitada' then
    begin
      v_fecha_visita:=nullif(p_detalle->>'fecha_visita','')::timestamptz;
    exception when others then
      raise exception 'Fecha de visita inválida';
    end;
    if v_fecha_visita is null or v_fecha_visita<now() then
      raise exception 'Selecciona una fecha futura';
    end if;
    insert into public.visitas (
      cliente_id,fecha_solicitada,estado,observaciones,
      proyecto_comercial_id,landing_id,oportunidad_id
    ) values (
      v_cliente_id,v_fecha_visita,'solicitada',
      nullif(left(p_detalle->>'mensaje',1000),''),
      v_proyecto.id,v_landing.id,v_oportunidad_id
    )
    returning id into v_visita_id;
  end if;

  insert into public.crm_eventos (
    evento,etapa,cliente_id,origen,pagina,metadata,
    proyecto_comercial_id,landing_id,oportunidad_id
  ) values (
    p_accion,
    case when p_accion='whatsapp_click' then null else v_etapa end,
    v_cliente_id,
    left(v_origen,120),
    left(coalesce(v_atribucion->>'pagina_origen','/caburgua-premium'),180),
    jsonb_strip_nulls(jsonb_build_object(
      'parcela_codigo',left(v_proyecto.propiedad_codigo,80),
      'fecha_visita',left(p_detalle->>'fecha_visita',40),
      'origen',left(v_origen,120)
    )),
    v_proyecto.id,v_landing.id,v_oportunidad_id
  )
  returning id into v_evento_id;

  update public.crm_tareas
  set
    proyecto_comercial_id=v_proyecto.id,
    landing_id=v_landing.id,
    oportunidad_id=v_oportunidad_id
  where origen_evento_id=v_evento_id;

  return jsonb_build_object(
    'success',true,
    'duplicate',v_duplicate,
    'clienteId',v_cliente_id,
    'oportunidadId',v_oportunidad_id,
    'interactionId',v_interaccion_id,
    'visitaId',v_visita_id,
    'stage',v_etapa
  );
end;
$$;

revoke all on function public.tpl_registrar_interaccion_landing(
  text,text,jsonb,jsonb,jsonb,text
) from public;
grant execute on function public.tpl_registrar_interaccion_landing(
  text,text,jsonb,jsonb,jsonb,text
) to anon,authenticated;

commit;


-- Source: 202607230002_landing_canonica_publicacion.sql
-- Fuente canónica para Landing Engine y Landing pública.
-- Requiere la migración 202607230001_tpl_business_leads_landing.sql.

begin;

alter table public.tpl_landings_comerciales
  add column if not exists configuracion_borrador jsonb not null default '{}'::jsonb,
  add column if not exists configuracion_publicada jsonb not null default '{}'::jsonb,
  add column if not exists borrador_actualizado_en timestamptz,
  add column if not exists publicado_actualizado_en timestamptz,
  add column if not exists actualizado_por uuid references auth.users(id) on delete set null,
  add column if not exists publicado_por uuid references auth.users(id) on delete set null;

create table if not exists public.tpl_landing_bitacora (
  id bigint generated always as identity primary key,
  landing_id uuid not null references public.tpl_landings_comerciales(id) on delete cascade,
  accion text not null,
  estado_anterior text,
  estado_nuevo text,
  version_config integer not null,
  usuario_id uuid references auth.users(id) on delete set null,
  usuario_email text,
  cambios jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  constraint tpl_landing_bitacora_accion_check
    check (accion in ('guardar_borrador','publicar','archivar','restaurar'))
);

create index if not exists tpl_landing_bitacora_landing_fecha_idx
  on public.tpl_landing_bitacora (landing_id, creado_en desc);

alter table public.tpl_landing_bitacora enable row level security;

drop policy if exists "Administradores consultan bitácora landing" on public.tpl_landing_bitacora;
create policy "Administradores consultan bitácora landing"
on public.tpl_landing_bitacora for select to authenticated
using (public.es_administrador_activo());

revoke all on public.tpl_landing_bitacora from anon;
grant select on public.tpl_landing_bitacora to authenticated;

-- Migra Caburgua desde el antiguo archivo JavaScript una sola vez.
update public.tpl_landings_comerciales
set
  configuracion_borrador = '{
    "id":"land-caburgua",
    "projectId":"pro-caburgua",
    "clientId":"cli-caburgua",
    "businessAccountCode":"cli-caburgua",
    "commercialProjectCode":"pro-caburgua",
    "propertyId":"caburgua",
    "slug":"caburgua-premium",
    "publicUrl":"/caburgua-premium",
    "status":"published",
    "template":"parcela-premium",
    "objective":"agendar_visitas",
    "title":"Mirador del Villarrica — Parcela Premium en Caburgua",
    "subtitle":"5.000 m² en condominio privado, vista al volcán Villarrica, acceso al río y aguas termales.",
    "eyebrow":"CABURGUA · REGIÓN DE LA ARAUCANÍA",
    "price":"$200.000.000",
    "location":"Caburgua, Chile",
    "heroImage":"/image/cesar_Caburgua/cesar_caburgua_(5).webp",
    "gallery":["/image/cesar_Caburgua/cesar_caburgua_(1).webp","/image/cesar_Caburgua/cesar_caburgua_ (2).webp","/image/cesar_Caburgua/cesar_caburgua_(3).webp","/image/cesar_Caburgua/cesar_caburgua_ (4).webp"],
    "benefits":["Vista privilegiada al volcán Villarrica","Acceso al río dentro del condominio","Aguas termales para disfrutar todo el año","Rol propio, agua y energía eléctrica"],
    "features":[
      {"title":"Vista al volcán Villarrica","text":"Un entorno natural privilegiado para disfrutar desde tu futuro proyecto."},
      {"title":"Acceso al río","text":"El condominio dispone de acceso al río para sus residentes."},
      {"title":"Aguas termales","text":"Un atributo especial para disfrutar el sector durante todo el año."},
      {"title":"Rol propio","text":"La parcela dispone de rol individual informado por su propietario o representante."},
      {"title":"Agua disponible","text":"El proyecto informa disponibilidad de agua para el desarrollo de la propiedad."},
      {"title":"Energía eléctrica","text":"Disponibilidad de energía eléctrica informada para el proyecto."}
    ],
    "description":"Una oportunidad patrimonial única para construir una residencia de alto estándar, segunda vivienda o proyecto turístico en uno de los sectores con mayor demanda del sur de Chile.",
    "ctaPrimary":"Agendar visita",
    "ctaSecondary":"Hablar por WhatsApp",
    "whatsapp":"56988508361",
    "videoUrl":"",
    "mapUrl":"",
    "formEnabled":true,
    "analyticsEnabled":false,
    "adsReady":false,
    "seoTitle":"Parcela Premium en Caburgua con vista al Volcán Villarrica",
    "seoDescription":"Parcela de 5.000 m² en condominio privado de Caburgua, con acceso al río, aguas termales, rol propio, agua y luz.",
    "tplBranding":{
      "enabled":true,
      "badgeText":"Proyecto gestionado mediante TPL Business",
      "supportText":"Tecnología, registro de consultas y gestión comercial por Tu Parcela Lista.",
      "footerText":"Tecnología y gestión comercial por Tu Parcela Lista",
      "ctaText":"Quiero una landing como esta",
      "ctaUrl":"/tecnologia.html",
      "modalTitle":"Respaldo tecnológico y comercial",
      "modalContent":["La información del proyecto es proporcionada por el propietario o representante.","Las consultas y solicitudes son gestionadas mediante TPL Business.","Las solicitudes pueden registrarse para seguimiento comercial.","Tu Parcela Lista entrega la infraestructura tecnológica y comercial."],
      "footerTheme":"corporate"
    }
  }'::jsonb,
  configuracion_publicada = '{
    "id":"land-caburgua",
    "projectId":"pro-caburgua",
    "clientId":"cli-caburgua",
    "businessAccountCode":"cli-caburgua",
    "commercialProjectCode":"pro-caburgua",
    "propertyId":"caburgua",
    "slug":"caburgua-premium",
    "publicUrl":"/caburgua-premium",
    "status":"published",
    "template":"parcela-premium",
    "objective":"agendar_visitas",
    "title":"Mirador del Villarrica — Parcela Premium en Caburgua",
    "subtitle":"5.000 m² en condominio privado, vista al volcán Villarrica, acceso al río y aguas termales.",
    "eyebrow":"CABURGUA · REGIÓN DE LA ARAUCANÍA",
    "price":"$200.000.000",
    "location":"Caburgua, Chile",
    "heroImage":"/image/cesar_Caburgua/cesar_caburgua_(5).webp",
    "gallery":["/image/cesar_Caburgua/cesar_caburgua_(1).webp","/image/cesar_Caburgua/cesar_caburgua_ (2).webp","/image/cesar_Caburgua/cesar_caburgua_(3).webp","/image/cesar_Caburgua/cesar_caburgua_ (4).webp"],
    "benefits":["Vista privilegiada al volcán Villarrica","Acceso al río dentro del condominio","Aguas termales para disfrutar todo el año","Rol propio, agua y energía eléctrica"],
    "features":[{"title":"Vista al volcán Villarrica","text":"Un entorno natural privilegiado para disfrutar desde tu futuro proyecto."},{"title":"Acceso al río","text":"El condominio dispone de acceso al río para sus residentes."},{"title":"Aguas termales","text":"Un atributo especial para disfrutar el sector durante todo el año."},{"title":"Rol propio","text":"La parcela dispone de rol individual informado por su propietario o representante."},{"title":"Agua disponible","text":"El proyecto informa disponibilidad de agua para el desarrollo de la propiedad."},{"title":"Energía eléctrica","text":"Disponibilidad de energía eléctrica informada para el proyecto."}],
    "description":"Una oportunidad patrimonial única para construir una residencia de alto estándar, segunda vivienda o proyecto turístico en uno de los sectores con mayor demanda del sur de Chile.",
    "ctaPrimary":"Agendar visita","ctaSecondary":"Hablar por WhatsApp","whatsapp":"56988508361","videoUrl":"","mapUrl":"",
    "formEnabled":true,"analyticsEnabled":false,"adsReady":false,
    "seoTitle":"Parcela Premium en Caburgua con vista al Volcán Villarrica",
    "seoDescription":"Parcela de 5.000 m² en condominio privado de Caburgua, con acceso al río, aguas termales, rol propio, agua y luz.",
    "tplBranding":{"enabled":true,"badgeText":"Proyecto gestionado mediante TPL Business","supportText":"Tecnología, registro de consultas y gestión comercial por Tu Parcela Lista.","footerText":"Tecnología y gestión comercial por Tu Parcela Lista","ctaText":"Quiero una landing como esta","ctaUrl":"/tecnologia.html","modalTitle":"Respaldo tecnológico y comercial","modalContent":["La información del proyecto es proporcionada por el propietario o representante.","Las consultas y solicitudes son gestionadas mediante TPL Business.","Las solicitudes pueden registrarse para seguimiento comercial.","Tu Parcela Lista entrega la infraestructura tecnológica y comercial."],"footerTheme":"corporate"}
  }'::jsonb,
  borrador_actualizado_en = coalesce(borrador_actualizado_en, now()),
  publicado_actualizado_en = coalesce(publicado_actualizado_en, now()),
  actualizado_en = now()
where codigo='land-caburgua'
  and configuracion_publicada = '{}'::jsonb;

create or replace function public.tpl_obtener_landing_publica(p_identificador text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'config', l.configuracion_publicada,
    'status', l.estado,
    'version', l.version_config,
    'updatedAt', l.publicado_actualizado_en,
    'publishedAt', l.publicado_en
  )
  from public.tpl_landings_comerciales l
  where (l.codigo=left(trim(p_identificador),120) or l.slug=left(trim(p_identificador),120))
    and l.estado='publicada'
    and l.configuracion_publicada <> '{}'::jsonb
  limit 1
$$;

create or replace function public.tpl_obtener_landing_admin(p_identificador text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare v_landing public.tpl_landings_comerciales%rowtype;
declare v_email text;
begin
  if auth.uid() is null or not public.es_administrador_activo() then
    raise exception 'Acceso no autorizado' using errcode='42501';
  end if;
  select * into v_landing from public.tpl_landings_comerciales
  where codigo=left(trim(p_identificador),120) or slug=left(trim(p_identificador),120)
  limit 1;
  if v_landing.id is null then raise exception 'Landing no encontrada'; end if;
  select email into v_email from auth.users where id=v_landing.actualizado_por;
  return jsonb_build_object(
    'id',v_landing.id,'code',v_landing.codigo,'slug',v_landing.slug,
    'status',v_landing.estado,'version',v_landing.version_config,
    'draft',v_landing.configuracion_borrador,
    'published',v_landing.configuracion_publicada,
    'updatedAt',v_landing.borrador_actualizado_en,
    'publishedAt',v_landing.publicado_actualizado_en,
    'updatedBy',v_email
  );
end;
$$;

create or replace function public.tpl_guardar_borrador_landing(
  p_landing_codigo text, p_configuracion jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare v_landing public.tpl_landings_comerciales%rowtype;
declare v_email text;
begin
  if auth.uid() is null or not public.es_administrador_activo() then
    raise exception 'Acceso no autorizado' using errcode='42501';
  end if;
  if jsonb_typeof(p_configuracion)<>'object'
    or nullif(trim(p_configuracion->>'title'),'') is null
    or nullif(trim(p_configuracion->>'slug'),'') is null then
    raise exception 'Título y slug son obligatorios' using errcode='22023';
  end if;
  select * into v_landing from public.tpl_landings_comerciales
  where codigo=left(trim(p_landing_codigo),120) for update;
  if v_landing.id is null then raise exception 'Landing no encontrada'; end if;
  select email into v_email from auth.users where id=auth.uid();
  update public.tpl_landings_comerciales set
    configuracion_borrador=p_configuracion,
    estado=case when estado='archivada' then 'borrador' else estado end,
    borrador_actualizado_en=now(), actualizado_en=now(), actualizado_por=auth.uid()
  where id=v_landing.id returning * into v_landing;
  insert into public.tpl_landing_bitacora(
    landing_id,accion,estado_anterior,estado_nuevo,version_config,
    usuario_id,usuario_email,cambios
  ) values (
    v_landing.id,'guardar_borrador',v_landing.estado,v_landing.estado,
    v_landing.version_config,auth.uid(),v_email,
    jsonb_build_object('configuracion',p_configuracion)
  );
  return jsonb_build_object('success',true,'status',v_landing.estado,
    'updatedAt',v_landing.borrador_actualizado_en,'updatedBy',v_email);
end;
$$;

create or replace function public.tpl_publicar_landing(p_landing_codigo text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare v_landing public.tpl_landings_comerciales%rowtype;
declare v_previous text;
declare v_email text;
begin
  if auth.uid() is null or not public.es_administrador_activo() then
    raise exception 'Acceso no autorizado' using errcode='42501';
  end if;
  select * into v_landing from public.tpl_landings_comerciales
  where codigo=left(trim(p_landing_codigo),120) for update;
  if v_landing.id is null then raise exception 'Landing no encontrada'; end if;
  if v_landing.configuracion_borrador='{}'::jsonb then
    raise exception 'No existe un borrador para publicar';
  end if;
  v_previous:=v_landing.estado;
  select email into v_email from auth.users where id=auth.uid();
  update public.tpl_landings_comerciales set
    configuracion_publicada=configuracion_borrador,
    estado='publicada', version_config=version_config+1,
    publicado_en=now(), publicado_actualizado_en=now(),
    actualizado_en=now(), actualizado_por=auth.uid(), publicado_por=auth.uid()
  where id=v_landing.id returning * into v_landing;
  insert into public.tpl_landing_bitacora(
    landing_id,accion,estado_anterior,estado_nuevo,version_config,
    usuario_id,usuario_email,cambios
  ) values (
    v_landing.id,'publicar',v_previous,'publicada',v_landing.version_config,
    auth.uid(),v_email,jsonb_build_object('configuracion',v_landing.configuracion_publicada)
  );
  return jsonb_build_object('success',true,'status','publicada',
    'version',v_landing.version_config,'publishedAt',v_landing.publicado_actualizado_en,
    'publishedBy',v_email);
end;
$$;

revoke all on function public.tpl_obtener_landing_publica(text) from public;
grant execute on function public.tpl_obtener_landing_publica(text) to anon,authenticated;
revoke all on function public.tpl_obtener_landing_admin(text) from public;
grant execute on function public.tpl_obtener_landing_admin(text) to authenticated;
revoke all on function public.tpl_guardar_borrador_landing(text,jsonb) from public;
grant execute on function public.tpl_guardar_borrador_landing(text,jsonb) to authenticated;
revoke all on function public.tpl_publicar_landing(text) from public;
grant execute on function public.tpl_publicar_landing(text) to authenticated;

commit;


-- Source: 202607230003_catalogo_publico_canonico.sql
-- Catálogo público canónico: migra casas y extras legacy a Supabase.
-- Proyecto: qxavbqhyqaqalpzbhwmh

alter table public.casas add column if not exists empresa text;
alter table public.casas add column if not exists tiempo_entrega text;
alter table public.extras add column if not exists empresa text;
alter table public.extras add column if not exists aplica_a text;
alter table public.extras add column if not exists cantidad_default numeric;
alter table public.extras add column if not exists cantidad_minima numeric;
alter table public.extras add column if not exists cantidad_maxima numeric;

insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('aura18','ChileHome','Casa prefabricada 18m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',18,1,1,2490000,null,'image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto_render.webp','["image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp","image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp"]'::jsonb,'20 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('aura24','ChileHome','Casa prefabricada 24m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',24,2,1,3350000,null,'image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto_render.webp','["image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp","image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp"]'::jsonb,'20 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('aura36','ChileHome','Casa prefabricada 36m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',36,2,1,4840000,null,'image/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto_render.webp','["image/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_plano.webp"]'::jsonb,'20 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('aura42','ChileHome','Casa prefabricada 42m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',42,3,1,5600000,null,'image/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_render.webp','["image/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_plano.webp"]'::jsonb,'25 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('aura48','ChileHome','Casa prefabricada 48m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',48,3,1,5950000,null,'image/casas/pre_fabricadas/36mts2/medianas/48_caida_agua_render.webp','["image/casas/pre_fabricadas/36mts2/medianas/48_caida_agua_plano.webp"]'::jsonb,'25 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('aura54','ChileHome','Casa prefabricada 48m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',54,3,1,6750000,null,'image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_render.webp','["image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_render.webp","image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_plano.webp"]'::jsonb,'25 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('aura72','ChileHome','Casa prefabricada 72m²','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',72,3,2,8750000,null,'image/casas/pre_fabricadas/36mts2/medianas/72_2a_render.webp','["image/casas/pre_fabricadas/36mts2/medianas/72_2a_render.webp","image/casas/pre_fabricadas/36mts2/medianas/72_2a_plano.webp"]'::jsonb,'35 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('aura84_1','ChileHome','Casa prefabricada 82mts2,','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',84,4,2,9200000,null,'image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_render.webp','["image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp","image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp"]'::jsonb,'25 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('aura84_2','ChileHome','Casa prefabricada 84mts2 de 6 aguas,','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',84,4,2,9900000,null,'image/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_render.webp','["image/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_plano.webp"]'::jsonb,'25 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('aura108','ChileHome','Casa prefabricada 108mts2 de 6 aguas,','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',108,6,2,13500000,'image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp','image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp','["image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp","image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp"]'::jsonb,'25 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('aura120','ChileHome','Casa prefabricada 120mts2 de 6 aguas,','Modelo full viene con estructura madera, techumbre,piso forros int y ext, puertas y ventanas.',120,6,2,14700000,'image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp','image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp','["image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp"]'::jsonb,'25 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('Innova18','Innova','Casa Moderna madera full 18mts2,','Valor incluye todo hasta piso ceramico o piso flotante, llegar y habitar.',18,1,1,6300000,'image/casas/pro/innova/innova_1_habitacion_plano.webp','image/casas/pro/innova/innova_1_habitacion_foto.webp','["image/casas/pro/innova/innova_1_habitacion_foto.webp","image/casas/pro/innova/innova_1_habitacion_plano.webp"]'::jsonb,'25 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('Innova54','Innova','Casa Moderna completa full 54mts2,','Valor incluye todo hasta piso ceramico o piso flotante, llegar y habitar.',54,3,1,12600000,null,'image/casas/pro/innova/innova_3_habitaciones_foto_1.webp','["image/casas/pro/innova/innova_3_habitaciones_foto_1.webp","image/casas/pro/innova/innova_3_habitaciones_foto_2.webp"]'::jsonb,'25 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.casas (codigo,empresa,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,plano_url,imagen_principal_url,imagenes,tiempo_entrega,activa,actualizado_en) values ('Nogal72','Los Nogales','Casa Moderna completa full 72mts2,','Valor incluye todo hasta piso ceramico o piso flotante, llegar y habitar.',72,3,2,28000000,null,'image/casas/pro/nogales/Alfa_72_mt2_.webp','["image/casas/pro/nogales/Alfa_72_mt2_.webp","image/casas/pro/nogales/Alfa_72_mt2_plano.webp"]'::jsonb,'25 días',true,now()) on conflict (codigo) do update set empresa=excluded.empresa,nombre=excluded.nombre,descripcion=excluded.descripcion,superficie_m2=excluded.superficie_m2,habitaciones=excluded.habitaciones,banos=excluded.banos,precio_base=excluded.precio_base,plano_url=excluded.plano_url,imagen_principal_url=excluded.imagen_principal_url,imagenes=excluded.imagenes,tiempo_entrega=excluded.tiempo_entrega,activa=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('Instalacion_+_base_pilotes_madera','Instalación Pilotes de madera + Casa Full',null,'fundacion','mt2',60000,'nogales',null,1,1,1,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('Instalacion_+_base_radier','Instalación radier y Casa Full',null,'fundacion','mt2',95000,'nogales',null,1,1,1,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('Instalacion completa radier + llave en mano full + piso ceramico','Instalacion completa llave en mano full',null,'fundacion','mt2',140000,'nogales',null,1,1,1,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('Instalacion_electrica','Instalación eléctrica incl/materiales',null,'opcional','mt2',15000,'nogales','casa',1,1,1,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('piso ceramico','Instalación piso cerámico incl/materiales',null,'opcional','mt2',32000,'nogales','casa',1,1,1,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('pintura','Servicio pintura con materiales',null,'opcional','mt2',15000,'nogales','casa',1,1,1,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('instalacion_sanitaria','Instalación sanitaria incl/materiales','Red sanitaria interior referencial según modelo de casa.','opcional','mt2',18000,'nogales','casa',1,1,1,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('artefactos_cocina','Artefactos cocina','Kit referencial de artefactos de cocina según disponibilidad.','opcional','unidad',850000,null,null,1,1,1,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('artefactos_bano','Artefactos baño','Artefactos sanitarios básicos para baño.','opcional','unidad',750000,null,null,1,1,3,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('fosa_septica','Fosa séptica con instalación precio referencial estimado','Instalación de fosa y kit de drenaje','opcional','unidad',1500000,null,null,1,1,5,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('pozo_profundo','Pozo profundo según profundidad','Excavación de pozo de agua potable','opcional','metro',50000,null,null,30,10,100,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('cierre_perimetral','Cerco de alambre de púas según perímetro de la parcela','Cercado perimetral estimado desde los m² de la parcela seleccionada.','opcional','metro',2000,null,'parcela',100,20,500,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('porton','Portón acceso','Portón de madera/fierro para acceso principal','opcional','unidad',1200000,null,null,1,1,3,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('empalme_electrico','Empalme eléctrico','Acometida y poste para conexión a red eléctrica','opcional','unidad',1500000,null,null,1,1,3,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('maquinaria','Maquinaria retroescavadora','Horas de retroexcavadora/nivelación','opcional','hora',42000,null,null,10,1,100,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('piscina','Piscina','Construcción de piscina de hormigón/fibra','opcional','mt2',200000,null,null,18,6,50,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('quincho','Quincho','Quincho premium de asados techado','opcional','mt2',250000,null,null,12,4,30,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();
insert into public.extras (codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo,actualizado_en) values ('terraza','Terraza','Terraza exterior en madera impregnada','opcional','mt2',200000,null,null,15,5,60,true,now()) on conflict (codigo) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,categoria=excluded.categoria,tipo_calculo=excluded.tipo_calculo,precio_base=excluded.precio_base,empresa=excluded.empresa,aplica_a=excluded.aplica_a,cantidad_default=excluded.cantidad_default,cantidad_minima=excluded.cantidad_minima,cantidad_maxima=excluded.cantidad_maxima,activo=true,actualizado_en=now();

-- Administración de extras desde el mismo CRM.
create or replace function public.crm_listar_extras_admin() returns setof public.extras language plpgsql stable security definer set search_path=pg_catalog as $$ begin perform public.crm_exigir_administrador(); return query select * from public.extras order by categoria,nombre; end; $$;
create or replace function public.crm_guardar_extra_admin(p_extra_id uuid,p_datos jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$ declare v_id uuid; v jsonb; begin perform public.crm_exigir_administrador(); if nullif(trim(p_datos->>'nombre'),'') is null then raise exception using message='CRM_EXTRA_NAME_REQUIRED'; end if; if p_extra_id is null then insert into public.extras(codigo,nombre,descripcion,categoria,tipo_calculo,precio_base,unidad,empresa,aplica_a,cantidad_default,cantidad_minima,cantidad_maxima,activo) values(nullif(trim(p_datos->>'codigo'),''),trim(p_datos->>'nombre'),nullif(trim(p_datos->>'descripcion'),''),coalesce(nullif(trim(p_datos->>'categoria'),''),'opcional'),coalesce(nullif(trim(p_datos->>'tipo_calculo'),''),'unidad'),(p_datos->>'precio_base')::numeric,nullif(trim(p_datos->>'unidad'),''),nullif(trim(p_datos->>'empresa'),''),nullif(trim(p_datos->>'aplica_a'),''),coalesce((p_datos->>'cantidad_default')::numeric,1),coalesce((p_datos->>'cantidad_minima')::numeric,1),coalesce((p_datos->>'cantidad_maxima')::numeric,1),coalesce((p_datos->>'activo')::boolean,true)) returning id into v_id; else update public.extras set codigo=nullif(trim(p_datos->>'codigo'),''),nombre=trim(p_datos->>'nombre'),descripcion=nullif(trim(p_datos->>'descripcion'),''),categoria=coalesce(nullif(trim(p_datos->>'categoria'),''),'opcional'),tipo_calculo=coalesce(nullif(trim(p_datos->>'tipo_calculo'),''),'unidad'),precio_base=(p_datos->>'precio_base')::numeric,unidad=nullif(trim(p_datos->>'unidad'),''),empresa=nullif(trim(p_datos->>'empresa'),''),aplica_a=nullif(trim(p_datos->>'aplica_a'),''),cantidad_default=coalesce((p_datos->>'cantidad_default')::numeric,1),cantidad_minima=coalesce((p_datos->>'cantidad_minima')::numeric,1),cantidad_maxima=coalesce((p_datos->>'cantidad_maxima')::numeric,1),activo=coalesce((p_datos->>'activo')::boolean,true),actualizado_en=now() where id=p_extra_id returning id into v_id; if v_id is null then raise exception using message='CRM_EXTRA_NOT_FOUND'; end if; end if; select to_jsonb(x) into v from public.extras x where id=v_id; return v; end; $$;
revoke all on function public.crm_listar_extras_admin() from public,anon,authenticated; revoke all on function public.crm_guardar_extra_admin(uuid,jsonb) from public,anon,authenticated; grant execute on function public.crm_listar_extras_admin() to authenticated; grant execute on function public.crm_guardar_extra_admin(uuid,jsonb) to authenticated;

create or replace function public.crm_guardar_casa_admin(p_casa_id uuid, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog
as $$
declare v_id uuid; v_result jsonb;
begin
  perform public.crm_exigir_administrador();
  if nullif(trim(p_datos->>'nombre'),'') is null then raise exception using message='CRM_HOUSE_NAME_REQUIRED'; end if;
  if p_casa_id is null then
    insert into public.casas(codigo,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,tipo_construccion,empresa,tiempo_entrega,plano_url,imagen_principal_url,imagenes,activa,destacada)
    values(nullif(trim(p_datos->>'codigo'),''),trim(p_datos->>'nombre'),nullif(trim(p_datos->>'descripcion'),''),(p_datos->>'superficie_m2')::numeric,(p_datos->>'habitaciones')::int,(p_datos->>'banos')::int,(p_datos->>'precio_base')::numeric,nullif(trim(p_datos->>'tipo_construccion'),''),nullif(trim(p_datos->>'empresa'),''),nullif(trim(p_datos->>'tiempo_entrega'),''),nullif(trim(p_datos->>'plano_url'),''),nullif(trim(p_datos->>'imagen_principal_url'),''),coalesce(p_datos->'imagenes','[]'::jsonb),coalesce((p_datos->>'activa')::boolean,true),coalesce((p_datos->>'destacada')::boolean,false)) returning id into v_id;
  else
    update public.casas set codigo=nullif(trim(p_datos->>'codigo'),''),nombre=trim(p_datos->>'nombre'),descripcion=nullif(trim(p_datos->>'descripcion'),''),superficie_m2=(p_datos->>'superficie_m2')::numeric,habitaciones=(p_datos->>'habitaciones')::int,banos=(p_datos->>'banos')::int,precio_base=(p_datos->>'precio_base')::numeric,tipo_construccion=nullif(trim(p_datos->>'tipo_construccion'),''),empresa=nullif(trim(p_datos->>'empresa'),''),tiempo_entrega=nullif(trim(p_datos->>'tiempo_entrega'),''),plano_url=nullif(trim(p_datos->>'plano_url'),''),imagen_principal_url=nullif(trim(p_datos->>'imagen_principal_url'),''),imagenes=coalesce(p_datos->'imagenes','[]'::jsonb),activa=coalesce((p_datos->>'activa')::boolean,true),destacada=coalesce((p_datos->>'destacada')::boolean,false),actualizado_en=now() where id=p_casa_id returning id into v_id;
    if v_id is null then raise exception using message='CRM_HOUSE_NOT_FOUND'; end if;
  end if;
  select to_jsonb(c) into v_result from public.casas c where c.id=v_id;
  return v_result;
end; $$;
revoke all on function public.crm_guardar_casa_admin(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.crm_guardar_casa_admin(uuid,jsonb) to authenticated;


-- Source: 202607230004_landings_automaticas_precio_mapa.sql
-- Landings reutilizables desde publicaciones y corrección de enlaces de mapa.
-- Proyecto Supabase: qxavbqhyqaqalpzbhwmh

begin;

alter table public.tpl_landings_comerciales
  add column if not exists publicacion_id uuid
    references public.publicaciones(id) on delete set null;

create unique index if not exists tpl_landings_publicacion_unica_idx
  on public.tpl_landings_comerciales(publicacion_id)
  where publicacion_id is not null;

create or replace function public.tpl_url_mapa_publicacion(p public.publicaciones)
returns text language sql immutable set search_path=public
as $$
  select case
    when p.latitud_privada is null or p.longitud_privada is null then ''
    else format(
      'https://www.google.com/maps/search/?api=1&query=%s,%s',
      round(p.latitud_privada,3), round(p.longitud_privada,3)
    )
  end
$$;

create or replace function public.tpl_config_landing_desde_publicacion(p public.publicaciones)
returns jsonb language plpgsql stable set search_path=public
as $$
declare
  v_data jsonb := coalesce(p.datos_formulario,'{}'::jsonb);
  v_images jsonb := coalesce(p.datos_formulario->'imagenes','[]'::jsonb);
  v_hero text := coalesce(p.datos_formulario->>'imagen_principal','');
  v_property_code text := coalesce(nullif(p.datos_formulario->>'old_id',''),p.codigo_publico,p.id::text);
  v_slug text := 'propiedad-' || lower(regexp_replace(coalesce(p.codigo_publico,p.id::text),'[^a-zA-Z0-9]+','-','g'));
  v_location text := concat_ws(', ',nullif(p.sector,''),nullif(p.comuna,''),nullif(p.region,''));
  v_nature jsonb := coalesce(p.datos_formulario#>'{terreno,naturaleza}','[]'::jsonb);
begin
  return jsonb_build_object(
    'id','land-' || lower(coalesce(p.codigo_publico,p.id::text)),
    'propertyId',v_property_code,
    'propertyPublicationId',p.id,
    'slug',v_slug,
    'publicUrl','/plataforma/landing/?id=' || 'land-' || lower(coalesce(p.codigo_publico,p.id::text)),
    'status','draft',
    'template','parcela-premium',
    'objective','agendar_visitas',
    'title',coalesce(p.titulo_publico,'Propiedad disponible'),
    'subtitle',coalesce(nullif(p.descripcion_publica,''),'Conoce esta propiedad y agenda una visita.'),
    'eyebrow',upper(concat_ws(' · ',nullif(p.sector,''),nullif(p.comuna,''))),
    'price',case when p.precio_publicacion is null then 'Consultar'
      else to_char(p.precio_publicacion,'FM$999G999G999G999') end,
    'location',v_location,
    'heroImage',v_hero,
    'gallery',v_images,
    'benefits',v_nature,
    'features',jsonb_path_query_array(jsonb_build_array(
      case when nullif(p.rol,'') is not null then jsonb_build_object('title','Situación del rol','text',p.rol) end,
      case when nullif(p.agua,'') is not null then jsonb_build_object('title','Abastecimiento de agua','text',p.agua) end,
      case when nullif(p.luz,'') is not null then jsonb_build_object('title','Electricidad','text',p.luz) end,
      case when nullif(p.acceso,'') is not null then jsonb_build_object('title','Acceso','text',p.acceso) end,
      case when nullif(p.topografia,'') is not null then jsonb_build_object('title','Topografía','text',p.topografia) end,
      case when p.superficie_m2 is not null then jsonb_build_object('title','Superficie','text',to_char(p.superficie_m2,'FM999G999G999') || ' m²') end
    ),'$[*] ? (@ != null)'),
    'featuresKicker','LO QUE HACE ESPECIAL A ESTA PROPIEDAD',
    'description',coalesce(p.descripcion_publica,''),
    'ctaPrimary','Agendar visita',
    'ctaSecondary','Hablar por WhatsApp',
    'whatsapp','56988508361',
    'videoUrl','',
    'mapUrl',public.tpl_url_mapa_publicacion(p),
    'formEnabled',true,
    'analyticsEnabled',false,
    'adsReady',false,
    'seoTitle',left(coalesce(p.titulo_publico,'Propiedad en Tu Parcela Lista'),180),
    'seoDescription',left(coalesce(p.descripcion_publica,'Conoce esta propiedad en Tu Parcela Lista.'),320),
    'source',jsonb_build_object(
      'publicationId',p.id,
      'publicationCode',p.codigo_publico,
      'plan',coalesce(p.plan_contratado,p.plan_seleccionado),
      'syncedAt',now()
    ),
    'tplBranding',jsonb_build_object(
      'enabled',true,
      'badgeText','Proyecto gestionado mediante TPL Business',
      'supportText','Tecnología, registro de consultas y gestión comercial por Tu Parcela Lista.',
      'footerText','Tecnología y gestión comercial por Tu Parcela Lista',
      'ctaText','Quiero una landing como esta',
      'ctaUrl','/tecnologia.html',
      'modalTitle','Respaldo tecnológico y comercial',
      'modalContent',jsonb_build_array(
        'La información del proyecto es proporcionada por el propietario o representante.',
        'Las consultas y solicitudes son gestionadas mediante TPL Business.',
        'Las solicitudes pueden registrarse para seguimiento comercial.',
        'Tu Parcela Lista entrega la infraestructura tecnológica y comercial.'
      ),
      'footerTheme','corporate'
    )
  );
end;
$$;

create or replace function public.tpl_sincronizar_landing_publicacion()
returns trigger language plpgsql security definer set search_path=public
as $$
declare
  v_plan text := lower(coalesce(new.plan_contratado,new.plan_seleccionado,new.datos_formulario->>'plan_crm',''));
  v_account_id uuid;
  v_project_id uuid;
  v_landing_code text := 'land-' || lower(coalesce(new.codigo_publico,new.id::text));
  v_project_code text := 'pro-' || lower(coalesce(new.codigo_publico,new.id::text));
  v_account_code text := 'cli-pub-' || left(new.id::text,12);
  v_config jsonb;
begin
  if v_plan not in (
    'profesional','gold','platinum',
    'prop_impulso','prop_fuerte','prop_agresivo',
    'corr_impulso','corr_profesional','corr_elite'
  ) then
    return new;
  end if;

  v_config := public.tpl_config_landing_desde_publicacion(new);

  insert into public.tpl_business_cuentas(codigo,nombre,estado)
  values(v_account_code,coalesce(nullif(new.contacto_nombre,''),new.codigo_publico,'Cliente TPL'),'activo')
  on conflict(codigo) do update set
    nombre=excluded.nombre, actualizado_en=now()
  returning id into v_account_id;

  insert into public.tpl_proyectos_comerciales(
    codigo,cuenta_id,nombre,objetivo,propiedad_codigo,estado
  ) values(
    v_project_code,v_account_id,
    coalesce(new.titulo_publico,'Proyecto comercial ' || new.codigo_publico),
    'Generar consultas calificadas y agendar visitas',
    coalesce(nullif(new.datos_formulario->>'old_id',''),new.codigo_publico),
    'preparacion'
  )
  on conflict(codigo) do update set
    nombre=excluded.nombre,propiedad_codigo=excluded.propiedad_codigo,
    actualizado_en=now()
  returning id into v_project_id;

  update public.tpl_landings_comerciales set
    publicacion_id=new.id,
    proyecto_comercial_id=v_project_id,
    configuracion_borrador=configuracion_borrador || (v_config - 'id' - 'slug' - 'publicUrl'),
    borrador_actualizado_en=now(),actualizado_en=now()
  where publicacion_id=new.id or codigo=v_landing_code;

  if not found then
    insert into public.tpl_landings_comerciales(
      codigo,proyecto_comercial_id,publicacion_id,slug,plantilla,estado,
      configuracion_borrador,borrador_actualizado_en
    ) values(
      v_landing_code,v_project_id,new.id,v_config->>'slug','parcela-premium',
      'borrador',v_config,now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists tr_tpl_sincronizar_landing_publicacion on public.publicaciones;
create trigger tr_tpl_sincronizar_landing_publicacion
after insert or update of
  titulo_publico,descripcion_publica,precio_publicacion,superficie_m2,
  region,comuna,sector,latitud_privada,longitud_privada,rol,agua,luz,
  acceso,topografia,datos_formulario,plan_contratado,plan_seleccionado
on public.publicaciones
for each row execute function public.tpl_sincronizar_landing_publicacion();

-- Vincula Caburgua con su publicación canónica y corrige el mapa ya publicado.
do $$
declare
  v_publication public.publicaciones%rowtype;
  v_map text;
begin
  select p.* into v_publication
  from public.publicaciones p
  where p.datos_formulario->>'old_id'='caburgua'
     or p.codigo_publico='caburgua'
  limit 1;

  if v_publication.id is not null then
    v_map := public.tpl_url_mapa_publicacion(v_publication);
    update public.tpl_landings_comerciales set
      publicacion_id=v_publication.id,
      configuracion_borrador=jsonb_set(configuracion_borrador,'{mapUrl}',to_jsonb(v_map),true),
      configuracion_publicada=jsonb_set(configuracion_publicada,'{mapUrl}',to_jsonb(v_map),true),
      borrador_actualizado_en=now(),publicado_actualizado_en=now(),actualizado_en=now()
    where codigo='land-caburgua';
  end if;
end $$;

create or replace function public.tpl_listar_landings_admin()
returns jsonb language plpgsql stable security definer set search_path=public,auth
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.es_administrador_activo() then
    raise exception 'Acceso no autorizado' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',l.id,'code',l.codigo,'slug',l.slug,'status',l.estado,
    'version',l.version_config,'draft',l.configuracion_borrador,
    'published',l.configuracion_publicada,
    'updatedAt',l.borrador_actualizado_en,
    'publishedAt',l.publicado_actualizado_en,
    'publicationId',l.publicacion_id
  ) order by l.actualizado_en desc),'[]'::jsonb)
  into v_result from public.tpl_landings_comerciales l;
  return v_result;
end;
$$;

revoke all on function public.tpl_listar_landings_admin() from public,anon,authenticated;
grant execute on function public.tpl_listar_landings_admin() to authenticated;

commit;


-- Source: 202607230005_cotizador_reglas_planes_integridad.sql
-- Reglas canónicas para planes de instalación y persistencia íntegra del cotizador.
-- Proyecto Supabase: qxavbqhyqaqalpzbhwmh

alter table public.extras add column if not exists codigo_plan text;
alter table public.extras add column if not exists orden_visual integer;

update public.extras set codigo_plan='base', orden_visual=10
where categoria='fundacion' and codigo='Instalacion_+_base_pilotes_madera';
update public.extras set codigo_plan='radier_full', orden_visual=20
where categoria='fundacion' and codigo='Instalacion_+_base_radier';
update public.extras set codigo_plan='premium', orden_visual=30
where categoria='fundacion' and codigo='Instalacion completa radier + llave en mano full + piso ceramico';

create table if not exists public.fundacion_extra_reglas (
  id uuid primary key default gen_random_uuid(),
  fundacion_id uuid not null references public.extras(id) on delete cascade,
  extra_id uuid not null references public.extras(id) on delete cascade,
  estado text not null check (estado in ('incluido','opcional','no_disponible')),
  cantidad_incluida numeric not null default 0 check (cantidad_incluida >= 0),
  orden integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (fundacion_id, extra_id)
);

insert into public.fundacion_extra_reglas(fundacion_id,extra_id,estado,cantidad_incluida,orden)
select f.id,e.id,'incluido',
       case when e.tipo_calculo='mt2' then 1 else coalesce(e.cantidad_default,1) end,
       x.orden
from (
  values
    ('piso ceramico',10),
    ('pintura',20),
    ('Instalacion_electrica',30),
    ('instalacion_sanitaria',40),
    ('artefactos_cocina',50),
    ('artefactos_bano',60)
) as x(codigo,orden)
join public.extras f on f.codigo_plan='premium' and f.categoria='fundacion'
join public.extras e on e.codigo=x.codigo
on conflict (fundacion_id,extra_id) do update
set estado=excluded.estado,cantidad_incluida=excluded.cantidad_incluida,orden=excluded.orden,activo=true,actualizado_en=now();

alter table public.fundacion_extra_reglas enable row level security;
drop policy if exists "Lectura publica reglas fundacion extras" on public.fundacion_extra_reglas;
create policy "Lectura publica reglas fundacion extras"
on public.fundacion_extra_reglas for select to anon,authenticated using (activo=true);
grant select on public.fundacion_extra_reglas to anon,authenticated;

create or replace function public.crear_proyecto_completo(
  p_cliente_nombre text,
  p_cliente_email text,
  p_cliente_telefono text,
  p_parcela_id uuid,
  p_casa_codigo text,
  p_total numeric,
  p_extras jsonb
) returns text
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_cliente_id uuid;
  v_proyecto_id uuid;
  v_numero_proyecto text;
  v_casa_id uuid;
  v_extra jsonb;
begin
  select id into v_cliente_id from public.clientes where correo=p_cliente_email limit 1;
  if v_cliente_id is null then
    insert into public.clientes(nombre,correo,telefono,estado)
    values (p_cliente_nombre,p_cliente_email,p_cliente_telefono,'nuevo')
    returning id into v_cliente_id;
  else
    update public.clientes
       set nombre=coalesce(nullif(p_cliente_nombre,''),nombre),
           telefono=coalesce(nullif(p_cliente_telefono,''),telefono),
           actualizado_en=now()
     where id=v_cliente_id;
  end if;

  if p_casa_codigo is not null then
    select id into v_casa_id from public.casas where codigo=p_casa_codigo limit 1;
  end if;

  insert into public.proyectos(cliente_id,parcela_id,casa_id,subtotal,total,estado,modalidad,origen)
  values (v_cliente_id,p_parcela_id,v_casa_id,greatest(coalesce(p_total,0),0),greatest(coalesce(p_total,0),0),'cotizacion_enviada','llave_en_mano','cotizador_web')
  returning id,numero_proyecto into v_proyecto_id,v_numero_proyecto;

  if p_parcela_id is not null then
    insert into public.proyecto_items(proyecto_id,tipo,referencia_id,nombre,cantidad,orden)
    values (v_proyecto_id,'parcela',p_parcela_id::text,'Parcela seleccionada',1,10);
  end if;
  if v_casa_id is not null then
    insert into public.proyecto_items(proyecto_id,tipo,referencia_id,nombre,cantidad,orden)
    values (v_proyecto_id,'casa',v_casa_id::text,'Casa seleccionada',1,20);
  end if;

  if p_extras is not null and jsonb_typeof(p_extras)='array' then
    for v_extra in select * from jsonb_array_elements(p_extras)
    loop
      insert into public.proyecto_items(
        proyecto_id,tipo,referencia_id,nombre,cantidad,unidad,precio_unitario,subtotal,datos_snapshot,orden
      ) values (
        v_proyecto_id,
        coalesce(nullif(v_extra->>'tipo',''),'extra'),
        nullif(v_extra->>'id',''),
        coalesce(nullif(v_extra->>'nombre',''),'Ítem cotizado'),
        greatest(coalesce((v_extra->>'cantidad')::numeric,1),0),
        nullif(v_extra->>'unidad',''),
        greatest(coalesce((v_extra->>'precio')::numeric,0),0),
        greatest(coalesce((v_extra->>'subtotal')::numeric,0),0),
        coalesce(v_extra->'snapshot','{}'::jsonb),
        30
      );
    end loop;
  end if;
  return v_numero_proyecto;
end;
$$;

revoke all on function public.crear_proyecto_completo(text,text,text,uuid,text,numeric,jsonb) from public;
grant execute on function public.crear_proyecto_completo(text,text,text,uuid,text,numeric,jsonb) to anon,authenticated;


-- Source: 202607230006_tasador_reglas_comerciales_v2.sql
-- Versión auditable del Tasador TPL con clasificación turística y acceso a río.
-- Proyecto Supabase: qxavbqhyqaqalpzbhwmh

update public.configuracion_tasador
set estado='retirada'
where estado='activa' and version<>'tpl-mvp-1.1.0';

insert into public.configuracion_tasador(version,estado,algoritmo,parametros,vigente_desde)
values (
  'tpl-mvp-1.1.0',
  'activa',
  'mediana_comparables_v2_premium_comercial',
  jsonb_build_object(
    'comparables_minimos',3,
    'comparables_maximos',15,
    'cobertura_suficiente_desde',12,
    'cobertura_limitada_desde',6,
    'cobertura_experimental_desde',3,
    'antiguedad_maxima_dias',1095,
    'distancia_maxima_km',150,
    'superficie_relacion_minima',0.25,
    'umbral_cambio_precio_porcentaje',10,
    'ajuste_turismo_nacional',3.00,
    'ajuste_turismo_local',0.20,
    'ajuste_acceso_rio',0.10,
    'orden_ajustes',jsonb_build_array('comparables','distancia_ruta','turismo','acceso_rio'),
    'niveles_permitidos',jsonb_build_array('basica'),
    'fuentes_precio_permitidas',jsonb_build_array('precio_publicado_solicitado','precio_final_declarado','precio_final_verificado')
  ),
  now()
)
on conflict (version) do update
set estado='activa',
    algoritmo=excluded.algoritmo,
    parametros=excluded.parametros,
    vigente_desde=coalesce(public.configuracion_tasador.vigente_desde,excluded.vigente_desde);


-- Source: 202607230007_landing_mapa_preciso.sql
-- Coordenadas públicas reutilizables para Landing Premium.
-- Proyecto Supabase: qxavbqhyqaqalpzbhwmh

begin;

create or replace function public.tpl_coordenadas_publicas_landing(p public.publicaciones)
returns jsonb
language plpgsql
stable
set search_path=public
as $$
declare
  v_lat numeric;
  v_lng numeric;
  v_precision text;
begin
  if p.consentimiento_uso_ubicacion
     and p.latitud_publica is not null
     and p.longitud_publica is not null then
    v_lat := p.latitud_publica;
    v_lng := p.longitud_publica;
    v_precision := coalesce(nullif(p.precision_ubicacion,''),'exacta');
  elsif p.latitud_privada is not null and p.longitud_privada is not null then
    v_lat := round(p.latitud_privada,3);
    v_lng := round(p.longitud_privada,3);
    v_precision := 'aproximada';
  else
    return '{}'::jsonb;
  end if;

  if v_lat < -90 or v_lat > 90 or v_lng < -180 or v_lng > 180 then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'mapLatitude',v_lat,
    'mapLongitude',v_lng,
    'mapZoom',case when v_precision='exacta' then 17 else 16 end,
    'mapPrecision',v_precision,
    'mapUrl',format(
      'https://www.google.com/maps/search/?api=1&query=%s,%s',
      v_lat,
      v_lng
    )
  );
end;
$$;

revoke all on function public.tpl_coordenadas_publicas_landing(public.publicaciones)
from public, anon, authenticated;

-- Completa borrador y versión publicada sin alterar textos, diseño ni leads.
update public.tpl_landings_comerciales l
set
  configuracion_borrador =
    coalesce(l.configuracion_borrador,'{}'::jsonb)
    || public.tpl_coordenadas_publicas_landing(p),
  configuracion_publicada = case
    when coalesce(l.configuracion_publicada,'{}'::jsonb)='{}'::jsonb
      then '{}'::jsonb
    else l.configuracion_publicada || public.tpl_coordenadas_publicas_landing(p)
  end,
  borrador_actualizado_en = now(),
  publicado_actualizado_en = case
    when l.configuracion_publicada <> '{}'::jsonb then now()
    else l.publicado_actualizado_en
  end,
  actualizado_en = now()
from public.publicaciones p
where (
    l.publicacion_id=p.id
    or (
      l.codigo='land-caburgua'
      and (
        p.datos_formulario->>'old_id'='caburgua'
        or lower(coalesce(p.codigo_publico,''))='caburgua'
      )
    )
  )
  and public.tpl_coordenadas_publicas_landing(p) <> '{}'::jsonb;

-- Diagnóstico visible al ejecutar la migración.
select
  l.codigo,
  l.configuracion_publicada->>'mapLatitude' as latitud_mapa,
  l.configuracion_publicada->>'mapLongitude' as longitud_mapa,
  l.configuracion_publicada->>'mapPrecision' as precision_mapa
from public.tpl_landings_comerciales l
where l.codigo='land-caburgua';

commit;


-- Source: 202607230008_coordenadas_canonicas_landing.sql
-- Coordenadas canónicas para Landing Premium.
-- Prioridad: publicación pública exacta -> configuración lat/lon -> publicación aproximada.
-- El enlace de Google Maps queda únicamente como respaldo del frontend.
-- Proyecto Supabase: qxavbqhyqaqalpzbhwmh

begin;

create or replace function public.tpl_coordenadas_fuente_landing(
  p_publicacion public.publicaciones,
  p_configuracion jsonb,
  p_preferir_configuracion boolean default false
)
returns jsonb
language plpgsql
stable
set search_path=public
as $$
declare
  v_lat numeric;
  v_lng numeric;
  v_config_lat numeric;
  v_config_lng numeric;
  v_precision text;
  v_source text;
begin
  p_configuracion := coalesce(p_configuracion,'{}'::jsonb);

  if coalesce(p_configuracion->>'mapLatitude','') ~ '^-?[0-9]+([.][0-9]+)?$'
     and coalesce(p_configuracion->>'mapLongitude','') ~ '^-?[0-9]+([.][0-9]+)?$' then
    v_config_lat := (p_configuracion->>'mapLatitude')::numeric;
    v_config_lng := (p_configuracion->>'mapLongitude')::numeric;
    if v_config_lat < -90 or v_config_lat > 90
       or v_config_lng < -180 or v_config_lng > 180 then
      v_config_lat := null;
      v_config_lng := null;
    end if;
  end if;

  if p_preferir_configuracion
     and v_config_lat is not null and v_config_lng is not null then
    v_lat := v_config_lat;
    v_lng := v_config_lng;
    v_precision := coalesce(nullif(p_configuracion->>'mapPrecision',''),'configurada');
    v_source := coalesce(nullif(p_configuracion->>'mapCoordinateSource',''),'landing_config');
  elsif p_publicacion.latitud_publica is not null
     and p_publicacion.longitud_publica is not null
     and p_publicacion.consentimiento_uso_ubicacion then
    v_lat := p_publicacion.latitud_publica;
    v_lng := p_publicacion.longitud_publica;
    v_precision := coalesce(nullif(p_publicacion.precision_ubicacion,''),'exacta');
    v_source := 'publication_public';
  elsif v_config_lat is not null and v_config_lng is not null then
    v_lat := v_config_lat;
    v_lng := v_config_lng;
    v_precision := coalesce(nullif(p_configuracion->>'mapPrecision',''),'configurada');
    v_source := coalesce(nullif(p_configuracion->>'mapCoordinateSource',''),'landing_config');
  elsif p_publicacion.latitud_privada is not null
     and p_publicacion.longitud_privada is not null then
    v_lat := round(p_publicacion.latitud_privada,3);
    v_lng := round(p_publicacion.longitud_privada,3);
    v_precision := 'aproximada';
    v_source := 'publication_approximate';
  else
    return '{}'::jsonb;
  end if;

  if v_lat < -90 or v_lat > 90 or v_lng < -180 or v_lng > 180 then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'mapLatitude',v_lat,
    'mapLongitude',v_lng,
    'mapZoom',case when v_precision='exacta' then 17 else 16 end,
    'mapPrecision',v_precision,
    'mapCoordinateSource',v_source
  );
end;
$$;

revoke all on function public.tpl_coordenadas_fuente_landing(
  public.publicaciones,jsonb,boolean
) from public,anon,authenticated;

-- Caburgua: el propietario/administrador solicitó mostrar el punto exacto.
update public.publicaciones p
set
  latitud_publica=p.latitud_privada,
  longitud_publica=p.longitud_privada,
  consentimiento_uso_ubicacion=true,
  consentimiento_uso_ubicacion_en=coalesce(p.consentimiento_uso_ubicacion_en,now()),
  precision_ubicacion='exacta',
  actualizado_en=now()
where (
    p.datos_formulario->>'old_id'='caburgua'
    or lower(coalesce(p.codigo_publico,''))='caburgua'
  )
  and p.latitud_privada is not null
  and p.longitud_privada is not null;

-- Asegura la relación con la publicación canónica de Caburgua.
update public.tpl_landings_comerciales l
set publicacion_id=p.id,actualizado_en=now()
from public.publicaciones p
where l.codigo='land-caburgua'
  and l.publicacion_id is null
  and (
    p.datos_formulario->>'old_id'='caburgua'
    or lower(coalesce(p.codigo_publico,''))='caburgua'
  );

-- Devuelve siempre las coordenadas de la publicación canónica junto a la Landing.
create or replace function public.tpl_obtener_landing_publica(p_identificador text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'config',
      l.configuracion_publicada
      || public.tpl_coordenadas_fuente_landing(
        p,l.configuracion_publicada,false
      ),
    'status',l.estado,
    'version',l.version_config,
    'updatedAt',l.publicado_actualizado_en,
    'publishedAt',l.publicado_en
  )
  from public.tpl_landings_comerciales l
  left join public.publicaciones p on p.id=l.publicacion_id
  where (l.codigo=left(trim(p_identificador),120) or l.slug=left(trim(p_identificador),120))
    and l.estado='publicada'
    and l.configuracion_publicada <> '{}'::jsonb
  limit 1
$$;

revoke all on function public.tpl_obtener_landing_publica(text) from public;
grant execute on function public.tpl_obtener_landing_publica(text) to anon,authenticated;

create or replace function public.tpl_obtener_landing_admin(p_identificador text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_landing public.tpl_landings_comerciales%rowtype;
  v_publicacion public.publicaciones%rowtype;
  v_email text;
begin
  if auth.uid() is null or not public.es_administrador_activo() then
    raise exception 'Acceso no autorizado' using errcode='42501';
  end if;

  select * into v_landing
  from public.tpl_landings_comerciales
  where codigo=left(trim(p_identificador),120)
     or slug=left(trim(p_identificador),120)
  limit 1;

  if v_landing.id is null then
    raise exception 'Landing no encontrada';
  end if;

  if v_landing.publicacion_id is not null then
    select * into v_publicacion
    from public.publicaciones
    where id=v_landing.publicacion_id;
  end if;

  select email into v_email
  from auth.users
  where id=v_landing.actualizado_por;

  return jsonb_build_object(
    'id',v_landing.id,
    'code',v_landing.codigo,
    'slug',v_landing.slug,
    'status',v_landing.estado,
    'version',v_landing.version_config,
    'draft',
      v_landing.configuracion_borrador
      || public.tpl_coordenadas_fuente_landing(
        v_publicacion,v_landing.configuracion_borrador,true
      ),
    'published',
      v_landing.configuracion_publicada
      || public.tpl_coordenadas_fuente_landing(
        v_publicacion,v_landing.configuracion_publicada,false
      ),
    'updatedAt',v_landing.borrador_actualizado_en,
    'publishedAt',v_landing.publicado_actualizado_en,
    'updatedBy',v_email,
    'publicationId',v_landing.publicacion_id
  );
end;
$$;

revoke all on function public.tpl_obtener_landing_admin(text)
from public,anon,authenticated;
grant execute on function public.tpl_obtener_landing_admin(text) to authenticated;

create or replace function public.tpl_listar_landings_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.es_administrador_activo() then
    raise exception 'Acceso no autorizado' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',l.id,
    'code',l.codigo,
    'slug',l.slug,
    'status',l.estado,
    'version',l.version_config,
    'draft',
      l.configuracion_borrador
      || public.tpl_coordenadas_fuente_landing(
        p,l.configuracion_borrador,true
      ),
    'published',
      l.configuracion_publicada
      || public.tpl_coordenadas_fuente_landing(
        p,l.configuracion_publicada,false
      ),
    'updatedAt',l.borrador_actualizado_en,
    'publishedAt',l.publicado_actualizado_en,
    'publicationId',l.publicacion_id
  ) order by l.actualizado_en desc),'[]'::jsonb)
  into v_result
  from public.tpl_landings_comerciales l
  left join public.publicaciones p on p.id=l.publicacion_id;

  return v_result;
end;
$$;

revoke all on function public.tpl_listar_landings_admin()
from public,anon,authenticated;
grant execute on function public.tpl_listar_landings_admin() to authenticated;

-- Al publicar coordenadas editadas en Landing Engine, actualiza la fuente canónica.
create or replace function public.tpl_sincronizar_coordenadas_publicadas()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_lat numeric;
  v_lng numeric;
begin
  if new.publicacion_id is null
     or coalesce(new.configuracion_publicada->>'mapCoordinateSource','')
        <> 'landing_config'
     or coalesce(new.configuracion_publicada->>'mapLatitude','')
        !~ '^-?[0-9]+([.][0-9]+)?$'
     or coalesce(new.configuracion_publicada->>'mapLongitude','')
        !~ '^-?[0-9]+([.][0-9]+)?$' then
    return new;
  end if;

  v_lat := (new.configuracion_publicada->>'mapLatitude')::numeric;
  v_lng := (new.configuracion_publicada->>'mapLongitude')::numeric;

  if v_lat between -90 and 90 and v_lng between -180 and 180 then
    update public.publicaciones
    set
      latitud_publica=v_lat,
      longitud_publica=v_lng,
      consentimiento_uso_ubicacion=true,
      consentimiento_uso_ubicacion_en=now(),
      precision_ubicacion='exacta',
      actualizado_en=now()
    where id=new.publicacion_id;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_tpl_sincronizar_coordenadas_publicadas
on public.tpl_landings_comerciales;
create trigger tr_tpl_sincronizar_coordenadas_publicadas
after insert or update of configuracion_publicada
on public.tpl_landings_comerciales
for each row execute function public.tpl_sincronizar_coordenadas_publicadas();

-- Permite administrar las coordenadas públicas desde la ficha de la parcela.
create or replace function public.crm_guardar_publicacion_admin(
  p_publicacion_id uuid,
  p_datos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_admin uuid := public.crm_exigir_administrador();
  v_resultado jsonb;
begin
  if p_publicacion_id is null
     or jsonb_typeof(p_datos) is distinct from 'object' then
    raise exception using message='CRM_PUBLICATION_DATA_INVALID';
  end if;

  update public.publicaciones p set
    titulo_publico=trim(coalesce(p_datos->>'titulo_publico',p.titulo_publico)),
    descripcion_publica=trim(coalesce(p_datos->>'descripcion_publica',p.descripcion_publica)),
    precio_publicacion=case when p_datos ? 'precio_publicacion' and nullif(p_datos->>'precio_publicacion','') is not null then (p_datos->>'precio_publicacion')::bigint else null end,
    superficie_m2=case when p_datos ? 'superficie_m2' and nullif(p_datos->>'superficie_m2','') is not null then (p_datos->>'superficie_m2')::numeric else null end,
    rol=nullif(trim(p_datos->>'rol'),''),
    region=trim(coalesce(p_datos->>'region',p.region)),
    comuna=trim(coalesce(p_datos->>'comuna',p.comuna)),
    sector=trim(coalesce(p_datos->>'sector',p.sector)),
    ubicacion_publica_aproximada=trim(coalesce(p_datos->>'ubicacion_publica_aproximada',p.ubicacion_publica_aproximada)),
    ciudad_principal=nullif(trim(p_datos->>'ciudad_principal'),''),
    distancia_ciudad=nullif(trim(p_datos->>'distancia_ciudad'),''),
    latitud_privada=case when p_datos ? 'latitud_privada' and nullif(p_datos->>'latitud_privada','') is not null then (p_datos->>'latitud_privada')::numeric else null end,
    longitud_privada=case when p_datos ? 'longitud_privada' and nullif(p_datos->>'longitud_privada','') is not null then (p_datos->>'longitud_privada')::numeric else null end,
    latitud_publica=case when coalesce((p_datos->>'consentimiento_uso_ubicacion')::boolean,false) and nullif(p_datos->>'latitud_publica','') is not null then (p_datos->>'latitud_publica')::numeric else null end,
    longitud_publica=case when coalesce((p_datos->>'consentimiento_uso_ubicacion')::boolean,false) and nullif(p_datos->>'longitud_publica','') is not null then (p_datos->>'longitud_publica')::numeric else null end,
    consentimiento_uso_ubicacion=coalesce((p_datos->>'consentimiento_uso_ubicacion')::boolean,false),
    consentimiento_uso_ubicacion_en=case when coalesce((p_datos->>'consentimiento_uso_ubicacion')::boolean,false) then now() else null end,
    precision_ubicacion=coalesce(nullif(p_datos->>'precision_ubicacion',''),'aproximada'),
    agua=nullif(trim(p_datos->>'agua'),''),
    luz=nullif(trim(p_datos->>'luz'),''),
    acceso=nullif(trim(p_datos->>'acceso'),''),
    topografia=nullif(trim(p_datos->>'topografia'),''),
    naturaleza=coalesce(array(select jsonb_array_elements_text(coalesce(p_datos->'naturaleza','[]'::jsonb))),'{}'),
    cuerpos_agua=coalesce(array(select jsonb_array_elements_text(coalesce(p_datos->'cuerpos_agua','[]'::jsonb))),'{}'),
    servicios=coalesce(array(select jsonb_array_elements_text(coalesce(p_datos->'servicios','[]'::jsonb))),'{}'),
    facilidad_pago=coalesce((p_datos->>'facilidad_pago')::boolean,false),
    detalle_facilidad_pago=nullif(trim(p_datos->>'detalle_facilidad_pago'),''),
    contacto_nombre=trim(coalesce(p_datos->>'contacto_nombre',p.contacto_nombre)),
    contacto_email=trim(coalesce(p_datos->>'contacto_email',p.contacto_email)),
    contacto_telefono=nullif(trim(p_datos->>'contacto_telefono'),''),
    contacto_organizacion=nullif(trim(p_datos->>'contacto_organizacion'),''),
    plan_seleccionado=nullif(trim(p_datos->>'plan_seleccionado'),''),
    datos_formulario=coalesce(p_datos->'datos_formulario',p.datos_formulario),
    actualizado_en=now()
  where p.id=p_publicacion_id;

  if not found then
    raise exception using message='CRM_PUBLICATION_NOT_FOUND';
  end if;

  insert into public.moderacion_registros(
    publicacion_id,estado_nuevo,motivo,responsable_id,evidencia
  )
  select p.id,p.estado,'Edición administrativa desde CRM',v_admin,
    jsonb_build_object(
      'accion','edicion_manual',
      'mapa_publico',coalesce((p_datos->>'consentimiento_uso_ubicacion')::boolean,false),
      'actualizado_en',now()
    )
  from public.publicaciones p
  where p.id=p_publicacion_id;

  select to_jsonb(p)-'idempotency_key'
  into v_resultado
  from public.publicaciones p
  where p.id=p_publicacion_id;

  return v_resultado;
end;
$$;

revoke all on function public.crm_guardar_publicacion_admin(uuid,jsonb)
from public,anon,authenticated;
grant execute on function public.crm_guardar_publicacion_admin(uuid,jsonb)
to authenticated;

-- Sincroniza los JSON existentes para que vista previa y versión pública coincidan.
update public.tpl_landings_comerciales l
set
  configuracion_borrador=
    l.configuracion_borrador
    || public.tpl_coordenadas_fuente_landing(
      p,l.configuracion_borrador,false
    ),
  configuracion_publicada=case
    when l.configuracion_publicada='{}'::jsonb then '{}'::jsonb
    else l.configuracion_publicada
      || public.tpl_coordenadas_fuente_landing(
        p,l.configuracion_publicada,false
      )
  end,
  actualizado_en=now()
from public.publicaciones p
where p.id=l.publicacion_id;

-- Diagnóstico esperado: Caburgua debe mostrar el punto exacto de su publicación.
select
  l.codigo,
  p.codigo_publico,
  p.latitud_privada,
  p.longitud_privada,
  p.latitud_publica,
  p.longitud_publica,
  p.precision_ubicacion,
  l.configuracion_publicada->>'mapLatitude' as landing_latitud,
  l.configuracion_publicada->>'mapLongitude' as landing_longitud
from public.tpl_landings_comerciales l
left join public.publicaciones p on p.id=l.publicacion_id
where l.codigo='land-caburgua';

commit;


-- Source: 202607240001_tpl_business_centro_clientes.sql
-- TPL Business — Centro real de clientes
-- Proyecto Supabase: qxavbqhyqaqalpzbhwmh
-- Requiere las migraciones 202607230001 y 202607230002.
-- No altera el flujo público de Landing, leads, visitas ni WhatsApp.

begin;

create extension if not exists pgcrypto;

create table if not exists public.tpl_business_membresias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  cuenta_id uuid not null references public.tpl_business_cuentas(id) on delete cascade,
  proyecto_id uuid not null references public.tpl_proyectos_comerciales(id) on delete cascade,
  rol text not null default 'propietario',
  estado text not null default 'pendiente',
  creado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint tpl_business_membresias_rol_check
    check (rol in ('propietario','corredor','colaborador','administrador')),
  constraint tpl_business_membresias_estado_check
    check (estado in ('pendiente','activa','suspendida','revocada')),
  constraint tpl_business_membresias_usuario_proyecto_unique
    unique (usuario_id,proyecto_id)
);

create table if not exists public.tpl_business_modulos_catalogo (
  codigo text primary key,
  nombre text not null,
  grupo text not null,
  descripcion text not null,
  orden integer not null default 0,
  estado text not null default 'activo',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint tpl_business_modulos_grupo_check
    check (grupo in ('estado','interesados','organizar','analizar','automatizar')),
  constraint tpl_business_modulos_estado_check
    check (estado in ('activo','inactivo'))
);

create table if not exists public.tpl_proyecto_modulos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.tpl_proyectos_comerciales(id) on delete cascade,
  modulo_codigo text not null references public.tpl_business_modulos_catalogo(codigo) on delete restrict,
  estado text not null default 'disponible',
  configuracion jsonb not null default '{}'::jsonb,
  actualizado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint tpl_proyecto_modulos_estado_check
    check (estado in ('activo','disponible','pendiente','proximamente','no_contratado')),
  constraint tpl_proyecto_modulos_config_check
    check (jsonb_typeof(configuracion)='object'),
  constraint tpl_proyecto_modulos_unique
    unique (proyecto_id,modulo_codigo)
);

create table if not exists public.tpl_proyecto_experiencia (
  proyecto_id uuid primary key references public.tpl_proyectos_comerciales(id) on delete cascade,
  salud_porcentaje integer,
  salud_fuente text not null default 'pendiente',
  salud_resumen text,
  fortalezas jsonb not null default '[]'::jsonb,
  oportunidades jsonb not null default '[]'::jsonb,
  recomendaciones jsonb not null default '[]'::jsonb,
  etapa_crecimiento text not null default 'comenzar',
  actualizado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint tpl_proyecto_experiencia_salud_check
    check (salud_porcentaje is null or salud_porcentaje between 0 and 100),
  constraint tpl_proyecto_experiencia_fuente_check
    check (salud_fuente in ('pendiente','manual','calculada')),
  constraint tpl_proyecto_experiencia_arrays_check
    check (
      jsonb_typeof(fortalezas)='array'
      and jsonb_typeof(oportunidades)='array'
      and jsonb_typeof(recomendaciones)='array'
    ),
  constraint tpl_proyecto_experiencia_etapa_check
    check (etapa_crecimiento in ('comenzar','crecer','optimizar','escalar'))
);

alter table public.planes_comerciales
  add column if not exists objetivo_cliente text,
  add column if not exists beneficios jsonb not null default '[]'::jsonb,
  add column if not exists modulos jsonb not null default '[]'::jsonb,
  add column if not exists visible_tpl_business boolean not null default false,
  add column if not exists orden_tpl_business integer not null default 0;

create table if not exists public.tpl_solicitudes_comerciales (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete restrict,
  cuenta_id uuid not null references public.tpl_business_cuentas(id) on delete restrict,
  proyecto_id uuid not null references public.tpl_proyectos_comerciales(id) on delete restrict,
  plan_id uuid references public.planes_comerciales(id) on delete set null,
  modulo_codigo text references public.tpl_business_modulos_catalogo(codigo) on delete set null,
  recomendacion text,
  tipo text not null,
  mensaje text,
  estado text not null default 'solicitada',
  gestionado_por uuid references auth.users(id) on delete set null,
  gestionado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint tpl_solicitudes_tipo_check
    check (tipo in ('plan','modulo','recomendacion')),
  constraint tpl_solicitudes_estado_check
    check (estado in ('solicitada','contactando','aprobada','activada','rechazada')),
  constraint tpl_solicitudes_objetivo_check
    check (
      (tipo='plan' and plan_id is not null)
      or (tipo='modulo' and modulo_codigo is not null)
      or (tipo='recomendacion' and nullif(trim(recomendacion),'') is not null)
    )
);

create table if not exists public.tpl_business_accesos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users(id) on delete restrict,
  proyecto_id uuid references public.tpl_proyectos_comerciales(id) on delete set null,
  evento text not null,
  modo text not null default 'cliente',
  metadata jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  constraint tpl_business_accesos_evento_check
    check (evento in ('inicio_sesion','proyecto_consultado','vista_administrativa','solicitud_creada','cierre_sesion')),
  constraint tpl_business_accesos_modo_check
    check (modo in ('cliente','administrador')),
  constraint tpl_business_accesos_metadata_check
    check (jsonb_typeof(metadata)='object')
);

create index if not exists tpl_business_membresias_usuario_idx
  on public.tpl_business_membresias(usuario_id,estado,proyecto_id);
create index if not exists tpl_proyecto_modulos_proyecto_idx
  on public.tpl_proyecto_modulos(proyecto_id,estado);
create index if not exists tpl_solicitudes_proyecto_fecha_idx
  on public.tpl_solicitudes_comerciales(proyecto_id,creado_en desc);
create index if not exists tpl_solicitudes_usuario_fecha_idx
  on public.tpl_solicitudes_comerciales(usuario_id,creado_en desc);
create index if not exists tpl_business_accesos_usuario_fecha_idx
  on public.tpl_business_accesos(usuario_id,creado_en desc);

insert into public.tpl_business_modulos_catalogo(codigo,nombre,grupo,descripcion,orden)
values
  ('publicacion','Publicación','estado','Presenta la propiedad dentro del catálogo público de Tu Parcela Lista.',10),
  ('landing_premium','Landing Premium','interesados','Presenta la propiedad con una experiencia enfocada en generar consultas y visitas.',20),
  ('google_ads','Google Ads','interesados','Permite solicitar una campaña de búsqueda para atraer interesados con intención.',30),
  ('meta_ads','Meta Ads','interesados','Permite solicitar campañas de alcance y captación en plataformas Meta.',40),
  ('seo','SEO','interesados','Mejora la capacidad del proyecto para aparecer en búsquedas orgánicas.',50),
  ('crm','CRM','organizar','Organiza interesados, oportunidades y próximos pasos comerciales.',60),
  ('agenda','Agenda','organizar','Centraliza las solicitudes y coordinación de visitas.',70),
  ('whatsapp','WhatsApp','organizar','Conecta las conversaciones iniciadas desde la experiencia comercial.',80),
  ('seguimiento','Seguimiento','organizar','Ayuda a mantener contacto con cada interesado sin perder oportunidades.',90),
  ('dashboard','Dashboard','analizar','Resume la actividad comercial relevante del proyecto.',100),
  ('conversiones','Conversiones','analizar','Relaciona consultas y acciones con resultados comerciales.',110),
  ('reportes','Reportes','analizar','Prepara información resumida para evaluar el avance del proyecto.',120),
  ('ia_comercial','IA Comercial','automatizar','Preparará recomendaciones contextuales para mejorar la gestión.',130),
  ('automatizaciones','Automatizaciones','automatizar','Permitirá ejecutar tareas repetitivas de manera controlada.',140),
  ('recordatorios','Recordatorios','automatizar','Ayudará a mantener visitas y seguimientos dentro de plazo.',150),
  ('video','Video','estado','Refuerza la presentación visual de la propiedad.',160),
  ('recorrido_360','Recorrido 360°','estado','Permitirá explorar la propiedad mediante una experiencia inmersiva.',170)
on conflict(codigo) do update set
  nombre=excluded.nombre,
  grupo=excluded.grupo,
  descripcion=excluded.descripcion,
  orden=excluded.orden,
  estado='activo',
  actualizado_en=now();

-- Configuración inicial del proyecto piloto. Los valores viven en Supabase,
-- no en el JavaScript del portal.
insert into public.tpl_proyecto_modulos(proyecto_id,modulo_codigo,estado)
select p.id,v.modulo,v.estado
from public.tpl_proyectos_comerciales p
cross join (
  values
    ('publicacion','activo'),
    ('landing_premium','activo'),
    ('crm','activo'),
    ('whatsapp','activo'),
    ('agenda','activo'),
    ('google_ads','no_contratado'),
    ('meta_ads','disponible'),
    ('seo','disponible'),
    ('seguimiento','disponible'),
    ('dashboard','activo'),
    ('conversiones','disponible'),
    ('reportes','disponible'),
    ('ia_comercial','proximamente'),
    ('automatizaciones','proximamente'),
    ('recordatorios','disponible'),
    ('video','pendiente'),
    ('recorrido_360','proximamente')
) as v(modulo,estado)
where p.codigo='pro-caburgua'
on conflict(proyecto_id,modulo_codigo) do nothing;

insert into public.tpl_proyecto_experiencia(
  proyecto_id,salud_porcentaje,salud_fuente,salud_resumen,
  fortalezas,oportunidades,recomendaciones,etapa_crecimiento
)
select
  p.id,
  null,
  'pendiente',
  'La evaluación comercial se completará cuando exista información suficiente.',
  '["Landing Premium publicada","Captura comercial conectada"]'::jsonb,
  '["Agregar video","Evaluar campañas de captación","Configurar seguimiento"]'::jsonb,
  '["Agregar video","Solicitar evaluación de Google Ads","Configurar seguimiento comercial"]'::jsonb,
  'comenzar'
from public.tpl_proyectos_comerciales p
where p.codigo='pro-caburgua'
on conflict(proyecto_id) do nothing;

create or replace function public.tpl_business_actualizar_timestamp()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
begin
  new.actualizado_en=now();
  return new;
end;
$$;

drop trigger if exists tr_tpl_business_membresias_timestamp on public.tpl_business_membresias;
create trigger tr_tpl_business_membresias_timestamp
before update on public.tpl_business_membresias
for each row execute function public.tpl_business_actualizar_timestamp();

drop trigger if exists tr_tpl_proyecto_modulos_timestamp on public.tpl_proyecto_modulos;
create trigger tr_tpl_proyecto_modulos_timestamp
before update on public.tpl_proyecto_modulos
for each row execute function public.tpl_business_actualizar_timestamp();

drop trigger if exists tr_tpl_proyecto_experiencia_timestamp on public.tpl_proyecto_experiencia;
create trigger tr_tpl_proyecto_experiencia_timestamp
before update on public.tpl_proyecto_experiencia
for each row execute function public.tpl_business_actualizar_timestamp();

drop trigger if exists tr_tpl_solicitudes_comerciales_timestamp on public.tpl_solicitudes_comerciales;
create trigger tr_tpl_solicitudes_comerciales_timestamp
before update on public.tpl_solicitudes_comerciales
for each row execute function public.tpl_business_actualizar_timestamp();

create or replace function public.tpl_business_usuario_tiene_proyecto(p_proyecto_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select auth.uid() is not null and (
    public.es_administrador_activo()
    or exists(
      select 1
      from public.tpl_business_membresias m
      where m.usuario_id=auth.uid()
        and m.proyecto_id=p_proyecto_id
        and m.estado='activa'
    )
  )
$$;

alter table public.tpl_business_membresias enable row level security;
alter table public.tpl_business_modulos_catalogo enable row level security;
alter table public.tpl_proyecto_modulos enable row level security;
alter table public.tpl_proyecto_experiencia enable row level security;
alter table public.tpl_solicitudes_comerciales enable row level security;
alter table public.tpl_business_accesos enable row level security;

drop policy if exists "Miembros consultan sus membresías" on public.tpl_business_membresias;
create policy "Miembros consultan sus membresías"
on public.tpl_business_membresias for select to authenticated
using (usuario_id=auth.uid() or public.es_administrador_activo());

drop policy if exists "Administradores gestionan membresías" on public.tpl_business_membresias;
create policy "Administradores gestionan membresías"
on public.tpl_business_membresias for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Usuarios consultan catálogo TPL Business" on public.tpl_business_modulos_catalogo;
create policy "Usuarios consultan catálogo TPL Business"
on public.tpl_business_modulos_catalogo for select to authenticated
using (estado='activo');

drop policy if exists "Administradores gestionan catálogo TPL Business" on public.tpl_business_modulos_catalogo;
create policy "Administradores gestionan catálogo TPL Business"
on public.tpl_business_modulos_catalogo for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Miembros consultan módulos de su proyecto" on public.tpl_proyecto_modulos;
create policy "Miembros consultan módulos de su proyecto"
on public.tpl_proyecto_modulos for select to authenticated
using (public.tpl_business_usuario_tiene_proyecto(proyecto_id));

drop policy if exists "Administradores gestionan módulos de proyecto" on public.tpl_proyecto_modulos;
create policy "Administradores gestionan módulos de proyecto"
on public.tpl_proyecto_modulos for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Miembros consultan experiencia de su proyecto" on public.tpl_proyecto_experiencia;
create policy "Miembros consultan experiencia de su proyecto"
on public.tpl_proyecto_experiencia for select to authenticated
using (public.tpl_business_usuario_tiene_proyecto(proyecto_id));

drop policy if exists "Administradores gestionan experiencia de proyecto" on public.tpl_proyecto_experiencia;
create policy "Administradores gestionan experiencia de proyecto"
on public.tpl_proyecto_experiencia for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Usuarios consultan sus solicitudes comerciales" on public.tpl_solicitudes_comerciales;
create policy "Usuarios consultan sus solicitudes comerciales"
on public.tpl_solicitudes_comerciales for select to authenticated
using (usuario_id=auth.uid() or public.es_administrador_activo());

drop policy if exists "Usuarios crean solicitudes para sus proyectos" on public.tpl_solicitudes_comerciales;
create policy "Usuarios crean solicitudes para sus proyectos"
on public.tpl_solicitudes_comerciales for insert to authenticated
with check (
  usuario_id=auth.uid()
  and exists(
    select 1 from public.tpl_business_membresias m
    where m.usuario_id=auth.uid()
      and m.cuenta_id=tpl_solicitudes_comerciales.cuenta_id
      and m.proyecto_id=tpl_solicitudes_comerciales.proyecto_id
      and m.estado='activa'
  )
);

drop policy if exists "Administradores gestionan solicitudes comerciales" on public.tpl_solicitudes_comerciales;
create policy "Administradores gestionan solicitudes comerciales"
on public.tpl_solicitudes_comerciales for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Administradores consultan accesos TPL Business" on public.tpl_business_accesos;
create policy "Administradores consultan accesos TPL Business"
on public.tpl_business_accesos for select to authenticated
using (public.es_administrador_activo());

-- Extiende las tablas TPL Business existentes sin abrir datos de otros clientes.
drop policy if exists "Miembros consultan su cuenta TPL Business" on public.tpl_business_cuentas;
create policy "Miembros consultan su cuenta TPL Business"
on public.tpl_business_cuentas for select to authenticated
using (
  public.es_administrador_activo()
  or exists(
    select 1 from public.tpl_business_membresias m
    where m.usuario_id=auth.uid()
      and m.cuenta_id=id
      and m.estado='activa'
  )
);

drop policy if exists "Miembros consultan sus proyectos comerciales" on public.tpl_proyectos_comerciales;
create policy "Miembros consultan sus proyectos comerciales"
on public.tpl_proyectos_comerciales for select to authenticated
using (public.tpl_business_usuario_tiene_proyecto(id));

drop policy if exists "Miembros consultan las landings de sus proyectos" on public.tpl_landings_comerciales;
create policy "Miembros consultan las landings de sus proyectos"
on public.tpl_landings_comerciales for select to authenticated
using (public.tpl_business_usuario_tiene_proyecto(proyecto_comercial_id));

revoke all on public.tpl_business_membresias from anon;
revoke all on public.tpl_business_modulos_catalogo from anon;
revoke all on public.tpl_proyecto_modulos from anon;
revoke all on public.tpl_proyecto_experiencia from anon;
revoke all on public.tpl_solicitudes_comerciales from anon;
revoke all on public.tpl_business_accesos from anon;

grant select,insert,update,delete on public.tpl_business_membresias to authenticated;
grant select,insert,update,delete on public.tpl_business_modulos_catalogo to authenticated;
grant select,insert,update,delete on public.tpl_proyecto_modulos to authenticated;
grant select,insert,update,delete on public.tpl_proyecto_experiencia to authenticated;
grant select,insert,update,delete on public.tpl_solicitudes_comerciales to authenticated;
grant select on public.tpl_business_accesos to authenticated;

create or replace function public.tpl_business_mis_proyectos()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida' using errcode='42501';
  end if;

  if public.es_administrador_activo() then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',p.id,
      'code',p.codigo,
      'name',p.nombre,
      'accountId',c.id,
      'accountCode',c.codigo,
      'accountName',c.nombre,
      'role','administrador',
      'status',p.estado
    ) order by p.actualizado_en desc),'[]'::jsonb)
    into v_result
    from public.tpl_proyectos_comerciales p
    join public.tpl_business_cuentas c on c.id=p.cuenta_id
    where p.estado<>'cerrado'
    limit 100;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',p.id,
      'code',p.codigo,
      'name',p.nombre,
      'accountId',c.id,
      'accountCode',c.codigo,
      'accountName',c.nombre,
      'role',m.rol,
      'status',p.estado
    ) order by p.actualizado_en desc),'[]'::jsonb)
    into v_result
    from public.tpl_business_membresias m
    join public.tpl_proyectos_comerciales p on p.id=m.proyecto_id
    join public.tpl_business_cuentas c on c.id=m.cuenta_id
    where m.usuario_id=auth.uid()
      and m.estado='activa'
      and p.cuenta_id=m.cuenta_id;
  end if;

  return coalesce(v_result,'[]'::jsonb);
end;
$$;

create or replace function public.tpl_business_sesion_actual()
returns jsonb
language plpgsql
volatile
security definer
set search_path=public,auth
as $$
declare
  v_projects jsonb;
  v_admin boolean;
  v_mode text;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida' using errcode='42501';
  end if;

  v_admin:=public.es_administrador_activo();
  v_mode:=case when v_admin then 'administrador' else 'cliente' end;
  v_projects:=public.tpl_business_mis_proyectos();

  insert into public.tpl_business_accesos(usuario_id,evento,modo,metadata)
  values(
    auth.uid(),
    'inicio_sesion',
    v_mode,
    jsonb_build_object('projectCount',jsonb_array_length(v_projects))
  );

  return jsonb_build_object(
    'user',jsonb_build_object(
      'id',auth.uid(),
      'email',coalesce(auth.jwt()->>'email',''),
      'name',coalesce(
        auth.jwt()#>>'{user_metadata,full_name}',
        auth.jwt()#>>'{user_metadata,name}',
        ''
      )
    ),
    'isAdmin',v_admin,
    'projects',v_projects
  );
end;
$$;

create or replace function public.tpl_business_resumen_proyecto(
  p_proyecto_id uuid,
  p_admin_preview boolean default false
) returns jsonb
language plpgsql
volatile
security definer
set search_path=public,auth
as $$
declare
  v_project public.tpl_proyectos_comerciales%rowtype;
  v_account public.tpl_business_cuentas%rowtype;
  v_landing public.tpl_landings_comerciales%rowtype;
  v_experience public.tpl_proyecto_experiencia%rowtype;
  v_modules jsonb;
  v_metrics jsonb;
  v_plans jsonb;
  v_requests jsonb;
  v_public_url text;
  v_leads bigint;
  v_consultations bigint;
  v_visits bigint;
  v_whatsapp bigint;
  v_conversions bigint;
  v_last_activity timestamptz;
begin
  select * into v_project
  from public.tpl_proyectos_comerciales
  where id=p_proyecto_id;
  if v_project.id is null then
    raise exception 'Proyecto no encontrado' using errcode='P0002';
  end if;

  select * into v_account
  from public.tpl_business_cuentas
  where id=v_project.cuenta_id;

  select * into v_landing
  from public.tpl_landings_comerciales
  where proyecto_comercial_id=v_project.id
  order by
    case estado when 'publicada' then 0 when 'borrador' then 1 else 2 end,
    actualizado_en desc
  limit 1;

  select * into v_experience
  from public.tpl_proyecto_experiencia
  where proyecto_id=v_project.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'code',catalog.codigo,
    'name',catalog.nombre,
    'group',catalog.grupo,
    'description',catalog.descripcion,
    'status',coalesce(pm.estado,
      case
        when catalog.codigo='landing_premium' and v_landing.estado='publicada' then 'activo'
        when catalog.codigo='landing_premium' and v_landing.id is not null then 'pendiente'
        else 'disponible'
      end
    ),
    'config',coalesce(pm.configuracion,'{}'::jsonb)
  ) order by catalog.orden),'[]'::jsonb)
  into v_modules
  from public.tpl_business_modulos_catalogo catalog
  left join public.tpl_proyecto_modulos pm
    on pm.modulo_codigo=catalog.codigo
   and pm.proyecto_id=v_project.id
  where catalog.estado='activo';

  select count(*) into v_leads
  from public.crm_oportunidades o
  where o.proyecto_comercial_id=v_project.id;

  select
    count(*) filter(where i.tipo='informacion_solicitada'),
    count(*) filter(where i.tipo='whatsapp_click')
  into v_consultations,v_whatsapp
  from public.crm_interacciones_landing i
  where i.proyecto_comercial_id=v_project.id;

  select count(*) into v_visits
  from public.visitas v
  where v.proyecto_comercial_id=v_project.id;

  select count(*) into v_conversions
  from public.crm_oportunidades o
  where o.proyecto_comercial_id=v_project.id
    and (o.estado='ganada' or o.etapa in ('reservado','ganado'));

  select max(activity_date) into v_last_activity
  from (
    select max(i.creado_en) activity_date
    from public.crm_interacciones_landing i
    where i.proyecto_comercial_id=v_project.id
    union all
    select max(v.creado_en)
    from public.visitas v
    where v.proyecto_comercial_id=v_project.id
    union all
    select max(e.creado_en)
    from public.crm_eventos e
    where e.proyecto_comercial_id=v_project.id
  ) activity;

  v_metrics:=jsonb_build_object(
    'consultations',v_consultations,
    'visitRequests',v_visits,
    'whatsappClicks',v_whatsapp,
    'uniqueLeads',v_leads,
    'conversions',v_conversions,
    'conversionRate',case
      when v_leads=0 then null
      else round((v_conversions::numeric/v_leads::numeric)*100,2)
    end,
    'lastActivity',v_last_activity,
    'definition','Conversiones corresponden a oportunidades reservadas o ganadas.'
  );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,
    'code',p.codigo,
    'name',p.nombre,
    'goal',p.objetivo_cliente,
    'benefits',p.beneficios,
    'modules',p.modulos,
    'price',p.precio_clp,
    'period',p.periodo
  ) order by p.orden_tpl_business,p.precio_clp),'[]'::jsonb)
  into v_plans
  from public.planes_comerciales p
  where p.estado='activo'
    and p.visible_tpl_business=true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,
    'type',s.tipo,
    'planId',s.plan_id,
    'moduleCode',s.modulo_codigo,
    'recommendation',s.recomendacion,
    'message',s.mensaje,
    'status',s.estado,
    'createdAt',s.creado_en,
    'updatedAt',s.actualizado_en
  ) order by s.creado_en desc),'[]'::jsonb)
  into v_requests
  from public.tpl_solicitudes_comerciales s
  where s.proyecto_id=v_project.id
    and (s.usuario_id=auth.uid() or p_admin_preview)
  limit 50;

  v_public_url:=case
    when v_landing.configuracion_publicada->>'publicUrl' like '/%' then
      v_landing.configuracion_publicada->>'publicUrl'
    when nullif(v_landing.slug,'') is not null then '/' || v_landing.slug
    else null
  end;

  insert into public.tpl_business_accesos(usuario_id,proyecto_id,evento,modo,metadata)
  values(
    auth.uid(),
    v_project.id,
    case when p_admin_preview then 'vista_administrativa' else 'proyecto_consultado' end,
    case when p_admin_preview then 'administrador' else 'cliente' end,
    jsonb_build_object('projectCode',v_project.codigo)
  );

  return jsonb_build_object(
    'adminPreview',p_admin_preview,
    'project',jsonb_build_object(
      'id',v_project.id,
      'code',v_project.codigo,
      'name',v_project.nombre,
      'objective',v_project.objetivo,
      'propertyCode',v_project.propiedad_codigo,
      'status',v_project.estado,
      'updatedAt',v_project.actualizado_en
    ),
    'account',jsonb_build_object(
      'id',v_account.id,
      'code',v_account.codigo,
      'name',v_account.nombre,
      'status',v_account.estado
    ),
    'landing',case
      when v_landing.id is null then null
      else jsonb_build_object(
        'id',v_landing.id,
        'code',v_landing.codigo,
        'slug',v_landing.slug,
        'status',v_landing.estado,
        'publicUrl',v_public_url,
        'publishedAt',coalesce(v_landing.publicado_actualizado_en,v_landing.publicado_en),
        'updatedAt',v_landing.actualizado_en,
        'version',v_landing.version_config
      )
    end,
    'modules',v_modules,
    'metrics',v_metrics,
    'health',jsonb_build_object(
      'score',v_experience.salud_porcentaje,
      'source',coalesce(v_experience.salud_fuente,'pendiente'),
      'summary',coalesce(v_experience.salud_resumen,'Evaluación pendiente.'),
      'strengths',coalesce(v_experience.fortalezas,'[]'::jsonb),
      'opportunities',coalesce(v_experience.oportunidades,'[]'::jsonb),
      'recommendations',coalesce(v_experience.recomendaciones,'[]'::jsonb),
      'growthStage',coalesce(v_experience.etapa_crecimiento,'comenzar')
    ),
    'plans',v_plans,
    'requests',v_requests
  );
end;
$$;

create or replace function public.tpl_business_proyecto_actual(
  p_proyecto_codigo text default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path=public,auth
as $$
declare
  v_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida' using errcode='42501';
  end if;

  if public.es_administrador_activo() then
    select p.id into v_project_id
    from public.tpl_proyectos_comerciales p
    where p_proyecto_codigo is null
       or p.codigo=left(trim(p_proyecto_codigo),120)
       or p.id::text=left(trim(p_proyecto_codigo),120)
    order by p.actualizado_en desc
    limit 1;
  else
    select p.id into v_project_id
    from public.tpl_business_membresias m
    join public.tpl_proyectos_comerciales p on p.id=m.proyecto_id
    where m.usuario_id=auth.uid()
      and m.estado='activa'
      and (
        p_proyecto_codigo is null
        or p.codigo=left(trim(p_proyecto_codigo),120)
        or p.id::text=left(trim(p_proyecto_codigo),120)
      )
    order by p.actualizado_en desc
    limit 1;
  end if;

  if v_project_id is null then
    raise exception 'No tienes acceso a este proyecto' using errcode='42501';
  end if;

  return public.tpl_business_resumen_proyecto(v_project_id,false);
end;
$$;

create or replace function public.tpl_business_vista_cliente_admin(
  p_proyecto_codigo text
) returns jsonb
language plpgsql
volatile
security definer
set search_path=public,auth
as $$
declare
  v_project_id uuid;
begin
  if auth.uid() is null or not public.es_administrador_activo() then
    raise exception 'Acceso administrativo requerido' using errcode='42501';
  end if;

  select p.id into v_project_id
  from public.tpl_proyectos_comerciales p
  where p.codigo=left(trim(p_proyecto_codigo),120)
     or p.id::text=left(trim(p_proyecto_codigo),120)
  limit 1;

  if v_project_id is null then
    raise exception 'Proyecto no encontrado' using errcode='P0002';
  end if;

  return public.tpl_business_resumen_proyecto(v_project_id,true);
end;
$$;

create or replace function public.tpl_business_registrar_solicitud(
  p_proyecto_codigo text,
  p_tipo text,
  p_plan_id uuid default null,
  p_modulo_codigo text default null,
  p_recomendacion text default null,
  p_mensaje text default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path=public,auth
as $$
declare
  v_membership public.tpl_business_membresias%rowtype;
  v_request_id uuid;
  v_existing uuid;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida' using errcode='42501';
  end if;

  if p_tipo not in ('plan','modulo','recomendacion') then
    raise exception 'Tipo de solicitud inválido' using errcode='22023';
  end if;

  select m.* into v_membership
  from public.tpl_business_membresias m
  join public.tpl_proyectos_comerciales p on p.id=m.proyecto_id
  where m.usuario_id=auth.uid()
    and m.estado='activa'
    and (p.codigo=left(trim(p_proyecto_codigo),120) or p.id::text=left(trim(p_proyecto_codigo),120))
  limit 1;

  if v_membership.id is null then
    raise exception 'No tienes acceso a este proyecto' using errcode='42501';
  end if;

  if p_tipo='plan' and not exists(
    select 1 from public.planes_comerciales p
    where p.id=p_plan_id and p.estado='activo' and p.visible_tpl_business=true
  ) then
    raise exception 'Plan no disponible' using errcode='22023';
  end if;

  if p_tipo='modulo' and not exists(
    select 1 from public.tpl_business_modulos_catalogo m
    where m.codigo=left(trim(p_modulo_codigo),80) and m.estado='activo'
  ) then
    raise exception 'Módulo no disponible' using errcode='22023';
  end if;

  if p_tipo='recomendacion' and nullif(trim(p_recomendacion),'') is null then
    raise exception 'Recomendación requerida' using errcode='22023';
  end if;

  select s.id into v_existing
  from public.tpl_solicitudes_comerciales s
  where s.usuario_id=auth.uid()
    and s.proyecto_id=v_membership.proyecto_id
    and s.tipo=p_tipo
    and coalesce(s.plan_id::text,'')=coalesce(p_plan_id::text,'')
    and coalesce(s.modulo_codigo,'')=coalesce(left(trim(p_modulo_codigo),80),'')
    and coalesce(s.recomendacion,'')=coalesce(left(trim(p_recomendacion),500),'')
    and s.estado in ('solicitada','contactando','aprobada')
  order by s.creado_en desc
  limit 1;

  if v_existing is not null then
    return jsonb_build_object('success',true,'duplicate',true,'requestId',v_existing);
  end if;

  insert into public.tpl_solicitudes_comerciales(
    usuario_id,cuenta_id,proyecto_id,plan_id,modulo_codigo,
    recomendacion,tipo,mensaje,estado
  ) values (
    auth.uid(),
    v_membership.cuenta_id,
    v_membership.proyecto_id,
    case when p_tipo='plan' then p_plan_id else null end,
    case when p_tipo='modulo' then left(trim(p_modulo_codigo),80) else null end,
    case when p_tipo='recomendacion' then left(trim(p_recomendacion),500) else null end,
    p_tipo,
    nullif(left(trim(p_mensaje),1000),''),
    'solicitada'
  )
  returning id into v_request_id;

  insert into public.tpl_business_accesos(usuario_id,proyecto_id,evento,modo,metadata)
  values(
    auth.uid(),
    v_membership.proyecto_id,
    'solicitud_creada',
    'cliente',
    jsonb_strip_nulls(jsonb_build_object(
      'requestId',v_request_id,
      'type',p_tipo,
      'moduleCode',case when p_tipo='modulo' then left(trim(p_modulo_codigo),80) end,
      'planId',case when p_tipo='plan' then p_plan_id end
    ))
  );

  return jsonb_build_object('success',true,'duplicate',false,'requestId',v_request_id);
end;
$$;

create or replace function public.tpl_business_registrar_cierre_sesion()
returns boolean
language plpgsql
volatile
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  insert into public.tpl_business_accesos(usuario_id,evento,modo)
  values(
    auth.uid(),
    'cierre_sesion',
    case when public.es_administrador_activo() then 'administrador' else 'cliente' end
  );
  return true;
end;
$$;

revoke all on function public.tpl_business_actualizar_timestamp() from public,anon,authenticated;
revoke all on function public.tpl_business_usuario_tiene_proyecto(uuid) from public,anon;
grant execute on function public.tpl_business_usuario_tiene_proyecto(uuid) to authenticated;

revoke all on function public.tpl_business_mis_proyectos() from public,anon;
grant execute on function public.tpl_business_mis_proyectos() to authenticated;
revoke all on function public.tpl_business_sesion_actual() from public,anon;
grant execute on function public.tpl_business_sesion_actual() to authenticated;

revoke all on function public.tpl_business_resumen_proyecto(uuid,boolean) from public,anon,authenticated;
revoke all on function public.tpl_business_proyecto_actual(text) from public,anon;
grant execute on function public.tpl_business_proyecto_actual(text) to authenticated;
revoke all on function public.tpl_business_vista_cliente_admin(text) from public,anon;
grant execute on function public.tpl_business_vista_cliente_admin(text) to authenticated;
revoke all on function public.tpl_business_registrar_solicitud(text,text,uuid,text,text,text) from public,anon;
grant execute on function public.tpl_business_registrar_solicitud(text,text,uuid,text,text,text) to authenticated;
revoke all on function public.tpl_business_registrar_cierre_sesion() from public,anon;
grant execute on function public.tpl_business_registrar_cierre_sesion() to authenticated;

commit;


-- Source: 202607240002_centro_control_operativo.sql
-- TPL CRM — Fase 2A.1: base estructural del Centro de Control Operativo.
-- Proyecto: qxavbqhyqaqalpzbhwmh
-- Migración ADITIVA. No fusiona proyectos técnicos y comerciales.
-- Revisar y aprobar antes de ejecutar en producción.

begin;

create extension if not exists pgcrypto;

-- 1. Plantillas versionables de flujos comerciales.
create table if not exists public.crm_flujos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  descripcion text,
  tipo_proyecto text not null,
  version integer not null default 1 check (version > 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_flujos_codigo_version_unique unique (codigo,version),
  constraint crm_flujos_tipo_check check (
    tipo_proyecto in ('visita','parcela','casa','casa_parcela','venta_propiedad')
  )
);

create table if not exists public.crm_flujo_etapas (
  id uuid primary key default gen_random_uuid(),
  flujo_id uuid not null references public.crm_flujos(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  descripcion text,
  orden integer not null check (orden > 0),
  tipo text not null default 'operativa',
  obligatoria boolean not null default true,
  configuracion jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_flujo_etapas_codigo_unique unique (flujo_id,codigo),
  constraint crm_flujo_etapas_orden_unique unique (flujo_id,orden),
  constraint crm_flujo_etapas_config_check check (jsonb_typeof(configuracion)='object')
);

-- 2. Proyecto comercial como maestro operativo.
alter table public.tpl_proyectos_comerciales
  add column if not exists publicacion_id uuid references public.publicaciones(id) on delete set null,
  add column if not exists responsable_id uuid references public.profiles(id) on delete set null,
  add column if not exists tipo_proyecto text,
  add column if not exists flujo_id uuid references public.crm_flujos(id) on delete set null,
  add column if not exists prioridad text not null default 'normal',
  add column if not exists fecha_inicio date,
  add column if not exists fecha_objetivo date,
  add column if not exists ultima_actividad_en timestamptz,
  add column if not exists proxima_accion text,
  add column if not exists proxima_accion_en timestamptz,
  add column if not exists archivado_en timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='tpl_proyectos_comerciales_tipo_proyecto_check'
  ) then
    alter table public.tpl_proyectos_comerciales
      add constraint tpl_proyectos_comerciales_tipo_proyecto_check
      check (
        tipo_proyecto is null
        or tipo_proyecto in ('visita','parcela','casa','casa_parcela','venta_propiedad')
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='tpl_proyectos_comerciales_prioridad_check'
  ) then
    alter table public.tpl_proyectos_comerciales
      add constraint tpl_proyectos_comerciales_prioridad_check
      check (prioridad in ('baja','normal','alta','critica'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='tpl_proyectos_comerciales_fechas_check'
  ) then
    alter table public.tpl_proyectos_comerciales
      add constraint tpl_proyectos_comerciales_fechas_check
      check (fecha_objetivo is null or fecha_inicio is null or fecha_objetivo >= fecha_inicio);
  end if;
end;
$$;

create index if not exists tpl_proyectos_comerciales_operacion_idx
  on public.tpl_proyectos_comerciales(estado,prioridad,proxima_accion_en);
create index if not exists tpl_proyectos_comerciales_publicacion_idx
  on public.tpl_proyectos_comerciales(publicacion_id);
create index if not exists tpl_proyectos_comerciales_responsable_idx
  on public.tpl_proyectos_comerciales(responsable_id,estado);

-- Proyecto técnico/cotización: relación opcional y no destructiva.
alter table public.proyectos
  add column if not exists proyecto_comercial_id uuid
    references public.tpl_proyectos_comerciales(id) on delete set null;

create index if not exists proyectos_proyecto_comercial_idx
  on public.proyectos(proyecto_comercial_id,estado,actualizado_en desc);

-- 3. Contactos comerciales de una cuenta. No sustituye membresías Auth.
create table if not exists public.tpl_cuenta_contactos (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.tpl_business_cuentas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  rol text not null default 'contacto',
  es_principal boolean not null default false,
  estado text not null default 'activo',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint tpl_cuenta_contactos_unique unique(cuenta_id,cliente_id,rol),
  constraint tpl_cuenta_contactos_rol_check check (
    rol in ('propietario','corredor','contacto','representante','colaborador')
  ),
  constraint tpl_cuenta_contactos_estado_check check (
    estado in ('activo','inactivo','archivado')
  )
);

create unique index if not exists tpl_cuenta_contactos_principal_unique
  on public.tpl_cuenta_contactos(cuenta_id)
  where es_principal and estado='activo';

-- 4. Instancias de etapas por proyecto.
create table if not exists public.crm_proyecto_etapas (
  id uuid primary key default gen_random_uuid(),
  proyecto_comercial_id uuid not null
    references public.tpl_proyectos_comerciales(id) on delete cascade,
  flujo_etapa_id uuid not null references public.crm_flujo_etapas(id) on delete restrict,
  estado text not null default 'no_iniciada',
  responsable_id uuid references public.profiles(id) on delete set null,
  inicio_previsto timestamptz,
  vence_en timestamptz,
  iniciada_en timestamptz,
  completada_en timestamptz,
  observaciones text,
  metadata jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_proyecto_etapas_unique unique(proyecto_comercial_id,flujo_etapa_id),
  constraint crm_proyecto_etapas_estado_check check (
    estado in (
      'no_iniciada','en_proceso','esperando_cliente','esperando_tercero',
      'completada','bloqueada','cancelada'
    )
  ),
  constraint crm_proyecto_etapas_metadata_check check (jsonb_typeof(metadata)='object'),
  constraint crm_proyecto_etapas_fechas_check check (
    completada_en is null or iniciada_en is null or completada_en >= iniciada_en
  )
);

create index if not exists crm_proyecto_etapas_operacion_idx
  on public.crm_proyecto_etapas(proyecto_comercial_id,estado,vence_en);

-- 5. Actividad humana; crm_eventos continúa reservado para telemetría sin PII.
create table if not exists public.crm_actividades (
  id uuid primary key default gen_random_uuid(),
  proyecto_comercial_id uuid not null
    references public.tpl_proyectos_comerciales(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  oportunidad_id uuid references public.crm_oportunidades(id) on delete set null,
  etapa_id uuid references public.crm_proyecto_etapas(id) on delete set null,
  tipo text not null,
  canal text,
  resumen text not null,
  notas_internas text,
  responsable_id uuid references public.profiles(id) on delete set null,
  visibilidad text not null default 'interna',
  origen text not null default 'crm',
  realizada_en timestamptz not null default now(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_actividades_tipo_check check (
    tipo in (
      'llamada','whatsapp','correo','reunion','visita','nota',
      'cambio_estado','seguimiento','sistema'
    )
  ),
  constraint crm_actividades_visibilidad_check check (
    visibilidad in ('interna','cliente')
  )
);

create index if not exists crm_actividades_proyecto_fecha_idx
  on public.crm_actividades(proyecto_comercial_id,realizada_en desc);
create index if not exists crm_actividades_cliente_fecha_idx
  on public.crm_actividades(cliente_id,realizada_en desc);

-- 6. Próximas acciones por proyecto/etapa.
alter table public.crm_tareas
  add column if not exists responsable_id uuid references public.profiles(id) on delete set null,
  add column if not exists proyecto_etapa_id uuid references public.crm_proyecto_etapas(id) on delete set null,
  add column if not exists accion_url text,
  add column if not exists categoria text,
  add column if not exists bloqueante boolean not null default false,
  add column if not exists actualizado_en timestamptz not null default now();

create index if not exists crm_tareas_centro_control_idx
  on public.crm_tareas(estado,prioridad,vence_en,responsable_id);
create index if not exists crm_tareas_proyecto_comercial_idx
  on public.crm_tareas(proyecto_comercial_id,estado,vence_en);

-- 7. Bitácora operativa.
create table if not exists public.crm_centro_control_bitacora (
  id bigint generated always as identity primary key,
  proyecto_comercial_id uuid not null
    references public.tpl_proyectos_comerciales(id) on delete cascade,
  entidad text not null,
  entidad_id text,
  accion text not null,
  valor_anterior jsonb not null default '{}'::jsonb,
  valor_nuevo jsonb not null default '{}'::jsonb,
  usuario_id uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  constraint crm_centro_control_bitacora_json_check check (
    jsonb_typeof(valor_anterior)='object' and jsonb_typeof(valor_nuevo)='object'
  )
);

create index if not exists crm_centro_control_bitacora_proyecto_idx
  on public.crm_centro_control_bitacora(proyecto_comercial_id,creado_en desc);

-- 8. Timestamp común.
create or replace function public.crm_centro_control_actualizar_timestamp()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
begin
  new.actualizado_en=now();
  return new;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'crm_flujos','crm_flujo_etapas','tpl_cuenta_contactos',
    'crm_proyecto_etapas','crm_actividades','crm_tareas'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'tr_'||v_table||'_centro_control_timestamp',v_table
    );
    execute format(
      'create trigger %I before update on public.%I
       for each row execute function public.crm_centro_control_actualizar_timestamp()',
      'tr_'||v_table||'_centro_control_timestamp',v_table
    );
  end loop;
end;
$$;

-- Bitácora de cambios relevantes del proyecto maestro.
create or replace function public.crm_centro_control_auditar_proyecto()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
begin
  if old.estado is distinct from new.estado
     or old.responsable_id is distinct from new.responsable_id
     or old.flujo_id is distinct from new.flujo_id
     or old.prioridad is distinct from new.prioridad
     or old.archivado_en is distinct from new.archivado_en then
    insert into public.crm_centro_control_bitacora(
      proyecto_comercial_id,entidad,entidad_id,accion,
      valor_anterior,valor_nuevo,usuario_id
    ) values (
      new.id,'proyecto_comercial',new.id::text,'actualizar',
      jsonb_build_object(
        'estado',v_old->'estado','responsable_id',v_old->'responsable_id',
        'flujo_id',v_old->'flujo_id','prioridad',v_old->'prioridad',
        'archivado_en',v_old->'archivado_en'
      ),
      jsonb_build_object(
        'estado',v_new->'estado','responsable_id',v_new->'responsable_id',
        'flujo_id',v_new->'flujo_id','prioridad',v_new->'prioridad',
        'archivado_en',v_new->'archivado_en'
      ),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tr_tpl_proyectos_comerciales_centro_control_audit
  on public.tpl_proyectos_comerciales;
create trigger tr_tpl_proyectos_comerciales_centro_control_audit
after update on public.tpl_proyectos_comerciales
for each row execute function public.crm_centro_control_auditar_proyecto();

create or replace function public.crm_centro_control_auditar_etapa()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,auth
as $$
begin
  if old.estado is distinct from new.estado
     or old.responsable_id is distinct from new.responsable_id then
    insert into public.crm_centro_control_bitacora(
      proyecto_comercial_id,entidad,entidad_id,accion,
      valor_anterior,valor_nuevo,usuario_id
    ) values (
      new.proyecto_comercial_id,'proyecto_etapa',new.id::text,'actualizar',
      jsonb_build_object(
        'estado',old.estado,
        'responsable_id',old.responsable_id,
        'vence_en',old.vence_en
      ),
      jsonb_build_object(
        'estado',new.estado,
        'responsable_id',new.responsable_id,
        'vence_en',new.vence_en
      ),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tr_crm_proyecto_etapas_centro_control_audit
  on public.crm_proyecto_etapas;
create trigger tr_crm_proyecto_etapas_centro_control_audit
after update on public.crm_proyecto_etapas
for each row execute function public.crm_centro_control_auditar_etapa();

-- Sincroniza actividad/próxima acción sin reemplazar crm_tareas.
create or replace function public.crm_centro_control_sincronizar_proyecto()
returns trigger
language plpgsql
set search_path=pg_catalog,public,auth
as $$
begin
  update public.tpl_proyectos_comerciales
  set ultima_actividad_en=greatest(
        coalesce(ultima_actividad_en,'-infinity'::timestamptz),
        coalesce(new.realizada_en,now())
      ),
      actualizado_en=now()
  where id=new.proyecto_comercial_id;
  return new;
end;
$$;

drop trigger if exists tr_crm_actividades_sincronizar_proyecto on public.crm_actividades;
create trigger tr_crm_actividades_sincronizar_proyecto
after insert or update on public.crm_actividades
for each row execute function public.crm_centro_control_sincronizar_proyecto();

-- 9. Seguridad.
alter table public.crm_flujos enable row level security;
alter table public.crm_flujo_etapas enable row level security;
alter table public.tpl_cuenta_contactos enable row level security;
alter table public.crm_proyecto_etapas enable row level security;
alter table public.crm_actividades enable row level security;
alter table public.crm_centro_control_bitacora enable row level security;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'crm_flujos','crm_flujo_etapas','tpl_cuenta_contactos',
    'crm_proyecto_etapas','crm_actividades','crm_centro_control_bitacora'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      'Centro control admin '||v_table,v_table
    );
    execute format(
      'create policy %I on public.%I
       for all to authenticated
       using (public.es_administrador_activo())
       with check (public.es_administrador_activo())',
      'Centro control admin '||v_table,v_table
    );
  end loop;
end;
$$;

-- El propietario no recibe SELECT directo sobre tablas operativas.
-- RLS filtra filas, no columnas; las RPC seguras creadas más abajo excluyen
-- observaciones, metadata y notas internas.
drop policy if exists "TPL Business lee etapas autorizadas" on public.crm_proyecto_etapas;
drop policy if exists "TPL Business lee flujos autorizados" on public.crm_flujos;
drop policy if exists "TPL Business lee definiciones de etapas autorizadas"
  on public.crm_flujo_etapas;
drop policy if exists "TPL Business lee actividades visibles" on public.crm_actividades;

revoke all on public.crm_flujos,public.crm_flujo_etapas,
  public.tpl_cuenta_contactos,public.crm_proyecto_etapas,
  public.crm_actividades,public.crm_centro_control_bitacora
from anon;

grant select,insert,update,delete on public.crm_flujos,public.crm_flujo_etapas,
  public.tpl_cuenta_contactos,public.crm_proyecto_etapas,
  public.crm_actividades
to authenticated;
grant select on public.crm_centro_control_bitacora to authenticated;
grant usage,select on sequence public.crm_centro_control_bitacora_id_seq to authenticated;

-- 10. Plantillas configurables.
insert into public.crm_flujos(codigo,nombre,descripcion,tipo_proyecto,version,activo)
values
  ('cliente_visita','Cliente visita','Seguimiento desde consulta hasta resultado de visita.','visita',1,true),
  ('proyecto_parcela','Proyecto parcela','Búsqueda, visita, negociación y compra de parcela.','parcela',1,true),
  ('proyecto_casa','Proyecto casa','Diseño, cotización, contrato, construcción y entrega.','casa',1,true),
  ('proyecto_casa_parcela','Proyecto casa + parcela','Proceso integral de parcela y vivienda.','casa_parcela',1,true),
  ('venta_propiedad','Venta de propiedad','Publicación, captación y cierre de una propiedad.','venta_propiedad',1,true)
on conflict(codigo,version) do update set
  nombre=excluded.nombre,
  descripcion=excluded.descripcion,
  tipo_proyecto=excluded.tipo_proyecto,
  activo=excluded.activo,
  actualizado_en=now();

with stage_data(flow_code,stage_code,stage_name,stage_order) as (
  values
    ('cliente_visita','consulta','Consulta',1),
    ('cliente_visita','contactado','Contactado',2),
    ('cliente_visita','visita_solicitada','Visita solicitada',3),
    ('cliente_visita','visita_confirmada','Visita confirmada',4),
    ('cliente_visita','visita_realizada','Visita realizada',5),
    ('cliente_visita','resultado','Interesado o descartado',6),
    ('proyecto_parcela','cliente','Cliente',1),
    ('proyecto_parcela','necesidad','Necesidad identificada',2),
    ('proyecto_parcela','alternativas','Alternativas enviadas',3),
    ('proyecto_parcela','parcela','Parcela seleccionada',4),
    ('proyecto_parcela','visita','Visita',5),
    ('proyecto_parcela','negociacion','Negociación',6),
    ('proyecto_parcela','reserva','Reserva',7),
    ('proyecto_parcela','compra','Compra',8),
    ('proyecto_casa','cliente','Cliente',1),
    ('proyecto_casa','requerimientos','Requerimientos',2),
    ('proyecto_casa','modelo_diseno','Modelo o diseño',3),
    ('proyecto_casa','cotizacion','Cotización',4),
    ('proyecto_casa','ajustes','Ajustes',5),
    ('proyecto_casa','aprobacion','Aprobación',6),
    ('proyecto_casa','contrato','Contrato',7),
    ('proyecto_casa','construccion','Construcción',8),
    ('proyecto_casa','entrega','Entrega',9),
    ('proyecto_casa_parcela','cliente','Cliente',1),
    ('proyecto_casa_parcela','presupuesto','Presupuesto',2),
    ('proyecto_casa_parcela','busqueda_parcela','Búsqueda de parcela',3),
    ('proyecto_casa_parcela','parcela','Parcela seleccionada',4),
    ('proyecto_casa_parcela','casa','Casa seleccionada',5),
    ('proyecto_casa_parcela','cotizacion_integral','Cotización integral',6),
    ('proyecto_casa_parcela','visitas_validaciones','Visitas y validaciones',7),
    ('proyecto_casa_parcela','reserva','Reserva',8),
    ('proyecto_casa_parcela','contratos','Contratos',9),
    ('proyecto_casa_parcela','construccion','Construcción',10),
    ('proyecto_casa_parcela','entrega','Entrega',11),
    ('venta_propiedad','publicacion','Publicación',1),
    ('venta_propiedad','landing','Landing',2),
    ('venta_propiedad','captacion','Captación',3),
    ('venta_propiedad','contacto','Contacto',4),
    ('venta_propiedad','visita','Visita',5),
    ('venta_propiedad','negociacion','Negociación',6),
    ('venta_propiedad','reserva','Reserva',7),
    ('venta_propiedad','venta','Venta',8)
)
insert into public.crm_flujo_etapas(
  flujo_id,codigo,nombre,orden,tipo,obligatoria,configuracion,activo
)
select f.id,s.stage_code,s.stage_name,s.stage_order,'operativa',true,'{}'::jsonb,true
from stage_data s
join public.crm_flujos f on f.codigo=s.flow_code and f.version=1
on conflict(flujo_id,codigo) do update set
  nombre=excluded.nombre,
  orden=excluded.orden,
  activo=true,
  actualizado_en=now();

-- 11. Caburgua: relación y etapas basadas solo en evidencia existente.
with caburgua_publicacion as (
  select candidate.id
  from (
    select p.id,p.estado,p.actualizado_en,0 as source_priority
    from public.tpl_landings_comerciales l
    join public.publicaciones p on p.id=l.publicacion_id
    where l.codigo='land-caburgua'
    union all
    select p.id,p.estado,p.actualizado_en,1 as source_priority
    from public.publicaciones p
    where p.datos_formulario->>'old_id'='caburgua'
    union all
    select p.id,p.estado,p.actualizado_en,2 as source_priority
    from public.publicaciones p
    where lower(coalesce(p.codigo_publico,''))='caburgua'
  ) candidate
  order by
    candidate.source_priority,
    case when candidate.estado='aprobada' then 0 else 1 end,
    candidate.actualizado_en desc
  limit 1
), caburgua_flow as (
  select id from public.crm_flujos
  where codigo='venta_propiedad' and version=1
)
update public.tpl_proyectos_comerciales pc
set
  publicacion_id=coalesce(pc.publicacion_id,(select id from caburgua_publicacion)),
  tipo_proyecto=coalesce(pc.tipo_proyecto,'venta_propiedad'),
  flujo_id=coalesce(pc.flujo_id,(select id from caburgua_flow)),
  fecha_inicio=coalesce(pc.fecha_inicio,pc.creado_en::date),
  actualizado_en=now()
where pc.codigo='pro-caburgua';

insert into public.crm_proyecto_etapas(
  proyecto_comercial_id,flujo_etapa_id,estado,iniciada_en,completada_en,metadata
)
select
  pc.id,
  fe.id,
  case
    when fe.codigo='publicacion' and pc.publicacion_id is not null
      and exists (
        select 1 from public.publicaciones p
        where p.id=pc.publicacion_id and p.estado='aprobada'
      ) then 'completada'
    when fe.codigo='landing' and exists (
      select 1 from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id and l.estado='publicada'
    ) then 'completada'
    when fe.codigo='captacion' and exists (
      select 1 from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id and l.estado='publicada'
    ) then 'en_proceso'
    when fe.codigo='contacto' and exists (
      select 1 from public.crm_oportunidades o
      where o.proyecto_comercial_id=pc.id
        and o.etapa in (
          'contactado','calificado','solicito_visita','visita_confirmada',
          'visita_realizada','negociando','reservado','ganado'
        )
    ) then 'completada'
    when fe.codigo='visita' and exists (
      select 1 from public.visitas v
      where v.proyecto_comercial_id=pc.id
        and v.estado in ('realizada','completada')
    ) then 'completada'
    when fe.codigo='visita' and exists (
      select 1 from public.visitas v
      where v.proyecto_comercial_id=pc.id
        and v.estado in ('solicitada','confirmada')
    ) then 'en_proceso'
    when fe.codigo='negociacion' and exists (
      select 1 from public.crm_oportunidades o
      where o.proyecto_comercial_id=pc.id
        and o.etapa in ('negociando','reservado','ganado')
    ) then 'en_proceso'
    when fe.codigo='reserva' and exists (
      select 1
      from public.reservas r
      where r.publicacion_id=pc.publicacion_id
        and r.estado not in ('rechazada','cancelada')
    ) then 'en_proceso'
    when fe.codigo='venta' and exists (
      select 1 from public.crm_oportunidades o
      where o.proyecto_comercial_id=pc.id
        and (o.estado='ganada' or o.etapa='ganado')
    ) then 'completada'
    else 'no_iniciada'
  end,
  case
    when fe.codigo='publicacion' and pc.publicacion_id is not null
      and exists (
        select 1 from public.publicaciones p
        where p.id=pc.publicacion_id and p.estado='aprobada'
      ) then least(
        pc.creado_en,
        (
          select coalesce(p.publicada_en,p.actualizado_en)
          from public.publicaciones p
          where p.id=pc.publicacion_id
        )
      )
    when fe.codigo='landing' and exists (
      select 1 from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id and l.estado='publicada'
    ) then least(
      pc.creado_en,
      (
        select coalesce(l.publicado_actualizado_en,l.publicado_en,l.actualizado_en)
        from public.tpl_landings_comerciales l
        where l.proyecto_comercial_id=pc.id and l.estado='publicada'
        order by l.actualizado_en desc limit 1
      )
    )
    when fe.codigo='captacion' and exists (
      select 1 from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id and l.estado='publicada'
    ) then coalesce(pc.ultima_actividad_en,pc.creado_en)
    else null
  end,
  case
    when fe.codigo='publicacion' and pc.publicacion_id is not null
      and exists (select 1 from public.publicaciones p where p.id=pc.publicacion_id and p.estado='aprobada')
      then (select coalesce(p.publicada_en,p.actualizado_en) from public.publicaciones p where p.id=pc.publicacion_id)
    when fe.codigo='landing' then (
      select coalesce(l.publicado_actualizado_en,l.publicado_en,l.actualizado_en)
      from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id and l.estado='publicada'
      order by l.actualizado_en desc limit 1
    )
    else null
  end,
  jsonb_build_object('backfill','202607240002','evidence_based',true)
from public.tpl_proyectos_comerciales pc
join public.crm_flujos f on f.id=pc.flujo_id and f.codigo='venta_propiedad'
join public.crm_flujo_etapas fe on fe.flujo_id=f.id
where pc.codigo='pro-caburgua'
on conflict(proyecto_comercial_id,flujo_etapa_id) do nothing;

-- 12. Contratos de lectura administrativos.
create or replace function public.crm_centro_control_progreso(p_proyecto_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result integer;
begin
  if not public.es_administrador_activo()
     and not exists (
       select 1
       from public.tpl_business_membresias m
       where m.usuario_id=auth.uid()
         and m.proyecto_id=p_proyecto_id
         and m.estado='activa'
     ) then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;

  select case
    when count(*) filter(where fe.obligatoria and pe.estado<>'cancelada')=0 then null
    else round(
      100.0 * count(*) filter(where fe.obligatoria and pe.estado='completada')
      / count(*) filter(where fe.obligatoria and pe.estado<>'cancelada')
    )::integer
  end into v_result
  from public.crm_proyecto_etapas pe
  join public.crm_flujo_etapas fe on fe.id=pe.flujo_etapa_id
  where pe.proyecto_comercial_id=p_proyecto_id;

  return v_result;
end;
$$;

revoke all on function public.crm_centro_control_progreso(uuid) from public,anon;
grant execute on function public.crm_centro_control_progreso(uuid) to authenticated;

create or replace function public.tpl_business_etapas_proyecto(p_proyecto_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo()
     and not exists (
       select 1 from public.tpl_business_membresias m
       where m.usuario_id=auth.uid()
         and m.proyecto_id=p_proyecto_id
         and m.estado='activa'
     ) then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',pe.id,
    'code',fe.codigo,
    'name',fe.nombre,
    'description',fe.descripcion,
    'order',fe.orden,
    'required',fe.obligatoria,
    'status',pe.estado,
    'plannedStart',pe.inicio_previsto,
    'dueAt',pe.vence_en,
    'startedAt',pe.iniciada_en,
    'completedAt',pe.completada_en
  ) order by fe.orden),'[]'::jsonb)
  into v_result
  from public.crm_proyecto_etapas pe
  join public.crm_flujo_etapas fe on fe.id=pe.flujo_etapa_id
  where pe.proyecto_comercial_id=p_proyecto_id;

  return v_result;
end;
$$;

create or replace function public.tpl_business_actividades_proyecto(
  p_proyecto_id uuid,
  p_limite integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo()
     and not exists (
       select 1 from public.tpl_business_membresias m
       where m.usuario_id=auth.uid()
         and m.proyecto_id=p_proyecto_id
         and m.estado='activa'
     ) then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;

  select jsonb_build_object(
    'items',coalesce(jsonb_agg(jsonb_build_object(
      'id',a.id,
      'type',a.tipo,
      'channel',a.canal,
      'summary',a.resumen,
      'source',a.origen,
      'occurredAt',a.realizada_en
    ) order by a.realizada_en desc),'[]'::jsonb),
    'limit',least(greatest(p_limite,1),100),
    'offset',greatest(p_offset,0)
  ) into v_result
  from (
    select id,tipo,canal,resumen,origen,realizada_en
    from public.crm_actividades
    where proyecto_comercial_id=p_proyecto_id
      and (
        public.es_administrador_activo()
        or visibilidad='cliente'
      )
    order by realizada_en desc
    limit least(greatest(p_limite,1),100)
    offset greatest(p_offset,0)
  ) a;

  return v_result;
end;
$$;

revoke all on function public.tpl_business_etapas_proyecto(uuid) from public,anon;
revoke all on function public.tpl_business_actividades_proyecto(uuid,integer,integer)
  from public,anon;
grant execute on function public.tpl_business_etapas_proyecto(uuid) to authenticated;
grant execute on function public.tpl_business_actividades_proyecto(uuid,integer,integer)
  to authenticated;

create or replace function public.crm_centro_control_resumen()
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo() then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;

  select jsonb_build_object(
    'metrics',jsonb_build_object(
      'activeClients',(select count(*) from public.clientes c where coalesce(c.estado,'nuevo') not in ('archivado','inactivo')),
      'newInquiries',(select count(*) from public.crm_interacciones_landing i where i.tipo='informacion_solicitada' and i.creado_en>=now()-interval '7 days'),
      'pendingVisits',(select count(*) from public.visitas v where v.estado in ('solicitada','confirmada')),
      'activeCommercialProjects',(select count(*) from public.tpl_proyectos_comerciales p where p.estado in ('preparacion','activo') and p.archivado_en is null),
      'publishedProperties',(select count(*) from public.publicaciones p where p.estado='aprobada'),
      'selectedHouses',(select count(*) from public.proyectos p where p.casa_id is not null and p.estado not in ('cancelado','archivado')),
      'pendingQuotations',(select count(*) from public.proyectos p where p.estado in ('cotizacion_enviada','pendiente','borrador')),
      'pendingBusinessRequests',(select count(*) from public.tpl_solicitudes_comerciales s where s.estado in ('solicitada','contactando')),
      'reservations',(select count(*) from public.reservas r where r.estado not in ('rechazada','cancelada')),
      'sales',(select count(*) from public.crm_oportunidades o where o.estado='ganada'),
      'overdueTasks',(select count(*) from public.crm_tareas t where t.estado='pendiente' and t.vence_en<now())
    ),
    'alerts',coalesce((
      select jsonb_agg(a order by a->>'priority',a->>'createdAt')
      from (
        select jsonb_build_object(
          'code','tarea_vencida','title',t.titulo,'priority',t.prioridad,
          'projectId',t.proyecto_comercial_id,'clientId',t.cliente_id,
          'responsibleId',t.responsable_id,'actionUrl',t.accion_url,
          'createdAt',t.creado_en
        ) a
        from public.crm_tareas t
        where t.estado='pendiente' and t.vence_en<now()
        order by t.vence_en
        limit 50
      ) q
    ),'[]'::jsonb),
    'recentActivity',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'type',a.tipo,'summary',a.resumen,
        'projectId',a.proyecto_comercial_id,'clientId',a.cliente_id,
        'occurredAt',a.realizada_en
      ) order by a.realizada_en desc)
      from (
        select * from public.crm_actividades
        order by realizada_en desc limit 30
      ) a
    ),'[]'::jsonb),
    'mapPoints',coalesce(public.crm_mapa_proyectos(),'[]'::jsonb),
    'quickActions',jsonb_build_array(
      jsonb_build_object('code','crear_cliente','label','Crear cliente','target','view-clientes-prioritarios'),
      jsonb_build_object('code','crear_proyecto','label','Crear proyecto','target','view-business-projects'),
      jsonb_build_object('code','revisar_publicaciones','label','Revisar publicaciones','target','view-parcelas'),
      jsonb_build_object('code','ver_solicitudes','label','Ver solicitudes','target','view-business-requests')
    )
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.crm_mapa_proyectos()
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo() then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'projectId',pc.id,'projectCode',pc.codigo,'projectName',pc.nombre,
    'propertyId',p.id,'propertyCode',p.codigo_publico,
    'latitude',p.latitud_publica,'longitude',p.longitud_publica,
    'precision',p.precision_ubicacion,'status',pc.estado,
    'priority',pc.prioridad,'nextAction',pc.proxima_accion,
    'directionsUrl',case
      when p.latitud_publica is not null and p.longitud_publica is not null
      then 'https://www.google.com/maps/dir/?api=1&destination='
        || p.latitud_publica::text || ',' || p.longitud_publica::text
      else null end
  ) order by pc.prioridad desc,pc.actualizado_en desc),'[]'::jsonb)
  into v_result
  from public.tpl_proyectos_comerciales pc
  join public.publicaciones p on p.id=pc.publicacion_id
  where pc.archivado_en is null
    and p.latitud_publica is not null
    and p.longitud_publica is not null
    and p.consentimiento_uso_ubicacion;
  return v_result;
end;
$$;

create or replace function public.crm_centro_control_estados(
  p_limite integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo() then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;
  select jsonb_build_object(
    'items',coalesce(jsonb_agg(row_data order by row_data->>'updatedAt' desc),'[]'::jsonb),
    'limit',least(greatest(p_limite,1),100),
    'offset',greatest(p_offset,0)
  ) into v_result
  from (
    select jsonb_build_object(
      'project',jsonb_build_object('id',pc.id,'code',pc.codigo,'name',pc.nombre,'status',pc.estado),
      'projectType',pc.tipo_proyecto,
      'clients',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',c.id,'name',trim(concat_ws(' ',c.nombre,c.apellido)),
          'opportunityStage',o.etapa,'opportunityStatus',o.estado
        ))
        from public.crm_oportunidades o
        join public.clientes c on c.id=o.cliente_id
        where o.proyecto_comercial_id=pc.id
      ),'[]'::jsonb),
      'currentStage',(
        select jsonb_build_object('id',pe.id,'code',fe.codigo,'name',fe.nombre,'status',pe.estado)
        from public.crm_proyecto_etapas pe
        join public.crm_flujo_etapas fe on fe.id=pe.flujo_etapa_id
        where pe.proyecto_comercial_id=pc.id
          and pe.estado not in ('completada','cancelada')
        order by fe.orden limit 1
      ),
      'progress',public.crm_centro_control_progreso(pc.id),
      'priority',pc.prioridad,
      'responsible',case when pr.id is null then null else jsonb_build_object('id',pr.id,'name',pr.nombre) end,
      'nextAction',(
        select jsonb_build_object(
          'id',t.id,'title',t.titulo,'dueAt',t.vence_en,
          'priority',t.prioridad,'actionUrl',t.accion_url
        )
        from public.crm_tareas t
        where t.proyecto_comercial_id=pc.id and t.estado='pendiente'
        order by t.bloqueante desc,t.vence_en nulls last limit 1
      ),
      'lastActivity',coalesce(
        pc.ultima_actividad_en,
        (select max(a.realizada_en) from public.crm_actividades a where a.proyecto_comercial_id=pc.id),
        pc.actualizado_en
      ),
      'alerts',coalesce((
        select jsonb_agg(jsonb_build_object(
          'code','tarea_vencida','title',t.titulo,'priority',t.prioridad
        ))
        from public.crm_tareas t
        where t.proyecto_comercial_id=pc.id
          and t.estado='pendiente' and t.vence_en<now()
      ),'[]'::jsonb),
      'updatedAt',pc.actualizado_en
    ) row_data
    from public.tpl_proyectos_comerciales pc
    left join public.profiles pr on pr.id=pc.responsable_id
    where pc.archivado_en is null
    order by pc.actualizado_en desc
    limit least(greatest(p_limite,1),100)
    offset greatest(p_offset,0)
  ) rows;
  return v_result;
end;
$$;

create or replace function public.crm_cliente_operativo(p_cliente_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo() then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;
  select jsonb_build_object(
    'client',to_jsonb(c)-'score_detalle',
    'accounts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',cu.id,'code',cu.codigo,'name',cu.nombre,'role',cc.rol,'isPrimary',cc.es_principal
      ))
      from public.tpl_cuenta_contactos cc
      join public.tpl_business_cuentas cu on cu.id=cc.cuenta_id
      where cc.cliente_id=c.id and cc.estado='activo'
    ),'[]'::jsonb),
    'projects',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',pc.id,'code',pc.codigo,'name',pc.nombre,'status',pc.estado,
        'stage',o.etapa,'progress',public.crm_centro_control_progreso(pc.id)
      ) order by pc.actualizado_en desc)
      from public.crm_oportunidades o
      join public.tpl_proyectos_comerciales pc on pc.id=o.proyecto_comercial_id
      where o.cliente_id=c.id
    ),'[]'::jsonb),
    'activities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'type',a.tipo,'channel',a.canal,'summary',a.resumen,'occurredAt',a.realizada_en
      ) order by a.realizada_en desc)
      from (select * from public.crm_actividades where cliente_id=c.id order by realizada_en desc limit 50) a
    ),'[]'::jsonb)
  ) into v_result
  from public.clientes c where c.id=p_cliente_id;
  return v_result;
end;
$$;

create or replace function public.crm_proyecto_operativo(p_proyecto_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo() then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;
  select jsonb_build_object(
    'project',to_jsonb(pc),
    'account',to_jsonb(cu),
    'property',case when pub.id is null then null else to_jsonb(pub)-'datos_formulario'-'descripcion_origen_privada'-'latitud_privada'-'longitud_privada' end,
    'workflow',case when f.id is null then null else to_jsonb(f) end,
    'stages',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',pe.id,'code',fe.codigo,'name',fe.nombre,'order',fe.orden,
        'required',fe.obligatoria,'status',pe.estado,'dueAt',pe.vence_en,
        'completedAt',pe.completada_en
      ) order by fe.orden)
      from public.crm_proyecto_etapas pe
      join public.crm_flujo_etapas fe on fe.id=pe.flujo_etapa_id
      where pe.proyecto_comercial_id=pc.id
    ),'[]'::jsonb),
    'progress',public.crm_centro_control_progreso(pc.id),
    'opportunities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',o.id,'clientId',o.cliente_id,'stage',o.etapa,'status',o.estado,
        'lastInteractionAt',o.ultima_interaccion_en
      ))
      from public.crm_oportunidades o where o.proyecto_comercial_id=pc.id
    ),'[]'::jsonb),
    'activities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'type',a.tipo,'channel',a.canal,'summary',a.resumen,
        'visibility',a.visibilidad,'occurredAt',a.realizada_en
      ) order by a.realizada_en desc)
      from (select * from public.crm_actividades where proyecto_comercial_id=pc.id order by realizada_en desc limit 100) a
    ),'[]'::jsonb),
    'nextAction',(
      select jsonb_build_object(
        'id',t.id,'title',t.titulo,'dueAt',t.vence_en,'priority',t.prioridad,
        'actionUrl',t.accion_url,'blocking',t.bloqueante
      )
      from public.crm_tareas t
      where t.proyecto_comercial_id=pc.id and t.estado='pendiente'
      order by t.bloqueante desc,t.vence_en nulls last limit 1
    ),
    'visits',coalesce((
      select jsonb_agg(to_jsonb(v) order by v.fecha_solicitada desc)
      from public.visitas v where v.proyecto_comercial_id=pc.id
    ),'[]'::jsonb),
    'technicalProjects',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'number',p.numero_proyecto,'status',p.estado,'total',p.total,
        'houseId',p.casa_id,'propertyId',p.parcela_id
      ) order by p.actualizado_en desc)
      from public.proyectos p where p.proyecto_comercial_id=pc.id
    ),'[]'::jsonb),
    'landing',(
      select jsonb_build_object(
        'id',l.id,'code',l.codigo,'slug',l.slug,'status',l.estado,
        'publishedAt',l.publicado_en,'updatedAt',l.actualizado_en
      )
      from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id
      order by l.actualizado_en desc limit 1
    ),
    'history',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',b.id,'entity',b.entidad,'action',b.accion,
        'before',b.valor_anterior,'after',b.valor_nuevo,'createdAt',b.creado_en
      ) order by b.creado_en desc)
      from (select * from public.crm_centro_control_bitacora where proyecto_comercial_id=pc.id order by creado_en desc limit 100) b
    ),'[]'::jsonb)
  ) into v_result
  from public.tpl_proyectos_comerciales pc
  join public.tpl_business_cuentas cu on cu.id=pc.cuenta_id
  left join public.publicaciones pub on pub.id=pc.publicacion_id
  left join public.crm_flujos f on f.id=pc.flujo_id
  where pc.id=p_proyecto_id;
  return v_result;
end;
$$;

revoke all on function public.crm_centro_control_resumen() from public,anon;
revoke all on function public.crm_mapa_proyectos() from public,anon;
revoke all on function public.crm_centro_control_estados(integer,integer) from public,anon;
revoke all on function public.crm_cliente_operativo(uuid) from public,anon;
revoke all on function public.crm_proyecto_operativo(uuid) from public,anon;

grant execute on function public.crm_centro_control_resumen() to authenticated;
grant execute on function public.crm_mapa_proyectos() to authenticated;
grant execute on function public.crm_centro_control_estados(integer,integer) to authenticated;
grant execute on function public.crm_cliente_operativo(uuid) to authenticated;
grant execute on function public.crm_proyecto_operativo(uuid) to authenticated;

comment on table public.crm_flujos is
  'Plantillas versionables para el avance operativo de proyectos comerciales.';
comment on table public.crm_proyecto_etapas is
  'Instancias de etapas; el progreso se calcula solo con etapas obligatorias.';
comment on table public.crm_actividades is
  'Actividad humana del CRM. crm_eventos continúa reservado para telemetría sin PII.';
comment on column public.proyectos.proyecto_comercial_id is
  'Relaciona opcionalmente una cotización/proyecto técnico con su proyecto comercial maestro.';

commit;


