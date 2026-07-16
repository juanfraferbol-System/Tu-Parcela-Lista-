-- 1. Tabla Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    nombre text NOT NULL,
    apellido text,
    correo text UNIQUE,
    telefono text,
    whatsapp text,
    comuna text,
    region text,
    medio_contacto_preferido text,
    presupuesto_estimado numeric,
    observaciones text,
    acepta_tratamiento_datos bool DEFAULT false,
    estado text DEFAULT 'nuevo',
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

-- 2. Tabla Casas
CREATE TABLE IF NOT EXISTS public.casas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo text UNIQUE,
    nombre text NOT NULL,
    descripcion text,
    superficie_m2 numeric NOT NULL,
    habitaciones int4 NOT NULL,
    banos int4 NOT NULL,
    precio_base numeric NOT NULL,
    tipo_construccion text,
    plano_url text,
    imagen_principal_url text,
    imagenes jsonb DEFAULT '[]'::jsonb,
    activa bool DEFAULT true,
    destacada bool DEFAULT false,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

-- 3. Tabla Extras
CREATE TABLE IF NOT EXISTS public.extras (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo text UNIQUE,
    nombre text NOT NULL,
    descripcion text,
    categoria text NOT NULL,
    tipo_calculo text NOT NULL,
    precio_base numeric NOT NULL,
    unidad text,
    activo bool DEFAULT true,
    requiere_contratista bool DEFAULT false,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

-- 4. Tabla Proyectos
CREATE TABLE IF NOT EXISTS public.proyectos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_proyecto text UNIQUE,
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
    parcela_id uuid REFERENCES public.publicaciones(id) ON DELETE SET NULL,
    casa_id uuid REFERENCES public.casas(id) ON DELETE SET NULL,
    modalidad text NOT NULL DEFAULT 'llave_en_mano',
    estado text NOT NULL DEFAULT 'cotizacion_enviada',
    subtotal numeric NOT NULL DEFAULT 0,
    descuentos numeric NOT NULL DEFAULT 0,
    total numeric NOT NULL DEFAULT 0,
    fecha_inicio_estimada date,
    origen text,
    observaciones_cliente text,
    observaciones_internas text,
    activado_en timestamptz,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

-- 5. Tabla Proyecto Items
CREATE TABLE IF NOT EXISTS public.proyecto_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE CASCADE,
    tipo text NOT NULL,
    referencia_id text, -- Usamos text para soportar IDs legacy o UUIDs sin constrain duro
    nombre text NOT NULL,
    descripcion text,
    cantidad numeric NOT NULL DEFAULT 1,
    unidad text,
    precio_unitario numeric NOT NULL DEFAULT 0,
    subtotal numeric NOT NULL DEFAULT 0,
    datos_snapshot jsonb DEFAULT '{}'::jsonb,
    orden int4 DEFAULT 0,
    creado_en timestamptz DEFAULT now()
);

-- Secuencia para Nro de Proyecto
CREATE SEQUENCE IF NOT EXISTS proyectos_numero_seq START 1;

CREATE OR REPLACE FUNCTION generar_numero_proyecto()
RETURNS trigger AS $$
BEGIN
    IF NEW.numero_proyecto IS NULL THEN
        NEW.numero_proyecto := 'TPL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('proyectos_numero_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generar_numero_proyecto ON public.proyectos;
CREATE TRIGGER tr_generar_numero_proyecto
BEFORE INSERT ON public.proyectos
FOR EACH ROW
EXECUTE FUNCTION generar_numero_proyecto();

-- Privilegios y RLS
GRANT SELECT, INSERT, UPDATE ON public.clientes TO anon;
GRANT SELECT, INSERT ON public.proyectos TO anon;
GRANT SELECT, INSERT ON public.proyecto_items TO anon;

GRANT ALL ON public.clientes TO authenticated;
GRANT ALL ON public.casas TO authenticated;
GRANT ALL ON public.extras TO authenticated;
GRANT ALL ON public.proyectos TO authenticated;
GRANT ALL ON public.proyecto_items TO authenticated;

-- Grant usage on sequences so anon can insert to proyectos
GRANT USAGE ON SEQUENCE proyectos_numero_seq TO anon;
GRANT USAGE ON SEQUENCE proyectos_numero_seq TO authenticated;

