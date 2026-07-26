BEGIN;
CREATE OR REPLACE FUNCTION public.rpc_sincronizar_modulos_suscripcion(p_proyecto_id uuid, p_plan_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_plan record; v_mod record;
BEGIN
  SELECT * INTO v_plan FROM public.planes_comerciales WHERE id = p_plan_id; IF NOT FOUND THEN RAISE EXCEPTION 'Plan no encontrado'; END IF;
  UPDATE public.tpl_proyecto_modulos SET estado = 'disponible', actualizado_en = now() WHERE proyecto_id = p_proyecto_id AND estado = 'activo';
  FOR v_mod IN SELECT modulo_codigo FROM public.planes_comerciales_modulos WHERE plan_id = p_plan_id LOOP INSERT INTO public.tpl_proyecto_modulos (proyecto_id, modulo_codigo, estado) VALUES (p_proyecto_id, v_mod.modulo_codigo, 'activo') ON CONFLICT (proyecto_id, modulo_codigo) DO UPDATE SET estado = 'activo', actualizado_en = now(); END LOOP;
  
  INSERT INTO public.crm_actividades (proyecto_comercial_id, tipo, visibilidad, resumen, origen, referencia_idempotencia)
  VALUES (p_proyecto_id, 'sistema', 'interna', 'Módulos sincronizados según plan: ' || v_plan.nombre, 'worker', 'sync_modulos:' || p_proyecto_id::text || ':' || v_plan.id::text)
  ON CONFLICT (referencia_idempotencia) DO NOTHING;
END; $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sincronizar_modulos_suscripcion FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION public.rpc_sincronizar_modulos_suscripcion TO service_role;
COMMIT;