# Partner TPL · Etapa 4

Esta entrega consolida las etapas anteriores y agrega conciliación segura de pagos Flow.

## Recorrido funcional

1. El profesional describe su talento, actividades, etapas y formas de pago.
2. Se crea la postulación y se cargan sus imágenes.
3. Si elige un plan pagado, el servidor crea la orden Flow.
4. Flow redirige al checkout.
5. Flow notifica al callback del servidor.
6. El servidor consulta `payment/getStatus` y concilia el resultado en Supabase.
7. El CRM revisa y aprueba la postulación.
8. El Partner entra con el mismo correo a TPL Business.
9. Desde ahí administra landing, currículum y acceso a TPL Studio.

## Pendiente después de esta etapa

- Diseñar la experiencia completa de contratación interna de productos de TPL Studio.
- Agregar correo automático de aprobación y recuperación/creación de cuenta.
- Implementar generación PDF en servidor si se requiere un archivo persistente en Storage.
