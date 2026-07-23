# TPL Business — Fase 1: Landing pública de Caburgua

Fecha: 23 de julio de 2026

## Estado

Implementación terminada y validada localmente. Pendiente únicamente la
comprobación posterior al despliegue en Vercel.

## Objetivo

Mantener una Landing Premium pública y compartible para Caburgua, compatible
con el Landing Engine y protegida de cambios locales o borradores del navegador
del administrador.

## Cambios técnicos

1. La configuración pública incorpora `propertyId`, `slug` y `publicUrl`.
2. `/caburgua-premium` siempre usa la versión publicada.
3. La URL pública ignora cualquier borrador almacenado en `localStorage`.
4. La vista previa administrativa utiliza:
   `/plataforma/landing/?id=land-caburgua&preview=1`.
5. El Landing Engine combina la configuración pública con datos administrativos
   existentes sin perder futuras landings.
6. Al editar una landing se conservan `propertyId`, `slug` y `publicUrl`.
7. El CRM diferencia entre “Vista previa” y “Vista pública”.
8. Caburgua muestra su estado público real; se deshabilitó únicamente el botón
   local que aparentaba publicar o despublicar sin modificar producción.
9. Se declararon favicon y Apple Touch Icon para evitar la solicitud automática
   fallida de `/favicon.ico`.
10. La ficha inmobiliaria existente no fue modificada.

## Compatibilidad

- Los borradores locales existentes continúan disponibles.
- Las landings futuras pueden añadirse al registro público usando la misma
  estructura.
- Las landings todavía no publicadas pueden previsualizarse con `preview=1`.
- No se cambió el formulario, Supabase, Analytics, GTM, SEO ni el diseño
  comercial de las fases posteriores.

## Checklist local

- [x] JavaScript sin errores de sintaxis.
- [x] `vercel.json` válido.
- [x] Visitante nuevo recibe Caburgua.
- [x] URL pública ignora borrador local.
- [x] Vista previa administrativa usa borrador local.
- [x] Configuración pública resuelve identificador y slug.
- [x] Favicon y recursos locales existen.
- [x] Configuración carga antes del renderer.
- [x] Ficha inmobiliaria existente sin modificaciones.

## Validación después del despliegue

- [ ] Abrir `/caburgua-premium` en ventana privada.
- [ ] Abrir el CRM y comprobar “Vista pública”.
- [ ] Editar localmente el título y comprobarlo solo en “Vista previa”.
- [ ] Confirmar que la URL pública conserva el título publicado.
- [ ] Revisar consola sin errores.
- [ ] Confirmar comportamiento en móvil y escritorio.

## Riesgos antes de la Fase 2

- El formulario todavía simula éxito y no debe utilizarse para captar campañas.
- WhatsApp no tiene un número configurado.
- La publicación del contenido continúa siendo mediante despliegue de código;
  el CRM todavía no escribe en una fuente remota.
- La landing conserva `noindex` hasta la fase SEO.
- No existen todavía eventos de conversión ni captura UTM.

## Recomendación

No enviar tráfico de Google Ads hasta completar y validar la Fase 2, porque el
formulario actual no guarda contactos reales.
