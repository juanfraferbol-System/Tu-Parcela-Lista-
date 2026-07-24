# TPL Business — Centro real de clientes

Fecha: 24 de julio de 2026  
Proyecto Supabase: `qxavbqhyqaqalpzbhwmh`

## Resultado

`/plataforma/tpl-business/` dejó de depender de datos demostrativos para la información del proyecto. La interfaz conserva el concepto visual “Mi Proyecto”, pero ahora obtiene cuenta, proyecto, Landing, módulos, salud, métricas, planes y solicitudes desde Supabase.

No se modificaron la Landing Premium, su captura de leads, las visitas, WhatsApp, atribución, Google Ads, SEO, cotizador, publicador, `parcela.html` ni Vercel.

## Orden obligatorio de instalación

1. Ejecutar en el SQL Editor del proyecto correcto:

   ```text
   supabase/migrations/202607240001_tpl_business_centro_clientes.sql
   ```

2. Confirmar que la migración termina con `Success. No rows returned`.
3. Copiar los archivos del paquete sobre la raíz de `TU PARCELA LISTA`.
4. Publicar el frontend.
5. Probar primero con una cuenta administradora.
6. Crear o invitar al usuario real de Caburgua.
7. Crear la membresía después de conocer el correo real.

El frontend no debe publicarse antes de ejecutar la migración. Sin las nuevas RPC, el portal mostrará un error de carga seguro.

## Arquitectura implementada

```text
/plataforma/tpl-business/
├── index.html
├── tpl-business.css
├── tpl-business-config.js
├── tpl-business-auth.js
├── tpl-business-service.js
├── tpl-business.js
└── tpl-business-contract-tests.mjs
```

- `tpl-business-auth.js`: Supabase Auth, sesión, recuperación y cierre.
- `tpl-business-service.js`: única capa de RPC y normalización de errores.
- `tpl-business.js`: experiencia “Mi Proyecto”.
- `tpl-business-config.js`: infraestructura y textos institucionales; no contiene datos de Caburgua.

## Modelo de datos nuevo

- `tpl_business_membresias`
- `tpl_business_modulos_catalogo`
- `tpl_proyecto_modulos`
- `tpl_proyecto_experiencia`
- `tpl_solicitudes_comerciales`
- `tpl_business_accesos`

Se amplía `planes_comerciales` con:

- `objetivo_cliente`
- `beneficios`
- `modulos`
- `visible_tpl_business`
- `orden_tpl_business`

Los planes existentes permanecen ocultos en TPL Business hasta que un administrador marque explícitamente `visible_tpl_business=true`. No se inventan nombres, precios ni beneficios.

## RPC

- `tpl_business_sesion_actual()`
- `tpl_business_mis_proyectos()`
- `tpl_business_proyecto_actual(text)`
- `tpl_business_vista_cliente_admin(text)`
- `tpl_business_registrar_solicitud(text,text,uuid,text,text,text)`
- `tpl_business_registrar_cierre_sesion()`

La función interna `tpl_business_resumen_proyecto(uuid,boolean)` no tiene permiso de ejecución para `anon` ni `authenticated`; solo es utilizada desde RPC que validan autorización.

## Seguridad

- Un propietario consulta únicamente proyectos con membresía activa.
- Cambiar `project` en la URL no concede acceso.
- `admin_project` solo funciona cuando `es_administrador_activo()` devuelve verdadero.
- Las métricas son agregadas y no incluyen nombres, correos ni teléfonos de interesados.
- Las solicitudes se crean únicamente para una membresía activa del usuario.
- El portal no consulta permisos ni datos comerciales desde `localStorage`.
- El CRM continúa requiriendo un registro activo en `profiles` con tipo `administrador`.

## Vista como cliente

El botón se agregó al Centro Comercial del CRM. Abre:

```text
/plataforma/tpl-business/?admin_project=CODIGO_PROYECTO
```

La URL no contiene tokens ni concede acceso por sí sola. TPL Business recupera la sesión existente de Supabase y llama a `tpl_business_vista_cliente_admin()`. Sin una sesión administrativa válida la solicitud es rechazada.

Durante esta vista:

- aparece una franja “Vista administrativa segura”;
- las solicitudes comerciales se deshabilitan;
- el administrador puede revisar Landing, métricas y experiencia.

## Métricas

| Métrica | Fuente |
|---|---|
| Consultas | `crm_interacciones_landing`, `informacion_solicitada` |
| Visitas | `visitas`, filtrada por `proyecto_comercial_id` |
| WhatsApp | `crm_interacciones_landing`, `whatsapp_click` |
| Leads únicos | `crm_oportunidades` |
| Conversiones | oportunidades reservadas o ganadas |
| Última actividad | máximo entre interacciones, visitas y eventos |

Los ceros son datos reales. Cuando un dato no existe o no puede calcularse se muestra `Sin datos todavía`.

## Salud del proyecto

El contrato admite:

```text
pendiente
manual
calculada
```

Caburgua inicia sin porcentaje. La interfaz indica `Evaluación pendiente`; no muestra el antiguo 82 % ficticio.

## Solicitudes comerciales

Tipos:

```text
plan
modulo
recomendacion
```

Estados:

```text
solicitada
contactando
aprobada
activada
rechazada
```

Los botones no activan servicios ni pagos. Solo registran una solicitud vinculada al usuario, cuenta y proyecto.

## Crear el acceso de Caburgua

