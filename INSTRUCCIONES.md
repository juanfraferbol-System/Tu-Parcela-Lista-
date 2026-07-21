# CRM TPL — Etapa 2

Esta etapa completa el ciclo de vida administrativo de una publicación sin cambiar la compatibilidad del catálogo actual.

## Estados

- `aprobada`: publicación visible en el catálogo; en el CRM se muestra como **Publicada**.
- `pausada`: retirada temporalmente del catálogo.
- `vendida`: cerrada por venta y retirada del catálogo.
- `archivada`: conservada únicamente como historial administrativo.

## Acciones nuevas

- Publicada → Pausar.
- Publicada → Marcar como vendida.
- Pausada → Reactivar.
- Pausada → Marcar como vendida.
- Pausada, vendida o rechazada → Archivar.

Todas las acciones exigen motivo, confirmación administrativa y generan historial, versión y notificación en cola.

## Instalación

Descomprime este paquete sobre la raíz del proyecto y acepta reemplazar `CRM.html` y `js/crm-admin.js`.

Ejecuta las migraciones en orden:

```bash
npx supabase@latest db push
```

Luego publica los archivos web:

```bash
git add CRM.html js/crm-admin.js supabase/migrations/202607200004_estados_ciclo_vida_publicaciones.sql supabase/migrations/202607200005_crm_ciclo_vida_publicaciones.sql
git commit -m "Completar ciclo de vida de publicaciones en CRM"
git push origin main
```

No es necesario volver a desplegar una Edge Function en esta etapa.

## Verificación

1. Abre una publicación aprobada/publicada.
2. Prueba **Pausar publicación**.
3. Confirma que desaparece del catálogo público.
4. Prueba **Reactivar publicación**.
5. Confirma que vuelve a aparecer.
6. Marca una publicación de prueba como vendida.
7. Revisa que cada acción aparezca en el historial.

## Nota sobre los CRM existentes

`CRM.html` queda como panel oficial de moderación y ciclo de vida de publicaciones. No se redirigió todavía `plataforma/crm/`, porque contiene además clientes, cotizaciones y contratistas. Esa consolidación debe hacerse en una etapa posterior para no ocultar funciones operativas.
