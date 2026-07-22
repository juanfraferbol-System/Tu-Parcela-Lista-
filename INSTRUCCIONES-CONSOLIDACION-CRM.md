# Consolidación CRM Tu Parcela Lista

## CRM oficial

Ruta única:

`/plataforma/crm/index.html`

Proyecto Supabase oficial:

`qxavbqhyqaqalpzbhwmh`

## Cambios realizados

1. Se agregó `plataforma/crm/crm-config.js` como configuración central del CRM.
2. `crm.js` ya no contiene su propia URL y clave: las lee desde `crm-config.js`.
3. Se actualizó la versión de caché de `crm.js`.
4. Se agregaron protecciones iniciales para textos mostrados en tablas del CRM.
5. `CRM.html`, `CMR.html` y `admin-crm.html` ahora redirigen al CRM oficial.
6. No se modificó ni eliminó ninguna tabla de Supabase.
7. No se migraron datos entre proyectos porque el proyecto correcto ya es `qxavbqhyqaqalpzbhwmh`.

## Archivos que debes reemplazar

- `plataforma/crm/index.html`
- `plataforma/crm/crm.js`
- `plataforma/crm/crm-config.js` (nuevo)
- `CRM.html`
- `CMR.html`
- `admin-crm.html`

Los archivos `crm.css` y `crm-launch-dashboard.js` se incluyen para mantener completa la carpeta oficial, aunque no requirieron cambios importantes.

## Archivos antiguos

Después de comprobar el CRM en producción puedes borrar definitivamente el contenido antiguo de los tres paneles, porque sus archivos de reemplazo ya conservan las URL como redirecciones. No borres las rutas: mantenerlas como redirecciones evita enlaces rotos.

## Qué no conviene hacer todavía

No borres tablas, funciones RPC, políticas RLS ni datos de Supabase hasta hacer un inventario remoto desde el SQL Editor. La revisión de archivos locales no confirma cuántos registros reales existen en producción.

## Comprobación local

Abrir:

`http://127.0.0.1:5500/plataforma/crm/index.html`

También probar estas rutas y confirmar que redirigen:

- `http://127.0.0.1:5500/CRM.html`
- `http://127.0.0.1:5500/CMR.html`
- `http://127.0.0.1:5500/admin-crm.html`

## Publicación

```bash
git add plataforma/crm CRM.html CMR.html admin-crm.html
git commit -m "Consolidar CRM oficial y eliminar paneles paralelos"
git push origin main
vercel --prod
```
