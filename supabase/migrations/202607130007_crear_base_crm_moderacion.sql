create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
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

create table public.publicacion_versiones (
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

create table public.publicacion_correccion_accesos (
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

create table public.notificacion_cola (
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
