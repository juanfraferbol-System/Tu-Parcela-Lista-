-- Versión auditable del Tasador TPL con clasificación turística y acceso a río.
-- Proyecto Supabase: qxavbqhyqaqalpzbhwmh

update public.configuracion_tasador
set estado='retirada'
where estado='activa' and version<>'tpl-mvp-1.1.0';

insert into public.configuracion_tasador(version,estado,algoritmo,parametros,vigente_desde)
values (
  'tpl-mvp-1.1.0',
  'activa',
  'mediana_comparables_v2_premium_comercial',
  jsonb_build_object(
    'comparables_minimos',3,
    'comparables_maximos',15,
    'cobertura_suficiente_desde',12,
    'cobertura_limitada_desde',6,
    'cobertura_experimental_desde',3,
    'antiguedad_maxima_dias',1095,
    'distancia_maxima_km',150,
    'superficie_relacion_minima',0.25,
    'umbral_cambio_precio_porcentaje',10,
    'ajuste_turismo_nacional',3.00,
    'ajuste_turismo_local',0.20,
    'ajuste_acceso_rio',0.10,
    'orden_ajustes',jsonb_build_array('comparables','distancia_ruta','turismo','acceso_rio'),
    'niveles_permitidos',jsonb_build_array('basica'),
    'fuentes_precio_permitidas',jsonb_build_array('precio_publicado_solicitado','precio_final_declarado','precio_final_verificado')
  ),
  now()
)
on conflict (version) do update
set estado='activa',
    algoritmo=excluded.algoritmo,
    parametros=excluded.parametros,
    vigente_desde=coalesce(public.configuracion_tasador.vigente_desde,excluded.vigente_desde);
