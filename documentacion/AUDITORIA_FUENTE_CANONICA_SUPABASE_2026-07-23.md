# Auditoría de fuente canónica — Tu Parcela Lista

Fecha: 23 de julio de 2026  
Proyecto Supabase auditado: `qxavbqhyqaqalpzbhwmh`

## Resultado ejecutivo

La arquitectura anterior mezclaba dos fuentes:

- Parcelas: Supabase más respaldo silencioso en `parcelas.js`.
- Casas, fundaciones y extras: archivos JavaScript estáticos.
- Landing Premium: configuración pública/Supabase mediante su identificador.
- Cotizador, buscadores, mapas y promociones: contratos de datos legacy en memoria.

La corrección introduce un repositorio público único (`js/db-api.js`). Este consulta
`publicaciones_publicas`, `casas` y `extras`, transforma las filas al contrato que ya
esperan las pantallas y emite `tpl:catalog-ready`. No existe fallback comercial hacia
archivos estáticos.

## Hallazgos

### Crítico

1. `casas` y `extras` estaban vacías en Supabase, aunque existían 14 casas, 15 extras
   y 3 fundaciones en archivos estáticos.
2. La migración histórica de catálogos contenía valores literales `undefined` en
   precios. Esto impedía poblar correctamente las tablas.
3. El cotizador cargaba `parcelas.min.js`, `casas.js` y `extras.js` antes de conectar
   Supabase.

### Alto

1. `apiGetParcelas()` combinaba datos remotos con datos locales y ocultaba fallos del
   backend.
2. Varios componentes obtenían catálogos mediante variables globales y `eval`.
3. Extras y fundaciones no tenían una pantalla de administración en el CRM.
4. El esquema de Supabase no conservaba empresa, tiempo de entrega ni cantidades
   configurables del catálogo legacy.

### Medio

1. `tpl-professional-flow.js` podía renderizar promociones antes de terminar la
   consulta remota.
2. La selección del cotizador usa `localStorage`. Esto es aceptable porque guarda
   únicamente IDs temporales, no contenido comercial.
3. `plataforma/publicar/valuation-data.js` es una instantánea analítica generada a
   partir de catálogos. Sigue siendo estática y debe migrarse en una fase específica
   del Tasador para no alterar hoy su modelo de valoración.

### Bajo

1. Permanecen archivos legacy (`parcelas.js`, `parcelas.min.js`, `casas.js`,
   `extras.js`) como respaldo histórico/materia prima de migración, pero ninguna de
   las páginas públicas principales los carga.
2. Configuraciones editoriales como categorías, textos, iconos o etapas constructivas
   siguen en JavaScript porque no tienen un equivalente en la base de datos.

## Arquitectura resultante

| Consumidor | Fuente canónica | Adaptador |
|---|---|---|
| Inicio, buscador, mapa, promociones | `publicaciones_publicas` | `TPLCatalog` |
| Ficha `parcela.html` | `publicaciones_publicas` | `TPLCatalog` |
| Categorías | `publicaciones_publicas` | `TPLCatalog` |
| Cotizador: parcelas | `publicaciones_publicas` | `TPLCatalog` |
| Cotizador: casas | `casas` | `TPLCatalog` |
| Cotizador: extras/fundaciones | `extras` | `TPLCatalog` |
| CRM parcelas | `publicaciones` mediante RPC administrativa | RPC existente |
| CRM casas | `casas` mediante RPC administrativa | RPC ampliada |
| CRM extras/fundaciones | `extras` mediante RPC administrativa | RPC nueva |
| Landing Premium | publicación/landing pública en Supabase | Landing Engine existente |

## Caché e invalidación

Los catálogos no se persisten en `localStorage`, IndexedDB ni archivos JSON. Cada
carga completa de página consulta Supabase. `TPLCatalog.refresh()` permite volver a
consultar sin recargar. Los scripts modificados llevan versión de despliegue en las
páginas relevantes para evitar conservar el adaptador anterior en caché.

## Dependencias estáticas que permanecen

- `plataforma/publicar/valuation-data.js`: dataset de comparación del Tasador.
- `extradata.js`: contenido visual/explicativo del cotizador, no catálogo comercial.
- Configuraciones de UX, categorías y etapas: no tienen tabla equivalente.
- Archivos legacy de catálogos: no están conectados al runtime público; se conservan
  temporalmente para trazabilidad y reversión.

## Orden de despliegue obligatorio

1. Ejecutar `supabase/migrations/202607230003_catalogo_publico_canonico.sql` en el
   proyecto `qxavbqhyqaqalpzbhwmh`.
2. Verificar 14 filas activas en `casas` y 18 filas activas en `extras`.
3. Publicar los archivos web.
4. Validar inicio, categoría, ficha y cotizador en una ventana privada.

Publicar el frontend antes de ejecutar la migración dejaría casas y extras vacíos.

