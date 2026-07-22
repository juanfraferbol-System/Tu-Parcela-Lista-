-- ============================================================
-- TPL CRM 2.0 — MOTOR DE AUTOMATIZACIÓN COMERCIAL Y OPERATIVA
-- Ejecutar después de 202607220001 y 202607220002
-- No elimina datos existentes.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Ampliación segura de clientes para priorización automática
alter table public.clientes add column if not exists score integer not null default 0;
alter table public.clientes add column if not exists prioridad text not null default 'frio';
alter table public.clientes add column if not exists probabilidad_compra integer not null default 0;
alter table public.clientes add column if not exists valor_proyecto_estimado numeric not null default 0;
alter table public.clientes add column if not exists urgencia text;
alter table public.clientes add column if not exists ultima_interaccion_en timestamptz;
alter table public.clientes add column if not exists ultimo_contacto_en timestamptz;
alter table public.clientes add column if not exists proxima_accion text;
alter table public.clientes add column if not exists proxima_accion_en timestamptz;
alter table public.clientes add column if not exists score_detalle jsonb not null default '{}'::jsonb;
alter table public.clientes add column if not exists visitas_sitio integer not null default 0;
alter table public.clientes add column if not exists aperturas_cotizacion integer not null default 0;
alter table public.clientes add column if not exists respuestas_whatsapp integer not null default 0;
alter table public.clientes add column if not exists etapa text not null default 'nuevo';
alter table public.clientes add column if not exists origen text;

-- 2) Visitas
create table if not exists public.visitas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  publicacion_id uuid references public.publicaciones(id) on delete set null,
  responsable_id uuid references auth.users(id) on delete set null,
  fecha_solicitada timestamptz,
  fecha_confirmada timestamptz,
  estado text not null default 'solicitada',
  observaciones text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- 3) Reservas de parcelas
create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  publicacion_id uuid not null references public.publicaciones(id) on delete restrict,
  monto numeric not null default 0,
  estado text not null default 'solicitada',
  vence_en timestamptz,
  comprobante_url text,
  condiciones text,
  validada_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- 4) Plan de construcción y etapas
create table if not exists public.planes_construccion (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null unique references public.proyectos(id) on delete cascade,
  contratista_id uuid references public.contratistas(id) on delete set null,
  estado text not null default 'pendiente_contratista',
  fecha_inicio_estimada date,
  fecha_termino_estimada date,
  monto_contratado numeric not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.etapas_trabajo (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planes_construccion(id) on delete cascade,
  orden integer not null,
  nombre text not null,
  descripcion text,
  porcentaje_proyecto numeric not null default 0,
  porcentaje_pago numeric not null default 0,
  monto numeric not null default 0,
  estado text not null default 'pendiente',
  fecha_inicio_estimada date,
  fecha_termino_estimada date,
  requiere_aprobacion boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique(plan_id, orden)
);

create table if not exists public.avances_trabajo (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references public.etapas_trabajo(id) on delete cascade,
  contratista_id uuid references public.contratistas(id) on delete set null,
  descripcion text not null,
  porcentaje_avance numeric not null check (porcentaje_avance between 0 and 100),
  archivos jsonb not null default '[]'::jsonb,
  materiales jsonb not null default '[]'::jsonb,
  problemas text,
  estado_revision text not null default 'pendiente_cliente',
  enviado_en timestamptz not null default now(),
  revisado_en timestamptz
);

create table if not exists public.observaciones_avance (
  id uuid primary key default gen_random_uuid(),
  avance_id uuid not null references public.avances_trabajo(id) on delete cascade,
  autor_tipo text not null,
  autor_id uuid,
  comentario text not null,
  creado_en timestamptz not null default now()
);

create table if not exists public.solicitudes_pago (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references public.etapas_trabajo(id) on delete cascade,
  avance_id uuid references public.avances_trabajo(id) on delete set null,
  monto_solicitado numeric not null check (monto_solicitado >= 0),
  estado text not null default 'pendiente_aprobacion',
  comprobante_url text,
  solicitado_en timestamptz not null default now(),
  aprobado_en timestamptz,
  pagado_en timestamptz
);

-- 5) Cola de notificaciones multicanal
create table if not exists public.notificaciones_salida (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  destinatario text not null,
  canal text not null check (canal in ('whatsapp','sms','email','interno')),
  plantilla text not null,
  asunto text,
  mensaje text not null,
  enlace text,
  payload jsonb not null default '{}'::jsonb,
  estado text not null default 'pendiente',
  intentos integer not null default 0,
  ultimo_error text,
  programada_para timestamptz not null default now(),
  enviada_en timestamptz,
  creado_en timestamptz not null default now()
);

