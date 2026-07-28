# Auditoría e implementación Partner TPL

## Implementado
- Hero de Partner orientado a talento y captación de clientes.
- Banner Partner dentro del hero principal del sitio.
- Actividades repetibles, etapas del servicio y modalidades de pago.
- Anticipo y garantía.
- Beneficio gratuito de currículum PDF y landing básica al aprobarse.
- CTA comercial hacia TPL Studio.
- CRM enriquecido para revisar actividades, etapas y pagos.
- Preparación de Flow para planes Ideal, Empresa y Premium mediante `/api/flow-create`.
- Migración `202607280001_partner_talento_servicio_pagos.sql`.

## Bloqueos reales pendientes
1. La migración agrega columnas, pero la RPC `tpl_postular_partner` y la RPC de aprobación deben ampliarse en Supabase para persistir/copiar los nuevos campos. No se ejecutó SQL remoto.
2. Flow requiere variables `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_CONFIRMATION_URL` y un webhook que actualice el estado del plan.
3. El webhook existente solo registra en consola; todavía no concilia ni activa suscripciones. No debe prometerse activación automática hasta corregirlo.
4. Falta el generador servidor de currículum PDF y almacenamiento de `curriculum_url`.
5. La landing pública actual exige plan pagado. La nueva decisión comercial propone landing básica gratis, por lo que deben ajustarse vista pública y reglas de visibilidad después de definir límites exactos.

## Recomendación inmediata
Ejecutar primero la migración, ampliar las dos RPC de Partner, probar una postulación gratuita y una pagada en sandbox de Flow, y solo entonces publicar el nuevo embudo.
