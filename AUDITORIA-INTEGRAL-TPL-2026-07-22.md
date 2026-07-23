# Auditoría integral Tu Parcela Lista — 22 julio 2026

## Resultado general

Se revisaron 901 archivos del paquete entregado, incluyendo:

- 21 archivos HTML.
- 94 archivos JavaScript/MJS/CJS fuera de `node_modules`.
- 34 migraciones Supabase.
- configuración de Vercel, Netlify y variables de entorno.
- rutas internas, referencias de recursos y scripts de seguimiento.

## Correcciones aplicadas

### 1. Migración de negociación y Partners

Archivo corregido:

`supabase/migrations/202607220006_negociacion_mejoras_oportunidades_partner.sql`

Cambios:

- se eliminó completamente el modelo antiguo `public.parcelas`;
- todas las relaciones usan `public.publicaciones`;
- se eliminaron duplicaciones de `publicacion_id`;
- se reemplazó `parcela_id` por `publicacion_id`;
- se corrigieron los índices;
- se añadió `NOT NULL` donde la relación es obligatoria;
- se añadieron validaciones para precios, plazos y modalidad de negociación;
- se estandarizaron las políticas RLS con `public.es_administrador_activo()`;
- las políticas ahora son idempotentes mediante `drop policy if exists`;
- se añadieron permisos explícitos para usuarios autenticados, manteniendo RLS como control efectivo;
- se envolvió la migración en una transacción.

### 2. Seguimiento de Google Ads incompleto

Se eliminaron de 14 HTML los bloques con el identificador ficticio:

`AW-TU_ID_DE_GOOGLE_ADS`

Ese código no debía quedar en producción porque generaba solicitudes de seguimiento inválidas. Google Tag Manager se conserva. Cuando exista una cuenta real de Google Ads, la conversión debe configurarse dentro de GTM o con el ID definitivo.

### 3. Ruta rota en corrección de publicaciones

Se corrigió:

`plataforma/corregir-publicacion/index.html`

Ruta anterior inexistente:

`../publicar-parcela/supabase-config.js`

Ruta corregida:

`../publicar/publicador-config.js`

### 4. Seguridad de archivos locales

Se detectó un archivo `.env.local` con un token OIDC de Vercel. Se eliminó del paquete corregido y se reconstruyó `.gitignore` sin caracteres dañados ni reglas duplicadas.

Acción obligatoria del propietario:

- revocar o regenerar el token/credencial de Vercel que estaba en `.env.local`;
- comprobar que `.env.local` no esté en GitHub mediante:
  `git ls-files .env.local`
- si aparece, retirarlo del seguimiento:
  `git rm --cached .env.local`

La clave anónima de Supabase puede estar en frontend, pero la seguridad depende de RLS. Las claves `service_role`, contraseñas de base de datos y tokens privados nunca deben aparecer en HTML o JavaScript público.

## Pruebas ejecutadas

- `node --check` sobre 94 archivos JavaScript/MJS/CJS: **0 errores de sintaxis**.
- búsqueda de `public.parcelas` y `parcela_id` en la migración 202607220006: **0 referencias restantes**.
- búsqueda de `AW-TU_ID_DE_GOOGLE_ADS` en HTML: **0 referencias restantes**.
- revisión de dependencias SQL declaradas: no se encontraron claves foráneas hacia tablas que no estén creadas por las migraciones del proyecto o por Supabase.

## Hallazgos que requieren el proyecto completo

El ZIP no contiene la carpeta `image/` ni varios CSS antiguos que todavía son referenciados por HTML, por ejemplo:

- `style.css`
- `css/v2-base.css`
- `css/v3-production.css`
- `image/logo-tu-parcela-lista.png`
- favicons y fotografías

No se modificaron esas referencias porque podrían existir en el proyecto real y simplemente no estar incluidas en el paquete de documentación. Para una auditoría visual y de carga 100 % concluyente se necesita el ZIP completo de producción, incluyendo `image/`, todos los CSS y sin `node_modules`.

## Próximo comando

Después de reemplazar los archivos, ejecutar:

```bash
npx supabase db push
```

La CLI debería intentar únicamente:

`202607220006_negociacion_mejoras_oportunidades_partner.sql`

Luego verificar:

```bash
npx supabase migration list
```

La columna Local y Remote debe mostrar `202607220006` en ambos lados.

## Archivos incluidos en este paquete

- `.gitignore`
- `supabase/migrations/202607220006_negociacion_mejoras_oportunidades_partner.sql`
- HTML donde se retiró el código ficticio de Google Ads
- `plataforma/corregir-publicacion/index.html`
- este informe
