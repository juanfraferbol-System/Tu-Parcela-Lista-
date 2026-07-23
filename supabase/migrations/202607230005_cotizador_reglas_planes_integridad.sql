-- Reglas canónicas para planes de instalación y persistencia íntegra del cotizador.
-- Proyecto Supabase: qxavbqhyqaqalpzbhwmh

alter table public.extras add column if not exists codigo_plan text;
alter table public.extras add column if not exists orden_visual integer;

update public.extras set codigo_plan='base', orden_visual=10
where categoria='fundacion' and codigo='Instalacion_+_base_pilotes_madera';
update public.extras set codigo_plan='radier_full', orden_visual=20
where categoria='fundacion' and codigo='Instalacion_+_base_radier';
update public.extras set codigo_plan='premium', orden_visual=30
where categoria='fundacion' and codigo='Instalacion completa radier + llave en mano full + piso ceramico';

create table if not exists public.fundacion_extra_reglas (
  id uuid primary key default gen_random_uuid(),
  fundacion_id uuid not null references public.extras(id) on delete cascade,
  extra_id uuid not null references public.extras(id) on delete cascade,
  estado text not null check (estado in ('incluido','opcional','no_disponible')),
  cantidad_incluida numeric not null default 0 check (cantidad_incluida >= 0),
  orden integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (fundacion_id, extra_id)
);

insert into public.fundacion_extra_reglas(fundacion_id,extra_id,estado,cantidad_incluida,orden)
select f.id,e.id,'incluido',
       case when e.tipo_calculo='mt2' then 1 else coalesce(e.cantidad_default,1) end,
       x.orden
from (
  values
    ('piso ceramico',10),
    ('pintura',20),
    ('Instalacion_electrica',30),
    ('instalacion_sanitaria',40),
    ('artefactos_cocina',50),
    ('artefactos_bano',60)
) as x(codigo,orden)
join public.extras f on f.codigo_plan='premium' and f.categoria='fundacion'
join public.extras e on e.codigo=x.codigo
on conflict (fundacion_id,extra_id) do update
set estado=excluded.estado,cantidad_incluida=excluded.cantidad_incluida,orden=excluded.orden,activo=true,actualizado_en=now();

alter table public.fundacion_extra_reglas enable row level security;
drop policy if exists "Lectura publica reglas fundacion extras" on public.fundacion_extra_reglas;
create policy "Lectura publica reglas fundacion extras"
on public.fundacion_extra_reglas for select to anon,authenticated using (activo=true);
grant select on public.fundacion_extra_reglas to anon,authenticated;

create or replace function public.crear_proyecto_completo(
  p_cliente_nombre text,
  p_cliente_email text,
  p_cliente_telefono text,
  p_parcela_id uuid,
  p_casa_codigo text,
  p_total numeric,
  p_extras jsonb
) returns text
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_cliente_id uuid;
  v_proyecto_id uuid;
  v_numero_proyecto text;
  v_casa_id uuid;
  v_extra jsonb;
begin
  select id into v_cliente_id from public.clientes where correo=p_cliente_email limit 1;
  if v_cliente_id is null then
    insert into public.clientes(nombre,correo,telefono,estado)
    values (p_cliente_nombre,p_cliente_email,p_cliente_telefono,'nuevo')
    returning id into v_cliente_id;
  else
    update public.clientes
       set nombre=coalesce(nullif(p_cliente_nombre,''),nombre),
           telefono=coalesce(nullif(p_cliente_telefono,''),telefono),
           actualizado_en=now()
     where id=v_cliente_id;
  end if;

  if p_casa_codigo is not null then
    select id into v_casa_id from public.casas where codigo=p_casa_codigo limit 1;
  end if;

  insert into public.proyectos(cliente_id,parcela_id,casa_id,subtotal,total,estado,modalidad,origen)
  values (v_cliente_id,p_parcela_id,v_casa_id,greatest(coalesce(p_total,0),0),greatest(coalesce(p_total,0),0),'cotizacion_enviada','llave_en_mano','cotizador_web')
  returning id,numero_proyecto into v_proyecto_id,v_numero_proyecto;

  if p_parcela_id is not null then
    insert into public.proyecto_items(proyecto_id,tipo,referencia_id,nombre,cantidad,orden)
    values (v_proyecto_id,'parcela',p_parcela_id::text,'Parcela seleccionada',1,10);
  end if;
  if v_casa_id is not null then
    insert into public.proyecto_items(proyecto_id,tipo,referencia_id,nombre,cantidad,orden)
    values (v_proyecto_id,'casa',v_casa_id::text,'Casa seleccionada',1,20);
  end if;

  if p_extras is not null and jsonb_typeof(p_extras)='array' then
    for v_extra in select * from jsonb_array_elements(p_extras)
    loop
      insert into public.proyecto_items(
        proyecto_id,tipo,referencia_id,nombre,cantidad,unidad,precio_unitario,subtotal,datos_snapshot,orden
      ) values (
        v_proyecto_id,
        coalesce(nullif(v_extra->>'tipo',''),'extra'),
        nullif(v_extra->>'id',''),
        coalesce(nullif(v_extra->>'nombre',''),'Ítem cotizado'),
        greatest(coalesce((v_extra->>'cantidad')::numeric,1),0),
        nullif(v_extra->>'unidad',''),
        greatest(coalesce((v_extra->>'precio')::numeric,0),0),
        greatest(coalesce((v_extra->>'subtotal')::numeric,0),0),
        coalesce(v_extra->'snapshot','{}'::jsonb),
        30
      );
    end loop;
  end if;
  return v_numero_proyecto;
end;
$$;

revoke all on function public.crear_proyecto_completo(text,text,text,uuid,text,numeric,jsonb) from public;
grant execute on function public.crear_proyecto_completo(text,text,text,uuid,text,numeric,jsonb) to anon,authenticated;
