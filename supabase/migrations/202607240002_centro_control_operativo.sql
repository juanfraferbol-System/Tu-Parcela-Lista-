-- TPL CRM — Fase 2A.1: base estructural del Centro de Control Operativo.
-- Proyecto: qxavbqhyqaqalpzbhwmh
-- Migración ADITIVA. No fusiona proyectos técnicos y comerciales.
-- Revisar y aprobar antes de ejecutar en producción.

begin;

create extension if not exists pgcrypto;

-- 1. Plantillas versionables de flujos comerciales.
create table if not exists public.crm_flujos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  descripcion text,
  tipo_proyecto text not null,
  version integer not null default 1 check (version > 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_flujos_codigo_version_unique unique (codigo,version),
  constraint crm_flujos_tipo_check check (
    tipo_proyecto in ('visita','parcela','casa','casa_parcela','venta_propiedad')
  )
);

create table if not exists public.crm_flujo_etapas (
  id uuid primary key default gen_random_uuid(),
  flujo_id uuid not null references public.crm_flujos(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  descripcion text,
  orden integer not null check (orden > 0),
  tipo text not null default 'operativa',
  obligatoria boolean not null default true,
  configuracion jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_flujo_etapas_codigo_unique unique (flujo_id,codigo),
  constraint crm_flujo_etapas_orden_unique unique (flujo_id,orden),
  constraint crm_flujo_etapas_config_check check (jsonb_typeof(configuracion)='object')
);

-- 2. Proyecto comercial como maestro operativo.
alter table public.tpl_proyectos_comerciales
  add column if not exists publicacion_id uuid references public.publicaciones(id) on delete set null,
  add column if not exists responsable_id uuid references public.profiles(id) on delete set null,
  add column if not exists tipo_proyecto text,
  add column if not exists flujo_id uuid references public.crm_flujos(id) on delete set null,
  add column if not exists prioridad text not null default 'normal',
  add column if not exists fecha_inicio date,
  add column if not exists fecha_objetivo date,
  add column if not exists ultima_actividad_en timestamptz,
  add column if not exists proxima_accion text,
  add column if not exists proxima_accion_en timestamptz,
  add column if not exists archivado_en timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='tpl_proyectos_comerciales_tipo_proyecto_check'
  ) then
    alter table public.tpl_proyectos_comerciales
      add constraint tpl_proyectos_comerciales_tipo_proyecto_check
      check (
        tipo_proyecto is null
        or tipo_proyecto in ('visita','parcela','casa','casa_parcela','venta_propiedad')
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='tpl_proyectos_comerciales_prioridad_check'
  ) then
    alter table public.tpl_proyectos_comerciales
      add constraint tpl_proyectos_comerciales_prioridad_check
      check (prioridad in ('baja','normal','alta','critica'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='tpl_proyectos_comerciales_fechas_check'
  ) then
    alter table public.tpl_proyectos_comerciales
      add constraint tpl_proyectos_comerciales_fechas_check
      check (fecha_objetivo is null or fecha_inicio is null or fecha_objetivo >= fecha_inicio);
  end if;
end;
$$;

create index if not exists tpl_proyectos_comerciales_operacion_idx
  on public.tpl_proyectos_comerciales(estado,prioridad,proxima_accion_en);
create index if not exists tpl_proyectos_comerciales_publicacion_idx
  on public.tpl_proyectos_comerciales(publicacion_id);
create index if not exists tpl_proyectos_comerciales_responsable_idx
  on public.tpl_proyectos_comerciales(responsable_id,estado);

-- Proyecto técnico/cotización: relación opcional y no destructiva.
alter table public.proyectos
  add column if not exists proyecto_comercial_id uuid
    references public.tpl_proyectos_comerciales(id) on delete set null;

create index if not exists proyectos_proyecto_comercial_idx
  on public.proyectos(proyecto_comercial_id,estado,actualizado_en desc);

-- 3. Contactos comerciales de una cuenta. No sustituye membresías Auth.
create table if not exists public.tpl_cuenta_contactos (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.tpl_business_cuentas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  rol text not null default 'contacto',
  es_principal boolean not null default false,
  estado text not null default 'activo',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint tpl_cuenta_contactos_unique unique(cuenta_id,cliente_id,rol),
  constraint tpl_cuenta_contactos_rol_check check (
    rol in ('propietario','corredor','contacto','representante','colaborador')
  ),
  constraint tpl_cuenta_contactos_estado_check check (
    estado in ('activo','inactivo','archivado')
  )
);

create unique index if not exists tpl_cuenta_contactos_principal_unique
  on public.tpl_cuenta_contactos(cuenta_id)
  where es_principal and estado='activo';

-- 4. Instancias de etapas por proyecto.
create table if not exists public.crm_proyecto_etapas (
  id uuid primary key default gen_random_uuid(),
  proyecto_comercial_id uuid not null
    references public.tpl_proyectos_comerciales(id) on delete cascade,
  flujo_etapa_id uuid not null references public.crm_flujo_etapas(id) on delete restrict,
  estado text not null default 'no_iniciada',
  responsable_id uuid references public.profiles(id) on delete set null,
  inicio_previsto timestamptz,
  vence_en timestamptz,
  iniciada_en timestamptz,
  completada_en timestamptz,
  observaciones text,
  metadata jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_proyecto_etapas_unique unique(proyecto_comercial_id,flujo_etapa_id),
  constraint crm_proyecto_etapas_estado_check check (
    estado in (
      'no_iniciada','en_proceso','esperando_cliente','esperando_tercero',
      'completada','bloqueada','cancelada'
    )
  ),
  constraint crm_proyecto_etapas_metadata_check check (jsonb_typeof(metadata)='object'),
  constraint crm_proyecto_etapas_fechas_check check (
    completada_en is null or iniciada_en is null or completada_en >= iniciada_en
  )
);

create index if not exists crm_proyecto_etapas_operacion_idx
  on public.crm_proyecto_etapas(proyecto_comercial_id,estado,vence_en);

-- 5. Actividad humana; crm_eventos continúa reservado para telemetría sin PII.
create table if not exists public.crm_actividades (
  id uuid primary key default gen_random_uuid(),
  proyecto_comercial_id uuid not null
    references public.tpl_proyectos_comerciales(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  oportunidad_id uuid references public.crm_oportunidades(id) on delete set null,
  etapa_id uuid references public.crm_proyecto_etapas(id) on delete set null,
  tipo text not null,
  canal text,
  resumen text not null,
  notas_internas text,
  responsable_id uuid references public.profiles(id) on delete set null,
  visibilidad text not null default 'interna',
  origen text not null default 'crm',
  realizada_en timestamptz not null default now(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_actividades_tipo_check check (
    tipo in (
      'llamada','whatsapp','correo','reunion','visita','nota',
      'cambio_estado','seguimiento','sistema'
    )
  ),
  constraint crm_actividades_visibilidad_check check (
    visibilidad in ('interna','cliente')
  )
);

create index if not exists crm_actividades_proyecto_fecha_idx
  on public.crm_actividades(proyecto_comercial_id,realizada_en desc);
create index if not exists crm_actividades_cliente_fecha_idx
  on public.crm_actividades(cliente_id,realizada_en desc);

-- 6. Próximas acciones por proyecto/etapa.
alter table public.crm_tareas
  add column if not exists responsable_id uuid references public.profiles(id) on delete set null,
  add column if not exists proyecto_etapa_id uuid references public.crm_proyecto_etapas(id) on delete set null,
  add column if not exists accion_url text,
  add column if not exists categoria text,
  add column if not exists bloqueante boolean not null default false,
  add column if not exists actualizado_en timestamptz not null default now();

create index if not exists crm_tareas_centro_control_idx
  on public.crm_tareas(estado,prioridad,vence_en,responsable_id);
create index if not exists crm_tareas_proyecto_comercial_idx
  on public.crm_tareas(proyecto_comercial_id,estado,vence_en);

-- 7. Bitácora operativa.
create table if not exists public.crm_centro_control_bitacora (
  id bigint generated always as identity primary key,
  proyecto_comercial_id uuid not null
    references public.tpl_proyectos_comerciales(id) on delete cascade,
  entidad text not null,
  entidad_id text,
  accion text not null,
  valor_anterior jsonb not null default '{}'::jsonb,
  valor_nuevo jsonb not null default '{}'::jsonb,
  usuario_id uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  constraint crm_centro_control_bitacora_json_check check (
    jsonb_typeof(valor_anterior)='object' and jsonb_typeof(valor_nuevo)='object'
  )
);

create index if not exists crm_centro_control_bitacora_proyecto_idx
  on public.crm_centro_control_bitacora(proyecto_comercial_id,creado_en desc);

-- 8. Timestamp común.
create or replace function public.crm_centro_control_actualizar_timestamp()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
begin
  new.actualizado_en=now();
  return new;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'crm_flujos','crm_flujo_etapas','tpl_cuenta_contactos',
    'crm_proyecto_etapas','crm_actividades','crm_tareas'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'tr_'||v_table||'_centro_control_timestamp',v_table
    );
    execute format(
      'create trigger %I before update on public.%I
       for each row execute function public.crm_centro_control_actualizar_timestamp()',
      'tr_'||v_table||'_centro_control_timestamp',v_table
    );
  end loop;
end;
$$;

-- Bitácora de cambios relevantes del proyecto maestro.
create or replace function public.crm_centro_control_auditar_proyecto()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
begin
  if old.estado is distinct from new.estado
     or old.responsable_id is distinct from new.responsable_id
     or old.flujo_id is distinct from new.flujo_id
     or old.prioridad is distinct from new.prioridad
     or old.archivado_en is distinct from new.archivado_en then
    insert into public.crm_centro_control_bitacora(
      proyecto_comercial_id,entidad,entidad_id,accion,
      valor_anterior,valor_nuevo,usuario_id
    ) values (
      new.id,'proyecto_comercial',new.id::text,'actualizar',
      jsonb_build_object(
        'estado',v_old->'estado','responsable_id',v_old->'responsable_id',
        'flujo_id',v_old->'flujo_id','prioridad',v_old->'prioridad',
        'archivado_en',v_old->'archivado_en'
      ),
      jsonb_build_object(
        'estado',v_new->'estado','responsable_id',v_new->'responsable_id',
        'flujo_id',v_new->'flujo_id','prioridad',v_new->'prioridad',
        'archivado_en',v_new->'archivado_en'
      ),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tr_tpl_proyectos_comerciales_centro_control_audit
  on public.tpl_proyectos_comerciales;
create trigger tr_tpl_proyectos_comerciales_centro_control_audit
after update on public.tpl_proyectos_comerciales
for each row execute function public.crm_centro_control_auditar_proyecto();

create or replace function public.crm_centro_control_auditar_etapa()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,auth
as $$
begin
  if old.estado is distinct from new.estado
     or old.responsable_id is distinct from new.responsable_id then
    insert into public.crm_centro_control_bitacora(
      proyecto_comercial_id,entidad,entidad_id,accion,
      valor_anterior,valor_nuevo,usuario_id
    ) values (
      new.proyecto_comercial_id,'proyecto_etapa',new.id::text,'actualizar',
      jsonb_build_object(
        'estado',old.estado,
        'responsable_id',old.responsable_id,
        'vence_en',old.vence_en
      ),
      jsonb_build_object(
        'estado',new.estado,
        'responsable_id',new.responsable_id,
        'vence_en',new.vence_en
      ),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tr_crm_proyecto_etapas_centro_control_audit
  on public.crm_proyecto_etapas;
create trigger tr_crm_proyecto_etapas_centro_control_audit
after update on public.crm_proyecto_etapas
for each row execute function public.crm_centro_control_auditar_etapa();

-- Sincroniza actividad/próxima acción sin reemplazar crm_tareas.
create or replace function public.crm_centro_control_sincronizar_proyecto()
returns trigger
language plpgsql
set search_path=pg_catalog,public,auth
as $$
begin
  update public.tpl_proyectos_comerciales
  set ultima_actividad_en=greatest(
        coalesce(ultima_actividad_en,'-infinity'::timestamptz),
        coalesce(new.realizada_en,now())
      ),
      actualizado_en=now()
  where id=new.proyecto_comercial_id;
  return new;
end;
$$;

drop trigger if exists tr_crm_actividades_sincronizar_proyecto on public.crm_actividades;
create trigger tr_crm_actividades_sincronizar_proyecto
after insert or update on public.crm_actividades
for each row execute function public.crm_centro_control_sincronizar_proyecto();

-- 9. Seguridad.
alter table public.crm_flujos enable row level security;
alter table public.crm_flujo_etapas enable row level security;
alter table public.tpl_cuenta_contactos enable row level security;
alter table public.crm_proyecto_etapas enable row level security;
alter table public.crm_actividades enable row level security;
alter table public.crm_centro_control_bitacora enable row level security;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'crm_flujos','crm_flujo_etapas','tpl_cuenta_contactos',
    'crm_proyecto_etapas','crm_actividades','crm_centro_control_bitacora'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      'Centro control admin '||v_table,v_table
    );
    execute format(
      'create policy %I on public.%I
       for all to authenticated
       using (public.es_administrador_activo())
       with check (public.es_administrador_activo())',
      'Centro control admin '||v_table,v_table
    );
  end loop;
end;
$$;

-- El propietario no recibe SELECT directo sobre tablas operativas.
-- RLS filtra filas, no columnas; las RPC seguras creadas más abajo excluyen
-- observaciones, metadata y notas internas.
drop policy if exists "TPL Business lee etapas autorizadas" on public.crm_proyecto_etapas;
drop policy if exists "TPL Business lee flujos autorizados" on public.crm_flujos;
drop policy if exists "TPL Business lee definiciones de etapas autorizadas"
  on public.crm_flujo_etapas;
drop policy if exists "TPL Business lee actividades visibles" on public.crm_actividades;

revoke all on public.crm_flujos,public.crm_flujo_etapas,
  public.tpl_cuenta_contactos,public.crm_proyecto_etapas,
  public.crm_actividades,public.crm_centro_control_bitacora
from anon;

grant select,insert,update,delete on public.crm_flujos,public.crm_flujo_etapas,
  public.tpl_cuenta_contactos,public.crm_proyecto_etapas,
  public.crm_actividades
to authenticated;
grant select on public.crm_centro_control_bitacora to authenticated;
grant usage,select on sequence public.crm_centro_control_bitacora_id_seq to authenticated;

-- 10. Plantillas configurables.
insert into public.crm_flujos(codigo,nombre,descripcion,tipo_proyecto,version,activo)
values
  ('cliente_visita','Cliente visita','Seguimiento desde consulta hasta resultado de visita.','visita',1,true),
  ('proyecto_parcela','Proyecto parcela','Búsqueda, visita, negociación y compra de parcela.','parcela',1,true),
  ('proyecto_casa','Proyecto casa','Diseño, cotización, contrato, construcción y entrega.','casa',1,true),
  ('proyecto_casa_parcela','Proyecto casa + parcela','Proceso integral de parcela y vivienda.','casa_parcela',1,true),
  ('venta_propiedad','Venta de propiedad','Publicación, captación y cierre de una propiedad.','venta_propiedad',1,true)
on conflict(codigo,version) do update set
  nombre=excluded.nombre,
  descripcion=excluded.descripcion,
  tipo_proyecto=excluded.tipo_proyecto,
  activo=excluded.activo,
  actualizado_en=now();

with stage_data(flow_code,stage_code,stage_name,stage_order) as (
  values
    ('cliente_visita','consulta','Consulta',1),
    ('cliente_visita','contactado','Contactado',2),
    ('cliente_visita','visita_solicitada','Visita solicitada',3),
    ('cliente_visita','visita_confirmada','Visita confirmada',4),
    ('cliente_visita','visita_realizada','Visita realizada',5),
    ('cliente_visita','resultado','Interesado o descartado',6),
    ('proyecto_parcela','cliente','Cliente',1),
    ('proyecto_parcela','necesidad','Necesidad identificada',2),
    ('proyecto_parcela','alternativas','Alternativas enviadas',3),
    ('proyecto_parcela','parcela','Parcela seleccionada',4),
    ('proyecto_parcela','visita','Visita',5),
    ('proyecto_parcela','negociacion','Negociación',6),
    ('proyecto_parcela','reserva','Reserva',7),
    ('proyecto_parcela','compra','Compra',8),
    ('proyecto_casa','cliente','Cliente',1),
    ('proyecto_casa','requerimientos','Requerimientos',2),
    ('proyecto_casa','modelo_diseno','Modelo o diseño',3),
    ('proyecto_casa','cotizacion','Cotización',4),
    ('proyecto_casa','ajustes','Ajustes',5),
    ('proyecto_casa','aprobacion','Aprobación',6),
    ('proyecto_casa','contrato','Contrato',7),
    ('proyecto_casa','construccion','Construcción',8),
    ('proyecto_casa','entrega','Entrega',9),
    ('proyecto_casa_parcela','cliente','Cliente',1),
    ('proyecto_casa_parcela','presupuesto','Presupuesto',2),
    ('proyecto_casa_parcela','busqueda_parcela','Búsqueda de parcela',3),
    ('proyecto_casa_parcela','parcela','Parcela seleccionada',4),
    ('proyecto_casa_parcela','casa','Casa seleccionada',5),
    ('proyecto_casa_parcela','cotizacion_integral','Cotización integral',6),
    ('proyecto_casa_parcela','visitas_validaciones','Visitas y validaciones',7),
    ('proyecto_casa_parcela','reserva','Reserva',8),
    ('proyecto_casa_parcela','contratos','Contratos',9),
    ('proyecto_casa_parcela','construccion','Construcción',10),
    ('proyecto_casa_parcela','entrega','Entrega',11),
    ('venta_propiedad','publicacion','Publicación',1),
    ('venta_propiedad','landing','Landing',2),
    ('venta_propiedad','captacion','Captación',3),
    ('venta_propiedad','contacto','Contacto',4),
    ('venta_propiedad','visita','Visita',5),
    ('venta_propiedad','negociacion','Negociación',6),
    ('venta_propiedad','reserva','Reserva',7),
    ('venta_propiedad','venta','Venta',8)
)
insert into public.crm_flujo_etapas(
  flujo_id,codigo,nombre,orden,tipo,obligatoria,configuracion,activo
)
select f.id,s.stage_code,s.stage_name,s.stage_order,'operativa',true,'{}'::jsonb,true
from stage_data s
join public.crm_flujos f on f.codigo=s.flow_code and f.version=1
on conflict(flujo_id,codigo) do update set
  nombre=excluded.nombre,
  orden=excluded.orden,
  activo=true,
  actualizado_en=now();

-- 11. Caburgua: relación y etapas basadas solo en evidencia existente.
with caburgua_publicacion as (
  select candidate.id
  from (
    select p.id,p.estado,p.actualizado_en,0 as source_priority
    from public.tpl_landings_comerciales l
    join public.publicaciones p on p.id=l.publicacion_id
    where l.codigo='land-caburgua'
    union all
    select p.id,p.estado,p.actualizado_en,1 as source_priority
    from public.publicaciones p
    where p.datos_formulario->>'old_id'='caburgua'
    union all
    select p.id,p.estado,p.actualizado_en,2 as source_priority
    from public.publicaciones p
    where lower(coalesce(p.codigo_publico,''))='caburgua'
  ) candidate
  order by
    candidate.source_priority,
    case when candidate.estado='aprobada' then 0 else 1 end,
    candidate.actualizado_en desc
  limit 1
), caburgua_flow as (
  select id from public.crm_flujos
  where codigo='venta_propiedad' and version=1
)
update public.tpl_proyectos_comerciales pc
set
  publicacion_id=coalesce(pc.publicacion_id,(select id from caburgua_publicacion)),
  tipo_proyecto=coalesce(pc.tipo_proyecto,'venta_propiedad'),
  flujo_id=coalesce(pc.flujo_id,(select id from caburgua_flow)),
  fecha_inicio=coalesce(pc.fecha_inicio,pc.creado_en::date),
  actualizado_en=now()
where pc.codigo='pro-caburgua';

insert into public.crm_proyecto_etapas(
  proyecto_comercial_id,flujo_etapa_id,estado,iniciada_en,completada_en,metadata
)
select
  pc.id,
  fe.id,
  case
    when fe.codigo='publicacion' and pc.publicacion_id is not null
      and exists (
        select 1 from public.publicaciones p
        where p.id=pc.publicacion_id and p.estado='aprobada'
      ) then 'completada'
    when fe.codigo='landing' and exists (
      select 1 from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id and l.estado='publicada'
    ) then 'completada'
    when fe.codigo='captacion' and exists (
      select 1 from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id and l.estado='publicada'
    ) then 'en_proceso'
    when fe.codigo='contacto' and exists (
      select 1 from public.crm_oportunidades o
      where o.proyecto_comercial_id=pc.id
        and o.etapa in (
          'contactado','calificado','solicito_visita','visita_confirmada',
          'visita_realizada','negociando','reservado','ganado'
        )
    ) then 'completada'
    when fe.codigo='visita' and exists (
      select 1 from public.visitas v
      where v.proyecto_comercial_id=pc.id
        and v.estado in ('realizada','completada')
    ) then 'completada'
    when fe.codigo='visita' and exists (
      select 1 from public.visitas v
      where v.proyecto_comercial_id=pc.id
        and v.estado in ('solicitada','confirmada')
    ) then 'en_proceso'
    when fe.codigo='negociacion' and exists (
      select 1 from public.crm_oportunidades o
      where o.proyecto_comercial_id=pc.id
        and o.etapa in ('negociando','reservado','ganado')
    ) then 'en_proceso'
    when fe.codigo='reserva' and exists (
      select 1
      from public.reservas r
      where r.publicacion_id=pc.publicacion_id
        and r.estado not in ('rechazada','cancelada')
    ) then 'en_proceso'
    when fe.codigo='venta' and exists (
      select 1 from public.crm_oportunidades o
      where o.proyecto_comercial_id=pc.id
        and (o.estado='ganada' or o.etapa='ganado')
    ) then 'completada'
    else 'no_iniciada'
  end,
  case
    when fe.codigo='publicacion' and pc.publicacion_id is not null
      and exists (
        select 1 from public.publicaciones p
        where p.id=pc.publicacion_id and p.estado='aprobada'
      ) then least(
        pc.creado_en,
        (
          select coalesce(p.publicada_en,p.actualizado_en)
          from public.publicaciones p
          where p.id=pc.publicacion_id
        )
      )
    when fe.codigo='landing' and exists (
      select 1 from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id and l.estado='publicada'
    ) then least(
      pc.creado_en,
      (
        select coalesce(l.publicado_actualizado_en,l.publicado_en,l.actualizado_en)
        from public.tpl_landings_comerciales l
        where l.proyecto_comercial_id=pc.id and l.estado='publicada'
        order by l.actualizado_en desc limit 1
      )
    )
    when fe.codigo='captacion' and exists (
      select 1 from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id and l.estado='publicada'
    ) then coalesce(pc.ultima_actividad_en,pc.creado_en)
    else null
  end,
  case
    when fe.codigo='publicacion' and pc.publicacion_id is not null
      and exists (select 1 from public.publicaciones p where p.id=pc.publicacion_id and p.estado='aprobada')
      then (select coalesce(p.publicada_en,p.actualizado_en) from public.publicaciones p where p.id=pc.publicacion_id)
    when fe.codigo='landing' then (
      select coalesce(l.publicado_actualizado_en,l.publicado_en,l.actualizado_en)
      from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id and l.estado='publicada'
      order by l.actualizado_en desc limit 1
    )
    else null
  end,
  jsonb_build_object('backfill','202607240002','evidence_based',true)
from public.tpl_proyectos_comerciales pc
join public.crm_flujos f on f.id=pc.flujo_id and f.codigo='venta_propiedad'
join public.crm_flujo_etapas fe on fe.flujo_id=f.id
where pc.codigo='pro-caburgua'
on conflict(proyecto_comercial_id,flujo_etapa_id) do nothing;

-- 12. Contratos de lectura administrativos.
create or replace function public.crm_centro_control_progreso(p_proyecto_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result integer;
begin
  if not public.es_administrador_activo()
     and not exists (
       select 1
       from public.tpl_business_membresias m
       where m.usuario_id=auth.uid()
         and m.proyecto_id=p_proyecto_id
         and m.estado='activa'
     ) then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;

  select case
    when count(*) filter(where fe.obligatoria and pe.estado<>'cancelada')=0 then null
    else round(
      100.0 * count(*) filter(where fe.obligatoria and pe.estado='completada')
      / count(*) filter(where fe.obligatoria and pe.estado<>'cancelada')
    )::integer
  end into v_result
  from public.crm_proyecto_etapas pe
  join public.crm_flujo_etapas fe on fe.id=pe.flujo_etapa_id
  where pe.proyecto_comercial_id=p_proyecto_id;

  return v_result;
end;
$$;

revoke all on function public.crm_centro_control_progreso(uuid) from public,anon;
grant execute on function public.crm_centro_control_progreso(uuid) to authenticated;

create or replace function public.tpl_business_etapas_proyecto(p_proyecto_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo()
     and not exists (
       select 1 from public.tpl_business_membresias m
       where m.usuario_id=auth.uid()
         and m.proyecto_id=p_proyecto_id
         and m.estado='activa'
     ) then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',pe.id,
    'code',fe.codigo,
    'name',fe.nombre,
    'description',fe.descripcion,
    'order',fe.orden,
    'required',fe.obligatoria,
    'status',pe.estado,
    'plannedStart',pe.inicio_previsto,
    'dueAt',pe.vence_en,
    'startedAt',pe.iniciada_en,
    'completedAt',pe.completada_en
  ) order by fe.orden),'[]'::jsonb)
  into v_result
  from public.crm_proyecto_etapas pe
  join public.crm_flujo_etapas fe on fe.id=pe.flujo_etapa_id
  where pe.proyecto_comercial_id=p_proyecto_id;

  return v_result;
end;
$$;

create or replace function public.tpl_business_actividades_proyecto(
  p_proyecto_id uuid,
  p_limite integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo()
     and not exists (
       select 1 from public.tpl_business_membresias m
       where m.usuario_id=auth.uid()
         and m.proyecto_id=p_proyecto_id
         and m.estado='activa'
     ) then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;

  select jsonb_build_object(
    'items',coalesce(jsonb_agg(jsonb_build_object(
      'id',a.id,
      'type',a.tipo,
      'channel',a.canal,
      'summary',a.resumen,
      'source',a.origen,
      'occurredAt',a.realizada_en
    ) order by a.realizada_en desc),'[]'::jsonb),
    'limit',least(greatest(p_limite,1),100),
    'offset',greatest(p_offset,0)
  ) into v_result
  from (
    select id,tipo,canal,resumen,origen,realizada_en
    from public.crm_actividades
    where proyecto_comercial_id=p_proyecto_id
      and (
        public.es_administrador_activo()
        or visibilidad='cliente'
      )
    order by realizada_en desc
    limit least(greatest(p_limite,1),100)
    offset greatest(p_offset,0)
  ) a;

  return v_result;
end;
$$;

revoke all on function public.tpl_business_etapas_proyecto(uuid) from public,anon;
revoke all on function public.tpl_business_actividades_proyecto(uuid,integer,integer)
  from public,anon;
grant execute on function public.tpl_business_etapas_proyecto(uuid) to authenticated;
grant execute on function public.tpl_business_actividades_proyecto(uuid,integer,integer)
  to authenticated;

create or replace function public.crm_centro_control_resumen()
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo() then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;

  select jsonb_build_object(
    'metrics',jsonb_build_object(
      'activeClients',(select count(*) from public.clientes c where coalesce(c.estado,'nuevo') not in ('archivado','inactivo')),
      'newInquiries',(select count(*) from public.crm_interacciones_landing i where i.tipo='informacion_solicitada' and i.creado_en>=now()-interval '7 days'),
      'pendingVisits',(select count(*) from public.visitas v where v.estado in ('solicitada','confirmada')),
      'activeCommercialProjects',(select count(*) from public.tpl_proyectos_comerciales p where p.estado in ('preparacion','activo') and p.archivado_en is null),
      'publishedProperties',(select count(*) from public.publicaciones p where p.estado='aprobada'),
      'selectedHouses',(select count(*) from public.proyectos p where p.casa_id is not null and p.estado not in ('cancelado','archivado')),
      'pendingQuotations',(select count(*) from public.proyectos p where p.estado in ('cotizacion_enviada','pendiente','borrador')),
      'pendingBusinessRequests',(select count(*) from public.tpl_solicitudes_comerciales s where s.estado in ('solicitada','contactando')),
      'reservations',(select count(*) from public.reservas r where r.estado not in ('rechazada','cancelada')),
      'sales',(select count(*) from public.crm_oportunidades o where o.estado='ganada'),
      'overdueTasks',(select count(*) from public.crm_tareas t where t.estado='pendiente' and t.vence_en<now())
    ),
    'alerts',coalesce((
      select jsonb_agg(a order by a->>'priority',a->>'createdAt')
      from (
        select jsonb_build_object(
          'code','tarea_vencida','title',t.titulo,'priority',t.prioridad,
          'projectId',t.proyecto_comercial_id,'clientId',t.cliente_id,
          'responsibleId',t.responsable_id,'actionUrl',t.accion_url,
          'createdAt',t.creado_en
        ) a
        from public.crm_tareas t
        where t.estado='pendiente' and t.vence_en<now()
        order by t.vence_en
        limit 50
      ) q
    ),'[]'::jsonb),
    'recentActivity',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'type',a.tipo,'summary',a.resumen,
        'projectId',a.proyecto_comercial_id,'clientId',a.cliente_id,
        'occurredAt',a.realizada_en
      ) order by a.realizada_en desc)
      from (
        select * from public.crm_actividades
        order by realizada_en desc limit 30
      ) a
    ),'[]'::jsonb),
    'mapPoints',coalesce(public.crm_mapa_proyectos(),'[]'::jsonb),
    'quickActions',jsonb_build_array(
      jsonb_build_object('code','crear_cliente','label','Crear cliente','target','view-clientes-prioritarios'),
      jsonb_build_object('code','crear_proyecto','label','Crear proyecto','target','view-business-projects'),
      jsonb_build_object('code','revisar_publicaciones','label','Revisar publicaciones','target','view-parcelas'),
      jsonb_build_object('code','ver_solicitudes','label','Ver solicitudes','target','view-business-requests')
    )
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.crm_mapa_proyectos()
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo() then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'projectId',pc.id,'projectCode',pc.codigo,'projectName',pc.nombre,
    'propertyId',p.id,'propertyCode',p.codigo_publico,
    'latitude',p.latitud_publica,'longitude',p.longitud_publica,
    'precision',p.precision_ubicacion,'status',pc.estado,
    'priority',pc.prioridad,'nextAction',pc.proxima_accion,
    'directionsUrl',case
      when p.latitud_publica is not null and p.longitud_publica is not null
      then 'https://www.google.com/maps/dir/?api=1&destination='
        || p.latitud_publica::text || ',' || p.longitud_publica::text
      else null end
  ) order by pc.prioridad desc,pc.actualizado_en desc),'[]'::jsonb)
  into v_result
  from public.tpl_proyectos_comerciales pc
  join public.publicaciones p on p.id=pc.publicacion_id
  where pc.archivado_en is null
    and p.latitud_publica is not null
    and p.longitud_publica is not null
    and p.consentimiento_uso_ubicacion;
  return v_result;
