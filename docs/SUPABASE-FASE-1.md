# Supabase Fase 1 — asistente `plataforma/publicar-parcela`

Esta fase conecta exclusivamente el asistente nuevo. No modifica el catálogo público, `app.js`, `CRM.html` ni `admin-publicaciones.html`. Si no existe configuración válida, el módulo conserva `mock-local-v1` únicamente en localhost, `file://` o pruebas; en producción falla de forma explícita.

## Archivos creados

- `supabase/config.toml`: configuración del entorno local de Supabase.
- `supabase/migrations/202607130001_crear_publicaciones.sql`: tipos, tablas, índices, timestamps y RPC de envío.
- `supabase/migrations/202607130002_crear_storage_publicaciones.sql`: bucket privado.
- `supabase/migrations/202607130003_crear_politicas_rls.sql`: RLS cerrado y permisos mínimos para la RPC servidor.
- `supabase/migrations/202607130004_ampliar_fotografias_publicaciones.sql`: amplía la RPC y el bucket a 12 fotografías y 20 MB finales sin modificar las migraciones aplicadas.
- `supabase/functions/publicar-parcela/index.ts`: endpoint único de creación, carga y asociación.
- `supabase/functions/publicar-parcela/upload-logic.mjs`: inspección y recuperación testable de objetos faltantes.
- `supabase/functions/publicar-parcela/upload-logic-tests.mjs`: pruebas de carga parcial, reintento y respuesta incompleta de Storage.
- `js/supabase-client.js`: lectura y validación de configuración pública y creación reutilizable del cliente.
- `plataforma/publicar-parcela/submission-service-tests.mjs`: pruebas del adaptador.
- `plataforma/publicar-parcela/photo-optimizer.js`: conversión local, orientación, dimensiones y eliminación de metadatos mediante canvas.
- `plataforma/publicar-parcela/photo-optimizer-tests.mjs`: pruebas de formatos, dimensiones, originales grandes y errores de optimización.
- `plataforma/publicar-parcela/photo-geolocation.js`: validación de enlaces y lectura local opcional de GPS EXIF en JPEG.
- `plataforma/publicar-parcela/photo-geolocation-tests.mjs`: pruebas de enlace válido, inválido, vacío, GPS rechazado e inexistente.
- `.env.example`: nombres de variables sin credenciales.

## Archivos modificados

- `plataforma/publicar-parcela/submission-service.js`: Supabase, fallback local, checkpoints y reintentos idempotentes.
- `plataforma/publicar-parcela/publicar-parcela.js`: entrega los archivos reales al adaptador y conserva checkpoints en el borrador local.
- `plataforma/publicar-parcela/index.html`: carga `supabase-js` v2 desde CDN antes del módulo.
- `plataforma/publicar-parcela/package.json`: ejecuta las pruebas originales y las nuevas.

## Tablas

| Tabla | Esquema principal | Restricciones relevantes |
|---|---|---|
| `publicaciones` | `id`, `codigo_publico`, `idempotency_key`, `estado`, `tipo_publicador`; contacto; título/descripción; precio/superficie; región/comuna/sector; ubicación aproximada; latitud/longitud privadas; atributos, plan y JSONB; fechas | PK UUID; código único y formato `TPL-PUB-AÑO-NNNNNN`; `publicaciones_idempotency_key_unique`; enums de estado/publicador; coordenadas válidas |
| `publicacion_borradores` | `id`, `publicacion_id`, `idempotency_key`, `codigo_local`, `version`, `datos`, fechas | PK UUID; FK a publicación; idempotencia única; versión positiva |
| `publicacion_fotos` | `id`, `publicacion_id`, `bucket_id`, `storage_path`, `nombre_original` neutral, `mime_type`, `tamano_bytes`, `contenido_sha256`, `orden`, `es_portada`, fecha | PK/FK; `publicacion_fotos_publicacion_path_unique`; `publicacion_fotos_publicacion_orden_unique`; tres MIME; SHA-256 hexadecimal; carpeta igual a publicación |
| `moderacion_registros` | `id`, `publicacion_id`, estados anterior/nuevo, motivo, responsable, evidencia JSONB, fecha | PK/FK; estados controlados |

