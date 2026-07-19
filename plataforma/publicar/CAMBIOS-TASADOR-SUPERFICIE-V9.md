# Tasador TPL V9 — reglas por superficie

Se agregó un cálculo interno progresivo para parcelas y campos:

- Hasta 7.000 m²: $2.000 por m².
- De 7.001 a 10.000 m²: solo el excedente se calcula a $1.000 por m².
- De 10.001 a 20.000 m²: solo el excedente se calcula a $500 por m².
- De 20.001 a 40.000 m²: solo el excedente se calcula a $250 por m².
- Sobre 40.000 m²: la superficie considerada se calcula a $1.000 por m², con tope interno de 250.000 m².
- Sobre 40.000 m²: después de sumar las características y ajustes globales, se aplica un ajuste interno de -30% al valor acumulado.
- Luego continúa el ajuste de accesibilidad y el factor de mercado ya existentes.

El usuario no ve tasas, porcentajes ni fórmulas. El CRM recibe `surfacePricing`, `largeLandAdjustment` y la versión de algoritmo `tpl-rules-biobio-nuble-v3-surface-accessibility`.
