# Plan de Simplificación - Tu Parcela Lista (TPL)

El proyecto actual posee múltiples capas y flujos ambiciosos. Para que pueda ser mantenido por una sola persona (o equipo pequeño), se recomienda seguir estos principios de simplificación:

## 1. Qué conviene mantener
- **Cotizador Unificado**: Mantener la integración actual donde `cotizador.js` gestiona tanto el diseño propio como las parcelas. Genera mucho valor comercial y está centralizado.
- **Formulario "Publicar Parcela" Píldora**: El actual formato de pasos es intuitivo y su integración directa a `publicaciones_parcela` con auto-registro de cliente reduce 100% el trabajo manual.
- **Autenticación Centralizada (Supabase)**: Mantener el uso de Supabase Auth para acceso al CRM; elimina la necesidad de manejar tokens complejos manualmente.

## 2. Qué conviene simplificar
- **Redundancia de Datos JS vs DB**: Eliminar archivos como `parcelas.js` o `casas.js` una vez que la base de datos esté madura. Mientras tanto, utilizarlos solo como un catálogo de Solo Lectura. No intentar sincronizar bidireccionalmente el código JS estático con la DB (causa errores de estado).
- **Notificaciones (Eliminar complejidad de correos manuales)**: En lugar de crear enlaces `mailto:` complejos desde el frontend, simplificar creando una Edge Function o Trigger en Supabase que lea cuando se inserta un "nuevo proyecto" y envíe un email estándar por Resend/SendGrid automáticamente al administrador.

## 3. Qué conviene posponer (Segunda Etapa)
- **Portal de Contratistas y Avances**: Manejar estados de construcción, porcentajes de avance y contratistas requiere perfiles múltiples y mucha carga operativa de administración de la obra.
- **Automatización Publicitaria Avanzada (Ads)**: Crear campañas de Google/Meta Ads automáticamente desde un Edge Function es un proyecto de software separado en sí mismo. Por ahora, solo recolectar la "Solicitud de Difusión" y que un especialista humano lance la campaña.
- **Pasarelas de Pago Complejas**: Integraciones de pago automáticas pueden posponerse si el negocio inicial requiere firma física de reservas o transferencias verificadas humanamente.

## 4. Qué genera más valor comercial (Foco)
- Recepción de **Leads** (Clientes que buscan parcela o cotizan diseño).
- Atracción de **Inventario** (Dueños o Corredores publicando parcelas).
- Velocidad de respuesta (Panel Pendientes Operativos).

## 5. Qué genera más trabajo operativo (A evitar)
- Actualizar precios uno por uno en archivos `.js`. (Solución: Interfaz de admin simple en CRM o usar hojas de cálculo de Supabase directamente).
- Revisar datos falsos o de prueba. (Solución: Implementar RLS estricto y borrar datos de test).
