# Implementación Supabase V11

## Qué quedó preparado

- El publicador continúa enviando cada publicación a la Edge Function `publicar-parcela`.
- Las nuevas publicaciones quedan en Supabase con estado `pendiente_revision`.
- El catálogo público solo muestra registros con estado `aprobada`.
- `index.html`, el mapa y `parcela.html` leen el distintivo `valor_respaldado_tpl` desde Supabase.
- El catálogo local `parcelas.js` queda como respaldo durante la migración.

## Paso único en New Query

1. Abre Supabase.
2. Entra a **SQL Editor**.
3. Presiona **New query**.
4. Copia todo el archivo:
   `supabase/migrations/202607190001_valor_respaldado_catalogo_publico.sql`
5. Presiona **Run**.

## Publicar una parcela para probar

1. Completa el publicador y elige el menor precio del Tasador.
2. Envía la publicación.
3. En Supabase, revisa `public.publicaciones`: debe aparecer como `pendiente_revision`.
4. Desde el panel administrador apruébala, o para una prueba controlada ejecuta:

```sql
update public.publicaciones
set estado = 'aprobada',
    publicada_en = coalesce(publicada_en, now()),
    actualizado_en = now()
where codigo_publico = 'REEMPLAZAR_POR_CODIGO_TPL';
```

5. Recarga el Index. La parcela debe aparecer automáticamente.
6. Abre su ficha. El distintivo aparecerá tanto en la grilla como en `parcela.html`.

## Verificación rápida

```sql
select codigo_publico, titulo_publico, precio_publicacion,
       valor_respaldado_tpl, precio_recomendado_tpl
from public.publicaciones_publicas
order by actualizado_en desc;
```

## Seguridad

La vista pública no expone datos de contacto, coordenadas exactas ni reglas internas del Tasador.
