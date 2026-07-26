-- 1. Proyectos "históricos" sin vínculo canónico (que se crearon a mano y se omitió su match).
SELECT pc.id, pc.propiedad_codigo FROM public.tpl_proyectos_comerciales pc LEFT JOIN public.publicaciones p ON p.codigo_publico = pc.propiedad_codigo WHERE pc.publicacion_id IS NULL AND p.id IS NOT NULL;
-- 2. Confirmación final de Trigger (Debe devolver 'D' de Disabled).
SELECT trg.tgname, trg.tgenabled FROM pg_trigger trg JOIN pg_class tbl ON tbl.oid = trg.tgrelid WHERE trg.tgname = 'trigger_publicaciones_provisionamiento';