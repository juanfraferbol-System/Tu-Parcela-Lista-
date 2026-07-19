# Tasador TPL – Inteligencia y accesibilidad V8

## Factor de Accesibilidad TPL

Se incorporó una penalización única sobre el valor total calculado, antes del Factor Mercado TPL:

- Más de 60 km o más de 1 hora estimada de viaje: -20%.
- Más de 70 km: -30%.
- Más de 80 km: -40%.

Solo se aplica la penalización más alta que corresponda. La fórmula y los porcentajes continúan siendo internos y no se muestran al propietario.

Cuando no existe una API de rutas, el tiempo de viaje se calcula como una estimación interna conservadora usando la distancia geográfica, un factor vial y una velocidad promedio configurable. El registro indica que se trata de una estimación.

## CRM e inteligencia comercial

Cada tasación nueva guarda además:

- Ciudad principal más cercana.
- Distancia calculada.
- Distancia vial y tiempo de viaje estimados.
- Factor de accesibilidad aplicado.
- Puntaje de confianza.
- Versión del método de tasación.

El panel `crm-tasador.html` ahora incorpora:

- Conversión de tasación a publicación.
- Aceptación de recomendaciones TPL.
- Confianza acumulada por comuna.
- Brecha de precio por comuna.
- Distribución de ajustes por accesibilidad.
- Embudo de tasaciones iniciadas, completadas, aceptadas y publicadas.
- Nuevas columnas y campos en la exportación CSV.

## Compatibilidad

Los registros antiguos siguen apareciendo. Los nuevos indicadores que no existan en tasaciones anteriores se muestran como “Sin ajuste” o “—”.
