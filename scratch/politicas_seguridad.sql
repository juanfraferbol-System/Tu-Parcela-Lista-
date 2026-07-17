-- ====================================================================
-- SCRIPT DE SEGURIDAD PARA EL CRM (ROW LEVEL SECURITY)
-- ====================================================================

-- 0. Asegurarnos de que las tablas existan (por si fueron borradas por error)
CREATE TABLE IF NOT EXISTS cotizaciones_proyectos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  cliente_nombre text,
  cliente_telefono text,
  cliente_email text,
  parcela_id text,
  parcela_comuna text,
  casa_id text,
  plan_base text,
  total numeric,
  estado text DEFAULT 'Pendiente',
  extras text
);

CREATE TABLE IF NOT EXISTS contratistas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  nombre_empresa text,
  nombre_comercial text,
  nombre text,
  tipo_servicio text,
  especialidades text,
  region text,
  comunas_atendidas text,
  telefono text,
  whatsapp text,
  correo text,
  anos_experiencia numeric,
  descripcion_servicios text,
  plan_elegido text,
  estado_verificacion text DEFAULT 'pendiente',
  rating numeric DEFAULT 0.0,
  trabajos_realizados numeric DEFAULT 0,
  slug text,
  logo_url text,
  fotos_galeria jsonb,
  estado text DEFAULT 'Activo'
);

-- Activar RLS en las tablas críticas si no lo están
ALTER TABLE cotizaciones_proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratistas ENABLE ROW LEVEL SECURITY;

-- ELIMINAR TODAS LAS POLÍTICAS ANTERIORES PARA EVITAR CONFLICTOS
DROP POLICY IF EXISTS "Public can view cotizaciones_proyectos" ON cotizaciones_proyectos;
DROP POLICY IF EXISTS "Public can insert cotizaciones_proyectos" ON cotizaciones_proyectos;
DROP POLICY IF EXISTS "Public can view contratistas" ON contratistas;
DROP POLICY IF EXISTS "Public can insert contratistas" ON contratistas;
DROP POLICY IF EXISTS "Auth users can view cotizaciones" ON cotizaciones_proyectos;
DROP POLICY IF EXISTS "Auth users can update cotizaciones" ON cotizaciones_proyectos;
DROP POLICY IF EXISTS "Auth users can view contratistas" ON contratistas;
DROP POLICY IF EXISTS "Auth users can update contratistas" ON contratistas;
DROP POLICY IF EXISTS "Public can view verified contratistas" ON contratistas;

-- ==========================================
-- POLÍTICAS PARA COTIZACIONES PROYECTOS
-- ==========================================

-- 1. Cualquier usuario (incluso no autenticado) puede INSERTAR (crear) una cotización
CREATE POLICY "Public can insert cotizaciones_proyectos" 
ON cotizaciones_proyectos 
FOR INSERT 
WITH CHECK (true);

-- 2. SOLO usuarios autenticados (Logueados en CRM) pueden LEER las cotizaciones
CREATE POLICY "Auth users can view cotizaciones" 
ON cotizaciones_proyectos 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. SOLO usuarios autenticados pueden ACTUALIZAR cotizaciones (estado, etc)
CREATE POLICY "Auth users can update cotizaciones" 
ON cotizaciones_proyectos 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- 4. SOLO usuarios autenticados pueden BORRAR cotizaciones
CREATE POLICY "Auth users can delete cotizaciones" 
ON cotizaciones_proyectos 
FOR DELETE 
USING (auth.role() = 'authenticated');


-- ==========================================
-- POLÍTICAS PARA CONTRATISTAS (RED DE PARTNERS)
-- ==========================================

-- 1. Cualquier usuario puede POSTULAR (Insertar)
CREATE POLICY "Public can insert contratistas" 
ON contratistas 
FOR INSERT 
WITH CHECK (true);

-- 2. El público general SOLO puede ver los contratistas VERIFICADOS
CREATE POLICY "Public can view verified contratistas" 
ON contratistas 
FOR SELECT 
USING (estado_verificacion = 'verificado' OR auth.role() = 'authenticated');

-- 3. SOLO usuarios autenticados (CRM) pueden ACTUALIZAR contratistas (aprobar/rechazar)
CREATE POLICY "Auth users can update contratistas" 
ON contratistas 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- 4. SOLO usuarios autenticados pueden BORRAR contratistas
CREATE POLICY "Auth users can delete contratistas" 
ON contratistas 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- ==========================================
-- NOTA IMPORTANTE PARA EL ADMINISTRADOR:
-- Por defecto, cualquier persona que logre crear una cuenta en Supabase será 'authenticated'.
-- Si quieres restringir que SOLO tu correo pueda ver el CRM, debes cambiar:
-- auth.role() = 'authenticated'
-- por:
-- auth.jwt() ->> 'email' = 'tu@correo.com'
-- o desactivar los registros públicos en el panel de Authentication -> Providers de Supabase.
-- ==========================================
