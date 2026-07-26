BEGIN;
ALTER TABLE public.publicaciones
  ADD COLUMN IF NOT EXISTS pago_estado text DEFAULT 'pendiente' CHECK (pago_estado IN ('pendiente', 'pagado', 'fallido', 'reembolsado')),
  ADD COLUMN IF NOT EXISTS pago_referencia text;
CREATE TABLE IF NOT EXISTS public.tpl_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), publicacion_id uuid REFERENCES public.publicaciones(id) ON DELETE SET NULL,
  suscripcion_id uuid, proveedor text NOT NULL, referencia_externa text NOT NULL,
  tipo_operacion text NOT NULL DEFAULT 'pago' CHECK (tipo_operacion IN ('pago', 'reembolso', 'disputa')),
  monto numeric NOT NULL, moneda text NOT NULL DEFAULT 'CLP',
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'rechazado', 'reembolsado', 'disputado')),
  payload_sanitizado jsonb NOT NULL DEFAULT '{}'::jsonb, creado_en timestamptz NOT NULL DEFAULT now(), actualizado_en timestamptz NOT NULL DEFAULT now(), UNIQUE (proveedor, referencia_externa)
);
CREATE INDEX IF NOT EXISTS idx_tpl_pagos_publicacion ON public.tpl_pagos(publicacion_id);
CREATE OR REPLACE FUNCTION public.rpc_registrar_pago_webhook(p_publicacion_id uuid, p_proveedor text, p_referencia_externa text, p_monto numeric, p_estado text, p_payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_pago_id uuid;
BEGIN
  INSERT INTO public.tpl_pagos (publicacion_id, proveedor, referencia_externa, monto, estado, payload_sanitizado) VALUES (p_publicacion_id, p_proveedor, p_referencia_externa, p_monto, p_estado, p_payload) ON CONFLICT (proveedor, referencia_externa) DO UPDATE SET estado = EXCLUDED.estado, payload_sanitizado = EXCLUDED.payload_sanitizado, actualizado_en = now() RETURNING id INTO v_pago_id;
  IF p_publicacion_id IS NOT NULL THEN
      UPDATE public.publicaciones SET pago_estado = CASE WHEN p_estado = 'completado' THEN 'pagado' WHEN p_estado IN ('rechazado', 'fallido') THEN 'fallido' WHEN p_estado = 'reembolsado' THEN 'reembolsado' ELSE pago_estado END, pago_referencia = CASE WHEN p_estado = 'completado' THEN p_referencia_externa ELSE pago_referencia END WHERE id = p_publicacion_id;
  END IF; RETURN v_pago_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_registrar_pago_webhook FROM public, anon, authenticated; GRANT EXECUTE ON FUNCTION public.rpc_registrar_pago_webhook TO service_role;
COMMIT;