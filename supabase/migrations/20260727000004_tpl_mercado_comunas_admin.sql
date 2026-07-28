-- ==============================================================================
-- Migración 20260727000004: Índice de Mercado TPL (SSOT Comunal y CRM)
-- ==============================================================================

-- 1. Crear o enriquecer tabla canónica de mercado por comuna
create table if not exists public.mercado_comunas (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  comuna text not null,
  nombre_normalizado text not null,
  aliases jsonb default '[]'::jsonb,
  valor_promedio_m2 numeric not null check (valor_promedio_m2 > 0),
  valor_parcela_tipo_5000 numeric not null check (valor_parcela_tipo_5000 > 0),
  rango_bajo_m2 numeric not null,
  rango_alto_m2 numeric not null,
  comparables_revisados integer default 0,
  comparables_validos integer default 0,
  confianza text not null check (confianza in ('Alta', 'Media-Alta', 'Media', 'Media-Baja', 'Baja', 'Preliminar')),
  fuentes jsonb default '[]'::jsonb,
  fecha_actualizacion date not null default current_date,
  proxima_fecha_revision date not null default (current_date + interval '90 days'),
  version text not null default 'IM-TPL-2026-01',
  activo boolean not null default true,
  notas_internas text,
  modificado_por text default 'admin@parcelalista.cl',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint chk_rangos check (rango_bajo_m2 <= valor_promedio_m2 and rango_alto_m2 >= valor_promedio_m2),
  constraint chk_comparables check (comparables_validos <= comparables_revisados),
  constraint uq_region_comuna_normalizada unique (region, nombre_normalizado)
);

-- 2. Crear tabla de historial inmutable de actualizaciones
create table if not exists public.mercado_comunas_historial (
  id uuid primary key default gen_random_uuid(),
  mercado_comuna_id uuid not null references public.mercado_comunas(id) on delete cascade,
  valor_promedio_m2 numeric not null,
  valor_parcela_tipo_5000 numeric,
  rango_bajo_m2 numeric,
  rango_alto_m2 numeric,
  comparables_revisados integer,
  comparables_validos integer,
  confianza text,
  fuentes jsonb default '[]'::jsonb,
  version text,
  fecha_actualizacion date,
  notas text,
  modificado_por text,
  created_at timestamptz default now()
);

-- 3. Función y Disparador para preservar automáticamente el historial en cada UPDATE
create or replace function public.fn_guardar_historial_mercado_comuna()
returns trigger as $$
begin
  if (old.valor_promedio_m2 is distinct from new.valor_promedio_m2) or
     (old.rango_bajo_m2 is distinct from new.rango_bajo_m2) or
     (old.rango_alto_m2 is distinct from new.rango_alto_m2) or
     (old.confianza is distinct from new.confianza) or
     (old.version is distinct from new.version) or
     (old.activo is distinct from new.activo) then
     
     insert into public.mercado_comunas_historial (
       mercado_comuna_id,
       valor_promedio_m2,
       valor_parcela_tipo_5000,
       rango_bajo_m2,
       rango_alto_m2,
       comparables_revisados,
       comparables_validos,
       confianza,
       fuentes,
       version,
       fecha_actualizacion,
       notas,
       modificado_por
     ) values (
       old.id,
       old.valor_promedio_m2,
       old.valor_parcela_tipo_5000,
       old.rango_bajo_m2,
       old.rango_alto_m2,
       old.comparables_revisados,
       old.comparables_validos,
       old.confianza,
       old.fuentes,
       old.version,
       old.fecha_actualizacion,
       old.notas_internas,
       old.modificado_por
     );
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_historial_mercado_comuna on public.mercado_comunas;
create trigger trg_historial_mercado_comuna
before update on public.mercado_comunas
for each row execute function public.fn_guardar_historial_mercado_comuna();

-- 4. Seguridad RLS
alter table public.mercado_comunas enable row level security;
alter table public.mercado_comunas_historial enable row level security;

-- Los visitantes públicos y módulos de tasación solo consultan registros activos
drop policy if exists "Lectura publica de mercado activo" on public.mercado_comunas;
create policy "Lectura publica de mercado activo" on public.mercado_comunas
  for select using (activo = true);

-- Los administradores (o usuarios autenticados del CRM / service role) tienen acceso total
drop policy if exists "Admin gestiona mercado comunas" on public.mercado_comunas;
create policy "Admin gestiona mercado comunas" on public.mercado_comunas
  for all using (true) with check (true);

drop policy if exists "Admin gestiona historial mercado" on public.mercado_comunas_historial;
create policy "Admin gestiona historial mercado" on public.mercado_comunas_historial
  for all using (true) with check (true);

-- 5. Carga de Valores Iniciales Canónicos (Sin duplicados, resolviendo por conflicto de clave única)
insert into public.mercado_comunas (
  region, comuna, nombre_normalizado, aliases,
  valor_promedio_m2, valor_parcela_tipo_5000, rango_bajo_m2, rango_alto_m2,
  comparables_revisados, comparables_validos, confianza, fuentes, version, fecha_actualizacion, activo
) values 
(
  'Biobío', 'Florida', 'florida', '["Florida"]'::jsonb,
  6700, 33500000, 5800, 7800, 42, 38, 'Alta', '["Conservador Bienes Raíces", "Portales 2026"]'::jsonb, 'IM-TPL-2026-07', '2026-07-27', true
),
(
  'Biobío', 'Yumbel', 'yumbel', '["Yumbel", "Estación Yumbel"]'::jsonb,
  5900, 29500000, 5000, 7100, 35, 30, 'Alta', '["CBR Yumbel", "Estudio Agrícola"]'::jsonb, 'IM-TPL-2026-07', '2026-07-27', true
),
(
  'Biobío', 'Nacimiento', 'nacimiento', '["Nacimiento"]'::jsonb,
  5600, 28000000, 4800, 6600, 28, 24, 'Media-Alta', '["CBR Nacimiento", "Tasaciones TPL"]'::jsonb, 'IM-TPL-2026-07', '2026-07-27', true
),
(
  'Ñuble', 'Quillón', 'quillon', '["Quillon", "Quillón", "Laguna Avendaño"]'::jsonb,
  6300, 31500000, 5500, 7500, 48, 44, 'Alta', '["CBR Bulnes", "Portales Turísticos"]'::jsonb, 'IM-TPL-2026-07', '2026-07-27', true
),
(
  'Ñuble', 'Ránquil', 'ranquil', '["Ranquil", "Ñipas", "Nipas", "Ránquil"]'::jsonb,
  5200, 26000000, 4400, 6200, 18, 15, 'Media', '["CBR Coelemu", "Registros Agrícolas"]'::jsonb, 'IM-TPL-2026-07', '2026-07-27', true
)
on conflict (region, nombre_normalizado) do update set
  valor_promedio_m2 = excluded.valor_promedio_m2,
  valor_parcela_tipo_5000 = excluded.valor_parcela_tipo_5000,
  rango_bajo_m2 = excluded.rango_bajo_m2,
  rango_alto_m2 = excluded.rango_alto_m2,
  confianza = excluded.confianza,
  aliases = excluded.aliases,
  version = excluded.version,
  fecha_actualizacion = excluded.fecha_actualizacion,
  activo = true;

-- 6. Índices para búsqueda de alto rendimiento por alias y comuna
create index if not exists idx_mercado_comunas_nombre on public.mercado_comunas(nombre_normalizado);
create index if not exists idx_mercado_comunas_aliases on public.mercado_comunas using gin(aliases);
