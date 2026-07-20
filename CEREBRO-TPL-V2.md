# Cerebro TPL v2

Esta versión conecta el motor de eventos central con el sitio público y el CRM.

## Cambios principales

- Identificador anónimo de sesión (`session_id`) y recorrido (`journey_id`).
- Proyecto local persistente: parcela, casa, extras, estado y total estimado.
- Separación entre visita, búsqueda, vista de parcela, cotización, reserva y publicación.
- Cola de eventos sin conexión y reintento automático al volver internet.
- Event Bus cargado en index, parcela, cotizador, pagos y paneles administrativos.
- Nueva vista SQL `crm_cerebro_resumen` para el panel del Director.
- La metadata pública continúa bloqueando información personal.

## Instalación

```bash
npx supabase@latest db push
```

Después subir el proyecto con Git/Vercel.