end;
$$;

create or replace function public.crm_centro_control_estados(
  p_limite integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo() then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;
  select jsonb_build_object(
    'items',coalesce(jsonb_agg(row_data order by row_data->>'updatedAt' desc),'[]'::jsonb),
    'limit',least(greatest(p_limite,1),100),
    'offset',greatest(p_offset,0)
  ) into v_result
  from (
    select jsonb_build_object(
      'project',jsonb_build_object('id',pc.id,'code',pc.codigo,'name',pc.nombre,'status',pc.estado),
      'projectType',pc.tipo_proyecto,
      'clients',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',c.id,'name',trim(concat_ws(' ',c.nombre,c.apellido)),
          'opportunityStage',o.etapa,'opportunityStatus',o.estado
        ))
        from public.crm_oportunidades o
        join public.clientes c on c.id=o.cliente_id
        where o.proyecto_comercial_id=pc.id
      ),'[]'::jsonb),
      'currentStage',(
        select jsonb_build_object('id',pe.id,'code',fe.codigo,'name',fe.nombre,'status',pe.estado)
        from public.crm_proyecto_etapas pe
        join public.crm_flujo_etapas fe on fe.id=pe.flujo_etapa_id
        where pe.proyecto_comercial_id=pc.id
          and pe.estado not in ('completada','cancelada')
        order by fe.orden limit 1
      ),
      'progress',public.crm_centro_control_progreso(pc.id),
      'priority',pc.prioridad,
      'responsible',case when pr.id is null then null else jsonb_build_object('id',pr.id,'name',pr.nombre) end,
      'nextAction',(
        select jsonb_build_object(
          'id',t.id,'title',t.titulo,'dueAt',t.vence_en,
          'priority',t.prioridad,'actionUrl',t.accion_url
        )
        from public.crm_tareas t
        where t.proyecto_comercial_id=pc.id and t.estado='pendiente'
        order by t.bloqueante desc,t.vence_en nulls last limit 1
      ),
      'lastActivity',coalesce(
        pc.ultima_actividad_en,
        (select max(a.realizada_en) from public.crm_actividades a where a.proyecto_comercial_id=pc.id),
        pc.actualizado_en
      ),
      'alerts',coalesce((
        select jsonb_agg(jsonb_build_object(
          'code','tarea_vencida','title',t.titulo,'priority',t.prioridad
        ))
        from public.crm_tareas t
        where t.proyecto_comercial_id=pc.id
          and t.estado='pendiente' and t.vence_en<now()
      ),'[]'::jsonb),
      'updatedAt',pc.actualizado_en
    ) row_data
    from public.tpl_proyectos_comerciales pc
    left join public.profiles pr on pr.id=pc.responsable_id
    where pc.archivado_en is null
    order by pc.actualizado_en desc
    limit least(greatest(p_limite,1),100)
    offset greatest(p_offset,0)
  ) rows;
  return v_result;
