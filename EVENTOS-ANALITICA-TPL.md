# Eventos de analítica — Tu Parcela Lista

Implementación: `js/tpl-launch.js`. Cada evento se envía a `dataLayer` con prefijo `tpl_` y, cuando Supabase está disponible, a `crm_eventos`. Si la red falla, se conserva una cola local de hasta 100 eventos para reintento.

## Regla de privacidad

Nunca enviar nombre, correo, teléfono, RUT, dirección exacta, mensaje, notas ni texto libre a Analytics. `crm_eventos` incluye una restricción que rechaza estas claves dentro de `metadata`.

| Recorrido | Evento interno | Evento GTM | Metadatos permitidos |
|---|---|---|---|
| Ver parcela | `parcela_view` | `tpl_parcela_view` | `parcela_codigo`, `origen` |
| Usar filtros | `filtros_usados` | `tpl_filtros_usados` | cantidad de filtros, origen |
| Abrir mapa | `mapa_abierto` | `tpl_mapa_abierto` | origen |
| WhatsApp | `whatsapp_click` | `tpl_whatsapp_click` | origen |
| Solicitar información | `informacion_solicitada` | `tpl_informacion_solicitada` | código de parcela, origen |
| Solicitar visita | `visita_solicitada` | `tpl_visita_solicitada` | código de parcela, origen; la fecha queda solo en registro interno |
| Iniciar cotizador | `cotizador_iniciado` | `tpl_cotizador_iniciado` | parcela, origen |
| Seleccionar casa | `casa_seleccionada` | `tpl_casa_seleccionada` | código de casa |
| Tipo constructivo | `tipo_constructivo_seleccionado` | `tpl_tipo_constructivo_seleccionado` | código del tipo |
| Seleccionar extra | `extra_seleccionado` | `tpl_extra_seleccionado` | código del extra |
| Guardar cotización | `cotizacion_guardada` | `tpl_cotizacion_guardada` | valor referencial, origen |
| Generar PDF | `pdf_generado` | `tpl_pdf_generado` | valor referencial |
| Activar proyecto | `proyecto_activado` | `tpl_proyecto_activado` | parcela/casa, valor, origen |
| Iniciar publicación | `publicacion_iniciada` | `tpl_publicacion_iniciada` | paso, origen |
| Finalizar publicación | `publicacion_finalizada` | `tpl_publicacion_finalizada` | resultado, origen |
| Registrar contacto | `contacto_registrado` | Uso interno CRM | origen CRM |
| Ganada/perdida | `oportunidad_ganada` / `oportunidad_perdida` | Opcional agregado | motivo normalizado, nunca notas libres |

## Configuración pendiente en GTM/GA4

1. Crear activadores de evento personalizado para cada nombre `tpl_*`.
2. Registrar solo parámetros permitidos.
3. Marcar como conversiones: información, visita, cotización guardada, proyecto activado y publicación finalizada.
4. Verificar DebugView y consentimiento antes de publicar campañas.
5. No usar el valor del proyecto activado como compra pagada; es pipeline, no ingreso confirmado.
