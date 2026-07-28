# Auditoría y corrección visual TPL — 28-07-2026

## Cambios aplicados

- Header único inyectado en las páginas públicas incluidas en la entrega.
- Logo más grande y alineado al extremo izquierdo.
- Eliminación de la bandera de Chile.
- Navegación desktop: Inicio, Parcelas, Casas, Cómo comprar, Partners y TPL Business.
- Botón Publicar blanco/azul; amarillo únicamente al estar activo o al pasar el cursor.
- Hamburguesa ubicada al extremo derecho.
- Header móvil en una sola fila: logo, Publicar y hamburguesa.
- Eliminación del botón verde flotante de Publicar.
- Menú con rutas absolutas para evitar enlaces rotos desde `/plataforma/*`.
- Partner incorporado al header de todo el sitio y shell agregado a perfil/currículum.
- TPL Business enlazado directamente y versiones de CSS/JS actualizadas para evitar caché antigua.
- Compactación móvil entre presupuesto y resultados de parcelas.
- Footer unificado sin acentos amarillos predominantes.

## Diagnóstico Partner

La página Partner sí estaba presente. El fallo principal era de navegación: el shell calculaba rutas con `../` según la profundidad de la URL. En rutas terminadas en `/plataforma/partners/` podía construir enlaces incorrectos. Ahora todas las rutas principales son absolutas.

## Diagnóstico TPL Business

El formulario de ingreso con correo y contraseña ya existe en `tpl-business.js`. La portada podía seguir mostrando una versión anterior debido a los parámetros de caché `v=20260724-3`. Se actualizaron a `v=20260728-2`.

## Observación

El ZIP recibido no contiene el `index.html` principal de la raíz. Se corrigieron todas las páginas HTML públicas disponibles en el archivo. Para aplicar el header a la portada principal, ésta debe conservar las referencias a:

- `/css/tpl-site-shell.css?v=20260728-2`
- `/js/tpl-site-shell.js?v=20260728-2`

## Verificación

- `js/tpl-site-shell.js`: sintaxis correcta.
- `tpl-business.js`: sintaxis correcta.
- `partners-logic.js`: sintaxis correcta.
- El test contractual existente de TPL Business continúa fallando por una expectativa previa de texto `Tu Landing Premium`; no está relacionado con estos cambios visuales ni de navegación.
