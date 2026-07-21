# Asesor de Compradores TPL v1 — 20 de julio de 2026

## Implementado

- Botón flotante **Asesor TPL** en portada, categorías y ficha de parcela.
- Captación automática y no invasiva después de revisar varias parcelas, permanecer en el sitio o mostrar intención de salida.
- Elección de canal: WhatsApp, correo o ambos.
- Registro del plazo estimado de compra.
- Registro del detalle que el comprador no encontró.
- Consentimiento explícito antes de guardar datos personales.
- Historial local de las últimas parcelas revisadas.
- Sincronización con Supabase mediante la RPC `tpl_captar_comprador_asesor`.
- Cola local cuando no hay conexión; reintento al volver Internet.
- Creación de intereses asociados al comprador para futuras recomendaciones.
- El contacto directo de una publicación sigue perteneciendo al mérito del corredor; este flujo se activa como acompañamiento cuando el comprador necesita alternativas.

## Archivos nuevos

- `js/tpl-lead-advisor.js`
- `css/tpl-lead-advisor.css`
- `supabase/migrations/202607200006_asesor_compradores_tpl.sql`

## Archivos conectados

- `index.html`
- `parcela.html`
- `categoria.html`

## Aplicación en Supabase

Desde la raíz del proyecto:

```bash
npx supabase@latest db push
```

Luego desplegar a producción:

```bash
vercel deploy --target=production
```

## Próxima fase recomendada

Panel del Asesor TPL dentro del CRM: ficha del comprador, línea de tiempo, coincidencias automáticas y alertas para corredores Partner.
