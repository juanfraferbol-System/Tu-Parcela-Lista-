BEGIN;
ALTER TABLE public.tpl_proyectos_comerciales ADD COLUMN IF NOT EXISTS publicacion_id uuid REFERENCES public.publicaciones(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tpl_proyectos_publicacion_unica ON public.tpl_proyectos_comerciales (publicacion_id) WHERE publicacion_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.normalize_email(email text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT lower(trim(email)); $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_correo_normalizado ON public.clientes (public.normalize_email(correo));

-- Idempotencia para CRM Actividades (Timeline)
ALTER TABLE public.crm_actividades ADD COLUMN IF NOT EXISTS referencia_idempotencia text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_actividades_idempotencia ON public.crm_actividades (referencia_idempotencia) WHERE referencia_idempotencia IS NOT NULL;

COMMIT;