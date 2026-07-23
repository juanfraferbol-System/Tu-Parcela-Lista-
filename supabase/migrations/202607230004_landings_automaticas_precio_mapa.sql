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
