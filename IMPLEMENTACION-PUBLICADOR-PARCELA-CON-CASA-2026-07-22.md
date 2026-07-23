# Implementación TPL — publicación, parcelas con casa y contratistas

## Cambios aplicados

1. El publicador ahora distingue tres tipos: `parcela`, `parcela_con_casa` y `casa`.
2. `parcela_con_casa` solicita y conserva superficie del terreno y superficie construida.
3. La Edge Function `publicar-inmueble` acepta el nuevo tipo y guarda sus datos normalizados.
4. La vista pública incorpora `tipo_inmueble`, superficies, habitaciones, baños y material.
5. Las parcelas con casa dejan de mezclarse con la grilla principal de terrenos.
6. Se agregó al index una sección independiente “Parcelas con casa”. Se oculta cuando no existen publicaciones aprobadas de ese tipo.
7. Se creó el bucket público `publicaciones-publicas`.
8. Se creó la Edge Function `publicar-fotos-aprobadas`, que al aprobar:
   - valida que quien la invoca sea administrador;
   - copia las fotografías desde el bucket privado;
   - publica sus URLs;
   - actualiza la portada y galería;
   - elimina las copias privadas después del traslado.
9. La aprobación desde el CRM invoca automáticamente la publicación de fotografías.
10. El botón “Nuevo Contratista” ahora permite crear manualmente un contratista en estado pendiente.

## Archivos nuevos

- `supabase/migrations/202607220007_parcelas_con_casa_fotos_publicas.sql`
- `supabase/functions/publicar-fotos-aprobadas/index.ts`

## Despliegue requerido

```bash
npx supabase db push
npx supabase functions deploy publicar-inmueble
npx supabase functions deploy publicar-fotos-aprobadas
```

Después sube los archivos web a Vercel y realiza una prueba completa:

1. Publicar una parcela con casa.
2. Confirmar que queda `pendiente_revision`.
3. Aprobarla en el CRM.
4. Confirmar que las fotos cambiaron al bucket `publicaciones-publicas`.
5. Confirmar que aparece en “Parcelas con casa” y no en la grilla de parcelas vacías.

## Verificaciones realizadas

- `node --check app.js`
- `node --check js/db-api.js`
- `node --check plataforma/publicar/app.js`
- `node --check plataforma/crm/crm.js`

Todas finalizaron sin errores de sintaxis.
