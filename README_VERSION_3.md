# Tu Parcela Lista - V3 UX

Cambios principales:

- Rediseño del encabezado de resultados en `index.html`.
- Botón `Ver mapa` integrado al contador de parcelas, sin ocupar una franja completa.
- Sidebar simplificado a `Filtrar parcelas`.
- Scroll inteligente del sidebar solo cuando se abre `Comunas`.
- Nuevo filtro `Río o arroyo`.
- Títulos dinámicos según filtro activo:
  - Parcelas cercanas a mí
  - Parcelas con agua disponible
  - Parcelas con flujo o cuerpos de agua
  - Parcelas con bosque nativo
  - Parcelas con facilidad de pago
  - Parcelas sobre 1 hectárea
  - Parcelas en comuna
- Precio visible sobre cada tarjeta de parcela.
- Chips visuales en tarjetas: Agua, Río/arroyo, Nativo, Facilidades.
- Nuevo archivo `css/v3-ux.css` para no seguir parchando el CSS antiguo.

Archivos modificados:

- `index.html`
- `app.js`
- `css/v3-ux.css`
- módulos CSS base en carpeta `css/` para evitar errores 404 si estaban referenciados.
