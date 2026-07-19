# Auditoría TPL: Publicador, CRM, Supabase y móviles

## Resultado ejecutivo

- **CRM → Supabase:** conectado. El CRM inicializa el cliente Supabase y usa RPC protegidas para sesión, métricas, listado, detalle y moderación.
- **Publicador → CRM local:** conectado en modo local mediante `crm-automation-engine.js` y `localStorage`.
- **Publicador → Supabase/CRM real:** preparado, pero **no queda activado únicamente con este ZIP** porque `window.TPL_PUBLICADOR_CONFIG` no está inyectado en `plataforma/publicar/index.html`. Sin `submissionEndpoint`, el envío termina en modo local de prueba.
- **Edge Functions:** existen `publicar-parcela`, `publicar-inmueble`, `corregir-publicacion`, `tasar-parcela` y `resolve-google-maps`. Su presencia en el repositorio no confirma por sí sola que todas estén desplegadas en el proyecto Supabase.
- **Storage y RLS:** existen migraciones y pruebas de seguridad. Debe verificarse en producción que las migraciones estén aplicadas y que el bucket esperado exista.

## Problema crítico corregido

`vercel.json` enviaba `/publicar`, `/publicar/` y `/publicar-parcela.html` a una carpeta inexistente: `/plataforma/publicar-parcela/`. Se corrigió el destino a `/plataforma/publicar/`.

## Mejoras móviles aplicadas

- Nombre premium **“Tu Parcela Lista”** en el espacio central del encabezado móvil.
- Encabezados más compactos y equilibrados en inicio, ficha de parcela y publicador.
- Menores espacios vacíos verticales en secciones principales.
- Formularios del publicador con una columna real en teléfonos pequeños.
- Barra lateral de avance oculta en móvil para aprovechar el ancho.
- Tarjetas, vista previa, planes y botones ajustados a pantallas pequeñas.
- Menú desplegable del publicador reorganizado para evitar desbordes.

## Para completar la conexión real Publicador → Supabase → CRM

1. Definir un endpoint seguro de publicación. La opción recomendada es llamar la Edge Function `publicar-inmueble` o `publicar-parcela` mediante una configuración pública sin secretos.
2. Inyectar antes de `integration-service.js`:

```html
<script>
window.TPL_PUBLICADOR_CONFIG = {
  submissionEndpoint: "ENDPOINT_PUBLICO_SEGURO",
  mediaUploadEndpoint: "ENDPOINT_PUBLICO_SEGURO_DE_FOTOS"
};
</script>
```

3. Probar una publicación real y confirmar:
   - fila creada en Supabase;
   - fotografías en Storage;
   - estado `pendiente_revision`;
   - aparición inmediata en el CRM;
   - detalle y URLs firmadas de fotografías;
   - aprobación/rechazo desde el CRM.

## Prueba de producción recomendada

Usar una propiedad de prueba claramente identificada como `PRUEBA TPL`, publicar desde un teléfono real, revisar el CRM y eliminarla al terminar. No comenzar campañas pagadas hasta completar esta prueba de extremo a extremo.
