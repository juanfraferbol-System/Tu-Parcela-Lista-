# IMPLEMENTACIÓN SEO TPL v1

## Cambios aplicados

- Sitemap ampliado a 42 URLs, incluyendo 32 fichas de parcelas y 4 categorías.
- Generador reutilizable: `node tools/generate-sitemap.mjs`.
- Schema JSON-LD global: Organization, WebSite, SearchAction y WebPage.
- Schema dinámico para fichas: RealEstateListing, Offer, GeoCoordinates y BreadcrumbList.
- Metadatos dinámicos por parcela: title, description, canonical, Open Graph y Twitter.
- Categorías cambiadas de `noindex` a `index,follow`, con canonical, metadatos, CollectionPage y breadcrumbs.
- H1 principal optimizado para búsquedas de parcelas en Biobío y Ñuble.
- robots.txt endurecido para excluir CRM, administración y pago exitoso.
- Dominio canónico normalizado a `https://www.parcelalista.cl`.

## Archivos modificados

- index.html
- parcela.html
- categoria.html
- como-comprar.html
- cotizador.html
- tecnologia.html
- politica-privacidad.html
- terminos.html
- js/categoria.js
- robots.txt
- sitemap.xml

## Archivos nuevos

- js/tpl-seo.js
- tools/generate-sitemap.mjs

## Validación después de publicar

1. Abrir `/sitemap.xml` y comprobar que cargue como XML.
2. En Search Console, enviar nuevamente `https://www.parcelalista.cl/sitemap.xml`.
3. Inspeccionar una ficha de parcela y solicitar indexación.
4. Probar resultados enriquecidos de Google sobre una ficha.
5. Revisar que categoría.html?cat=descanso ya no tenga `noindex`.
