-- Capa comercial de lanzamiento: embudo, eventos sin PII, tareas y scoring explicable.
alter table public.clientes add column if not exists score integer not null default 0;
alter table public.clientes add column if not exists prioridad text not null default 'Sin actividad';
alter table public.clientes add column if not exists etapa text not null default 'visitante';
alter table public.clientes add column if not exists etapa_ingresada_en timestamptz not null default now();
alter table public.clientes add column if not exists ultimo_contacto_en timestamptz;
alter table public.clientes add column if not exists ultima_interaccion_en timestamptz not null default now();
alter table public.clientes add column if not exists origen text;
alter table public.clientes add column if not exists urgencia text;
alter table public.clientes add column if not exists motivo_perdida text;
alter table public.clientes add column if not exists score_detalle jsonb not null default '{}'::jsonb;

create table if not exists public.crm_eventos (
  id bigint generated always as identity primary key,
  evento text not null,
  etapa text,
  cliente_id uuid references public.clientes(id) on delete set null,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  publicacion_id uuid references public.publicaciones(id) on delete set null,
  origen text,
  pagina text,
  metadata jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  constraint crm_eventos_sin_pii check (not (metadata ?| array['nombre','correo','email','telefono','phone','rut','direccion','notas','mensaje']))
);


create table if not exists public.crm_configuracion (
  clave text primary key,
  valor_numero numeric,
  descripcion text not null,
  actualizado_en timestamptz not null default now()
);
insert into public.crm_configuracion(clave,valor_numero,descripcion) values
  ('nuevo_interesado_horas',0,'Plazo para contactar un nuevo interesado'),
  ('consulta_sin_respuesta_horas',24,'Plazo para alertar una consulta no revisada'),
  ('cotizacion_sin_activar_dias',2,'Plazo para seguir una cotización sin activar'),
  ('visita_recordatorio_previo_dias',1,'Recordatorio anterior a una visita'),
  ('visita_seguimiento_post_dias',1,'Seguimiento posterior a una visita')
on conflict (clave) do nothing;
alter table public.crm_configuracion enable row level security;
drop policy if exists "Administradores gestionan configuracion comercial" on public.crm_configuracion;
create policy "Administradores gestionan configuracion comercial" on public.crm_configuracion for all to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.tipo='administrador' and p.activo)) with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.tipo='administrador' and p.activo));
grant select,update on public.crm_configuracion to authenticated;

create or replace function public.crm_metadata_evento_segura(p_metadata jsonb)
returns boolean language sql immutable as $$
  select coalesce(bool_and(key = any(array['parcela_id','parcela_codigo','casa_id','casa_codigo','extra_codigo','tipo_constructivo','origen','paso','resultado','motivo','valor','filtros_activos','duracion_segundos','publicacion_id','fecha_visita'])),true)
  from jsonb_object_keys(coalesce(p_metadata,'{}'::jsonb)) key;
$$;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='crm_eventos_metadata_permitida') then
    alter table public.crm_eventos add constraint crm_eventos_metadata_permitida check (public.crm_metadata_evento_segura(metadata));
  end if;
end $$;
create table if not exists public.crm_tareas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  estado text not null default 'pendiente',
  prioridad text not null default 'media',
  vence_en timestamptz,
  origen_evento_id bigint references public.crm_eventos(id) on delete set null,
  resuelta_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (tipo, cliente_id, proyecto_id, origen_evento_id)
);

create index if not exists crm_eventos_fecha_idx on public.crm_eventos (creado_en desc);
create index if not exists crm_eventos_embudo_idx on public.crm_eventos (etapa, creado_en desc);
create index if not exists crm_tareas_pendientes_idx on public.crm_tareas (estado, vence_en);
create index if not exists clientes_embudo_idx on public.clientes (etapa, etapa_ingresada_en);