end;
$$;

create or replace function public.crm_cliente_operativo(p_cliente_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo() then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;
  select jsonb_build_object(
    'client',to_jsonb(c)-'score_detalle',
    'accounts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',cu.id,'code',cu.codigo,'name',cu.nombre,'role',cc.rol,'isPrimary',cc.es_principal
      ))
      from public.tpl_cuenta_contactos cc
      join public.tpl_business_cuentas cu on cu.id=cc.cuenta_id
      where cc.cliente_id=c.id and cc.estado='activo'
    ),'[]'::jsonb),
    'projects',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',pc.id,'code',pc.codigo,'name',pc.nombre,'status',pc.estado,
        'stage',o.etapa,'progress',public.crm_centro_control_progreso(pc.id)
      ) order by pc.actualizado_en desc)
      from public.crm_oportunidades o
      join public.tpl_proyectos_comerciales pc on pc.id=o.proyecto_comercial_id
      where o.cliente_id=c.id
    ),'[]'::jsonb),
    'activities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'type',a.tipo,'channel',a.canal,'summary',a.resumen,'occurredAt',a.realizada_en
      ) order by a.realizada_en desc)
      from (select * from public.crm_actividades where cliente_id=c.id order by realizada_en desc limit 50) a
    ),'[]'::jsonb)
  ) into v_result
  from public.clientes c where c.id=p_cliente_id;
  return v_result;
