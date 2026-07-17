# Manual del Administrador - Tu Parcela Lista

Bienvenido al sistema de administración de **Tu Parcela Lista**. Este manual te guiará en tus tareas diarias para revisar parcelas, gestionar clientes y administrar cotizaciones sin necesidad de conocimientos de programación.

## 1. Cómo entrar al CRM
1. Abre tu navegador y dirígete a la ruta del CRM: `tuparcelalista.cl/plataforma/crm/index.html` (o la ruta en tu dominio actual).
2. Verás una pantalla de inicio de sesión.
3. Ingresa el correo administrador autorizado (`juanfraferbol@gmail.com`) y tu contraseña.
4. Una vez validado por el sistema de seguridad, accederás al panel principal (Dashboard).

## 2. Cómo revisar tus "Pendientes Operativos" (Tu tarea principal)
La filosofía del sistema es trabajar automáticamente. Tú solo intervienes cuando el sistema te avisa. Al entrar al CRM, busca el panel **"Pendientes Operativos"** (próximo a habilitarse en la pantalla inicial).
Allí verás:
- Clientes nuevos sin contactar.
- Publicaciones de parcelas esperando tu aprobación.
- Nuevas cotizaciones generadas.

## 3. Cómo revisar y aprobar una Publicación de Parcela
1. En el CRM, ve a la sección **Propiedades** o revisa tus "Pendientes".
2. Verás una propiedad con el estado `borrador` o `pendiente_revision`.
3. Haz clic en "Ver Detalle" para verificar las fotografías, el precio y la descripción ingresada por el dueño/corredor.
4. Para aprobarla, cambia el estado a `activa` o `aprobada`. (Dependiendo de la fase del CRM, esto lo puedes hacer cambiando el selector de estado y presionando "Guardar").
5. Una vez activa, aparecerá automáticamente en el catálogo público si la base de datos está conectada al catálogo.

## 4. Cómo contactar a un Cliente y registrar una Llamada
1. En el CRM, ve a la sección **Clientes**.
2. Busca a los clientes con estado `nuevo`.
3. Haz clic sobre el cliente para ver su ficha (Teléfono, correo y origen del registro).
4. Llámalo o envíale un correo.
5. Al finalizar, ubica el botón **Registrar Acción/Nota** (o en la Bitácora) y escribe un breve resumen: *"Llamé al cliente, está interesado, pide visita para el viernes"*.
6. Cambia el estado del cliente a `contactado` o `en_negociacion`.

## 5. Cómo gestionar Cotizaciones y Proyectos
1. Ve a la sección **Proyectos**.
2. Cuando alguien usa el cotizador en la web, caerá aquí un proyecto en estado `cotizacion_generada`.
3. Al hacer clic, verás si incluye una parcela específica y la casa elegida, junto con el monto total (Presupuesto Estimado).
4. Desde aquí puedes contactar al cliente, o hacer clic en "Activar Proyecto" si el cliente ya pagó una reserva o firmó contrato. Esto te permitirá asignarlo a un estado de construcción (para la Etapa 2 de la plataforma).

## 6. Resolución de Problemas Comunes
- **Si no puedes iniciar sesión**: Verifica que estés usando el correo de administrador exacto. El sistema bloquea correos no autorizados.
- **Si una parcela no aparece en la web**: Asegúrate de que el estado en la base de datos de esa parcela sea `activo` o `aprobado` y no `borrador`.
- **Si el sistema muestra un mensaje de error**: Toma una captura del mensaje. No te preocupes, el error técnico se registra silenciosamente para el equipo técnico. Refresca la página e intenta de nuevo.
