-- CEREBRO TPL v2: recorrido unificado, sesiones anónimas y embudo confiable.

create or replace function public.crm_metadata_evento_segura(p_metadata jsonb)
returns boolean language sql immutable as $$
  select coalesce(bool_and(key = any(array[
    'session_id','journey_id','parcela_id','parcela_codigo','casa_id','casa_codigo',
    'extra_codigo','tipo_constructivo','origen','paso','resultado','motivo','valor',
    'filtros_activos','filtro_tipo','duracion_segundos','publicacion_id','fecha_visita',
    'dispositivo','pagina_anterior','accion','estado_proyecto','total_estimado','cantidad_extras'
  ])),true)
  from jsonb_object_keys(coalesce(p_metadata,'{}'::jsonb)) key;
$$;

drop policy if exists "Publico registra eventos comerciales sin PII" on public.crm_eventos;
create policy "Publico registra eventos comerciales sin PII"
on public.crm_eventos for insert to anon, authenticated
with check (
  cliente_id is null and proyecto_id is null and publicacion_id is null
  and evento = any(array[
    'sitio_visitado','sesion_finalizada','busqueda_realizada','parcela_view','filtros_usados',
    'mapa_abierto','whatsapp_click','cotizador_iniciado','casa_seleccionada',
    'tipo_constructivo_seleccionado','extra_seleccionado','cotizacion_guardada','pdf_generado',
    'publicacion_iniciada','publicacion_finalizada','reserva_iniciada','pago_iniciado'
  ])
  and public.crm_metadata_evento_segura(metadata)
);

create index if not exists crm_eventos_journey_idx
on public.crm_eventos ((metadata->>'journey_id'), creado_en desc);

create index if not exists crm_eventos_session_idx
on public.crm_eventos ((metadata->>'session_id'), creado_en desc);

drop view if exists public.crm_cerebro_resumen;

create view public.crm_cerebro_resumen
with (security_invoker=true) as
select
  date_trunc('day', creado_en) as dia,
  count(*) filter (where evento='sitio_visitado')::integer as visitas,
  count(distinct metadata->>'session_id') filter (where metadata ? 'session_id')::integer as sesiones,
  count(distinct metadata->>'journey_id') filter (where metadata ? 'journey_id')::integer as recorridos,
  count(*) filter (where evento='busqueda_realizada')::integer as busquedas,
  count(*) filter (where evento='parcela_view')::integer as parcelas_vistas,
  count(*) filter (where evento='cotizador_iniciado')::integer as cotizadores_iniciados,
  count(*) filter (where evento='cotizacion_guardada')::integer as cotizaciones_guardadas,
  count(*) filter (where evento='whatsapp_click')::integer as contactos_whatsapp,
  count(*) filter (where evento='reserva_iniciada')::integer as reservas_iniciadas,
  count(*) filter (where evento='publicacion_finalizada')::integer as publicaciones_finalizadas
from public.crm_eventos
group by date_trunc('day', creado_en)
order by dia desc;

grant select on public.crm_cerebro_resumen to authenticated;
