# Auditoría corregida — Publicador / sección Casa

## Causa del problema

La versión real del proyecto en `plataforma/publicar/` no contenía el archivo `house-valuation.js`. Además:

1. `index.html` no cargaba ese módulo.
2. Los campos nuevos del tasador de casa no estaban incorporados en la sección Casa.
3. `app.js` seguía enviando las casas al tasador general por comparables.
4. La versión de caché de `app.js` seguía siendo anterior a la mejora.

Por esas cuatro razones, el navegador no podía mostrar ni ejecutar el nuevo tasador de casas.

## Corrección aplicada

- Se agregó `plataforma/publicar/house-valuation.js`.
- Se agregaron campos de calidad, remodelación, cercanía al centro, camino, aislación y ventanas.
- Se conectó el botón del tasador al motor exclusivo de casas cuando `tipo === "casa"`.
- Se mantuvo intacta la llamada al tasador de parcelas para cualquier tipo distinto de casa.
- Se actualizó la versión de caché de los scripts.
- Se agregaron estilos para identificar visualmente el bloque piloto.

## Archivos que debes reemplazar

- `plataforma/publicar/index.html`
- `plataforma/publicar/app.js`
- `plataforma/publicar/styles.css`
- `plataforma/publicar/house-valuation.js` (nuevo)

## Verificación

Selecciona **Casa** en el primer paso. En la sección de características deben aparecer:

- Calidad constructiva.
- Remodelación.
- Año de remodelación.
- Centro urbano o Plaza de Armas.
- Tiempo al centro.
- Distancia al centro.
- Tipo de camino.
- Aislación térmica.
- Ventanas.
- Aviso “Tasador TPL de Casa · Piloto”.

El tasador de parcelas no fue modificado.