alter table public.crm_eventos enable row level security;
alter table public.crm_tareas enable row level security;
drop policy if exists "Publico registra eventos comerciales sin PII" on public.crm_eventos;
create policy "Publico registra eventos comerciales sin PII" on public.crm_eventos for insert to anon, authenticated with check (cliente_id is null and proyecto_id is null and publicacion_id is null and evento = any(array['parcela_view','filtros_usados','mapa_abierto','whatsapp_click','cotizador_iniciado','casa_seleccionada','tipo_constructivo_seleccionado','extra_seleccionado','cotizacion_guardada','pdf_generado','publicacion_iniciada','publicacion_finalizada']) and public.crm_metadata_evento_segura(metadata));
drop policy if exists "Administradores leen eventos comerciales" on public.crm_eventos;
create policy "Administradores leen eventos comerciales" on public.crm_eventos for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.tipo = 'administrador' and p.activo));
drop policy if exists "Administradores gestionan eventos comerciales" on public.crm_eventos;
create policy "Administradores gestionan eventos comerciales" on public.crm_eventos for all to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.tipo='administrador' and p.activo)) with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.tipo='administrador' and p.activo));
drop policy if exists "Administradores gestionan tareas" on public.crm_tareas;
create policy "Administradores gestionan tareas" on public.crm_tareas for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.tipo = 'administrador' and p.activo)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.tipo = 'administrador' and p.activo));
grant insert on public.crm_eventos to anon, authenticated;
grant usage, select on sequence public.crm_eventos_id_seq to anon, authenticated;
grant select, insert, update on public.crm_tareas to authenticated;

create or replace function public.crm_procesar_evento_lanzamiento() returns trigger language plpgsql security definer set search_path = public as $$
declare v_etapa text; v_titulo text; v_tipo text; v_vence timestamptz; v_prioridad text := 'media'; v_plazo numeric; v_fecha_visita timestamptz;
begin
  v_etapa := coalesce(new.etapa, case new.evento when 'parcela_view' then 'vio_parcela' when 'informacion_solicitada' then 'solicito_informacion' when 'visita_solicitada' then 'solicito_visita' when 'cotizador_iniciado' then 'inicio_cotizacion' when 'cotizacion_guardada' then 'guardo_cotizacion' when 'proyecto_activado' then 'activo_proyecto' when 'contacto_registrado' then 'contactado' when 'negociacion_iniciada' then 'negociando' when 'oportunidad_ganada' then 'cerro' when 'oportunidad_perdida' then 'abandono' else null end);
  if new.cliente_id is not null and v_etapa is not null then update public.clientes set etapa=v_etapa, etapa_ingresada_en=case when etapa is distinct from v_etapa then now() else etapa_ingresada_en end, ultima_interaccion_en=now(), origen=coalesce(origen,new.origen), actualizado_en=now() where id=new.cliente_id; end if;
  case new.evento when 'informacion_solicitada' then v_tipo:='contactar_nuevo'; v_titulo:='Contactar nuevo interesado'; v_vence:=now(); v_prioridad:='alta'; when 'visita_solicitada' then v_tipo:='confirmar_visita'; v_titulo:='Confirmar visita solicitada'; v_vence:=now(); v_prioridad:='alta'; when 'cotizacion_guardada' then select valor_numero into v_plazo from public.crm_configuracion where clave='cotizacion_sin_activar_dias'; v_tipo:='seguir_cotizacion'; v_titulo:='Revisar cotización sin activar'; v_vence:=now()+make_interval(days=>coalesce(v_plazo,2)::integer); when 'proyecto_activado' then v_tipo:='revisar_proyecto'; v_titulo:='Revisar proyecto activado'; v_vence:=now(); v_prioridad:='alta'; else null; end case;
  if v_tipo is not null and new.cliente_id is not null then insert into public.crm_tareas(cliente_id,proyecto_id,tipo,titulo,prioridad,vence_en,origen_evento_id) values(new.cliente_id,new.proyecto_id,v_tipo,v_titulo,v_prioridad,v_vence,new.id) on conflict do nothing; end if;
  if new.evento='informacion_solicitada' and new.cliente_id is not null then select valor_numero into v_plazo from public.crm_configuracion where clave='consulta_sin_respuesta_horas'; insert into public.crm_tareas(cliente_id,tipo,titulo,prioridad,vence_en,origen_evento_id) values(new.cliente_id,'revisar_sin_respuesta','Verificar consulta sin respuesta','media',now()+make_interval(hours=>coalesce(v_plazo,24)::integer),new.id) on conflict do nothing; end if;
  if new.evento='visita_solicitada' and new.cliente_id is not null and nullif(new.metadata->>'fecha_visita','') is not null then begin v_fecha_visita:=(new.metadata->>'fecha_visita')::timestamptz; select valor_numero into v_plazo from public.crm_configuracion where clave='visita_recordatorio_previo_dias'; insert into public.crm_tareas(cliente_id,tipo,titulo,prioridad,vence_en,origen_evento_id) values(new.cliente_id,'recordar_visita','Recordatorio previo a visita','alta',v_fecha_visita-make_interval(days=>coalesce(v_plazo,1)::integer),new.id) on conflict do nothing; select valor_numero into v_plazo from public.crm_configuracion where clave='visita_seguimiento_post_dias'; insert into public.crm_tareas(cliente_id,tipo,titulo,prioridad,vence_en,origen_evento_id) values(new.cliente_id,'seguimiento_post_visita','Seguimiento posterior a visita','media',v_fecha_visita+make_interval(days=>coalesce(v_plazo,1)::integer),new.id) on conflict do nothing; exception when others then null; end; end if;
  return new;
