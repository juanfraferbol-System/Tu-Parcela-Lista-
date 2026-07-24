# Fase 2A.1 — Migración estructural preparada

Esta entrega prepara la base del Centro de Control Operativo. **No ejecuta SQL**.

## Decisiones

- `tpl_proyectos_comerciales` queda como proyecto maestro comercial.
- `proyectos` continúa como cotización/proyecto técnico.
- La relación entre ambos es opcional y uno-a-muchos.
- `clientes` continúa representando personas.
- `tpl_business_cuentas` continúa representando cuentas/tenants.
- `tpl_cuenta_contactos` relaciona comercialmente cuentas y personas.
- `tpl_business_membresias` continúa controlando acceso Auth.
- `crm_eventos` continúa siendo telemetría sin PII.
- `crm_actividades` registra actividad humana.
- `crm_tareas` continúa siendo la fuente de próximas acciones.

## Archivos

- `supabase/migrations/202607240002_centro_control_operativo.sql`
- `supabase/rollback/202607240002_centro_control_operativo_rollback.sql`
- `supabase/centro-control-operativo-contract-tests.mjs`
- `documentacion/FASE_2A_1_MIGRACION_CENTRO_CONTROL_2026-07-24.md`

## Objetos nuevos propuestos

- `crm_flujos`
- `crm_flujo_etapas`
- `tpl_cuenta_contactos`
- `crm_proyecto_etapas`
- `crm_actividades`
- `crm_centro_control_bitacora`

## Contratos administrativos

- `crm_centro_control_resumen()`
- `crm_centro_control_estados(limite,offset)`
- `crm_mapa_proyectos()`
- `crm_cliente_operativo(cliente_id)`
- `crm_proyecto_operativo(proyecto_id)`

Todos exigen `es_administrador_activo()`.

## Caburgua

El backfill:

1. busca su publicación canónica;
2. vincula `pro-caburgua` por UUID;
3. asigna el flujo `venta_propiedad`;
4. crea etapas sin duplicarlas;
5. determina estados exclusivamente con publicación, Landing, oportunidades, visitas y reservas existentes;
6. no crea propietario, correo, responsable ni membresía.

Si la publicación o la Landing son anteriores a la creación formal del proyecto
comercial, el inicio de la etapa usa la fecha más antigua. Esto evita invertir
`iniciada_en` y `completada_en`.

## Seguridad

- RLS activa en todas las tablas nuevas.
- Administración limitada a administradores activos.
- El propietario no recibe `SELECT` directo sobre tablas operativas.
- Las etapas se entregan mediante `tpl_business_etapas_proyecto`.
- Las actividades visibles se entregan mediante `tpl_business_actividades_proyecto`.
- La función de progreso exige administrador activo o membresía activa del proyecto.
- La RPC de actividades filtra `visibilidad='cliente'` y no selecciona `notas_internas`.
- Las funciones `SECURITY DEFINER` utilizan un `search_path` endurecido.

## Reversibilidad

El rollback elimina solamente los objetos y columnas de esta propuesta. Antes de
utilizarlo en un entorno con datos, deben exportarse flujos, etapas, actividades
y bitácora, porque esas estructuras sí se perderían.

## Aplicación futura

No ejecutar hasta aprobar:

1. nombres de flujos y estados;
2. relación cuenta–contacto;
3. contratos JSON;
4. reglas de Caburgua;
5. políticas de lectura del propietario.

Después de aprobar, ejecutar el SQL en Supabase SQL Editor. La ruta del archivo
no debe ejecutarse como comando Bash.
