-- Partner TPL: talento, actividades, etapas, modalidades de pago y preparación de curriculum/landing
begin;
alter table public.partner_postulaciones
 add column if not exists actividades text[] not null default '{}',
 add column if not exists etapas_servicio text[] not null default '{}',
 add column if not exists modalidades_pago text[] not null default '{}',
 add column if not exists porcentaje_anticipo numeric(5,2) not null default 0,
 add column if not exists garantia_servicio text,
 add column if not exists curriculum_estado text not null default 'pendiente',
 add column if not exists curriculum_url text;
alter table public.contratistas
 add column if not exists actividades text[] not null default '{}',
 add column if not exists etapas_servicio text[] not null default '{}',
 add column if not exists modalidades_pago text[] not null default '{}',
 add column if not exists porcentaje_anticipo numeric(5,2) not null default 0,
 add column if not exists garantia_servicio text,
 add column if not exists curriculum_url text;

create or replace function public.tpl_partner_text_array(p jsonb, k text) returns text[] language sql immutable as $$
 select coalesce(array_agg(trim(v)) filter(where trim(v)<>''),'{}') from jsonb_array_elements_text(coalesce(p->k,'[]'::jsonb)) v; $$;

-- La RPC existente debe incorporar estos campos en INSERT. Se redefine mediante parche dinámico solo si existe.
do $$ begin
 if to_regprocedure('public.tpl_postular_partner(jsonb)') is null then raise exception 'Falta tpl_postular_partner(jsonb). Ejecuta primero 202607220005.'; end if;
end $$;

comment on column public.partner_postulaciones.actividades is 'Actividades concretas que el postulante ofrece a clientes.';
comment on column public.partner_postulaciones.etapas_servicio is 'Secuencia comercial y operativa declarada del servicio.';
comment on column public.partner_postulaciones.modalidades_pago is 'Medios y modalidades de pago aceptadas por el Partner.';
commit;
