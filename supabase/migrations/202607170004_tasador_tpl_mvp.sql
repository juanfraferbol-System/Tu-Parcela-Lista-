alter table public.publicaciones add column if not exists usuario_id uuid references auth.users(id) on delete set null;
alter table public.publicaciones add column if not exists tipo_precio_actual text not null default 'precio_publicado_solicitado';
alter table public.publicaciones add column if not exists precio_propietario_solicitado bigint check (precio_propietario_solicitado is null or precio_propietario_solicitado >= 0);
alter table public.publicaciones add column if not exists porcentaje_servicio numeric(7,4) check (porcentaje_servicio is null or porcentaje_servicio between 0 and 1);
alter table public.publicaciones add column if not exists monto_servicio bigint check (monto_servicio is null or monto_servicio >= 0);
alter table public.publicaciones add column if not exists precio_publico bigint check (precio_publico is null or precio_publico >= 0);
alter table public.publicaciones add column if not exists latitud_publica numeric;
alter table public.publicaciones add column if not exists longitud_publica numeric;
alter table public.publicaciones add column if not exists precision_ubicacion text;
alter table public.publicaciones add column if not exists consentimiento_uso_ubicacion boolean not null default false;
alter table public.publicaciones add column if not exists consentimiento_uso_ubicacion_en timestamptz;

update public.publicaciones
set precio_publico = precio_publicacion,
    tipo_precio_actual = 'precio_publicado_solicitado'
where precio_publico is null;

insert into public.crm_configuracion(clave,valor_numero,descripcion)
values('partner_service_percent',0.02,'Porcentaje configurable del Servicio Partner TPL')
on conflict (clave) do nothing;

alter table public.publicaciones drop constraint if exists publicaciones_tipo_precio_actual_valido;
alter table public.publicaciones add constraint publicaciones_tipo_precio_actual_valido check (
  tipo_precio_actual in (
    'precio_publicado_solicitado',
    'precio_negociado_declarado',
    'precio_final_declarado',
    'precio_final_verificado'
  )
);

