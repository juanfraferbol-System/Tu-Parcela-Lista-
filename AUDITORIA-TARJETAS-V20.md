# Auditoría de tarjetas V20

## Conflictos encontrados

- Las tarjetas recibían reglas globales desde `styles.min.css`, reglas inline en `index.html` y estilos incrustados directamente en el HTML generado por `app.js`.
- Parcelas y casas tenían radios, sombras, botones, alturas de imágenes y espaciados distintos.
- El badge de oportunidad se generaba con numerosos estilos inline y podía competir con otros distintivos.
- Los chips existentes se mezclaban con badges fotográficos, generando ruido visual.

## Solución aplicada

- Se creó `css/tpl-card-system-v20.css` como última capa específica para `#parcelas-container` y `#casas-container`.
- No se borraron estilos globales que podrían ser necesarios en otras partes del sitio.
- Se eliminaron estilos inline del bloque dinámico principal de parcelas.
- Se unificaron proporción 4:3, radios, sombras, tipografía, precios, acciones y estados seleccionados.
- Se limitan a dos badges fotográficos por tarjeta.

## Badges automáticos de parcelas

- Top 3 económicas.
- Top 3 más grandes.
- Top 3 con agua, ordenadas por menor precio dentro de esa categoría.
- Bosque nativo, pago flexible y luz: las tres más económicas de cada categoría.

## Badges automáticos de casas

- Top 3 económicas.
- Top 3 más amplias.
- Tres alternativas familiares de menor precio con cuatro o más dormitorios.

Los rankings se recalculan automáticamente con los datos actuales de `parcelas.js`, `parcelasduenos.js` y `casas.js`.
