# Auditoría de conversión: parcela → casa → cotizador

## Problemas detectados

1. El recorrido existía técnicamente, pero los botones usaban nombres distintos y poco predecibles.
2. Las tarjetas de parcelas priorizaban “Más detalles” y no mostraban claramente el siguiente paso comercial.
3. La ficha `parcela.html` decía “Agregar parcela al proyecto”, sin explicar que después se elige una casa.
4. Las tarjetas de casas decían “Seleccionar casa”, sin anticipar que el usuario verá el precio total.
5. El cotizador aparecía como un módulo independiente y no como el paso 3 de un único proceso.
6. No había una explicación breve y repetible del proceso completo.

## Cambios aplicados

- Se incorporó un recorrido visible de tres pasos en el index.
- CTA de parcela: “Elegir parcela y ver casas”.
- CTA de ficha: “Elegir esta parcela y ver casas”.
- CTA de casa: “Elegir casa y ver precio total”.
- Cotizador renombrado como paso 3 y explicado como total de parcela + casa + fundación + instalación + extras.
- Se agregó en `parcela.html` un puente visual bajo las virtudes para continuar hacia las casas.
- Se mantienen localStorage, preselección y navegación existentes.

## Resultado esperado

El usuario entiende en todo momento qué eligió, qué falta elegir y qué obtendrá al pulsar el siguiente botón.
