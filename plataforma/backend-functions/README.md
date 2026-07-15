# Backend: Funciones Inteligencia Artificial (Supabase Edge Functions)

Este directorio contiene el código que se ejecutará en los servidores de Supabase de manera segura para conectar con la API de generación de Videos IA.

## ¿Por qué se necesita esto?
No podemos generar el video directamente desde \`app.js\` porque eso expondría tus contraseñas y tarjetas de crédito al público. Por ende, la web manda la orden de pago a Supabase, y esta función (que es privada) hace el trabajo pesado llamando a la IA.

## Instrucciones para instalar en Supabase

1. Instala Supabase CLI en tu computador (si usas Windows, usando Scoop o descargando el .exe desde la web de Supabase).
2. Abre la terminal en esta carpeta.
3. Inicia sesión en tu cuenta:
   \`\`\`bash
   supabase login
   \`\`\`
4. Vincula este directorio con tu proyecto (usa el ID de tu proyecto, ej: qxavbqhyqaqalpzbhwmh):
   \`\`\`bash
   supabase link --project-ref qxavbqhyqaqalpzbhwmh
   \`\`\`
5. Configura los secretos (El token de la IA, por ejemplo Replicate):
   \`\`\`bash
   supabase secrets set REPLICATE_API_TOKEN=tu_token_aqui
   \`\`\`
6. Despliega la función:
   \`\`\`bash
   supabase functions deploy procesar-video-ia
   \`\`\`

Una vez desplegada, MercadoPago (o Make/Zapier) podrá hacer un POST a tu nueva URL de la función para generar el video cuando el cliente pague.
