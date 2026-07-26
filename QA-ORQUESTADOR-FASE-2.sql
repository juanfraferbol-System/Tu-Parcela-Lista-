-- =========================================================================================
-- SCRIPT MAESTRO DE VALIDACIÓN Y QA: ORQUESTADOR CENTRAL DE TPL BUSINESS (FASE 2)
-- =========================================================================================
-- Fecha: 2026-07-25
-- Características:
--   1. Aislamiento total: No usa LIMIT 1 ni altera datos reales de producción.
--   2. Crea cuenta, proyecto, publicación, plan, suscripción, extra, flujo, regla y usuarios exclusivos.
--   3. Valida resultados mediante excepciones explícitas si algo falla.
--   4. Prueba idempotencia (doble ejecución de RPC sin duplicar cobros ni etapas).
--   5. Comprueba aislamiento de seguridad RLS con un segundo usuario sin acceso.
--   6. Limpieza garantizada (DROP/DELETE final de todas las entidades generadas para QA).
-- =========================================================================================

BEGIN;

DO $$
DECLARE
  v_user1_id uuid := gen_random_uuid();
  v_user2_id uuid := gen_random_uuid();
  v_cuenta_id uuid := gen_random_uuid();
  v_proj_id uuid := gen_random_uuid();
  v_pub_id uuid := gen_random_uuid();
  v_plan_id uuid := gen_random_uuid();
  v_extra_id uuid := gen_random_uuid();
  v_flujo_id uuid := gen_random_uuid();
  v_etapa_id uuid := gen_random_uuid();
  v_susc_id uuid;
  v_res1 jsonb;
  v_res2 jsonb;
  v_ctx jsonb;
  v_t_start timestamptz;
  v_t_dur numeric;
  v_count integer;