create index if not exists idx_notificaciones_salida_pendientes on public.notificaciones_salida(estado, programada_para);
create index if not exists idx_clientes_prioridad_score on public.clientes(score desc, ultima_interaccion_en desc);
create index if not exists idx_visitas_estado_fecha on public.visitas(estado, fecha_solicitada);
create index if not exists idx_reservas_estado_vence on public.reservas(estado, vence_en);

-- 6) Motor de puntaje comercial
create or replace function public.tpl_recalcular_prioridad_cliente(p_cliente_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.clientes%rowtype;
  v_visitas integer := 0;
  v_reservas integer := 0;
  v_compras integer := 0;
  v_proyectos integer := 0;
  v_score integer := 0;
  v_prob integer := 0;
  v_prioridad text;
  v_accion text;
  v_accion_en timestamptz;
begin
  perform public.crm_exigir_administrador();
  select * into c from public.clientes where id = p_cliente_id;
  if not found then raise exception 'Cliente no encontrado'; end if;

  select count(*) into v_visitas from public.visitas where cliente_id=p_cliente_id and estado not in ('cancelada');
  select count(*) into v_reservas from public.reservas where cliente_id=p_cliente_id and estado in ('solicitada','pendiente_pago','pagada','validada');
  select count(*) into v_compras from public.reservas where cliente_id=p_cliente_id and estado in ('compra_confirmada');
  select count(*) into v_proyectos from public.proyectos where cliente_id=p_cliente_id;

  v_score := least(1000,
      least(coalesce(c.visitas_sitio,0),20) * 5
    + least(coalesce(c.aperturas_cotizacion,0),20) * 8
    + least(coalesce(c.respuestas_whatsapp,0),10) * 15
    + v_visitas * 120
    + v_reservas * 280
    + v_compras * 500
    + v_proyectos * 60
    + case when coalesce(c.presupuesto_estimado,0) >= 30000000 then 80 else 0 end
    + case when c.urgencia in ('alta','muy_alta') then 100 when c.urgencia='media' then 40 else 0 end
    + case when c.ultima_interaccion_en > now()-interval '48 hours' then 50 else 0 end
  );

  v_prob := least(99, greatest(1, round(v_score / 10.0)::integer));
  v_prioridad := case
    when v_score >= 850 then 'muy_caliente'
    when v_score >= 650 then 'prioritario'
    when v_score >= 400 then 'interesado'
    when v_score >= 180 then 'activo'
    else 'frio' end;

  if v_compras > 0 then
    v_accion := 'Activar o revisar plan de construcción'; v_accion_en := now();
  elsif v_reservas > 0 then
    v_accion := 'Confirmar pago o vencimiento de reserva'; v_accion_en := now();
  elsif v_visitas > 0 then
    v_accion := 'Confirmar o hacer seguimiento de visita'; v_accion_en := now();
  elsif c.ultimo_contacto_en is null or c.ultimo_contacto_en < now()-interval '3 days' then
    v_accion := 'Llamar al cliente'; v_accion_en := now();
  else
    v_accion := 'Esperar próxima interacción'; v_accion_en := now()+interval '2 days';
  end if;

  update public.clientes
  set score=v_score,
      probabilidad_compra=v_prob,
      prioridad=v_prioridad,
      proxima_accion=v_accion,
      proxima_accion_en=v_accion_en,
      score_detalle=jsonb_build_object(
        'visitas_sitio',coalesce(c.visitas_sitio,0),
        'aperturas_cotizacion',coalesce(c.aperturas_cotizacion,0),
        'respuestas_whatsapp',coalesce(c.respuestas_whatsapp,0),
        'visitas_solicitadas',v_visitas,
        'reservas',v_reservas,
        'compras',v_compras,
        'proyectos',v_proyectos
      ),
      actualizado_en=now()
  where id=p_cliente_id;

  return jsonb_build_object('cliente_id',p_cliente_id,'score',v_score,'prioridad',v_prioridad,'probabilidad',v_prob,'proxima_accion',v_accion);
end $$;

-- 7) Registro de comportamiento del sitio
create or replace function public.tpl_registrar_comportamiento_cliente(
  p_cliente_id uuid,
  p_evento text,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.crm_exigir_administrador();
  update public.clientes set
    visitas_sitio = visitas_sitio + case when p_evento in ('visita_sitio','vista_parcela','vista_casa') then 1 else 0 end,
    aperturas_cotizacion = aperturas_cotizacion + case when p_evento in ('cotizacion_abierta','pdf_descargado') then 1 else 0 end,
    respuestas_whatsapp = respuestas_whatsapp + case when p_evento='whatsapp_respondido' then 1 else 0 end,
    ultima_interaccion_en=now(),
    valor_proyecto_estimado=greatest(valor_proyecto_estimado,coalesce(nullif(p_metadata->>'valor','')::numeric,0)),
    actualizado_en=now()
  where id=p_cliente_id;

  insert into public.crm_eventos(evento,etapa,cliente_id,origen,pagina,metadata)
  values(p_evento,coalesce(p_metadata->>'etapa','comportamiento'),p_cliente_id,coalesce(p_metadata->>'origen','sitio'),p_metadata->>'pagina',p_metadata);

  return public.tpl_recalcular_prioridad_cliente(p_cliente_id);
end $$;

-- 8) Flujo automatizado visita -> reserva -> compra -> construcción
create or replace function public.tpl_solicitar_visita(
  p_cliente_id uuid,
  p_publicacion_id uuid,
  p_fecha timestamptz,
  p_observaciones text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_dest text;
begin
  perform public.crm_exigir_administrador();
  insert into public.visitas(cliente_id,publicacion_id,fecha_solicitada,observaciones)
  values(p_cliente_id,p_publicacion_id,p_fecha,p_observaciones) returning id into v_id;

  select coalesce(contacto_telefono,contacto_email,'crm') into v_dest from public.publicaciones where id=p_publicacion_id;
  insert into public.notificaciones_salida(cliente_id,destinatario,canal,plantilla,mensaje,payload)
  values(p_cliente_id,v_dest,case when v_dest like '%@%' then 'email' else 'whatsapp' end,'visita_nueva','Nueva solicitud de visita pendiente de confirmación',jsonb_build_object('visita_id',v_id,'publicacion_id',p_publicacion_id,'fecha',p_fecha));

  perform public.tpl_recalcular_prioridad_cliente(p_cliente_id);
  return v_id;
end $$;

create or replace function public.tpl_crear_reserva(
  p_cliente_id uuid,
  p_proyecto_id uuid,
  p_publicacion_id uuid,
  p_monto numeric,
  p_horas_vigencia integer default 48
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  perform public.crm_exigir_administrador();
  insert into public.reservas(cliente_id,proyecto_id,publicacion_id,monto,estado,vence_en)
  values(p_cliente_id,p_proyecto_id,p_publicacion_id,p_monto,'pendiente_pago',now()+make_interval(hours=>greatest(p_horas_vigencia,1))) returning id into v_id;
  update public.proyectos set estado='reserva_pendiente',actualizado_en=now() where id=p_proyecto_id;
  insert into public.notificaciones_salida(cliente_id,proyecto_id,destinatario,canal,plantilla,mensaje,payload)
  select p_cliente_id,p_proyecto_id,coalesce(whatsapp,telefono,correo),'whatsapp','reserva_creada','Tu reserva fue creada. Completa el pago antes del vencimiento.',jsonb_build_object('reserva_id',v_id,'monto',p_monto)
  from public.clientes where id=p_cliente_id;
  perform public.tpl_recalcular_prioridad_cliente(p_cliente_id);
  return v_id;
end $$;

create or replace function public.tpl_confirmar_compra_y_activar_construccion(p_reserva_id uuid)
returns uuid
language plpgsql security definer set search_path=public as $$
declare r public.reservas%rowtype; v_plan uuid; v_total numeric;
begin
  perform public.crm_exigir_administrador();
  select * into r from public.reservas where id=p_reserva_id for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  update public.reservas set estado='compra_confirmada',validada_en=now(),actualizado_en=now() where id=p_reserva_id;
  update public.proyectos set estado='contratista_por_asignar',actualizado_en=now() where id=r.proyecto_id;
  select total into v_total from public.proyectos where id=r.proyecto_id;
  insert into public.planes_construccion(proyecto_id,monto_contratado)
  values(r.proyecto_id,coalesce(v_total,0))
  on conflict(proyecto_id) do update set actualizado_en=now()
  returning id into v_plan;

  insert into public.etapas_trabajo(plan_id,orden,nombre,descripcion,porcentaje_proyecto,porcentaje_pago,monto)
  values
   (v_plan,1,'Inicio y preparación','Limpieza, trazado e instalación de faena',10,10,coalesce(v_total,0)*0.10),
   (v_plan,2,'Fundaciones','Excavaciones, radier o fundaciones',20,20,coalesce(v_total,0)*0.20),
   (v_plan,3,'Estructura','Muros, estructura y techumbre',30,25,coalesce(v_total,0)*0.25),
   (v_plan,4,'Instalaciones','Electricidad, agua y saneamiento',15,20,coalesce(v_total,0)*0.20),
   (v_plan,5,'Terminaciones','Pisos, pintura, puertas y artefactos',20,15,coalesce(v_total,0)*0.15),
   (v_plan,6,'Entrega','Revisión, observaciones y recepción final',5,10,coalesce(v_total,0)*0.10)
  on conflict(plan_id,orden) do nothing;

  insert into public.notificaciones_salida(cliente_id,proyecto_id,destinatario,canal,plantilla,mensaje,payload)
  select r.cliente_id,r.proyecto_id,coalesce(whatsapp,telefono,correo),'whatsapp','compra_confirmada','Compra confirmada. Se activó la búsqueda de contratista y tu plan de construcción.',jsonb_build_object('plan_id',v_plan)
  from public.clientes where id=r.cliente_id;
  perform public.tpl_recalcular_prioridad_cliente(r.cliente_id);
  return v_plan;
end $$;

-- 9) Avances y aprobación del cliente
create or replace function public.tpl_publicar_avance(
  p_etapa_id uuid,
  p_contratista_id uuid,
  p_descripcion text,
  p_porcentaje numeric,
  p_archivos jsonb default '[]'::jsonb,
  p_monto_solicitado numeric default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_avance uuid; v_proyecto uuid; v_cliente uuid;
begin
  perform public.crm_exigir_administrador();
  insert into public.avances_trabajo(etapa_id,contratista_id,descripcion,porcentaje_avance,archivos)
  values(p_etapa_id,p_contratista_id,p_descripcion,p_porcentaje,p_archivos) returning id into v_avance;
  update public.etapas_trabajo set estado='pendiente_revision',actualizado_en=now() where id=p_etapa_id;
  select pc.proyecto_id,p.cliente_id into v_proyecto,v_cliente
  from public.etapas_trabajo e join public.planes_construccion pc on pc.id=e.plan_id join public.proyectos p on p.id=pc.proyecto_id
  where e.id=p_etapa_id;
  if p_monto_solicitado is not null then
    insert into public.solicitudes_pago(etapa_id,avance_id,monto_solicitado) values(p_etapa_id,v_avance,p_monto_solicitado);
  end if;
  insert into public.notificaciones_salida(cliente_id,proyecto_id,destinatario,canal,plantilla,mensaje,payload)
  select v_cliente,v_proyecto,coalesce(whatsapp,telefono,correo),'whatsapp','avance_nuevo','El contratista subió un nuevo avance para tu revisión.',jsonb_build_object('avance_id',v_avance,'etapa_id',p_etapa_id)
  from public.clientes where id=v_cliente;
  return v_avance;
end $$;

create or replace function public.tpl_revisar_avance(p_avance_id uuid,p_decision text,p_comentario text default null)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare a public.avances_trabajo%rowtype; v_estado text;
begin
  perform public.crm_exigir_administrador();
  if p_decision not in ('aprobado','observado') then raise exception 'Decisión inválida'; end if;
  select * into a from public.avances_trabajo where id=p_avance_id for update;
  if not found then raise exception 'Avance no encontrado'; end if;
  v_estado := case when p_decision='aprobado' then 'aprobado' else 'observado' end;
  update public.avances_trabajo set estado_revision=v_estado,revisado_en=now() where id=p_avance_id;
  update public.etapas_trabajo set estado=case when p_decision='aprobado' and a.porcentaje_avance>=100 then 'completada' when p_decision='aprobado' then 'en_progreso' else 'observada' end,actualizado_en=now() where id=a.etapa_id;
  if nullif(trim(p_comentario),'') is not null then insert into public.observaciones_avance(avance_id,autor_tipo,comentario) values(p_avance_id,'cliente',p_comentario); end if;
  if p_decision='aprobado' then update public.solicitudes_pago set estado='aprobada',aprobado_en=now() where avance_id=p_avance_id and estado='pendiente_aprobacion'; end if;
  return jsonb_build_object('success',true,'estado',v_estado);
end $$;

-- 10) RPC del Top clientes del día
create or replace function public.crm_clientes_prioritarios(p_limite integer default 20)
returns table(
  id uuid,nombre text,correo text,telefono text,whatsapp text,score integer,prioridad text,
  probabilidad_compra integer,valor_proyecto_estimado numeric,etapa text,ultima_interaccion_en timestamptz,
  proxima_accion text,proxima_accion_en timestamptz,score_detalle jsonb
)
language plpgsql security definer set search_path=public as $$
begin
  perform public.crm_exigir_administrador();
  return query
  select c.id,trim(concat_ws(' ',c.nombre,c.apellido)),c.correo,c.telefono,c.whatsapp,c.score,c.prioridad,
         c.probabilidad_compra,c.valor_proyecto_estimado,c.etapa,c.ultima_interaccion_en,
         c.proxima_accion,c.proxima_accion_en,c.score_detalle
  from public.clientes c
  order by c.score desc,c.proxima_accion_en asc nulls last,c.ultima_interaccion_en desc nulls last
  limit greatest(1,least(coalesce(p_limite,20),100));
end;
$$;

-- 10.1) Recalcular la prioridad de todos los clientes desde el CRM
create or replace function public.crm_recalcular_prioridades_clientes()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_cliente record;
  v_total integer := 0;
