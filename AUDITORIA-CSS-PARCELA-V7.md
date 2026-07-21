# Auditoría CSS profunda — parcela.html

## Resultado

- Hojas CSS enlazadas por `parcela.html`: **1**
- Archivo enlazado: `parcela.css?v=20260720-7`
- Bloques `<style>` internos: **0**
- Aperturas/cierres de llaves CSS: **592/592**
- Tamaño final de `parcela.css`: **70,544 bytes**
- Líneas finales: **1,667**

## Fuentes consolidadas

1. `parcela.css` original.
2. Reglas necesarias de `agente/agente.css`.
3. Estilos internos del ayudante del cotizador.
4. Estilos internos del respaldo de valor.
5. Reglas necesarias de `css/tpl-lead-advisor.css`.
6. Ajustes visuales finales de `css/parcela-detail.css`.
7. Leaflet y Google Fonts se cargan mediante `@import` al inicio del único CSS.

## Decisión de seguridad

Los archivos CSS anteriores se conservaron físicamente porque otras páginas del proyecto podrían utilizarlos. `parcela.html` ya no los enlaza, por lo que no pueden generar conflictos en esta ficha.

## Verificaciones

- Una sola etiqueta `<link rel="stylesheet">`.
- Sin estilos internos en el HTML.
- Balance de llaves CSS correcto: **sí**.
- Orden de cascada conservado dentro de un único archivo.
- Ajustes de cabecera V6 ubicados al final para tener prioridad controlada.
