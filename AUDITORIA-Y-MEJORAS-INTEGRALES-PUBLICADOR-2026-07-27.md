# Auditoría y mejoras integrales del publicador TPL

Fecha: 27 de julio de 2026

## Correcciones aplicadas

### Catálogo territorial
- Se conserva la conexión corregida con `tpl-national-catalog.mjs`.
- Verificación técnica: 16 regiones y 346 comunas.
- El respaldo de cinco regiones queda solo como contingencia si el catálogo nacional no carga.

### Formulario del Informe TPL
- Validación real de nombre, correo y teléfono.
- Normalización básica de teléfonos chilenos.
- Mensajes de error específicos.
- Bloqueo temporal del botón mientras se registra la solicitud.

### Identificador del informe
- Se reemplazó el código aleatorio de cuatro dígitos por una referencia basada en fecha y `crypto.randomUUID()`.
- Se reduce fuertemente el riesgo de códigos repetidos.
- La referencia se presenta como código de solicitud, no como certificación pública.

### CRM y privacidad
- `requestReport()` ahora es asíncrono e informa si el registro remoto fue exitoso.
- Los datos personales del formulario comercial ya no se duplican en `tpl_commercial_leads_v1` dentro de `localStorage`.
- El respaldo local del CRM conserva solo metadatos mínimos de la solicitud comercial: referencia, objetivo, autorización de contacto y fecha.
- Los datos personales se envían al endpoint CRM únicamente cuando está configurado.
- La interfaz informa si la solicitud quedó registrada remotamente o pendiente de sincronización.

### Lenguaje comercial y legal
Se eliminaron afirmaciones que la implementación actual no podía demostrar:
- “Informe Oficial”.
- “Documento Certificado”.
- “Verificable en línea”.
- “Huella digital criptográfica”.
- “Documento inmutable”.
- Presentación garantizada ante bancos.

Se reemplazaron por:
- Informe Profesional TPL.
- Informe referencial.
- Referencia única de solicitud.
- Orientación comercial para apoyar decisiones.

### Informe imprimible
- Se mantuvo el diseño modular de tres páginas.
- Se eliminó el hash no criptográfico.
- Se eliminó la URL inexistente `/verificar`.
- Se aclaró que no reemplaza tasación bancaria, peritaje ni estudio de títulos.
- Se corrigió el llamado a la acción para no prometer servicios legales directos que todavía no estén integrados.
- Se actualizó el número de WhatsApp al utilizado en el proyecto.

## Mejoras de Antigravity que permanecen bien implementadas
- CTA comercial integrado después de la tasación.
- Modal comercial separado del tasador.
- Informe modular de tres páginas.
- Sección explicativa para el propietario.
- Tres estrategias de venta.
- Llamado a la acción comercial.
- Aislamiento del motor matemático y sus artefactos.

## Dependencias externas que no pueden quedar completas solo con archivos frontend

### PDF automático
Actualmente el informe se abre como HTML imprimible y el usuario usa “Guardar como PDF”. Para generar, almacenar y enviar un PDF automáticamente se necesita una Edge Function o servicio backend.

### Envío por correo
Requiere un proveedor de correo y una función segura del servidor. No debe implementarse exponiendo claves en JavaScript público.

### Verificación pública
Para habilitar `/verificar/:codigo` se necesita persistencia canónica en Supabase y una consulta pública controlada. La promesa fue retirada hasta que ese servicio exista.

### Persistencia garantizada del CRM
El frontend queda preparado para registrar la solicitud mediante `valuationCrmEndpoint`. Debe probarse en producción con el endpoint configurado, políticas RLS y una respuesta real del servidor.

## Archivos modificados
- `plataforma/publicar/app.js`
- `plataforma/publicar/index.html`
- `plataforma/publicar/valuation-crm-service.js`
- `plataforma/publicar/tpl-report-generator.js`

## Validaciones realizadas
- `app.js`: sintaxis válida.
- `valuation-crm-service.js`: sintaxis válida.
- `tpl-report-generator.js`: sintaxis válida.
- Catálogo nacional: 16 regiones y 346 comunas.
- Sin referencias activas a verificación inexistente, hash criptográfico falso o informe oficial.
