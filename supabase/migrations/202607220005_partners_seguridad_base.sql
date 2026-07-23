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