### `publicaciones`

Registro principal con UUID interno, código público generado por PostgreSQL, estado controlado, tipo de publicador, contacto privado, contenido público, relato privado, precio, superficie, atributos de la propiedad, ubicación pública aproximada, coordenadas privadas, plan, modelo comercial y respaldo JSONB del formulario.

Los valores internos de tipo de publicador son `dueno` y `corredor`; `dueno` representa “dueño” sin caracteres especiales para mantener compatibilidad con el formulario actual.

### `publicacion_borradores`

Estructura versionada para una fase posterior de sincronización de borradores. En esta fase el borrador operativo continúa en `localStorage` para permitir fallback y recuperación. Solo conserva un UUID público de idempotencia; no contiene secretos de autorización.

### `publicacion_fotos`

Relaciona una publicación con rutas del bucket privado. Guarda nombre generado, MIME, tamaño, hash SHA-256, orden y portada. No contiene URLs públicas. Un `CHECK` exige que la primera carpeta de `storage_path` sea exactamente el UUID de `publicacion_id`. `UNIQUE (publicacion_id, orden)` impide órdenes repetidos. El manifiesto queda reservado en la misma transacción que crea la publicación.

### `moderacion_registros`

Preparada para auditoría futura de cambios de estado. No tiene acceso desde el navegador en esta fase.

## Bucket y límites

`publicaciones-pendientes` es privado. Los límites se aplican tanto en navegador como en Edge Function y base:

- mínimo 1 y máximo 12 fotografías;
- originales de hasta 20 MB por archivo como límite de seguridad del navegador;
- optimización automática cuando superan 1,5 MB o 2.000 px en su lado mayor;
- máximo final de 2.000 px en el lado mayor y objetivo aproximado de 1,5 MB por imagen;
- máximo 20 MB entre todos los archivos optimizados;
- solo `image/jpeg`, `image/png` y `image/webp`;
- nombre de Storage generado por servidor, nunca tomado de `File.name`.

No existe ninguna política anónima sobre `storage.objects`, ni siquiera `INSERT`. La publishable/anon key no puede subir, listar, descargar, reemplazar o borrar objetos. Toda escritura se realiza dentro de la Edge Function con la credencial secreta de su runtime.

El total final enviado se limita a 20 MB. El navegador convierte las imágenes mediante canvas, conserva su proporción y orientación visible, y genera un archivo nuevo sin EXIF ni coordenadas GPS. Si la conversión falla, el archivo original no se envía silenciosamente. El bucket permite hasta 20 MB por objeto para no conservar el antiguo límite individual, aunque el objetivo normal del optimizador es aproximadamente 1,5 MB por fotografía.

## Geolocalización opcional

El formulario acepta un enlace manual de Google Maps y ofrece, de manera opcional, buscar coordenadas GPS en los originales JPEG antes de convertirlos. La autorización no es obligatoria. El análisis ocurre localmente; después, canvas genera las imágenes optimizadas sin EXIF ni GPS.

Si el enlace está vacío o no pertenece a Google Maps y no se obtuvo GPS autorizado, el formulario guarda `ubicacion_no_informada: true` dentro de `datos_formulario`. Este estado no bloquea el envío. La persona puede enfocar el campo manual, abrir instrucciones accesibles o continuar sin ubicación. Un enlace válido oculta automáticamente la advertencia y cambia el estado a `false`.

Cuando existen coordenadas extraídas, se envían como `latitudPrivada` y `longitudPrivada`. La RPC las guarda exclusivamente en `latitud_privada` y `longitud_privada`, protegidas por RLS. La ubicación pública continúa construyéndose solo con sector, comuna y región; nunca se inventan coordenadas desde el paisaje o la comuna y nunca se muestra el punto exacto.

## Políticas y privacidad

