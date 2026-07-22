# Auditoría CRM Tu Parcela Lista

## Correcciones aplicadas

- Se eliminó la segunda carga de `supabase-js` en el CRM.
- `crm-config.js` ahora crea y comparte una sola instancia entre `tplSupabase` y `tplCrmSupabase`.
- Se normalizaron las rutas de producción bajo `/plataforma/crm/`.
- Se agregó control para evitar cargas simultáneas repetidas del dashboard.
- Se evitó registrar varias veces el observador de autenticación.
- La carga inicial de módulos ahora usa `Promise.allSettled` para aislar errores.
- Se protegieron elementos DOM críticos que podrían no existir.
- Se reconocen los estados de cotización `cotizacion_generada` y `cotizacion_enviada`.
- `crm-supabase.js` quedó autocontenido y ya no depende obligatoriamente de un archivo externo no incluido.
- `db-api.js` reutiliza el cliente global cuando ya existe.
- La migración nueva consolida permisos y políticas RLS administrativas.
- La migración completa los campos de `contratistas` que el CRM espera actualmente.

## Orden de instalación

1. Copiar los archivos respetando sus carpetas.
2. Ejecutar en Supabase SQL Editor:
   `supabase/migrations/202607220001_consolidar_crm_produccion.sql`
3. Subir los cambios a Git y esperar el despliegue de Vercel.
4. Abrir `/plataforma/crm/` y recargar con `Ctrl + Shift + R`.
5. Confirmar en Red que se carga la versión `20260722-1`.

## Validación realizada

Pasaron validación sintáctica:

- `plataforma/crm/crm-config.js`
- `plataforma/crm/crm.js`
- `plataforma/crm/crm-launch-dashboard.js`
- `js/crm-supabase.js`
- `js/db-api.js`
