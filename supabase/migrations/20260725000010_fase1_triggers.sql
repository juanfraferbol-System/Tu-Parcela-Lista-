BEGIN;
CREATE OR REPLACE FUNCTION public.tr_evaluar_publicacion() RETURNS trigger AS $$
BEGIN
  IF (OLD.estado IS DISTINCT FROM NEW.estado) OR (OLD.pago_estado IS DISTINCT FROM NEW.pago_estado) OR (OLD.plan_seleccionado IS DISTINCT FROM NEW.plan_seleccionado) THEN PERFORM public.evaluar_elegibilidad_provisionamiento(NEW.id); END IF; RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_publicaciones_provisionamiento ON public.publicaciones; CREATE TRIGGER trigger_publicaciones_provisionamiento AFTER UPDATE ON public.publicaciones FOR EACH ROW EXECUTE FUNCTION public.tr_evaluar_publicacion();
ALTER TABLE public.publicaciones DISABLE TRIGGER trigger_publicaciones_provisionamiento;
COMMIT;