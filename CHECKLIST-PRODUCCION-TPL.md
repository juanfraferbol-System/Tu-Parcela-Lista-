# Checklist de Despliegue a Producción - TPL

Utiliza esta lista antes de realizar cualquier actualización en el sitio en vivo.

## Seguridad
- [ ] La variable `SUPABASE_SERVICE_ROLE_KEY` NO está expuesta en ningún archivo `.js` del frontend.
- [ ] Las políticas de base de datos (RLS) están activas en `clientes`, `proyectos`, y otras tablas críticas.
- [ ] El acceso a la carpeta `plataforma/crm` verifica un token JWT activo en `crm.js`.

## Base de Datos y Storage
- [ ] La base de datos de producción no contiene registros falsos con nombres como "Test", "Prueba" o "Mock".
- [ ] El bucket `fotos_parcelas` en Supabase Storage es público para lectura.

## Formularios y Captura (MVP Crítico)
- [ ] El formulario "Publicar Parcela" sube la imagen exitosamente y finaliza registrando en BD.
- [ ] El formulario de "Cotizar Proyecto" guarda los datos estructurados en la BD antes de abrir el mailto/WhatsApp.
- [ ] La reserva/visita funciona y no muestra confirmaciones falsas si falla la conexión.

## Frontend
- [ ] No existen mensajes por consola tipo `console.log("Mock lead")`.
- [ ] Los enlaces `mailto:` y `wa.me` apuntan a los correos y teléfonos oficiales de venta.
- [ ] Todas las URL apuntan al dominio oficial (`tuparcelalista.cl`) y no a `localhost`.

## Rollback
- [ ] Sé cómo acceder a Vercel para revertir (Promote to Production un commit anterior) en caso de que esta subida rompa la página.
