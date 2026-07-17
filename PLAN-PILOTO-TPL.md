# Plan piloto comercial — Tu Parcela Lista

Duración recomendada: 7 días. Volumen: 3 a 10 interesados conocidos y 3 publicaciones reales como máximo.

## Preparación

- Aplicar migraciones hasta `202607170002_lanzamiento_comercial.sql`.
- Confirmar administrador activo en `profiles` y acceso al CRM.
- Revisar número de WhatsApp, correo comercial, privacidad, términos y textos de precios referenciales.
- Mantener visible Partners y ocultos el Manager legacy, pagos directos y mensajería automática.

## Casos obligatorios

1. Buscar y filtrar parcelas desde móvil y escritorio.
2. Abrir mapa y ficha de una parcela real.
3. Enviar solicitud de información y comprobar cliente, evento y tarea inmediata.
4. Solicitar visita y comprobar tarea de confirmación.
5. Crear cotización con parcela, casa, tipo constructivo y extra.
6. Guardar/activar, generar PDF y comprobar proyecto en CRM.
7. Recargar durante publicación y cotización para verificar recuperación.
8. Simular desconexión y confirmar mensaje claro, sin doble envío.
9. Registrar contacto, crear tarea y marcarla resuelta desde el panel.
10. Aprobar y rechazar una publicación de prueba.

## Registro de resultados

Para cada caso anotar: fecha, dispositivo, responsable, resultado, captura, ID del cliente/proyecto, error y acción correctiva. No usar datos personales reales en capturas compartidas.

## Éxito

- 100% de consultas, visitas y activaciones aparecen en CRM.
- Ningún doble envío.
- Eventos sin PII en DebugView.
- Tareas automáticas creadas con vencimientos correctos.
- Respuesta administrativa menor a 24 horas.
- Cero errores críticos abiertos.

## Salida o reversa

Avanzar a lanzamiento público solo con siete días sin pérdida de leads. Si falla persistencia, autenticación, RLS o recuperación, detener tráfico, mantener el sitio informativo y usar contacto manual hasta corregir y repetir el piloto.
