TU PARCELA LISTA - VERSION 2.0 BASE

Cambios aplicados:
1. index.html limpio: se eliminaron scripts incrustados al final del archivo.
2. Se agregó js/tpl-index-fixes.js con la lógica que antes estaba dentro de index.html.
3. Los modales de ficha y ubicación quedan antes del footer.
4. Después del footer solo quedan cargas externas de JavaScript.
5. Esta base mantiene compatibilidad con app.js, parcelas.js, casas.js, extras.js, premium-features.js, tpl-analytics.js y agente/agente.js.

Cómo instalar:
- Copia index.html en la raíz del proyecto.
- Copia la carpeta js/ completa en la raíz del proyecto.
- Verifica que exista esta ruta: js/tpl-index-fixes.js
- Luego ejecuta:
  git add .
  git commit -m "TPL v2 base - limpieza index y scripts"
  git push

No subir:
- node_modules/
- originales/
- procesadas/
- ZIPs pesados