begin
  perform public.crm_exigir_administrador();
  for v_cliente in select id from public.clientes loop
    perform public.tpl_recalcular_prioridad_cliente(v_cliente.id);
    v_total := v_total + 1;
  end loop;
  return jsonb_build_object('success',true,'clientes_recalculados',v_total);
end $$;

-- 11) RLS administrativa estricta
alter table public.visitas enable row level security;
alter table public.reservas enable row level security;
alter table public.planes_construccion enable row level security;
alter table public.etapas_trabajo enable row level security;
alter table public.avances_trabajo enable row level security;
alter table public.observaciones_avance enable row level security;
alter table public.solicitudes_pago enable row level security;
alter table public.notificaciones_salida enable row level security;

do $$ declare t text; begin
  foreach t in array array['visitas','reservas','planes_construccion','etapas_trabajo','avances_trabajo','observaciones_avance','solicitudes_pago','notificaciones_salida'] loop
    execute format('drop policy if exists "CRM administradores %1$s" on public.%1$I',t);
    execute format('create policy "CRM administradores %1$s" on public.%1$I for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo())',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;

revoke all on function public.tpl_recalcular_prioridad_cliente(uuid) from public;
revoke all on function public.tpl_registrar_comportamiento_cliente(uuid,text,jsonb) from public;
revoke all on function public.tpl_solicitar_visita(uuid,uuid,timestamptz,text) from public;
revoke all on function public.tpl_crear_reserva(uuid,uuid,uuid,numeric,integer) from public;
revoke all on function public.tpl_confirmar_compra_y_activar_construccion(uuid) from public;
revoke all on function public.tpl_publicar_avance(uuid,uuid,text,numeric,jsonb,numeric) from public;
revoke all on function public.tpl_revisar_avance(uuid,text,text) from public;
revoke all on function public.crm_clientes_prioritarios(integer) from public;
revoke all on function public.crm_recalcular_prioridades_clientes() from public;

grant execute on function public.tpl_recalcular_prioridad_cliente(uuid) to authenticated;
grant execute on function public.tpl_registrar_comportamiento_cliente(uuid,text,jsonb) to authenticated;
grant execute on function public.tpl_solicitar_visita(uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.tpl_crear_reserva(uuid,uuid,uuid,numeric,integer) to authenticated;
grant execute on function public.tpl_confirmar_compra_y_activar_construccion(uuid) to authenticated;
grant execute on function public.tpl_publicar_avance(uuid,uuid,text,numeric,jsonb,numeric) to authenticated;
grant execute on function public.tpl_revisar_avance(uuid,text,text) to authenticated;
grant execute on function public.crm_clientes_prioritarios(integer) to authenticated;
grant execute on function public.crm_recalcular_prioridades_clientes() to authenticated;
