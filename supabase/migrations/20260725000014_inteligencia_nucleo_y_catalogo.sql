-- Migración 014: Capa 1 - Núcleo del Orquestador y Catálogo Maestro Universal (Preflight Validated)
-- Fecha: 2026-07-25
-- Descripción: Amplía proyectos con atributos canónicos y multi-actor, eleva extras a catálogo orquestado y flexibiliza el motor de flujos.

BEGIN;

-- 1. Atributos canónicos y taxonomía multi-actor en Proyectos Comerciales
ALTER TABLE public.tpl_proyectos_comerciales
  ADD COLUMN IF NOT EXISTS tipo_cliente_canonico text DEFAULT 'dueno',
  ADD COLUMN IF NOT EXISTS canal_origen text DEFAULT 'directo',
  ADD COLUMN IF NOT EXISTS objetivo_comercial text DEFAULT 'vender_rapido',
  ADD COLUMN IF NOT EXISTS nivel_urgencia text DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS estado_embudo text DEFAULT 'onboarding';

ALTER TABLE public.tpl_proyectos_comerciales DROP CONSTRAINT IF EXISTS tpl_proyectos_tipo_cliente_check;
ALTER TABLE public.tpl_proyectos_comerciales ADD CONSTRAINT tpl_proyectos_tipo_cliente_check 
  CHECK (tipo_cliente_canonico IS NULL OR tipo_cliente_canonico IN (
    'dueno', 'corredor', 'inmobiliaria', 'partner', 'constructor', 
    'prestador_servicios', 'abogado', 'fotografo', 'videografo', 'arquitecto', 'admin', 'otro'
  ));

ALTER TABLE public.tpl_proyectos_comerciales DROP CONSTRAINT IF EXISTS tpl_proyectos_urgencia_check;
ALTER TABLE public.tpl_proyectos_comerciales ADD CONSTRAINT tpl_proyectos_urgencia_check 
  CHECK (nivel_urgencia IS NULL OR nivel_urgencia IN ('inmediata', 'alta', 'media', 'baja', 'exploracion', 'ninguna'));

ALTER TABLE public.tpl_proyectos_comerciales DROP CONSTRAINT IF EXISTS tpl_proyectos_embudo_check;
ALTER TABLE public.tpl_proyectos_comerciales ADD CONSTRAINT tpl_proyectos_embudo_check 
  CHECK (estado_embudo IS NULL OR estado_embudo IN ('onboarding', 'tasacion_validada', 'publicado_activo', 'traccion_visitas', 'negociacion', 'cierre', 'post_venta', 'suspendido', 'otro'));

-- 2. Flexibilización del motor de flujos CRM para soportar servicios adicionales, IA, construcción y marketing
ALTER TABLE public.crm_flujos DROP CONSTRAINT IF EXISTS crm_flujos_tipo_check;
ALTER TABLE public.crm_flujos ADD CONSTRAINT crm_flujos_tipo_check 
  CHECK (tipo_proyecto IS NULL OR tipo_proyecto IN (
    'visita', 'parcela', 'casa', 'casa_parcela', 'venta_propiedad', 
    'servicio_extra', 'campana_studio', 'produccion_audiovisual', 'sitio_web', 'onboarding', 'asesoria_legal', 'servicio_terreno', 'construccion', 'otro'
  ));

-- 3. Elevación de la tabla extras a Catálogo Maestro Universal del Orquestador
ALTER TABLE public.extras
  ADD COLUMN IF NOT EXISTS tipo_servicio text DEFAULT 'servicio_terreno',
  ADD COLUMN IF NOT EXISTS flujo_default_id uuid REFERENCES public.crm_flujos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proveedor_default text DEFAULT 'ia_tpl_studio',
  ADD COLUMN IF NOT EXISTS sla_horas integer DEFAULT 48,
  ADD COLUMN IF NOT EXISTS metadata_orquestador jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.extras DROP CONSTRAINT IF EXISTS extras_tipo_servicio_check;
ALTER TABLE public.extras ADD CONSTRAINT extras_tipo_servicio_check 
  CHECK (tipo_servicio IS NULL OR tipo_servicio IN ('plan_upgrade', 'modulo_addon', 'produccion_audiovisual', 'sitio_web', 'marketing_digital', 'asesoria_legal', 'servicio_terreno', 'construccion', 'otro'));

ALTER TABLE public.extras DROP CONSTRAINT IF EXISTS extras_proveedor_default_check;
ALTER TABLE public.extras ADD CONSTRAINT extras_proveedor_default_check 
  CHECK (proveedor_default IS NULL OR proveedor_default IN ('ia_tpl_studio', 'biotv_produccion', 'contratista_terreno', 'asesor_crm', 'abogado_externo', 'automatico', 'otro'));

COMMIT;
