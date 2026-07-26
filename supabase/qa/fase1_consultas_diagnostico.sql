-- Estas consultas son solo de lectura para diagnosticar la salud de la BD antes de activar Triggers.
-- 1. Diagnóstico de Clientes duplicados por correo normalizado
SELECT public.normalize_email(correo), count(*) FROM public.clientes GROUP BY public.normalize_email(correo) HAVING count(*) > 1;

-- 2. Diagnóstico de Publicaciones aprobadas pero que tienen un plan inexistente
SELECT p.id, p.plan_seleccionado FROM public.publicaciones p LEFT JOIN public.planes_comerciales pc ON pc.codigo = p.plan_seleccionado WHERE p.estado = 'aprobada' AND pc.id IS NULL;

-- 3. Proyectos duplicados amarrados a una misma publicacion
SELECT publicacion_id, count(*) FROM public.tpl_proyectos_comerciales WHERE publicacion_id IS NOT NULL GROUP BY publicacion_id HAVING count(*) > 1;
