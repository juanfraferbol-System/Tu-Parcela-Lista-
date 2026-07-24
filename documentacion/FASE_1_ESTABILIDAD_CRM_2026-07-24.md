# Fase 1 — Estabilidad y honestidad funcional del CRM

Fecha: 24 de julio de 2026.

## Cambios

- Se ocultó “Promociones y Ads” porque todavía no tiene controlador ni persistencia real.
- TPL Studio quedó identificado como “MVP local”.
- Pendientes Operativos ahora usa consultas reales en paralelo, muestra errores y abre módulos existentes.
- Se eliminaron botones demostrativos de Pendientes.
- Se normalizó Smart Match para comunas guardadas como texto o arreglo.
- Smart Match dejó de modificar temporalmente objetos de partners.
- Se escaparon datos comerciales antes de insertarlos en la interfaz.
- Los enlaces de WhatsApp se construyen con teléfonos normalizados y `noopener`.
- El sidebar ahora tiene scroll vertical.
- Las tablas pueden desplazarse horizontalmente.
- Se conserva la normalización de imágenes del catálogo hacia rutas raíz.
- Se actualizaron cuatro pruebas que utilizaban rutas o contratos antiguos.
- Se agregó una prueba contractual específica para la Fase 1.

## No modificado

- Supabase y migraciones.
- Autenticación.
- TPL Business.
- Landing Premium.
- Leads, visitas y WhatsApp.
- Publicador y cotizador.
- Google Ads y SEO.

## Pruebas aprobadas

- `crm-phase1-stability-tests.mjs`
- `crm-business-integration-tests.mjs`
- `tpl-business-contract-tests.mjs`
- `landing-branding-tests.mjs`
- `landing-lead-service-tests.mjs`
- `landing-map-tests.mjs`
- `crm-security-tests.mjs`
- `fase0-security-tests.mjs`
- `tasador-security-tests.mjs`
- `tpl-business-security-tests.mjs`
- `supabase/functions/tasar-parcela/engine-tests.mjs`

## Validación pendiente

Después del despliegue:

1. Entrar al CRM como administrador.
2. Confirmar que no aparece “Promociones y Ads”.
3. Confirmar que TPL Studio muestra “MVP local”.
4. Abrir Pendientes Operativos y probar sus tres destinos.
5. Abrir Casas y confirmar que no existen solicitudes `/plataforma/crm/image/...`.
6. Abrir Cotizaciones y validar Smart Match.
7. Revisar consola en escritorio y móvil.