create table public.planes_comerciales (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  tipo_usuario text not null check (tipo_usuario in ('propietario','corredor','administrador')),
  precio_clp bigint not null default 0 check (precio_clp >= 0),
  periodo text not null default 'ciclo_facturacion' check (periodo in ('sin_periodo','ciclo_facturacion','credito')),
  limite_publicaciones integer check (limite_publicaciones is null or limite_publicaciones >= 0),
  limite_tasaciones integer check (limite_tasaciones is null or limite_tasaciones >= 0),
  nivel_informe text not null default 'basico' check (nivel_informe in ('basico','premium')),
  permite_pdf boolean not null default false,
  permite_comparables boolean not null default false,
  permite_historial boolean not null default false,
  permite_revision_humana boolean not null default false,
  politica_uso_razonable jsonb not null default '{}'::jsonb,
  estado text not null default 'borrador' check (estado in ('borrador','activo','inactivo','retirado')),
  vigente_desde timestamptz,
  vigente_hasta timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.suscripciones_comerciales (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.planes_comerciales(id) on delete restrict,
  estado text not null default 'pendiente' check (estado in ('pendiente','activa','pausada','vencida','cancelada')),
  ciclo_inicia_en timestamptz,
  ciclo_termina_en timestamptz,
  proveedor_pago text,
  referencia_externa text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (proveedor_pago, referencia_externa)
);

create table public.creditos_tasador (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  cantidad_total integer not null check (cantidad_total > 0),
  cantidad_disponible integer not null check (cantidad_disponible >= 0 and cantidad_disponible <= cantidad_total),
  vence_en timestamptz,
  origen text not null,
  referencia_externa text,
  creado_en timestamptz not null default now()
);

create table public.configuracion_tasador (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  estado text not null default 'borrador' check (estado in ('borrador','activa','retirada')),
  algoritmo text not null default 'mediana_comparables_v1',
  parametros jsonb not null,
  vigente_desde timestamptz,
  aprobado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now()
);

create unique index configuracion_tasador_una_activa_idx
on public.configuracion_tasador ((estado)) where estado = 'activa';

insert into public.configuracion_tasador(version,estado,algoritmo,parametros,vigente_desde)
values (
  'tpl-mvp-1.0.0',
  'activa',
  'mediana_comparables_v1',
  jsonb_build_object(
    'comparables_minimos',3,
    'comparables_maximos',15,
    'cobertura_suficiente_desde',12,
    'cobertura_limitada_desde',6,
    'cobertura_experimental_desde',3,
    'antiguedad_maxima_dias',1095,
    'distancia_maxima_km',150,
    'superficie_relacion_minima',0.25,
    'umbral_cambio_precio_porcentaje',10,
    'niveles_permitidos',jsonb_build_array('basica'),
    'fuentes_precio_permitidas',jsonb_build_array('precio_publicado_solicitado','precio_final_declarado','precio_final_verificado')
  ),
  now()
)
on conflict (version) do nothing;

create table public.historial_precios_publicacion (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  tipo_precio text not null check (tipo_precio in ('precio_publicado_solicitado','precio_propietario_solicitado','comision_servicio','precio_publico','precio_negociado_declarado','precio_final_declarado','precio_final_verificado')),
  monto bigint not null check (monto >= 0),
  moneda text not null default 'CLP',
  fuente text not null,
  nivel_verificacion text not null default 'sin_verificar' check (nivel_verificacion in ('sin_verificar','limitada','documental','verificada')),
  motivo text,
  usuario_id uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now()
);

insert into public.historial_precios_publicacion(publicacion_id,tipo_precio,monto,fuente,nivel_verificacion,motivo,creado_en)
select p.id,'precio_publicado_solicitado',p.precio_publicacion,'migracion_publicaciones','sin_verificar','Precio solicitado/publicado existente; no corresponde a venta.',p.creado_en
from public.publicaciones p
where p.precio_publicacion is not null
and not exists (
  select 1 from public.historial_precios_publicacion h
  where h.publicacion_id = p.id and h.tipo_precio = 'precio_publicado_solicitado'
);

create table public.ventas_declaradas (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid references public.publicaciones(id) on delete set null,
  usuario_id uuid references auth.users(id) on delete set null,
  region text not null,
  comuna text not null,
  sector text,
  superficie_m2 numeric not null check (superficie_m2 > 0),
  precio_final bigint not null check (precio_final > 0),
  fecha_venta date,
  fecha_precision text not null default 'aproximada' check (fecha_precision in ('exacta','aproximada','mes','desconocida')),
  fuente text not null,
  tipo_fuente text not null check (tipo_fuente in ('propietario','corredor','administrador','documento','fuente_publica_autorizada')),
  nivel_verificacion text not null default 'limitada' check (nivel_verificacion in ('limitada','declarada','documental','verificada')),
  evidencia_storage_path text,
  permite_uso_agregado boolean not null default false,
  mantener_privado boolean not null default true,
  hubo_comision boolean,
  motivo_cierre text,
  tipo_comprador text,
  observaciones text,
  revisado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now()
);

create table public.publicacion_eventos (
  id bigint generated always as identity primary key,
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  evento text not null check (evento in ('creada','publicada','precio_cambiado','pausada','reactivada','consulta_recibida','visita_solicitada','reservada','venta_declarada','cerrada')),
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create table public.tasaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  publicacion_id uuid references public.publicaciones(id) on delete set null,
  sesion_anonima_id uuid,
  access_token_hash text not null unique check (access_token_hash ~ '^[0-9a-f]{64}$'),
  propiedad_key text not null check (propiedad_key ~ '^[0-9a-f]{64}$'),
  huella_material text not null check (huella_material ~ '^[0-9a-f]{64}$'),
  nivel text not null default 'basica' check (nivel in ('basica','premium')),
  estado text not null default 'generada_automaticamente' check (estado in ('generada_automaticamente','pendiente_revision','revisada','ajustada','rechazada_datos_insuficientes')),
  datos_entrada jsonb not null,
  precio_ingresado bigint check (precio_ingresado is null or precio_ingresado >= 0),
  valor_minimo bigint,
  valor_mercado bigint,
  valor_maximo bigint,
  venta_rapida bigint,
  precio_m2 numeric,
  diferencia_porcentual numeric,
  confianza text not null check (confianza in ('alta','media','baja','informacion_insuficiente')),
  confianza_puntaje numeric not null default 0 check (confianza_puntaje between 0 and 100),
  cobertura text not null check (cobertura in ('suficiente','limitada','experimental','informacion_insuficiente')),
  resumen_factores jsonb not null default '{}'::jsonb,
  algoritmo_version text not null,
  configuracion_id uuid not null references public.configuracion_tasador(id) on delete restrict,
  precio_final_elegido bigint,
  decision_usuario text check (decision_usuario in ('mantener_original','adoptar_mercado','otro','sin_decision')),
  recalculada_desde uuid references public.tasaciones(id) on delete set null,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create unique index tasaciones_basica_usuario_propiedad_idx
on public.tasaciones ((coalesce(usuario_id,'00000000-0000-0000-0000-000000000000'::uuid)),propiedad_key,nivel)
where nivel = 'basica' and estado <> 'rechazada_datos_insuficientes';

create table public.tasacion_comparables (
  id uuid primary key default gen_random_uuid(),
  tasacion_id uuid not null references public.tasaciones(id) on delete cascade,
  publicacion_comparable_id uuid references public.publicaciones(id) on delete set null,
  fuente_tipo text not null,
  fuente_id text,
  datos_snapshot jsonb not null,
  precio_m2 numeric not null check (precio_m2 > 0),
  distancia_km numeric,
  antiguedad_dias integer,
  similitud numeric not null check (similitud between 0 and 1),
  peso numeric not null check (peso between 0 and 1),
  incluido boolean not null default true,
  motivo_descarte text,
  creado_en timestamptz not null default now()
);

create table public.tasacion_factores (
  id uuid primary key default gen_random_uuid(),
  tasacion_id uuid not null references public.tasaciones(id) on delete cascade,
  codigo text not null,
  valor_entrada jsonb,
  peso numeric,
  efecto numeric,
  explicacion text,
  fuente text,
  creado_en timestamptz not null default now()
);

create table public.consumos_tasador (
  id uuid primary key default gen_random_uuid(),
  tasacion_id uuid references public.tasaciones(id) on delete set null,
  usuario_id uuid references auth.users(id) on delete set null,
  sesion_anonima_id uuid,
  propiedad_key text not null,
  plan_id uuid references public.planes_comerciales(id) on delete set null,
  suscripcion_id uuid references public.suscripciones_comerciales(id) on delete set null,
  credito_id uuid references public.creditos_tasador(id) on delete set null,
  tipo_uso text not null check (tipo_uso in ('gratuita_propiedad','incluida_plan','credito','reapertura','administrador')),
  consumio_unidad boolean not null,
  abuse_signal_hash text,
  ciclo_inicia_en timestamptz,
  ciclo_termina_en timestamptz,
  idempotency_key uuid not null unique,
  creado_en timestamptz not null default now()
);

create table public.revisiones_tasacion (
  id uuid primary key default gen_random_uuid(),
  tasacion_id uuid not null references public.tasaciones(id) on delete cascade,
  revisor_id uuid not null references auth.users(id) on delete restrict,
  estado_anterior text not null,
  estado_nuevo text not null,
  motivo text not null,
  resultado_anterior jsonb not null,
  resultado_nuevo jsonb not null,
  creado_en timestamptz not null default now()
);

create index tasaciones_usuario_fecha_idx on public.tasaciones(usuario_id,creada_en desc);
create index tasaciones_publicacion_fecha_idx on public.tasaciones(publicacion_id,creada_en desc);
create index tasaciones_cobertura_idx on public.tasaciones(cobertura,confianza,creada_en desc);
create index tasacion_comparables_tasacion_idx on public.tasacion_comparables(tasacion_id,peso desc);
create index historial_precios_publicacion_fecha_idx on public.historial_precios_publicacion(publicacion_id,creado_en desc);
create index ventas_declaradas_zona_idx on public.ventas_declaradas(comuna,sector,fecha_venta desc);
create index publicacion_eventos_historial_idx on public.publicacion_eventos(publicacion_id,creado_en desc);
create index consumos_tasador_usuario_fecha_idx on public.consumos_tasador(usuario_id,creado_en desc);

alter table public.planes_comerciales enable row level security;
alter table public.suscripciones_comerciales enable row level security;
alter table public.creditos_tasador enable row level security;
alter table public.configuracion_tasador enable row level security;
alter table public.historial_precios_publicacion enable row level security;
alter table public.ventas_declaradas enable row level security;
alter table public.publicacion_eventos enable row level security;
alter table public.tasaciones enable row level security;
alter table public.tasacion_comparables enable row level security;
alter table public.tasacion_factores enable row level security;
alter table public.consumos_tasador enable row level security;
alter table public.revisiones_tasacion enable row level security;

revoke all on public.planes_comerciales, public.suscripciones_comerciales, public.creditos_tasador,
  public.configuracion_tasador, public.historial_precios_publicacion, public.ventas_declaradas,
  public.publicacion_eventos, public.tasaciones, public.tasacion_comparables, public.tasacion_factores,
  public.consumos_tasador, public.revisiones_tasacion from anon, authenticated;

grant select on public.planes_comerciales to authenticated;
grant select on public.suscripciones_comerciales, public.creditos_tasador, public.tasaciones,
  public.tasacion_comparables, public.tasacion_factores, public.consumos_tasador to authenticated;
grant select,insert,update on public.planes_comerciales, public.suscripciones_comerciales,
  public.creditos_tasador, public.configuracion_tasador, public.historial_precios_publicacion,
  public.ventas_declaradas, public.publicacion_eventos, public.tasaciones,
  public.tasacion_comparables, public.tasacion_factores, public.consumos_tasador,
  public.revisiones_tasacion to authenticated;

create policy planes_comerciales_lectura_activos on public.planes_comerciales
for select to authenticated using (estado = 'activo' or public.es_administrador_activo());
create policy planes_comerciales_admin on public.planes_comerciales
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy suscripciones_propias on public.suscripciones_comerciales
for select to authenticated using (usuario_id = auth.uid() or public.es_administrador_activo());
create policy suscripciones_admin on public.suscripciones_comerciales
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy creditos_propios on public.creditos_tasador
for select to authenticated using (usuario_id = auth.uid() or public.es_administrador_activo());
create policy creditos_admin on public.creditos_tasador
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy configuracion_tasador_admin on public.configuracion_tasador
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy historial_precios_admin on public.historial_precios_publicacion
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy ventas_declaradas_propias on public.ventas_declaradas
for select to authenticated using (usuario_id = auth.uid() or public.es_administrador_activo());
create policy ventas_declaradas_admin on public.ventas_declaradas
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy publicacion_eventos_admin on public.publicacion_eventos
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy tasaciones_propias on public.tasaciones
for select to authenticated using (usuario_id = auth.uid() or public.es_administrador_activo());
create policy tasaciones_admin on public.tasaciones
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy tasacion_comparables_propios on public.tasacion_comparables
for select to authenticated using (exists(select 1 from public.tasaciones t where t.id=tasacion_id and (t.usuario_id=auth.uid() or public.es_administrador_activo())));
create policy tasacion_comparables_admin on public.tasacion_comparables
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy tasacion_factores_propios on public.tasacion_factores
for select to authenticated using (exists(select 1 from public.tasaciones t where t.id=tasacion_id and (t.usuario_id=auth.uid() or public.es_administrador_activo())));
create policy tasacion_factores_admin on public.tasacion_factores
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy consumos_tasador_propios on public.consumos_tasador
for select to authenticated using (usuario_id=auth.uid() or public.es_administrador_activo());
create policy consumos_tasador_admin on public.consumos_tasador
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());
create policy revisiones_tasacion_admin on public.revisiones_tasacion
for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo());

