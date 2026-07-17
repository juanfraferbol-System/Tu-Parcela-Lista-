# Publicar parcela — asistente de publicación

Módulo de seis etapas con borrador local, preparación comercial, optimización de fotografías, ubicación privada opcional y envío mediante el adaptador configurado.

## Recorrido

1. Descripción privada por texto o dictado.
2. Datos detectados, corrección de faltantes y ubicación opcional.
3. Tipo de publicador, contacto, Servicio Partner o plan de corredor.
4. Nivel de promoción y autorización comercial.
5. Fotografías, portada, orden, optimización y GPS opcional.
6. Vista previa real y envío de la publicación.

La preparación automática de título y descripción se genera desde la descripción inicial y no cuenta como una etapa adicional.

## Contenido público y privado

- `descripcion_origen`: privada; nunca aparece en título, descripción, enriquecimiento ni ficha final.
- `titulo_publico`: automático, factual, editable y limitado a aproximadamente 70 caracteres.
- `descripcion_publica`: comercial, editable y generada solo desde datos confirmados.
- Las regeneraciones solicitan confirmación cuando existe una edición manual.
- `content-generator.js` mantiene el contrato local que podrá sustituirse por una IA remota.

## Enriquecimiento

`enrichment-service.js` es un adaptador mock. No consulta sitios externos. Sus sugerencias se mantienen separadas y solo aparecen en la ficha después de ser aceptadas o editadas. Conserva estructura para fuentes, fecha, rutas, servicios, atractivos y confianza.

## Publicadores y planes

- Dueño: contacto personal y Servicio Partner TPL.
- Corredor: identidad profesional, contacto, WhatsApp, experiencia, presencia digital, logotipo y presentación.
- Los planes Inicio, Profesional, Gold y Platinum viven en `plans-config.js`. La vista principal muestra una selección compacta y una matriz responsive; los beneficios extensos permanecen dentro de “Ver detalle completo de los planes”.
- Precios configurados: Gratis, $47.000, $78.900 y $120.000. Límites: 1, 5, 10 y 20 publicaciones activas.
- La configuración acepta nuevos elementos, por lo que un futuro Plan Partner por invitación puede añadirse sin rediseñar la interfaz. No está visible ni implementado ahora.

## Calidad y reputación

- Los corredores deben aceptar el Compromiso de calidad TPL. El borrador guarda aceptación, versión y fecha.
- `reputation-config.js` centraliza cinco categorías de valoración, niveles TPL, tiempos de respuesta y estados de moderación para corredores y publicaciones.
- La vista de perfil usa datos demostrativos claramente identificados. No afirma tiempos reales ni aplica bloqueos.
- La reputación es independiente del plan: pagar aumenta capacidad o herramientas, nunca puntuación, nivel TPL ni comentarios.
- Los futuros registros de moderación contemplan motivo, fecha, responsable, evidencia y revisión o apelación.

## Contacto en la ficha final

- Corredor: WhatsApp y solicitudes de visita se dirigen al corredor o corredora responsable.
- Dueño: nunca se publican sus datos directos; WhatsApp y visitas se asignan al asesor TPL configurado en `responsible-config.js`.
- `preview-model.js` construye el responsable, el mensaje de WhatsApp, los badges y las solicitudes simuladas.
- Las solicitudes de visita se conservan localmente en `solicitudes_visita`; no se envían a servicios externos.
- La portada muestra hasta cuatro badges. En móvil, CSS oculta el cuarto y mantiene un máximo visible de tres.

## Envío local y confirmación

- `submission-service.js` selecciona claramente entre `Supabase Edge Function` y `Local · solo desarrollo`. La integración remota envía datos y archivos en una sola solicitud; la función reserva en una única RPC la publicación y un manifiesto inmutable de fotografías antes de subirlas. No existen escrituras anónimas directas ni secretos en el navegador.
- Publicar valida todos los campos obligatorios del recorrido, bloquea dobles envíos y genera un código `TPL-PUB-AÑO-NNNNNN`.
- El borrador queda marcado con `estado: pendiente_revision`, fecha, correo, tipo de publicador, modelo comercial, título y descripción pública.
- El correo no se considera enviado: la confirmación explica que la notificación llegará cuando la publicación sea aprobada y la integración esté activa.
- Al recargar un borrador enviado, se recupera la pantalla final sin generar un segundo código.

## Borrador v10

Se guarda en `tpl_publicar_parcela_draft_v10` y migra desde v9. Conserva título, descripción privada y pública, ediciones manuales, datos confirmados, metadatos de fotografías, publicador, datos profesionales, plan, modelo, enriquecimiento revisado, aceptación versionada de calidad, responsable publicable, solicitudes locales de visita y estado de envío. Los archivos binarios deben seleccionarse nuevamente tras recargar; no se guarda audio.

## Vista previa

Ejecutar `npm.cmd run preview` y abrir `http://127.0.0.1:8765/plataforma/publicar-parcela/`.
