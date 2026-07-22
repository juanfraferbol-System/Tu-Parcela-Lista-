-- Edición administrativa de parcelas/publicaciones y casas desde el CRM.

create or replace function public.crm_guardar_publicacion_admin(
  p_publicacion_id uuid,
  p_datos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_admin uuid := public.crm_exigir_administrador();
  v_resultado jsonb;
begin
  if p_publicacion_id is null or jsonb_typeof(p_datos) is distinct from 'object' then
    raise exception using message = 'CRM_PUBLICATION_DATA_INVALID';
  end if;

  update public.publicaciones p set
    titulo_publico = trim(coalesce(p_datos->>'titulo_publico', p.titulo_publico)),
    descripcion_publica = trim(coalesce(p_datos->>'descripcion_publica', p.descripcion_publica)),
    precio_publicacion = case when p_datos ? 'precio_publicacion' and nullif(p_datos->>'precio_publicacion','') is not null then (p_datos->>'precio_publicacion')::bigint else null end,
    superficie_m2 = case when p_datos ? 'superficie_m2' and nullif(p_datos->>'superficie_m2','') is not null then (p_datos->>'superficie_m2')::numeric else null end,
    rol = nullif(trim(p_datos->>'rol'), ''),
    region = trim(coalesce(p_datos->>'region', p.region)),
    comuna = trim(coalesce(p_datos->>'comuna', p.comuna)),
    sector = trim(coalesce(p_datos->>'sector', p.sector)),
    ubicacion_publica_aproximada = trim(coalesce(p_datos->>'ubicacion_publica_aproximada', p.ubicacion_publica_aproximada)),
    ciudad_principal = nullif(trim(p_datos->>'ciudad_principal'), ''),
    distancia_ciudad = nullif(trim(p_datos->>'distancia_ciudad'), ''),
    latitud_privada = case when p_datos ? 'latitud_privada' and nullif(p_datos->>'latitud_privada','') is not null then (p_datos->>'latitud_privada')::numeric else null end,
    longitud_privada = case when p_datos ? 'longitud_privada' and nullif(p_datos->>'longitud_privada','') is not null then (p_datos->>'longitud_privada')::numeric else null end,
    agua = nullif(trim(p_datos->>'agua'), ''),
    luz = nullif(trim(p_datos->>'luz'), ''),
    acceso = nullif(trim(p_datos->>'acceso'), ''),
    topografia = nullif(trim(p_datos->>'topografia'), ''),
    naturaleza = coalesce(array(select jsonb_array_elements_text(coalesce(p_datos->'naturaleza','[]'::jsonb))), '{}'),
    cuerpos_agua = coalesce(array(select jsonb_array_elements_text(coalesce(p_datos->'cuerpos_agua','[]'::jsonb))), '{}'),
    servicios = coalesce(array(select jsonb_array_elements_text(coalesce(p_datos->'servicios','[]'::jsonb))), '{}'),
    facilidad_pago = coalesce((p_datos->>'facilidad_pago')::boolean, false),
    detalle_facilidad_pago = nullif(trim(p_datos->>'detalle_facilidad_pago'), ''),
    contacto_nombre = trim(coalesce(p_datos->>'contacto_nombre', p.contacto_nombre)),
    contacto_email = trim(coalesce(p_datos->>'contacto_email', p.contacto_email)),
    contacto_telefono = nullif(trim(p_datos->>'contacto_telefono'), ''),
    contacto_organizacion = nullif(trim(p_datos->>'contacto_organizacion'), ''),
    plan_seleccionado = nullif(trim(p_datos->>'plan_seleccionado'), ''),
    datos_formulario = coalesce(p_datos->'datos_formulario', p.datos_formulario),
    actualizado_en = now()
  where p.id = p_publicacion_id;

  if not found then raise exception using message = 'CRM_PUBLICATION_NOT_FOUND'; end if;

  insert into public.moderacion_registros(publicacion_id, estado_nuevo, motivo, responsable_id, evidencia)
  select p.id, p.estado, 'Edición administrativa desde CRM', v_admin,
    jsonb_build_object('accion','edicion_manual','actualizado_en',now())
  from public.publicaciones p where p.id = p_publicacion_id;

  select to_jsonb(p) - 'idempotency_key' into v_resultado from public.publicaciones p where p.id = p_publicacion_id;
  return v_resultado;
end;
$$;

create or replace function public.crm_listar_casas_admin()
returns setof public.casas
language plpgsql stable security definer set search_path = pg_catalog
as $$ begin perform public.crm_exigir_administrador(); return query select * from public.casas order by destacada desc, activa desc, superficie_m2, nombre; end; $$;

create or replace function public.crm_detalle_casa_admin(p_casa_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = pg_catalog
as $$ declare v jsonb; begin perform public.crm_exigir_administrador(); select to_jsonb(c) into v from public.casas c where c.id=p_casa_id; if v is null then raise exception using message='CRM_HOUSE_NOT_FOUND'; end if; return v; end; $$;

create or replace function public.crm_guardar_casa_admin(p_casa_id uuid, p_datos jsonb)
returns jsonb
language plpgsql security definer set search_path = pg_catalog
as $$
declare v_id uuid; v_result jsonb;
begin
  perform public.crm_exigir_administrador();
  if jsonb_typeof(p_datos) is distinct from 'object' then raise exception using message='CRM_HOUSE_DATA_INVALID'; end if;
  if nullif(trim(p_datos->>'nombre'),'') is null then raise exception using message='CRM_HOUSE_NAME_REQUIRED'; end if;

  if p_casa_id is null then
    insert into public.casas(codigo,nombre,descripcion,superficie_m2,habitaciones,banos,precio_base,tipo_construccion,plano_url,imagen_principal_url,imagenes,activa,destacada)
    values(nullif(trim(p_datos->>'codigo'),''),trim(p_datos->>'nombre'),nullif(trim(p_datos->>'descripcion'),''),(p_datos->>'superficie_m2')::numeric,(p_datos->>'habitaciones')::int,(p_datos->>'banos')::int,(p_datos->>'precio_base')::numeric,nullif(trim(p_datos->>'tipo_construccion'),''),nullif(trim(p_datos->>'plano_url'),''),nullif(trim(p_datos->>'imagen_principal_url'),''),coalesce(p_datos->'imagenes','[]'::jsonb),coalesce((p_datos->>'activa')::boolean,true),coalesce((p_datos->>'destacada')::boolean,false)) returning id into v_id;
  else
    update public.casas c set codigo=nullif(trim(p_datos->>'codigo'),''),nombre=trim(p_datos->>'nombre'),descripcion=nullif(trim(p_datos->>'descripcion'),''),superficie_m2=(p_datos->>'superficie_m2')::numeric,habitaciones=(p_datos->>'habitaciones')::int,banos=(p_datos->>'banos')::int,precio_base=(p_datos->>'precio_base')::numeric,tipo_construccion=nullif(trim(p_datos->>'tipo_construccion'),''),plano_url=nullif(trim(p_datos->>'plano_url'),''),imagen_principal_url=nullif(trim(p_datos->>'imagen_principal_url'),''),imagenes=coalesce(p_datos->'imagenes','[]'::jsonb),activa=coalesce((p_datos->>'activa')::boolean,true),destacada=coalesce((p_datos->>'destacada')::boolean,false),actualizado_en=now() where c.id=p_casa_id returning id into v_id;
    if v_id is null then raise exception using message='CRM_HOUSE_NOT_FOUND'; end if;
  end if;
  select to_jsonb(c) into v_result from public.casas c where c.id=v_id; return v_result;
end;
$$;

revoke all on function public.crm_guardar_publicacion_admin(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.crm_listar_casas_admin() from public,anon,authenticated;
revoke all on function public.crm_detalle_casa_admin(uuid) from public,anon,authenticated;
revoke all on function public.crm_guardar_casa_admin(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.crm_guardar_publicacion_admin(uuid,jsonb) to authenticated;
grant execute on function public.crm_listar_casas_admin() to authenticated;
grant execute on function public.crm_detalle_casa_admin(uuid) to authenticated;
grant execute on function public.crm_guardar_casa_admin(uuid,jsonb) to authenticated;
