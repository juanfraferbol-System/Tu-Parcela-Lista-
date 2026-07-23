# Auditoría y corrección: cotizador + tasador del publicador

Fecha: 23 de julio de 2026  
Proyecto Supabase: `qxavbqhyqaqalpzbhwmh`

## Alcance

Se auditó y corrigió:

- el cotizador del `index.html`;
- la selección de planes de fundación;
- la aparición y desaparición de extras;
- el total y los ítems enviados a Supabase;
- el tasador de parcela;
- el tasador de casa;
- el tasador de parcela con casa;
- el registro de la tasación y su origen;
- el criterio para mostrar el distintivo “Valor respaldado”.

No se modificaron Landing Premium, CRM, leads, visitas, WhatsApp, Google Ads ni SEO.

## Diagnóstico encontrado

### Crítico

1. El botón del tasador no llamaba a `supabase/functions/tasar-parcela`.
2. La tasación se calculaba en el navegador y se respaldaba principalmente en `localStorage`.
3. Para regiones fuera de Biobío y Ñuble se buscaban claves inexistentes (`parcelas`, `land`, `casas`, `houses`). El archivo legacy exponía `PARCEL_COMPARABLES` y `HOUSE_COMPARABLES`, por lo que el resultado quedaba vacío.
4. “Parcela con casa” valorizaba solamente el terreno e ignoraba el valor de la vivienda.
5. Una excepción dentro del cálculo podía dejar el modal cargando sin una respuesta útil.
6. El cotizador enviaba `p_total: 0`, `p_extras: []` y un identificador de parcela que no correspondía al UUID canónico.

### Alto

1. Los tres planes de instalación dependían de la posición del arreglo recibido desde Supabase.
2. Supabase ordenaba el catálogo por `actualizado_en`; editar un plan podía cambiar accidentalmente su significado.
3. Al cambiar de plan no se redibujaban los extras.
4. Los extras incluidos en Premium podían quedar cobrados por diferencias de normalización entre códigos.
5. No se respetaban cantidades mínimas y máximas del catálogo.
6. El bloque de extras se movía a un modal y no regresaba a su posición original.
7. Una estimación local podía activar visualmente el distintivo “Valor respaldado”.

### Medio

1. El motor de casas no usa comparables de mercado; estima el valor de construcción mediante reglas.
2. Dormitorios, baños, pisos, agua, saneamiento, calefacción y estacionamientos no tienen todavía ponderaciones monetarias aprobadas.
3. Varios atributos del terreno se registran y aumentan la cobertura del informe, pero no todos tienen una regla de precio formal.
4. El archivo `valuation-data.js` sigue presente como archivo histórico, pero ya no se carga ni participa en el cálculo.

## Arquitectura corregida

### Cotizador

`Supabase.extras` → `js/db-api.js` → reglas de plan → selección de usuario → resumen único → RPC `crear_proyecto_completo`

La fuente del plan queda identificada por:

- `extras.codigo_plan`;
- `extras.orden_visual`;
- `fundacion_extra_reglas`.

El mismo objeto de cotización alimenta:

- el total visible;
- el texto de WhatsApp;
- el PDF;
- `p_total`;
- `p_extras`;
- `proyecto_items`.

### Tasador

`Publicador` → `valuation-service.js` → Edge Function `tasar-parcela` → Supabase → resultado → publicación

Si Supabase tiene cobertura suficiente:

- calcula;
- registra en `tasaciones`;
- registra comparables y factores;
- devuelve el ID de tasación;
- permite guardar la decisión de precio.

Si la cobertura es insuficiente:

- no inventa un resultado oficial;
- puede mostrar una referencia preliminar solo con datos públicos canónicos de la misma región;
- nunca activa el distintivo “Valor respaldado”.

## Matriz de datos auditados

| Tipo | Modifican actualmente el cálculo | Se registran o miden como cobertura | Pendiente de regla formal |
|---|---|---|---|
| Parcela | región, comuna, sector, superficie, comparables, ubicación, acceso, topografía, agua, luz, rol, distancia a ruta, clasificación turística y acceso a río | subdivisión, uso de suelo, condición legal y naturaleza | suelo, vista, orientación, privacidad, forma, frente, cierre, portón y factibilidad de construcción |
| Casa | superficie construida, material, calidad, estado, regularización, antigüedad, remodelación, cercanía urbana, camino, aislación, ventanas y extras reconocidos | dormitorios, baños, pisos, agua, saneamiento, calefacción y estacionamientos | motor de comparables de casas y ponderaciones comerciales específicas |
| Parcela con casa | resultado del terreno + resultado de la construcción | cobertura combinada de ambos formularios | validación de mercado específica para propiedades mixtas |

