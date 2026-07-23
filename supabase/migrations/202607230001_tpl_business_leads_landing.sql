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
