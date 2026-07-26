-- Migración 017: Capa 2 y 4 - Funciones RPC del Orquestador Central y API Canónica (Preflight Validated)
-- Fecha: 2026-07-25
-- Descripción: Implementa recálculo analítico de Score Comercial, consulta 360° segura y ejecución enrutada e idempotente.

BEGIN;

-- 1. RPC: Recalcular Inteligencia y Score Comercial (0-100)
CREATE OR REPLACE FUNCTION public.rpc_recalcular_inteligencia_comercial(
  p_proyecto_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_proj record;
  v_cuenta_id uuid;
  v_pub record;
  v_susc record;
  v_exp record;
  v_score_vis integer := 10;
  v_score_pre integer := 20;
  v_score_emb integer := 15;
  v_score_mkt integer := 15;
  v_score_total integer;
  v_snap jsonb;
  v_regla record;
  v_sugeridos jsonb := '[]'::jsonb;
BEGIN
  -- 1. Seguridad: Verificar membresía o rol admin si es llamado por usuario autenticado
  IF auth.role() = 'authenticated' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tpl_business_membresias m 
      WHERE m.proyecto_id = p_proyecto_id AND m.usuario_id = auth.uid() AND m.estado = 'activa'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.tipo = 'administrador'
    ) THEN
      RAISE EXCEPTION 'Acceso denegado: no tiene permisos sobre el proyecto comercial %', p_proyecto_id;
    END IF;
  END IF;

  -- 2. Verificar existencia de proyecto
  SELECT * INTO v_proj FROM public.tpl_proyectos_comerciales WHERE id = p_proyecto_id;
  IF v_proj IS NULL THEN RAISE EXCEPTION 'Proyecto comercial no encontrado'; END IF;
  v_cuenta_id := v_proj.cuenta_id;

  IF v_proj.publicacion_id IS NOT NULL THEN
    SELECT * INTO v_pub FROM public.publicaciones WHERE id = v_proj.publicacion_id;
  END IF;

  SELECT s.*, p.codigo as plan_codigo, p.nombre as plan_nombre, p.requiere_pago
  INTO v_susc
  FROM public.tpl_suscripciones s
  LEFT JOIN public.planes_comerciales p ON p.id = s.plan_id
  WHERE s.proyecto_id = p_proyecto_id AND s.estado = 'activa'
  ORDER BY s.creado_en DESC LIMIT 1;

  SELECT * INTO v_exp FROM public.tpl_proyecto_experiencia WHERE proyecto_id = p_proyecto_id;

  -- 3. Cálculo de Pilares de Score Comercial (0-100)
  IF v_pub IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.publicacion_fotos WHERE publicacion_id = v_pub.id) THEN
      v_score_vis := 20;
    END IF;
  END IF;

  v_score_pre := 25;

  IF v_proj.estado_embudo IN ('traccion_visitas', 'negociacion', 'cierre') THEN
    v_score_emb := 25;
  ELSIF v_proj.estado_embudo = 'publicado_activo' THEN
    v_score_emb := 18;
  END IF;

  IF v_proj.nivel_urgencia IN ('inmediata', 'alta') THEN
    v_score_mkt := 25;
  ELSE
    v_score_mkt := 15;
  END IF;

  v_score_total := LEAST(100, GREATEST(0, v_score_vis + v_score_pre + v_score_emb + v_score_mkt));

  -- 4. Evaluación del Motor de Reglas Dinámicas
  FOR v_regla IN 
    SELECT r.* FROM public.tpl_inteligencia_reglas r 
    WHERE r.activo = true 
      AND ('all' = ANY(r.target_tipo_cliente) OR COALESCE(v_proj.tipo_cliente_canonico, 'dueno') = ANY(r.target_tipo_cliente))
      AND ('all' = ANY(r.target_estado_embudo) OR COALESCE(v_proj.estado_embudo, 'onboarding') = ANY(r.target_estado_embudo))
    ORDER BY r.prioridad DESC
  LOOP
    v_sugeridos := v_sugeridos || v_regla.accion_recomendada;
  END LOOP;

  -- 5. Construcción de Snapshot Canónico 360°
  v_snap := jsonb_build_object(
    'orquestador', jsonb_build_object(
      'proyecto_id', p_proyecto_id,
      'cuenta_id', v_cuenta_id,
      'score_comercial', jsonb_build_object(
        'total', v_score_total,
        'desglose', jsonb_build_object(
          'visual', v_score_vis,
          'precio', v_score_pre,
          'embudo', v_score_emb,
          'marketing', v_score_mkt
        )
      ),
      'cliente', jsonb_build_object(
        'tipo_canonico', COALESCE(v_proj.tipo_cliente_canonico, 'dueno'),
        'canal_origen', COALESCE(v_proj.canal_origen, 'directo')
      ),
      'embudo', jsonb_build_object(
        'estado_actual', COALESCE(v_proj.estado_embudo, 'onboarding'),
        'urgencia', COALESCE(v_proj.nivel_urgencia, 'media')
      )
    ),
    'plan_suscripcion', jsonb_build_object(
      'plan_codigo', COALESCE(v_susc.plan_codigo, 'codigo_plan_gratuito'),
      'nombre', COALESCE(v_susc.plan_nombre, 'Plan Gratuito Base'),
      'estado', COALESCE(v_susc.estado, 'ninguna')
    ),
    'catalogo_y_ejecucion', jsonb_build_object(
      'servicios_sugeridos', v_sugeridos
    ),
    'contexto_tpl_studio_ia', jsonb_build_object(
      'arquetipo_visual', CASE WHEN v_proj.tipo_cliente_canonico = 'inmobiliaria' THEN 'desarrollo_inmobiliario_loteo' ELSE 'parcela_agrado_lujo' END,
      'puntos_fuertes', COALESCE(v_exp.fortalezas, '["rol_propio", "entorno_natural"]'::jsonb),
      'tono_comunicacional', 'inspirador_exclusivo',
      'plantilla_default', 'cinematic_drone_v2'
    ),
    'metadata', jsonb_build_object(
      'ultima_evaluacion', now(),
      'version_orquestador', '3.1.0'
    )
  );

  -- 6. Guardado Idempotente en Caché Materializada
  INSERT INTO public.tpl_business_inteligencia_cache (proyecto_id, cuenta_id, score_comercial, snapshot_canonico, ultimo_calculo, actualizado_en)
  VALUES (p_proyecto_id, v_cuenta_id, v_score_total, v_snap, now(), now())
  ON CONFLICT (proyecto_id) DO UPDATE 
  SET cuenta_id = EXCLUDED.cuenta_id,
      score_comercial = EXCLUDED.score_comercial,
      snapshot_canonico = EXCLUDED.snapshot_canonico,
      ultimo_calculo = EXCLUDED.ultimo_calculo,
      actualizado_en = EXCLUDED.actualizado_en;

  RETURN v_snap;