- RLS está activo en las cuatro tablas desde la primera migración.
- `anon` y `authenticated` no reciben privilegios directos sobre ninguna de las cuatro tablas.
- No existe ninguna política RLS para esos roles: el resultado por defecto es denegar todas las operaciones.
- El navegador invoca únicamente la Edge Function `publicar-parcela`.
- La función tiene `verify_jwt = false` para admitir las publishable keys actuales, que no son JWT; antes de procesar valida el encabezado `apikey` contra `SUPABASE_PUBLISHABLE_KEYS` o el fallback público `SUPABASE_ANON_KEY` de su runtime.
- La Edge Function llama a `crear_publicacion_pendiente(jsonb, uuid, jsonb)` con una credencial secreta disponible solo en Supabase.
- La RPC devuelve solo UUID interno, código público y fecha; nunca devuelve contacto, relato, coordenadas ni JSONB.
- No pueden insertar, listar, actualizar o borrar publicaciones, borradores, fotos, objetos de Storage o moderaciones.
- No existe ningún token secreto en JavaScript, HTML, Storage web o variables públicas.
- `idempotency_key` es un UUID público: evita duplicados, pero no concede lectura, actualización ni borrado.
- La clave `service_role` se rechaza en el cliente y nunca debe incorporarse al HTML, JavaScript o `.env.example`.

### RPC y `SECURITY DEFINER`

`public.crear_publicacion_pendiente(p_datos jsonb, p_idempotency_key uuid, p_fotos jsonb)` necesita `SECURITY DEFINER` por una razón limitada: debe crear o resolver una publicación idempotente y reservar su manifiesto de fotografías sin conceder `SELECT` o `INSERT` sobre las tablas. La función:

- fija `search_path = pg_catalog`; todas las tablas, tipos y funciones propias se nombran con esquema `public.` explícito;
- valida tipo y tamaño del payload, publicador, nombre y correo;
- valida que el manifiesto tenga entre 1 y 12 entradas únicas, MIME permitido, 20 MB totales, una sola portada, orden, UUID y hash SHA-256;
- fuerza el estado `pendiente_revision`;
- genera UUID y código en PostgreSQL;
- inserta las relaciones de fotografías en esa misma transacción, con rutas y nombres construidos en PostgreSQL;
- ante la misma `idempotency_key`, solo devuelve el UUID/código original si el manifiesto coincide exactamente; si cambió un hash, MIME, tamaño, orden, portada o UUID, rechaza la solicitud;
- compara también la cantidad total de filas, por lo que agregar o quitar una fotografía produce `manifest_conflict`;
- produce `manifest_duplicate_order` cuando el manifiesto inicial repite UUID u orden;
- no devuelve información personal.

Se ejecuta después de `REVOKE ALL ... FROM PUBLIC` y `GRANT EXECUTE` se concede únicamente a `service_role`. `anon` y `authenticated` no pueden invocarla directamente.

La migración 004 renombra la implementación aplicada como `crear_publicacion_pendiente_v1`, revoca su ejecución incluso a `service_role` y publica una nueva envoltura con el nombre original. La envoltura reutiliza la v1 solo internamente para crear los datos principales y agrega el manifiesto ampliado dentro de la misma transacción. Si cualquier inserción o validación falla, PostgreSQL revierte también la publicación base. La Edge Function continúa invocando únicamente el nombre estable `crear_publicacion_pendiente`.

### Permisos efectivos

La tercera migración ejecuta:

- `REVOKE ALL` sobre las cuatro tablas para `anon` y `authenticated`.
- `REVOKE ALL` sobre `storage.objects` para `anon` y `authenticated`.
- ningún `GRANT INSERT`, `SELECT`, `UPDATE` o `DELETE` a roles web;
- `REVOKE ALL ... FROM PUBLIC` sobre triggers, generador de código y RPC;
- `GRANT EXECUTE` de la RPC únicamente a `service_role`.

### `storage.objects`

No hay políticas `INSERT`, `SELECT`, `UPDATE` o `DELETE` para `anon` o `authenticated`.

La pertenencia de la ruta se controla en el proceso servidor:

1. La Edge Function obtiene el UUID desde la RPC, no desde una ruta enviada por el navegador.
2. Calcula SHA-256 del archivo y genera un UUID determinista usando `idempotency_key`, índice y hash del contenido.
3. Construye internamente `<publication.id>/<generated-photo-uuid>.<extension-from-MIME>`.
4. La RPC construye nuevamente esa ruta al reservar el manifiesto; la restricción `publicacion_fotos_ruta_publicacion` comprueba que la carpeta coincide con `publicacion_id`.

