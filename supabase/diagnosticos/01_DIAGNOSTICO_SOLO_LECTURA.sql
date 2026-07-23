-- ============================================================
-- TU PARCELA LISTA
-- DIAGNÓSTICO DE BASE DE DATOS — SOLO LECTURA
-- SE PUEDE EJECUTAR EN SUPABASE SQL EDITOR
-- No crea, modifica ni elimina datos.
-- ============================================================

-- 1. Tablas del esquema public
select
  c.relname as objeto,
  case c.relkind
    when 'r' then 'table'
    when 'v' then 'view'
    when 'm' then 'materialized_view'
    when 'S' then 'sequence'
    else c.relkind::text
  end as tipo,
  c.relrowsecurity as rls_activo,
  c.relforcerowsecurity as rls_forzado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r','v','m','S')
order by tipo, objeto;

-- 2. Columnas y tipos
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- 3. Políticas RLS
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4. Privilegios otorgados a anon y authenticated
select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;

-- 5. Funciones públicas y argumentos
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as argumentos,
  pg_get_function_result(p.oid) as resultado,
  p.prosecdef as security_definer,
  p.provolatile as volatilidad
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, argumentos;

-- 6. Triggers
select
  event_object_table as tabla,
  trigger_name,
  event_manipulation as evento,
  action_timing as momento,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;

-- 7. Enum y valores
select
  n.nspname as schema_name,
  t.typname as enum_name,
  e.enumsortorder,
  e.enumlabel
from pg_type t
join pg_enum e on t.oid = e.enumtypid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
order by enum_name, e.enumsortorder;

-- 8. Migraciones registradas por Supabase
select version, name, statements
from supabase_migrations.schema_migrations
order by version;

-- 9. Buckets
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by id;

-- 10. Políticas de storage
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;
