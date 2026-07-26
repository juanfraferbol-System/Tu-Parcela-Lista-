-- 1. Clientes duplicados por correo normalizado
SELECT lower(trim(correo)), count(*) FROM public.clientes GROUP BY lower(trim(correo)) HAVING count(*) > 1;
-- 2. Proyectos comerciales que amarran una misma propiedad (Previo a existir publicacion_id)
SELECT propiedad_codigo, count(*) FROM public.tpl_proyectos_comerciales WHERE propiedad_codigo IS NOT NULL GROUP BY propiedad_codigo HAVING count(*) > 1;
-- 3. Publicaciones aprobadas pero que apuntan a un plan inexistente
SELECT p.id, p.plan_seleccionado FROM public.publicaciones p LEFT JOIN public.planes_comerciales pc ON pc.codigo = p.plan_seleccionado WHERE p.estado = 'aprobada' AND pc.id IS NULL;