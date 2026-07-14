# CRM Fase 1: moderación segura

## Arquitectura

`CRM.html` es una interfaz estática sin datos ni credenciales privadas. Solicita un enlace mágico mediante Supabase Auth y solo carga la bandeja cuando `crm_sesion_actual()` confirma que `auth.uid()` pertenece a un registro activo de `public.profiles` con `tipo = 'administrador'`.

La ruta HTML puede descargarse como cualquier archivo de un sitio estático, pero contiene solamente la interfaz vacía. La protección efectiva de datos y acciones está en Auth, RPC, RLS y Storage; conocer la URL del panel no concede acceso.

Las tablas de publicaciones no conceden lectura ni escritura directa a `authenticated` o `anon`. La bandeja, el detalle y las decisiones se exponen mediante RPC `SECURITY DEFINER`, con `search_path = pg_catalog`, nombres de objetos con esquema, `REVOKE` para `PUBLIC/anon` y `GRANT EXECUTE` solo para `authenticated`.

Storage conserva el bucket `publicaciones-pendientes` privado. Existe una única política `SELECT` para usuarios autenticados que además superen `es_administrador_activo()`. El navegador genera signed URLs de 300 segundos. No existen políticas administrativas de `INSERT`, `UPDATE` o `DELETE` sobre `storage.objects`.

## Migraciones nuevas

- `202607130006_preparar_estados_crm.sql`: agrega `requiere_cambios` al enum en una transacción independiente.
- `202607130007_crear_base_crm_moderacion.sql`: crea `profiles`, versiones, accesos de corrección y cola de correo; amplía publicaciones y auditoría; activa RLS y bloquea cambios o borrados del historial.
- `202607130008_crear_rpc_politicas_crm.sql`: agrega comprobación administrativa, bandeja, detalle, moderación, corrección de un solo uso y política de lectura privada de Storage.
- `202607130009_control_admin_planes_ia.sql`: permite que un administrador activo confirme o revoque manualmente el entitlement de IA exclusivamente para publicaciones de corredores con plan solicitado `gold` o `platinum`.

## Confirmación manual de Gold y Platinum

El CRM consulta el plan solicitado guardado en `publicaciones`; el navegador no puede sustituirlo. Para `gold` y `platinum` muestra “Confirmar contratación y activar IA”. La RPC `crm_gestionar_plan_ia` vuelve a comprobar el perfil administrador, el tipo de publicador y el plan antes de llamar internamente a `confirmar_plan_analisis_visual`. La migración retira a `service_role` la ejecución directa de esa función, de modo que la emisión manual solo pueda atravesar la envoltura administrativa.

Inicio y Profesional son rechazados por la base aunque se manipule el frontend. La revocación cambia el entitlement a `revocado`, invalida cualquier análisis pendiente o en proceso y conserva resultados completados como historial. Activación y revocación se registran en `moderacion_registros` y generan una notificación pendiente, sin simular envío.

La activación administrativa no llama OpenAI. `preparar_analisis_visual` solo devuelve fotografías cuando encuentra un entitlement activo, consentimiento y plan elegible. El modelo sigue configurable mediante `OPENAI_VISUAL_MODEL`; `OPENAI_API_KEY` permanece como secreto exclusivo del runtime de la Edge Function.

## Crear el primer administrador

1. En Supabase Dashboard, crea o invita el usuario desde Authentication > Users.
2. Copia su UUID.
3. Ejecuta desde SQL Editor, reemplazando los marcadores:

```sql
insert into public.profiles (id, tipo, activo, nombre)
values ('UUID_DEL_USUARIO', 'administrador', true, 'NOMBRE_ADMINISTRADOR');
```

No existe un trigger que convierta usuarios en administradores automáticamente.

## Configuración de Auth

Agrega a Authentication > URL Configuration:

- Producción: `https://TU_DOMINIO/CRM.html`
- Local: `http://localhost:8765/CRM.html`
- Local alternativo: `http://127.0.0.1:8765/CRM.html`

El navegador utiliza solamente la Project URL y publishable/anon key ya configuradas en `plataforma/publicar-parcela/supabase-config.js`.

## Correcciones

Al solicitar correcciones, la RPC genera 32 bytes aleatorios, devuelve el token una sola vez al administrador y almacena exclusivamente su hash SHA-256. El enlace usa un fragmento `#token=`, que el navegador elimina de la barra antes de llamar a `corregir-publicacion`.

La Edge Function calcula el hash y llama RPC concedidas solo a `service_role`. El token expira en siete días, es de un solo uso y queda revocado si se rechaza la publicación o se genera uno nuevo. El reenvío actualiza la misma fila, incrementa su versión, conserva fotografías y devuelve el estado a `pendiente_revision`.

## Correo pendiente

`notificacion_cola` prepara eventos de recepción, aprobación, correcciones, rechazo y corrección recibida. No existe proveedor configurado y ninguna fila se marca como enviada. Los tokens de corrección no se guardan en el payload de correo ni en logs. Antes de producción debe implementarse un worker servidor que obtenga o rote el acceso y envíe el correo sin registrar el token.

## Comandos pendientes (no ejecutados)

```powershell
supabase link --project-ref xhisituwpwnvqubtcvia
supabase db push
supabase functions deploy corregir-publicacion --no-verify-jwt
```

Antes de desplegar la función, configura `TPL_ALLOWED_ORIGINS` con los orígenes exactos de producción y pruebas. Las credenciales servidor son administradas por el runtime de Supabase; nunca deben copiarse a HTML, JavaScript público, Vercel o `.env` desplegado.

## Pruebas locales

```powershell
node js/crm-service-tests.mjs
node supabase/functions/corregir-publicacion/correction-logic-tests.mjs
node supabase/crm-security-tests.mjs
```

Para una prueba integrada de RLS/RPC se necesita aplicar las migraciones a una instancia Supabase local o remota autorizada. Esta entrega no ejecuta `supabase db push`, despliegues ni decisiones sobre publicaciones reales.
