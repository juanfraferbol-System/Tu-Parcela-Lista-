# Actualización Tasador TPL de Casa V1

Archivos que debes reemplazar dentro del proyecto:

- `plataforma/publicar/index.html`
- `plataforma/publicar/app.js`
- `plataforma/publicar/styles.css`
- `plataforma/publicar/house-valuation.js` (nuevo)

## Importante

- No se modificó `calculateLandRuleValuation` ni las reglas del tasador de parcelas.
- Para Casa, `calculateValuation()` deriva ahora al archivo independiente `house-valuation.js`.
- La estimación de casa representa solo la construcción; no suma el terreno.
- Se actualizaron las versiones de caché de `app.js` y `house-valuation.js`.

## Campos visibles al seleccionar Casa

Calidad constructiva, remodelación, año de remodelación, centro urbano o Plaza de Armas, minutos al centro, kilómetros al centro, camino, aislación térmica y ventanas.
