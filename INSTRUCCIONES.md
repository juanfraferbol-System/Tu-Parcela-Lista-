# TPL Partners Seguro — Etapa 1

## Orden de instalación

1. Haz una copia de seguridad de los archivos actuales.
2. Reemplaza:
   - `plataforma/partners/index.html`
   - `plataforma/partners/partners-logic.js`
   - `plataforma/partners/perfil.html`
   - `plataforma/crm/index.html`
   - `plataforma/crm/crm.css`
   - `js/partners-injector.js`
3. Agrega:
   - `plataforma/partners/partners.css`
   - `plataforma/crm/crm-partners.js`
4. En Supabase SQL Editor ejecuta una sola vez:
   - `supabase/migrations/202607220005_partners_seguridad_base.sql`
5. Recarga el CRM e inicia sesión con un administrador activo.

## Pruebas mínimas

1. Abre `/plataforma/partners/` y completa una postulación de prueba.
2. Verifica que aparezca un código `TPL-PAR-...`.
3. En el CRM abre **Postulaciones Partner**.
4. Revisa la postulación y pulsa **Aprobar**.
5. Confirma que la aprobación crea un Partner interno, pero no activa un plan pagado ni lo publica.
6. Verifica que `/plataforma/partners/perfil.html?id=...` solo muestre Partners que un administrador haya dejado verificados, visibles, con plan activo y pago vigente.

## Reglas incorporadas

- Las postulaciones públicas ya no escriben directamente en `contratistas`.
- El plan elegido se guarda como solicitado, nunca como pagado.
- Los archivos se guardan en un bucket privado.
- Se exige aceptación de términos, privacidad y autorización de contacto.
- Se cierran las políticas RLS públicas históricas de contratistas y asignaciones.
- El perfil público consulta una vista limitada y no utiliza `select=*`.
- La aparición de Partners en parcelas usa el catálogo público seguro.

## Importante

La Etapa 1 no incorpora todavía checkout ni renovación automática. La activación de planes pagados debe realizarse en la siguiente etapa, después de conectar el proveedor de pagos.