end;
$$;

create or replace function public.crm_proyecto_operativo(p_proyecto_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_administrador_activo() then
    raise exception 'Acceso denegado' using errcode='42501';
  end if;
  select jsonb_build_object(
    'project',to_jsonb(pc),
    'account',to_jsonb(cu),
    'property',case when pub.id is null then null else to_jsonb(pub)-'datos_formulario'-'descripcion_origen_privada'-'latitud_privada'-'longitud_privada' end,
    'workflow',case when f.id is null then null else to_jsonb(f) end,
    'stages',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',pe.id,'code',fe.codigo,'name',fe.nombre,'order',fe.orden,
        'required',fe.obligatoria,'status',pe.estado,'dueAt',pe.vence_en,
        'completedAt',pe.completada_en
      ) order by fe.orden)
      from public.crm_proyecto_etapas pe
      join public.crm_flujo_etapas fe on fe.id=pe.flujo_etapa_id
      where pe.proyecto_comercial_id=pc.id
    ),'[]'::jsonb),
    'progress',public.crm_centro_control_progreso(pc.id),
    'opportunities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',o.id,'clientId',o.cliente_id,'stage',o.etapa,'status',o.estado,
        'lastInteractionAt',o.ultima_interaccion_en
      ))
      from public.crm_oportunidades o where o.proyecto_comercial_id=pc.id
    ),'[]'::jsonb),
    'activities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'type',a.tipo,'channel',a.canal,'summary',a.resumen,
        'visibility',a.visibilidad,'occurredAt',a.realizada_en
      ) order by a.realizada_en desc)
      from (select * from public.crm_actividades where proyecto_comercial_id=pc.id order by realizada_en desc limit 100) a
    ),'[]'::jsonb),
    'nextAction',(
      select jsonb_build_object(
        'id',t.id,'title',t.titulo,'dueAt',t.vence_en,'priority',t.prioridad,
        'actionUrl',t.accion_url,'blocking',t.bloqueante
      )
      from public.crm_tareas t
      where t.proyecto_comercial_id=pc.id and t.estado='pendiente'
      order by t.bloqueante desc,t.vence_en nulls last limit 1
    ),
    'visits',coalesce((
      select jsonb_agg(to_jsonb(v) order by v.fecha_solicitada desc)
      from public.visitas v where v.proyecto_comercial_id=pc.id
    ),'[]'::jsonb),
    'technicalProjects',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'number',p.numero_proyecto,'status',p.estado,'total',p.total,
        'houseId',p.casa_id,'propertyId',p.parcela_id
      ) order by p.actualizado_en desc)
      from public.proyectos p where p.proyecto_comercial_id=pc.id
    ),'[]'::jsonb),
    'landing',(
      select jsonb_build_object(
        'id',l.id,'code',l.codigo,'slug',l.slug,'status',l.estado,
        'publishedAt',l.publicado_en,'updatedAt',l.actualizado_en
      )
      from public.tpl_landings_comerciales l
      where l.proyecto_comercial_id=pc.id
      order by l.actualizado_en desc limit 1
    ),
    'history',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',b.id,'entity',b.entidad,'action',b.accion,
        'before',b.valor_anterior,'after',b.valor_nuevo,'createdAt',b.creado_en
      ) order by b.creado_en desc)
      from (select * from public.crm_centro_control_bitacora where proyecto_comercial_id=pc.id order by creado_en desc limit 100) b
    ),'[]'::jsonb)
  ) into v_result
  from public.tpl_proyectos_comerciales pc
  join public.tpl_business_cuentas cu on cu.id=pc.cuenta_id
  left join public.publicaciones pub on pub.id=pc.publicacion_id
  left join public.crm_flujos f on f.id=pc.flujo_id
  where pc.id=p_proyecto_id;
  return v_result;
