# Tasador TPL – Implementación local y despliegue controlado

Fecha de cierre local: 17 de julio de 2026.

## Estado actual

La Fase 0 y el MVP quedaron implementados en la rama `codex/tasador-fase0`. Ninguna migración ni Edge Function nueva fue desplegada al proyecto remoto de Supabase durante este bloque.

La fuente oficial de publicaciones comprobada en el entorno remoto es `public.publicaciones`, con 32 registros aprobados. `public.publicaciones_parcela` existe, pero no contiene registros y no debe convertirse en una segunda fuente oficial.

## Bloques completados

### Estabilización y privacidad

- El catálogo público pasa a consumir `publicaciones_publicas`, una vista sin datos privados.
- La migración revoca la lectura directa de `publicaciones` para `anon` y `authenticated`.
- Las coordenadas públicas se aproximan y las coordenadas exactas permanecen privadas.
- Se retiraron credenciales de respaldo de Flow escritas en código.
- Los beneficios pagados no se activan desde parámetros del navegador ni por retornos sin confirmación segura.
- El envío de publicaciones usa la Edge Function real, conserva borradores e idempotencia y limita las fotografías a 12 en frontend y backend.

### Datos comerciales

- Se separan precio esperado por el propietario, porcentaje y monto del servicio, precio público y precio recomendado.
- Los precios históricos existentes se clasifican como `precio_publicado_solicitado`; no se convierten en ventas ni tasaciones profesionales.
- El porcentaje Partner queda centralizado y configurable en `crm_configuracion`.
- Se incorpora historial de precios sin sobrescribir valores anteriores.

### Tasador TPL

- El motor usa mediana ponderada, rangos por cuantiles, distancia geográfica directa, similitud de superficie, antigüedad y calidad de la fuente.
- No contiene precios comunales ni valores por metro cuadrado inventados.
- Con menos de tres comparables válidos devuelve información insuficiente y no fabrica un rango.
- La confianza disminuye cuando faltan ventas verificadas, coordenadas, cercanía, actualidad o similitud.
- El precio ingresado por el propietario solo se compara después del cálculo independiente; no modifica el rango estimado.
- Se guardan versión del algoritmo, factores, comparables, descartes, confianza, cobertura, decisión y precio finalmente elegido.
- La tasación básica anónima se controla en backend por propiedad o sesión; una reapertura no consume otro uso.
- Premium queda preparado, pero desactivado hasta contar con pago y autorización verificados desde backend.

### Publicar parcela y CRM

- La invitación al Tasador aparece junto al precio y permite continuar sin usarlo.
- El formulario reutiliza los datos ya ingresados, mantiene el precio original y solo lo cambia con consentimiento.
- El resultado muestra rango, venta rápida, mercado, máximo razonable, precio por m², confianza, cobertura y aviso legal.
- El CRM usa la fuente canónica, corrige referencias de tablas y columnas y agrega un panel mínimo del Tasador.
- Los parámetros del algoritmo se consultan desde Supabase; la edición queda bloqueada hasta desplegar y validar el esquema.

## Archivos principales

- `supabase/migrations/202607170003_cerrar_exposicion_publicaciones.sql`
- `supabase/migrations/202607170004_tasador_tpl_mvp.sql`
- `supabase/rollback/202607170004_tasador_tpl_mvp_rollback.sql`
- `supabase/functions/tasar-parcela/index.ts`
- `supabase/functions/tasar-parcela/engine.mjs`
- `supabase/functions/publicar-parcela/index.ts`
- `plataforma/publicar-parcela/index.html`
- `plataforma/publicar-parcela/publicar-parcela.js`
- `plataforma/publicar-parcela/tasador-service.js`
- `plataforma/crm/index.html`
- `plataforma/crm/crm.js`

## Verificación obligatoria antes de producción

No ejecutar `db push` sin completar primero los siguientes pasos de lectura y revisión.

```powershell
npx supabase login
npx supabase link --project-ref qxavbqhyqaqalpzbhwmh
npx supabase migration list --linked
npx supabase db dump --linked --schema public --file supabase/remote-public-schema-before-tasador.sql
npx supabase db push --linked --dry-run
```

Revisar especialmente en el respaldo:

- definición y restricciones actuales de `publicaciones`;
- políticas RLS y privilegios de `publicaciones`;
- estructura de `crm_configuracion`;
- funciones y disparadores existentes;
- migraciones marcadas como aplicadas en remoto;
- compatibilidad de tipos para precio, superficie, coordenadas y estados.

