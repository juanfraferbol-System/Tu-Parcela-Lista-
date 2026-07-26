-- Migración 016: Capa 3 - Workflow Engine Universal y Enrutamiento de Proveedores (Preflight Validated)
-- Fecha: 2026-07-25
-- Descripción: Conecta órdenes web con producción en CRM y enruta tareas a IA TPL Studio, Biotv y Contratistas.

BEGIN;

-- 1. Enlace entre solicitudes comerciales web y etapas de producción en terreno o IA
ALTER TABLE public.crm_proyecto_etapas
  ADD COLUMN IF NOT EXISTS solicitud_id uuid REFERENCES public.tpl_solicitudes_comerciales(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS servicio_extra_id uuid REFERENCES public.extras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proveedor_asignado text DEFAULT 'asesor_crm',
  ADD COLUMN IF NOT EXISTS metadata_ejecucion jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.crm_proyecto_etapas DROP CONSTRAINT IF EXISTS crm_etapas_proveedor_check;
ALTER TABLE public.crm_proyecto_etapas ADD CONSTRAINT crm_etapas_proveedor_check 
  CHECK (proveedor_asignado IS NULL OR proveedor_asignado IN ('ia_tpl_studio', 'biotv_produccion', 'contratista_terreno', 'asesor_crm', 'abogado_externo', 'automatico', 'otro'));

-- 2. Índice para consulta rápida de etapas por solicitud o servicio contratado
CREATE INDEX IF NOT EXISTS crm_proyecto_etapas_solicitud_idx ON public.crm_proyecto_etapas(solicitud_id) WHERE solicitud_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_proyecto_etapas_servicio_idx ON public.crm_proyecto_etapas(servicio_extra_id) WHERE servicio_extra_id IS NOT NULL;

-- 3. Ampliación de estados de solicitud para reflejar el ciclo de vida 360° del Orquestador (con tolerancia a históricos)
ALTER TABLE public.tpl_solicitudes_comerciales DROP CONSTRAINT IF EXISTS tpl_solicitudes_estado_check;
ALTER TABLE public.tpl_solicitudes_comerciales ADD CONSTRAINT tpl_solicitudes_estado_check
  CHECK (estado IS NULL OR estado IN ('solicitada', 'contactando', 'aprobada', 'contratada', 'en_produccion', 'entregada', 'publicada', 'rechazada', 'finalizada', 'activada', 'cancelada', 'otro'));

COMMIT;
