# Núcleo Inteligente TPL — Fase 2 / Core 2.2

## Implementado

Se agregó una primera versión funcional y compatible con el código existente del **Cerebro Central**.

### Componentes

- `js/core/event-bus.js`: motor de eventos desacoplado.
- `js/core/property-model.js`: objeto maestro normalizado de propiedad.
- `js/core/intelligence-engine.js`: calidad, prioridad y próximas acciones.
- `js/core/orchestrator.js`: coordinación entre modelo, inteligencia y eventos.

## Integración inicial

El nuevo publicador (`plataforma/publicar/`) ahora:

1. Construye el payload actual para mantener compatibilidad.
2. Lo normaliza como `objetoMaestro`.
3. Calcula `inteligencia`, `calidad` y `automatizaciones`.
4. Emite `PUBLICACION_PREPARADA`.
5. Al confirmar, emite `PUBLICACION_CREADA`.
6. La capa de integración emite `CRM_SINCRONIZADO` y `PAGO_CREADO` cuando corresponde.

## Contrato agregado al payload

```text
schemaVersion
objetoMaestro
inteligencia
calidad
automatizaciones
```

La estructura anterior se conserva para evitar romper Supabase, Flow o el CRM existentes.

## Eventos disponibles inicialmente

- `PUBLICACION_PREPARADA`
- `PUBLICACION_CREADA`
- `CRM_SINCRONIZADO`
- `PAGO_CREADO`

## Próxima fase recomendada

1. Crear endpoint seguro `/api/publicaciones`.
2. Guardar `objetoMaestro` y los eventos en Supabase.
3. Crear tabla de tareas automáticas del CRM.
4. Hacer que el webhook de Flow emita `PAGO_CONFIRMADO` y `PLAN_ACTIVADO`.
5. Mostrar calidad, prioridad y próximas acciones en el panel CRM.

## Compatibilidad

La implementación es progresiva: no reemplaza aún los módulos legacy. Si el núcleo no carga, el publicador conserva su payload anterior y sigue funcionando en modo compatible.
