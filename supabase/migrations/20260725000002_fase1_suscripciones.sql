BEGIN;
ALTER TABLE public.planes_comerciales ADD COLUMN IF NOT EXISTS requiere_pago boolean NOT NULL DEFAULT true, ADD COLUMN IF NOT EXISTS duracion_meses integer DEFAULT 12;
CREATE TABLE IF NOT EXISTS public.planes_comerciales_modulos (
  plan_id uuid NOT NULL REFERENCES public.planes_comerciales(id) ON DELETE CASCADE, modulo_codigo text NOT NULL REFERENCES public.tpl_business_modulos_catalogo(codigo) ON DELETE CASCADE, PRIMARY KEY (plan_id, modulo_codigo)
);
CREATE TABLE IF NOT EXISTS public.tpl_suscripciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), proyecto_id uuid NOT NULL REFERENCES public.tpl_proyectos_comerciales(id) ON DELETE CASCADE, cuenta_id uuid NOT NULL REFERENCES public.tpl_business_cuentas(id) ON DELETE CASCADE, plan_id uuid NOT NULL REFERENCES public.planes_comerciales(id) ON DELETE RESTRICT, publicacion_id uuid REFERENCES public.publicaciones(id) ON DELETE SET NULL, pago_inicial_id uuid REFERENCES public.tpl_pagos(id) ON DELETE SET NULL, renovada_desde_id uuid REFERENCES public.tpl_suscripciones(id) ON DELETE SET NULL, origen text NOT NULL DEFAULT 'automatizacion', estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activa', 'vencida', 'suspendida', 'cancelada', 'renovada')), monto numeric NOT NULL DEFAULT 0, moneda text NOT NULL DEFAULT 'CLP', renovacion_automatica boolean NOT NULL DEFAULT false, inicia_en timestamptz, vence_en timestamptz, creado_en timestamptz NOT NULL DEFAULT now(), actualizado_en timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_pagos_suscripcion' 
      AND conrelid = 'public.tpl_pagos'::regclass
  ) THEN
    ALTER TABLE public.tpl_pagos ADD CONSTRAINT fk_pagos_suscripcion FOREIGN KEY (suscripcion_id) REFERENCES public.tpl_suscripciones(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tpl_susc_activa_unica ON public.tpl_suscripciones (proyecto_id) WHERE estado = 'activa';
COMMIT;