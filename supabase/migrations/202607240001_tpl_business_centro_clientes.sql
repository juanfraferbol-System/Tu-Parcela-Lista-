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
