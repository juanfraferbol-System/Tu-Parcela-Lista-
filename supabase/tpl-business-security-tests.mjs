import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(
  new URL('./migrations/202607240001_tpl_business_centro_clientes.sql', import.meta.url),
  'utf8'
);

for (const table of [
  'tpl_business_membresias',
  'tpl_business_modulos_catalogo',
  'tpl_proyecto_modulos',
  'tpl_proyecto_experiencia',
  'tpl_solicitudes_comerciales',
  'tpl_business_accesos'
]) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon`));
}

assert.match(sql, /usuario_id=auth\.uid\(\)/);
assert.match(sql, /public\.tpl_business_usuario_tiene_proyecto\(proyecto_id\)/);
assert.match(sql, /m\.estado='activa'/);
assert.match(sql, /public\.es_administrador_activo\(\)/);
assert.match(sql, /p\.codigo=left\(trim\(p_proyecto_codigo\),120\)/);
assert.match(sql, /raise exception 'No tienes acceso a este proyecto'/);
assert.match(sql, /raise exception 'Acceso administrativo requerido'/);
assert.match(sql, /revoke all on function public\.tpl_business_resumen_proyecto\(uuid,boolean\) from public,anon,authenticated/);

for (const rpc of [
  'tpl_business_sesion_actual',
  'tpl_business_mis_proyectos',
  'tpl_business_proyecto_actual',
  'tpl_business_vista_cliente_admin',
  'tpl_business_registrar_solicitud',
  'tpl_business_registrar_cierre_sesion'
]) {
  assert.match(sql, new RegExp(`create or replace function public\\.${rpc}`));
}

assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete|all)[^;]+to anon/i);
assert.doesNotMatch(sql, /service_role/i);
assert.match(sql, /'definition','Conversiones corresponden a oportunidades reservadas o ganadas\.'/);
assert.match(sql, /jsonb_build_object\(\s*'consultations'/);
const metricsContract = sql.slice(sql.indexOf("v_metrics:=jsonb_build_object("), sql.indexOf("select coalesce(jsonb_agg(jsonb_build_object(", sql.indexOf("v_metrics:=jsonb_build_object(")));
assert.doesNotMatch(metricsContract, /correo|telefono|nombre|mensaje/i);

console.log('tpl-business-security: OK');
