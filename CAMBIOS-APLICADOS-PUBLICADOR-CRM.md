# Correcciones aplicadas — Publicador → CRM

Fecha: 20 de julio de 2026

## Archivos modificados

- `supabase/functions/publicar-inmueble/index.ts`
- `plataforma/publicar/integration-service.js`
- `js/crm-admin.js`
- `supabase/migrations/202607200003_publicador_crm_fotos_idempotencia.sql`

## Correcciones

1. La clave de idempotencia ahora se conserva durante los reintentos y el backend la utiliza para impedir publicaciones duplicadas.
2. El tipo de publicador se toma desde `contacto.tipo` y distingue correctamente propietario de corredor.
3. Los planes nuevos del publicador se traducen al nivel compatible del CRM, conservando además el identificador original dentro de `datos_formulario`.
4. Las fotografías se guardan en el bucket privado `publicaciones-pendientes` y se registran en `publicacion_fotos`, que es la fuente utilizada por el CRM.
5. La portada y el orden se respetan según el manifiesto enviado por el publicador.
6. El CRM genera signed URLs temporales usando la información registrada en `publicacion_fotos`.
7. Cuando una carga falla, el backend intenta limpiar archivos, versiones, notificaciones y la publicación incompleta.
8. La ficha administrativa distingue una casa de una parcela y muestra los campos principales de la vivienda.
9. La migración amplía el límite de metadatos de una fotografía hasta 12 MB y agrega índices para idempotencia y tipo de inmueble.

## Pruebas ejecutadas

- `node js/crm-service-tests.mjs`
- `node supabase/crm-security-tests.mjs`
- `node supabase/functions/publicar-parcela/upload-logic-tests.mjs`
- `node supabase/functions/corregir-publicacion/correction-logic-tests.mjs`

Todas finalizaron correctamente.

## Pasos para activar en producción

Desde la raíz del proyecto:

```bash
npx supabase@latest db push
npx supabase@latest functions deploy publicar-inmueble
```

Después sube los cambios a GitHub/Vercel:

```bash
git add supabase/functions/publicar-inmueble/index.ts plataforma/publicar/integration-service.js js/crm-admin.js supabase/migrations/202607200003_publicador_crm_fotos_idempotencia.sql
git commit -m "Corregir ingreso de publicaciones y fotos al CRM"
git push origin main
```

## Prueba manual mínima

1. Publicar una parcela con tres fotos y elegir la segunda como portada.
2. Confirmar que llegue una sola publicación al CRM.
3. Confirmar tipo de publicador y plan.
4. Abrir el detalle y revisar las tres imágenes y la portada.
5. Repetir con una casa y comprobar dormitorios, baños, material y superficies.
