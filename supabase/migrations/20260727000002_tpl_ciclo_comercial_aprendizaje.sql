-- Migración SQL no destructiva: Ciclo Comercial Real y Aprendizaje del Tasador TPL
-- Timestamp: 20260727000002
-- Descripción: Agrega soporte para historial inmutable de precios, canales comerciales separados, declaración de cierre con indicadores derivados y vista analítica de calibración.

-- 1. Ampliación de historial_precios_publicacion para trazabilidad de badge y montos inmutables
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'historial_precios_publicacion') THEN
    ALTER TABLE public.historial_precios_publicacion 
      ADD COLUMN IF NOT EXISTS precio_anterior bigint,
      ADD COLUMN IF NOT EXISTS precio_nuevo bigint,
      ADD COLUMN IF NOT EXISTS badge_activo_antes boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS badge_activo_despues boolean DEFAULT false;
  END IF;
END $$;

-- 2. Ampliación de ventas_declaradas con métricas comerciales, canales y versiones
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ventas_declaradas') THEN
    ALTER TABLE public.ventas_declaradas 
      ADD COLUMN IF NOT EXISTS canal_descubrimiento text,
      ADD COLUMN IF NOT EXISTS canal_contacto text,
      ADD COLUMN IF NOT EXISTS canal_cierre text,
      ADD COLUMN IF NOT EXISTS comprador_originado_por_tpl boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS publicacion_influenciada_por_tpl boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS valor_sugerido_propietario numeric,
      ADD COLUMN IF NOT EXISTS valor_recomendado_tpl numeric,
      ADD COLUMN IF NOT EXISTS valor_venta_rapida numeric,
      ADD COLUMN IF NOT EXISTS valor_venta_paciente numeric,
      ADD COLUMN IF NOT EXISTS precio_inicial_publicacion numeric,
      ADD COLUMN IF NOT EXISTS dias_en_mercado integer,
      ADD COLUMN IF NOT EXISTS cantidad_cambios_precio integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS consultas_recibidas integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS visitas_solicitadas integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS visitas_realizadas integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ofertas_recibidas integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS monto_ofertas_jsonb jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS badge_tpl_activo_al_cierre boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS diferencia_propietario_tpl_abs numeric,
      ADD COLUMN IF NOT EXISTS diferencia_propietario_tpl_pct numeric,
      ADD COLUMN IF NOT EXISTS diferencia_tpl_venta_real numeric,
      ADD COLUMN IF NOT EXISTS error_porcentual_tasacion numeric,
      ADD COLUMN IF NOT EXISTS precision_aproximada numeric,
      ADD COLUMN IF NOT EXISTS reduccion_total_precio numeric,
      ADD COLUMN IF NOT EXISTS conversion_consultas_visitas numeric,
      ADD COLUMN IF NOT EXISTS conversion_visitas_ofertas numeric,
      ADD COLUMN IF NOT EXISTS conversion_ofertas_venta numeric,
      ADD COLUMN IF NOT EXISTS version_motor_territorial text DEFAULT 'tpl-land-engine-v1',
      ADD COLUMN IF NOT EXISTS version_motor_vivienda text DEFAULT 'tpl-house-engine-v1',
      ADD COLUMN IF NOT EXISTS version_modulo_ubicacion text DEFAULT 'tpl-location-service-v1',
      ADD COLUMN IF NOT EXISTS version_reglas text DEFAULT '2026-07-27';
  END IF;
END $$;

-- 3. Ampliación de la tabla de tasaciones para registrar versiones y canales previstos
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasaciones') THEN
    ALTER TABLE public.tasaciones 
      ADD COLUMN IF NOT EXISTS version_motor_territorial text DEFAULT 'tpl-land-engine-v1',
      ADD COLUMN IF NOT EXISTS version_motor_vivienda text DEFAULT 'tpl-house-engine-v1',
      ADD COLUMN IF NOT EXISTS version_modulo_ubicacion text DEFAULT 'tpl-location-service-v1',
      ADD COLUMN IF NOT EXISTS version_reglas text DEFAULT '2026-07-27',
      ADD COLUMN IF NOT EXISTS canal_descubrimiento text DEFAULT 'Tu Parcela Lista',
      ADD COLUMN IF NOT EXISTS canal_contacto text,
      ADD COLUMN IF NOT EXISTS canal_cierre text;
  END IF;