end; $$;
drop trigger if exists tr_crm_procesar_evento_lanzamiento on public.crm_eventos;
create trigger tr_crm_procesar_evento_lanzamiento after insert on public.crm_eventos for each row execute function public.crm_procesar_evento_lanzamiento();
create or replace view public.crm_resumen_embudo with (security_invoker=true) as select etapa,count(*)::integer personas,avg(extract(epoch from(now()-etapa_ingresada_en))/86400)::numeric(10,2) dias_promedio from public.clientes group by etapa;
grant select on public.crm_resumen_embudo to authenticated;
-- Registro público mediante RPC: evita exponer SELECT/UPDATE de clientes al rol anónimo.
drop policy if exists "Anon puede interactuar con clientes" on public.clientes;
drop policy if exists "Public insert clientes" on public.clientes;
drop policy if exists "Anon puede insertar proyectos" on public.proyectos;
drop policy if exists "Public insert proyectos" on public.proyectos;
revoke all on public.clientes from anon;
revoke all on public.proyectos from anon;
revoke all on public.proyecto_items from anon;

drop policy if exists "Admin full access clientes" on public.clientes;
create policy "Admin full access clientes" on public.clientes for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Admin full access proyectos" on public.proyectos;
create policy "Admin full access proyectos" on public.proyectos for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Admin full access proyecto_items" on public.proyecto_items;
create policy "Admin full access proyecto_items" on public.proyecto_items for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Admin full access casas" on public.casas;
create policy "Admin full access casas" on public.casas for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

drop policy if exists "Admin full access extras" on public.extras;
create policy "Admin full access extras" on public.extras for all to authenticated
using (public.es_administrador_activo())
with check (public.es_administrador_activo());

do $$
begin
  if to_regclass('public.visitas') is not null then
    execute 'drop policy if exists "Admin full access visitas" on public.visitas';
    execute 'create policy "Admin full access visitas" on public.visitas for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo())';
  end if;
end
$$;

