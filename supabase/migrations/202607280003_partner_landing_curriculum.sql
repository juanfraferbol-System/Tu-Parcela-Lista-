-- Partner TPL Etapa 3: landing básica, currículum y control desde TPL Business
begin;

alter table public.contratistas
  add column if not exists curriculum_publicado boolean not null default true,
  add column if not exists perfil_publicado_en timestamptz,
  add column if not exists curriculum_actualizado_en timestamptz;

-- Perfil público básico gratuito para Partner verificado; planes pagados conservan la misma vista.
drop view if exists public.partners_publicos;
create view public.partners_publicos with (security_invoker=true) as
select
  id,
  coalesce(nombre_comercial,nombre_empresa) as nombre_comercial,
  nombre_responsable,
  descripcion_servicios,
  tipo_servicio,
  especialidades,
  actividades,
  etapas_servicio,
  modalidades_pago,
  porcentaje_anticipo,
  garantia_servicio,
  region,
  comunas_atendidas,
  anos_experiencia,
  disponibilidad,
  emite_factura,
  logo_url,
  galeria_urls,
  slug,
  rating,
  trabajos_realizados,
  whatsapp,
  correo,
  plan_activo,
  curriculum_publicado
from public.contratistas
where estado_verificacion='verificado'
  and visible_publicamente=true
  and estado='Activo'
  and (
    (plan_activo='partner' and plan_estado in ('sin_pago','activo'))
    or (plan_activo in ('ideal','empresa','premium') and plan_estado='activo')
  );

grant select on public.partners_publicos to anon,authenticated;

-- Devuelve únicamente la ficha Partner que pertenece al usuario autenticado.
create or replace function public.tpl_partner_mi_perfil()
returns jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select coalesce((
    select jsonb_build_object(
      'id',c.id,
      'businessName',coalesce(c.nombre_comercial,c.nombre_empresa),
      'responsibleName',c.nombre_responsable,
      'talent',c.tipo_servicio,
      'description',c.descripcion_servicios,
      'activities',c.actividades,
      'specialties',c.especialidades,
      'serviceStages',c.etapas_servicio,
      'paymentMethods',c.modalidades_pago,
      'depositPercent',c.porcentaje_anticipo,
      'warranty',c.garantia_servicio,
      'region',c.region,
      'coverage',c.comunas_atendidas,
      'experienceYears',c.anos_experiencia,
      'availability',c.disponibilidad,
      'issuesInvoice',c.emite_factura,
      'publicSlug',c.slug,
      'publicVisible',c.visible_publicamente,
      'curriculumPublished',c.curriculum_publicado,
      'plan',c.plan_activo,
      'planStatus',c.plan_estado
    )
    from public.contratistas c
    where lower(trim(c.correo))=lower(trim(coalesce(auth.jwt()->>'email','')))
      and c.estado_verificacion='verificado'
    order by c.actualizado_en desc
    limit 1
  ), jsonb_build_object('found',false));
$$;
revoke all on function public.tpl_partner_mi_perfil() from public;
grant execute on function public.tpl_partner_mi_perfil() to authenticated;

-- Publicar u ocultar la landing propia. No permite cambiar otro Partner.
create or replace function public.tpl_partner_configurar_publicacion(p_visible boolean)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_email text;
  v_partner public.contratistas%rowtype;
begin
  if auth.uid() is null then raise exception 'Sesión requerida' using errcode='42501'; end if;
  v_email:=lower(trim(coalesce(auth.jwt()->>'email','')));
  select * into v_partner
  from public.contratistas
  where lower(trim(correo))=v_email and estado_verificacion='verificado'
  order by actualizado_en desc
  limit 1
  for update;
  if v_partner.id is null then raise exception 'PARTNER_NO_ENCONTRADO'; end if;

  update public.contratistas
  set visible_publicamente=coalesce(p_visible,false),
      perfil_publicado_en=case when p_visible then coalesce(perfil_publicado_en,now()) else perfil_publicado_en end,
      actualizado_en=now()
  where id=v_partner.id;

  return jsonb_build_object(
    'ok',true,
    'visible',coalesce(p_visible,false),
    'slug',v_partner.slug
  );
end;
$$;
revoke all on function public.tpl_partner_configurar_publicacion(boolean) from public;
grant execute on function public.tpl_partner_configurar_publicacion(boolean) to authenticated;

-- Contexto ampliado para TPL Business.
create or replace function public.tpl_business_partner_contexto(p_proyecto_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public,auth
as $$
  select case when p.tipo_proyecto='partner' then jsonb_build_object(
    'isPartner',true,
    'partnerId',c.id,
    'businessName',coalesce(c.nombre_comercial,c.nombre_empresa),
    'responsibleName',c.nombre_responsable,
    'talent',c.tipo_servicio,
    'description',c.descripcion_servicios,
    'activities',c.actividades,
    'specialties',c.especialidades,
    'serviceStages',c.etapas_servicio,
    'paymentMethods',c.modalidades_pago,
    'depositPercent',c.porcentaje_anticipo,
    'warranty',c.garantia_servicio,
    'region',c.region,
    'coverage',c.comunas_atendidas,
    'experienceYears',c.anos_experiencia,
    'availability',c.disponibilidad,
    'issuesInvoice',c.emite_factura,
    'publicSlug',c.slug,
    'publicVisible',c.visible_publicamente,
    'curriculumPublished',c.curriculum_publicado,
    'plan',c.plan_activo,
    'planStatus',c.plan_estado,
    'verificationStatus',c.estado_verificacion
  ) else jsonb_build_object('isPartner',false) end
  from public.tpl_proyectos_comerciales p
  left join public.contratistas c on c.id=p.contratista_id
  where p.id=p_proyecto_id
    and (
      public.es_administrador_activo()
      or exists (
        select 1
        from public.tpl_business_membresias m
        where m.proyecto_id=p.id
          and m.usuario_id=auth.uid()
          and m.estado='activa'
      )
    );
$$;
revoke all on function public.tpl_business_partner_contexto(uuid) from public;
grant execute on function public.tpl_business_partner_contexto(uuid) to authenticated;

commit;
