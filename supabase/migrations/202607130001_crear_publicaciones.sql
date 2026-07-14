create type public.publicacion_estado as enum (
  'borrador',
  'pendiente_revision',
  'aprobada',
  'rechazada',
  'pausada'
);

create type public.publicador_tipo as enum ('dueno', 'corredor');

create table public.publicaciones (
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

create table public.publicacion_borradores (
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

create table public.publicacion_fotos (
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

create table public.moderacion_registros (
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
