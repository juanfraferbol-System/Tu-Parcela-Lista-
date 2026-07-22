-- TPL CRM 2.2 - Clientes con plan y salud de proyectos
-- Ejecutar después de 202607220003_motor_automatizacion_comercial.sql

begin;

alter table public.proyectos add column if not exists plan_nombre text;
alter table public.proyectos add column if not exists plan_comprado_en timestamptz;
alter table public.proyectos add column if not exists ejecutivo_responsable_id uuid references public.profiles(id) on delete set null;
alter table public.proyectos add column if not exists ultimo_contacto_cliente_en timestamptz;
alter table public.proyectos add column if not exists proximo_contacto_cliente_en timestamptz;
alter table public.proyectos add column if not exists satisfaccion_cliente integer check (satisfaccion_cliente between 0 and 100);
alter table public.proyectos add column if not exists cliente_conforme boolean;
alter table public.proyectos add column if not exists reclamo_abierto boolean not null default false;
alter table public.proyectos add column if not exists riesgo_manual text check (riesgo_manual is null or riesgo_manual in ('verde','amarillo','rojo'));
alter table public.proyectos add column if not exists motivo_riesgo text;

create table if not exists public.contactos_cliente_proyecto (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  canal text not null check (canal in ('telefono','whatsapp','correo','reunion','sistema','otro')),
  resultado text,
  notas text,
  contacto_util boolean not null default true,
  realizado_por uuid references public.profiles(id) on delete set null,
  realizado_en timestamptz not null default now(),
  proximo_contacto_en timestamptz
);

create index if not exists idx_contactos_cliente_proyecto_proyecto_fecha
  on public.contactos_cliente_proyecto(proyecto_id, realizado_en desc);
create index if not exists idx_planes_construccion_proyecto_estado
  on public.planes_construccion(proyecto_id, estado);
create index if not exists idx_etapas_trabajo_plan_estado
  on public.etapas_trabajo(plan_id, estado, orden);

alter table public.contactos_cliente_proyecto enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='contactos_cliente_proyecto'
      and policyname='Administradores gestionan contactos de proyectos'
  ) then
    create policy "Administradores gestionan contactos de proyectos"
      on public.contactos_cliente_proyecto
      for all to authenticated
      using (public.es_admin())
      with check (public.es_admin());
  end if;
end $$;

