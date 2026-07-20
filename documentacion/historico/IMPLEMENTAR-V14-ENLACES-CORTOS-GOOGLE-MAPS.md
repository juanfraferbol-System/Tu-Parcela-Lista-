# V14 — enlaces cortos de Google Maps

Esta versión permite pegar enlaces como `https://maps.app.goo.gl/...` en el publicador unificado.

## 1. Desplegar la nueva Edge Function

Desde la carpeta raíz del proyecto:

```bash
supabase functions deploy resolve-google-maps --no-verify-jwt
```

La función valida que el dominio pertenezca a Google Maps, sigue la redirección desde el servidor y extrae latitud/longitud sin exponerlas públicamente en el anuncio.

## 2. Publicar el sitio

```bash
vercel --prod
```

## 3. Probar

En `/plataforma/publicar/`, pegar un enlace `maps.app.goo.gl` y pulsar **Usar este enlace**. El botón mostrará “Leyendo enlace…” y, al obtener las coordenadas, marcará el punto en el mapa.

## Archivos principales

- `supabase/functions/resolve-google-maps/index.ts`
- `supabase/functions/resolve-google-maps/logic.mjs`
- `plataforma/publicar/app.js`
- `supabase/config.toml`
