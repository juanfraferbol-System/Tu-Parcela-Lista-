-- TPL: negociación flexible, mejoras ofrecidas y oportunidades automáticas para Partners
-- Modelo consolidado: las propiedades publicadas viven en public.publicaciones.

begin;

alter table public.publicaciones
  add column if not exists modalidad_negociacion text,
  add column if not exists acepta_ofertas boolean not null default false,
  add column if not exists acepta_mejoras boolean not null default false,
  add column if not exists mejoras_ofrecidas jsonb not null default '[]'::jsonb,
  add column if not exists condiciones_mejoras jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'publicaciones_modalidad_negociacion_check'
  ) then
    alter table public.publicaciones
      add constraint publicaciones_modalidad_negociacion_check
      check (
        modalidad_negociacion is null
        or modalidad_negociacion in ('precio_fijo','ofertas','mejoras','flexible')
      );
  end if;
end $$;

create table if not exists public.necesidades_propiedad (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  tipo_servicio text not null,
  origen text not null default 'ia_publicador',
  motivo text,
  prioridad text not null default 'media'
    check (prioridad in ('baja','media','alta','critica')),
  estado text not null default 'detectada'
    check (estado in (
      'detectada','ofrecida_al_propietario','aceptada','descartada',
      'cotizando','contratada','ejecutada','verificada'
    )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.propuestas_negociacion (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  tipo text not null check (tipo in ('precio','mejora','mixta')),
  precio_publicado numeric check (precio_publicado is null or precio_publicado >= 0),
  precio_ofrecido numeric check (precio_ofrecido is null or precio_ofrecido >= 0),
  mejoras_solicitadas jsonb not null default '[]'::jsonb,
  condiciones text,
  estado text not null default 'enviada'
    check (estado in (
      'borrador','enviada','en_revision','contraoferta','aceptada','rechazada',
      'incorporada_reserva','incorporada_contrato','ejecutada','verificada'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oportunidades_partner (
  id uuid primary key default gen_random_uuid(),
  necesidad_id uuid not null references public.necesidades_propiedad(id) on delete cascade,
  partner_id uuid references public.contratistas(id) on delete set null,
  estado text not null default 'disponible'
    check (estado in (
      'disponible','invitada','vista','interesado','cotizada',
      'seleccionada','rechazada','vencida'
    )),
  precio_referencial numeric check (precio_referencial is null or precio_referencial >= 0),
  plazo_dias integer check (plazo_dias is null or plazo_dias >= 0),
  propuesta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (necesidad_id, partner_id)
);

create index if not exists idx_necesidades_propiedad_publicacion
  on public.necesidades_propiedad(publicacion_id, estado, tipo_servicio);
create index if not exists idx_propuestas_negociacion_publicacion
  on public.propuestas_negociacion(publicacion_id, estado);
create index if not exists idx_oportunidades_partner_estado
  on public.oportunidades_partner(partner_id, estado);

alter table public.necesidades_propiedad enable row level security;
alter table public.propuestas_negociacion enable row level security;
alter table public.oportunidades_partner enable row level security;

drop policy if exists "CRM administra necesidades propiedad" on public.necesidades_propiedad;
create policy "CRM administra necesidades propiedad"
on public.necesidades_propiedad for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "CRM administra propuestas negociacion" on public.propuestas_negociacion;
create policy "CRM administra propuestas negociacion"
on public.propuestas_negociacion for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "CRM administra oportunidades partner" on public.oportunidades_partner;
create policy "CRM administra oportunidades partner"
on public.oportunidades_partner for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

grant select, insert, update, delete on
  public.necesidades_propiedad,
  public.propuestas_negociacion,
  public.oportunidades_partner
to authenticated;

comment on table public.necesidades_propiedad is
  'Necesidades detectadas por reglas o IA a partir de carencias informadas en una publicación.';
comment on table public.propuestas_negociacion is
  'Ofertas de precio, mejoras o combinaciones enviadas por compradores.';
comment on table public.oportunidades_partner is
  'Derivación jerárquica de necesidades a Partners compatibles por especialidad y zona.';

commit;
