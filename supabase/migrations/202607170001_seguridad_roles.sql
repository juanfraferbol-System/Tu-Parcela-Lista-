-- Habilitar RLS en tablas Core del CRM y Cotizador
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicaciones_parcela ENABLE ROW LEVEL SECURITY;

-- Permitir inserciones anónimas en publicaciones_parcela
ALTER TABLE public.publicaciones_parcela ALTER COLUMN usuario_id DROP NOT NULL;
CREATE POLICY "Public insert publicaciones_parcela" ON public.publicaciones_parcela
    FOR INSERT WITH CHECK (true);


-- 1. Políticas para tabla CASAS (Catálogo)
-- Público puede leer casas activas
CREATE POLICY "Public read active casas" ON public.casas
    FOR SELECT USING (activa = true);
-- Admin (service_role o autenticado con rol especial) puede hacer todo
CREATE POLICY "Admin full access casas" ON public.casas
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- 2. Políticas para tabla EXTRAS
CREATE POLICY "Public read active extras" ON public.extras
    FOR SELECT USING (activo = true);
CREATE POLICY "Admin full access extras" ON public.extras
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- 3. Políticas para tabla CLIENTES
-- Público puede insertar (al llenar formulario de visita o cotización)
CREATE POLICY "Public insert clientes" ON public.clientes
    FOR INSERT WITH CHECK (true);
-- Cliente autenticado puede ver sus propios datos
CREATE POLICY "User read own cliente" ON public.clientes
    FOR SELECT USING (auth.uid() = usuario_id);
-- Admin puede ver y editar todo
CREATE POLICY "Admin full access clientes" ON public.clientes
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- 4. Políticas para tabla PROYECTOS (Cotizaciones guardadas/activadas)
-- Público puede insertar
CREATE POLICY "Public insert proyectos" ON public.proyectos
    FOR INSERT WITH CHECK (true);
-- Si el proyecto tiene un cliente asociado a un auth.uid, ese usuario puede verlo
CREATE POLICY "User read own proyectos" ON public.proyectos
    FOR SELECT USING (
        cliente_id IN (SELECT id FROM public.clientes WHERE usuario_id = auth.uid())
    );
CREATE POLICY "Admin full access proyectos" ON public.proyectos
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- 5. Políticas para tabla PROYECTO_ITEMS
CREATE POLICY "Public insert proyecto_items" ON public.proyecto_items
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access proyecto_items" ON public.proyecto_items
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- 6. Políticas para tabla VISITAS
CREATE POLICY "Public insert visitas" ON public.visitas
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access visitas" ON public.visitas
    USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'email') IN ('admin@tuparcelalista.cl', 'contacto@tuparcelalista.cl'));

-- Revocar accesos peligrosos por defecto si existieran
REVOKE UPDATE, DELETE ON public.clientes FROM anon;
REVOKE UPDATE, DELETE ON public.proyectos FROM anon;
REVOKE UPDATE, DELETE ON public.visitas FROM anon;
