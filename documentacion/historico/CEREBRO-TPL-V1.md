# Cerebro TPL v1

## Qué quedó conectado

- Inicio y navegación pública.
- Selección y visualización de parcelas.
- Selección de casas y extras.
- Inicio, guardado y descarga de cotizaciones.
- Uso de WhatsApp y mapa.
- Inicio y finalización del publicador.
- CRM administrativo.

## Funcionamiento

`js/core/tpl-brain.js` mantiene un contexto anónimo persistente del recorrido, calcula próximas acciones y registra eventos comerciales seguros. Si Supabase no está disponible, conserva una cola local y vuelve a sincronizar al recuperar conexión.

El cerebro no guarda nombre, correo, teléfono, RUT, dirección ni mensajes en los eventos anónimos. Los datos personales siguen entrando únicamente por los RPC y formularios autorizados del CRM.

## Base de datos

Aplicar la migración:

`supabase/migrations/202607200001_cerebro_tpl_v1.sql`

Esta migración amplía los eventos permitidos y crea la vista administrativa `crm_cerebro_resumen`.

## API disponible en navegador

- `TPL.brain.track(evento, metadata)`
- `TPL.brain.getContext()`
- `TPL.brain.recommendations()`
- `TPL.brain.flush()`

## Próxima etapa recomendada

Crear en el CRM una pantalla visual del recorrido por cliente/proyecto y convertir las recomendaciones del cerebro en tareas asignables y automatizaciones reales.