El navegador nunca elige `storage_path` ni `nombre_original`. La Edge Function guarda nombres neutrales `foto-1.jpg`, `foto-2.webp`, etc.

### Por qué no se usa RLS anónimo para “propiedad de sesión”

Sin Supabase Auth, todos los navegadores comparten el rol `anon`. Un UUID público o una clave de idempotencia no constituyen identidad ni autorización. Por tanto no existe una condición RLS sólida capaz de distinguir al navegador creador de otro navegador que conozca el UUID. En vez de debilitar RLS, la segunda etapa se eliminó del cliente: una sola Edge Function recibe datos y binarios juntos. Su RPC crea publicación y manifiesto en una transacción; luego la función sube exactamente los archivos cuyos hashes quedaron reservados.

Conocer solamente `idempotency_key` no permite añadir fotos: cualquier reintento con un manifiesto diferente es rechazado por PostgreSQL. Un reintento legítimo conserva la misma clave y vuelve a enviar los mismos binarios; la función recalcula los hashes y reutiliza las rutas deterministas ya reservadas.

La función usa `SUPABASE_SECRET_KEYS` —o la variable legacy proporcionada automáticamente por Supabase— solo dentro del runtime. Esa credencial no se configura en Vercel, `.env.example`, HTML, JavaScript del navegador o `localStorage`. Desactivar `verify_jwt` no abre las tablas ni Storage: la función comprueba la clave pública recibida, aplica CORS y validaciones, mientras RLS y los `REVOKE` siguen negando toda escritura directa con `anon`.

### CORS y orígenes permitidos

La función compara `Origin` antes de leer el formulario. Incluye por defecto:

- `https://parcelalista.cl`;
- `https://www.parcelalista.cl`;
- `http://127.0.0.1:8765`;
- `http://localhost:8765`.

Orígenes adicionales se agregan, separados por coma, en `TPL_ALLOWED_ORIGINS` dentro de la configuración de la Edge Function. No es una credencial. Para producción se debe incluir cada dominio exacto, con protocolo y sin ruta; no se permiten comodines. CORS limita navegadores, pero no sustituye rate limiting, CAPTCHA ni validación de la publishable key.

### Privacidad de logs

La Edge Function no ejecuta `console.log`, `console.info`, `console.warn` ni `console.error`, y nunca registra el multipart o los errores completos del proveedor. Las respuestas contienen códigos controlados, UUID/código público y contadores. El código no registra correo, teléfono, coordenadas privadas, binarios, encabezados de autorización, claves o tokens. Para conservar esta garantía, no debe añadirse logging del `payload`, `FormData`, `request.headers`, objetos `File` ni errores crudos.

## Variables que debes obtener

En el panel de Supabase abre **Project Settings → API** y copia:

- Project URL → `TPL_SUPABASE_URL`
- Publishable key o clave pública `anon` → `TPL_SUPABASE_ANON_KEY`

También necesitarás, solo para vincular la CLI:

- Project ref, visible en la URL o configuración del proyecto.
- Contraseña de la base de datos.

No copies ninguna clave secreta al proyecto web o Vercel. Supabase entrega sus claves servidor automáticamente al runtime de Edge Functions.

El cliente busca configuración en este orden:

1. `window.TPL_SUPABASE_CONFIG = { url, anonKey }`.
2. `window.__TPL_SUPABASE__ = { url, anonKey }`.
3. Variables Vite si se incorpora un build futuro.
4. Variables de entorno en pruebas Node.
5. Metadatos HTML `tpl-supabase-url` y `tpl-supabase-anon-key`.

Como el sitio actual no tiene build, `.env.local` no se expone automáticamente al navegador. En desarrollo puedes inyectar antes de enviar:

```js
window.TPL_SUPABASE_CONFIG = {
  url: 'TU_PROJECT_URL',
  anonKey: 'TU_CLAVE_PUBLICA'
};
```

Para producción conviene generar esa configuración pública durante el despliegue. Solo contiene la URL y la clave pública; las políticas RLS siguen siendo la barrera de seguridad.

## Vincular el proyecto

