-- Migración 015: Capa 2 - Motor de Reglas Dinámicas, Memoria Comercial y Caché Canónica (Preflight Validated)
-- Fecha: 2026-07-25
-- Descripción: Crea tabla de reglas evaluables JSONB, memoria comercial de aprendizaje continuo y tabla de caché con Score Comercial (0-100).

BEGIN;

-- 1. Tabla de Reglas Dinámicas de Inteligencia Comercial
CREATE TABLE IF NOT EXISTS public.tpl_inteligencia_reglas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  target_tipo_cliente text[] NOT NULL DEFAULT '{all}',
  target_estado_embudo text[] NOT NULL DEFAULT '{all}',
  condicion_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  accion_recomendada jsonb NOT NULL DEFAULT '{}'::jsonb,
  prioridad integer NOT NULL DEFAULT 10,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tpl_inteligencia_reglas_cond_check CHECK (jsonb_typeof(condicion_jsonb) = 'object'),
  CONSTRAINT tpl_inteligencia_reglas_accion_check CHECK (jsonb_typeof(accion_recomendada) = 'object')
);

CREATE INDEX IF NOT EXISTS tpl_inteligencia_reglas_activo_idx ON public.tpl_inteligencia_reglas(activo, prioridad DESC);

-- 2. Tabla de Memoria Comercial (Bucle de Aprendizaje y Efectividad)
CREATE TABLE IF NOT EXISTS public.tpl_memoria_comercial (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proyecto_id uuid NOT NULL REFERENCES public.tpl_proyectos_comerciales(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo_cliente text NOT NULL,
  arquetipo_propiedad text,
  estado_embudo text NOT NULL,
  recomendacion_codigo text NOT NULL,
  servicio_extra_id uuid REFERENCES public.extras(id) ON DELETE SET NULL,
  accion text NOT NULL,
  impacto_medido jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tpl_memoria_accion_check CHECK (accion IN ('presentada', 'clic', 'aceptada', 'rechazada', 'contratada', 'ignorada')),
  CONSTRAINT tpl_memoria_impacto_check CHECK (jsonb_typeof(impacto_medido) = 'object')
);

CREATE INDEX IF NOT EXISTS tpl_memoria_comercial_proyecto_idx ON public.tpl_memoria_comercial(proyecto_id, recomendacion_codigo);
CREATE INDEX IF NOT EXISTS tpl_memoria_comercial_analisis_idx ON public.tpl_memoria_comercial(tipo_cliente, recomendacion_codigo, accion);

-- 3. Tabla de Caché de Inteligencia y Score Comercial (< 30ms)
CREATE TABLE IF NOT EXISTS public.tpl_business_inteligencia_cache (
  proyecto_id uuid PRIMARY KEY REFERENCES public.tpl_proyectos_comerciales(id) ON DELETE CASCADE,
  cuenta_id uuid NOT NULL REFERENCES public.tpl_business_cuentas(id) ON DELETE CASCADE,
  score_comercial integer NOT NULL DEFAULT 50,
  snapshot_canonico jsonb NOT NULL DEFAULT '{}'::jsonb,
  ultimo_calculo timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tpl_inteligencia_cache_score_check CHECK (score_comercial BETWEEN 0 AND 100),
  CONSTRAINT tpl_inteligencia_cache_snap_check CHECK (jsonb_typeof(snapshot_canonico) = 'object')
);

CREATE INDEX IF NOT EXISTS tpl_inteligencia_cache_cuenta_idx ON public.tpl_business_inteligencia_cache(cuenta_id);
CREATE INDEX IF NOT EXISTS tpl_inteligencia_cache_score_idx ON public.tpl_business_inteligencia_cache(score_comercial DESC);

-- 4. Seguridad RLS y Aislamiento Estricto (Idempotente)
ALTER TABLE public.tpl_inteligencia_reglas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tpl_memoria_comercial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tpl_business_inteligencia_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tpl_reglas_select_auth ON public.tpl_inteligencia_reglas;
CREATE POLICY tpl_reglas_select_auth ON public.tpl_inteligencia_reglas
  FOR SELECT TO authenticated USING (activo = true);

DROP POLICY IF EXISTS tpl_memoria_select_member ON public.tpl_memoria_comercial;
CREATE POLICY tpl_memoria_select_member ON public.tpl_memoria_comercial
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tpl_business_membresias m
      WHERE m.proyecto_id = tpl_memoria_comercial.proyecto_id
        AND m.usuario_id = auth.uid()
        AND m.estado = 'activa'
    )
  );

DROP POLICY IF EXISTS tpl_cache_select_member ON public.tpl_business_inteligencia_cache;
CREATE POLICY tpl_cache_select_member ON public.tpl_business_inteligencia_cache
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tpl_business_membresias m
      WHERE m.proyecto_id = tpl_business_inteligencia_cache.proyecto_id
        AND m.usuario_id = auth.uid()
        AND m.estado = 'activa'
    )
  );

DROP POLICY IF EXISTS tpl_reglas_admin_all ON public.tpl_inteligencia_reglas;
CREATE POLICY tpl_reglas_admin_all ON public.tpl_inteligencia_reglas
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.tipo = 'administrador')
  );

DROP POLICY IF EXISTS tpl_cache_service_all ON public.tpl_business_inteligencia_cache;
CREATE POLICY tpl_cache_service_all ON public.tpl_business_inteligencia_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tpl_memoria_service_all ON public.tpl_memoria_comercial;
CREATE POLICY tpl_memoria_service_all ON public.tpl_memoria_comercial
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
