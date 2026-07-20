# V13 — Distancia a ruta o carretera principal

Se incorporó al Publicador TPL el campo numérico `distanciaRutaPrincipalKm`.

Regla interna del Tasador:

- 0–5 km: 0%
- 6–10 km: -10%
- 11–20 km: -15%
- 21–30 km: -20%
- 31–40 km: -30%
- 41–50 km: -40%
- 51–60 km: -50%
- Más de 60 km: -60% máximo

El ajuste se aplica al resultado total del Tasador después de obtener el valor base/comparable. La fórmula y los porcentajes permanecen internos; el usuario solo recibe el rango final y la explicación cualitativa.

También se agregó la migración `202607190003_distancia_ruta_principal_tasador.sql` para guardar el dato en Supabase.
