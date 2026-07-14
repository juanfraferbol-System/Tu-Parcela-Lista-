# Arquitectura — Tu Parcela Lista 2.0

## Objetivo
Separar el sitio en módulos estables para que mapa, cotizador, promociones, menú y asesor no se rompan entre sí.

## Estructura actual recomendada

```text
/index.html
/app.js
/style.css
/parcelas.js
/casas.js
/extras.js

/js
  tpl-utils.js
  tpl-menu.js
  tpl-cotizador-launch.js
  tpl-budget-search.js
  tpl-modals.js
  tpl-map-failsafe.js
  tpl-agent-cleanup.js

/css
  tpl-modal-fix.css
```

## Reglas de arquitectura

1. `index.html` debe contener HTML estructural, no lógica extensa.
2. Toda lógica nueva debe ir en `/js`.
3. Todo estilo nuevo debe ir en `/css`.
4. Las funciones globales deben vivir bajo `window.TPL` cuando sean compartidas.
5. Cada módulo debe tener una responsabilidad clara.

## Módulos creados en v2 stage 3

- `tpl-utils.js`: helpers globales, lectura de arrays, formateo CLP, scroll.
- `tpl-menu.js`: menú móvil y navegación a secciones.
- `tpl-cotizador-launch.js`: acceso al cotizador desde index.
- `tpl-budget-search.js`: búsqueda inicial por presupuesto.
- `tpl-modals.js`: inyección de modales globales.
- `tpl-map-failsafe.js`: cierre y botones seguros del modal de ubicación.
- `tpl-agent-cleanup.js`: limpieza visual del asesor virtual.

## Próximo paso
Separar `app.js` en módulos internos de parcelas, mapa, casas, cotizador y promociones.

## Núcleo 2.1

La carpeta `js/core/` contiene la primera capa estable del sistema:

- `config.js`: configuración general, rutas, selectores y claves de almacenamiento.
- `state.js`: estado central compatible con el objeto legacy `window.state`.
- `router.js`: navegación interna con offset fijo para header sticky.
- `app-core.js`: inicialización del namespace `window.TPL` y utilidades globales.

Esta etapa convive con `app.js`. La migración será progresiva por módulos.
