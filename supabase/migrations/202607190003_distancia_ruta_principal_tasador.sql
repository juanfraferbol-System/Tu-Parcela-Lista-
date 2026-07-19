-- Distancia a ruta o carretera principal para Publicador y Tasador TPL.

alter table if exists public.publicaciones
  add column if not exists distancia_ruta_principal_km numeric;

alter table if exists public.publicaciones_unificadas
  add column if not exists distancia_ruta_principal_km numeric;

alter table if exists public.publicaciones
  drop constraint if exists publicaciones_distancia_ruta_principal_valida;
alter table if exists public.publicaciones
  add constraint publicaciones_distancia_ruta_principal_valida
  check (distancia_ruta_principal_km is null or distancia_ruta_principal_km between 0 and 999);

alter table if exists public.publicaciones_unificadas
  drop constraint if exists publicaciones_unificadas_distancia_ruta_principal_valida;
alter table if exists public.publicaciones_unificadas
  add constraint publicaciones_unificadas_distancia_ruta_principal_valida
  check (distancia_ruta_principal_km is null or distancia_ruta_principal_km between 0 and 999);

create or replace function public.tpl_sincronizar_distancia_ruta_principal()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.distancia_ruta_principal_km is null then
    new.distancia_ruta_principal_km := nullif(coalesce(
      new.datos_formulario->>'distanciaRutaPrincipalKm',
      new.datos_formulario->>'distancia_ruta_principal_km'
    ), '')::numeric;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tpl_distancia_ruta_principal on public.publicaciones;
create trigger trg_tpl_distancia_ruta_principal
before insert or update of datos_formulario, distancia_ruta_principal_km
on public.publicaciones
for each row execute function public.tpl_sincronizar_distancia_ruta_principal();

update public.publicaciones
set distancia_ruta_principal_km = nullif(coalesce(
  datos_formulario->>'distanciaRutaPrincipalKm',
  datos_formulario->>'distancia_ruta_principal_km'
), '')::numeric
where distancia_ruta_principal_km is null
  and coalesce(datos_formulario->>'distanciaRutaPrincipalKm', datos_formulario->>'distancia_ruta_principal_km', '') ~ '^[0-9]+([.][0-9]+)?$';

comment on column public.publicaciones.distancia_ruta_principal_km is
  'Distancia declarada por el publicador hasta la ruta o carretera principal más cercana.';
