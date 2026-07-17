# Fase 0 de estabilizacion - Tasador TPL

Fecha de verificacion: 2026-07-17.

## Alcance

Revision de solo lectura del formulario `plataforma/publicar-parcela`, servicios de envio, Edge Functions, migraciones SQL, CRM, planes, Flow y esquema remoto expuesto por Supabase.

## Fuente oficial de publicaciones

La tabla canonica actual es `public.publicaciones`:

- Existe en las migraciones desde `202607130001_crear_publicaciones.sql`.
- La Edge Function `publicar-parcela` escribe mediante `crear_publicacion_pendiente` sobre esa tabla.
- El sitio publico consulta esa tabla directamente.
- El esquema remoto contiene 32 registros aprobados.
- `public.publicaciones_parcela` tambien existe remotamente, pero contiene 0 registros.
- `public.tasaciones` todavia no existe.

Decision: mantener `publicaciones` como fuente canonica. No eliminar `publicaciones_parcela` en esta fase; se dejara sin nuevas escrituras y se preparara una migracion posterior solo si se confirma que ningun proceso externo la utiliza.

## Hallazgos criticos

### 1. Exposicion anonima de informacion privada

Una consulta anonima a `publicaciones` devuelve publicaciones aprobadas con columnas de contacto, relato privado, coordenadas exactas, modelo comercial y formulario completo. El esquema remoto no coincide con la revocacion definida en `202607130003_crear_politicas_rls.sql`.

Propuesta:

1. Crear una vista publica sanitizada con solo datos comerciales permitidos.
2. Revocar `SELECT` anonimo y autenticado sobre la tabla base.
3. Conceder lectura publica exclusivamente a la vista sanitizada.
4. Actualizar el catalogo publico para consultar la vista.
5. Mantener CRM y administracion mediante RPC autenticadas existentes.

Reversion: restaurar los permisos anteriores solo desde una migracion explicita. La vista puede eliminarse sin modificar las 32 filas existentes.

### 2. Envio de publicaciones simulado

`submission-service.js` usa `mock-local-v1`; la interfaz puede mostrar exito sin persistencia remota.

Propuesta: conectar el adaptador con la Edge Function `publicar-parcela`, conservar idempotencia y borrador local, y mostrar exito solamente cuando el servidor entregue `publicationId` y codigo publico.

Reversion: revertir el adaptador. No requiere modificar registros existentes.

### 3. Flow incompleto e inseguro

Las funciones API incluyen credenciales de respaldo en el codigo. El webhook consulta el estado en Flow, pero no registra la transaccion ni concede beneficios de manera segura. El frontend tambien contiene retornos y tokens simulados.

Propuesta inmediata:

- Eliminar credenciales de respaldo y exigir variables de entorno.
- No activar planes, creditos ni Premium desde parametros URL o `sessionStorage`.
- Mantener los beneficios pagados desactivados hasta disponer de tabla de transacciones, firma validada, idempotencia y asociacion con usuario/propiedad.

Reversion: volver al codigo anterior no es recomendable porque reintroduce secretos y confianza en el navegador.

### 4. Dos modelos de publicaciones

`publicaciones` es relacional y ya tiene 32 registros. `publicaciones_parcela` es un modelo JSON posterior, esta vacio y tiene politicas diferentes.

Propuesta: no crear una tercera tabla de propiedades. Las tasaciones referenciaran `publicaciones(id)` y conservaran snapshots versionados.

### 5. Precios sin separacion comercial

Los 32 registros remotos tienen `precio_publicacion`, pero `monto_liquido` esta vacio. Los precios deben clasificarse como `precio_publicado_solicitado`; no son ventas verificadas.

Propuesta: agregar campos compatibles para precio solicitado del propietario, comision, precio publico, precio negociado declarado y precio final verificado, mas historial inmutable.

## Calidad remota agregada

| Campo | Completos | Faltantes | Evaluacion |
|---|---:|---:|---|
| precio_publicacion | 32 | 0 | Precio publicado, no venta |
| monto_liquido | 0 | 32 | Requiere separacion propietario/comision |
| superficie_m2 | 32 | 0 | Util, validar unidad y extremos |
| region | 32 | 0 | Normalizar catalogo |
| comuna | 32 | 0 | Normalizar tildes y codigos |
| sector | 32 | 0 | Texto libre, requiere normalizacion |
| latitud_privada | 32 | 0 | Util, actualmente expuesta |
| longitud_privada | 32 | 0 | Util, actualmente expuesta |
| rol | 32 | 0 | Texto libre, no equivale a verificacion |
| agua | 32 | 0 | Texto ambiguo |
| luz | 32 | 0 | Texto ambiguo |
| acceso | 0 | 32 | Critico para tasacion |
| topografia | 0 | 32 | Critico para tasacion |
| creado_en | 32 | 0 | Util para antiguedad interna |

Todas las publicaciones remotas estan en estado `aprobada`.

## Cobertura actual

| Comuna | Registros | Cobertura inicial propuesta |
|---|---:|---|
| Yumbel | 9 | Limitada |
| Florida | 6 | Limitada |
| Nacimiento | 6 | Limitada |
| Quillon | 6 | Limitada |
| Negrete | 2 | Experimental |
| Caburgua | 1 | Informacion insuficiente |
| Pemuco | 1 | Informacion insuficiente |
| Nipas | 1 | Informacion insuficiente |

Ninguna comuna debe marcarse con cobertura suficiente hasta incorporar datos verificados, antiguedad y comparables independientes.

## Validaciones antes de produccion

- Ejecutar la migracion de privacidad en una copia o entorno de staging.
- Confirmar que el catalogo publico funciona solo con la vista sanitizada.
- Confirmar que anon no puede consultar la tabla base.
- Confirmar que CRM autenticado conserva sus RPC.
- Verificar que ninguna integracion externa escribe en `publicaciones_parcela`.
- Configurar secretos de Flow exclusivamente en Vercel.
- Desplegar y probar la Edge Function de publicacion antes de retirar el modo simulado.

## Riesgos abiertos

- No hay credencial `service_role` ni enlace CLI local para inspeccionar politicas completas o aplicar migraciones.
- La API anonima permite comprobar tablas y filas expuestas, pero no catalogar todas las politicas internas.
- No existe historial de precios ni ventas verificadas suficiente para confianza alta.
- Los cambios previos del modulo de publicacion aun no estan confirmados en Git y deben preservarse.
