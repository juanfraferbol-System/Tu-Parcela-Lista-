# Revisión del módulo Publicar Parcela — 18 julio 2026

## Correcciones aplicadas

1. Recuperación de envíos Supabase
   - El formulario guardaba `transport: supabase-edge-v1`.
   - La restauración solo reconocía `supabase-v1`.
   - Ahora reconoce ambos valores y puede recuperar un envío iniciado después de recargar.

2. Revisión visual con IA
   - La Edge Function devolvía `analisis_visual.status = completed` con sugerencias.
   - El frontend siempre marcaba la publicación como `pendiente_revision`, por lo que la pantalla de revisión IA nunca se abría.
   - Ahora se usa `revision_ia_pendiente` cuando existen sugerencias y se abre la revisión correspondiente.

3. Estado real de envío
   - `window.isSubmittingPublish` se activaba ante cualquier submit, incluso cuando faltaban campos.
   - Esto desactivaba incorrectamente la advertencia al abandonar el formulario.
   - Ahora se activa solo cuando comienza un envío o una redirección de pago real.

4. Analítica
   - El evento se disparaba aunque el formulario no pasara las validaciones.
   - Ahora se registra `tpl_publish_start` únicamente después de validar el formulario.

## Verificaciones ejecutadas

- Sintaxis de todos los módulos JavaScript de `plataforma/publicar-parcela/`.
- Pruebas automatizadas del flujo de seis etapas.
- Pruebas automatizadas de recuperación parcial y reutilización de fotografías en Storage.
- Coincidencia entre el Project Ref local y `supabase-config.js`: `qxavbqhyqaqalpzbhwmh`.

## Configuración que debe verificarse en Supabase

La función `publicar-parcela` necesita en el entorno desplegado:

- `SUPABASE_URL`
- una clave de servidor disponible como `SUPABASE_SECRET_KEYS` o `SUPABASE_SERVICE_ROLE_KEY`
- clave pública disponible como `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_ANON_KEY` o `TPL_PUBLIC_API_KEYS`
- opcional: `OPENAI_API_KEY` para análisis visual
- opcional: `OPENAI_VISUAL_MODEL`
- opcional: `TPL_ALLOWED_ORIGINS`

Orígenes ya permitidos en el código:

- `https://parcelalista.cl`
- `https://www.parcelalista.cl`

## Prueba manual recomendada

1. Abrir `/plataforma/publicar-parcela/` desde el dominio real.
2. Completar como dueño, con una sola parcela y una foto liviana.
3. Publicar y comprobar que aparezca un código `TPL-PUB-...`.
4. Revisar en Supabase:
   - `publicaciones`
   - `publicacion_fotos`
   - bucket `publicaciones-pendientes`
5. Abrir el CRM y verificar que el registro esté en estado pendiente de revisión.
6. Repetir como corredor con un plan sin IA.
7. Repetir con Gold o Platinum y análisis visual, solamente si `OPENAI_API_KEY` está configurada.

## Limitación de esta revisión

No fue posible consultar el endpoint remoto desde el entorno de trabajo porque la resolución DNS externa no estaba disponible. El código, configuración local, migraciones y pruebas automatizadas sí fueron revisados.
