# Changelog — Tu Parcela Lista

## 2.0.3 — Modularización index stage 3
- Separado `tpl-index-fixes.js` en módulos más pequeños.
- Creado `tpl-utils.js` para helpers compartidos.
- Creado `tpl-menu.js` para navegación.
- Creado `tpl-budget-search.js` para búsqueda inicial por presupuesto.
- Creado `tpl-cotizador-launch.js` para acceso al cotizador.
- Creado `tpl-map-failsafe.js` para botones seguros del mapa modal.
- Creado `tpl-agent-cleanup.js` para limpieza del asesor virtual.
- Agregada carpeta `docs` con arquitectura y roadmap.

## 2.0.2 — Modales y mapa modular
- Modales movidos fuera de HTML visible.
- Botones del mapa reforzados.
- Footer sin contenido visual inesperado.

## 2.0.1 — Fix modales bajo footer
- Se ocultaron modales por defecto.

## 2.0.0 — Limpieza base index
- JavaScript incrustado movido a archivo externo.
- Orden de scripts simplificado.

## TPL 2.1.0-core
- Se agrega núcleo progresivo en `js/core/`.
- Se centralizan configuración, estado y navegación interna.
- Se crea estructura base `js/modules/` para migrar funcionalidades sin romper el código actual.
