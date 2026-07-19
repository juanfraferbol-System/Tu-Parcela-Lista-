create table if not exists public.publicaciones_unificadas (
  id uuid primary key default gen_random_uuid(),
  codigo_publico text unique not null,
  tipo text not null check (tipo in ('casa','parcela')),
  estado text not null default 'pendiente_revision',
  titulo text not null,
  descripcion text not null,
  region text not null,
  comuna text not null,
  localidad text,
  precio numeric not null default 0,
  superficie_terreno_m2 numeric,
  superficie_construida_m2 numeric,
  habitaciones integer,
  banos integer,
  material text,
  rol text,
  agua text,
  luz text,
  urgencia text,
  estado_propiedad text,
  nombre_contacto text not null,
  telefono_contacto text not null,
  correo_contacto text not null,
  tipo_publicador text,
  fotos jsonb not null default '[]'::jsonb,
  cotizacion jsonb not null default '{}'::jsonb,
  payload_original jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.publicaciones_unificadas enable row level security;
revoke all on public.publicaciones_unificadas from anon;
grant select, insert, update, delete on public.publicaciones_unificadas to authenticated;

drop policy if exists "Administradores gestionan publicaciones unificadas" on public.publicaciones_unificadas;
create policy "Administradores gestionan publicaciones unificadas"
on public.publicaciones_unificadas for all to authenticated
using (true) with check (true);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('publicaciones-unificadas','publicaciones-unificadas',true,12582912,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=12582912,allowed_mime_types=excluded.allowed_mime_types;
