# Plan de Respaldo y Recuperación - Tu Parcela Lista (TPL)

Este documento define el procedimiento para asegurar la continuidad del negocio y la integridad de los datos.

## 1. Repositorio de Código (GitHub / Control de Versiones)
- **Qué se respalda**: Todo el código fuente del frontend, scripts, configuraciones, HTML, CSS y migraciones SQL.
- **Frecuencia**: Continuo, mediante cada *commit* y *push* al repositorio principal.
- **Cómo restaurar**: Si se rompe algo en producción, usar `git log` para buscar el último commit estable y ejecutar `git revert <commit-id>` o hacer un rollback en Vercel.

## 2. Base de Datos (Supabase)
- **Qué se respalda**: Tablas completas (`clientes`, `proyectos`, `publicaciones_parcela`, etc.), esquemas y RLS.
- **Frecuencia**: Supabase (plan Pro) realiza respaldos diarios automáticos (Point in Time Recovery - PITR). En plan Free, se recomienda hacer un volcado (dump) manual semanal.
- **Cómo restaurar (Dump Manual)**:
  1. Entrar al Dashboard de Supabase > Database > Backups.
  2. Descargar el archivo `.sql` de respaldo.
  3. Ejecutarlo en SQL Editor para recuperar datos perdidos.
- **Si se elimina un registro por error**: Supabase permite restauraciones Point-in-Time si se tiene la opción activa. En su defecto, las tablas no deberían permitir `DELETE` directo sin ser *Soft Delete* (ej. `activo = false`).

## 3. Archivos (Supabase Storage)
- **Qué se respalda**: Fotografías de parcelas, documentos PDF generados, logos de corredores.
- **Frecuencia**: Recomendable descarga masiva mensual vía script (CLI de Supabase).
- **Cómo restaurar**: Si se borra el bucket `fotos_parcelas`, se deben re-subir los archivos descargados y asegurarse de que las URLs en la tabla `publicaciones_parcela` coincidan (o actualizarlas).

## 4. Variables de Entorno y Configuración
- **Qué se respalda**: Archivo `.env.example` (sin claves secretas) y un respaldo en gestor de contraseñas (1Password, Bitwarden) de los valores reales (`.env`).
- **Frecuencia**: Cada vez que se agrega o cambia una integración (Supabase, Resend, Flow).
- **Cómo restaurar**: En caso de pérdida, copiar las variables del gestor de contraseñas al panel de configuración de Vercel (Config > Environment Variables).

## 5. Procedimientos de Emergencia
- **Fallo Crítico en Producción (Frontend)**:
  1. Ingresar al panel de Vercel.
  2. Ir a Deployments.
  3. Seleccionar el último despliegue exitoso.
  4. Hacer clic en "Promote to Production" (Rollback instantáneo).
- **Subida de Datos Incorrectos masivos**:
  1. Si un administrador sube precios erróneos masivamente, escribir una query SQL rápida de `UPDATE` usando el archivo local `parcelas.js` como referencia base, o restaurar un snapshot de Supabase de hace 1 hora.
