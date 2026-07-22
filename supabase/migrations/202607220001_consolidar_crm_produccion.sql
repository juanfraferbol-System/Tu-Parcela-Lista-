-- Consolidación del CRM Tu Parcela Lista.
-- Ejecutar una sola vez después de las migraciones anteriores.

begin;

grant usage on schema public to authenticated;

-- El CRM debe operar solamente para administradores activos.
create or replace function public.es_administrador_activo()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.tipo = 'administrador'
      and coalesce(p.activo, true) = true
  );
$$;

revoke all on function public.es_administrador_activo() from public, anon;
grant execute on function public.es_administrador_activo() to authenticated;

-- Completa el modelo de contratistas esperado por la interfaz sin perder campos antiguos.
do $$
begin
  if to_regclass('public.contratistas') is not null then
    alter table public.contratistas add column if not exists nombre_comercial text;
    alter table public.contratistas add column if not exists whatsapp text;
    alter table public.contratistas add column if not exists region text;
    alter table public.contratistas add column if not exists comunas_atendidas text;
    alter table public.contratistas add column if not exists tipo_servicio text;
    alter table public.contratistas add column if not exists rating numeric(3,2) default 0;
    alter table public.contratistas add column if not exists plan_elegido text default 'gratis';
    alter table public.contratistas add column if not exists estado_verificacion text default 'pendiente';

    update public.contratistas
    set nombre_comercial = coalesce(nullif(nombre_comercial, ''), nombre_empresa),
        whatsapp = coalesce(nullif(whatsapp, ''), telefono),
        region = coalesce(nullif(region, ''), ubicacion_base),
        tipo_servicio = coalesce(nullif(tipo_servicio, ''), notas_capacidades),
        estado_verificacion = coalesce(nullif(estado_verificacion, ''), 'pendiente')
    where nombre_comercial is null
       or whatsapp is null
       or region is null
       or tipo_servicio is null
       or estado_verificacion is null;
  end if;
end
$$;

-- Privilegios mínimos de tablas que usa directamente el dashboard.
do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'profiles','clientes','crm_tareas','proyectos','crm_eventos','publicaciones',
    'contratistas','tasaciones','configuracion_tasador'
  ] loop
    if to_regclass('public.' || tabla) is not null then
      execute format('grant select on table public.%I to authenticated', tabla);
    end if;
  end loop;

  foreach tabla in array array['clientes','crm_tareas','crm_eventos','contratistas'] loop
    if to_regclass('public.' || tabla) is not null then
      execute format('grant insert, update on table public.%I to authenticated', tabla);
    end if;
  end loop;
end
$$;

-- Políticas administrativas uniformes para las tablas internas del CRM.
do $$
declare
  tabla text;
  policy_name text;
begin
  foreach tabla in array array[
    'profiles','clientes','crm_tareas','proyectos','crm_eventos','publicaciones',
    'contratistas','tasaciones','configuracion_tasador'
  ] loop
    if to_regclass('public.' || tabla) is not null then
      execute format('alter table public.%I enable row level security', tabla);
      policy_name := 'CRM administradores ' || tabla;
      execute format('drop policy if exists %I on public.%I', policy_name, tabla);
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.es_administrador_activo()) with check (public.es_administrador_activo())',
        policy_name,
        tabla
      );
    end if;
  end loop;
end
$$;

-- La vista del embudo hereda la seguridad de clientes.
do $$
begin
  if to_regclass('public.crm_resumen_embudo') is not null then
    grant select on public.crm_resumen_embudo to authenticated;
  end if;
end
$$;

-- Funciones RPC utilizadas por crm.js.
do $$
declare
  signature text;
begin
  foreach signature in array array[
    'public.crm_sesion_actual()',
    'public.crm_contadores_publicaciones()',
    'public.crm_listar_publicaciones(text,date,date,text,text,text)',
    'public.crm_detalle_publicacion(uuid)',
    'public.crm_moderar_publicacion(uuid,text,text,text,text[],text,boolean)'
  ] loop
    if to_regprocedure(signature) is not null then
      execute 'grant execute on function ' || signature || ' to authenticated';
    end if;
  end loop;
end
$$;

commit;