GRANT SELECT ON public.casas TO anon;
GRANT SELECT ON public.extras TO anon;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_items ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Anon puede interactuar con clientes" ON public.clientes;
CREATE POLICY "Anon puede interactuar con clientes" ON public.clientes FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon puede insertar proyectos" ON public.proyectos;
CREATE POLICY "Anon puede insertar proyectos" ON public.proyectos FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Anon puede leer su propio proyecto recien creado" ON public.proyectos;
CREATE POLICY "Anon puede leer su propio proyecto recien creado" ON public.proyectos FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anon puede insertar proyecto_items" ON public.proyecto_items;
CREATE POLICY "Anon puede insertar proyecto_items" ON public.proyecto_items FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura publica de casas" ON public.casas;
CREATE POLICY "Lectura publica de casas" ON public.casas FOR SELECT TO anon USING (activa = true);

DROP POLICY IF EXISTS "Lectura publica de extras" ON public.extras;
CREATE POLICY "Lectura publica de extras" ON public.extras FOR SELECT TO anon USING (activo = true);

-- Políticas Admin
DROP POLICY IF EXISTS "Admin clientes" ON public.clientes;
CREATE POLICY "Admin clientes" ON public.clientes TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin casas" ON public.casas;
CREATE POLICY "Admin casas" ON public.casas TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin extras" ON public.extras;
CREATE POLICY "Admin extras" ON public.extras TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin proyectos" ON public.proyectos;
CREATE POLICY "Admin proyectos" ON public.proyectos TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin proyecto_items" ON public.proyecto_items;
CREATE POLICY "Admin proyecto_items" ON public.proyecto_items TO authenticated USING (true);

-- Función RPC para insertar todo de una vez desde la web
CREATE OR REPLACE FUNCTION crear_proyecto_completo(
  p_cliente_nombre text,
  p_cliente_email text,
  p_cliente_telefono text,
  p_parcela_id uuid,
  p_casa_codigo text,
  p_total numeric,
  p_extras jsonb
) RETURNS text AS $$
DECLARE
  v_cliente_id uuid;
  v_proyecto_id uuid;
  v_numero_proyecto text;
  v_casa_id uuid;
  v_extra jsonb;
BEGIN
  -- 1. Buscar o crear cliente (por email)
  SELECT id INTO v_cliente_id FROM public.clientes WHERE correo = p_cliente_email LIMIT 1;
  IF v_cliente_id IS NULL THEN
    INSERT INTO public.clientes (nombre, correo, telefono, estado)
    VALUES (p_cliente_nombre, p_cliente_email, p_cliente_telefono, 'nuevo')
    RETURNING id INTO v_cliente_id;
  END IF;

  -- Buscar uuid de la casa a partir del codigo
  IF p_casa_codigo IS NOT NULL THEN
    SELECT id INTO v_casa_id FROM public.casas WHERE codigo = p_casa_codigo LIMIT 1;
  END IF;

  -- 2. Crear Proyecto
  INSERT INTO public.proyectos (cliente_id, parcela_id, casa_id, total, estado, modalidad)
  VALUES (v_cliente_id, p_parcela_id, v_casa_id, p_total, 'cotizacion_enviada', 'llave_en_mano')
  RETURNING id, numero_proyecto INTO v_proyecto_id, v_numero_proyecto;

  -- 3. Crear Items
  -- 3.1 Parcela
  IF p_parcela_id IS NOT NULL THEN
    INSERT INTO public.proyecto_items (proyecto_id, tipo, referencia_id, nombre, cantidad)
    VALUES (v_proyecto_id, 'parcela', p_parcela_id::text, 'Parcela seleccionada', 1);
  END IF;

  -- 3.2 Casa
  IF v_casa_id IS NOT NULL THEN
    INSERT INTO public.proyecto_items (proyecto_id, tipo, referencia_id, nombre, cantidad)
    VALUES (v_proyecto_id, 'casa', v_casa_id::text, 'Casa seleccionada', 1);
  END IF;

  -- 3.3 Extras
  IF p_extras IS NOT NULL AND jsonb_array_length(p_extras) > 0 THEN
    FOR v_extra IN SELECT * FROM jsonb_array_elements(p_extras)
    LOOP
      INSERT INTO public.proyecto_items (proyecto_id, tipo, referencia_id, nombre, cantidad, precio_unitario)
      VALUES (
        v_proyecto_id, 
        'extra', 
        v_extra->>'id', 
        v_extra->>'nombre', 
        COALESCE((v_extra->>'cantidad')::numeric, 1),
        COALESCE((v_extra->>'precio')::numeric, 0)
      );
    END LOOP;
  END IF;

  RETURN v_numero_proyecto;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION crear_proyecto_completo(text, text, text, uuid, text, numeric, jsonb) TO anon;
