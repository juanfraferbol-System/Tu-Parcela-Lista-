# Auditoría integral TPL — 21 de julio de 2026

## Alcance aplicado
- `index.html` y tarjetas de parcelas/casas.
- `parcela.html` y funcionamiento visual del Asesor TPL.
- Publicador unificado, exclusivamente en la sección **Casa**.
- Identidad visual corporativa azul y amarillo.
- No se modificaron campos ni reglas del publicador de parcelas.

## Correcciones implementadas

### 1. Ranking real en tarjetas del index
Los distintivos ya no muestran solamente “Top 3”. Ahora indican la posición exacta:
- 1.ª, 2.ª y 3.ª más económica.
- 1.ª, 2.ª y 3.ª más grande.
- 1.ª, 2.ª y 3.ª con agua.
- En casas: posición económica, amplitud y alternativa familiar.

Se conserva un máximo de dos distintivos por tarjeta para mantener legibilidad.

### 2. Asesor TPL
Se detectó que `parcela.html` cargaba el JavaScript del asesor, pero no su hoja de estilos. Esto podía hacer que el botón pareciera inactivo o se mostrara incorrectamente.

Se corrigió:
- Carga de `css/tpl-lead-advisor.css` en `parcela.html`.
- Visibilidad forzada y z-index seguro del botón.
- Paleta cambiada de verde a azul y amarillo corporativo.
- Estados seleccionados, foco de campos y CTA alineados con la marca.

La limpieza del asesor antiguo se mantiene, pero no elimina elementos del nuevo Asesor TPL.

### 3. Publicador — campos base para tasador de casas
Se creó la base de datos necesaria para que la futura tasación de casas sea independiente de la tasación de parcelas.

Campos agregados:
- Año de última remodelación.
- Calidad de terminaciones.
- Estado de cocina y baños.
- Tipo de ventanas.
- Nivel de aislación térmica.
- Avalúo fiscal.
- Contribuciones trimestrales.
- Gastos comunes.
- Situación de ocupación.
- Orientación principal.
- Recepción final disponible.

Estos antecedentes se guardan dentro de `propiedad.tasacionCasa`, separados de los datos generales y sin alterar el objeto de tasación de parcelas.

También se hicieron obligatorios para una casa:
- Tipo de casa.
- Superficie construida.
- Material principal.
- Estado de conservación.
- Regularización.

### 4. Identidad visual
El publicador y el Asesor TPL ahora priorizan:
- Azul principal `#003f7a`.
- Azul oscuro `#082f57`.
- Amarillo `#f4c542`.

Se aplicó a botones, foco, selección, progreso, encabezados y módulos informativos.

## Próxima etapa recomendada
Construir el motor `TasadorCasaTPL` con comparables de viviendas y ponderaciones independientes: ubicación, valor por m² construido, terreno, antigüedad, conservación, materialidad, regularización, remodelaciones, eficiencia térmica, equipamiento y antecedentes fiscales.
