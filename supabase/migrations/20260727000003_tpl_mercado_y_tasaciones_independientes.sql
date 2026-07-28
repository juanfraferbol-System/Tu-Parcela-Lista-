-- Migración SQL canónica: Índice de Mercado TPL y Base de Datos de Tasaciones Independientes
-- Timestamp: 20260727000003
-- Etapas 4 y 14 de la Implementación Integral de Tasador Independiente + Publicar.

-- 1. CREACIÓN DE LA TABLA MERCADO_COMUNAS (ETAPA 4)
CREATE TABLE IF NOT EXISTS public.mercado_comunas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  comuna text NOT NULL,
  valor_promedio_m2 numeric NOT NULL,
  valor_parcela_tipo_5000 numeric,
  comparables_revisados integer DEFAULT 0,
  comparables_validos integer DEFAULT 0,
  rango_bajo_m2 numeric,
  rango_alto_m2 numeric,
  confianza text,
  fuentes jsonb DEFAULT '[]'::jsonb,
  version text,
  fecha_actualizacion date DEFAULT CURRENT_DATE,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índice único por región y comuna activa para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_mercado_comunas_unique_active 
  ON public.mercado_comunas(region, comuna) WHERE (activo = true);

-- Políticas RLS en mercado_comunas
ALTER TABLE public.mercado_comunas ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mercado_comunas' AND policyname = 'Lectura pública de mercado activo') THEN
    CREATE POLICY "Lectura pública de mercado activo" ON public.mercado_comunas
      FOR SELECT USING (activo = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mercado_comunas' AND policyname = 'Escritura solo admin o service role') THEN
    CREATE POLICY "Escritura solo admin o service role" ON public.mercado_comunas
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Insertar inicialmente los cinco registros canónicos (ETAPA 4)
INSERT INTO public.mercado_comunas (region, comuna, valor_promedio_m2, valor_parcela_tipo_5000, confianza, version, fecha_actualizacion, activo)
VALUES 
  ('Biobío', 'Florida', 6700, 33500000, 'Alta', 'IM-TPL-2026-07', CURRENT_DATE, true),
  ('Biobío', 'Yumbel', 5900, 29500000, 'Alta', 'IM-TPL-2026-07', CURRENT_DATE, true),
  ('Biobío', 'Nacimiento', 5600, 28000000, 'Media-Alta', 'IM-TPL-2026-07', CURRENT_DATE, true),
  ('Ñuble', 'Quillón', 6300, 31500000, 'Alta', 'IM-TPL-2026-07', CURRENT_DATE, true),
  ('Ñuble', 'Ránquil', 5200, 26000000, 'Media', 'IM-TPL-2026-07', CURRENT_DATE, true)
ON CONFLICT (region, comuna) WHERE (activo = true) 
DO UPDATE SET 
  valor_promedio_m2 = EXCLUDED.valor_promedio_m2,
  valor_parcela_tipo_5000 = EXCLUDED.valor_parcela_tipo_5000,
  confianza = EXCLUDED.confianza,
  version = EXCLUDED.version,
  fecha_actualizacion = CURRENT_DATE,
  updated_at = now();


-- 2. ADAPTACIÓN Y AMPLIACIÓN DE LA TABLA CANÓNICA TASACIONES (ETAPA 14)
CREATE TABLE IF NOT EXISTS public.tasaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  usuario_id uuid,
  cliente_id uuid,
  publicacion_id uuid,
  proyecto_id uuid,
  origen text NOT NULL DEFAULT 'tasador_independiente',
  region text,
  comuna text,
  superficie_terreno_m2 numeric,
  datos_entrada jsonb NOT NULL DEFAULT '{}'::jsonb,
  valor_terreno_tpl numeric,
  valor_casa_tpl numeric,
  valor_mejoras_tpl numeric,
  valor_tpl_total numeric,
  valor_mercado_m2 numeric,
  valor_mercado_total numeric,
  valor_comercial_recomendado numeric,
  precio_venta_rapida numeric,
  precio_venta_paciente numeric,
  estrategia_precio text,
  precio_elegido numeric,
  posicion_mercado text,
  confianza_mercado text,
  version_motor text,
  version_indice text,
  estado text DEFAULT 'generada',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Asegurar que todas las columnas requeridas existan si la tabla ya había sido creada antes
DO $$ 
BEGIN
  ALTER TABLE public.tasaciones 
    ADD COLUMN IF NOT EXISTS codigo text,
    ADD COLUMN IF NOT EXISTS usuario_id uuid,
    ADD COLUMN IF NOT EXISTS cliente_id uuid,
    ADD COLUMN IF NOT EXISTS publicacion_id uuid,
    ADD COLUMN IF NOT EXISTS proyecto_id uuid,
    ADD COLUMN IF NOT EXISTS origen text DEFAULT 'tasador_independiente',
    ADD COLUMN IF NOT EXISTS region text,
    ADD COLUMN IF NOT EXISTS comuna text,
    ADD COLUMN IF NOT EXISTS superficie_terreno_m2 numeric,
    ADD COLUMN IF NOT EXISTS datos_entrada jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS valor_terreno_tpl numeric,
    ADD COLUMN IF NOT EXISTS valor_casa_tpl numeric,
    ADD COLUMN IF NOT EXISTS valor_mejoras_tpl numeric,
    ADD COLUMN IF NOT EXISTS valor_tpl_total numeric,
    ADD COLUMN IF NOT EXISTS valor_mercado_m2 numeric,
    ADD COLUMN IF NOT EXISTS valor_mercado_total numeric,
    ADD COLUMN IF NOT EXISTS valor_comercial_recomendado numeric,
    ADD COLUMN IF NOT EXISTS precio_venta_rapida numeric,
    ADD COLUMN IF NOT EXISTS precio_venta_paciente numeric,
    ADD COLUMN IF NOT EXISTS estrategia_precio text,
    ADD COLUMN IF NOT EXISTS precio_elegido numeric,
    ADD COLUMN IF NOT EXISTS posicion_mercado text,
    ADD COLUMN IF NOT EXISTS confianza_mercado text,
    ADD COLUMN IF NOT EXISTS version_motor text,
    ADD COLUMN IF NOT EXISTS version_indice text,
    ADD COLUMN IF NOT EXISTS estado text DEFAULT 'generada',
    ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasaciones_codigo_unique ON public.tasaciones(codigo) WHERE (codigo IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tasaciones_comuna ON public.tasaciones(comuna);
CREATE INDEX IF NOT EXISTS idx_tasaciones_origen ON public.tasaciones(origen);

-- Políticas RLS en tasaciones (ETAPA 14 y 18)
ALTER TABLE public.tasaciones ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasaciones' AND policyname = 'Inserción pública de tasaciones') THEN
    CREATE POLICY "Inserción pública de tasaciones" ON public.tasaciones
      FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasaciones' AND policyname = 'Lectura propia autenticados') THEN
    CREATE POLICY "Lectura propia autenticados" ON public.tasaciones
      FOR SELECT USING (auth.uid() = usuario_id OR auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasaciones' AND policyname = 'Actualización propia autenticados') THEN
    CREATE POLICY "Actualización propia autenticados" ON public.tasaciones
      FOR UPDATE USING (auth.uid() = usuario_id OR auth.role() = 'service_role');
  END IF;
END $$;

-- 3. FUNCIÓN RPC SEGURA PARA RECUPERAR TASACIONES POR CÓDIGO (SIN EXPONER TODA LA TABLA)
CREATE OR REPLACE FUNCTION public.tpl_obtener_tasacion_por_codigo(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT to_jsonb(t.*) INTO v_res
  FROM public.tasaciones t
  WHERE t.codigo = p_codigo
  LIMIT 1;

  RETURN v_res;
END;
$$;