Los campos “pendientes de regla formal” no alteran el precio para evitar porcentajes arbitrarios. Sí permanecen dentro de la publicación y del informe de cobertura.

## Reglas comerciales confirmadas

El orden es:

1. valor por comparables;
2. ajuste por distancia a ruta;
3. ajuste turístico;
4. ajuste por acceso a río.

Porcentajes configurados:

- turístico nacional: `+300 %`;
- turístico local: `+20 %`;
- acceso a río: `+10 %` aplicado después del ajuste turístico.

Estas reglas quedan versionadas como `tpl-mvp-1.1.0`.

## Correcciones del cotizador

- Código estable para planes: `base`, `radier_full`, `premium`.
- Orden visual estable: 10, 20 y 30.
- Relación canónica entre fundación y extras incluidos.
- Extras visibles según el plan seleccionado.
- La selección del usuario se conserva al cambiar de plan.
- Un extra incluido no se cobra por segunda vez.
- Cantidades limitadas por `cantidad_minima` y `cantidad_maxima`.
- El pack coincide con los ítems que muestra su interfaz.
- El total numérico y los ítems reales se envían a Supabase.
- La parcela usa `publicacionId`.
- Los ítems guardan tipo, cantidad, unidad, precio, subtotal y snapshot.
- El bloque de extras vuelve a su ubicación al cerrar el modal.

## Correcciones del tasador

- Se eliminó la carga activa de `valuation-data.js`.
- Los comparables públicos provienen de `TPLCatalog`/Supabase.
- La parcela consulta primero la Edge Function oficial.
- La casa usa un motor separado y declara que estima solo construcción.
- La parcela con casa suma terreno y vivienda.
- El modal maneja carga, error y resultado sin temporizador bloqueante.
- Se registra origen, cobertura, persistencia e ID de tasación.
- Solo un resultado persistido puede mostrar “Valor respaldado”.
- Se agregaron orígenes locales 5500, 8000 y 8765 para pruebas.

## Riesgos que permanecen

### Alto

- La Edge Function actualizada debe desplegarse. Copiar el frontend no actualiza funciones de Supabase.
- Las migraciones `202607230005` y `202607230006` deben ejecutarse antes del despliegue público.

### Medio

- En comunas con menos de tres comparables válidos, el resultado oficial seguirá indicando cobertura insuficiente.
- El motor de casas sigue siendo referencial y no equivale a una tasación de mercado de la propiedad completa.
- Los porcentajes turísticos son comercialmente muy significativos: `+300 %` convierte el valor previo en cuatro veces su valor. Debe existir revisión documental antes de aprobar una publicación.

### Bajo

- `valuation-data.js` puede eliminarse en una futura limpieza controlada; actualmente está inactivo y no afecta el sitio.

## Orden obligatorio de instalación

1. Ejecutar `supabase/migrations/202607230005_cotizador_reglas_planes_integridad.sql`.
2. Ejecutar `supabase/migrations/202607230006_tasador_reglas_comerciales_v2.sql`.
3. Desplegar la función `tasar-parcela`.
4. Copiar los archivos frontend respetando sus rutas.
5. Publicar el sitio.
6. Validar en una ventana privada.

## Checklist de validación

- [x] Sintaxis JavaScript.
- [x] Planes independientes del orden de actualización.
- [x] Extras incluidos sin doble cobro.
- [x] Límites de cantidades.
- [x] Total numérico real.
- [x] Ítems reales enviados a Supabase.
- [x] UUID canónico de parcela.
- [x] Comparables estáticos fuera del flujo activo.
- [x] Parcela conectada al Tasador Supabase.
- [x] Casa con motor propio.
- [x] Parcela con casa con cálculo compuesto.
- [x] Turismo nacional, local y río probados.
- [x] Cobertura insuficiente sin valor inventado.
- [x] Trece pruebas automatizadas.
- [ ] Migraciones ejecutadas en el proyecto remoto.
- [ ] Edge Function desplegada en producción.
- [ ] Prueba real de parcela desde producción.
- [ ] Verificación del registro en `tasaciones`.
