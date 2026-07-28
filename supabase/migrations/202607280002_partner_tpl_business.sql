-- Partner TPL -> TPL Business
-- Crea el espacio comercial al aprobar una postulación y permite reclamarlo
-- de forma segura con una sesión cuyo correo coincida con el Partner aprobado.
begin;

alter table public.tpl_business_cuentas
  add column if not exists tipo_cuenta text not null default 'propiedad',
  add column if not exists contratista_id uuid references public.contratistas(id) on delete set null;

alter table public.tpl_proyectos_comerciales
  add column if not exists tipo_proyecto text not null default 'propiedad',
  add column if not exists contratista_id uuid references public.contratistas(id) on delete set null;

alter table public.tpl_business_cuentas drop constraint if exists tpl_business_cuentas_tipo_check;
alter table public.tpl_business_cuentas add constraint tpl_business_cuentas_tipo_check
  check (tipo_cuenta in ('propiedad','partner','empresa')) not valid;

alter table public.tpl_proyectos_comerciales drop constraint if exists tpl_proyectos_comerciales_tipo_check;
alter table public.tpl_proyectos_comerciales add constraint tpl_proyectos_comerciales_tipo_check
  check (tipo_proyecto in ('propiedad','partner','empresa')) not valid;

create unique index if not exists tpl_business_cuenta_partner_unique
  on public.tpl_business_cuentas(contratista_id) where contratista_id is not null;
create unique index if not exists tpl_business_proyecto_partner_unique
  on public.tpl_proyectos_comerciales(contratista_id) where contratista_id is not null;

insert into public.tpl_business_modulos_catalogo(codigo,nombre,grupo,descripcion,orden)
values
  ('perfil_partner','Mi perfil profesional','estado','Administra la información pública de tu perfil Partner.',5),
  ('curriculum_partner','Mi currículum','estado','Consulta y descarga tu currículum profesional Partner.',6),
  ('servicios_partner','Mis servicios','organizar','Organiza actividades, etapas y modalidades de pago.',55),
  ('oportunidades_partner','Oportunidades','interesados','Revisa solicitudes y proyectos compatibles con tu especialidad.',25),
  ('reputacion_partner','Mi reputación','analizar','Consulta evaluaciones, trabajos y señales de confianza.',115),
  ('tpl_studio','TPL Studio','interesados','Impulsa tu negocio con contenido, campañas y presencia profesional.',35)
on conflict(codigo) do update set
  nombre=excluded.nombre, grupo=excluded.grupo, descripcion=excluded.descripcion,
  orden=excluded.orden, estado='activo', actualizado_en=now();

