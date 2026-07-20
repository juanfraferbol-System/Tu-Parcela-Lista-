# Tu Parcela Lista - Integración y Seguridad del Sistema

Este documento resume los cambios estructurales aplicados para unificar el sitio web con el backend en Supabase, cumpliendo con la meta de automatizar y proteger los procesos administrativos.

## 1. Migración SQL: Row Level Security (RLS)
Archivo: supabase/migrations/202607170001_seguridad_roles.sql`n
Se establecieron políticas estrictas en Supabase para asegurar que solo usuarios autorizados (administradores) puedan leer o manipular datos sensibles en el CRM.
- **Tablas Protegidas**: clientes, proyectos, proyecto_items, cotizaciones, isitas.
- **Excepción Controlada**: Se eliminó la restricción de NOT NULL en usuario_id para la tabla publicaciones_parcela y se creó una política para permitir la inserción pública. Esto permite que el módulo "Publicar Parcela" siga funcionando sin exigir inicio de sesión previo.

## 2. Protección del Panel CRM (Frontend)
Archivo: plataforma/crm/crm.js`n
- Se eliminó el login simulado y ahora se exige autenticación real a través de Supabase Auth (supabase.auth.getSession()).
- Se estableció un control estricto que solo permite acceso a las cuentas dmin@tuparcelalista.cl y contacto@tuparcelalista.cl.
- La información sensible del dashboard ya no se renderiza si el usuario no tiene una sesión autorizada, bloqueando cualquier manipulación del HTML para acceder a los datos.

## 3. Captura Real en "Publicar Parcela"
Archivo: plataforma/publicar-parcela/publicar-parcela.js`n
- Se modificó la lógica para que las publicaciones se inserten de forma real en la tabla publicaciones_parcela a través de Supabase (ya no más en Local Storage u objetos estáticos temporales).
- Se agregó el paso automático para registrar al publicador (ya sea dueño o corredor) en la tabla clientes del CRM en estado 
uevo.

## 4. Captura Real en Cotizador
Archivos: cotizador.js, js/db-api.js`n
- La función piSaveLead fue refactorizada para enviar y persistir datos relacionales al CRM.
- Flujo integrado: Cuando un cliente solicita una cotización y genera el PDF de activación, el sistema ahora:
  1. Busca si el correo/teléfono del cliente existe; si no, crea un nuevo registro en la tabla clientes.
  2. Inserta el proyecto (asociando ID de parcela y casa si aplica) en la tabla proyectos bajo el estado cotizacion_generada.
  3. Procede a redirigir al usuario (WhatsApp o Mailto) una vez los datos están seguros en la base de datos.
