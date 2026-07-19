# Publicador inteligente v2

Esta versión elimina la etapa de descripción escrita o grabada.

El usuario completa características concretas y el sistema genera automáticamente:
- título comercial;
- descripción de venta;
- atributos destacados;
- vista previa del anuncio.

## Instalación
Reemplazar la carpeta actual `plataforma/publicar/` por esta carpeta `publicar/`.
No ejecutar todavía migraciones ni funciones de Supabase.

## Actualización: optimización profesional de fotografías

El publicador ahora incluye `photo-optimizer.js` y procesa las imágenes en el navegador antes de enviarlas:

- máximo de 12 fotografías;
- máximo de 25 MB por original;
- conversión automática a WebP;
- miniatura de hasta 480 px;
- versión mediana de hasta 1000 px;
- versión grande de hasta 2000 px;
- corrección de orientación mediante el decodificador del navegador;
- eliminación práctica de metadatos al redibujar en canvas;
- selección y cambio de portada;
- reordenamiento mediante arrastrar y soltar;
- indicador de progreso y resumen de reducción de peso.

### Integración de medios

Para subir las tres variantes a Supabase Storage, inyecta antes de `integration-service.js`:

```js
window.TPL_PUBLICADOR_CONFIG = {
  submissionEndpoint: '/api/publicaciones',
  mediaUploadEndpoint: '/api/publicaciones/media',
  flowCreatePaymentEndpoint: '/api/flow/create-payment'
};
```

`mediaUploadEndpoint` recibe `multipart/form-data` con:

- `publicationCode`;
- `manifest`, en JSON;
- archivos `photo_0_thumb`, `photo_0_medium`, `photo_0_large`, etc.

El servidor debe subirlos a Storage y responder con las URLs finales. Las credenciales privadas de Supabase y Flow deben permanecer exclusivamente en el servidor.

## Actualización: CRM local-first y motor de automatizaciones

Se agregó `crm-automation-engine.js`. Al completar una publicación el navegador crea, incluso antes de conectar el backend:

- ficha única del propietario;
- expediente permanente de la propiedad;
- versión inicial del anuncio;
- estado `borrador_local` o `pendiente_revision`;
- bitácora de eventos;
- cola de automatizaciones pendientes;
- tareas iniciales de tasación, asignación comercial, aviso administrativo y seguimiento.

Claves locales usadas durante desarrollo:

- `tpl_crm_propietarios_v1`
- `tpl_crm_propiedades_v1`
- `tpl_crm_eventos_v1`
- `tpl_automation_queue_v1`

API disponible en el navegador:

```js
TPLCRM.listDashboard();
TPLCRM.updateStatus(propertyId, 'aprobada', 'revision_admin');
TPLCRM.emit('VISITA_AGENDADA', { propertyId });
```

Esta persistencia es un respaldo de desarrollo. En producción, los mismos objetos y eventos deben enviarse a Supabase mediante endpoints seguros y políticas RLS.

## CRM del Tasador TPL

Esta versión incorpora `valuation-crm-service.js` y `crm-tasador.html`.

- Cada clic en el Tasador crea una sesión comercial antes de mostrar el resultado.
- Se guardan precio esperado, precio recomendado, diferencia, comuna, superficie, documentación, decisión, abandono y publicación final.
- El registro continúa existiendo aunque la persona cierre la página o no termine de publicar.
- El panel `crm-tasador.html` muestra indicadores, gráficos por estado/comuna, tabla y exportación CSV.
- En modo de prueba los datos se almacenan en `localStorage`.
- Para producción, configurar `window.TPL_PUBLICADOR_CONFIG.valuationCrmEndpoint` y procesar las acciones `upsert_valuation` y `valuation_event` en el backend/Supabase.
- La interfaz pública no revela valor base por m², porcentajes ni fórmula interna del Tasador TPL.