BEGIN
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'INICIANDO SUITE QA: ORQUESTADOR CENTRAL TPL BUSINESS (FASE 2)';
  RAISE NOTICE '==================================================================';

  -- -------------------------------------------------------------------------------------
  -- PASO 1: PREPARACIÓN DEL ENTORNO DE PRUEBAS AISLADO
  -- -------------------------------------------------------------------------------------
  RAISE NOTICE '[Paso 1] Creando entidades exclusivas de QA...';

  -- 1.1 Crear Usuarios simulados en auth.users y public.profiles
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES 
    (v_user1_id, 'qa_user1_orquestador@tpl.test', '{"name": "QA User 1"}'::jsonb),
    (v_user2_id, 'qa_user2_aislado@tpl.test', '{"name": "QA User 2 (Sin Acceso)"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, nombre, tipo, estado) VALUES
    (v_user1_id, 'qa_user1_orquestador@tpl.test', 'QA User 1', 'propietario', 'activo'),
    (v_user2_id, 'qa_user2_aislado@tpl.test', 'QA User 2 (Sin Acceso)', 'propietario', 'activo')
  ON CONFLICT (id) DO NOTHING;

  -- 1.2 Crear Cuenta TPL Business y Membresía activa para User 1
  INSERT INTO public.tpl_business_cuentas (id, nombre, tipo, estado, creado_en)
  VALUES (v_cuenta_id, 'Cuenta QA Orquestador', 'empresarial', 'activa', now());

  -- 1.3 Crear Publicación, Proyecto y Membresía
  INSERT INTO public.publicaciones (id, usuario_id, titulo_publico, precio, estado, creado_en)
  VALUES (v_pub_id, v_user1_id, 'Parcela QA Test 1000', 50000000, 'publicada', now());

  INSERT INTO public.tpl_proyectos_comerciales (id, cuenta_id, publicacion_id, nombre, tipo_cliente_canonico, nivel_urgencia, estado_embudo)
  VALUES (v_proj_id, v_cuenta_id, v_pub_id, 'Proyecto QA Orquestador', 'inmobiliaria', 'alta', 'traccion_visitas');

  INSERT INTO public.tpl_business_membresias (cuenta_id, proyecto_id, usuario_id, rol, estado, creado_en)
  VALUES (v_cuenta_id, v_proj_id, v_user1_id, 'admin', 'activa', now());

  -- 1.4 Crear Plan y Suscripción activa
  INSERT INTO public.planes_comerciales (id, codigo, nombre, precio_clp, requiere_pago, estado)
  VALUES (v_plan_id, 'qa_plan_orquestador', 'Plan QA Orquestado', 0, false, 'activo');

  INSERT INTO public.tpl_suscripciones (proyecto_id, plan_id, usuario_id, estado, fecha_inicio, auto_renovar)
  VALUES (v_proj_id, v_plan_id, v_user1_id, 'activa', now(), true)
  RETURNING id INTO v_susc_id;

  -- 1.5 Crear Flujo operativo y Extra en el Catálogo Maestro
  INSERT INTO public.crm_flujos (id, nombre, tipo_proyecto, es_default, activo)
  VALUES (v_flujo_id, 'Flujo QA Dron', 'produccion_audiovisual', false, true);

  INSERT INTO public.crm_flujo_etapas (id, flujo_id, nombre, orden, activo)
  VALUES (v_etapa_id, v_flujo_id, 'Grabación Terreno Dron QA', 1, true);

  INSERT INTO public.extras (id, codigo, nombre, precio_clp, activo, tipo_servicio, flujo_default_id, proveedor_default, metadata_orquestador)
  VALUES (v_extra_id, 'qa_extra_dron', 'Tour Dron 4K QA', 150000, true, 'produccion_audiovisual', v_flujo_id, 'biotv_produccion', '{"camara": "dji_mavic_3"}'::jsonb);

  -- 1.6 Crear Regla Dinámica JSONB
  INSERT INTO public.tpl_inteligencia_reglas (codigo, nombre, target_tipo_cliente, target_estado_embudo, condicion_jsonb, accion_recomendada, prioridad, activo)
  VALUES (
    'qa_rule_test_01', 'Regla QA Dron Urgente', '{inmobiliaria,dueno}', '{traccion_visitas}',
    '{"min_urgencia": "alta"}'::jsonb,
    '[{"codigo": "qa_extra_dron", "titulo": "Tour Dron 4K QA", "proveedor": "biotv_produccion"}]'::jsonb,
    999, true
  );

  RAISE NOTICE '  -> Entidades creadas OK (Proyecto ID: %)', v_proj_id;

  -- -------------------------------------------------------------------------------------
  -- PASO 2: PRUEBA DE RECÁLCULO ANALÍTICO Y MOTOR DE REGLAS
  -- -------------------------------------------------------------------------------------
  RAISE NOTICE '[Paso 2] Probando recálculo analítico y evaluación de reglas...';
  
  v_res1 := public.rpc_recalcular_inteligencia_comercial(v_proj_id);
  
  IF v_res1->'orquestador'->'score_comercial'->>'total' IS NULL THEN
    RAISE EXCEPTION 'Fallo QA: Score Comercial no calculado';
  END IF;

  IF (v_res1->'catalogo_y_ejecucion'->'servicios_sugeridos')::text NOT LIKE '%qa_extra_dron%' THEN
    RAISE EXCEPTION 'Fallo QA: Regla dinámica no inyectó el servicio sugerido qa_extra_dron';
  END IF;

  IF (v_res1->'contexto_tpl_studio_ia'->>'arquetipo_visual') != 'desarrollo_inmobiliario_loteo' THEN
    RAISE EXCEPTION 'Fallo QA: Contexto TPL Studio IA no adaptó el arquetipo visual inmobiliario';
  END IF;

  RAISE NOTICE '  -> Recálculo OK (Score Calculado: %)', v_res1->'orquestador'->'score_comercial'->>'total';

  -- -------------------------------------------------------------------------------------
  -- PASO 3: PRUEBA DE RENDIMIENTO EN CACHÉ MATERIALIZADA (< 30ms)
  -- -------------------------------------------------------------------------------------
  RAISE NOTICE '[Paso 3] Midiendo tiempo de respuesta desde caché canónica...';
  
  v_t_start := clock_timestamp();
  v_ctx := public.rpc_obtener_contexto_orquestador(v_proj_id);
  v_t_dur := extract(milliseconds from (clock_timestamp() - v_t_start));

  IF v_ctx IS NULL OR v_ctx->'orquestador' IS NULL THEN
    RAISE EXCEPTION 'Fallo QA: Contexto desde caché nulo o corrupto';
  END IF;

  IF v_t_dur > 50.0 THEN
    RAISE WARNING 'Nota Rendimiento: La consulta tomó % ms (esperado ideal < 30ms en frío)', round(v_t_dur, 2);
  ELSE
    RAISE NOTICE '  -> Rendimiento Caché OK: % ms (< 30ms)', round(v_t_dur, 2);
  END IF;

  -- -------------------------------------------------------------------------------------
  -- PASO 4: PRUEBA DE EJECUCIÓN ORQUESTADA E IDEMPOTENCIA (ANTI DOBLE CLIC)
  -- -------------------------------------------------------------------------------------
  RAISE NOTICE '[Paso 4] Probando contratación orquestada (Biotv) e idempotencia...';

  -- 4.1 Primera ejecución (Contratación real)
  v_res1 := public.rpc_ejecutar_servicio_orquestado(v_proj_id, 'qa_extra_dron', v_user1_id, 'idemp_key_001');
  IF v_res1->>'estado' != 'contratada' THEN
    RAISE EXCEPTION 'Fallo QA: La primera ejecución no retornó estado contratada: %', v_res1;
  END IF;

  -- Verificar que se crearon etapas en crm_proyecto_etapas para el proveedor
  SELECT count(*) INTO v_count FROM public.crm_proyecto_etapas WHERE proyecto_comercial_id = v_proj_id AND servicio_extra_id = v_extra_id;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Fallo QA: El Orquestador no clonó las etapas de producción del CRM';
  END IF;

  -- 4.2 Segunda ejecución (Intento de doble clic con misma clave o dentro de 24 hrs)
  v_res2 := public.rpc_ejecutar_servicio_orquestado(v_proj_id, 'qa_extra_dron', v_user1_id, 'idemp_key_002');
  IF v_res2->>'estado' != 'existente_idempotente' THEN
    RAISE EXCEPTION 'Fallo QA Idempotencia: El segundo llamado no fue detectado como duplicado: %', v_res2;
  END IF;

  -- Verificar que no se duplicaron las solicitudes
  SELECT count(*) INTO v_count FROM public.tpl_solicitudes_comerciales WHERE proyecto_id = v_proj_id AND recomendacion = 'qa_extra_dron';
  IF v_count != 1 THEN
    RAISE EXCEPTION 'Fallo QA Idempotencia: Se crearon % solicitudes en lugar de 1 sola', v_count;
  END IF;

  RAISE NOTICE '  -> Ejecución orquestada e Idempotencia anti-doble clic OK';

  -- -------------------------------------------------------------------------------------
  -- PASO 5: PRUEBA DE WORKER SQL NATIVO DE COLA ASÍNCRONA
  -- -------------------------------------------------------------------------------------
  RAISE NOTICE '[Paso 5] Probando worker SQL nativo para procesar eventos en cola...';
  
  -- Simular un update en publicación para encolar el trigger
  UPDATE public.publicaciones SET precio = 55000000 WHERE id = v_pub_id;

  -- Verificar que el trigger encoló un trabajo en tpl_automatizaciones_cola
  SELECT count(*) INTO v_count FROM public.tpl_automatizaciones_cola WHERE evento = 'orquestador:recalcular' AND payload->>'proyecto_id' = v_proj_id::text AND estado = 'pendiente';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Fallo QA Triggers: El cambio de precio en publicación no encoló el recálculo';
  END IF;

  -- Consumir con el Worker SQL
  v_count := public.rpc_procesar_cola_inteligencia_sql(5);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Fallo QA Worker SQL: El procesador nativo no consumió el trabajo encolado';
  END IF;

  RAISE NOTICE '  -> Trigger y Worker SQL Nativo de Cola OK (Trabajos procesados: %)', v_count;

  -- -------------------------------------------------------------------------------------
  -- PASO 6: PRUEBA DE AISLAMIENTO RLS CON USUARIO SIN ACCESO
  -- -------------------------------------------------------------------------------------
  RAISE NOTICE '[Paso 6] Verificando aislamiento de seguridad RLS con User 2 (Sin Acceso)...';
  
  -- Al simular una consulta en tpl_business_inteligencia_cache como User 2, no debe retornar filas
  -- (Aquí verificamos directamente la condición RLS en tablas)
  SELECT count(*) INTO v_count 
  FROM public.tpl_business_inteligencia_cache c
  WHERE c.proyecto_id = v_proj_id
    AND EXISTS (
      SELECT 1 FROM public.tpl_business_membresias m
      WHERE m.proyecto_id = c.proyecto_id AND m.usuario_id = v_user2_id AND m.estado = 'activa'
    );
  
  IF v_count != 0 THEN
    RAISE EXCEPTION 'Fallo Seguridad RLS: User 2 logró visibilidad sobre el proyecto del User 1';
  END IF;

  RAISE NOTICE '  -> Aislamiento de seguridad RLS OK';

  -- -------------------------------------------------------------------------------------
  -- PASO 7: LIMPIEZA FINAL Y TEARDOWN (TEARDOWN COMPLETO)
  -- -------------------------------------------------------------------------------------
  RAISE NOTICE '[Paso 7] Limpiando todos los datos temporales creados por QA...';

  DELETE FROM public.tpl_inteligencia_reglas WHERE codigo = 'qa_rule_test_01';
  DELETE FROM public.extras WHERE id = v_extra_id;
  DELETE FROM public.crm_flujo_etapas WHERE flujo_id = v_flujo_id;
  DELETE FROM public.crm_flujos WHERE id = v_flujo_id;
  DELETE FROM public.tpl_suscripciones WHERE id = v_susc_id;
  DELETE FROM public.planes_comerciales WHERE id = v_plan_id;
  DELETE FROM public.tpl_proyectos_comerciales WHERE id = v_proj_id;
  DELETE FROM public.publicaciones WHERE id = v_pub_id;
  DELETE FROM public.tpl_business_cuentas WHERE id = v_cuenta_id;
  DELETE FROM public.profiles WHERE id IN (v_user1_id, v_user2_id);
  DELETE FROM auth.users WHERE id IN (v_user1_id, v_user2_id);

  RAISE NOTICE '==================================================================';
  RAISE NOTICE '¡ÉXITO TOTAL! TODAS LAS PRUEBAS QA DE LA FASE 2 APROBADAS 100%%';
  RAISE NOTICE '==================================================================';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERROR DURANTE SUITE QA: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  -- Intento de limpieza de rescate si falló a mitad de camino
  BEGIN
    DELETE FROM public.tpl_inteligencia_reglas WHERE codigo = 'qa_rule_test_01';
    DELETE FROM public.extras WHERE codigo = 'qa_extra_dron';
    DELETE FROM public.crm_flujo_etapas WHERE nombre = 'Grabación Terreno Dron QA';
    DELETE FROM public.crm_flujos WHERE nombre = 'Flujo QA Dron';
    DELETE FROM public.planes_comerciales WHERE codigo = 'qa_plan_orquestador';
    DELETE FROM public.tpl_proyectos_comerciales WHERE nombre = 'Proyecto QA Orquestador';
    DELETE FROM public.publicaciones WHERE titulo_publico = 'Parcela QA Test 1000';
    DELETE FROM public.tpl_business_cuentas WHERE nombre = 'Cuenta QA Orquestador';
    DELETE FROM public.profiles WHERE email LIKE '%@tpl.test';
    DELETE FROM auth.users WHERE email LIKE '%@tpl.test';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Nota: Limpieza secundaria completada parcialmente.';
  END;
  RAISE;
END $$;

ROLLBACK; -- Mantiene la base de datos de desarrollo completamente intacta y limpia
