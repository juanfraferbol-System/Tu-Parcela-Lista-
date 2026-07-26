BEGIN;
CREATE OR REPLACE FUNCTION public.rpc_renovar_suscripcion(p_proyecto_id uuid, p_nuevo_plan_id uuid, p_pago_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_susc_vieja record; v_plan record; v_pago record; v_nueva_susc uuid;
BEGIN
  SELECT * INTO v_pago FROM public.tpl_pagos WHERE id = p_pago_id AND estado = 'completado' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Pago invalido o no completado'; END IF; IF v_pago.suscripcion_id IS NOT NULL THEN RAISE EXCEPTION 'El pago ya fue utilizado en otra suscripcion'; END IF;
  SELECT * INTO v_susc_vieja FROM public.tpl_suscripciones WHERE proyecto_id = p_proyecto_id AND estado = 'activa' FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'No hay suscripcion activa en el proyecto'; END IF; IF v_susc_vieja.publicacion_id IS DISTINCT FROM v_pago.publicacion_id THEN RAISE EXCEPTION 'El pago pertenece a otra publicacion'; END IF;
  SELECT * INTO v_plan FROM public.planes_comerciales WHERE id = p_nuevo_plan_id;
  UPDATE public.tpl_suscripciones SET estado = 'renovada', actualizado_en = now() WHERE id = v_susc_vieja.id;
  INSERT INTO public.tpl_suscripciones (proyecto_id, cuenta_id, plan_id, pago_inicial_id, renovada_desde_id, publicacion_id, estado, inicia_en, vence_en) VALUES (p_proyecto_id, v_susc_vieja.cuenta_id, p_nuevo_plan_id, p_pago_id, v_susc_vieja.id, v_susc_vieja.publicacion_id, 'activa', now(), now() + (v_plan.duracion_meses || ' months')::interval) RETURNING id INTO v_nueva_susc;
  UPDATE public.tpl_pagos SET suscripcion_id = v_nueva_susc WHERE id = p_pago_id;
  PERFORM public.rpc_sincronizar_modulos_suscripcion(p_proyecto_id, p_nuevo_plan_id);
  
  INSERT INTO public.crm_actividades (proyecto_comercial_id, tipo, visibilidad, resumen, origen, referencia_idempotencia)
  VALUES (p_proyecto_id, 'sistema', 'cliente', 'Suscripción renovada exitosamente ('||v_plan.nombre||')', 'worker', 'renovacion:' || p_proyecto_id::text || ':' || v_nueva_susc::text)
  ON CONFLICT (referencia_idempotencia) DO NOTHING;
END; $$;
CREATE OR REPLACE FUNCTION public.rpc_cancelar_o_suspender_suscripcion(p_proyecto_id uuid, p_estado text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_susc_activa record;
BEGIN
  IF p_estado NOT IN ('cancelada', 'suspendida') THEN RAISE EXCEPTION 'Estado invalido'; END IF;
  SELECT * INTO v_susc_activa FROM public.tpl_suscripciones WHERE proyecto_id = p_proyecto_id AND estado = 'activa'; IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.tpl_suscripciones SET estado = p_estado, actualizado_en = now() WHERE id = v_susc_activa.id;
  UPDATE public.tpl_proyecto_modulos SET estado = 'disponible', actualizado_en = now() WHERE proyecto_id = p_proyecto_id AND estado = 'activo' AND modulo_codigo IN (SELECT modulo_codigo FROM public.planes_comerciales_modulos WHERE plan_id = v_susc_activa.plan_id);
  
  INSERT INTO public.crm_actividades (proyecto_comercial_id, tipo, visibilidad, resumen, origen, referencia_idempotencia)
  VALUES (p_proyecto_id, 'sistema', 'cliente', 'Suscripción ' || p_estado || ' y características premium desactivadas', 'worker', 'desactivacion:' || p_proyecto_id::text || ':' || p_estado || ':' || v_susc_activa.id::text)
  ON CONFLICT (referencia_idempotencia) DO NOTHING;
END; $$;
REVOKE EXECUTE ON FUNCTION public.rpc_renovar_suscripcion FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION public.rpc_renovar_suscripcion TO service_role;
REVOKE EXECUTE ON FUNCTION public.rpc_cancelar_o_suspender_suscripcion FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION public.rpc_cancelar_o_suspender_suscripcion TO service_role;
COMMIT;