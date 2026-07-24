import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const migrationPath = path.join(root, 'supabase/migrations/202607240002_centro_control_operativo.sql');
const rollbackPath = path.join(root, 'supabase/rollback/202607240002_centro_control_operativo_rollback.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');
const rollback = fs.readFileSync(rollbackPath, 'utf8');

const has = (pattern, message) => assert.match(sql, pattern, message);
const lacks = (pattern, message) => assert.doesNotMatch(sql, pattern, message);

has(/begin;[\s\S]*commit;/i, 'La migración debe ser transaccional');
has(/add column if not exists publicacion_id uuid references public\.publicaciones/i, 'Falta publicación canónica');
has(/add column if not exists responsable_id uuid references public\.profiles/i, 'Falta responsable');
has(/add column if not exists proyecto_comercial_id uuid/i, 'Falta relación proyecto técnico–comercial');

for (const table of [
  'crm_flujos','crm_flujo_etapas','tpl_cuenta_contactos',
  'crm_proyecto_etapas','crm_actividades','crm_centro_control_bitacora'
]) {
  has(new RegExp(`create table if not exists public\\.${table}`, 'i'), `Falta ${table}`);
  has(new RegExp(`alter table public\\.${table} enable row level security`, 'i'), `Falta RLS en ${table}`);
}

for (const state of [
  'no_iniciada','en_proceso','esperando_cliente','esperando_tercero',
  'completada','bloqueada','cancelada'
]) has(new RegExp(`'${state}'`), `Falta estado ${state}`);

for (const flow of [
  'cliente_visita','proyecto_parcela','proyecto_casa',
  'proyecto_casa_parcela','venta_propiedad'
]) has(new RegExp(`'${flow}'`), `Falta flujo ${flow}`);

has(/unique\s*\(proyecto_comercial_id,flujo_etapa_id\)/i, 'Las etapas pueden duplicarse');
has(/when count\(\*\) filter\(where fe\.obligatoria[\s\S]*=0 then null/i, 'El progreso sin etapas debe ser NULL');
has(/public\.es_administrador_activo\(\)/i, 'No reutiliza autorización administrativa');
has(/notas_internas/i, 'Faltan notas internas');
lacks(/grant\s+select[\s\S]{0,120}crm_actividades\s+to\s+anon/i, 'No se deben exponer actividades a anon');
has(/create or replace function public\.crm_centro_control_auditar_etapa/i, 'Falta bitácora de cambios de etapa');
has(/crm_centro_control_progreso[\s\S]*tpl_business_membresias[\s\S]*m\.usuario_id=auth\.uid\(\)/i, 'El progreso no valida membresía');
has(/set search_path=pg_catalog,public,auth/i, 'Las funciones SECURITY DEFINER requieren search_path endurecido');
has(/create or replace function public\.tpl_business_etapas_proyecto/i, 'Falta RPC segura de etapas');
has(/create or replace function public\.tpl_business_actividades_proyecto/i, 'Falta RPC segura de actividades');
lacks(/create policy "TPL Business lee actividades visibles"/i, 'RLS no oculta notas_internas');
const ownerActivities = sql.match(/create or replace function public\.tpl_business_actividades_proyecto[\s\S]*?revoke all on function public\.tpl_business_etapas_proyecto/i)?.[0] || '';
assert.ok(ownerActivities, 'No se pudo aislar la RPC de actividades');
assert.match(ownerActivities, /tpl_business_membresias[\s\S]*visibilidad='cliente'/i, 'La RPC de actividades no aísla proyecto y visibilidad');
assert.doesNotMatch(ownerActivities, /notas_internas/, 'La RPC del propietario expone notas internas');

has(/pc\.codigo='pro-caburgua'/i, 'Falta backfill de Caburgua');
has(/l\.codigo='land-caburgua'/i, 'Caburgua debe priorizar la publicación vinculada a su Landing');
has(/l\.estado='publicada'/i, 'El estado Landing debe basarse en evidencia');
has(/p\.estado='aprobada'/i, 'La publicación completada debe basarse en evidencia');
has(/on conflict\(proyecto_comercial_id,flujo_etapa_id\) do nothing/i, 'Backfill no idempotente');
has(/then least\([\s\S]*pc\.creado_en[\s\S]*publicado_actualizado_en/i, 'El backfill debe tolerar una Landing anterior al proyecto');

for (const fn of [
  'crm_centro_control_resumen','crm_mapa_proyectos','crm_centro_control_estados',
  'crm_cliente_operativo','crm_proyecto_operativo',
  'tpl_business_etapas_proyecto','tpl_business_actividades_proyecto'
]) {
  has(new RegExp(`create or replace function public\\.${fn}`,'i'), `Falta contrato ${fn}`);
  assert.match(rollback, new RegExp(`drop function if exists public\\.${fn}`,'i'), `Rollback no retira ${fn}`);
}

assert.match(rollback, /No elimina clientes, publicaciones, proyectos, Landings, leads ni visitas/i);
assert.doesNotMatch(rollback, /drop table if exists public\.(clientes|publicaciones|proyectos|visitas|tpl_landings_comerciales)/i);

lacks(/alter table public\.crm_eventos[\s\S]*add column/i, 'crm_eventos no debe convertirse en actividad humana');
lacks(/insert into public\.tpl_business_membresias/i, 'No se debe inventar membresía de Caburgua');
lacks(/insert into public\.clientes/i, 'No se debe inventar propietario');

console.log('centro-control-operativo-contract: OK');
