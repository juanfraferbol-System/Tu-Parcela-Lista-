alter table public.publicaciones enable row level security;
alter table public.publicacion_borradores enable row level security;
alter table public.publicacion_fotos enable row level security;
alter table public.moderacion_registros enable row level security;

revoke all on public.publicaciones from anon, authenticated;
revoke all on public.publicacion_borradores from anon, authenticated;
revoke all on public.publicacion_fotos from anon, authenticated;
revoke all on public.moderacion_registros from anon, authenticated;
revoke all on storage.objects from anon, authenticated;

-- No se crea ninguna política para anon/authenticated. El navegador no puede
-- insertar, listar, actualizar ni borrar filas. La Edge Function usa su cliente
-- servidor exclusivamente después de validar todo el multipart/form-data.

revoke all on function public.actualizar_timestamp() from public;
revoke all on function public.generar_codigo_publicacion() from public;
revoke all on function public.crear_publicacion_pendiente(jsonb, uuid, jsonb) from public;

grant execute on function public.crear_publicacion_pendiente(jsonb, uuid, jsonb) to service_role;

-- No se crea ninguna política sobre storage.objects para anon/authenticated.
-- Por tanto la publishable/anon key no puede INSERT, SELECT, UPDATE ni DELETE.
-- La única escritura la realiza la Edge Function con credencial secreta del
-- runtime, usando una ruta generada en servidor: <publicacion_uuid>/<foto_uuid>.<ext>.
