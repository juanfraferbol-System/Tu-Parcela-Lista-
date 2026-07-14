# TPL v2.2.7 - Flujo guiado, promociones y ajustes UX

Archivos incluidos:
- index.html
- app.js
- style.css
- js/tpl-professional-flow.js

Cambios principales:
1. Modo guiado inicial:
   - Las secciones completas de Parcelas y Casas quedan ocultas al inicio.
   - Se revelan al usar el menú principal, al buscar por presupuesto o al iniciar scroll.

2. Promos / Proyectos listos para cotizar:
   - Ahora se generan 5 tarjetas.
   - Son las combinaciones más económicas de parcela + casa.
   - Diseño más llamativo tipo promoción.
   - Incluyen botón Cotizar proyecto y Ver ubicación.
   - Al cotizar, cargan el proyecto directo en el cotizador interno.

3. Parcela + Casa:
   - Se mantiene el foco en las 5 propuestas cercanas al presupuesto.
   - Se oculta la grilla completa de casas mientras se muestran propuestas.

4. Popups:
   - Reorganización del popup de ubicación para evitar que el cierre o controles tapen el zoom.
   - Las fichas de parcela/casa tienen scroll seguro para que no se pierdan botones inferiores.

Notas:
- Esta versión trabaja como capa final mediante js/tpl-professional-flow.js.
- No elimina app.js ni reescribe el flujo base; corrige y mejora sobre la versión actual.
