-- Migración 018: Capa 2 y 3 - Triggers Transaccionales de Sincronización y Recálculo Asíncrono (Preflight Validated)
-- Fecha: 2026-07-25
-- Descripción: Conecta cambios transaccionales con el Orquestador Central e incluye worker SQL nativo de cola.

BEGIN;

-- 1. Función disparadora genérica para encolar recálculo de inteligencia comercial (Ligera, O(1))
CREATE OR REPLACE FUNCTION public.trigger_encolar_sync_inteligencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proj_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'tpl_proyectos_comerciales' THEN
    v_proj_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'tpl_suscripciones' THEN
    v_proj_id := NEW.proyecto_id;
  ELSIF TG_TABLE_NAME = 'publicaciones' THEN
    SELECT id INTO v_proj_id FROM public.tpl_proyectos_comerciales WHERE publicacion_id = NEW.id LIMIT 1;
  ELSIF TG_TABLE_NAME IN ('visitas', 'reservas') THEN
    IF TG_TABLE_NAME = 'visitas' AND NEW.publicacion_id IS NOT NULL THEN
      SELECT id INTO v_proj_id FROM public.tpl_proyectos_comerciales WHERE publicacion_id = NEW.publicacion_id LIMIT 1;
    ELSIF TG_TABLE_NAME = 'reservas' AND NEW.proyecto_comercial_id IS NOT NULL THEN
      v_proj_id := NEW.proyecto_comercial_id;
    END IF;
  END IF;

  IF v_proj_id IS NOT NULL THEN
    INSERT INTO public.tpl_automatizaciones_cola (evento, payload, idempotency_key, estado)
    VALUES (
      'orquestador:recalcular',
      jsonb_build_object('proyecto_id', v_proj_id, 'origen_tabla', TG_TABLE_NAME),
      'inteligencia_sync:' || v_proj_id::text || ':' || to_char(now(), 'YYYYMMDD_HH24'),
      'pendiente'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Triggers sobre tablas clave del ecosistema TPL
DROP TRIGGER IF EXISTS trg_inteligencia_sync_proyectos ON public.tpl_proyectos_comerciales;
CREATE TRIGGER trg_inteligencia_sync_proyectos
  AFTER UPDATE OF estado_embudo, nivel_urgencia, tipo_cliente_canonico ON public.tpl_proyectos_comerciales
  FOR EACH ROW EXECUTE FUNCTION public.trigger_encolar_sync_inteligencia();

DROP TRIGGER IF EXISTS trg_inteligencia_sync_suscripciones ON public.tpl_suscripciones;
CREATE TRIGGER trg_inteligencia_sync_suscripciones
  AFTER INSERT OR UPDATE OF estado, plan_id ON public.tpl_suscripciones
  FOR EACH ROW EXECUTE FUNCTION public.trigger_encolar_sync_inteligencia();

DROP TRIGGER IF EXISTS trg_inteligencia_sync_publicaciones ON public.publicaciones;
CREATE TRIGGER trg_inteligencia_sync_publicaciones
  AFTER UPDATE OF estado, precio_publicacion, titulo_publico ON public.publicaciones
  FOR EACH ROW EXECUTE FUNCTION public.trigger_encolar_sync_inteligencia();

DROP TRIGGER IF EXISTS trg_inteligencia_sync_visitas ON public.visitas;
CREATE TRIGGER trg_inteligencia_sync_visitas
  AFTER INSERT ON public.visitas
  FOR EACH ROW EXECUTE FUNCTION public.trigger_encolar_sync_inteligencia();

DROP TRIGGER IF EXISTS trg_inteligencia_sync_reservas ON public.reservas;
CREATE TRIGGER trg_inteligencia_sync_reservas
  AFTER INSERT OR UPDATE OF estado ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.trigger_encolar_sync_inteligencia();

-- 3. Worker SQL Nativo para Procesar Eventos orquestador:recalcular de la Cola
CREATE OR REPLACE FUNCTION public.rpc_procesar_cola_inteligencia_sql(p_limite integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_job record;
  v_count integer := 0;
  v_proj_id uuid;
BEGIN
  FOR v_job IN 
    SELECT * FROM public.rpc_reclamar_trabajos_automatizacion('worker_sql_native', p_limite)
    WHERE evento = 'orquestador:recalcular'
  LOOP
    BEGIN
      v_proj_id := (v_job.payload->>'proyecto_id')::uuid;
      IF v_proj_id IS NOT NULL THEN
        PERFORM public.rpc_recalcular_inteligencia_comercial(v_proj_id);
      END IF;
      
      PERFORM public.rpc_completar_trabajo_automatizacion(v_job.id, 'worker_sql_native');
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      PERFORM public.rpc_fallar_trabajo_automatizacion(v_job.id, 'worker_sql_native', SQLERRM, false);
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_procesar_cola_inteligencia_sql FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_procesar_cola_inteligencia_sql TO service_role;

COMMIT;
