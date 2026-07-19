# Publicador Unificado V2 — instalación

## Archivos nuevos o modificados

Reemplazar:
- `index.html` (solo cambia el botón Publicar a `plataforma/publicar/index.html`)
- `supabase/functions/publicar-inmueble/index.ts`

Agregar o reemplazar la carpeta completa:
- `plataforma/publicar/`
  - `index.html`
  - `styles.css`
  - `app.js`
  - `valuation-data.js`

Agregar:
- `supabase/migrations/202607180002_publicador_unificado_v2.sql`

Mantener también la migración inicial `202607180001_publicador_unificado.sql` si todavía no fue aplicada.

## Activación Supabase

```bash
npx supabase db push
npx supabase functions deploy publicar-inmueble
```

## Prueba recomendada

1. Abrir `/plataforma/publicar/` con Ctrl + F5.
2. Dictar o escribir una descripción con comuna, superficie y precio.
3. Revisar campos autocompletados y ejecutar Tasador TPL.
4. Probar GPS, búsqueda de mapa y clic manual.
5. Subir una fotografía tomada con GPS para probar EXIF (no todas las imágenes conservan estos datos).
6. Elegir plan y enviar una publicación de prueba.

## Notas importantes

- El tasador usa 32 parcelas y 14 casas del catálogo actual resumido en `valuation-data.js`.
- Para casas, la referencia corresponde al catálogo de casas prefabricadas, no al valor de una vivienda urbana terminada.
- La extracción de ubicación desde fotografías depende de que el archivo conserve metadatos EXIF GPS; WhatsApp y muchas redes sociales suelen eliminarlos.
- La ubicación exacta se almacena para gestión interna y el formulario permite indicar que públicamente se muestre solo una referencia aproximada.
