-- Ajustes seguros para el publicador unificado y el CRM.
-- Permite conservar las imágenes optimizadas del publicador moderno y mejora
-- la búsqueda de reintentos por clave de idempotencia.

alter table public.publicacion_fotos
  drop constraint if exists publicacion_fotos_tamano_bytes_check;

alter table public.publicacion_fotos
  add constraint publicacion_fotos_tamano_bytes_check
  check (tamano_bytes > 0 and tamano_bytes <= 12582912);

create unique index if not exists publicaciones_idempotency_key_unique_idx
  on public.publicaciones (idempotency_key);

create index if not exists publicaciones_tipo_inmueble_json_idx
  on public.publicaciones ((datos_formulario->>'tipo'));
