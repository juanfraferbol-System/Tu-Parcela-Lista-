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
