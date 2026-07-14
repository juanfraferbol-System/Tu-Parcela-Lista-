# Tu Parcela Lista — versión mejorada

Fecha: 10 de julio de 2026

## Mejoras principales

- Extras retirados de la vista principal del cotizador para reducir ruido y desplazamiento.
- Nueva revisión opcional de extras antes de WhatsApp o Activar proyecto, conservando la fórmula y actualización del total.
- Total estimado trasladado al cierre final de la tarjeta de cotización.
- Estilo del cotizador simplificado: menos animaciones, bordes suaves y tarjetas más limpias.
- Botones y destinos revisados en todas las páginas; no quedaron enlaces estáticos rotos.
- Cotizador del inicio reorganizado para celulares, sin cortes ni desbordamiento horizontal.
- Resumen del proyecto mostrado antes de fundaciones y adicionales en pantallas pequeñas.
- Planes de fundación e instalación resumidos con nombres y beneficios más claros.
- Fichas emergentes de parcela y casa ajustadas a móvil, con botones grandes y destinos explícitos.
- Formulario “Publicar” corregido: avanzar y volver mantiene al usuario dentro del área de trabajo.
- Franja informativa rotativa, positiva y enlazable hacia oportunidades, parcelas, casas, cotizador y publicación.
- 191 fotografías referenciadas convertidas a WebP: de 198,5 MB a 31,9 MB en sus versiones web.
- Barra flotante “Tu proyecto guardado” en todas las páginas, minimizable y adaptada a celular.
- La barra conserva parcela y casa, permite quitar selecciones y abre el cotizador cuando el proyecto está completo.
- Favoritos locales con acceso rápido desde la barra.
- Comparador de hasta tres parcelas con precio, superficie, comuna, agua, luz y facilidad de pago.
- Acciones de favoritos y comparación en tarjetas y fichas de parcela.
- Bloque de confianza y preguntas frecuentes en la portada.
- Navegación revisada y destinos corregidos en todas las páginas públicas.
- Menú móvil accesible, con estado abierto/cerrado y soporte de teclado.
- Nueva capa visual común para mejorar tipografía, espaciado, tarjetas, botones, foco y respuesta móvil.
- Mejoras de accesibilidad: enlace para saltar al contenido, foco visible, estructura principal consistente y respeto por movimiento reducido.
- Ficha de parcela limpiada, sin recursos duplicados dentro del cuerpo de la página.
- Metadatos sociales y URL canónica dinámica para cada parcela.
- Sitemap corregido y normalizado al dominio sin `www`.
- Rutas amigables corregidas y eliminación de la regla que ocultaba errores 404.
- Paneles administrativos marcados para no aparecer en buscadores.
- Encabezados de seguridad y privacidad reforzados para Netlify.
- Aplicación Manager reparada: archivo de inicio, comandos, seguridad básica y navegación de sus botones.
- Carga diferida de imágenes secundarias y protección de enlaces externos.

## Validaciones realizadas

- 35 archivos JavaScript comprobados sin errores de sintaxis.
- Todas las referencias estáticas de páginas, estilos, scripts e imágenes verificadas.
- Todas las páginas tienen un título principal, viewport y área de contenido principal.
- Pruebas en navegador de escritorio y móvil.
- Pruebas de búsqueda por presupuesto, filtros, mapa, menú móvil y formulario por pasos.

## Publicación

El contenido de esta carpeta se puede publicar directamente en Netlify conservando `netlify.toml` y `_redirects`.

La carpeta `tuparcelalistamanager` contiene el administrador de escritorio. Para prepararlo en otro computador se deben instalar sus dependencias desde esa carpeta y luego iniciarlo con el comando definido en su `package.json`.

## Importante

Las publicaciones, el CRM y las estadísticas siguen siendo locales al navegador. Para compartir información real entre usuarios será necesario conectar una base de datos y autenticación; esa integración requiere crear y configurar las credenciales del servicio elegido.
