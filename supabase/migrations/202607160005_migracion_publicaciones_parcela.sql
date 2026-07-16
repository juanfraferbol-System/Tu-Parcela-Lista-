-- 1. Tabla de Publicaciones
CREATE TABLE public.publicaciones_parcela (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references auth.users(id),
    tipo_publicador text,
    estado text default 'borrador',
    schema_version int default 1,
    descripcion_origen text,
    descripcion_publica text,
    titulo_publico text,
    datos_parcela jsonb default '{}'::jsonb,
    datos_publicador jsonb default '{}'::jsonb,
    modelo_comercial text,
    plan_corredor text,
    monto_liquido numeric,
    porcentaje_servicio numeric,
    monto_servicio numeric,
    precio_publicacion numeric,
    publicacion_enviada_en timestamptz,
    creada_en timestamptz default now(),
    actualizada_en timestamptz default now()
);

-- 2. Imágenes de la Publicación
CREATE TABLE public.publicacion_imagenes (
    id uuid primary key default gen_random_uuid(),
    publicacion_id uuid references public.publicaciones_parcela(id) on delete cascade,
    usuario_id uuid references auth.users(id),
    storage_path text not null,
    nombre_original text,
    mime_type text,
    tamano_bytes bigint,
    orden int default 0,
    es_portada bool default false,
    estado text default 'activa',
    creada_en timestamptz default now()
);

-- 3. Tabla Corredores
CREATE TABLE public.corredores (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid unique references auth.users(id) on delete cascade,
    nombre_corredora text not null,
    representante text,
    correo text not null,
    telefono text,
    whatsapp text,
    anos_experiencia int,
    rut text,
    sitio_web text,
    red_social text,
    logo_path text,
    presentacion text,
    plan_actual text default 'Inicio',
    puntuacion_promedio numeric default 0,
    cantidad_evaluaciones int default 0,
    tiempo_respuesta_categoria text,
    nivel_tpl text,
    estado text default 'activo',
    creado_en timestamptz default now(),
    actualizado_en timestamptz default now()
);

-- 4. Planes Corredor
CREATE TABLE public.planes_corredor (
    id uuid primary key default gen_random_uuid(),
    nombre_plan text unique not null,
    precio numeric not null,
    limite_publicaciones int not null,
    beneficios jsonb default '[]'::jsonb,
    activo bool default true
);

INSERT INTO public.planes_corredor (nombre_plan, precio, limite_publicaciones, beneficios) VALUES
('Inicio', 0, 1, '["1 publicación básica"]'::jsonb),
('Profesional', 47000, 5, '["5 publicaciones", "Soporte email"]'::jsonb),
('Gold', 78900, 10, '["10 publicaciones", "Destacados"]'::jsonb),
('Platinum', 120000, 20, '["20 publicaciones", "IA Premium"]'::jsonb);

-- 5. Aceptaciones
CREATE TABLE public.aceptaciones_publicacion (
    id uuid primary key default gen_random_uuid(),
    publicacion_id uuid references public.publicaciones_parcela(id) on delete cascade,
    usuario_id uuid references auth.users(id),
    tipo_aceptacion text not null,
    version int,
    texto_hash text,
    datos_evidencia jsonb,
    fecha timestamptz default now()
);

-- 6. Historial (Logs inmutables)
CREATE TABLE public.historial_publicacion (
    id uuid primary key default gen_random_uuid(),
    publicacion_id uuid references public.publicaciones_parcela(id) on delete cascade,
    usuario_id uuid references auth.users(id),
    tipo_evento text not null,
    titulo text,
    detalle text,
    datos jsonb default '{}'::jsonb,
    fecha timestamptz default now()
);

-- =========== FASE 2: RLS Y POLÍTICAS =========== --

ALTER TABLE public.publicaciones_parcela ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacion_imagenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corredores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes_corredor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aceptaciones_publicacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_publicacion ENABLE ROW LEVEL SECURITY;

-- Funciones de ayuda
CREATE OR REPLACE FUNCTION es_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT false; 
$$;

-- Políticas de lectura
CREATE POLICY "Dueño lee su publicación" ON public.publicaciones_parcela FOR SELECT USING (usuario_id = auth.uid() OR es_admin());
CREATE POLICY "Lectura pública parcelas aprobadas" ON public.publicaciones_parcela FOR SELECT USING (estado IN ('aprobada', 'publicada', 'vendida'));
CREATE POLICY "Lectura planes" ON public.planes_corredor FOR SELECT USING (true);

-- Políticas de escritura (Publicaciones)
CREATE POLICY "Crear solicitud propia" ON public.publicaciones_parcela FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "Actualizar solicitud propia en borrador" ON public.publicaciones_parcela FOR UPDATE USING (usuario_id = auth.uid() AND estado IN ('borrador', 'requiere_cambios')) WITH CHECK (usuario_id = auth.uid() AND estado IN ('borrador', 'requiere_cambios', 'pendiente_revision'));

-- Políticas (Corredores)
CREATE POLICY "Dueño administra su perfil" ON public.corredores FOR ALL USING (usuario_id = auth.uid() OR es_admin());

-- Políticas (Imágenes)
CREATE POLICY "Dueño sube imágenes" ON public.publicacion_imagenes FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "Dueño gestiona imágenes" ON public.publicacion_imagenes FOR UPDATE USING (usuario_id = auth.uid());
CREATE POLICY "Dueño borra imágenes" ON public.publicacion_imagenes FOR DELETE USING (usuario_id = auth.uid());
CREATE POLICY "Lectura pública imágenes" ON public.publicacion_imagenes FOR SELECT USING (true);