El archivo de respaldo remoto no debe confirmarse en Git si contiene información sensible.

## Orden propuesto de despliegue

Solo después de revisar el respaldo y el `dry-run`:

```powershell
npx supabase db push --linked
npx supabase secrets set TASADOR_ABUSE_SALT="GENERAR_UN_SECRETO_LARGO" --project-ref qxavbqhyqaqalpzbhwmh
npx supabase secrets set TPL_ALLOWED_ORIGINS="https://tu-dominio.cl,https://www.tu-dominio.cl" --project-ref qxavbqhyqaqalpzbhwmh
npx supabase functions deploy publicar-parcela --project-ref qxavbqhyqaqalpzbhwmh
npx supabase functions deploy tasar-parcela --project-ref qxavbqhyqaqalpzbhwmh --no-verify-jwt
```

`--no-verify-jwt` permite la primera tasación anónima, pero la función aplica su propio control de sesión, consumo e idempotencia. No se debe agregar una clave `service_role` al frontend, Vercel ni archivos públicos.

## Reversión

Si falla el Tasador después del despliegue:

1. Ocultar temporalmente la tarjeta del Tasador sin impedir la publicación.
2. Retirar la Edge Function `tasar-parcela` o bloquearla desde configuración.
3. Restaurar la base desde el respaldo si hubo corrupción de datos.
4. Usar `supabase/rollback/202607170004_tasador_tpl_mvp_rollback.sql` únicamente en un entorno de prueba o con respaldo confirmado.

La reversión de la migración elimina tablas y datos del Tasador; por eso no debe ejecutarse automáticamente en producción. El cierre de privacidad de `publicaciones` debe mantenerse incluso si se retira el Tasador.

## Pruebas ejecutadas

- Validación sintáctica del módulo principal de publicación.
- Validación sintáctica de las Edge Functions con eliminación experimental de tipos.
- Pruebas del flujo modular y conservación de borradores.
- Pruebas del motor: mediana, cuantiles, extremos, comparables insuficientes e independencia del precio ingresado.
- Pruebas de seguridad: RLS, prohibición de escrituras anónimas directas, control server-side y ausencia de claves privadas.
- Pruebas del CRM y de carga de fotografías.

La revisión visual automatizada quedó pendiente porque el navegador integrado no pudo iniciarse por una restricción de permisos de Windows sobre `C:\Users\yo\AppData`. Esto no afectó las pruebas de código, pero exige una revisión manual de escritorio y móvil antes de producción.

## Pruebas pendientes en entorno conectado

- Usuario anónimo, autenticado, corredor y administrador.
- Primera tasación, reapertura, cambio menor y cambio material.
- Plan activo, vencido, límite agotado y créditos.
- Sin comparables, pocos comparables y valor atípico.
- Recarga, pérdida de conexión, doble envío e idempotencia.
- Manipulación de plan, precio y resultado desde el navegador.
- RLS con dos usuarios distintos y cuenta administrativa.
- Vista móvil real y tecnologías de asistencia.
- Flujo de publicación completo con fotografías.
- Webhook Flow aprobado, rechazado, pendiente y repetido antes de habilitar Premium.

## Riesgos abiertos

- Las migraciones locales todavía no están desplegadas; la exposición remota detectada continúa hasta aplicar y verificar `202607170003`.
- No se obtuvo un volcado completo del esquema remoto por falta de una sesión local de Supabase CLI.
- Las 32 parcelas son precios solicitados; la cobertura será experimental o insuficiente en varias zonas.
- Acceso y topografía faltan en los 32 registros inspeccionados, reduciendo la confianza.
- No hay suficientes ventas finales verificadas para declarar confianza alta.
- Flow no debe otorgar Premium hasta implementar concesión idempotente de beneficios en backend.
- Las distancias del MVP son en línea recta y no equivalen a tiempo ni distancia por carretera.

## Criterio de salida a producción

El MVP puede pasar a piloto cuando el esquema remoto coincida con lo esperado, las políticas RLS se prueben con usuarios separados, la función anónima respete límites, el flujo de publicación complete un envío real y el resultado insuficiente no bloquee la publicación. Premium y PDF deben permanecer desactivados hasta validar pagos, permisos y contenido del informe.
