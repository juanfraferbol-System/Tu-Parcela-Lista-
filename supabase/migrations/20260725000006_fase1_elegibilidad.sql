BEGIN;
CREATE OR REPLACE FUNCTION public.evaluar_elegibilidad_provisionamiento(p_publicacion_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_pub record; v_plan record; v_elegible boolean := false;
BEGIN
  SELECT * INTO v_pub FROM public.publicaciones WHERE id = p_publicacion_id; IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO v_plan FROM public.planes_comerciales WHERE codigo = v_pub.plan_seleccionado LIMIT 1; IF NOT FOUND THEN RETURN; END IF;
  IF v_pub.estado = 'aprobada' THEN IF v_plan.requiere_pago = false THEN v_elegible := true; ELSIF v_plan.requiere_pago = true AND v_pub.pago_estado = 'pagado' THEN v_elegible := true; END IF; END IF;
  IF v_elegible THEN INSERT INTO public.tpl_automatizaciones_cola (idempotency_key, accion, entidad, entidad_id, payload) VALUES ('provisionar_publicacion:' || p_publicacion_id::text, 'provisionar_infraestructura', 'publicacion', p_publicacion_id::text, jsonb_build_object('plan_id', v_plan.id)) ON CONFLICT (idempotency_key) DO NOTHING; END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.evaluar_elegibilidad_provisionamiento FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION public.evaluar_elegibilidad_provisionamiento TO service_role;
COMMIT;