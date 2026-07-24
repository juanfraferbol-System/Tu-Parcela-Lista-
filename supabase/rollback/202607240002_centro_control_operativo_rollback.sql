-- ROLLBACK REVISABLE — Fase 2A.1.
-- ADVERTENCIA: elimina flujos, etapas, actividades y bitácora creados por
-- 202607240002. Exportar esas tablas antes de ejecutar si contienen datos.
-- No elimina clientes, publicaciones, proyectos, Landings, leads ni visitas.

begin;

drop function if exists public.crm_centro_control_resumen();
drop function if exists public.crm_mapa_proyectos();
drop function if exists public.crm_centro_control_estados(integer,integer);
drop function if exists public.crm_cliente_operativo(uuid);
drop function if exists public.crm_proyecto_operativo(uuid);
drop function if exists public.crm_centro_control_progreso(uuid);
drop function if exists public.tpl_business_etapas_proyecto(uuid);
drop function if exists public.tpl_business_actividades_proyecto(uuid,integer,integer);

drop trigger if exists tr_crm_actividades_sincronizar_proyecto on public.crm_actividades;
drop trigger if exists tr_tpl_proyectos_comerciales_centro_control_audit
  on public.tpl_proyectos_comerciales;
drop trigger if exists tr_crm_proyecto_etapas_centro_control_audit
  on public.crm_proyecto_etapas;

drop function if exists public.crm_centro_control_sincronizar_proyecto();
drop function if exists public.crm_centro_control_auditar_etapa();
drop function if exists public.crm_centro_control_auditar_proyecto();

drop trigger if exists tr_crm_flujos_centro_control_timestamp on public.crm_flujos;
drop trigger if exists tr_crm_flujo_etapas_centro_control_timestamp on public.crm_flujo_etapas;
drop trigger if exists tr_tpl_cuenta_contactos_centro_control_timestamp on public.tpl_cuenta_contactos;
drop trigger if exists tr_crm_proyecto_etapas_centro_control_timestamp on public.crm_proyecto_etapas;
drop trigger if exists tr_crm_actividades_centro_control_timestamp on public.crm_actividades;
drop trigger if exists tr_crm_tareas_centro_control_timestamp on public.crm_tareas;
drop function if exists public.crm_centro_control_actualizar_timestamp();

-- Columnas de crm_tareas agregadas por esta migración.
drop index if exists public.crm_tareas_proyecto_comercial_idx;
drop index if exists public.crm_tareas_centro_control_idx;
alter table public.crm_tareas
  drop column if exists actualizado_en,
  drop column if exists bloqueante,
  drop column if exists categoria,
  drop column if exists accion_url,
  drop column if exists proyecto_etapa_id,
  drop column if exists responsable_id;

drop table if exists public.crm_centro_control_bitacora;
drop table if exists public.crm_actividades;
drop table if exists public.crm_proyecto_etapas;
drop table if exists public.tpl_cuenta_contactos;

-- Desvincula, pero no elimina, proyectos técnicos.
drop index if exists public.proyectos_proyecto_comercial_idx;
alter table public.proyectos drop column if exists proyecto_comercial_id;

-- Retira solo columnas operativas agregadas al proyecto comercial.
drop index if exists public.tpl_proyectos_comerciales_responsable_idx;
drop index if exists public.tpl_proyectos_comerciales_publicacion_idx;
drop index if exists public.tpl_proyectos_comerciales_operacion_idx;
alter table public.tpl_proyectos_comerciales
  drop constraint if exists tpl_proyectos_comerciales_fechas_check,
  drop constraint if exists tpl_proyectos_comerciales_prioridad_check,
  drop constraint if exists tpl_proyectos_comerciales_tipo_proyecto_check,
  drop column if exists archivado_en,
  drop column if exists proxima_accion_en,
  drop column if exists proxima_accion,
  drop column if exists ultima_actividad_en,
  drop column if exists fecha_objetivo,
  drop column if exists fecha_inicio,
  drop column if exists prioridad,
  drop column if exists flujo_id,
  drop column if exists tipo_proyecto,
  drop column if exists responsable_id,
  drop column if exists publicacion_id;

drop table if exists public.crm_flujo_etapas;
drop table if exists public.crm_flujos;

commit;
