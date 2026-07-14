# API / Integraciones — Plan inicial

## Supabase
Uso esperado:
- Auth para usuarios y propietarios.
- Database para parcelas, casas, publicaciones, pagos e interesados.
- Storage para imágenes si no se usa Cloudinary.

## Mercado Pago
Uso esperado:
- Crear preferencia de pago al seleccionar plan.
- Usar `external_reference` con publicación/usuario/plan.
- Webhook para confirmar pago.
- Al confirmar, dejar publicación en estado `pendiente_aprobacion` o `activa` según regla comercial.

## Netlify Functions
Recomendado para:
- Crear preferencia de Mercado Pago sin exponer credenciales.
- Recibir webhooks.
- Enviar correos internos.

## Variables de entorno futuras
```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MERCADOPAGO_ACCESS_TOKEN=
ADMIN_EMAIL=
```
