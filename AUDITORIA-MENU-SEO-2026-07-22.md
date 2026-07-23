# Auditoría de navegación, menú y SEO — Tu Parcela Lista

## Cambios aplicados

- Se simplificó el hero del index eliminando mensajes repetidos.
- El mensaje principal queda enfocado en parcelas, casas y servicios para proyectos de campo.
- Se eliminó la fila redundante de beneficios del hero.
- En móvil, la cabecera queda compuesta como: logo | Publicar / Partners | menú.
- En pantallas muy pequeñas se conserva Publicar y Partners permanece dentro del menú desplegable.
- Se ocultó el texto repetido “Tu Parcela Lista” entre logo y menú.
- Se corrigieron rutas antiguas hacia `plataforma/publicar-parcela/`.
- Se corrigió el botón Publicar de la Red de Partners.
- Se incorporaron Publicar y Red de Partners en menús informativos que no los tenían.
- Se eliminó el enlace oculto del símbolo © hacia el CRM.
- No quedaron enlaces locales rotos en los HTML revisados.

## SEO

Páginas indexables principales:
- index.html
- parcela.html
- como-comprar.html
- cotizador.html
- tecnologia.html
- plataforma/publicar/
- plataforma/partners/

Páginas internas con noindex:
- CRM y administradores
- manager
- corrección de publicaciones
- perfil interno Partner
- confirmación de pago
- categoría genérica

También se actualizaron `sitemap.xml` y `robots.txt`.

## parcela.html

Se agregó actualización dinámica del título, descripción y canonical cuando se carga la parcela:
`Nombre de la parcela en ubicación | Tu Parcela Lista`.

## Verificación

- 22 HTML revisados.
- 0 enlaces relativos rotos detectados después de las correcciones.
- La estructura de IDs funcionales del buscador y cotizador no fue modificada.
