# Tu Parcela Lista - Ajuste visual 2.0

Esta versión corrige el problema principal: el CSS original tenía muchas reglas duplicadas y por eso los estilos se pisaban entre sí.

## Qué se hizo

- Se agregó una carpeta `css/` con archivos de estilo 2.0 que se cargan después del CSS antiguo.
- Se rediseñó el sidebar para que sea limpio, premium y no sobrecargado.
- Se dejó solo un botón destacado amarillo: `Facilidad pago`.
- Se corrigieron botones para que sean más uniformes.
- Se agregaron reglas para evitar que badges amarillos tapen texto.
- Se reforzó responsive móvil.
- Se agregó enlace `Cómo comprar` al menú cuando corresponde.

## Archivos nuevos

- `css/v2-base.css`
- `css/v2-sidebar.css`
- `css/v2-components.css`
- `css/v2-responsive.css`

## Importante

No se eliminó `style.css` para evitar romper funcionalidades. Esta versión usa CSS modular como capa de corrección y orden.
