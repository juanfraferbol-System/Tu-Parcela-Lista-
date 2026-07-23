# Actualización: mapa, Tasador y Landings automáticas

## Correcciones

- La Landing pública ahora muestra el enlace de mapa configurado.
- `parcela.html` y el modal del inicio usan una URL estándar de búsqueda por
  coordenadas en Google Maps.
- El enlace se oculta si no existen coordenadas válidas.
- El texto de características dejó de mencionar Caburgua de forma fija.

## Tasador

El Publicador incorpora el campo `zonaTuristica` y un botón explícito
**Calcular precio recomendado**.

Las primas comerciales están centralizadas en
`plataforma/publicar/valuation-premiums.js`:

| Condición | Operación |
|---|---|
| Sin clasificación | valor × 1 |
| Turístico local | valor × 1,20 |
| Turístico nacional | valor × 4,00 |
| Acceso a río | resultado acumulado × 1,10 |

Ejemplo: valor base de $10.000.000, destino turístico nacional y acceso a río:

1. $10.000.000 × 4,00 = $40.000.000.
2. $40.000.000 × 1,10 = $44.000.000.

Es una estimación comercial orientativa. La clasificación y el acceso deben
revisarse antes de aprobar la publicación.

## Landings automáticas

La migración `202607230004_landings_automaticas_precio_mapa.sql`:

- enlaza cada Landing con `publicacion_id`;
- prepara una cuenta y proyecto comercial reutilizables;
- genera un borrador para planes que incluyen Landing;
- sincroniza título, descripción, precio, ubicación, mapa, fotos y atributos;
- conserva el paso manual **Publicar cambios**;
- incorpora un listado administrativo de todas las Landings;
- corrige el mapa de Caburgua usando su publicación canónica.

Planes que preparan Landing:

- Propietarios: Impulso, Impulso Fuerte e Impulso Agresivo.
- Corredores: Corredor Impulso, Corredor Profesional y Corredor Elite.

La migración no activa pagos ni publica borradores automáticamente.

## Orden de instalación

1. Ejecutar la migración SQL.
2. Verificar que finalice con `Success. No rows returned`.
3. Copiar los archivos web.
4. Recargar con `Ctrl + F5`.
5. Validar Caburgua y el Publicador.