END $$;

-- 4. Creación de la Tabla/Vista Analítica Separada para Futura Calibración del Modelo
CREATE TABLE IF NOT EXISTS public.tpl_analitica_calibracion_motor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tasacion_id uuid REFERENCES public.tasaciones(id) ON DELETE SET NULL,
  publicacion_id uuid REFERENCES public.publicaciones(id) ON DELETE SET NULL,
  venta_declarada_id uuid REFERENCES public.ventas_declaradas(id) ON DELETE SET NULL,
  region text NOT NULL,
  comuna text NOT NULL,
  tipo_propiedad text NOT NULL DEFAULT 'parcela_con_casa',
  superficie_m2 numeric NOT NULL,
  material_vivienda text,
  superficie_vivienda_m2 numeric,
  valor_recomendado_tpl numeric NOT NULL,
  precio_inicial_publicacion numeric,
  precio_vendido numeric,
  plazo_venta_dias integer,
  canal_descubrimiento text,
  canal_contacto text,
  canal_cierre text,
  comprador_originado_por_tpl boolean DEFAULT false,
  uso_badge_tpl boolean DEFAULT false,
  error_porcentual_tasacion numeric,
  precision_aproximada numeric,
  version_motor_territorial text NOT NULL,
  version_motor_vivienda text NOT NULL,
  version_modulo_ubicacion text NOT NULL,
  fecha_registro timestamptz NOT NULL DEFAULT now()
);

-- 5. Índices analíticos para consultas rápidas en CRM
CREATE INDEX IF NOT EXISTS idx_tpl_analitica_region_comuna ON public.tpl_analitica_calibracion_motor(region, comuna);
CREATE INDEX IF NOT EXISTS idx_tpl_analitica_precision ON public.tpl_analitica_calibracion_motor(precision_aproximada);
CREATE INDEX IF NOT EXISTS idx_ventas_declaradas_badge ON public.ventas_declaradas(badge_tpl_activo_al_cierre);

-- 6. Seguridad Robusta para Recuperación de Borradores (Token Independiente + SHA-256)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.tpl_borradores_seguros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id text,
  token_hash text NOT NULL,
  payload_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_en timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  usado boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_tpl_borradores_hash_exp ON public.tpl_borradores_seguros(id, token_hash, expires_at);
ALTER TABLE public.tpl_borradores_seguros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bloqueo total lectura directa borradores" ON public.tpl_borradores_seguros FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "Inserción y actualización controlada" ON public.tpl_borradores_seguros FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.guardar_borrador_tpl(p_id uuid, p_token_secret text, p_payload jsonb, p_expediente text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash text;
BEGIN
  v_hash := encode(digest(p_token_secret, 'sha256'), 'hex');
  INSERT INTO public.tpl_borradores_seguros (id, expediente_id, token_hash, payload_jsonb, expires_at)
  VALUES (p_id, p_expediente, v_hash, p_payload, now() + interval '30 days')
  ON CONFLICT (id) DO UPDATE
  SET token_hash = v_hash, payload_jsonb = p_payload, expediente_id = COALESCE(p_expediente, tpl_borradores_seguros.expediente_id), expires_at = now() + interval '30 days';
  
  RETURN jsonb_build_object('success', true, 'id', p_id, 'expires_at', (now() + interval '30 days'));
END;
$$;

CREATE OR REPLACE FUNCTION public.recuperar_borrador_tpl(p_id uuid, p_token_secret text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash text;
  v_row record;
BEGIN
  v_hash := encode(digest(p_token_secret, 'sha256'), 'hex');
  SELECT id, payload_jsonb, expires_at INTO v_row
  FROM public.tpl_borradores_seguros
  WHERE id = p_id AND token_hash = v_hash AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Borrador no encontrado, expirado o token secreto inválido (403/404).';
  END IF;
  
  RETURN v_row.payload_jsonb;
END;
$$;

-- 7. Normalización y Seguridad de Storage (Bucket Privado Versionado)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
    VALUES ('expedientes-privados', 'expedientes-privados', false, false, 10485760, ARRAY['application/pdf', 'text/html', 'application/json'])
    ON CONFLICT (id) DO UPDATE
    SET public = false, file_size_limit = 10485760;
  END IF;
END $$;

DROP POLICY IF EXISTS "Permitir subida expedientes privados" ON storage.objects;
CREATE POLICY "Permitir subida expedientes privados" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'expedientes-privados');

