TPL v2 - Etapa 2: limpieza de modales y estructura del index

Archivos incluidos:
- index.html
- js/tpl-modals.js
- js/tpl-index-fixes.js
- css/tpl-modal-fix.css

Cambios:
1. Se eliminaron los bloques HTML de modales desde el index principal.
2. Los modales ahora se cargan desde js/tpl-modals.js.
3. Se mantiene js/tpl-index-fixes.js para el flujo de presupuesto, menú y respaldo del mapa.
4. Se agrega css/tpl-modal-fix.css para asegurar que ningún modal aparezca bajo el footer.
5. El index queda más corto y más limpio, con menos riesgo de texto suelto o elementos visuales fuera de lugar.

Instalación:
1. Reemplazar index.html.
2. Copiar la carpeta js completa.
3. Copiar css/tpl-modal-fix.css dentro de la carpeta css.
4. Ejecutar:
   git add .
   git commit -m "TPL v2 etapa 2 - modales y mapa modular"
   git push
