# Pruebas manuales v10

## Dueño particular

1. Completar relato, datos y fotografías.
2. Elegir dueño, completar contacto y aceptar Servicio Partner.
3. Confirmar que el paso 6 genera título y descripción sin copiar el relato privado.
4. Llegar a la ficha final y comprobar precio con 2 %, modelo Partner y ausencia de datos privados.

## Corredores

1. Probar corredor independiente dejando vacía la corredora, pero completando representante, correo y teléfono o WhatsApp.
2. Repetir con nombre de corredora, experiencia, sitio, red social, logotipo y presentación.
3. Seleccionar sucesivamente Inicio, Profesional, Gold y Platinum; recargar el borrador y comprobar que la elección persiste.
4. Confirmar precios Gratis, $47.000, $78.900 y $120.000, con límites de 1, 5, 10 y 20 publicaciones.
5. Revisar la tabla en escritorio y su desplazamiento horizontal en móvil.
6. Abrir “Ver detalle completo de los planes” y comprobar que las listas extensas no aparecen en la vista principal.
7. Intentar avanzar sin aceptar el Compromiso de calidad TPL; debe enfocar la aceptación y bloquear solo al corredor.
8. Aceptar y guardar; verificar `qualityAcceptance.accepted`, `version` y `acceptedAt` en el borrador v10.
9. Revisar perfil profesional, cinco categorías, estrellas, nivel TPL, respuesta y comentarios en móvil y escritorio.
10. Cambiar entre los cuatro planes y confirmar que puntuación, comentarios y nivel TPL no cambian.
5. Verificar contacto directo y datos profesionales en la ficha final.

## Generación y enriquecimiento

1. Editar título y descripción. Al regenerar, ambos deben solicitar confirmación.
2. Rechazar información complementaria y comprobar que no aparece en la ficha.
3. Aceptarla y repetir; debe mostrarse en un bloque separado.
4. Confirmar que el mock no atribuye agua, luz, rol o acceso por información comunal.

## Publicación

El paso 7 contiene la ficha real, contacto responsable, Editar publicación y Publicar. Publicar guarda el borrador v10 y no envía correos, datos remotos ni cobros.

## Envío local

1. Intentar publicar con un campo obligatorio vacío y confirmar que el flujo vuelve al campo exacto con un mensaje específico.
2. Como dueño, publicar y comprobar estado “En revisión”, correo del dueño, código temporal y texto de coordinación comercial TPL.
3. Como corredor, publicar y comprobar correo profesional y texto de asociación a su página profesional.
4. Pulsar Publicar repetidamente durante “Enviando publicación…”; debe crearse un solo código y una sola fecha de envío.
5. Recargar la página y comprobar que reaparece la confirmación con el mismo código.
6. Pulsar “Ver publicación preparada”; debe mostrar nuevamente el paso 7 con Publicar deshabilitado.
7. Confirmar que el texto solo promete el correo cuando la publicación sea aprobada y la integración esté activa.

## Contacto y visitas en la ficha

1. Como dueño, comprobar que aparecen “Hablar por WhatsApp con TPL”, “Agendar visita” y la tarjeta “Asesor responsable de esta publicación”. No debe aparecer el nombre, correo ni teléfono del propietario.
2. Como corredor, comprobar que WhatsApp usa el número del corredor y que la tarjeta indica “Corredor responsable”.
3. Confirmar que el mensaje contiene el `titulo_publico` entre comillas.
4. Abrir Agendar visita, validar campos obligatorios, enviar y comprobar `solicitudes_visita` en el borrador local.
5. Confirmar que cada solicitud guarda el tipo, identificador y nombre del responsable correspondiente.
6. Con una portada, revisar un máximo de cuatro badges en escritorio y tres en móvil; nunca debe aparecer información privada ni Valor de Oportunidad.
