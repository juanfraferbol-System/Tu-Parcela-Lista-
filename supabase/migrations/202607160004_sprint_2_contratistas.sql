-- Migración Sprint 2: Smart Match Contratistas

-- 1. Tabla de Contratistas
CREATE TABLE IF NOT EXISTS public.contratistas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_empresa TEXT NOT NULL,
    telefono TEXT NOT NULL,
    ubicacion_base TEXT,
    calificacion TEXT,
    precio_radier TEXT,
    precio_kit_basico TEXT,
    precio_llave_en_mano TEXT,
    notas_capacidades TEXT,
    estado TEXT DEFAULT 'disponible',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para contratistas
ALTER TABLE public.contratistas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública contratistas" ON public.contratistas;
CREATE POLICY "Lectura pública contratistas" ON public.contratistas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin contratistas" ON public.contratistas;
CREATE POLICY "Admin contratistas" ON public.contratistas USING (true) WITH CHECK (true);

-- 2. Tabla de Asignaciones (Match)
CREATE TABLE IF NOT EXISTS public.asignaciones_proyectos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE CASCADE,
    contratista_id UUID REFERENCES public.contratistas(id) ON DELETE CASCADE,
    estado TEXT DEFAULT 'pendiente', -- pendiente, aceptado, rechazado, finalizado
    notas_seguimiento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para asignaciones
ALTER TABLE public.asignaciones_proyectos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública asignaciones" ON public.asignaciones_proyectos;
CREATE POLICY "Lectura pública asignaciones" ON public.asignaciones_proyectos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin asignaciones" ON public.asignaciones_proyectos;
CREATE POLICY "Admin asignaciones" ON public.asignaciones_proyectos USING (true) WITH CHECK (true);
