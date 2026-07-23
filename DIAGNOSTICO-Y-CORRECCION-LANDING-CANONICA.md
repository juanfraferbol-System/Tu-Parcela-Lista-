# Diagnóstico y corrección: CRM → Supabase → Landing pública

## Diagnóstico exacto

### Fuente pública anterior

`plataforma/landing/landing.js` obtenía Caburgua mediante:

```js
window.TPL_getPublicLanding(landingKey)
```

Esa función estaba definida en `plataforma/landing/landing-config.js`. El mismo archivo contenía directamente título, precio, descripción, galería, características, CTA, SEO y branding de Caburgua.

La Landing pública no consultaba Supabase para obtener su contenido.

### Guardado anterior del CRM

`plataforma/crm/crm-landing-engine.js`:

- cargaba una semilla desde `window.TPL_PUBLIC_LANDINGS`;
- mezclaba la semilla con `localStorage`;
- guardaba con `localStorage.setItem('tpl_landing_engine_v1', ...)`;
- no ejecutaba `insert`, `update` ni RPC de Supabase;
- generaba una vista previa local con `?preview=1`;
- deshabilitaba el botón de publicación cuando detectaba la configuración pública.

Por eso el mensaje de guardado era cierto solo para ese navegador.

### Identificadores

La configuración utilizaba:

- Landing lógica: `land-caburgua`
- Proyecto lógico: `pro-caburgua`
- Cliente lógico: `cli-caburgua`
- Propiedad: `caburgua`
- Slug: `caburgua-premium`
- URL: `/caburgua-premium`

La migración de Fase 2 ya creó equivalentes en:

- `tpl_business_cuentas.codigo = cli-caburgua`
- `tpl_proyectos_comerciales.codigo = pro-caburgua`
- `tpl_landings_comerciales.codigo = land-caburgua`

Sin embargo, `tpl_landings_comerciales` conservaba solamente metadatos. No almacenaba el contenido visual.

### Datos duplicados

Existían dos versiones:

1. configuración pública fija de `landing-config.js`;
2. edición local del CRM en `localStorage`.

También el estado se representaba como `published/draft` en JavaScript y `publicada/borrador/archivada` en Supabase.

### RLS y errores silenciosos

El botón Guardar anterior no podía generar un error RLS porque nunca llegaba a Supabase. La nueva implementación utiliza RPC y muestra el mensaje devuelto. Las funciones administrativas validan `auth.uid()` y `es_administrador_activo()`.

### Caché

La causa principal no era caché: la página cargaba nuevamente el archivo JavaScript fijo. Se actualizaron versiones de los scripts y la Landing consulta Supabase en cada carga. Por ello, el contenido no depende de que Vercel regenere un archivo comercial.

## Solución aplicada

### Fuente canónica

Tabla existente:

```text
tpl_landings_comerciales
```

Nuevos campos:

- `configuracion_borrador`
- `configuracion_publicada`
- `borrador_actualizado_en`
- `publicado_actualizado_en`
- `actualizado_por`
- `publicado_por`

### Bitácora

Nueva tabla:

```text
tpl_landing_bitacora
```

Registra:

- landing;
- acción;
- estado anterior y nuevo;
- versión;
- usuario;
- correo;
- configuración asociada;
- fecha.

### Operaciones

- `tpl_obtener_landing_admin`: obtiene borrador y publicación para el CRM.
- `tpl_guardar_borrador_landing`: actualiza el borrador sin alterar producción.
- `tpl_publicar_landing`: copia el borrador a la versión publicada e incrementa versión.
- `tpl_obtener_landing_publica`: entrega solamente configuración publicada.

### Estados

- `borrador`
- `publicada`
- `archivada`

Se conserva compatibilidad con el valor histórico `pausada` del constraint existente.

## Flujo resultante

1. El CRM carga `land-caburgua` desde Supabase.
2. El administrador edita y valida el formulario.
3. **Guardar borrador** ejecuta `tpl_guardar_borrador_landing`.
4. Se actualizan fecha, usuario y bitácora.
5. La vista previa consulta el borrador desde Supabase.
6. La página pública conserva la versión publicada anterior.
7. **Publicar cambios** ejecuta `tpl_publicar_landing`.
8. La página `/caburgua-premium`, al recargarse, consulta la nueva versión publicada.

## Archivos modificados

- `plataforma/crm/index.html`
- `plataforma/crm/crm-landing-engine.js`
- `plataforma/landing/index.html`
- `plataforma/landing/landing-config.js`
- `plataforma/landing/landing.js`

## Archivos nuevos

- `supabase/migrations/202607230002_landing_canonica_publicacion.sql`
- `pruebas/landing-canonical-flow-tests.mjs`
- `DIAGNOSTICO-Y-CORRECCION-LANDING-CANONICA.md`

## Pruebas ejecutadas

- Validación sintáctica con `node --check`.
- Contrato de lectura pública.
- Contrato de lectura administrativa.
- Guardado de borrador mediante RPC.
- Publicación mediante RPC.
- Mismo identificador `land-caburgua` en lectura, guardado y publicación.
- Ausencia de `localStorage` en CRM Landing Engine y carga de contenido público.
- Ausencia de contenido comercial de Caburgua en `landing-config.js`.

Resultado:

```text
OK: flujo canónico CRM → Supabase → Landing pública
```

## Validación pendiente en producción

No es posible afirmar que la persistencia funciona en otro navegador antes de:

1. aplicar la migración en el Supabase conectado a producción;
2. desplegar los cinco archivos web;
3. realizar una edición controlada desde una cuenta administradora;
4. abrir `/caburgua-premium` en incógnito u otro navegador.

La arquitectura ya no utiliza almacenamiento del navegador para contenido. Cuando la migración y los archivos estén desplegados, ambos navegadores consultarán la misma fila de Supabase.

## Orden de instalación

1. Respaldar la fila actual de `tpl_landings_comerciales`.
2. Aplicar `202607230002_landing_canonica_publicacion.sql`.
3. Verificar que la RPC pública devuelve `land-caburgua`.
4. Copiar los archivos web respetando sus rutas.
5. Desplegar.
6. Guardar un borrador de prueba.
7. Confirmar que la vista pública no cambia.
8. Publicar.
9. Recargar `/caburgua-premium` en incógnito.
10. Revisar `tpl_landing_bitacora`.