create or replace function public.crm_registrar_oportunidad_publica(
  p_cliente jsonb,
  p_proyecto jsonb default null,
  p_evento text default 'informacion_solicitada',
  p_etapa text default 'solicito_informacion',
  p_origen text default 'web',
  p_pagina text default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_cliente_id uuid;
  v_proyecto_id uuid;
  v_correo text := nullif(lower(trim(p_cliente->>'correo')),'');
  v_telefono text := nullif(regexp_replace(coalesce(p_cliente->>'telefono',''),'[^0-9+]','','g'),'');
  v_total numeric := coalesce(nullif(p_proyecto->>'cotizacion_referencial','')::numeric,nullif(p_proyecto->>'total','')::numeric,0);
  v_score integer := 0;
  v_prioridad text;
  v_score_detalle jsonb;
  v_parcela uuid;
  v_casa uuid;
begin
  if p_evento <> all(array['informacion_solicitada','visita_solicitada','cotizacion_guardada','proyecto_activado']) then raise exception 'Evento comercial no permitido'; end if;
  if p_etapa <> all(array['solicito_informacion','solicito_visita','guardo_cotizacion','activo_proyecto']) then raise exception 'Etapa comercial no permitida'; end if;
  if nullif(trim(p_cliente->>'nombre'),'') is null then raise exception 'Nombre requerido'; end if;
  if v_correo is null and v_telefono is null then raise exception 'Correo o teléfono requerido'; end if;
  select id into v_cliente_id from public.clientes where (v_correo is not null and lower(correo)=v_correo) or (v_telefono is not null and regexp_replace(coalesce(telefono,''),'[^0-9+]','','g')=v_telefono) order by creado_en desc limit 1;
  if p_evento='visita_solicitada' then v_score:=v_score+40; end if;
  if p_evento in ('cotizacion_guardada','proyecto_activado') then v_score:=v_score+20; end if;
  if p_evento='proyecto_activado' then v_score:=v_score+50; end if;
  if v_total>=30000000 then v_score:=v_score+30; end if;
  if nullif(p_proyecto->>'casa_id','') is not null then v_score:=v_score+10; end if;
  if p_cliente->>'urgencia'='alta' then v_score:=v_score+25; end if;
  v_prioridad:=case when v_score>=80 then 'Alta prioridad' when v_score>=40 then 'Prioridad media' when v_score>=10 then 'Prioridad baja' else 'Seguimiento pendiente' end;
  v_score_detalle:=jsonb_build_object('visita',case when p_evento='visita_solicitada' then 40 else 0 end,'cotizacion',case when p_evento in ('cotizacion_guardada','proyecto_activado') then 20 else 0 end,'proyecto_activado',case when p_evento='proyecto_activado' then 50 else 0 end,'presupuesto_suficiente',case when v_total>=30000000 then 30 else 0 end,'incluyo_casa',case when nullif(p_proyecto->>'casa_id','') is not null then 10 else 0 end,'urgencia',case when p_cliente->>'urgencia'='alta' then 25 else 0 end);
  if v_cliente_id is null then
    insert into public.clientes(nombre,apellido,correo,telefono,whatsapp,comuna,region,presupuesto_estimado,observaciones,acepta_tratamiento_datos,estado,score,prioridad,score_detalle,etapa,etapa_ingresada_en,ultima_interaccion_en,origen,urgencia)
    values(trim(p_cliente->>'nombre'),p_cliente->>'apellido',v_correo,v_telefono,p_cliente->>'whatsapp',p_cliente->>'comuna',p_cliente->>'region',coalesce(nullif(p_cliente->>'presupuesto_estimado','')::numeric,v_total),p_cliente->>'observaciones',coalesce((p_cliente->>'acepta_tratamiento_datos')::boolean,false),coalesce(p_cliente->>'estado','nuevo'),v_score,v_prioridad,v_score_detalle,p_etapa,now(),now(),p_origen,p_cliente->>'urgencia') returning id into v_cliente_id;
  else
    update public.clientes set score=greatest(score,v_score),prioridad=case when v_score>score then v_prioridad else prioridad end,score_detalle=case when v_score>=score then v_score_detalle else score_detalle end,ultima_interaccion_en=now(),origen=coalesce(origen,p_origen),actualizado_en=now() where id=v_cliente_id;
  end if;
  if p_proyecto is not null then
    if coalesce(p_proyecto->>'parcela_id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then v_parcela:=(p_proyecto->>'parcela_id')::uuid; end if;
    if coalesce(p_proyecto->>'casa_id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then v_casa:=(p_proyecto->>'casa_id')::uuid; end if;
    if p_evento='proyecto_activado' then
      select id into v_proyecto_id from public.proyectos where cliente_id=v_cliente_id and estado='cotizacion_generada' order by creado_en desc limit 1;
    end if;
    if v_proyecto_id is null then
      insert into public.proyectos(cliente_id,parcela_id,casa_id,modalidad,estado,subtotal,total,origen,activado_en,observaciones_cliente)
      values(v_cliente_id,v_parcela,v_casa,coalesce(p_proyecto->>'modalidad','llave_en_mano'),coalesce(p_proyecto->>'estado','cotizacion_generada'),v_total,v_total,p_origen,case when p_evento='proyecto_activado' then now() else null end,p_cliente->>'observaciones') returning id into v_proyecto_id;
    else
      update public.proyectos set parcela_id=coalesce(v_parcela,parcela_id),casa_id=coalesce(v_casa,casa_id),estado='activo',subtotal=v_total,total=v_total,activado_en=now(),actualizado_en=now() where id=v_proyecto_id;
    end if;
  end if;
  insert into public.crm_eventos(evento,etapa,cliente_id,proyecto_id,origen,pagina,metadata)
  values(p_evento,p_etapa,v_cliente_id,v_proyecto_id,left(p_origen,120),left(p_pagina,180),jsonb_strip_nulls(jsonb_build_object('parcela_codigo',left(p_metadata->>'parcela_codigo',80),'casa_codigo',left(p_metadata->>'casa_codigo',80),'fecha_visita',left(p_metadata->>'fecha_visita',40),'valor',p_metadata->'valor','origen',left(p_origen,120))));
  return jsonb_build_object('success',true,'clienteId',v_cliente_id,'proyectoId',v_proyecto_id,'score',v_score,'prioridad',v_prioridad);
end; $$;
revoke all on function public.crm_registrar_oportunidad_publica(jsonb,jsonb,text,text,text,text,jsonb) from public;
grant execute on function public.crm_registrar_oportunidad_publica(jsonb,jsonb,text,text,text,text,jsonb) to anon,authenticated;
