# Auditoría de interfaz pública y SEO — Tu Parcela Lista

## Alcance
Se revisaron 27 archivos HTML. Los paneles internos, redirecciones y herramientas administrativas se mantuvieron aislados para no introducir navegación pública ni dependencias que afecten CRM, moderación o Manager.

## Cambios aplicados
- Menú burger de escritorio con TPL Business, Quiénes somos y Contacto.
- El enlace de la página actual se oculta automáticamente dentro del burger.
- Botón móvil global “Publicar mi propiedad” en páginas públicas, excluyendo el publicador.
- Footer corporativo azul TPL con acento amarillo, enlaces consistentes y rutas relativas automáticas.
- Protección visual en parcela.html para evitar imágenes o figuras dinámicas desbordadas bajo el footer.
- Corrección de referencias rotas a logos, favicons y hojas CSS inexistentes dentro del paquete.
- Optimización de títulos, descripciones y canonical de inicio, publicador, tasador y Partners.
- Contenido SEO visible y natural para búsquedas geográficas, venta/publicación y trabajos rurales.
- Revisión y ampliación de sitemap.xml con las rutas comerciales principales.

## Criterio SEO
No se agregaron bloques ocultos ni repeticiones artificiales de palabras clave. Las frases solicitadas se integraron en contenido útil y enlazado hacia la página que responde mejor a cada intención de búsqueda.

## Recomendaciones posteriores
1. Crear páginas geográficas reales por comuna cuando exista inventario suficiente, por ejemplo `/parcelas/florida/` y `/parcelas/yumbel/`.
2. Configurar Google Search Console y solicitar indexación de las rutas principales.
3. Mantener títulos, descripciones y datos de propiedades sincronizados con Supabase.
4. Añadir fotografías WebP propias y texto alternativo específico en cada ficha.
5. Medir conversiones separadas para Publicar, Tasador y Partners desde Google Analytics.
