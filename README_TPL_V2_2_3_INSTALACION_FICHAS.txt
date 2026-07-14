TPL v2.2.3 - Instalación opcional y fichas informativas

Archivos incluidos:
- index.html
- app.js
- style.css
- js/tpl-budget-search.js

Cambios principales:
1. Paso 3 del cotizador convertido en servicio opcional de instalación.
2. Nuevo texto: ¿Quieres que te ayudemos con la instalación de tu proyecto?
3. Planes conservan la lógica actual, pero se presentan como Plan Base, Plan Full y Plan Premium.
4. Si el cliente no activa instalación, el resumen muestra: Servicio de instalación no incluido.
5. Si activa instalación, puede elegir el plan y se suma al total.
6. Al elegir una propuesta Parcela + Casa, el cotizador ahora se actualiza con fotos, parcela, casa y total sin requerir clic en fundación.
7. Botones Ficha parcela y Ficha casa abren un popup informativo con datos correspondientes.

Subir con:
git add index.html app.js style.css js/tpl-budget-search.js README_TPL_V2_2_3_INSTALACION_FICHAS.txt
git commit -m "TPL v2.2.3 instalación opcional y fichas cotizador"
git push
