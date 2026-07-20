Cambios incluidos:
- Se movieron los modales tpl-info-modal y tpl-location-modal antes del footer.
- Después del footer quedan solo scripts externos.
- El JavaScript incrustado del index fue movido a js/tpl-index-fixes.js.
- Esto evita letras/código suelto después del footer y deja el HTML más limpio.

Para instalar:
1. Reemplaza index.html en la raíz.
2. Copia la carpeta js/ si no existe, o copia js/tpl-index-fixes.js dentro de tu carpeta js.
3. Sube con git add . && git commit -m "Limpieza index v2" && git push.
