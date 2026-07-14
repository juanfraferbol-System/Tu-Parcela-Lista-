# Base de datos — Diseño inicial Supabase

## Tablas sugeridas

### usuarios
- id UUID primary key
- nombre text
- email text unique
- telefono text
- rol text: cliente, propietario, corredor, admin
- created_at timestamp

### parcelas
- id UUID primary key
- propietario_id UUID
- nombre text
- descripcion text
- comuna text
- region text
- precio integer
- superficie_m2 integer
- lat numeric
- lng numeric
- agua boolean
- luz boolean
- rol boolean
- facilidad_pago boolean
- estado text: borrador, pendiente, aprobada, rechazada, pausada
- created_at timestamp

### fotos_parcelas
- id UUID primary key
- parcela_id UUID
- url text
- orden integer
- tipo text: portada, galeria, plano

### casas
- id UUID primary key
- nombre text
- precio integer
- m2 integer
- habitaciones integer
- descripcion text
- imagen_url text
- plano_url text

### planes
- id UUID primary key
- nombre text
- precio integer
- duracion_dias integer
- destacado boolean
- max_fotos integer

### pagos
- id UUID primary key
- usuario_id UUID
- parcela_id UUID
- plan_id UUID
- proveedor text: mercado_pago
- estado text
- monto integer
- external_reference text
- created_at timestamp

### interesados
- id UUID primary key
- parcela_id UUID
- casa_id UUID nullable
- nombre text
- email text
- telefono text
- mensaje text
- origen text
- estado text: nuevo, contactado, visita, cerrado, descartado
- created_at timestamp

## Política inicial
- Las publicaciones nuevas entran como `pendiente`.
- Solo admin puede aprobar.
- Propietario puede editar sus propias publicaciones mientras estén en borrador o pendiente.
