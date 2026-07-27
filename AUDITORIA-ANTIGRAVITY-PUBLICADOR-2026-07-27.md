# Auditoría de mejoras Antigravity — Publicador TPL

Fecha: 27 de julio de 2026
Alcance: `plataforma/publicar`

## Diagnóstico principal: regiones y comunas

El catálogo `tpl-national-catalog.mjs` sí contiene 16 regiones y 346 comunas. Sin embargo, el publicador mostraba solo Ñuble, Biobío, La Araucanía, Los Ríos y Los Lagos porque `app.js` caía al objeto `REGIONS_FALLBACK`, que contiene únicamente esas cinco regiones.

Se detectaron dos causas simultáneas:

1. `index.html` no cargaba `tpl-national-catalog.mjs`.
2. `getRegionsMap()` esperaba `region.comunas`, pero el catálogo real separa los datos en `regions[]` y `communes[]`, relacionándolos mediante `region.code` y `commune.reg`.

### Corrección aplicada

- `app.js` importa dinámicamente `tpl-national-catalog.mjs`.
- Se construye el mapa completo relacionando los códigos regionales con las 346 comunas.
- Se mantiene el fallback de cinco regiones únicamente para contingencia si el archivo nacional no está disponible.
- Se ordenan alfabéticamente las comunas.
- Se actualizó la versión de caché de `app.js`.

Resultado esperado: 16 regiones y 346 comunas.

## Mejoras bien implementadas

### 1. Aislamiento del motor de tasación

La capa comercial consume `state.valuation` en modo lectura y no modifica `engine.mjs`, `explanation`, `confidenceIndex` ni `auditTrail`.

Estado: BIEN IMPLEMENTADA.

### 2. CTA comercial dentro de resultados

El botón para solicitar el informe aparece después de los tres escenarios de precio y no reemplaza los botones para usar un precio.

Estado: BIEN IMPLEMENTADA.

### 3. Modal comercial separado

`#tplCommercialModal` es independiente de `#valuationModal`, conserva la tasación y permite volver a los resultados.

Estado: BIEN IMPLEMENTADA.

### 4. Captura mínima de datos

Nombre, correo y teléfono son obligatorios; el objetivo del informe es opcional. Esto reduce fricción.

Estado: BIEN IMPLEMENTADA, con validaciones pendientes.

### 5. Generador modular Print-CSS

`tpl-report-generator.js` genera un informe HTML imprimible y evita modificar el motor matemático.

Estado: FUNCIONAL COMO MVP VISUAL.

### 6. Preservación del flujo del publicador

Cerrar el modal comercial no borra los datos del inmueble ni la tasación.

Estado: BIEN IMPLEMENTADA.

## Mejoras parcialmente implementadas

### 1. Catálogo territorial nacional

El archivo nacional existe y contiene cobertura completa, pero nunca fue conectado correctamente al formulario.

Estado anterior: INCOMPLETA.
Estado después de esta corrección: IMPLEMENTADA.

### 2. Registro CRM

El código intenta utilizar `TPLValuationCRM.requestReport()` y tiene fallback local. No se verificó aquí que el registro remoto en Supabase se complete bajo sesión real, RLS y conectividad de producción.

Estado: PARCIAL; requiere prueba end-to-end en Supabase.

### 3. Validación del formulario comercial

Solo comprueba que nombre, correo y teléfono no estén vacíos. El formulario usa `novalidate`, por lo que no se valida realmente el formato del correo ni del teléfono.

Estado: PARCIAL.

### 4. Consentimientos

La documentación hablaba de “4-way consent”, pero la implementación contiene dos consentimientos: uno obligatorio para generar el informe y uno opcional de contacto.

Estado: PARCIAL / DIFERENTE A LO DOCUMENTADO.

### 5. Descarga de PDF

El botón abre el informe y usa `window.print()`. Es válido para un MVP, pero no genera un archivo PDF en servidor, no lo almacena y no lo envía automáticamente por correo.

Estado: MVP FUNCIONAL, NO ENTREGA DIGITAL AUTOMATIZADA.

### 6. Contingencia CRM

Los leads se guardan en `localStorage`, pero no existe una cola robusta que garantice sincronización posterior con Supabase.

Estado: PARCIAL.

## Mejoras mal implementadas o riesgosas

### 1. Afirmación de verificación en línea inexistente

El informe declara que puede verificarse en `parcelalista.cl/verificar`, pero no se encontró una página o servicio de verificación funcional dentro del proyecto revisado.

Riesgo: promesa comercial no respaldada.

### 2. “Hash” no criptográfico

`generateHash()` usa una función numérica simple de JavaScript. No es un hash criptográfico, no prueba integridad y puede colisionar.

Riesgo: no debe presentarse como sello criptográfico, inmutable o auditable.

### 3. Código de informe débil

El código `TPL-INFO-XXXX` se genera con cuatro dígitos aleatorios en el navegador. Puede repetirse y no es una identidad canónica persistida en servidor.

Riesgo: duplicados y falsa trazabilidad.

### 4. Lenguaje comercial superior a la capacidad actual

Se utilizan expresiones como “Informe Oficial”, “código formal”, “certificado”, “presentar a bancos” y “verificable”. Actualmente el producto es un informe referencial generado en cliente mediante impresión del navegador.

Riesgo: expectativa excesiva y posible problema reputacional.

### 5. Datos personales en localStorage

Nombre, correo, teléfono, objetivo y tasación quedan almacenados en el navegador en texto legible.

Riesgo: privacidad y exposición en computadores compartidos.

### 6. Generación simulada

El estado de generación usa un `setTimeout` de 700 ms. No representa cifrado, sellado ni creación de expediente en servidor.

Riesgo: no describirlo como “encriptación” o proceso canónico.

## Prioridad recomendada

### Corregido ahora

- Carga de las 16 regiones.
- Relación correcta con las 346 comunas.
- Cache-busting de `app.js`.

### Antes de cobrar por el informe

1. Cambiar “Oficial/Certificado/Verificable/Inmutable” por “Profesional/Referencial” mientras no exista verificación real.
2. Validar formato de correo y teléfono.
3. Generar identificador UUID en Supabase o Edge Function.
4. Confirmar inserción real en CRM con RLS.
5. No prometer verificación web hasta implementar `/verificar`.
6. Añadir política clara sobre almacenamiento y tratamiento de datos.

### Puede quedar después del primer cliente

- PDF en servidor.
- Envío automático por correo.
- Código QR.
- Firma electrónica.
- Persistencia inmutable.
- Verificación pública.

## Archivos modificados

- `plataforma/publicar/app.js`
- `plataforma/publicar/index.html`

## Archivos revisados sin modificación

- `tpl-national-catalog.mjs`
- `tpl-report-generator.js`
- `valuation-crm-service.js`
- `styles.css`
