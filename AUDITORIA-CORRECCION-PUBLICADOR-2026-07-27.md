# Auditoría y corrección del Publicador TPL — 27-07-2026

## Hallazgos críticos corregidos

1. **`app.js` contenía una cadena truncada en el flujo de envío** (línea aproximada 729) y texto corrupto insertado antes de `function bind()`. Esto producía `SyntaxError: Invalid or unexpected token` y detenía por completo la inicialización del publicador. Como consecuencia, no se ejecutaban `initLocations()`, `fillCommunes()`, mapa, eventos, tasador ni guardado de borradores.
2. **El modal del tasador tenía HTML incompleto**: faltaba cerrar `<section class="valuation-modal-dialog">` y no existía `#valuationModalError`, aunque `app.js` intentaba usarlo. Esto podía causar un `TypeError` al abrir el tasador.
3. **Inicialización geográfica poco defensiva**: `initLocations()` no comprobaba la existencia de los selectores y podía duplicar opciones al reinicializarse. Se corrigió para validar `#region` y `#comuna`, limpiar las opciones, restaurar una selección válida y ejecutar `fillCommunes()` de forma consistente.
4. **Caché del navegador**: se actualizó la versión de `app.js` en `index.html` para forzar la descarga del archivo corregido.

## Cambios de Antigravity encontrados y preservados

- CTA comercial para solicitar el Informe TPL Business.
- Modal de captura comercial y consentimientos.
- Integración con `tpl-report-generator.js`.
- Flujo de apertura del informe desde la tasación.
- Registro de eventos en `valuation-crm-service.js`.

No se modificó `engine.mjs`, el cálculo canónico, `explanation`, `confidenceIndex` ni `auditTrail`.

## Validaciones realizadas

- `node --check` correcto para todos los archivos `.js` del directorio `plataforma/publicar`.
- No existen IDs HTML duplicados.
- Los selectores `#region`, `#comuna` y `#valuationModalError` están presentes.
- Los archivos JavaScript locales referenciados por `index.html` existen.
- El modal de tasación vuelve a tener una estructura HTML correctamente cerrada.

## Archivos corregidos

- `plataforma/publicar/app.js`
- `plataforma/publicar/index.html`

## Prueba manual recomendada

1. Abrir `plataforma/publicar/index.html` con Live Server.
2. Recargar con `Ctrl + F5`.
3. Confirmar que Región muestra opciones.
4. Elegir una región y comprobar que Comuna se habilita y carga sus alternativas.
5. Completar los datos mínimos y abrir el tasador.
6. Confirmar que el modal muestra carga, resultados o mensaje de error sin bloquear la página.
7. Probar el CTA del Informe TPL Business.
