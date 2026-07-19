-- TPL V12: respaldo automático de precio + venta urgente + urgente destacado.
-- Ejecutar completo en Supabase > SQL Editor > New query.

create or replace view public.publicaciones_publicas
with (security_barrier = true)
as
with base as (
  select
    p.*,
    coalesce(
      nullif(p.datos_formulario #>> '{tasacion,resultado,quick}', '')::numeric,
      nullif(p.datos_formulario #>> '{tasacionTPL,result,quick}', '')::numeric,
      nullif(p.datos_formulario #>> '{tasacionTPL,resultado,quick}', '')::numeric,
      nullif(p.datos_formulario #>> '{distintivos,precioRecomendadoValor}', '')::numeric
    ) as precio_venta_rapida_tpl,
    coalesce(
      (p.datos_formulario #>> '{promocion,urgente}')::boolean,
      (p.datos_formulario #>> '{comercial,ventaUrgente}')::boolean,
      false
    ) as venta_urgente,
    coalesce(
      (p.datos_formulario #>> '{promocion,destacadoPago}')::boolean,
      (p.datos_formulario #>> '{comercial,urgenteDestacado}')::boolean,
      false
    ) as urgente_destacado,
    coalesce(
      nullif(p.datos_formulario #>> '{promocion,prioridadGrilla}', '')::integer,
      0
    ) as prioridad_promocion
  from public.publicaciones p
)
select
  b.id,
  b.codigo_publico,
  b.estado,
  b.titulo_publico,
  b.descripcion_publica,
  b.precio_publicacion,
  b.superficie_m2,
  b.region,
  b.comuna,
  b.sector,
  b.ubicacion_publica_aproximada,
  round(b.latitud_privada, 3) as latitud_publica,
  round(b.longitud_privada, 3) as longitud_publica,
  b.rol,
  b.agua,
  b.luz,
  b.acceso,
  b.topografia,
  b.naturaleza,
  b.cuerpos_agua,
  b.servicios,
  b.ciudad_principal,
  b.distancia_ciudad,
  b.facilidad_pago,
  b.detalle_facilidad_pago,
  b.publicada_en,
  b.actualizado_en,
  b.datos_formulario ->> 'old_id' as identificador_legacy,
  b.datos_formulario ->> 'imagen_principal' as imagen_principal,
  coalesce(b.datos_formulario -> 'imagenes', '[]'::jsonb) as imagenes,
  b.datos_formulario ->> 'destacada' as destacada,
  b.datos_formulario ->> 'tiempoConcepcion' as tiempo_concepcion,
  (
    b.precio_venta_rapida_tpl is not null
    and b.precio_publicacion is not null
    and b.precio_publicacion <= b.precio_venta_rapida_tpl
  ) as valor_respaldado_tpl,
  b.precio_venta_rapida_tpl as precio_recomendado_tpl,
  b.venta_urgente,
  b.urgente_destacado,
  case
    when b.urgente_destacado then greatest(b.prioridad_promocion, 100)
    when b.venta_urgente then greatest(b.prioridad_promocion, 50)
    else b.prioridad_promocion
  end as prioridad_promocion
from base b
where b.estado = 'aprobada';

revoke all on table public.publicaciones_publicas from public;
grant select on table public.publicaciones_publicas to anon, authenticated;

comment on view public.publicaciones_publicas is
  'Catálogo público sanitizado. Calcula respaldo TPL cuando el precio publicado es igual o inferior a Venta rápida e incluye estados comerciales de urgencia sin exponer datos privados ni fórmulas.';
