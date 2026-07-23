# TPL Business — Fase 2.5: mejoras visuales y respaldo de marca

Fecha: 23 de julio de 2026

## Resultado

Se rediseñaron las características importantes, se incorporó el respaldo
discreto de TPL Business y se creó un footer corporativo configurable.

Caburgua continúa siendo la marca y el proyecto protagonista.

## Configuración reutilizable

`landing-config.js` incorpora:

- `features[]` con `title` y `text`;
- `tplBranding.enabled`;
- `tplBranding.badgeText`;
- `tplBranding.supportText`;
- `tplBranding.footerText`;
- `tplBranding.ctaText`;
- `tplBranding.ctaUrl`;
- `tplBranding.modalTitle`;
- `tplBranding.modalContent`;
- `tplBranding.footerTheme`.

## Características

- Seis tarjetas configurables.
- SVG de tick verde reutilizable.
- Dos columnas en escritorio.
- Una columna desde 800 px.
- Títulos breves y textos descriptivos.
- Sin emojis.
- Contraste WCAG AA en títulos, textos y sello.

## Respaldo TPL Business

Se añadió el sello:

`Proyecto gestionado mediante TPL Business`

Texto secundario:

`Tecnología, registro de consultas y gestión comercial por Tu Parcela Lista.`

El modal explica el alcance tecnológico y comercial sin afirmar que el
proyecto se encuentra verificado.

## Accesibilidad del modal

- `role="dialog"`;
- `aria-modal="true"`;
- título mediante `aria-labelledby`;
- apertura por botón;
- cierre por botón, fondo y tecla Escape;
- foco inicial;
- ciclo de Tab dentro del modal;
- devolución del foco al botón de apertura;
- bloqueo del scroll de fondo.

## Footer

- Tema corporativo azul.
- Texto configurable.
- Referencia discreta a TPL Business.
- CTA configurable hacia `/tecnologia.html`.
- Sin logo grande ni banner invasivo.

## Archivos modificados

- `plataforma/landing/landing-config.js`
- `plataforma/landing/landing.js`
- `plataforma/landing/landing.css`
- `plataforma/landing/index.html`
- `plataforma/crm/crm-landing-engine.js`
- `plataforma/crm/index.html`

Archivo de prueba nuevo:

- `plataforma/landing/landing-branding-tests.mjs`

## Flujo comercial

No se modificaron:

- `plataforma/landing/landing-lead-service.js`;
- `supabase/migrations/202607230001_tpl_business_leads_landing.sql`.

Sus hashes SHA-256 fueron comparados con el paquete original de Fase 2 y son
idénticos.

Se conservaron los nombres, selectores y eventos de:

- `informacion_solicitada`;
- `visita_solicitada`;
- `whatsapp_click`;
- formulario;
- consentimiento;
- estados de carga, éxito, duplicado y error.

## Pruebas

- JavaScript sin errores de sintaxis.
- Pruebas del servicio comercial aprobadas.
- Render público aprobado.
- Render de vista previa con borrador antiguo aprobado.
- Configuración `features` y `tplBranding` aprobada.
- SVG presente y sin emojis.
- Modal y controles de teclado aprobados.
- CSS balanceado.
- Dos columnas en escritorio y una en móvil.
- Contraste:
  - footer: `7.56:1`;
  - título de tarjeta: `13.65:1`;
  - texto de tarjeta: `6.26:1`;
  - sello: `9.78:1`.
- Ausencia de la expresión “proyecto verificado”.
- Servicio de leads y migración sin cambios.

## Checklist de producción

- [ ] Revisar características en escritorio.
- [ ] Revisar características en móvil.
- [ ] Abrir y cerrar el modal con mouse.
- [ ] Abrir el modal con teclado.
- [ ] Cerrar con Escape.
- [ ] Comprobar ciclo de Tab.
- [ ] Revisar vista pública.
- [ ] Revisar vista previa desde el CRM.
- [ ] Enviar una consulta de prueba.
- [ ] Enviar una visita de prueba.
- [ ] Abrir WhatsApp.
- [ ] Revisar consola sin errores.

## Riesgos

- El CTA corporativo apunta temporalmente a `/tecnologia.html`; podrá cambiarse
  desde `tplBranding.ctaUrl` cuando exista la página pública de TPL Business.
- Un borrador antiguo se combina con la nueva configuración pública para no
  perder `features` ni `tplBranding`.
- La validación final visual debe repetirse después del despliegue por las
  diferencias de caché y entorno de producción.
