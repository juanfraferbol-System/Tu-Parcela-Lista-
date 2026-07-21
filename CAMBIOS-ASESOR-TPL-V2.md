# Asesor TPL V2

## Activación automática
- `parcela.html`: aparece después de 20 segundos o cuando detecta intención de salida.
- `index.html`: aparece después de 60 segundos o cuando detecta intención de salida.
- `plataforma/publicar/`: aparece después de 3 minutos si la persona sigue en el formulario.
- En el publicador también aparece cuando detecta un mensaje real de validación o un campo incorrecto.

## Comportamiento
- En index y parcela funciona como asesor de compra y conserva las parcelas vistas.
- En parcela identifica el código y título de la propiedad actual cuando están disponibles.
- En publicar no solicita datos comerciales: explica el problema y permite llevar al usuario directamente al campo incorrecto.
- No repite automáticamente la misma ayuda durante una sesión.
- Mantiene botón flotante para abrir ayuda manualmente.

## Archivos principales
- `js/tpl-lead-advisor.js`
- `css/tpl-lead-advisor.css`
- `index.html`
- `parcela.html`
- `categoria.html`
- `plataforma/publicar/index.html`
