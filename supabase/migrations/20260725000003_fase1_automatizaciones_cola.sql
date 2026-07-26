BEGIN;
CREATE TABLE IF NOT EXISTS public.tpl_automatizaciones_cola (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, idempotency_key text NOT NULL UNIQUE, accion text NOT NULL, entidad text NOT NULL, entidad_id text, estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesando', 'completado', 'error_reintentable', 'error_definitivo')), payload jsonb NOT NULL DEFAULT '{}'::jsonb, intentos integer NOT NULL DEFAULT 0, proxima_ejecucion timestamptz NOT NULL DEFAULT now(), bloqueado_en timestamptz, bloqueado_por text, lease_expira_en timestamptz, ultimo_error text, creado_en timestamptz NOT NULL DEFAULT now(), actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tpl_cola_pendientes ON public.tpl_automatizaciones_cola(estado, proxima_ejecucion) WHERE estado IN ('pendiente', 'error_reintentable');
COMMIT;