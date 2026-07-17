# Mapa real de datos - Publicacion y Tasador TPL

La tabla canonica confirmada es `public.publicaciones`. `publicaciones_parcela` queda como estructura secundaria vacia y no debe recibir nuevas funciones del tasador.

| Campo funcional | Origen frontend | Tabla / columna actual | Tipo actual | Requerido | Uso actual | Calidad | Utilidad tasador | Normalizacion |
|---|---|---|---|---|---|---|---|---|
| Tipo de publicador | `tipoPublicador` | `publicaciones.tipo_publicador` | enum | Si | Publicacion/CRM | Buena | Control y segmentacion | Mantener catalogo |
| Relato privado | `relato` | `publicaciones.descripcion_origen_privada` | text | No | Generacion de contenido | Sensible | No usar en valor | Privado y no exponer |
| Titulo publico | `tituloPublico` | `publicaciones.titulo_publico` | text | Si | Catalogo | Buena | Solo calidad comercial | Longitud y sanitizacion |
| Descripcion publica | `descripcionPublica` | `publicaciones.descripcion_publica` | text | Si | Catalogo | Variable | Completitud, no valor base | Puntaje separado |
| Region | `region` | `publicaciones.region` | text | Si | Catalogo | Completa | Alta | Codigo oficial + etiqueta |
| Comuna | `comuna` | `publicaciones.comuna` | text | Si | Catalogo | Completa | Alta | Codigo oficial, tildes |
| Sector/localidad | `sector` | `publicaciones.sector` | text | Si | Catalogo | Texto libre | Alta | Alias y coordenada centroide |
| Superficie | `superficie` | `publicaciones.superficie_m2` | numeric | Si | Catalogo | Completa | Critica | Guardar siempre en m2 |
| Precio ingresado | `precio` | `publicaciones.precio_publicacion` | bigint | Si | Catalogo | Completa | Comparacion posterior | Clasificar como solicitado/publicado |
| Precio propietario | `montoDueno` | `publicaciones.monto_liquido` | bigint | Condicional | Partner | Vacio remoto | Critica | Renombrado semantico compatible |
| Comision Partner | calculada | `publicaciones.modelo_comercial` | jsonb | Condicional | Vista previa | No normalizada | No entra al valor del inmueble | Porcentaje y monto separados |
| Precio publico | calculado | `publicaciones.precio_publicacion` | bigint | Si | Catalogo | Mezclado | Comparacion | Separar de valor intrinseco |
| Coordenada exacta | mapa/GPS | `latitud_privada`, `longitud_privada` | numeric | No | Mapa/cercania | Completa | Critica | Rango, precision y consentimiento |
| Ubicacion publica | derivada | `ubicacion_publica_aproximada` | text | Si | Catalogo | Completa | No usar como coordenada | Crear lat/lng publicas aproximadas |
| Precision ubicacion | borrador | `datos_formulario` | jsonb | No | Parcial | Variable | Alta para confianza | Columna/catalogo |
| Consentimiento ubicacion | borrador | `datos_formulario` | jsonb | No | Parcial | Variable | Seguridad | Fecha, version y finalidad |
| Rol | `rol` | `publicaciones.rol` | text | No | Publicacion | Completo pero no verificado | Legal/confianza | Estado y verificacion separados |
| Agua | `agua` | `publicaciones.agua` | text | No | Publicacion | Ambigua | Alta | Tipo, estado y verificacion |
| Electricidad | `luz` | `publicaciones.luz` | text | No | Publicacion | Ambigua | Alta | Instalada/cercana/inexistente |
| Acceso | `acceso` | `publicaciones.acceso` | text | No | Publicacion | Vacio remoto | Alta | Pavimento/ripio/tierra + estado |
| Topografia | `topografia` | `publicaciones.topografia` | text | No | Publicacion | Vacio remoto | Alta | Plana/pendiente/mixta |
| Naturaleza | `naturaleza[]` | `publicaciones.naturaleza` | text[] | No | Publicacion | Variable | Media | Catalogo controlado |
| Cuerpos de agua | `cuerposAgua[]` | `publicaciones.cuerpos_agua` | text[] | No | Publicacion | Variable | Media/alta | Presencia no implica derechos |
| Servicios cercanos | `servicios[]` | `publicaciones.servicios` | text[] | No | Publicacion | Variable | Media | Separar declarados y calculados |
| Ciudad principal | `ciudadPrincipal` | `publicaciones.ciudad_principal` | text | No | Publicacion | Variable | Media | Catalogo geocodificado |
| Distancia declarada | `distanciaCiudad` | `publicaciones.distancia_ciudad` | text | No | Publicacion | Texto | Media | Numero, unidad y metodo |
| Facilidad de pago | `facilidadPago` | `publicaciones.facilidad_pago` | boolean | No | Comercial | Buena | Estrategia, no valor fisico | Mantener |
| Detalle de pago | `detalleFacilidad` | `detalle_facilidad_pago` | text | Condicional | Comercial | Variable | Estrategia | Estructurar pie/cuotas |
| Plan | `planCorredor` | `plan_seleccionado`, `plan_contratado` | text | Condicional | Comercial | Duplicada | Control de acceso | FK a plan versionado |
| Datos propietario | campos dueno | columnas `contacto_*` | text | Si | CRM | Sensibles | No usar en calculo | Privado/RLS |
| Datos corredor | campos corredor | columnas `contacto_*` + JSON | text/jsonb | Condicional | CRM | Sensibles | Segmentacion | Perfil autenticado reutilizable |
| Fotografias | `fotos` | `publicacion_fotos` | filas/storage | No | Publicacion | Limites 20/12 inconsistentes | Calidad comercial | Unificar limite y metadatos |
| Fecha de creacion | automatica | `publicaciones.creado_en` | timestamptz | Si | CRM | Buena | Antiguedad | Mantener |
| Fecha publicacion | automatica | `publicaciones.publicada_en` | timestamptz | No | CRM | Disponible | Antiguedad | Historial de eventos |
| Precio negociado | inexistente | inexistente | - | No | No | Ausente | Aprendizaje futuro | Historial tipado |
| Precio final declarado | inexistente | inexistente | - | No | No | Ausente | Critica futura | Venta declarada privada |
| Precio final verificado | inexistente | inexistente | - | No | No | Ausente | Critica futura | Evidencia y revisor |
| Estado de venta | inexistente | enum sin `vendida` | - | No | No | Ausente | Aprendizaje | Eventos, no sobrescritura |
| Consultas/visitas reales | parcial/local | CRM/eventos | variable | No | Incompleto | Baja | Conversion | Eventos de servidor |
| Tasacion | estimador local | inexistente remotamente | - | No | Simulada | No valida | Nueva funcion | Tablas versionadas |

## Datos manuales iniciales de ventas

Se deben cargar solo despues de crear la estructura de antecedentes y marcarlos como verificacion limitada:

1. Laja, Biobio, aproximadamente 5.000 m2, aproximadamente $8.500.000.
2. Sector Nahuelbuta, Nacimiento, aproximadamente 1 hectarea, aproximadamente $15.000.000, informado en mayo sin dia confirmado.

No deben insertarse como ventas verificadas ni utilizarse para entrenar automaticamente el algoritmo.

## Huella de cambio material

La huella de valorizacion debe generarse en backend sobre una representacion canonica y versionada de:

- propiedad o sesion de publicacion;
- superficie normalizada;
- coordenadas redondeadas para la huella privada;
- region, comuna y sector normalizados;
- acceso, topografia, agua y electricidad;
- condicion legal y subdivisoria;
- servicios e infraestructura relevantes;
- mejoras fisicas;
- uso informado;
- precio ingresado solo para decidir si supera el umbral configurable de recotizacion, nunca para estimar el mercado.

Descripcion, fotografias, contacto y orden visual quedan fuera de la huella material.
