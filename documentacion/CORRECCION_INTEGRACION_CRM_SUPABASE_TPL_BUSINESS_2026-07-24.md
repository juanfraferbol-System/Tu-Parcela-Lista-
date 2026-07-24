# Corrección CRM → Supabase → TPL Business

Fecha: 2026-07-24  
Proyecto Supabase: `qxavbqhyqaqalpzbhwmh`

## Objetivo

Eliminar la fuente local demostrativa del Centro Comercial y utilizar las
tablas canónicas ya existentes en Supabase.

## Fuente canónica

- Cuentas: `tpl_business_cuentas`
- Proyectos: `tpl_proyectos_comerciales`
- Landings: `tpl_landings_comerciales`
- Módulos: `tpl_business_modulos_catalogo`, `tpl_proyecto_modulos`
- Solicitudes: `tpl_solicitudes_comerciales`
- Resultados: `crm_oportunidades`, `visitas`
- Planes: `planes_comerciales`

## Cambios

- `crm-business.js` dejó de usar `localStorage`, semillas y datos específicos
  de Caburgua.
- `crm-business-service.js` centraliza las lecturas y escrituras en Supabase.
- El CRM permite crear y editar cuentas y proyectos canónicos.
- Archivar cambia el estado; no elimina información.
- La vista de proyectos utiliza el código canónico para abrir
  `admin_project`.
- Se incorporó una bandeja de solicitudes y actualización controlada de
  estados.
- Los indicadores del Centro Comercial se calculan con datos reales.

## Seguridad

El servicio exige una sesión válida y comprueba
`es_administrador_activo()` antes de leer o modificar información.

La implementación reutiliza las políticas RLS y permisos instalados por:

- `202607230001_tpl_business_leads_landing.sql`
- `202607240001_tpl_business_centro_clientes.sql`

No se necesita una migración SQL adicional.

## Modos

- Administrador: gestiona cuentas, proyectos y solicitudes desde el CRM.
- Vista como cliente: revisión segura y de solo lectura desde el CRM.
- Propietario: usa su membresía activa y puede registrar solicitudes desde
  TPL Business.

## Pruebas

```bash
node --check plataforma/crm/crm-business-service.js
node --check plataforma/crm/crm-business.js
node plataforma/crm/crm-business-integration-tests.mjs
node plataforma/tpl-business/tpl-business-contract-tests.mjs
node supabase/tpl-business-security-tests.mjs
node plataforma/landing/landing-lead-service-tests.mjs
node pruebas/landing-canonical-flow-tests.mjs
```

## Validación manual pendiente

Después del despliegue:

1. Iniciar sesión administrativa en `/plataforma/crm/`.
2. Abrir TPL Business → Centro Comercial.
3. Confirmar Caburgua desde Supabase.
4. Abrir Vista como cliente.
5. Confirmar que las solicitudes estén bloqueadas en vista administrativa.
6. Cuando exista el correo real, crear la membresía del propietario.
7. Registrar una solicitud desde la cuenta del propietario.
8. Gestionarla desde la bandeja de Solicitudes del CRM.