end;
$$;

revoke all on function public.crm_centro_control_resumen() from public,anon;
revoke all on function public.crm_mapa_proyectos() from public,anon;
revoke all on function public.crm_centro_control_estados(integer,integer) from public,anon;
revoke all on function public.crm_cliente_operativo(uuid) from public,anon;
revoke all on function public.crm_proyecto_operativo(uuid) from public,anon;

grant execute on function public.crm_centro_control_resumen() to authenticated;
grant execute on function public.crm_mapa_proyectos() to authenticated;
grant execute on function public.crm_centro_control_estados(integer,integer) to authenticated;
grant execute on function public.crm_cliente_operativo(uuid) to authenticated;
grant execute on function public.crm_proyecto_operativo(uuid) to authenticated;

comment on table public.crm_flujos is
  'Plantillas versionables para el avance operativo de proyectos comerciales.';
comment on table public.crm_proyecto_etapas is
  'Instancias de etapas; el progreso se calcula solo con etapas obligatorias.';
comment on table public.crm_actividades is
  'Actividad humana del CRM. crm_eventos continúa reservado para telemetría sin PII.';
comment on column public.proyectos.proyecto_comercial_id is
  'Relaciona opcionalmente una cotización/proyecto técnico con su proyecto comercial maestro.';

commit;
