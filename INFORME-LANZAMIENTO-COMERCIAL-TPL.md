# Informe final de lanzamiento comercial — Tu Parcela Lista

## Publicable en piloto

Catálogo, ficha de parcela, cotizador, publicación de parcela y Partners, todos con observaciones y seguimiento diario.

## Debe seguir oculto

Contratistas internos, Manager legacy, pagos directos no validados, agente/mensajería automática y avances por hitos.

## Recorrido que genera ingresos

Visita al catálogo → vista de parcela → solicitud de información o visita → cotización → proyecto activado → contacto administrativo → negociación → ganado o perdido. El proyecto activado representa pipeline; no debe contabilizarse como venta pagada.

## Automatizado

- Registro seguro de interesados mediante RPC.
- Eventos internos y `dataLayer` sin PII.
- Cola local de eventos cuando falla la red.
- Actualización de etapa y puntuación inicial.
- Tareas para nuevo interesado, visita, cotización y proyecto activado.
- Panel diario, embudo, vencimientos y actividad de 24 horas.
- Prevención de doble envío en formularios críticos.

## Sigue siendo manual

Contacto por teléfono/WhatsApp/correo, confirmación de visita, negociación, moderación, motivo de pérdida, respaldo verificado y cualquier mensaje externo. No se simula envío automático sin proveedor.

## Indicadores disponibles cuando existan datos

Personas por etapa, conversión, tiempo en etapa, tareas vencidas, origen, actividad, cotizaciones recientes/detenidas, proyectos activados, publicaciones pendientes, errores y alertas. Los estados vacíos no inventan cifras.

## Pruebas faltantes

Aplicar migración, validar RLS por rol, sesión admin real, móvil, GTM DebugView, desconexión, restauración de respaldo, tres recorridos completos y piloto de siete días.

## Condición antes de publicidad

No perder ningún interesado durante siete días consecutivos y demostrar que una sola persona puede responder, registrar y cerrar todas las tareas dentro de los plazos definidos.
