# Auditoría completa Tu Parcela Lista — 26-07-2026

## Alcance
Se revisaron `index.html`, `app.js`, `css/styles.min.css`, `css/index-mobile-v17.css`, `parcela.html`, `parcela.css`, `cotizador.html`, `cotizador.css`, el CRM y todas las suites `*tests.mjs` incluidas en el paquete.

## Diagnóstico antes de reparar

### Index y filtros
- `scrollToParcelasResults()` ya apunta a `#search-heading-card`, por lo que la intención de scroll es correcta.
- El botón móvil `#mobile-filters-btn` no tenía `aria-expanded` inicial ni actualización de estado.
- El panel móvil solo cerraba por botón y overlay; no respondía a Escape.
- El bloqueo de `body.style.overflow` podía permanecer si el panel se cerraba por una vía no contemplada.

### Mapa
- La lista lateral seguía presente en el DOM mediante `.map-sidebar`, `#map-results` y `#map-cards`, ocupando 300 px del mapa.
- El popup incluía foto, nombre, precio, Detalles y Seleccionar, pero no mostraba comuna ni superficie.
- La función `money()` ya normalizaba números y strings con símbolos/separadores mediante `parseClp()`, incluyendo `$12.000.000`.

### Cotizador
- No se detectaron IDs duplicados.
- Visualmente aparecen “Etapas del proyecto” y “Etapa del proyecto”, pero el segundo corresponde a un componente oculto/modal (`top: 0`) y no se demostró que sea una sección duplicada visible.
- “Adicionales Automáticos” también pertenece a contenido oculto hasta que el flujo lo activa. No se eliminó nada sin evidencia suficiente.

### CSS
- `.location-filter-bar` aparece en varias capas: 1 regla inline, 6 coincidencias en `styles.min.css` y 3 en `index-mobile-v17.css`.
- Las reglas finales usan `!important` y funcionan como sobreescrituras por breakpoint. Consolidarlas sin una regresión visual completa sería riesgoso.
- `.parcelas-sidebar`, `.map-layout` y `#map-container` también reciben reglas desde más de una capa. No se consolidaron por no poder demostrar equivalencia visual absoluta.

## Reparaciones aplicadas

1. `index.html`
   - Eliminada del DOM la lista lateral del mapa.
   - El mapa queda con `#map-container` como contenido principal a ancho completo.
   - Añadidos `aria-expanded="false"` y `aria-controls="parcelas-sidebar"` al botón Filtros.
   - Sustituida la lógica móvil por una función de estado única.
   - Cierre por X, overlay y Escape.
   - Restauración garantizada de `document.body.style.overflow`.
   - Cierre automático al seleccionar filtro/comuna en viewport móvil.

2. `app.js`
   - Popup ampliado con comuna y superficie.
   - Precio sigue usando normalización CLP compatible con números y strings.

3. `plataforma/crm/crm-phase1-stability-tests.mjs`
   - Actualizada la expectativa de “TPL Studio MVP local” a “Creador de Landings”.

## Pruebas ejecutadas
Se ejecutaron las 21 suites `*tests.mjs` del paquete.

- 20 suites aprobadas.
- 1 suite pendiente: `plataforma/tpl-business/tpl-business-contract-tests.mjs`.
- La falla pendiente espera el texto “Tu Landing Premium”, que ya no aparece literalmente en la configuración/app actual. Debe decidirse si se restaura ese copy o se actualiza el contrato de prueba; no se modificó porque no pertenece a los objetivos solicitados.

La prueba CRM corregida ahora finaliza con:

```text
crm-phase1-stability: OK
```

## Validación visual
Se utilizó Chromium real en modo headless con viewport 1440 × 1000 y 390 × 844. El entorno bloqueó navegación HTTP local y enlaces `file://`, por lo que se realizó una renderización controlada con los CSS y JavaScript locales incorporados en el documento. Las capturas permiten auditar estructura y diseño, pero no sustituyen una validación final en la URL desplegada de Vercel para Leaflet, Google Tag Manager y recursos externos.

## Recursos 404
En la renderización controlada no se registraron respuestas HTTP 404. Algunos recursos externos no pudieron probarse de forma concluyente por las restricciones del entorno. No se declaró ninguna imagen como faltante basándose solo en el paquete parcial.

## Riesgos pendientes
- Validar en Vercel el offset final de scroll bajo el menú sticky, porque depende de la altura real de fuentes, imágenes y scripts externos.
- Abrir al menos un marcador real de Leaflet y confirmar visualmente el popup completo.
- Revisar el contrato de copy de TPL Business.
- Consolidar CSS solo después de una comparación visual automatizada antes/después en producción o preview.
- El logo del cotizador no cargó en la renderización aislada porque la captura no resolvió imágenes locales incorporadas; no demuestra un 404 en producción.

## Archivos modificados
- `index.html`
- `app.js`
- `plataforma/crm/crm-phase1-stability-tests.mjs`

No se modificaron migraciones Supabase, tasador de parcelas ni configuración Git.
