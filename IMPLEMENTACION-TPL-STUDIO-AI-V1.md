# Implementación TPL Studio AI V1

## Incluido en esta etapa

- Centro de creación de campañas accesible desde el CRM.
- Captura estructurada de datos de parcela, casa, proyecto o servicio partner.
- Selección de formatos: video de 30 segundos, Reel/TikTok, Facebook, Instagram, PDF y SEO/blog.
- Generador local y determinista de storyboard de seis escenas.
- Narración comercial sugerida.
- Cola de producción desacoplada del proveedor de IA.
- Biblioteca e historial local mediante localStorage.
- Exportación JSON para enviar el trabajo a cualquier proveedor futuro.
- Migración Supabase con campañas, storyboards, recursos y cola de renderizado.
- Políticas RLS para propietarios y administradores.

## Ruta

`/plataforma/studio/`

## Estado real

El módulo prepara toda la información, el storyboard y la cola. Todavía no consume créditos ni llama a una API de video. Esto es intencional: la integración con Kling, Veo, Runway u otro proveedor se realiza después sobre `marketing_render_queue`, sin rehacer la interfaz ni el modelo de datos.

## Próxima conexión técnica

1. Aplicar la migración `202607220010_tpl_studio_ai.sql`.
2. Reemplazar la persistencia local del frontend por Supabase.
3. Crear una Edge Function que reserve trabajos pendientes de `marketing_render_queue`.
4. Configurar adaptadores por proveedor.
5. Registrar costos, errores, reintentos y URL final en `marketing_assets`.
