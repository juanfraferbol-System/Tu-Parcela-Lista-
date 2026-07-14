-- El valor se agrega en una migración independiente. PostgreSQL no permite
-- utilizar de forma segura un valor enum nuevo dentro de la misma transacción.
alter type public.publicacion_estado add value if not exists 'requiere_cambios';
