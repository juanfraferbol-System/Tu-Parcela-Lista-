# Módulos de lanzamiento — Tu Parcela Lista

Fecha de evaluación: 17 de julio de 2026. Modo recomendado: `piloto_limitado`.

| Módulo | Ruta | Estado | Público | Rol | Riesgo | Acción necesaria | Activación recomendada |
|---|---|---|---|---|---|---|---|
| Catálogo | `/` | Listo con observaciones | Sí | Público | Bajo | Confirmar que parcelas, precios y fotos sean reales y vigentes. | Piloto inmediato. |
| Ficha de parcela | `/parcela.html?id=...` | Listo con observaciones | Sí | Público | Medio | Aplicar migración comercial y probar consulta/visita desde móvil. | Tras prueba de persistencia. |
| Cotizador | `/cotizador.html` | Listo con observaciones | Sí | Público | Medio | Validar tres cotizaciones reales, PDF y activación en CRM. | Piloto limitado. |
| Publicar parcela | `/plataforma/publicar-parcela/` | Listo con observaciones | Sí | Público | Medio/alto | Moderación diaria, protección anti-spam y prueba de recuperación de borrador. | Piloto con pocas publicaciones. |
| CRM comercial | `/plataforma/crm/` | Solo administrativo | No indexable | Administrador autenticado | Alto | Aplicar migración `202607170002_lanzamiento_comercial.sql` y validar RLS. | Antes de recibir tráfico. |
| Moderación de publicaciones | Dentro del CRM | Solo administrativo | No | Administrador | Alto | Probar aprobar, solicitar cambios y rechazar. | Antes del piloto. |
| Partners | `/plataforma/partners/` | Listo con observaciones | Sí | Público y administrador | Medio | Verificar que cada proveedor, servicio y dato de contacto sea real antes de destacarlo. | Disponible desde el piloto. |
| Manager legacy | `/tuparcelalistamanager/` | No publicar todavía | No | Ninguno | Alto | Mantener redirigido; usar el CRM actual. | No reactivar sin auditoría. |
| Contratistas | Ruta anterior eliminada del público | No publicar todavía | No | Desarrollo | Alto | Definir datos reales, permisos y responsables. | Etapa de crecimiento. |
| Pagos directos | `/api/flow-*`, pago exitoso | En pruebas | No promovido | Operación controlada | Alto | Validar proveedor, montos, reversas, conciliación y entorno productivo. | Solo después del piloto. |
| Agente y automatizaciones de mensajería | Scripts locales | En pruebas | No en el flujo principal | Desarrollo | Alto | Configurar proveedor real, consentimiento y bitácora de fallos. | Etapa 4. |

## Control aplicado

- `js/config-negocio.js` define el modo y las banderas centrales.
- `js/launch-control.js` mantiene oculto únicamente el Manager legacy.
- `_redirects` bloquea el Manager legacy sin borrar su código.
- `netlify.toml` marca el CRM como `noindex, nofollow` y sin caché pública.
- Las rutas legacy de CRM redirigen a `/plataforma/crm/`.

## Condición mínima para lanzamiento público

Migración aplicada, formulario de consulta y visita persistiendo en CRM, tres activaciones de proyecto verificadas, administrador revisando el panel a diario y cero pérdidas de leads durante siete días consecutivos.
