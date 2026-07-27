-- Migración SQL no destructiva: Integración del Tasador Integral TPL
-- Timestamp: 20260727000001
-- Descripción: Agrega campos de rol, antecedentes registrales, obras adicionales, característica diferenciadora, índice de ubicación y badge comercial TPL.

-- 1. Ampliación de la tabla de tasaciones
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasaciones') THEN
    ALTER TABLE public.tasaciones 
      ADD COLUMN IF NOT EXISTS rol_avaluo text,
      ADD COLUMN IF NOT EXISTS sin_rol_conocido boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS conservador text,
      ADD COLUMN IF NOT EXISTS foja text,
      ADD COLUMN IF NOT EXISTS num_inscripcion text,
      ADD COLUMN IF NOT EXISTS anio_inscripcion integer,
      ADD COLUMN IF NOT EXISTS estado_documental text DEFAULT 'no informado',
      ADD COLUMN IF NOT EXISTS obras_adicionales_jsonb jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS caracteristica_diferenciadora text,
      ADD COLUMN IF NOT EXISTS tiene_caracteristica_diferenciadora boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS factor_diferenciador_aplicado numeric(4,2) DEFAULT 1.00,
      ADD COLUMN IF NOT EXISTS indice_ubicacion_tpl integer,
      ADD COLUMN IF NOT EXISTS atributos_geograficos_jsonb jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS badge_tpl_activo boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS motivo_badge text,
      ADD COLUMN IF NOT EXISTS valor_recomendado_tpl numeric,
      ADD COLUMN IF NOT EXISTS precio_publicacion numeric,
      ADD COLUMN IF NOT EXISTS fecha_validacion_precio timestamptz,
      ADD COLUMN IF NOT EXISTS clasificacion_visual_precio text,
      ADD COLUMN IF NOT EXISTS estado_crm text DEFAULT 'lead_tasador_integral',
      ADD COLUMN IF NOT EXISTS badge_publico_activo boolean DEFAULT false;
  END IF;
END $$;

-- 2. Ampliación de la tabla de publicaciones unificadas
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'publicaciones_unificadas') THEN
    ALTER TABLE public.publicaciones_unificadas 
      ADD COLUMN IF NOT EXISTS rol_avaluo text,
      ADD COLUMN IF NOT EXISTS sin_rol_conocido boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS conservador text,
      ADD COLUMN IF NOT EXISTS foja text,
      ADD COLUMN IF NOT EXISTS num_inscripcion text,
      ADD COLUMN IF NOT EXISTS anio_inscripcion integer,
      ADD COLUMN IF NOT EXISTS estado_documental text DEFAULT 'no informado',
      ADD COLUMN IF NOT EXISTS obras_adicionales_jsonb jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS caracteristica_diferenciadora text,
      ADD COLUMN IF NOT EXISTS tiene_caracteristica_diferenciadora boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS factor_diferenciador_aplicado numeric(4,2) DEFAULT 1.00,
      ADD COLUMN IF NOT EXISTS indice_ubicacion_tpl integer,
      ADD COLUMN IF NOT EXISTS atributos_geograficos_jsonb jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS badge_tpl_activo boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS motivo_badge text,
      ADD COLUMN IF NOT EXISTS valor_recomendado_tpl numeric,
      ADD COLUMN IF NOT EXISTS precio_publicacion numeric,
      ADD COLUMN IF NOT EXISTS fecha_validacion_precio timestamptz,
      ADD COLUMN IF NOT EXISTS clasificacion_visual_precio text,
      ADD COLUMN IF NOT EXISTS estado_crm text DEFAULT 'lead_tasador_integral',
      ADD COLUMN IF NOT EXISTS badge_publico_activo boolean DEFAULT false;
  END IF;
END $$;

-- 3. Ampliación de la tabla de borradores de publicación
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'publicacion_borradores') THEN
    ALTER TABLE public.publicacion_borradores 
      ADD COLUMN IF NOT EXISTS rol_avaluo text,
      ADD COLUMN IF NOT EXISTS sin_rol_conocido boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS conservador text,
      ADD COLUMN IF NOT EXISTS foja text,
      ADD COLUMN IF NOT EXISTS num_inscripcion text,
      ADD COLUMN IF NOT EXISTS anio_inscripcion integer,
      ADD COLUMN IF NOT EXISTS estado_documental text DEFAULT 'no informado',
      ADD COLUMN IF NOT EXISTS obras_adicionales_jsonb jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS caracteristica_diferenciadora text,
      ADD COLUMN IF NOT EXISTS tiene_caracteristica_diferenciadora boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS factor_diferenciador_aplicado numeric(4,2) DEFAULT 1.00,
      ADD COLUMN IF NOT EXISTS indice_ubicacion_tpl integer,
      ADD COLUMN IF NOT EXISTS atributos_geograficos_jsonb jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS badge_tpl_activo boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS motivo_badge text,
      ADD COLUMN IF NOT EXISTS valor_recomendado_tpl numeric,
      ADD COLUMN IF NOT EXISTS precio_publicacion numeric,
      ADD COLUMN IF NOT EXISTS fecha_validacion_precio timestamptz,
      ADD COLUMN IF NOT EXISTS clasificacion_visual_precio text,
      ADD COLUMN IF NOT EXISTS estado_crm text DEFAULT 'lead_tasador_integral',
      ADD COLUMN IF NOT EXISTS badge_publico_activo boolean DEFAULT false;
  END IF;
