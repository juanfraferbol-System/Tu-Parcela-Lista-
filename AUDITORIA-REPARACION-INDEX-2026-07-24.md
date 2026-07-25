# Auditoría y reparación del index — 24-07-2026

## Alcance revisado
- Botones principales del index.
- Menú superior y menú móvil.
- Selector de comunas.
- Sidebar de filtros.
- Apertura, cierre y renderizado del mapa.
- Inicialización del catálogo desde Supabase.
- Errores JavaScript que bloqueaban el resto de la interfaz.

## Causa crítica encontrada
`app.js` ejecutaba `renderFundaciones()` y `renderExtras()` antes de que `TPLCatalog.ready` terminara de cargar los catálogos. En ese momento las variables `fundaciones`, `extrasAutomaticos` y `extrasOpcionales` todavía no existían en el ámbito de `app.js`.

Errores producidos:
- `ReferenceError: fundaciones is not defined`
- `ReferenceError: extrasAutomaticos is not defined`

Al ocurrir cualquiera de esos errores, se detenía la ejecución de `app.js` antes de completar `setupEvents()`. Por eso dejaban de responder al mismo tiempo:
- botones del index;
- selector de comunas;
- filtros del sidebar;
- botón de mapa;
- acciones posteriores del cotizador.

## Correcciones aplicadas
1. Se crearon catálogos locales seguros, inicialmente vacíos.
2. La interfaz ahora puede inicializarse aunque Supabase todavía esté cargando.
3. Al resolver `TPLCatalog.ready`, los catálogos locales y globales se sincronizan.
4. Se eliminó el sombreado accidental del parámetro `fundaciones` en la promesa.
5. Se corrigió la lectura de `selectedExtras` para el generador de video.
6. Se reemplazó el icono Lucide inexistente `family` por `users`.

## Verificaciones estáticas realizadas
- `app.js` supera `node --check` sin errores de sintaxis.
- No existen IDs duplicados para los controles principales revisados.
- Están presentes los IDs de menú, comunas, sidebar, mapa y contenedor principal.
- Los listeners de filtros y mapa se registran dentro de `setupEvents()`.
- Los avisos de Google Analytics, preload y source maps no son bloqueantes.

## Archivos modificados
- `app.js`
- `index.html`

## Instalación
Reemplazar esos dos archivos en la raíz del proyecto conservando exactamente sus nombres y rutas.

Después:
1. Detener y volver a iniciar Live Server.
2. Abrir el `index.html` de la raíz.
3. Recargar con `Ctrl + Shift + R`.
4. Revisar la consola. Ya no deben aparecer los `ReferenceError` de fundaciones o extras.

## Prueba funcional recomendada
1. Abrir y cerrar el menú móvil.
2. Pulsar “Parcelas” en el menú.
3. Abrir “Comunas” y seleccionar una comuna.
4. Activar y desactivar cada filtro del sidebar.
5. Pulsar “Ver en mapa”.
6. Alternar mapa normal y satelital cuando estén disponibles.
7. Volver a la grilla y seleccionar una parcela.
