# Integración Flow + CRM + Tasador

## Estado de esta entrega

El navegador ya genera un objeto estructurado con propiedad, contacto, documentación, terreno, servicios, casa, urgencia, plan, tasación, calidad del anuncio e integraciones.

La conexión real debe realizarse mediante endpoints de servidor. Las credenciales secretas de Flow no pueden quedar en `app.js`, `index.html` ni en ninguna variable pública del navegador.

## Endpoints esperados

```js
window.TPL_PUBLICADOR_CONFIG = {
  submissionEndpoint: '/api/publicaciones',
  flowCreatePaymentEndpoint: '/api/flow/create-payment'
};
```

### POST `/api/publicaciones`

Debe:

1. validar el payload;
2. crear o actualizar el contacto;
3. crear la propiedad y publicación;
4. guardar urgencia y protocolo;
5. crear el registro inicial del CRM;
6. enviar las variables al tasador;
7. devolver `{ "id": "..." }`.

### POST `/api/flow/create-payment`

Debe:

1. recibir `publicationId`, `planId`, cliente y monto;
2. obtener el precio real desde el servidor, nunca confiar en el monto del navegador;
3. crear la orden en Flow usando credenciales privadas;
4. guardar el intento de pago;
5. devolver `{ "url": "...", "token": "..." }`.

## Webhook de Flow

El webhook debe verificar la transacción y actualizar:

- estado del pago;
- plan contratado;
- fecha de activación;
- monto abonable a la comisión;
- protocolo comercial;
- evento en la bitácora del CRM.

## Campos claves para el CRM

- `comercial.urgencia`
- `comercial.urgenciaPuntaje`
- `comercial.protocoloSugerido`
- `plan.recomendado`
- `plan.coincideConUrgencia`
- `calidad.score`
- `calidad.mejoras`
- `tasacion.variablesUsadas`

## Regla de seguridad

Nunca exponer API Secret de Flow, service role de Supabase ni firmas de pago en archivos públicos.
