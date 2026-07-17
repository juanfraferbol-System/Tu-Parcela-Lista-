revoke select on table public.publicaciones from anon, authenticated;

create or replace view public.publicaciones_publicas
with (security_barrier = true)
as
select
  p.id,
  p.codigo_publico,
  p.estado,
  p.titulo_publico,
  p.descripcion_publica,
  p.precio_publicacion,
  p.superficie_m2,
  p.region,
  p.comuna,
  p.sector,
  p.ubicacion_publica_aproximada,
  round(p.latitud_privada, 3) as latitud_publica,
  round(p.longitud_privada, 3) as longitud_publica,
  p.rol,
  p.agua,
  p.luz,
  p.acceso,
  p.topografia,
  p.naturaleza,
  p.cuerpos_agua,
  p.servicios,
  p.ciudad_principal,
  p.distancia_ciudad,
  p.facilidad_pago,
  p.detalle_facilidad_pago,
  p.publicada_en,
  p.actualizado_en,
  p.datos_formulario ->> 'old_id' as identificador_legacy,
  p.datos_formulario ->> 'imagen_principal' as imagen_principal,
  coalesce(p.datos_formulario -> 'imagenes', '[]'::jsonb) as imagenes,
  p.datos_formulario ->> 'destacada' as destacada,
  p.datos_formulario ->> 'tiempoConcepcion' as tiempo_concepcion
from public.publicaciones p
where p.estado = 'aprobada';

revoke all on table public.publicaciones_publicas from public;
grant select on table public.publicaciones_publicas to anon, authenticated;

comment on view public.publicaciones_publicas is
  'Catalogo publico sanitizado. Excluye contacto, relato privado, coordenadas exactas, idempotencia, formulario completo y modelo comercial.';
