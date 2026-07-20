# Tu Parcela Lista — correcciones de estabilidad

Fecha: 17 de julio de 2026

## Correcciones realizadas

- Se resolvieron todos los conflictos Git pendientes en `js/db-api.js`.
- Se corrigió el error de sintaxis que detenía la ejecución del frontend.
- Se agregó compatibilidad con `latitud_publica` y `longitud_publica`.
- Se normalizaron IDs, precios, superficies, imágenes y valores booleanos provenientes de Supabase.
- Se incorporó respaldo automático con `parcelas.js` si Supabase falla o no devuelve registros.
- Se combinan publicaciones remotas y locales sin duplicar IDs, facilitando una migración gradual.
- Se eliminó la carga paralela antigua de inventario que podía sobrescribir datos con formatos distintos.
- Se robustecieron las validaciones de coordenadas del mapa y del modal “Ver ubicación”.
- Se corrigió la comparación de IDs numéricos/texto al seleccionar una parcela desde el mapa.
- `parcela.html` ahora busca primero la publicación mediante `apiGetParcelas()` y conserva fallback local.

## Validaciones ejecutadas

- `node --check` sobre `js/db-api.js` y `app.js`.
- Validación de sintaxis de scripts inline de `index.html`, `parcela.html`, `cotizador.html` y `CRM.html`.
- Búsqueda global de marcadores Git `<<<<<<<` y `>>>>>>>`: sin resultados.

## Pruebas recomendadas después del despliegue

1. Abrir la portada y confirmar que aparecen parcelas.
2. Abrir el mapa general y comprobar marcadores y panel lateral.
3. Presionar “Ver ubicación en mapa” en una tarjeta.
4. Abrir una publicación local y una proveniente de Supabase en `parcela.html?id=...`.
5. Probar “Sumar casa” y confirmar que la parcela permanece seleccionada en el cotizador.