Desde PowerShell, ubicado en la raíz del repositorio:

```powershell
npx supabase@latest --version
npx supabase@latest login
npx supabase@latest link --project-ref TU_PROJECT_REF
```

El último comando solicitará la contraseña de la base. Estos comandos no aplican migraciones por sí solos.

## Probar las migraciones localmente

Se requiere Docker Desktop activo.

```powershell
npx supabase@latest start
npx supabase@latest db reset --local
npx supabase@latest db lint --local
npx supabase@latest functions serve publicar-parcela
npx supabase@latest status
```

`db reset --local` reconstruye únicamente la base local y aplica, en orden, los archivos de `supabase/migrations`.

## Revisar y aplicar al proyecto remoto

Primero revisar sin aplicar:

```powershell
npx supabase@latest db push --dry-run
```

Solo después de revisar el resultado y contar con autorización explícita:

```powershell
npx supabase@latest db push
npx supabase@latest functions deploy publicar-parcela
```

## Análisis visual para Gold y Platinum

La migración `202607130005_analisis_visual_planes_superiores.sql` conserva los IDs oficiales `inicio`, `profesional`, `gold` y `platinum`. La autorización utiliza exclusivamente la lista estable `['gold', 'platinum']`; nunca depende del nombre, precio, badge ni posición de una tarjeta.

- Inicio y Profesional mantienen descripción manual y no pueden solicitar análisis visual.
- Gold y Platinum muestran el consentimiento opcional y permiten revisar, editar o rechazar sugerencias.
- GPS/EXIF continúa disponible para todos los planes y no forma parte del análisis de OpenAI.
- Se procesan como máximo las primeras 5 fotografías optimizadas, con `detail: "low"`.
- La clave `OPENAI_API_KEY` vive únicamente como secreto de la Edge Function. Nunca se añade al frontend ni a archivos versionados.
- `OPENAI_VISUAL_MODEL` permite fijar el modelo desde el runtime; el valor inicial del código es `gpt-4o-mini` y puede cambiarse sin modificar el navegador.

### Autorización real y contratación pendiente

Seleccionar Gold o Platinum en el navegador **no concede** por sí mismo acceso a OpenAI. La tabla privada `publicacion_ia_entitlements` debe recibir una autorización emitida por servidor mediante `confirmar_plan_analisis_visual(idempotency_key, plan, referencia)`. Esa función solo está concedida a `service_role` y debe ser invocada en producción por un webhook de pago verificado o por una acción administrativa autenticada.

Mientras no exista pago ni validación administrativa:

1. Se guarda el plan seleccionado, la inclusión comercial, el consentimiento y hasta 5 hashes.
2. El análisis queda en `pendiente_autorizacion` o `pending_plan_confirmation`.
3. No se llama a OpenAI y no se generan sugerencias simuladas.

Para activar el control de producción todavía falta conectar un proveedor de pagos o un panel administrativo autenticado que confirme la contratación y emita el entitlement. La publishable/anon key no tiene permisos sobre las tablas, las funciones de autorización ni Storage.

### Control de costos e idempotencia

`publicacion_analisis_visual` conserva plan contratado, consentimiento, fecha, modelo, hashes, hash del conjunto, uso y sugerencias aceptadas. La combinación `(publicacion_id, conjunto_hash)` es única. Un resultado completado se reutiliza cuando los hashes no cambian. Si cambia el conjunto después de usar el análisis inicial, `preparar_analisis_visual` rechaza la operación con `VISUAL_REANALYSIS_REQUIRES_ADMIN`, salvo que el servidor haya habilitado una única reejecución administrativa.

La Edge Function descarga los objetos privados con su cliente servidor y envía imágenes como datos internos a la Responses API. No crea URLs públicas. No registra fotografías, correos, teléfonos, coordenadas, claves ni contenido de respuestas en logs.

### Pruebas sin consumo de OpenAI

`visual-analysis-tests.mjs` utiliza un `fetch` simulado. Comprueba los cuatro IDs, el entitlement de Gold/Platinum, el máximo de 5 fotografías, `detail: "low"`, la revisión de sugerencias y los permisos SQL. No realiza solicitudes a OpenAI ni crea publicaciones reales.

