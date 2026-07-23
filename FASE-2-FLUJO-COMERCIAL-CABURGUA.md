# TPL Business — Fase 2: Inicio del flujo comercial

Fecha: 23 de julio de 2026

## Objetivo

Convertir las interacciones de la Landing Premium en un flujo comercial
persistente, deduplicado y reutilizable para futuras landings y clientes de
TPL Business.

## Modelo de datos

### `tpl_business_cuentas`

Representa al cliente que contrata TPL Business.

Ejemplo inicial:

- Código: `cli-caburgua`
- Nombre: `Caburgua Premium`

### `tpl_proyectos_comerciales`

Representa la iniciativa comercial administrada para una cuenta.

Ejemplo inicial:

- Código: `pro-caburgua`
- Objetivo: generar consultas calificadas y visitas
- Propiedad: `caburgua`

### `tpl_landings_comerciales`

Registra las landings publicadas y las vincula con un proyecto comercial.

Ejemplo inicial:

- Código: `land-caburgua`
- Slug: `caburgua-premium`

### `clientes`

Continúa siendo la identidad única de la persona. La RPC busca por correo o
teléfono normalizado antes de crear un registro.

### `crm_oportunidades`

Representa la oportunidad de una persona dentro de un proyecto comercial.
Una persona tiene como máximo una oportunidad por proyecto, pero puede tener
oportunidades diferentes en otros proyectos futuros.

### `crm_interacciones_landing`

Bitácora comercial de:

- solicitud de información;
- clic en WhatsApp;
- solicitud de visita.

Guarda atribución, sesión, recorrido, detalle e idempotencia.

### `visitas`

Conserva la visita como entidad operativa y ahora permite relacionarla con:

- proyecto comercial;
- landing;
- oportunidad.

### `crm_eventos` y `crm_tareas`

Se reutilizan. Cada formulario o visita genera el evento existente y permite
que el motor comercial cree tareas de seguimiento.

## Flujo comercial

```text
Visita Landing
    ↓
Formulario / WhatsApp / Solicitud de visita
    ↓
RPC pública segura
    ↓
Identificar Landing y Proyecto Comercial
    ↓
Deduplicar persona por correo o teléfono
    ↓
Crear o actualizar oportunidad
    ↓
Registrar interacción y atribución
    ↓
Crear visita cuando corresponda
    ↓
Registrar evento CRM
    ↓
Crear tarea automática
    ↓
Mostrar conteos reales en Dashboard Comercial
```

## Deduplicación

Se aplican tres defensas:

1. `idempotency_key` única por acción del navegador.
2. Ventana de diez minutos para la misma persona, landing y acción.
3. Restricción única de oportunidad por persona y proyecto comercial.

También existe un límite básico de veinte interacciones por sesión y landing
durante una hora.

## Atribución guardada

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `gclid`
- página de origen
- referrer sin parámetros
- sesión
- recorrido
- dispositivo

Los datos personales se envían únicamente a la RPC comercial. No se incorporan
a la atribución ni a Analytics.

## Archivos

Nuevos:

- `supabase/migrations/202607230001_tpl_business_leads_landing.sql`
- `plataforma/landing/landing-lead-service.js`
- `plataforma/landing/landing-lead-service-tests.mjs`

Modificados:

- `plataforma/landing/index.html`
- `plataforma/landing/landing-config.js`
- `plataforma/landing/landing.js`
- `plataforma/landing/landing.css`
- `plataforma/crm/index.html`
- `plataforma/crm/crm-business.js`

## Orden de despliegue

1. Aplicar primero la migración:

   `npx supabase db push`

2. Confirmar que `202607230001` aparece en Local y Remote:

   `npx supabase migration list`

3. Subir los archivos web.
4. Validar formulario, WhatsApp, visita y Dashboard Comercial.

No desplegar el frontend antes de la migración: la landing intentaría llamar
una RPC que todavía no existe.

## Checklist posterior al despliegue

- [ ] Formulario crea un cliente nuevo.
- [ ] Segundo envío con el mismo teléfono o correo no crea otro cliente.
- [ ] Se crea una oportunidad asociada a `pro-caburgua`.
- [ ] Se registra `informacion_solicitada`.
- [ ] WhatsApp abre el número oficial y registra `whatsapp_click`.
- [ ] Solicitud de visita crea una fila en `visitas`.
- [ ] La visita queda asociada a Caburgua.
- [ ] Se crea una tarea comercial automática.
- [ ] UTM y `gclid` quedan en la interacción/oportunidad.
- [ ] El Dashboard Comercial actualiza leads y visitas.
- [ ] Estados de carga, éxito, duplicado y error funcionan.
- [ ] Móvil y escritorio sin errores de consola.

## Riesgos

- La migración fue validada estáticamente, pero requiere ejecutarse en Supabase
  para completar la prueba integrada.
- La protección contra bots es básica; antes de campañas de alto volumen se
  recomienda Turnstile o equivalente.
- El clic de WhatsApp es una interacción anónima hasta que la persona entrega
  sus datos por otro canal.
- Todavía no se han configurado conversiones en GTM/GA4/Google Ads.
- La landing continúa en `noindex` hasta la fase SEO.
