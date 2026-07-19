alter table public.publicaciones_unificadas
  add column if not exists plan_publicacion text not null default 'inicio',
  add column if not exists tasacion jsonb not null default '{}'::jsonb,
  add column if not exists latitud_privada double precision,
  add column if not exists longitud_privada double precision,
  add column if not exists ubicacion_fuente text,
  add column if not exists ubicacion_publica_aproximada boolean not null default true;

comment on column public.publicaciones_unificadas.latitud_privada is 'Coordenada exacta para gestión interna; no exponer directamente en el portal público.';
comment on column public.publicaciones_unificadas.longitud_privada is 'Coordenada exacta para gestión interna; no exponer directamente en el portal público.';
comment on column public.publicaciones_unificadas.tasacion is 'Resultado orientativo del Tasador TPL; no constituye tasación formal.';
