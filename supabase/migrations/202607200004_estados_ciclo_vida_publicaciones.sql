-- Amplía el ciclo de vida sin cambiar el significado actual de "aprobada".
-- "aprobada" continúa siendo el estado visible en el catálogo público.
alter type public.publicacion_estado add value if not exists 'vendida';
alter type public.publicacion_estado add value if not exists 'archivada';
