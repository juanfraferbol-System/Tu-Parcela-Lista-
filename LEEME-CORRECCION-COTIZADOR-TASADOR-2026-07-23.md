# Instalación: corrección del cotizador y Tasador TPL

Este paquete corresponde exclusivamente al proyecto que usa:

`https://qxavbqhyqaqalpzbhwmh.supabase.co`

La carpeta raíz del ZIP es `TU PARCELA LISTA/`.

## Orden obligatorio

### 1. Ejecutar la migración del cotizador

Entra a Supabase → SQL Editor → New query.

Abre el archivo:

`supabase/migrations/202607230005_cotizador_reglas_planes_integridad.sql`

Copia su contenido al SQL Editor y presiona **Run**.

No escribas la ruta del archivo en Git Bash: una ruta no ejecuta una migración SQL.

Comprueba:

```sql
select codigo_plan, orden_visual, nombre
from public.extras
where categoria='fundacion'
order by orden_visual;

select count(*) as reglas_premium
from public.fundacion_extra_reglas
where estado='incluido' and activo=true;
```

Resultado esperado:

- tres planes con códigos `base`, `radier_full`, `premium`;
- seis reglas incluidas en Premium.

### 2. Ejecutar la migración del tasador

En Supabase → SQL Editor abre:

`supabase/migrations/202607230006_tasador_reglas_comerciales_v2.sql`

Copia su contenido y presiona **Run**.

Comprueba:

```sql
select version,estado,algoritmo,parametros
from public.configuracion_tasador
where estado='activa';
```

Resultado esperado:

- versión activa: `tpl-mvp-1.1.0`;
- turismo nacional: `3.00`;
- turismo local: `0.20`;
- acceso a río: `0.10`.

### 3. Desplegar la función Tasador

Desde Git Bash, ubicado en la raíz real del proyecto:

```bash
npx supabase login
npx supabase functions deploy tasar-parcela --project-ref qxavbqhyqaqalpzbhwmh
```

Si ya tienes una sesión iniciada, el primer comando no es necesario.

### 4. Copiar los archivos

Cierra tu editor o evita tener archivos bloqueados.

Abre la carpeta `TU PARCELA LISTA/` del ZIP y copia **su contenido** sobre la raíz de tu proyecto principal, conservando las rutas.

Este paquete contiene únicamente archivos nuevos o modificados.

### 5. Publicar

Si tu proyecto usa Git:

```bash
git add index.html app.js js plataforma/publicar supabase documentacion LEEME-CORRECCION-COTIZADOR-TASADOR-2026-07-23.md
git commit -m "Corregir cotizador y tasador del publicador"
git push origin main
```

### 6. Validar

Abre una ventana privada y prueba:

1. Cotizador: parcela + casa + cada plan de fundación.
2. Agregar y quitar extras.
3. Cambiar de Premium a Base y comprobar que reaparezcan extras.
4. Confirmar que no exista doble cobro.
5. Publicador → Parcela → Calcular precio.
6. Publicador → Casa → Calcular precio.
7. Publicador → Parcela con casa → comprobar desglose terreno/vivienda.
8. En Supabase:

```sql
select id,estado,valor_mercado,confianza,cobertura,algoritmo_version,creada_en
from public.tasaciones
order by creada_en desc
limit 10;

select numero_proyecto,total,origen,creado_en
from public.proyectos
order by creado_en desc
limit 10;

select proyecto_id,tipo,nombre,cantidad,precio_unitario,subtotal
from public.proyecto_items
order by creado_en desc
limit 30;
```

## Comportamiento esperado

- Una parcela consulta y registra la tasación en Supabase.
- Si no existen tres comparables válidos, Supabase informa cobertura insuficiente.
- Solo una tasación persistida puede activar “Valor respaldado”.
- Una casa muestra una referencia de construcción, no del terreno.
- “Parcela con casa” suma ambos componentes.
- El cotizador guarda total e ítems reales.
- Los extras dependen del plan mediante reglas de Supabase.

## Respaldo

Antes de copiar, crea una copia de tu carpeta actual o confirma que todo esté comprometido en Git. El paquete no incluye archivos ajenos ni cambia Landing Premium, CRM, leads, visitas, WhatsApp, Google Ads o SEO.
