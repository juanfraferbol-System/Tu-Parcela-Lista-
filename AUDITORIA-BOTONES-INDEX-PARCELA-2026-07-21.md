# Auditoría de botones: index y parcela.html

Fecha: 21 de julio de 2026

## Cambios aplicados

- Rediseño premium y responsive de las cuatro tarjetas de experiencias.
- Textos comerciales más claros y eliminación de “plusvalía garantizada”.
- Estados hover, foco visible, accesibilidad, etiquetas ARIA y soporte para movimiento reducido.
- Imágenes locales WebP verificadas para las cuatro tarjetas.
- Registro opcional del clic mediante Google Analytics y sessionStorage.
- Corrección crítica en `js/categoria.js`: cada resultado ahora abre `parcela.html?id=ID`.
- Revisión de destinos locales de `index.html`, `categoria.html` y `parcela.html`.
- Verificación de IDs duplicados: ninguno encontrado.
- Verificación de enlaces a archivos y anclas: sin destinos faltantes en los tres HTML auditados.
- Verificación de acciones principales de la ficha: elegir parcela, ver casas, compartir, favorito, galería, mapa, WhatsApp y navegación por precio poseen destino o controlador.

## Flujo final

1. En `index.html`, el usuario selecciona Descanso, Inversión, Bosque nativo o Con agua.
2. Se abre `categoria.html?cat=...` con parcelas ordenadas según esa experiencia.
3. Al seleccionar una parcela, se abre `parcela.html?id=...`.
4. Desde la ficha, “Elegir esta parcela y ver casas” guarda la parcela y vuelve a `index.html#casas-section`.
