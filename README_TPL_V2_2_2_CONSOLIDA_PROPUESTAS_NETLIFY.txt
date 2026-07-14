TPL v2.2.2 - Consolidación propuestas Netlify

Archivos incluidos:
- style.css
- js/tpl-budget-search.js

Correcciones:
- El módulo Con Casa ahora genera HTML compatible con los estilos v2.2 (.tpl-combo-card).
- La sección #combo-proposals-section recibe clase tpl-combo-v22.
- Se agregan estilos de respaldo al final de style.css para evitar que otros CSS pisen las tarjetas en Netlify.
- Las imágenes quedan con alto fijo, object-fit: cover y dos columnas uniformes.
- El scroll cae directo a "5 propuestas cercanas a tu presupuesto".

Después de copiar:
git add style.css js/tpl-budget-search.js README_TPL_V2_2_2_CONSOLIDA_PROPUESTAS_NETLIFY.txt
git commit -m "TPL v2.2.2 consolida propuestas Netlify"
git push