create or replace function public.registrar_tasacion_mvp(
  p_tasacion jsonb,
  p_comparables jsonb,
  p_factores jsonb,
  p_consumo jsonb
)
returns table (id uuid, creada_en timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_creada timestamptz;
  v_comparable jsonb;
  v_factor jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'Acceso denegado'; end if;
  insert into public.tasaciones(
    usuario_id,publicacion_id,sesion_anonima_id,access_token_hash,propiedad_key,huella_material,
    nivel,estado,datos_entrada,precio_ingresado,valor_minimo,valor_mercado,valor_maximo,
    venta_rapida,precio_m2,diferencia_porcentual,confianza,confianza_puntaje,cobertura,
    resumen_factores,algoritmo_version,configuracion_id,decision_usuario
  ) values (
    nullif(p_tasacion->>'usuario_id','')::uuid,nullif(p_tasacion->>'publicacion_id','')::uuid,
    nullif(p_tasacion->>'sesion_anonima_id','')::uuid,p_tasacion->>'access_token_hash',
    p_tasacion->>'propiedad_key',p_tasacion->>'huella_material',coalesce(p_tasacion->>'nivel','basica'),
    p_tasacion->>'estado',p_tasacion->'datos_entrada',nullif(p_tasacion->>'precio_ingresado','')::bigint,
    nullif(p_tasacion->>'valor_minimo','')::bigint,nullif(p_tasacion->>'valor_mercado','')::bigint,
    nullif(p_tasacion->>'valor_maximo','')::bigint,nullif(p_tasacion->>'venta_rapida','')::bigint,
    nullif(p_tasacion->>'precio_m2','')::numeric,nullif(p_tasacion->>'diferencia_porcentual','')::numeric,
    p_tasacion->>'confianza',coalesce((p_tasacion->>'confianza_puntaje')::numeric,0),
    p_tasacion->>'cobertura',coalesce(p_tasacion->'resumen_factores','{}'::jsonb),
    p_tasacion->>'algoritmo_version',(p_tasacion->>'configuracion_id')::uuid,'sin_decision'
  ) returning tasaciones.id,tasaciones.creada_en into v_id,v_creada;

  for v_comparable in select value from jsonb_array_elements(coalesce(p_comparables,'[]'::jsonb)) loop
    insert into public.tasacion_comparables(
      tasacion_id,publicacion_comparable_id,fuente_tipo,fuente_id,datos_snapshot,precio_m2,
      distancia_km,antiguedad_dias,similitud,peso,incluido,motivo_descarte
    ) values (
      v_id,nullif(v_comparable->>'publicacion_comparable_id','')::uuid,v_comparable->>'fuente_tipo',
      v_comparable->>'fuente_id',v_comparable->'datos_snapshot',(v_comparable->>'precio_m2')::numeric,
      nullif(v_comparable->>'distancia_km','')::numeric,nullif(v_comparable->>'antiguedad_dias','')::integer,
      (v_comparable->>'similitud')::numeric,(v_comparable->>'peso')::numeric,
      coalesce((v_comparable->>'incluido')::boolean,true),v_comparable->>'motivo_descarte'
    );
  end loop;

  for v_factor in select value from jsonb_array_elements(coalesce(p_factores,'[]'::jsonb)) loop
    insert into public.tasacion_factores(tasacion_id,codigo,valor_entrada,peso,efecto,explicacion,fuente)
    values(v_id,v_factor->>'codigo',v_factor->'valor_entrada',nullif(v_factor->>'peso','')::numeric,
      nullif(v_factor->>'efecto','')::numeric,v_factor->>'explicacion',v_factor->>'fuente');
  end loop;

  insert into public.consumos_tasador(
    tasacion_id,usuario_id,sesion_anonima_id,propiedad_key,plan_id,suscripcion_id,credito_id,
    tipo_uso,consumio_unidad,abuse_signal_hash,ciclo_inicia_en,ciclo_termina_en,idempotency_key
  ) values (
    v_id,nullif(p_consumo->>'usuario_id','')::uuid,nullif(p_consumo->>'sesion_anonima_id','')::uuid,
    p_tasacion->>'propiedad_key',nullif(p_consumo->>'plan_id','')::uuid,
    nullif(p_consumo->>'suscripcion_id','')::uuid,nullif(p_consumo->>'credito_id','')::uuid,
    p_consumo->>'tipo_uso',coalesce((p_consumo->>'consumio_unidad')::boolean,true),p_consumo->>'abuse_signal_hash',
    nullif(p_consumo->>'ciclo_inicia_en','')::timestamptz,nullif(p_consumo->>'ciclo_termina_en','')::timestamptz,
    (p_consumo->>'idempotency_key')::uuid
  );
  return query select v_id,v_creada;
end;
$$;

revoke all on function public.registrar_tasacion_mvp(jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.registrar_tasacion_mvp(jsonb,jsonb,jsonb,jsonb) to service_role;
