begin;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('publicaciones-publicas','publicaciones-publicas',true,12582912,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.publicacion_fotos drop constraint if exists publicacion_fotos_bucket_privado;
alter table public.publicacion_fotos add constraint publicacion_fotos_bucket_valido
check (bucket_id in ('publicaciones-pendientes','publicaciones-publicas'));

drop view if exists public.publicaciones_publicas;

create view public.publicaciones_publicas

with (security_barrier = true)
as
with base as (
  select p.*,
    coalesce(nullif(p.datos_formulario #>> '{tasacion,resultado,quick}','')::numeric,nullif(p.datos_formulario #>> '{tasacionTPL,result,quick}','')::numeric,nullif(p.datos_formulario #>> '{tasacionTPL,resultado,quick}','')::numeric,nullif(p.datos_formulario #>> '{distintivos,precioRecomendadoValor}','')::numeric) precio_venta_rapida_tpl,
    coalesce((p.datos_formulario #>> '{promocion,urgente}')::boolean,(p.datos_formulario #>> '{comercial,ventaUrgente}')::boolean,false) venta_urgente,
    coalesce((p.datos_formulario #>> '{promocion,destacadoPago}')::boolean,(p.datos_formulario #>> '{comercial,urgenteDestacado}')::boolean,false) urgente_destacado,
    coalesce(nullif(p.datos_formulario #>> '{promocion,prioridadGrilla}','')::integer,0) prioridad_promocion
  from public.publicaciones 
)
select b.id,b.codigo_publico,b.estado,
  coalesce(nullif(b.datos_formulario->>'tipo',''),'parcela') tipo_inmueble,
  b.titulo_publico,b.descripcion_publica,b.precio_publicacion,b.superficie_m2,
  nullif(b.datos_formulario->>'superficie_terreno_m2','')::numeric superficie_terreno_m2,
  nullif(b.datos_formulario->>'superficie_construida_m2','')::numeric superficie_construida_m2,
  nullif(b.datos_formulario->>'habitaciones','')::numeric habitaciones,
  nullif(b.datos_formulario->>'banos','')::numeric banos,
  b.datos_formulario->>'material' material,
  b.region,b.comuna,b.sector,b.ubicacion_publica_aproximada,round(b.latitud_privada,3) latitud_publica,round(b.longitud_privada,3) longitud_publica,
  b.rol,b.agua,b.luz,b.acceso,b.topografia,b.naturaleza,b.cuerpos_agua,b.servicios,b.ciudad_principal,b.distancia_ciudad,b.facilidad_pago,b.detalle_facilidad_pago,b.publicada_en,b.actualizado_en,
  b.datos_formulario->>'old_id' identificador_legacy,b.datos_formulario->>'imagen_principal' imagen_principal,coalesce(b.datos_formulario->'imagenes','[]'::jsonb) imagenes,b.datos_formulario->>'destacada' destacada,b.datos_formulario->>'tiempoConcepcion' tiempo_concepcion,
  (b.precio_venta_rapida_tpl is not null and b.precio_publicacion is not null and b.precio_publicacion<=b.precio_venta_rapida_tpl) valor_respaldado_tpl,
  b.precio_venta_rapida_tpl precio_recomendado_tpl,b.venta_urgente,b.urgente_destacado,
  case when b.urgente_destacado then greatest(b.prioridad_promocion,100) when b.venta_urgente then greatest(b.prioridad_promocion,50) else b.prioridad_promocion end prioridad_promocion
from base b where b.estado='aprobada';

revoke all on table public.publicaciones_publicas from public;
grant select on table public.publicaciones_publicas to anon, authenticated;

commit;
