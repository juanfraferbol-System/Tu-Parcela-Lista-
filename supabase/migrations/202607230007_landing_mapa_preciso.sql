-- Coordenadas públicas reutilizables para Landing Premium.
-- Proyecto Supabase: qxavbqhyqaqalpzbhwmh

begin;

create or replace function public.tpl_coordenadas_publicas_landing(p public.publicaciones)
returns jsonb
language plpgsql
stable
set search_path=public
as $$
declare
  v_lat numeric;
  v_lng numeric;
  v_precision text;
begin
  if p.consentimiento_uso_ubicacion
     and p.latitud_publica is not null
     and p.longitud_publica is not null then
    v_lat := p.latitud_publica;
    v_lng := p.longitud_publica;
    v_precision := coalesce(nullif(p.precision_ubicacion,''),'exacta');
  elsif p.latitud_privada is not null and p.longitud_privada is not null then
    v_lat := round(p.latitud_privada,3);
    v_lng := round(p.longitud_privada,3);
    v_precision := 'aproximada';
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
    'mapUrl',format(
      'https://www.google.com/maps/search/?api=1&query=%s,%s',
      v_lat,
      v_lng
    )
  );
end;
$$;

revoke all on function public.tpl_coordenadas_publicas_landing(public.publicaciones)
from public, anon, authenticated;

-- Completa borrador y versión publicada sin alterar textos, diseño ni leads.
update public.tpl_landings_comerciales l
set
  configuracion_borrador =
    coalesce(l.configuracion_borrador,'{}'::jsonb)
    || public.tpl_coordenadas_publicas_landing(p),
  configuracion_publicada = case
    when coalesce(l.configuracion_publicada,'{}'::jsonb)='{}'::jsonb
      then '{}'::jsonb
    else l.configuracion_publicada || public.tpl_coordenadas_publicas_landing(p)
  end,
  borrador_actualizado_en = now(),
  publicado_actualizado_en = case
    when l.configuracion_publicada <> '{}'::jsonb then now()
    else l.publicado_actualizado_en
  end,
  actualizado_en = now()
from public.publicaciones p
where (
    l.publicacion_id=p.id
    or (
      l.codigo='land-caburgua'
      and (
        p.datos_formulario->>'old_id'='caburgua'
        or lower(coalesce(p.codigo_publico,''))='caburgua'
      )
    )
  )
  and public.tpl_coordenadas_publicas_landing(p) <> '{}'::jsonb;

-- Diagnóstico visible al ejecutar la migración.
select
  l.codigo,
  l.configuracion_publicada->>'mapLatitude' as latitud_mapa,
  l.configuracion_publicada->>'mapLongitude' as longitud_mapa,
  l.configuracion_publicada->>'mapPrecision' as precision_mapa
from public.tpl_landings_comerciales l
where l.codigo='land-caburgua';

commit;
