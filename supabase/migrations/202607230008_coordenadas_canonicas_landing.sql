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
