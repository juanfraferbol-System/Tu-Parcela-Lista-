TPL v2.1.1 - Fix Con Casa / propuestas cercanas

Archivos modificados:
- js/tpl-budget-search.js
- style.css

Correcciones:
- El flujo Con Casa ahora hace scroll directo a #combo-proposals-section.
- Las propuestas se marcan como visibles con .is-visible antes del scroll.
- Las fotos de parcela y casa usan figure + object-fit: cover para evitar deformaciones en Netlify.
- Se agregó estilo para h3 dentro de .combo-proposal-body.

Después de copiar:
git add .
git commit -m "TPL v2.1.1 fix propuestas con casa"
git push