END $$;

-- 4. Creación de índices para consulta rápida en CRM y Filtros Públicos
CREATE INDEX IF NOT EXISTS idx_tasaciones_rol ON public.tasaciones(rol_avaluo) WHERE rol_avaluo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_publicaciones_unificadas_badge ON public.publicaciones_unificadas(badge_tpl_activo) WHERE badge_tpl_activo = true;
CREATE INDEX IF NOT EXISTS idx_publicaciones_unificadas_rol ON public.publicaciones_unificadas(rol_avaluo) WHERE rol_avaluo IS NOT NULL;

-- 5. Comentarios explicativos y documentación de Rollback (Reglas Comerciales Inmutables)
COMMENT ON COLUMN public.tasaciones.obras_adicionales_jsonb IS 'Detalle JSONB con las obras adicionales evaluadas y sus valores depreciados';
COMMENT ON COLUMN public.tasaciones.indice_ubicacion_tpl IS 'Índice de ubicación de 0 a 100 calculado por TPLLocationService (informativo en V1)';
COMMENT ON COLUMN public.tasaciones.badge_tpl_activo IS 'Regla inmutable comercial: Activo (true) cuando ((precioPublicacion - valorRecomendadoTPL) / valorRecomendadoTPL) * 100 <= 5. Incluye precios inferiores o de venta rápida.';
COMMENT ON COLUMN public.tasaciones.clasificacion_visual_precio IS 'Umbrales inmutables de diferencia respecto a TPL: <= 5% (alineada_tpl, incluye inferiores), > 5% y <= 15% (negociacion_abierta), > 15% y <= 25% (sobreprecio_moderado), > 25% (sobreprecio_severo).';

/*
  ROLLBACK DOCUMENTADO (No ejecutar automáticamente):
  ALTER TABLE public.tasaciones DROP COLUMN IF EXISTS rol_avaluo, DROP COLUMN IF EXISTS sin_rol_conocido, DROP COLUMN IF EXISTS conservador, DROP COLUMN IF EXISTS foja, DROP COLUMN IF EXISTS num_inscripcion, DROP COLUMN IF EXISTS anio_inscripcion, DROP COLUMN IF EXISTS estado_documental, DROP COLUMN IF EXISTS obras_adicionales_jsonb, DROP COLUMN IF EXISTS caracteristica_diferenciadora, DROP COLUMN IF EXISTS tiene_caracteristica_diferenciadora, DROP COLUMN IF EXISTS factor_diferenciador_aplicado, DROP COLUMN IF EXISTS indice_ubicacion_tpl, DROP COLUMN IF EXISTS atributos_geograficos_jsonb, DROP COLUMN IF EXISTS badge_tpl_activo, DROP COLUMN IF EXISTS motivo_badge, DROP COLUMN IF EXISTS valor_recomendado_tpl, DROP COLUMN IF EXISTS precio_publicacion, DROP COLUMN IF EXISTS fecha_validacion_precio;
  ALTER TABLE public.publicaciones_unificadas DROP COLUMN IF EXISTS rol_avaluo, DROP COLUMN IF EXISTS sin_rol_conocido, DROP COLUMN IF EXISTS conservador, DROP COLUMN IF EXISTS foja, DROP COLUMN IF EXISTS num_inscripcion, DROP COLUMN IF EXISTS anio_inscripcion, DROP COLUMN IF EXISTS estado_documental, DROP COLUMN IF EXISTS obras_adicionales_jsonb, DROP COLUMN IF EXISTS caracteristica_diferenciadora, DROP COLUMN IF EXISTS tiene_caracteristica_diferenciadora, DROP COLUMN IF EXISTS factor_diferenciador_aplicado, DROP COLUMN IF EXISTS indice_ubicacion_tpl, DROP COLUMN IF EXISTS atributos_geograficos_jsonb, DROP COLUMN IF EXISTS badge_tpl_activo, DROP COLUMN IF EXISTS motivo_badge, DROP COLUMN IF EXISTS valor_recomendado_tpl, DROP COLUMN IF EXISTS precio_publicacion, DROP COLUMN IF EXISTS fecha_validacion_precio;
  ALTER TABLE public.publicacion_borradores DROP COLUMN IF EXISTS rol_avaluo, DROP COLUMN IF EXISTS sin_rol_conocido, DROP COLUMN IF EXISTS conservador, DROP COLUMN IF EXISTS foja, DROP COLUMN IF EXISTS num_inscripcion, DROP COLUMN IF EXISTS anio_inscripcion, DROP COLUMN IF EXISTS estado_documental, DROP COLUMN IF EXISTS obras_adicionales_jsonb, DROP COLUMN IF EXISTS caracteristica_diferenciadora, DROP COLUMN IF EXISTS tiene_caracteristica_diferenciadora, DROP COLUMN IF EXISTS factor_diferenciador_aplicado, DROP COLUMN IF EXISTS indice_ubicacion_tpl, DROP COLUMN IF EXISTS atributos_geograficos_jsonb, DROP COLUMN IF EXISTS badge_tpl_activo, DROP COLUMN IF EXISTS motivo_badge, DROP COLUMN IF EXISTS valor_recomendado_tpl, DROP COLUMN IF EXISTS precio_publicacion, DROP COLUMN IF EXISTS fecha_validacion_precio;
*/
