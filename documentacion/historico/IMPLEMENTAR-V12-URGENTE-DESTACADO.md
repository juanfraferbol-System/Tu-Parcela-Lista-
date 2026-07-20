# Tu Parcela Lista V12 — respaldo, urgencia y promoción

## Reglas implementadas

1. **Valor respaldado TPL — gratuito**
   - Se activa automáticamente cuando `precio_publicacion <= precio_venta_rapida_tpl`.
   - Funciona aunque el propietario escriba manualmente un precio inferior.
   - Se elimina automáticamente si posteriormente el precio supera Venta rápida.

2. **Venta urgente — gratuita**
   - Comunica que el propietario necesita vender pronto.
   - No compra prioridad publicitaria por sí sola.

3. **Urgente destacado — de pago**
   - Compra mayor exposición.
   - Tiene prioridad en la grilla y se identifica claramente como promoción.
   - El sistema queda preparado para cambiar el estado a activo después de confirmar el pago con Flow.

## Aplicar en Supabase

Abrir **Supabase → SQL Editor → New query**, copiar y ejecutar:

`supabase/migrations/202607190002_promocion_urgente_destacada.sql`

La migración anterior V11 puede ejecutarse primero si aún no fue aplicada. La V12 vuelve a crear la misma vista con las reglas nuevas, por lo que es la versión final de la vista pública.

## Publicar en Vercel

Desde la carpeta del proyecto:

```bash
git add .
git commit -m "V12 respaldo TPL y promociones urgentes"
git push origin main
```

Si Vercel está conectado al repositorio, el despliegue se inicia automáticamente.