END;
$$;

-- 2. RPC: Obtener Contexto Orquestador 360° (API con validación de seguridad)
CREATE OR REPLACE FUNCTION public.rpc_obtener_contexto_orquestador(
  p_proyecto_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_cache record;
BEGIN
  -- 1. Seguridad: Verificar membresía o rol admin si es llamado por usuario autenticado
  IF auth.role() = 'authenticated' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tpl_business_membresias m 
      WHERE m.proyecto_id = p_proyecto_id AND m.usuario_id = auth.uid() AND m.estado = 'activa'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.tipo = 'administrador'
    ) THEN
      RAISE EXCEPTION 'Acceso denegado: no tiene permisos de lectura sobre la inteligencia del proyecto %', p_proyecto_id;
    END IF;
  END IF;

  SELECT * INTO v_cache FROM public.tpl_business_inteligencia_cache WHERE proyecto_id = p_proyecto_id;
  
  -- Si el caché no existe o tiene más de 6 horas, recalcular de inmediato
  IF v_cache IS NULL OR v_cache.ultimo_calculo < now() - interval '6 hours' THEN
    RETURN public.rpc_recalcular_inteligencia_comercial(p_proyecto_id);
  END IF;

  RETURN v_cache.snapshot_canonico;
END;
$$;

-- 3. RPC: Ejecutar Servicio Orquestado (Con prevención de doble clic y transaccionalidad total)
CREATE OR REPLACE FUNCTION public.rpc_ejecutar_servicio_orquestado(
  p_proyecto_id uuid,
  p_codigo_extra text,
  p_usuario_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_proj record;
  v_extra record;
  v_solicitud_id uuid;
  v_uid uuid;
  v_etapa record;
BEGIN
  v_uid := COALESCE(p_usuario_id, auth.uid());
  
  -- 1. Seguridad: Verificar membresía o rol admin
  IF auth.role() = 'authenticated' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tpl_business_membresias m 
      WHERE m.proyecto_id = p_proyecto_id AND m.usuario_id = auth.uid() AND m.estado = 'activa'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.tipo = 'administrador'
    ) THEN
      RAISE EXCEPTION 'Acceso denegado: no tiene permisos para ejecutar acciones en el proyecto %', p_proyecto_id;
    END IF;
  END IF;

  -- 2. Verificar proyecto y extra
  SELECT * INTO v_proj FROM public.tpl_proyectos_comerciales WHERE id = p_proyecto_id;
  IF v_proj IS NULL THEN RAISE EXCEPTION 'Proyecto comercial no encontrado'; END IF;
  
  SELECT * INTO v_extra FROM public.extras WHERE codigo = p_codigo_extra AND activo = true;
  IF v_extra IS NULL THEN RAISE EXCEPTION 'Servicio del catálogo maestro no disponible: %', p_codigo_extra; END IF;

  -- 3. Verificación de Idempotencia / Prevención de Doble Clic (últimas 24 horas)
  IF EXISTS (
    SELECT 1 FROM public.tpl_solicitudes_comerciales
    WHERE proyecto_id = p_proyecto_id 
      AND recomendacion = p_codigo_extra 
      AND estado IN ('solicitada', 'contactando', 'aprobada', 'contratada', 'en_produccion')
      AND (p_idempotency_key IS NULL OR id::text != p_idempotency_key)
      AND creado_en > now() - interval '24 hours'
  ) THEN
    SELECT id INTO v_solicitud_id FROM public.tpl_solicitudes_comerciales
    WHERE proyecto_id = p_proyecto_id AND recomendacion = p_codigo_extra AND estado IN ('solicitada', 'contactando', 'aprobada', 'contratada', 'en_produccion')
    ORDER BY creado_en DESC LIMIT 1;
    
    RETURN jsonb_build_object(
      'solicitud_id', v_solicitud_id, 
      'estado', 'existente_idempotente', 
      'proveedor', COALESCE(v_extra.proveedor_default, 'ia_tpl_studio'), 
      'mensaje', 'El servicio ya se encuentra contratado o en proceso de ejecución.'
    );
  END IF;

  -- 4. Crear Solicitud Comercial Transaccional
  INSERT INTO public.tpl_solicitudes_comerciales (usuario_id, cuenta_id, proyecto_id, recomendacion, tipo, estado, gestionado_en)
  VALUES (COALESCE(v_uid, gen_random_uuid()), v_proj.cuenta_id, p_proyecto_id, p_codigo_extra, 'recomendacion', 'contratada', now())
  RETURNING id INTO v_solicitud_id;

  -- 5. Registrar en Memoria Comercial (Aprendizaje Continuo)
  INSERT INTO public.tpl_memoria_comercial (proyecto_id, usuario_id, tipo_cliente, arquetipo_propiedad, estado_embudo, recomendacion_codigo, servicio_extra_id, accion)
  VALUES (p_proyecto_id, v_uid, COALESCE(v_proj.tipo_cliente_canonico, 'dueno'), 'agrícola', COALESCE(v_proj.estado_embudo, 'onboarding'), p_codigo_extra, v_extra.id, 'contratada');

  -- 6. Enrutamiento según Proveedor Default
  IF COALESCE(v_extra.proveedor_default, 'ia_tpl_studio') = 'ia_tpl_studio' THEN
    INSERT INTO public.tpl_automatizaciones_cola (evento, payload, idempotency_key, estado)
    VALUES (
      'tpl_studio:generar_asset', 
      jsonb_build_object('proyecto_id', p_proyecto_id, 'servicio_codigo', p_codigo_extra, 'solicitud_id', v_solicitud_id), 
      'studio:' || v_solicitud_id::text, 
      'pendiente'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  
  ELSIF v_extra.flujo_default_id IS NOT NULL THEN
    FOR v_etapa IN SELECT * FROM public.crm_flujo_etapas WHERE flujo_id = v_extra.flujo_default_id AND activo = true ORDER BY orden ASC LOOP
      INSERT INTO public.crm_proyecto_etapas (proyecto_comercial_id, flujo_etapa_id, estado, solicitud_id, servicio_extra_id, proveedor_asignado, metadata_ejecucion)
      VALUES (
        p_proyecto_id, 
        v_etapa.id, 
        CASE WHEN v_etapa.orden = 1 THEN 'en_proceso' ELSE 'no_iniciada' END, 
        v_solicitud_id, 
        v_extra.id, 
        COALESCE(v_extra.proveedor_default, 'biotv_produccion'), 
        COALESCE(v_extra.metadata_orquestador, '{}'::jsonb)
      )
      ON CONFLICT (proyecto_comercial_id, flujo_etapa_id) DO NOTHING;
    END LOOP;
  END IF;

  -- 7. Actividad en Timeline CRM
  INSERT INTO public.crm_actividades (proyecto_comercial_id, tipo, visibilidad, resumen, origen, referencia_idempotencia)
  VALUES (
    p_proyecto_id, 'sistema', 'cliente', 
    'Servicio Orquestado Contratado: ' || v_extra.nombre || ' (' || COALESCE(v_extra.proveedor_default, 'ia_tpl_studio') || ')', 
    'orquestador', 'ejecucion:' || v_solicitud_id::text
  )
  ON CONFLICT (referencia_idempotencia) DO NOTHING;

  -- 8. Disparar recálculo de caché in-memory
  PERFORM public.rpc_recalcular_inteligencia_comercial(p_proyecto_id);

  RETURN jsonb_build_object('solicitud_id', v_solicitud_id, 'estado', 'contratada', 'proveedor', COALESCE(v_extra.proveedor_default, 'ia_tpl_studio'));
END;
$$;

-- Permisos explícitos y mínimos
REVOKE EXECUTE ON FUNCTION public.rpc_recalcular_inteligencia_comercial FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_recalcular_inteligencia_comercial TO service_role;

REVOKE EXECUTE ON FUNCTION public.rpc_obtener_contexto_orquestador FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_obtener_contexto_orquestador TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.rpc_ejecutar_servicio_orquestado FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_ejecutar_servicio_orquestado TO authenticated, service_role;

COMMIT;