### 1. Invitar al usuario

En Supabase:

```text
Authentication → Users → Invite user
```

Usar el correo real del propietario. No crear la membresía antes de que el usuario exista en Supabase Auth.

Configurar previamente entre las Redirect URLs permitidas:

```text
https://www.parcelalista.cl/plataforma/tpl-business/
```

Para desarrollo local agregar también la URL local utilizada.

### 2. Vincularlo

Reemplazar únicamente `CORREO_REAL_DEL_CLIENTE` y ejecutar en el SQL Editor:

```sql
do $$
declare
  v_email text := lower(trim('CORREO_REAL_DEL_CLIENTE'));
  v_user_id uuid;
  v_account_id uuid;
  v_project_id uuid;
begin
  if v_email='correo_real_del_cliente' or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Reemplaza CORREO_REAL_DEL_CLIENTE por el correo real';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email)=v_email
  limit 1;

  if v_user_id is null then
    raise exception 'El usuario todavía no existe en Supabase Auth';
  end if;

  select id into v_account_id
  from public.tpl_business_cuentas
  where codigo='cli-caburgua';

  select id into v_project_id
  from public.tpl_proyectos_comerciales
  where codigo='pro-caburgua'
    and cuenta_id=v_account_id;

  if v_account_id is null or v_project_id is null then
    raise exception 'No se encontró la relación canónica de Caburgua';
  end if;

  insert into public.tpl_business_membresias(
    usuario_id,cuenta_id,proyecto_id,rol,estado
  ) values (
    v_user_id,v_account_id,v_project_id,'propietario','activa'
  )
  on conflict(usuario_id,proyecto_id) do update set
    cuenta_id=excluded.cuenta_id,
    rol='propietario',
    estado='activa',
    actualizado_en=now();
end
$$;
```

### 3. Verificar la relación

```sql
select
  u.email,
  m.rol,
  m.estado,
  c.codigo as cuenta,
  p.codigo as proyecto,
  l.codigo as landing,
  l.slug
from public.tpl_business_membresias m
join auth.users u on u.id=m.usuario_id
join public.tpl_business_cuentas c on c.id=m.cuenta_id
join public.tpl_proyectos_comerciales p on p.id=m.proyecto_id
left join public.tpl_landings_comerciales l on l.proyecto_comercial_id=p.id
where lower(u.email)=lower('CORREO_REAL_DEL_CLIENTE');
```

Resultado esperado:

```text
rol: propietario
estado: activa
cuenta: cli-caburgua
proyecto: pro-caburgua
landing: land-caburgua
slug: caburgua-premium
```

## Configurar planes visibles

No ejecutar hasta que nombres, beneficios y precios hayan sido aprobados comercialmente:

```sql
update public.planes_comerciales
set
  visible_tpl_business=true,
  objetivo_cliente='OBJETIVO APROBADO',
  beneficios='["BENEFICIO APROBADO"]'::jsonb,
  modulos='["landing_premium"]'::jsonb,
  orden_tpl_business=10
where codigo='CODIGO_CANONICO_DEL_PLAN'
  and estado='activo';
```

## Validación

Pruebas ejecutadas:

```bash
node plataforma/tpl-business/tpl-business-contract-tests.mjs
node supabase/tpl-business-security-tests.mjs
node plataforma/landing/landing-lead-service-tests.mjs
node pruebas/landing-canonical-flow-tests.mjs
```

También se verificó la sintaxis de todos los JavaScript modificados con `node --check`.

La prueba histórica `supabase/crm-security-tests.mjs` ya fallaba por esperar una interfaz antigua de enlace mágico que hoy redirige al CRM unificado. No está relacionada con esta implementación. `supabase/fase0-security-tests.mjs` también referencia una ruta histórica inexistente: `/plataforma/publicar-parcela/publicar-parcela.js`.

## Validación obligatoria posterior al despliegue

- Acceso sin sesión: debe mostrar login.
- Correo/contraseña incorrectos: debe mostrar error sin revelar detalles.
- Recuperación: debe enviar correo y regresar a la URL autorizada.
- Propietario Caburgua: debe ver solamente `pro-caburgua`.
- Cambiar `?project=`: debe ser rechazado si el proyecto no pertenece al usuario.
- Landing: debe mostrar `/caburgua-premium`.
- Vista escritorio/móvil de Landing: debe funcionar.
- Métricas: deben coincidir con registros reales.
- Solicitud: debe aparecer en `tpl_solicitudes_comerciales`.
- Vista administrativa: debe mostrar la franja de seguridad.
- Cliente en `/plataforma/crm/`: no debe obtener acceso administrativo.
- Consola: sin errores.

## URLs

Local:

```text
http://127.0.0.1:5500/plataforma/tpl-business/
```

Producción:

```text
https://www.parcelalista.cl/plataforma/tpl-business/
```

Landing de Caburgua, sin cambios:

```text
https://www.parcelalista.cl/caburgua-premium
```

## Commit

Después de ejecutar la migración y copiar los archivos:

```bash
git add plataforma/tpl-business/ plataforma/crm/crm-business.js supabase/migrations/202607240001_tpl_business_centro_clientes.sql supabase/tpl-business-security-tests.mjs documentacion/IMPLEMENTACION_TPL_BUSINESS_CENTRO_CLIENTES_2026-07-24.md
git commit -m "Implementar Centro de Clientes TPL Business"
git push origin main
```