create or replace function public.crm_registrar_contacto_cliente_plan(
  p_proyecto_id uuid,
  p_canal text,
  p_resultado text default null,
  p_notas text default null,
  p_contacto_util boolean default true,
  p_proximo_contacto_en timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_contacto_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Acceso denegado';
  end if;
  if p_canal not in ('telefono','whatsapp','correo','reunion','sistema','otro') then
    raise exception 'Canal inválido';
  end if;

  select cliente_id into v_cliente_id
  from public.proyectos
  where id = p_proyecto_id;

  if v_cliente_id is null then
    raise exception 'Proyecto o cliente no encontrado';
  end if;

  insert into public.contactos_cliente_proyecto(
    proyecto_id, cliente_id, canal, resultado, notas,
    contacto_util, realizado_por, proximo_contacto_en
  ) values (
    p_proyecto_id, v_cliente_id, p_canal, p_resultado, p_notas,
    p_contacto_util, auth.uid(), p_proximo_contacto_en
  ) returning id into v_contacto_id;

  if p_contacto_util then
    update public.proyectos
      set ultimo_contacto_cliente_en = now(),
          proximo_contacto_cliente_en = p_proximo_contacto_en,
          actualizado_en = now()
    where id = p_proyecto_id;

    update public.clientes
      set ultimo_contacto_en = now(),
          proxima_accion = case when p_proximo_contacto_en is null then proxima_accion else 'Contactar cliente con plan' end,
          proxima_accion_en = coalesce(p_proximo_contacto_en, proxima_accion_en),
          actualizado_en = now()
    where id = v_cliente_id;
  end if;

  return v_contacto_id;
end;
$$;

create or replace function public.crm_clientes_con_plan(p_limite integer default 100)
returns table (
  proyecto_id uuid,
  numero_proyecto text,
  cliente_id uuid,
  cliente_nombre text,
  correo text,
  telefono text,
  whatsapp text,
  plan_nombre text,
  proyecto_estado text,
  total numeric,
  plan_estado text,
  etapa_actual text,
  etapa_estado text,
  avance_porcentaje numeric,
  ultima_actualizacion timestamptz,
  ultimo_contacto timestamptz,
  dias_sin_contacto integer,
  dias_sin_actualizacion integer,
  observaciones_pendientes integer,
  pagos_pendientes integer,
  etapas_atrasadas integer,
  satisfaccion integer,
  salud text,
  puntaje_salud integer,
  proxima_accion text,
  fecha_proxima_accion timestamptz
)
language sql
security definer
set search_path = public
as $$
with base as (
  select
    p.id proyecto_id,
    p.numero_proyecto,
    c.id cliente_id,
    trim(concat_ws(' ', c.nombre, c.apellido)) cliente_nombre,
    c.correo,
    c.telefono,
    c.whatsapp,
    coalesce(nullif(p.plan_nombre,''), 'Plan contratado') plan_nombre,
    p.estado proyecto_estado,
    p.total,
    pc.id plan_id,
    pc.estado plan_estado,
    p.satisfaccion_cliente,
    p.riesgo_manual,
    p.reclamo_abierto,
    coalesce(
      p.ultimo_contacto_cliente_en,
      (select max(ccp.realizado_en) from public.contactos_cliente_proyecto ccp where ccp.proyecto_id=p.id and ccp.contacto_util),
      p.plan_comprado_en,
      p.activado_en,
      p.creado_en
    ) ultimo_contacto,
    greatest(p.actualizado_en, coalesce(pc.actualizado_en,p.actualizado_en),
      coalesce((select max(a.enviado_en) from public.avances_trabajo a join public.etapas_trabajo e on e.id=a.etapa_id where e.plan_id=pc.id),p.actualizado_en)
    ) ultima_actualizacion,
    p.proximo_contacto_cliente_en
  from public.proyectos p
  join public.clientes c on c.id=p.cliente_id
  left join public.planes_construccion pc on pc.proyecto_id=p.id
  where p.plan_comprado_en is not null
     or pc.id is not null
     or p.estado in ('reservado','comprado','proyecto_activo','construccion','en_construccion','entregado','garantia')
), calc as (
  select b.*,
    coalesce((select e.nombre from public.etapas_trabajo e where e.plan_id=b.plan_id order by case when e.estado in ('en_progreso','pendiente_revision','observada') then 0 else 1 end, e.orden limit 1),'Preparación') etapa_actual,
    coalesce((select e.estado from public.etapas_trabajo e where e.plan_id=b.plan_id order by case when e.estado in ('en_progreso','pendiente_revision','observada') then 0 else 1 end, e.orden limit 1),'pendiente') etapa_estado,
    coalesce((select sum(least(100,greatest(0,coalesce(a.porcentaje_avance,case when e.estado='completada' then 100 else 0 end))) * e.porcentaje_proyecto/100)
      from public.etapas_trabajo e left join lateral (select max(av.porcentaje_avance) porcentaje_avance from public.avances_trabajo av where av.etapa_id=e.id) a on true where e.plan_id=b.plan_id),0) avance_porcentaje,
    coalesce((select count(*) from public.observaciones_avance o join public.avances_trabajo a on a.id=o.avance_id join public.etapas_trabajo e on e.id=a.etapa_id where e.plan_id=b.plan_id and a.estado_revision='observado'),0)::int observaciones_pendientes,
    coalesce((select count(*) from public.solicitudes_pago sp join public.etapas_trabajo e on e.id=sp.etapa_id where e.plan_id=b.plan_id and sp.estado in ('pendiente_aprobacion','aprobada')),0)::int pagos_pendientes,
    coalesce((select count(*) from public.etapas_trabajo e where e.plan_id=b.plan_id and e.fecha_termino_estimada < current_date and e.estado not in ('completada','cancelada')),0)::int etapas_atrasadas,
    floor(extract(epoch from (now()-b.ultimo_contacto))/86400)::int dias_sin_contacto,
    floor(extract(epoch from (now()-b.ultima_actualizacion))/86400)::int dias_sin_actualizacion
  from base b
), scored as (
  select c.*,
    greatest(0,least(100,
      100
      - case when c.dias_sin_contacto > 7 then 35 when c.dias_sin_contacto >= 3 then 15 else 0 end
      - case when c.dias_sin_actualizacion > 7 then 25 when c.dias_sin_actualizacion >= 3 then 10 else 0 end
      - least(30,c.etapas_atrasadas*15)
      - least(20,c.observaciones_pendientes*10)
      - case when c.reclamo_abierto then 35 else 0 end
      + case when c.satisfaccion_cliente >= 90 then 5 else 0 end
    ))::int puntaje_calculado
  from calc c
)
select
  s.proyecto_id,s.numero_proyecto,s.cliente_id,s.cliente_nombre,s.correo,s.telefono,s.whatsapp,
  s.plan_nombre,s.proyecto_estado,s.total,s.plan_estado,s.etapa_actual,s.etapa_estado,
  round(s.avance_porcentaje,1),s.ultima_actualizacion,s.ultimo_contacto,
  s.dias_sin_contacto,s.dias_sin_actualizacion,s.observaciones_pendientes,s.pagos_pendientes,s.etapas_atrasadas,
  coalesce(s.satisfaccion_cliente,s.puntaje_calculado) satisfaccion,
  coalesce(s.riesgo_manual,
    case when s.reclamo_abierto or s.etapas_atrasadas>0 or s.dias_sin_contacto>7 or s.puntaje_calculado<55 then 'rojo'
         when s.observaciones_pendientes>0 or s.pagos_pendientes>0 or s.dias_sin_contacto>=3 or s.dias_sin_actualizacion>=3 or s.puntaje_calculado<80 then 'amarillo'
         else 'verde' end) salud,
  s.puntaje_calculado,
  case
    when s.reclamo_abierto then 'Resolver reclamo hoy'
    when s.etapas_atrasadas>0 then 'Contactar contratista y cliente'
    when s.dias_sin_contacto>7 then 'Llamar al cliente hoy'
    when s.observaciones_pendientes>0 then 'Resolver observaciones'
    when s.pagos_pendientes>0 then 'Revisar pago pendiente'
    when s.dias_sin_actualizacion>=3 then 'Solicitar actualización de avance'
    when s.proximo_contacto_cliente_en is not null then 'Cumplir próximo contacto'
    else 'Mantener informado' end proxima_accion,
  coalesce(s.proximo_contacto_cliente_en,
    case when s.dias_sin_contacto>=3 then now() else s.ultimo_contacto + interval '3 days' end
  ) fecha_proxima_accion
from scored s
order by
  case coalesce(s.riesgo_manual,case when s.reclamo_abierto or s.etapas_atrasadas>0 or s.dias_sin_contacto>7 or s.puntaje_calculado<55 then 'rojo' when s.observaciones_pendientes>0 or s.pagos_pendientes>0 or s.dias_sin_contacto>=3 or s.dias_sin_actualizacion>=3 or s.puntaje_calculado<80 then 'amarillo' else 'verde' end)
    when 'rojo' then 1 when 'amarillo' then 2 else 3 end,
  s.dias_sin_contacto desc,
  s.total desc
limit greatest(1,least(coalesce(p_limite,100),500));
$$;

grant execute on function public.crm_clientes_con_plan(integer) to authenticated;
grant execute on function public.crm_registrar_contacto_cliente_plan(uuid,text,text,text,boolean,timestamptz) to authenticated;

commit;
