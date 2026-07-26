BEGIN;
CREATE OR REPLACE FUNCTION public.rpc_reclamar_trabajos_automatizacion(p_worker_id text, p_limite integer DEFAULT 1) RETURNS SETOF public.tpl_automatizaciones_cola LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  RETURN QUERY UPDATE public.tpl_automatizaciones_cola SET estado = 'procesando', bloqueado_en = now(), bloqueado_por = p_worker_id, lease_expira_en = now() + interval '5 minutes', intentos = intentos + 1, actualizado_en = now() WHERE id IN (SELECT id FROM public.tpl_automatizaciones_cola WHERE (estado = 'pendiente' AND proxima_ejecucion <= now()) OR (estado = 'error_reintentable' AND proxima_ejecucion <= now() AND intentos < 3) OR (estado = 'procesando' AND lease_expira_en < now()) ORDER BY proxima_ejecucion ASC FOR UPDATE SKIP LOCKED LIMIT p_limite) RETURNING *;
END; $$;
CREATE OR REPLACE FUNCTION public.rpc_completar_trabajo_automatizacion(p_trabajo_id bigint, p_worker_id text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_trabajo record;
BEGIN
  SELECT * INTO v_trabajo FROM public.tpl_automatizaciones_cola WHERE id = p_trabajo_id; IF NOT FOUND THEN RAISE EXCEPTION 'Trabajo no encontrado'; END IF; IF v_trabajo.bloqueado_por IS DISTINCT FROM p_worker_id THEN RAISE EXCEPTION 'Mismatch de Worker ID'; END IF; IF v_trabajo.lease_expira_en < now() THEN RAISE EXCEPTION 'Lease expirado'; END IF;
  UPDATE public.tpl_automatizaciones_cola SET estado = 'completado', bloqueado_en = null, bloqueado_por = null, lease_expira_en = null, actualizado_en = now() WHERE id = p_trabajo_id;
END; $$;
CREATE OR REPLACE FUNCTION public.rpc_fallar_trabajo_automatizacion(p_trabajo_id bigint, p_worker_id text, p_error text, p_definitivo boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_trabajo record;
BEGIN
  SELECT * INTO v_trabajo FROM public.tpl_automatizaciones_cola WHERE id = p_trabajo_id; IF NOT FOUND THEN RAISE EXCEPTION 'Trabajo no encontrado'; END IF; IF v_trabajo.bloqueado_por IS DISTINCT FROM p_worker_id THEN RAISE EXCEPTION 'Mismatch de Worker ID'; END IF; IF v_trabajo.lease_expira_en < now() THEN RAISE EXCEPTION 'Lease expirado'; END IF;
  UPDATE public.tpl_automatizaciones_cola SET estado = CASE WHEN p_definitivo OR v_trabajo.intentos >= 3 THEN 'error_definitivo' ELSE 'error_reintentable' END, ultimo_error = p_error, bloqueado_en = null, bloqueado_por = null, lease_expira_en = null, proxima_ejecucion = now() + (interval '5 minutes' * v_trabajo.intentos), actualizado_en = now() WHERE id = p_trabajo_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.rpc_reclamar_trabajos_automatizacion FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION public.rpc_reclamar_trabajos_automatizacion TO service_role;
REVOKE EXECUTE ON FUNCTION public.rpc_completar_trabajo_automatizacion FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION public.rpc_completar_trabajo_automatizacion TO service_role;
REVOKE EXECUTE ON FUNCTION public.rpc_fallar_trabajo_automatizacion FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION public.rpc_fallar_trabajo_automatizacion TO service_role;
COMMIT;