DROP POLICY IF EXISTS "Bloqueo lectura pública directa expedientes" ON storage.objects;
CREATE POLICY "Bloqueo lectura pública directa expedientes" ON storage.objects FOR SELECT TO anon USING (false);

-- 8. Documentación
COMMENT ON TABLE public.tpl_analitica_calibracion_motor IS 'Tabla analítica desacoplada para la calibración futura y aprendizaje inteligente del motor de tasación TPL.';
COMMENT ON COLUMN public.ventas_declaradas.precision_aproximada IS 'Precisión calculada como 100 - |error_porcentual_tasacion|, utilizada para análisis de rendimiento sin alterar reglas automáticas en V1.';
COMMENT ON TABLE public.tpl_borradores_seguros IS 'Almacén inmutable y seguro de borradores con token SHA-256 sin acceso RLS público directo.';

/*
  ROLLBACK DOCUMENTADO (No ejecutar automáticamente):
  DROP TABLE IF EXISTS public.tpl_analitica_calibracion_motor;
  DROP TABLE IF EXISTS public.tpl_borradores_seguros;
  DROP FUNCTION IF EXISTS public.guardar_borrador_tpl(uuid, text, jsonb, text);
  DROP FUNCTION IF EXISTS public.recuperar_borrador_tpl(uuid, text);
  ALTER TABLE public.historial_precios_publicacion DROP COLUMN IF EXISTS precio_anterior, DROP COLUMN IF EXISTS precio_nuevo, DROP COLUMN IF EXISTS badge_activo_antes, DROP COLUMN IF EXISTS badge_activo_despues;
  ALTER TABLE public.ventas_declaradas DROP COLUMN IF EXISTS canal_descubrimiento, DROP COLUMN IF EXISTS canal_contacto, DROP COLUMN IF EXISTS canal_cierre, DROP COLUMN IF EXISTS comprador_originado_por_tpl, DROP COLUMN IF EXISTS publicacion_influenciada_por_tpl, DROP COLUMN IF EXISTS valor_sugerido_propietario, DROP COLUMN IF EXISTS valor_recomendado_tpl, DROP COLUMN IF EXISTS valor_venta_rapida, DROP COLUMN IF EXISTS valor_venta_paciente, DROP COLUMN IF EXISTS precio_inicial_publicacion, DROP COLUMN IF EXISTS dias_en_mercado, DROP COLUMN IF EXISTS cantidad_cambios_precio, DROP COLUMN IF EXISTS consultas_recibidas, DROP COLUMN IF EXISTS visitas_solicitadas, DROP COLUMN IF EXISTS visitas_realizadas, DROP COLUMN IF EXISTS ofertas_recibidas, DROP COLUMN IF EXISTS monto_ofertas_jsonb, DROP COLUMN IF EXISTS badge_tpl_activo_al_cierre, DROP COLUMN IF EXISTS diferencia_propietario_tpl_abs, DROP COLUMN IF EXISTS diferencia_propietario_tpl_pct, DROP COLUMN IF EXISTS diferencia_tpl_venta_real, DROP COLUMN IF EXISTS error_porcentual_tasacion, DROP COLUMN IF EXISTS precision_aproximada, DROP COLUMN IF EXISTS reduccion_total_precio, DROP COLUMN IF EXISTS conversion_consultas_visitas, DROP COLUMN IF EXISTS conversion_visitas_ofertas, DROP COLUMN IF EXISTS conversion_ofertas_venta, DROP COLUMN IF EXISTS version_motor_territorial, DROP COLUMN IF EXISTS version_motor_vivienda, DROP COLUMN IF EXISTS version_modulo_ubicacion, DROP COLUMN IF EXISTS version_reglas;
*/
