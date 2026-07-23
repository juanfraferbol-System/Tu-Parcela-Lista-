# TPL Business — Fase 0: Infraestructura Caburgua

Fecha: 23 de julio de 2026

## Objetivo

Permitir que la Landing Premium de Caburgua cargue para cualquier visitante,
sin depender de los datos guardados en el navegador del administrador, y
mantener la compatibilidad con el Landing Engine del CRM.

## Cambios

1. Se creó `plataforma/landing/landing-config.js` como registro público y
   reutilizable de landings.
2. Caburgua quedó registrada con el identificador `land-caburgua` y el slug
   `caburgua-premium`.
3. La landing pública carga primero la configuración compartida.
4. `landing.js` conserva los datos locales del CRM como vista previa y usa la
   configuración pública como respaldo para visitantes nuevos.
5. El Landing Engine usa el mismo registro compartido como semilla, evitando
   mantener una segunda copia de la información de Caburgua.
6. Vercel incorpora las rutas:
   - `/caburgua-premium`
   - `/caburgua-premium/`
7. La ficha existente `parcela.html?id=caburgua` no fue modificada.

## Pruebas superadas

- Sintaxis de los JavaScript modificados.
- Validez de `vercel.json`.
- Resolución de Caburgua por identificador y slug.
- Existencia de la imagen hero y las cuatro fotografías de galería.
- Respuesta HTTP 200 de HTML, JavaScript y fotografía principal.
- Render de Caburgua con `localStorage` vacío.
- Compatibilidad con una vista previa guardada por el CRM.
- Render sin excepciones JavaScript en el flujo público simulado.

## Riesgos pendientes

- La reescritura de Vercel debe comprobarse después del despliegue real.
- El formulario todavía no guarda contactos; corresponde a la Fase 2.
- WhatsApp aún no tiene un número configurado.
- La landing continúa con `noindex`; corresponde a la Fase 4.
- GTM y eventos de conversión no se incorporaron; corresponden a la Fase 3.

## Validación posterior al despliegue

Abrir en una ventana privada:

1. `https://www.parcelalista.cl/caburgua-premium`
2. `https://www.parcelalista.cl/plataforma/landing/?id=land-caburgua`
3. `https://www.parcelalista.cl/parcela.html?id=caburgua`

Las dos primeras deben mostrar Caburgua sin haber iniciado sesión ni abierto
previamente el CRM. La tercera debe conservar la ficha inmobiliaria existente.

No comenzar la Fase 1 hasta completar esta comprobación en producción.