create or replace function public.tpl_partner_provisionar_business(p_contratista_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_partner public.contratistas%rowtype;
  v_account_id uuid;
  v_project_id uuid;
  v_account_code text;
  v_project_code text;
begin
  select * into v_partner from public.contratistas where id=p_contratista_id for update;
  if v_partner.id is null then raise exception 'Partner no encontrado' using errcode='P0002'; end if;
  if auth.uid() is not null and not public.es_administrador_activo()
     and lower(trim(coalesce(auth.jwt()->>'email',''))) <> lower(trim(coalesce(v_partner.correo,''))) then
    raise exception 'No autorizado' using errcode='42501';
  end if;
  if v_partner.estado_verificacion <> 'verificado' then raise exception 'Partner no verificado'; end if;

  v_account_code := 'partner-' || substr(replace(v_partner.id::text,'-',''),1,12);
  v_project_code := 'pro-partner-' || substr(replace(v_partner.id::text,'-',''),1,12);

  insert into public.tpl_business_cuentas(codigo,nombre,estado,tipo_cuenta,contratista_id)
  values(v_account_code,coalesce(nullif(v_partner.nombre_comercial,''),v_partner.nombre_responsable),'activo','partner',v_partner.id)
  on conflict(contratista_id) where contratista_id is not null do update set
    nombre=excluded.nombre, estado='activo', tipo_cuenta='partner', actualizado_en=now()
  returning id into v_account_id;

  insert into public.tpl_proyectos_comerciales(codigo,cuenta_id,nombre,objetivo,estado,tipo_proyecto,contratista_id)
  values(
    v_project_code,v_account_id,
    'Mi negocio - ' || coalesce(nullif(v_partner.nombre_comercial,''),v_partner.nombre_responsable),
    'Conseguir nuevos clientes y administrar oportunidades','activo','partner',v_partner.id
  )
  on conflict(contratista_id) where contratista_id is not null do update set
    cuenta_id=excluded.cuenta_id,nombre=excluded.nombre,objetivo=excluded.objetivo,
    estado='activo',tipo_proyecto='partner',actualizado_en=now()
  returning id into v_project_id;

  insert into public.tpl_proyecto_modulos(proyecto_id,modulo_codigo,estado)
  select v_project_id,x.codigo,x.estado
  from (values
    ('perfil_partner','activo'),('curriculum_partner','pendiente'),('servicios_partner','activo'),
    ('oportunidades_partner','disponible'),('reputacion_partner','disponible'),('tpl_studio','disponible'),
    ('crm','activo'),('agenda','disponible'),('whatsapp','activo'),('dashboard','activo'),
    ('google_ads','no_contratado'),('meta_ads','disponible'),('seo','disponible'),
    ('video','disponible'),('automatizaciones','proximamente')
  ) as x(codigo,estado)
  on conflict(proyecto_id,modulo_codigo) do update set estado=excluded.estado,actualizado_en=now();

  insert into public.tpl_proyecto_experiencia(
    proyecto_id,salud_porcentaje,salud_fuente,salud_resumen,
    fortalezas,oportunidades,recomendaciones,etapa_crecimiento
  ) values(
    v_project_id,null,'pendiente','Completa tu perfil para aumentar la confianza y recibir mejores oportunidades.',
    jsonb_build_array('Perfil Partner aprobado'),
    jsonb_build_array('Completar currículum','Agregar trabajos realizados','Impulsar presencia con TPL Studio'),
    jsonb_build_array('Completa tu perfil profesional','Publica fotografías de trabajos','Explora TPL Studio'),
    'comenzar'
  ) on conflict(proyecto_id) do nothing;

  return jsonb_build_object('accountId',v_account_id,'projectId',v_project_id,'projectCode',v_project_code);
end;
$$;

revoke all on function public.tpl_partner_provisionar_business(uuid) from public;
grant execute on function public.tpl_partner_provisionar_business(uuid) to authenticated;

create or replace function public.tpl_partner_reclamar_business()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_email text;
  v_partner public.contratistas%rowtype;
  v_access jsonb;
  v_account_id uuid;
  v_project_id uuid;
begin
  if auth.uid() is null then raise exception 'Sesión requerida' using errcode='42501'; end if;
  v_email := lower(trim(coalesce(auth.jwt()->>'email','')));
  if v_email='' then raise exception 'Correo de sesión no disponible'; end if;

  select * into v_partner
  from public.contratistas
  where lower(trim(correo))=v_email and estado_verificacion='verificado'
  order by actualizado_en desc
  limit 1;

  if v_partner.id is null then
    return jsonb_build_object('claimed',false,'reason','NO_PARTNER_APPROVED');
  end if;

  select id into v_account_id from public.tpl_business_cuentas where contratista_id=v_partner.id;
  select id into v_project_id from public.tpl_proyectos_comerciales where contratista_id=v_partner.id;

  if v_account_id is null or v_project_id is null then
    v_access := public.tpl_partner_provisionar_business(v_partner.id);
    v_account_id := (v_access->>'accountId')::uuid;
    v_project_id := (v_access->>'projectId')::uuid;
  end if;

  insert into public.tpl_business_membresias(usuario_id,cuenta_id,proyecto_id,rol,estado,creado_por)
  values(auth.uid(),v_account_id,v_project_id,'propietario','activa',auth.uid())
  on conflict(usuario_id,proyecto_id) do update set
    cuenta_id=excluded.cuenta_id,rol='propietario',estado='activa',actualizado_en=now();

  return jsonb_build_object('claimed',true,'projectId',v_project_id);
end;
$$;

revoke all on function public.tpl_partner_reclamar_business() from public;
grant execute on function public.tpl_partner_reclamar_business() to authenticated;

-- Completa automáticamente accesos faltantes cada vez que se consulta la sesión.
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
  v_claim jsonb;
begin
  if auth.uid() is null then raise exception 'Sesión requerida' using errcode='42501'; end if;
  v_admin:=public.es_administrador_activo();
  if not v_admin then v_claim:=public.tpl_partner_reclamar_business(); end if;
  v_mode:=case when v_admin then 'administrador' else 'cliente' end;
  v_projects:=public.tpl_business_mis_proyectos();
  insert into public.tpl_business_accesos(usuario_id,evento,modo,metadata)
  values(auth.uid(),'inicio_sesion',v_mode,jsonb_build_object('projectCount',jsonb_array_length(v_projects),'partnerClaim',coalesce(v_claim,'{}'::jsonb)));
  return jsonb_build_object(
    'user',jsonb_build_object('id',auth.uid(),'email',coalesce(auth.jwt()->>'email',''),'name',coalesce(auth.jwt()#>>'{user_metadata,full_name}',auth.jwt()#>>'{user_metadata,name}','')),
    'isAdmin',v_admin,'projects',v_projects
  );
end;
$$;

-- Expone el tipo y la ficha Partner dentro del resumen del proyecto.
create or replace function public.tpl_business_partner_contexto(p_proyecto_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select case when p.tipo_proyecto='partner' then jsonb_build_object(
    'isPartner',true,
    'partnerId',c.id,
    'businessName',c.nombre_comercial,
    'responsibleName',c.nombre_responsable,
    'talent',c.tipo_servicio,
    'description',c.descripcion_servicios,
    'activities',c.actividades,
    'serviceStages',c.etapas_servicio,
    'paymentMethods',c.modalidades_pago,
    'depositPercent',c.porcentaje_anticipo,
    'warranty',c.garantia_servicio,
    'curriculumUrl',c.curriculum_url,
    'publicSlug',c.slug,
    'plan',c.plan_activo,
    'verificationStatus',c.estado_verificacion
  ) else jsonb_build_object('isPartner',false) end
  from public.tpl_proyectos_comerciales p
  left join public.contratistas c on c.id=p.contratista_id
  where p.id=p_proyecto_id
$$;

revoke all on function public.tpl_business_partner_contexto(uuid) from public;
grant execute on function public.tpl_business_partner_contexto(uuid) to authenticated;


-- Guarda los nuevos campos del formulario público.
create or replace function public.tpl_postular_partner(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid; v_codigo text; v_token uuid;
  v_correo text := lower(trim(coalesce(p_payload->>'correo','')));
  v_plan text := lower(trim(coalesce(p_payload->>'plan_solicitado','partner')));
  v_especialidades text[]; v_comunas text[]; v_actividades text[];
  v_etapas text[]; v_pagos text[];
begin
  if length(trim(coalesce(p_payload->>'nombre_comercial',''))) < 2 then raise exception 'NOMBRE_COMERCIAL_INVALIDO'; end if;
  if length(trim(coalesce(p_payload->>'nombre_responsable',''))) < 3 then raise exception 'RESPONSABLE_INVALIDO'; end if;
  if v_correo !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then raise exception 'CORREO_INVALIDO'; end if;
  if length(regexp_replace(coalesce(p_payload->>'whatsapp',''),'\D','','g')) < 9 then raise exception 'WHATSAPP_INVALIDO'; end if;
  if length(trim(coalesce(p_payload->>'descripcion_servicios',''))) < 40 then raise exception 'DESCRIPCION_MUY_CORTA'; end if;
  if v_plan not in ('partner','ideal','empresa','premium') then raise exception 'PLAN_INVALIDO'; end if;
  if coalesce((p_payload->>'acepta_terminos')::boolean,false) is not true
     or coalesce((p_payload->>'acepta_privacidad')::boolean,false) is not true
     or coalesce((p_payload->>'autoriza_contacto')::boolean,false) is not true then raise exception 'CONSENTIMIENTOS_REQUERIDOS'; end if;
  if exists(select 1 from public.partner_postulaciones where lower(correo)=v_correo and estado in ('pendiente','antecedentes') and creado_en>now()-interval '14 days') then raise exception 'POSTULACION_RECIENTE_EXISTENTE'; end if;

  v_especialidades:=public.tpl_partner_text_array(p_payload,'especialidades');
  v_comunas:=public.tpl_partner_text_array(p_payload,'comunas_atendidas');
  v_actividades:=public.tpl_partner_text_array(p_payload,'actividades');
  v_etapas:=public.tpl_partner_text_array(p_payload,'etapas_servicio');
  v_pagos:=public.tpl_partner_text_array(p_payload,'modalidades_pago');
  if cardinality(v_actividades)=0 then raise exception 'ACTIVIDADES_REQUERIDAS'; end if;
  if cardinality(v_etapas)=0 then raise exception 'ETAPAS_REQUERIDAS'; end if;
  if cardinality(v_pagos)=0 then raise exception 'MODALIDADES_PAGO_REQUERIDAS'; end if;

  v_id:=gen_random_uuid(); v_token:=gen_random_uuid();
  v_codigo:='TPL-PAR-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(v_id::text,'-',''),1,8));
  insert into public.partner_postulaciones(
    id,codigo,upload_token,nombre_comercial,nombre_responsable,telefono,whatsapp,correo,
    descripcion_servicios,tipo_servicio,especialidades,region,comunas_atendidas,anos_experiencia,
    disponibilidad,emite_factura,acepta_proyectos_tpl,trabaja_bajo_marca_tpl,plan_solicitado,
    actividades,etapas_servicio,modalidades_pago,porcentaje_anticipo,garantia_servicio,
    acepta_terminos,acepta_privacidad,autoriza_contacto
  ) values(
    v_id,v_codigo,v_token,trim(p_payload->>'nombre_comercial'),trim(p_payload->>'nombre_responsable'),
    trim(p_payload->>'telefono'),trim(p_payload->>'whatsapp'),v_correo,
    trim(p_payload->>'descripcion_servicios'),trim(p_payload->>'tipo_servicio'),v_especialidades,
    trim(p_payload->>'region'),v_comunas,greatest(0,least(80,coalesce((p_payload->>'anos_experiencia')::integer,0))),
    trim(p_payload->>'disponibilidad'),coalesce((p_payload->>'emite_factura')::boolean,false),
    coalesce((p_payload->>'acepta_proyectos_tpl')::boolean,true),coalesce((p_payload->>'trabaja_bajo_marca_tpl')::boolean,false),v_plan,
    v_actividades,v_etapas,v_pagos,greatest(0,least(100,coalesce((p_payload->>'porcentaje_anticipo')::numeric,0))),
    nullif(trim(coalesce(p_payload->>'garantia_servicio','')),''),true,true,true
  );
  return jsonb_build_object('id',v_id,'codigo',v_codigo,'upload_token',v_token);
end;
$$;
revoke all on function public.tpl_postular_partner(jsonb) from public;
grant execute on function public.tpl_postular_partner(jsonb) to anon,authenticated;

-- Al aprobar, copia toda la propuesta profesional y crea TPL Business.
create or replace function public.tpl_revisar_postulacion_partner(p_id uuid,p_accion text,p_motivo text default null)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare p public.partner_postulaciones%rowtype; v_contratista uuid; v_slug text;
begin
  if not public.es_administrador_activo() then raise exception 'NO_AUTORIZADO'; end if;
  select * into p from public.partner_postulaciones where id=p_id for update;
  if not found then raise exception 'POSTULACION_NO_EXISTE'; end if;
  if p_accion='antecedentes' then
    update public.partner_postulaciones set estado='antecedentes',motivo_estado=p_motivo,revisado_por=auth.uid(),revisado_en=now(),actualizado_en=now() where id=p_id; return null;
  elsif p_accion='rechazar' then
    update public.partner_postulaciones set estado='rechazada',motivo_estado=p_motivo,revisado_por=auth.uid(),revisado_en=now(),actualizado_en=now() where id=p_id; return null;
  elsif p_accion<>'aprobar' then raise exception 'ACCION_INVALIDA'; end if;

  v_slug:=lower(regexp_replace(regexp_replace(unaccent(p.nombre_comercial),'[^a-zA-Z0-9]+','-','g'),'(^-|-$)','','g'))||'-'||substr(replace(p.id::text,'-',''),1,6);
  insert into public.contratistas(
    nombre_empresa,nombre_comercial,nombre_responsable,telefono,whatsapp,correo,descripcion_servicios,
    tipo_servicio,especialidades,region,comunas_atendidas,ubicacion_base,anos_experiencia,disponibilidad,
    emite_factura,acepta_proyectos_tpl,trabaja_bajo_marca_tpl,plan_solicitado,plan_activo,plan_estado,
    actividades,etapas_servicio,modalidades_pago,porcentaje_anticipo,garantia_servicio,
    slug,estado_verificacion,visible_publicamente,estado,actualizado_en
  ) values(
    p.nombre_comercial,p.nombre_comercial,p.nombre_responsable,p.telefono,p.whatsapp,p.correo,p.descripcion_servicios,
    p.tipo_servicio,p.especialidades,p.region,p.comunas_atendidas,p.region,p.anos_experiencia,p.disponibilidad,
    p.emite_factura,p.acepta_proyectos_tpl,p.trabaja_bajo_marca_tpl,p.plan_solicitado,'partner','sin_pago',
    p.actividades,p.etapas_servicio,p.modalidades_pago,p.porcentaje_anticipo,p.garantia_servicio,
    v_slug,'verificado',true,'Activo',now()
  ) returning id into v_contratista;

  perform public.tpl_partner_provisionar_business(v_contratista);
  update public.partner_postulaciones set estado='aprobada',contratista_id=v_contratista,motivo_estado=p_motivo,
    revisado_por=auth.uid(),revisado_en=now(),actualizado_en=now() where id=p_id;
  return v_contratista;
end;
$$;
revoke all on function public.tpl_revisar_postulacion_partner(uuid,text,text) from public;
grant execute on function public.tpl_revisar_postulacion_partner(uuid,text,text) to authenticated;

commit;