`db push` aplica las tres migraciones y `functions deploy` publica el endpoint. Ninguno de estos comandos fue ejecutado durante esta fase.

## Ejecutar las pruebas del módulo

```powershell
Set-Location plataforma\publicar-parcela
npm.cmd test
npm.cmd run preview
```

Abrir `http://127.0.0.1:8765/plataforma/publicar-parcela/`.

Las pruebas cubren envío local/remoto simulado, ausencia de configuración y archivos, doble clic, creación fallida, JPG/PNG/WebP, originales grandes, orientación vertical y horizontal, una foto de 20 MB, dos fotos de 10 MB, doce fotos, trece fotos, total final exacto y superior a 20 MB, fallo de optimización, reintento idéntico, conflicto por fotografía distinta, portada, orden, fallo después de cargas parciales, omisión de objetos existentes y respuesta incompleta de Storage.

En localhost o `file://`, sin configuración, el resultado indica `Local · solo desarrollo` y transporte `mock-local-v1`. Fuera de desarrollo, la ausencia de configuración produce un error y no activa el respaldo local. Con un cliente configurado, el navegador envía un único `FormData` a la Edge Function y guarda un checkpoint en `tpl_publicar_parcela_draft_v10` antes de invocarla.

## Reintentos

Antes de invocar la Edge Function, el navegador guarda solamente el UUID público `idempotencyKey` junto al borrador local. Después de una respuesta completa agrega UUID interno y código público devueltos por el servidor. No guarda rutas, nombres de Storage, URLs firmadas ni credenciales.

La restricción nombrada `publicaciones_idempotency_key_unique UNIQUE (idempotency_key)` vive en PostgreSQL. Si la conexión se corta después del `INSERT`, el reintento envía la misma clave; la RPC devuelve el UUID/código ya existentes únicamente si coincide el manifiesto inmutable. No vuelve a insertar publicación ni relaciones.

Antes de cargar, la función lista una vez la carpeta privada de esa publicación. Compara los nombres deterministas reservados, omite los objetos existentes y carga únicamente los faltantes. Si una solicitud falló después de algunas fotos, el siguiente intento continúa desde la primera ausente. Una respuesta de Storage sin `data` ni `error`, o sin `path` tras una carga aparentemente exitosa, se rechaza como `storage_partial_response`. Después de recargar se deben volver a seleccionar exactamente los mismos binarios porque `localStorage` conserva metadatos, no archivos.

## Revertir la integración

### Solo código, sin migraciones remotas aplicadas

Revertir los archivos de esta fase con Git o retirar manualmente:

- Importación/uso de Supabase en `submission-service.js`.
- Script CDN de `index.html`.
- Migraciones y `js/supabase-client.js`.

El adaptador local `prepareLocalSubmission()` puede quedar como implementación única.

### Base local

Para retirar las cuatro últimas migraciones de la base local sin tocar remoto:

```powershell
npx supabase@latest migration down --local --last 4
```

### Proyecto remoto ya migrado

No uses `db reset --linked`: es destructivo. Crea una migración de reversión hacia adelante:

```powershell
npx supabase@latest migration new revertir_supabase_fase_1
```

La migración debe eliminar primero políticas y RPC, después el bucket cuando esté vacío, y finalmente tablas/tipos en orden inverso. Revisa con:

```powershell
npx supabase@latest db push --dry-run
```

La eliminación remota requiere una autorización separada y un respaldo previo.

## Referencias oficiales

- [Supabase CLI](https://supabase.com/docs/reference/cli/introduction)
- [Desarrollo local con migraciones](https://supabase.com/docs/guides/local-development/overview)
- [Cargas estándar de Storage](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Cargas reanudables](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Variables y secretos de Edge Functions](https://supabase.com/docs/guides/functions/secrets)
- [Autorización de Edge Functions](https://supabase.com/docs/guides/functions/auth)

## Fuera de alcance

- Autenticación.
- Correos y notificaciones.
- Pagos.
- Aprobación administrativa.
- Modificación del catálogo público.
- Limpieza automática de objetos huérfanos.
- CAPTCHA, Turnstile o rate limiting.
- Cargas TUS reanudables.
