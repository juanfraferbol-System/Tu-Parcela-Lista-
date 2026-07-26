BEGIN;
CREATE OR REPLACE FUNCTION public.rpc_provisionar_infraestructura(p_usuario_id uuid, p_publicacion_id uuid, p_plan_id uuid, p_cuenta_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_pub record; v_cliente record; v_cuenta_id uuid; v_proyecto_id uuid; v_susc record; v_plan record; v_count integer;
BEGIN
  SELECT * INTO v_pub FROM public.publicaciones WHERE id = p_publicacion_id; SELECT * INTO v_plan FROM public.planes_comerciales WHERE id = p_plan_id; IF v_pub IS NULL OR v_plan IS NULL THEN RAISE EXCEPTION 'Publicacion o plan no encontrados'; END IF; IF v_pub.plan_seleccionado != v_plan.codigo THEN RAISE EXCEPTION 'Mismatch de plan seleccionado'; END IF;
  
  SELECT * INTO v_cliente FROM public.clientes WHERE public.normalize_email(correo) = public.normalize_email(v_pub.contacto_email) LIMIT 1;
  IF FOUND THEN IF v_cliente.usuario_id IS NOT NULL AND v_cliente.usuario_id != p_usuario_id THEN RAISE EXCEPTION 'Conflicto de identidad: El correo ya pertenece a otro usuario registrado'; ELSIF v_cliente.usuario_id IS NULL THEN UPDATE public.clientes SET usuario_id = p_usuario_id WHERE id = v_cliente.id RETURNING * INTO v_cliente; END IF; ELSE INSERT INTO public.clientes (usuario_id, nombre, correo, estado) VALUES (p_usuario_id, v_pub.contacto_nombre, v_pub.contacto_email, 'cliente') RETURNING * INTO v_cliente; END IF;
  
  IF p_cuenta_id IS NOT NULL THEN SELECT cuenta_id INTO v_cuenta_id FROM public.tpl_business_membresias WHERE usuario_id = p_usuario_id AND cuenta_id = p_cuenta_id LIMIT 1; IF v_cuenta_id IS NULL THEN RAISE EXCEPTION 'No tiene acceso a la cuenta proporcionada'; END IF; ELSE SELECT count(*) INTO v_count FROM public.tpl_business_membresias WHERE usuario_id = p_usuario_id; IF v_count > 1 THEN RAISE EXCEPTION 'Múltiples cuentas detectadas. Especifique p_cuenta_id obligatoriamente.'; ELSIF v_count = 1 THEN SELECT cuenta_id INTO v_cuenta_id FROM public.tpl_business_membresias WHERE usuario_id = p_usuario_id LIMIT 1; ELSE INSERT INTO public.tpl_business_cuentas (codigo, nombre) VALUES (gen_random_uuid()::text, 'Cuenta de ' || v_pub.contacto_nombre) RETURNING id INTO v_cuenta_id; END IF; END IF;
  
  -- Proyecto Comercial (Tolerante a concurrencia V3.2)
  INSERT INTO public.tpl_proyectos_comerciales (codigo, cuenta_id, nombre, propiedad_codigo, publicacion_id, estado)
  VALUES (gen_random_uuid()::text, v_cuenta_id, v_pub.titulo_publico, v_pub.codigo_publico, p_publicacion_id, 'activo')
  ON CONFLICT (publicacion_id) WHERE publicacion_id IS NOT NULL DO NOTHING;
  SELECT id INTO v_proyecto_id FROM public.tpl_proyectos_comerciales WHERE publicacion_id = p_publicacion_id;
  
  INSERT INTO public.tpl_business_membresias (usuario_id, cuenta_id, proyecto_id, rol, estado) VALUES (p_usuario_id, v_cuenta_id, v_proyecto_id, 'propietario', 'activa') ON CONFLICT (usuario_id, proyecto_id) DO NOTHING;
  
  SELECT * INTO v_susc FROM public.tpl_suscripciones WHERE proyecto_id = v_proyecto_id AND estado = 'activa';
  IF FOUND THEN IF v_susc.publicacion_id != p_publicacion_id THEN RAISE EXCEPTION 'La suscripcion activa pertenece a otra publicacion'; END IF; IF v_susc.plan_id != p_plan_id THEN RAISE EXCEPTION 'La suscripcion activa difiere del plan a provisionar (Requiere workflow de Upgrade)'; END IF; ELSE INSERT INTO public.tpl_suscripciones (proyecto_id, cuenta_id, plan_id, publicacion_id, estado, inicia_en, vence_en) VALUES (v_proyecto_id, v_cuenta_id, p_plan_id, p_publicacion_id, 'activa', now(), now() + (v_plan.duracion_meses || ' months')::interval); END IF;
  
  PERFORM public.rpc_sincronizar_modulos_suscripcion(v_proyecto_id, p_plan_id);
  
  INSERT INTO public.crm_actividades (proyecto_comercial_id, cliente_id, tipo, visibilidad, resumen, origen, referencia_idempotencia)
  VALUES (v_proyecto_id, v_cliente.id, 'sistema', 'cliente', 'Proyecto y Suscripción aprovisionados ('||v_plan.nombre||')', 'worker', 'provisionamiento:' || p_publicacion_id::text)
  ON CONFLICT (referencia_idempotencia) DO NOTHING;
  
  RETURN jsonb_build_object('cuenta_id', v_cuenta_id, 'proyecto_id', v_proyecto_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.rpc_provisionar_infraestructura FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION public.rpc_provisionar_infraestructura TO service_role;
COMMIT;