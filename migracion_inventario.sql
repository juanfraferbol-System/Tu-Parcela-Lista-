-- 1. ACTUALIZAR POLÍTICAS RLS (Seguridad)
-- Permitir a cualquier visitante (anon) leer parcelas APROBADAS
CREATE POLICY "Permitir lectura publica de parcelas aprobadas"
  ON public.publicaciones
  FOR SELECT
  TO anon
  USING (estado = 'aprobada');

-- Permitir a los administradores leer TODO y editar
CREATE POLICY "Permitir lectura admin"
  ON public.publicaciones
  FOR SELECT
  TO authenticated
  USING (public.crm_exigir_administrador() IS NOT NULL);

CREATE POLICY "Permitir update admin"
  ON public.publicaciones
  FOR UPDATE
  TO authenticated
  USING (public.crm_exigir_administrador() IS NOT NULL);

-- 2. MIGRAR INVENTARIO ACTUAL

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'perigallo_yumbel', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Parcela cercada con linda vista sector Perigallo - Yumbel', 'Hermosa parcela de 5.000 m² ubicada en un entorno tranquilo de Yumbel. Se encuentra completamente cercada con portón de madera, limpia y lista para desarrollar un proyecto habitacional o de descanso. Destaca por su excelente vista panorámica y su entorno natural. La factibilidad eléctrica se encuentra en proceso de conexión y cuenta con Rol Propio.',
  20000000, 5000, 'Biobío', 'Yumbel', 'N/A', '120 km',
  -37.04244276437281, -72.64501423010334, 'si', 'no', 'no', '{"imagen_principal":"image/duenos/yumbel/pirigallo/pirigallo_(1).webp","imagenes":["image/duenos/yumbel/pirigallo/pirigallo_(1).webp","image/duenos/yumbel/pirigallo/pirigallo_(2).webp","image/duenos/yumbel/pirigallo/pirigallo_(3).webp","image/duenos/yumbel/pirigallo/pirigallo_(4).webp","image/duenos/yumbel/pirigallo/pirigallo_(5).webp","image/duenos/yumbel/pirigallo/pirigallo_(6).webp"],"naturaleza":"si","servicios":"no","destacada":"no","tiempoConcepcion":"2 h"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'venega_ñipas', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Lomas Coloradas - Ñipas', 'Parcelas de 5.000 m² ubicadas en el sector Lomas Coloradas de Ñipas, en pleno Valle del Itata. Un entorno natural con hermosas vistas, excelente clima y acceso cercano a la Ruta del Itata, ideal para quienes buscan tranquilidad, descanso o desarrollar un proyecto de vida en el campo. Cuentan con Rol Propio y factibilidad eléctrica.',
  25000000, 5000, 'Biobío', 'Ñipas', 'N/A', '120 km',
  -36.636288, -72.564494, 'si', 'no', 'si', '{"imagen_principal":"image/nipas_venega/nipas_venegas (1).webp","imagenes":["image/nipas_venega/nipas_venegas (1).webp","image/nipas_venega/nipas_venegas (2).webp","image/nipas_venega/nipas_venegas (3).webp","image/nipas_venega/nipas (1).png","image/nipas_venega/nipas (2).webp","image/nipas_venega/nipas (3).webp"],"naturaleza":"si","servicios":"no","destacada":"si","tiempoConcepcion":"2 h"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'el_roble', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'El Roble Nativo – Nacimiento', 'Parcela de 5.000 m² ubicada en el sector El Roble, comuna de Nacimiento, en un entorno natural asociado a la Cordillera de Nahuelbuta. Ideal para quienes buscan tranquilidad, vegetación nativa y un proyecto de descanso o inversión en la Región del Biobío. La zona de Nahuelbuta destaca por su biodiversidad, presencia de bosque nativo y paisajes de alto valor natural. Actualmente quedan solo dos parcelas disponibles en este proyecto.',
  6690000, 5000, 'Biobío', 'Nacimiento', 'N/A', '120 km',
  -37.54761, -72.94834, 'si', 'no', 'no', '{"imagen_principal":"image/nacimiento/nac_el_roble/el_roble (5).webp","imagenes":["image/nacimiento/nac_el_roble/el_roble (5).webp","image/nacimiento/nac_el_roble/el_roble (1).webp","image/nacimiento/nac_el_roble/el_roble (2).webp","image/nacimiento/nac_el_roble/el_roble (3).webp","image/nacimiento/nac_el_roble/el_roble (4).webp","image/nacimiento/nac_el_roble/el_roble (6).webp","image/nacimiento/nac_el_roble/el_roble (7).webp"],"naturaleza":"si","servicios":"no","destacada":"si","tiempoConcepcion":"2 h"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'chequenal_parcela_13', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Chequenal Nativo – Parcela 13 | Nacimiento', 'Parcela de 5.000 m² ubicada en el sector Chequenal, comuna de Nacimiento, rodeada de un agradable entorno natural característico del Biobío. Cuenta con factibilidad de energía eléctrica y Rol Propio, convirtiéndose en una excelente alternativa para construir una vivienda, una segunda residencia o desarrollar un proyecto familiar. Su ubicación permite disfrutar de tranquilidad, privacidad y contacto permanente con la naturaleza, manteniendo una conveniente conexión con la ciudad de Nacimiento.',
  13658000, 5000, 'Biobío', 'Nacimiento', 'N/A', 'N/A',
  -37.365243, -72.723828, 'si', 'no', 'si', '{"imagen_principal":"image/nacimiento/nac_cheque_12/nac_chequenal_129_ (2).webp","imagenes":["image/nacimiento/nac_cheque_12/nac_chequenal_129_ (2).webp","image/nacimiento/nac_cheque_12/nac_chequenal_129_ (1).webp","image/nacimiento/nac_cheque_12/nac_chequenal_129_ (3).webp","image/nacimiento/nac_cheque_12/nac_chequenal_129_ (4).webp","image/nacimiento/nac_cheque_12/nac_chequenal_129_ (5).webp","image/nacimiento/nac_cheque_12/nac_chequenal_129_ (6).webp","image/nacimiento/nac_cheque_12/nac_chequenal_129_ (7).webp","image/nacimiento/nac_cheque_12/nac_chequenal_129_ (8).webp","image/nacimiento/nac_cheque_12/nac_chequenal_129_ (9).webp","image/nacimiento/nac_cheque_12/nac_chequenal_129_ (10).webp"],"naturaleza":"si","servicios":"no","destacada":"si"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'chequenal_parcela_44', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Chequenal Premium con Arroyo | Nacimiento', 'Exclusiva parcela de 5.000 m² ubicada en el sector Chequenal, comuna de Nacimiento, en un entorno donde predominan los bosques nativos y los paisajes propios de la provincia del Biobío. La propiedad cuenta con un hermoso arroyo natural que atraviesa el terreno durante gran parte del año, poste de energía eléctrica instalado al interior de la parcela, Rol Propio y locomoción colectiva a la puerta, características que permiten comenzar un proyecto de forma inmediata. Nacimiento es una comuna reconocida por la unión de los ríos Biobío y Vergara, además de su cercanía a la Cordillera de Nahuelbuta, ofreciendo un entorno privilegiado para quienes buscan tranquilidad, vida al aire libre y contacto permanente con la naturaleza. En pocos minutos es posible acceder al centro urbano, comercio, establecimientos educacionales y servicios básicos. Esta parcela representa una excelente oportunidad tanto para construir una vivienda definitiva como una segunda residencia o un proyecto turístico, combinando plusvalía, conectividad y un entorno natural difícil de encontrar en el mercado actual.',
  15800000, 5000, 'Biobío', 'Nacimiento', 'N/A', 'N/A',
  -37.365363, -72.718449, 'si', 'si', 'si', '{"imagen_principal":"image/nacimiento/nac_cheque_15/chequenal_44 (10).webp","imagenes":["image/nacimiento/nac_cheque_15/chequenal_44 (10).webp","image/nacimiento/nac_cheque_15/chequenal_44 (6).webp","image/nacimiento/nac_cheque_15/chequenal_44 (7).webp","image/nacimiento/nac_cheque_15/chequenal_44 (8).webp","image/nacimiento/nac_cheque_15/chequenal_44 (9).webp","image/nacimiento/nac_cheque_15/chequenal_44 (1).webp"],"naturaleza":"si","servicios":"si","destacada":"si"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'santa_ana_media_hectarea', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Santa Ana – 5.000 m² | Quillón', 'Parcela de 5.000 m² ubicada en el sector Santa Ana, comuna de Quillón, Región de Ñuble. Una excelente oportunidad para quienes buscan tranquilidad, aire limpio y un entorno rural con buena conectividad. El terreno cuenta con Rol Propio y factibilidad de energía eléctrica, ofreciendo una base ideal para construir una vivienda permanente, una casa de descanso o desarrollar un proyecto familiar. Quillón es reconocido como uno de los principales destinos turísticos de la Región de Ñuble gracias a sus lagunas, viñas, gastronomía campestre y actividades recreativas durante todo el año. Desde esta ubicación es posible acceder fácilmente al centro de Quillón, donde encontrarás supermercados, centros de salud, colegios, bancos, restaurantes y todos los servicios necesarios para la vida diaria. Además, la comuna mantiene una creciente demanda por parcelas de agrado, convirtiéndose en una interesante alternativa de inversión con proyección de plusvalía. Si sueñas con vivir rodeado de naturaleza sin alejarte de los servicios esenciales, esta parcela reúne las condiciones para comenzar ese proyecto.',
  8490000, 5000, 'Biobío', 'Quillón', 'N/A', '55 km',
  -36.828756, -72.522014, 'si', 'no', 'si', '{"imagen_principal":"image/eric_arrepol/huacamala/santa_ana_1.webp","imagenes":["image/eric_arrepol/huacamala/santa_ana_1.webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (1).webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (2).webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (3).webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (4).webp","image/eric_arrepol/huacamala/gps_arreglado.webp"],"naturaleza":"no","servicios":"no","destacada":"no","tiempoConcepcion":"50 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'florida_d2', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Las Ulloas – Parcela D2 | Florida', 'Parcela de 5.000 m² ubicada en el sector Las Ulloas, comuna de Florida, Región del Biobío. Destaca por sus suelos fértiles, buena humedad natural y un entorno campestre ideal para desarrollar proyectos agrícolas, frutales, huertos o simplemente construir una vivienda rodeada de tranquilidad. El terreno cuenta con Rol Propio y factibilidad de energía eléctrica, ofreciendo excelentes condiciones para comenzar un proyecto de vida o inversión. La comuna de Florida es reconocida por su tradición agrícola y forestal, además de sus hermosos paisajes rurales y su cercanía a la Reserva Nacional Nonguén, uno de los principales pulmones verdes de la región. Su ubicación permite llegar al centro de Florida en aproximadamente 15 minutos y a Concepción en cerca de 35 minutos, facilitando el acceso a universidades, centros de salud, comercio y servicios. Una excelente oportunidad para quienes desean disfrutar de la vida de campo sin renunciar a la conectividad con la capital regional.',
  24360000, 5000, 'Biobío', 'Florida', 'N/A', '38 km',
  -36.854346, -72.764013, 'si', 'no', 'si', '{"imagen_principal":"image/samuel_florida/lote_d2/lote_d2_ (2).webp","imagenes":["image/samuel_florida/lote_d2/lote_d2_ (2).webp","image/samuel_florida/lote_d2/lote_d2_ (3).webp","image/samuel_florida/lote_d2/lote_d2_ (4).webp","image/samuel_florida/lote_d2/lote_d2_ (5).webp","image/samuel_florida/lote_d2/lote_d2_ (6).webp","image/samuel_florida/lote_d2/lote_d2_ (7).webp","image/samuel_florida/lote_d2/lote_d2_ (8).webp","image/samuel_florida/lote_d2/lote_d2_ (9).webp"],"naturaleza":"si","servicios":"no","destacada":"no","tiempoConcepcion":"35 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'los_guindos_media_hectarea', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Los Guindos Nativo – Bosque Nahuelbuta | Nacimiento', 'Parcela de 5.000 m² ubicada en el sector Los Guindos, comuna de Nacimiento, inmersa en el privilegiado entorno de la Cordillera de Nahuelbuta, uno de los paisajes naturales más emblemáticos del sur de Chile. Rodeada de bosque nativo, esta propiedad ofrece un ambiente de absoluta tranquilidad, aire puro y una biodiversidad característica de la zona, donde predominan especies como robles, coigües, canelos y una variada fauna silvestre. Durante el invierno es posible apreciar heladas e incluso nevadas en sectores altos de la cordillera, entregando postales únicas a lo largo del año. La parcela cuenta con Rol Propio, siendo una excelente alternativa para desarrollar una segunda vivienda, una cabaña de montaña o un proyecto de ecoturismo. Su entorno invita a disfrutar de caminatas, fotografía de naturaleza, observación de aves y una verdadera desconexión del ritmo urbano. Si buscas invertir en un lugar con alto valor paisajístico y un entorno natural difícil de encontrar, Los Guindos representa una excelente oportunidad para construir tu proyecto de vida en plena naturaleza.',
  9578000, 5000, 'Biobío', 'Nacimiento', 'N/A', '120 km',
  -37.53577, -72.9466, 'si', 'no', 'no', '{"imagen_principal":"image/nacimiento/los_guindos/los_guindos_89 _arreglada_.webp","imagenes":["image/nacimiento/los_guindos/los_guindos_89_1 (1).webp","image/nacimiento/los_guindos/los_guindos_89_1 (2).webp","image/nacimiento/los_guindos/los_guindos_89_1 (3).webp","image/nacimiento/los_guindos/los_guindos_89_gps.webp"],"naturaleza":"si","servicios":"no","destacada":"no","tiempoConcepcion":"2 h"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'el_nogal', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'El Nogal – Campo de 10.700 m² | Río Claro, Yumbel', 'Campo de 10.700 m² ubicado en el sector Río Claro, comuna de Yumbel, una zona rural reconocida por sus tradiciones campesinas, producción de hortalizas, cerezas, frutillas y viñas. La propiedad destaca por ser un terreno plano, limpio y de gran superficie, ideal para quienes buscan desarrollar un proyecto familiar, agrícola, turístico o de inversión. Su tamaño superior a una hectárea permite proyectar vivienda, quincho, huerto, áreas verdes, bodegas, cabañas o espacios productivos con mayor libertad que una parcela tradicional de 5.000 m². El sector Río Claro se caracteriza por sus paisajes campestres y por la presencia del río Claro, uno de los principales cursos de agua de la comuna de Yumbel, visitado durante el verano por turistas y familias que buscan descanso y naturaleza. Además, la ubicación se encuentra a solo 7 minutos del pueblo de Río Claro y mantiene buena conexión hacia Yumbel, Los Ángeles y Concepción. Una excelente alternativa para invertir en tierra, vivir con más espacio o levantar un proyecto con proyección en una zona de alta identidad rural del Biobío.',
  36720000, 10700, 'Biobío', 'Yumbel', 'N/A', '75 km',
  -37.18659, -72.64762, 'si', 'no', 'no', '{"imagen_principal":"image/rio_claro_nery/el_nogal/el nogal (4).webp","imagenes":["image/rio_claro_nery/el_nogal/el nogal (4).webp","image/rio_claro_nery/el_nogal/el nogal (1).webp","image/rio_claro_nery/el_nogal/el nogal (2).webp","image/rio_claro_nery/el_nogal/el nogal (3).webp","image/rio_claro_nery/el_nogal/el nogal (5).webp","image/rio_claro_nery/el_nogal/el nogal (6).webp"],"naturaleza":"no","servicios":"si","destacada":"si","tiempoConcepcion":"1 h"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'yumbel_ruta_6500mts2', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Ruta Concepción–Yumbel | Parcela 6.500 m²', 'Parcela de 6.500 m² estratégicamente ubicada en la ruta que conecta Concepción con Yumbel y Los Ángeles, ofreciendo una excelente combinación entre conectividad y tranquilidad. La propiedad se entrega con puntera de agua instalada y cerco perimetral, permitiendo comenzar un proyecto de manera inmediata. Gracias a su acceso expedito y cercanía a la Ruta 146, es una alternativa ideal para construir una vivienda permanente, una segunda residencia o desarrollar un emprendimiento compatible con la normativa vigente. Yumbel es una comuna con fuerte tradición agrícola, turística y religiosa, reconocida a nivel nacional por el Santuario de San Sebastián, que cada año recibe miles de peregrinos, además de contar con comercio, servicios y una creciente demanda por parcelas de agrado. Su ubicación permite desplazarse cómodamente hacia Concepción, Cabrero y Los Ángeles, convirtiéndola en una excelente oportunidad para quienes buscan invertir en un terreno con alta accesibilidad y proyección de valorización.',
  15800000, 6500, 'Biobío', 'Yumbel', 'N/A', '55 km',
  -36.99474, -72.59144, 'no', 'no', 'si', '{"imagen_principal":"image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (2).webp","imagenes":["image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (2).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (1).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (3).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (4).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (5).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_plano_completo.webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/plano.webp"],"naturaleza":"no","servicios":"si","destacada":"si","tiempoConcepcion":"40 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'yumbel_ruta_7000mts2', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Ruta Concepción–Yumbel Premium | Parcela 7.000 m²', 'Amplia parcela de 7.000 m² ubicada en un estratégico sector de la ruta que une Concepción, Cabrero y Yumbel, una de las principales vías de conexión del Biobío. Su superficie superior al estándar permite desarrollar con mayor comodidad una vivienda, jardines, piscina, quincho, huerto o incluso un proyecto familiar o turístico, manteniendo amplios espacios libres. El terreno es predominantemente plano y cuenta con factibilidad de energía eléctrica, ofreciendo excelentes condiciones para iniciar un proyecto de forma rápida. Gracias a su ubicación, es posible llegar a Concepción en aproximadamente 40 minutos y acceder fácilmente a Cabrero, Yumbel y Los Ángeles. La comuna de Yumbel destaca por su actividad agrícola, su reconocido Santuario de San Sebastián —uno de los principales centros de peregrinación del país— y una creciente demanda por parcelas de agrado debido a su excelente conectividad. Una oportunidad ideal para quienes buscan invertir en un terreno con gran proyección de valorización y una ubicación privilegiada dentro de la Región del Biobío.',
  24980000, 7000, 'Biobío', 'Yumbel', 'N/A', '55 km',
  -36.992761, -72.590585, 'no', 'no', 'si', '{"imagen_principal":"image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (7).webp","imagenes":["image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (7).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (1).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (5).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (6).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/plano.webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (8).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (10).webp"],"naturaleza":"no","servicios":"si","destacada":"si","tiempoConcepcion":"40 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'pano_largo', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Paño Largo – Campo de 4,02 Hectáreas | Río Claro, Yumbel', 'Campo de 40.200 m² (4,02 hectáreas) ubicado en el sector Río Claro, comuna de Yumbel, una zona reconocida por su tradición agrícola, paisajes rurales y excelente conectividad dentro de la Región del Biobío. Gracias a su amplia superficie, esta propiedad ofrece múltiples posibilidades de desarrollo, siendo ideal para proyectos agrícolas, ganaderos, frutales, forestales o turísticos, además de permitir la construcción de una vivienda principal junto con infraestructura complementaria como galpones, bodegas, caballerizas o cabañas. El sector se caracteriza por su tranquilidad, suelos aptos para diversos cultivos y cercanía al río Claro, que aporta un entorno natural muy valorado por quienes buscan calidad de vida fuera de la ciudad. A pocos minutos se encuentra el pueblo de Río Claro y existe una buena conexión hacia Yumbel, Cabrero, Los Ángeles y Concepción. Con Rol Propio y una superficie poco común dentro del mercado de parcelas de agrado, Paño Largo representa una excelente oportunidad para invertir en un campo con gran potencial productivo y de valorización a futuro.',
  50480000, 40200, 'Biobío', 'Yumbel', 'N/A', '75 km',
  -37.1904519, -72.6527261, 'si', 'no', 'no', '{"imagen_principal":"image/rio_claro_nery/pano_largo/pano_largo (3).webp","imagenes":["image/rio_claro_nery/pano_largo/pano_largo (3).webp","image/rio_claro_nery/pano_largo/pano_largo (4).webp","image/rio_claro_nery/pano_largo/pano_largo (5).webp","image/rio_claro_nery/pano_largo/pano_largo (6).webp","image/rio_claro_nery/pano_largo/pano_largo (4).webp"],"naturaleza":"no","servicios":"si","destacada":"no","tiempoConcepcion":"1 h"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'las_petacas', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Las Petacas – Campo de 4,36 Hectáreas | Río Claro, Yumbel', 'Campo de 43.600 m² (4,36 hectáreas) ubicado en el sector Río Claro, comuna de Yumbel, una zona que combina la tranquilidad del campo con una excelente conectividad dentro de la Región del Biobío. Gracias a su amplia superficie y entorno natural, esta propiedad ofrece un gran potencial para desarrollar proyectos agrícolas, turísticos, recreativos o familiares. Su extensión permite proyectar una vivienda principal, cabañas, glamping, quinchos, áreas recreativas, huertos, frutales o infraestructura para actividades rurales. Yumbel es reconocido a nivel nacional por el Santuario de San Sebastián, uno de los principales centros de peregrinación de Chile, que cada año recibe una gran cantidad de visitantes, impulsando el turismo local y los servicios asociados. Además, el sector de Río Claro destaca por sus paisajes campestres, la cercanía al río Claro y diversos espacios ideales para disfrutar de la naturaleza y la vida al aire libre. Con Rol Propio y una ubicación privilegiada a pocos minutos del pueblo de Río Claro, este campo representa una excelente oportunidad para invertir en una propiedad con múltiples posibilidades de desarrollo y una atractiva proyección de valorización.',
  46400000, 43600, 'Biobío', 'Yumbel', 'N/A', '75 km',
  -37.1906555, -72.6525468, 'si', 'no', 'no', '{"imagen_principal":"image/rio_claro_nery/las_petacas/las_petacas_principal_2.webp","imagenes":["image/rio_claro_nery/las_petacas/las_petacas_principal_2.webp","image/rio_claro_nery/las_petacas/las_petacas (1).webp","image/rio_claro_nery/las_petacas/las_petacas (2).webp","image/rio_claro_nery/las_petacas/las_petacas (1).webp"],"naturaleza":"no","servicios":"si","destacada":"no","tiempoConcepcion":"1 h"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'florida_b2', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Las Ulloas Premium – Parcela B2 | Florida', 'Parcela de 5.021 m² ubicada en el sector Las Ulloas, comuna de Florida, Región del Biobío. Cuenta con Rol Propio y factibilidad de energía eléctrica, ofreciendo una excelente oportunidad para construir una vivienda permanente, una casa de descanso o desarrollar un proyecto de inversión. Su entorno destaca por la tranquilidad del campo, amplias vistas panorámicas y un paisaje característico de la zona precordillerana del Biobío. Florida es una comuna reconocida por su tradición agrícola y forestal, además de ser una de las puertas de acceso a la Reserva Nacional Nonguén, un área protegida que conserva uno de los últimos grandes bosques nativos del valle central de Chile y que ofrece senderos, observación de flora y fauna, además de actividades de turismo de naturaleza. La propiedad se encuentra a pocos minutos del centro de Florida y aproximadamente a 35 minutos de Concepción, permitiendo disfrutar de la tranquilidad rural con una excelente conexión hacia la capital regional, universidades, hospitales y servicios. Una alternativa ideal para quienes buscan calidad de vida, contacto con la naturaleza y una inversión con proyección de plusvalía.',
  24377000, 5021, 'Biobío', 'Florida', 'N/A', '38 km',
  -36.8546817, -72.7665286, 'si', 'no', 'si', '{"imagen_principal":"image/samuel_florida/lote_b2/b2_arreglada_.webp","imagenes":["image/samuel_florida/lote_b2/b2_arreglada_.webp","image/samuel_florida/lote_b2/lote_b2 (1).webp","image/samuel_florida/lote_b2/lote_b2 (2).webp","image/samuel_florida/lote_b2/lote_b2 (3).webp","image/samuel_florida/lote_b2/lote_b2 (5).webp"],"naturaleza":"si","servicios":"no","destacada":"si","tiempoConcepcion":"35 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'florida_a', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Las Ulloas Premium – Parcela A | Florida', 'Exclusiva parcela de 6.800 m² ubicada en el sector Las Ulloas, comuna de Florida, Región del Biobío. Su superficie superior al estándar entrega mayor privacidad y libertad para desarrollar una vivienda de alto nivel, amplios jardines, quincho, piscina, huertos, frutales o cualquier proyecto familiar que requiera espacios generosos. Rodeada de abundante vegetación y un entorno campestre característico de la zona, esta propiedad ofrece la tranquilidad de la vida rural sin alejarse de los principales centros urbanos. Cuenta con Rol Propio y se encuentra a pocos minutos del centro de Florida, con acceso expedito hacia Concepción en aproximadamente 35 minutos. La comuna es reconocida por sus paisajes agrícolas, bosques nativos y por ser una de las puertas de entrada a la Reserva Nacional Nonguén, un importante santuario de biodiversidad donde es posible disfrutar de senderismo, observación de aves y naturaleza durante todo el año. Esta parcela representa una excelente oportunidad para quienes buscan una mayor calidad de vida, invertir en un sector con creciente demanda y disfrutar de un entorno natural privilegiado con una excelente conectividad.',
  33200000, 6800, 'Biobío', 'Florida', 'N/A', '38 km',
  -36.85464, -72.76762, 'si', 'no', 'no', '{"imagen_principal":"image/samuel_florida/lote_a/a_florida_arreglada.webp","imagenes":["image/samuel_florida/lote_a/a_florida_arreglada.webp","image/samuel_florida/lote_a/lote_a (1).webp","image/samuel_florida/lote_a/lote_a (2).webp","image/samuel_florida/lote_a/lote_a (3).webp"],"naturaleza":"si","servicios":"no","destacada":"no","tiempoConcepcion":"35 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'florida_c', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Las Ulloas Vista Panorámica – Parcela C | Florida', 'Exclusiva parcela de 9.800 m² ubicada en el sector Las Ulloas, comuna de Florida, Región del Biobío. Su superficie cercana a una hectárea entrega amplios espacios para desarrollar una vivienda de alto estándar, jardines, quincho, piscina, huertos, frutales o un proyecto familiar con total privacidad. La propiedad destaca por su privilegiada vista panorámica, un bosque de eucaliptos que aporta belleza y sombra natural, además de afloramientos de piedra de cuarzo que entregan un carácter único al paisaje. Cuenta con Rol Propio y factibilidad de energía eléctrica, ofreciendo excelentes condiciones para materializar un proyecto de vida en un entorno campestre. Florida es una comuna reconocida por sus paisajes agrícolas, bosques nativos y su cercanía a la Reserva Nacional Nonguén, un importante refugio de biodiversidad donde es posible realizar senderismo, observación de aves y disfrutar de la naturaleza durante todo el año. A solo 35 minutos de Concepción, esta propiedad combina la tranquilidad del campo con una excelente conectividad hacia la capital regional, convirtiéndose en una alternativa ideal tanto para residencia permanente como para inversión con proyección de plusvalía.',
  47580000, 9800, 'Biobío', 'Florida', 'N/A', '38 km',
  -36.85365, -72.76631, 'si', 'no', 'si', '{"imagen_principal":"image/samuel_florida/lote_c/lote_c (3).webp","imagenes":["image/samuel_florida/lote_c/lote_c (3).webp","image/samuel_florida/lote_c/lote_c (1).webp","image/samuel_florida/lote_c/lote_c (2).webp","image/samuel_florida/lote_c/lote_c (4).webp","image/samuel_florida/lote_c/lote_c (5).webp","image/samuel_florida/lote_c/lote_c (6).webp","image/samuel_florida/lote_c/lote_c (7).webp"],"naturaleza":"si","servicios":"no","destacada":"no","tiempoConcepcion":"35 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'florida_b3', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Las Ulloas – Casa de Campo Premium | Florida', 'Exclusiva propiedad ubicada en el sector Las Ulloas, comuna de Florida, que combina la tranquilidad del campo con una excelente conectividad hacia Concepción. Emplazada sobre un terreno de 11.000 m² (1,1 hectáreas), esta casa de campo se encuentra lista para disfrutar y ofrece amplios espacios exteriores ideales para la vida familiar, el descanso o el teletrabajo en un entorno natural. La vivienda dispone de dos habitaciones, cómoda cocina y espacios diseñados para disfrutar durante todo el año. En el exterior destacan una piscina y una tinaja, perfectas para compartir con familia y amigos, además de un amplio terreno con potencial para jardines, huertos, frutales, ampliaciones o la construcción de cabañas complementarias. La comuna de Florida es reconocida por su entorno agrícola, bosques nativos y su cercanía a la Reserva Nacional Nonguén, uno de los principales pulmones verdes de la Región del Biobío, ideal para senderismo, observación de aves y actividades al aire libre. A solo 35 minutos de Concepción, esta propiedad ofrece la posibilidad de vivir rodeado de naturaleza sin renunciar a la cercanía de universidades, centros de salud, comercio y servicios. Una excelente oportunidad para quienes buscan una casa de campo de alto estándar, una segunda vivienda o una inversión con proyección de valorización.',
  150000000, 11000, 'Biobío', 'Florida', 'N/A', '38 km',
  -36.85471, -72.7661, 'si', 'no', 'si', '{"imagen_principal":"image/samuel_florida/lote_b3_casa/florida_b3 (10).webp","imagenes":["image/samuel_florida/lote_b3_casa/florida_b3 (10).webp","image/samuel_florida/lote_b3_casa/florida_b3 (1).webp","image/samuel_florida/lote_b3_casa/florida_b3 (2).webp","image/samuel_florida/lote_b3_casa/florida_b3 (3).webp","image/samuel_florida/lote_b3_casa/florida_b3 (4).webp","image/samuel_florida/lote_b3_casa/florida_b3 (5).webp","image/samuel_florida/lote_b3_casa/florida_b3 (6).webp","image/samuel_florida/lote_b3_casa/florida_b3 (7).webp","image/samuel_florida/lote_b3_casa/florida_b3 (8).webp","image/samuel_florida/lote_b3_casa/florida_b3 (9).webp","image/samuel_florida/lote_b3_casa/florida_b3 (10).webp"],"naturaleza":"no","servicios":"no","destacada":"si","tiempoConcepcion":"35 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'florida_d1', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Las Ulloas Mirador – Parcela D1 | Florida', 'Exclusiva parcela de 8.700 m² ubicada en el sector Las Ulloas, comuna de Florida, Región del Biobío. Su privilegiada topografía combina amplios sectores planos con suaves lomajes y áreas elevadas que permiten disfrutar de excelentes vistas del paisaje rural, entregando múltiples alternativas para emplazar una vivienda, quincho, piscina, jardines o un proyecto familiar de alto estándar. La propiedad conserva sectores de bosque nativo que aportan privacidad, belleza escénica y un entorno natural ideal para quienes buscan tranquilidad y calidad de vida. Cuenta con Rol Propio y factibilidad de energía eléctrica, ofreciendo las condiciones necesarias para comenzar un proyecto con seguridad. Florida es una comuna reconocida por su tradición agrícola, sus bosques y su cercanía a la Reserva Nacional Nonguén, uno de los principales refugios de biodiversidad del Biobío, donde es posible realizar senderismo, observación de aves y disfrutar de la naturaleza durante todo el año. Gracias a su excelente ubicación, esta parcela se encuentra aproximadamente a 35 minutos de Concepción, permitiendo combinar la vida de campo con una rápida conexión hacia la capital regional. Una excelente oportunidad para quienes buscan amplitud, naturaleza y una inversión con alta proyección de valorización.',
  42640000, 8700, 'Biobío', 'Florida', 'N/A', '38 km',
  -36.85463, -72.76441, 'si', 'no', 'si', '{"imagen_principal":"image/samuel_florida/lote_d1/florida_lote_d1_ (4).webp","imagenes":["image/samuel_florida/lote_d1/florida_lote_d1_ (4).webp","image/samuel_florida/lote_d1/florida_lote_d1_ (1).webp","image/samuel_florida/lote_d1/florida_lote_d1_ (2).webp","image/samuel_florida/lote_d1/florida_lote_d1_ (3).webp","image/samuel_florida/lote_d1/florida_lote_d1_ (5).webp","image/samuel_florida/lote_d1/florida_lote_d1_ (6).webp","image/samuel_florida/lote_d1/florida_lote_d1_ (7).webp","image/samuel_florida/lote_d1/florida_lote_d1_ (8).webp"],"naturaleza":"si","servicios":"no","destacada":"no","tiempoConcepcion":"35 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'los_guindos_1h', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Los Guindos Nativo – Campo de 1 Hectárea | Nacimiento', 'Campo de 10.000 m² (1 hectárea) ubicado en el sector Los Guindos, comuna de Nacimiento, inmerso en el privilegiado entorno de la Cordillera de Nahuelbuta, uno de los ecosistemas de bosque templado más valiosos del sur de Chile. Rodeado de abundante vegetación nativa y paisajes de gran belleza escénica, este terreno ofrece la privacidad y tranquilidad ideales para desarrollar una vivienda, una segunda residencia, cabañas de turismo o un proyecto de conservación y ecoturismo. La Cordillera de Nahuelbuta es reconocida por sus bosques de robles, coigües y araucarias en sectores altos, además de su rica biodiversidad, senderos naturales y miradores que atraen a visitantes durante todo el año. Durante el invierno, las cumbres cercanas pueden cubrirse de nieve, ofreciendo paisajes únicos en la Región del Biobío. La propiedad cuenta con Rol Propio y factibilidad de energía eléctrica en las cercanías, permitiendo planificar un proyecto de manera segura. Si buscas un lugar donde el silencio, el aire puro y la naturaleza sean protagonistas, Los Guindos representa una excelente oportunidad para invertir en un campo con gran potencial turístico, recreativo y de valorización futura.',
  14900000, 10000, 'Biobío', 'Nacimiento', 'N/A', '120 km',
  -37.53582, -72.94645, 'si', 'no', 'si, distante', '{"imagen_principal":"image/nacimiento/los_guindos/Los_guindos_1h (1).webp","imagenes":["image/nacimiento/los_guindos/Los_guindos_1h (1).webp","image/nacimiento/los_guindos/Los_guindos_1h (2).webp","image/nacimiento/los_guindos/Los_guindos_1h (3).webp","image/nacimiento/los_guindos/Los_guindos_1h (4).webp","image/nacimiento/los_guindos/Los_guindos_1h (5).webp","image/nacimiento/los_guindos/Los_guindos_1h (6).webp"],"naturaleza":"si","servicios":"no","destacada":"no","tiempoConcepcion":"2 h"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'negrete_vista_rio', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Mirador del Biobío – Vista al Río | Negrete', 'Hermosa parcela de 5.000 m² ubicada en la comuna de Negrete, Región del Biobío, con una privilegiada vista panorámica hacia el río Biobío y su entorno natural. Este terreno combina tranquilidad, privacidad y un paisaje que cambia con las estaciones del año, convirtiéndose en un lugar ideal para construir una vivienda, una segunda residencia o un proyecto turístico orientado al descanso. La propiedad cuenta con Rol Propio y disponibilidad de agua, mientras que la factibilidad de energía eléctrica se encuentra en las cercanías. Negrete destaca por su historia ligada al histórico Fuerte de Negrete, declarado Monumento Histórico Nacional, y por su excelente ubicación entre Los Ángeles, Nacimiento y Angol, lo que permite acceder fácilmente a comercio, centros de salud, establecimientos educacionales y diversos servicios. Los alrededores ofrecen espacios ideales para la pesca recreativa, caminatas, fotografía de paisajes y actividades al aire libre junto al río. Una excelente oportunidad para invertir en una propiedad que combina naturaleza, conectividad y una privilegiada vista, con un importante potencial de valorización en una de las zonas más atractivas de la provincia del Biobío.',
  28900000, 5000, 'Biobío', 'Negrete', 'N/A', '105 km',
  -37.56553, -72.63902, 'si', 'si', 'si, distante', '{"imagen_principal":"image/negrete/negrete_rio_ (6).webp","imagenes":["image/negrete/negrete_rio_ (6).webp","image/negrete/negrete_rio_ (2).webp","image/negrete/negrete_rio_ (3).webp","image/negrete/negrete_rio_ (4).webp","image/negrete/negrete_rio_ (5).webp"],"naturaleza":"si","servicios":"no","destacada":"si","tiempoConcepcion":"1 h 30 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'negrete_parcela_con_rio', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Ribera del Vergara – Acceso Privado al Río | Negrete', 'Exclusiva parcela de 5.000 m² ubicada en un condominio privado de la comuna de Negrete, con acceso exclusivo a la ribera del río Vergara. Gracias a su emplazamiento en un sector elevado, la propiedad permite disfrutar de hermosas vistas hacia el río y su entorno natural, ofreciendo además una mayor tranquilidad y resguardo. Es un lugar ideal para construir una vivienda permanente, una segunda residencia o desarrollar un proyecto turístico de cabañas, aprovechando uno de los principales atractivos naturales de la provincia del Biobío. El río Vergara es ampliamente conocido por sus aguas aptas para actividades recreativas como pesca deportiva, kayak, paseos familiares y descanso al aire libre, convirtiéndose en un importante punto de encuentro para quienes disfrutan de la naturaleza. Negrete destaca además por su patrimonio histórico, representado por el Fuerte de Negrete, y por su excelente ubicación entre Los Ángeles, Nacimiento y Angol, con acceso expedito a comercio, servicios y centros urbanos. La propiedad cuenta con Rol Propio, disponibilidad de agua y factibilidad de energía eléctrica en las cercanías. Una oportunidad única para invertir en una parcela con acceso privado al río, una característica muy escasa en el mercado y altamente valorada por quienes buscan calidad de vida y una inversión con gran potencial de valorización.',
  36200000, 5000, 'Biobío', 'Negrete', 'N/A', '105 km',
  -37.56553, -72.63902, 'si', 'si', 'si distante', '{"imagen_principal":"image/negrete/negrete_con_ _rio_ (1).webp","imagenes":["image/negrete/negrete_con_ _rio_ (1).webp","image/negrete/negrete_rio_ (2).webp","image/negrete/negrete_rio_ (3).webp","image/negrete/negrete_rio_ (4).webp","image/negrete/negrete_rio_ (5).webp"],"naturaleza":"si","servicios":"no","destacada":"si","tiempoConcepcion":"1 h 30 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'yumbel_5min_pueblo', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Yumbel Centro Cercano – Parcela 5.000 m²', 'Parcela de 5.000 m² ubicada a solo 5 minutos del centro de Yumbel, una excelente alternativa para quienes buscan vivir en un entorno tranquilo sin alejarse de los servicios urbanos. Su ubicación permite acceder rápidamente a comercio, colegios, centros de salud, transporte, bancos y servicios esenciales, manteniendo al mismo tiempo la privacidad y amplitud que ofrece una parcela de agrado. Cuenta con Rol Propio, factibilidad de energía eléctrica y buena conectividad hacia Cabrero, Los Ángeles y Concepción. Yumbel es una comuna reconocida por su tradición agrícola, su historia y el Santuario de San Sebastián, uno de los centros de peregrinación más importantes de Chile, lo que fortalece su actividad turística y comercial durante el año. Esta propiedad es ideal para construir una vivienda permanente, una casa de descanso cercana a la ciudad o una inversión con buena proyección de valorización, especialmente para quienes valoran la cercanía al centro urbano y la tranquilidad del campo.',
  24980000, 5000, 'Biobío', 'Yumbel', 'N/A', '65 km',
  -37.1008182, -72.5751052, 'si', 'no', 'si', '{"imagen_principal":"image/yumbel/yumbel_5min (5).webp","imagenes":["image/yumbel/yumbel_5min (5).webp","image/yumbel/yumbel_5min (2).webp","image/yumbel/yumbel_5min (3).webp","image/yumbel/yumbel_5min (4).webp"],"naturaleza":"no","servicios":"si","destacada":"si","tiempoConcepcion":"55 min"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'rio_claro_con_casa', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Río Claro – Parcela con Vivienda para Remodelar | Yumbel', 'Parcela de 5.000 m² ubicada en el tradicional sector Río Claro, comuna de Yumbel, en un entorno rural tranquilo y de excelente conectividad. La propiedad cuenta con Rol Propio, factibilidad de energía eléctrica y una vivienda existente que sufrió daños, ofreciendo la posibilidad de ser remodelada, reconstruida o reemplazada por un nuevo proyecto según las necesidades del futuro propietario. Su superficie permite desarrollar una amplia vivienda, jardines, huertos, quincho o incluso un pequeño proyecto turístico o de descanso. El sector Río Claro es reconocido por su ambiente campestre, la cercanía al río del mismo nombre y su ubicación estratégica, con acceso expedito hacia Yumbel, Cabrero, Los Ángeles y Concepción. Además, la comuna destaca por el histórico Santuario de San Sebastián, uno de los principales destinos de turismo religioso del país, lo que aporta dinamismo y crecimiento al sector. Esta propiedad representa una excelente oportunidad para quienes desean adquirir un terreno con infraestructura existente y proyectar una nueva etapa en un entorno natural con gran potencial de valorización.',
  31100000, 5000, 'Biobío', 'Yumbel', 'N/A', '75 km',
  -37.19014, -72.64794, 'si', 'no', 'si', '{"imagen_principal":"image/rio_claro_nery/parcela_con_casa/rio_claro_con_casa (6).webp","imagenes":["image/rio_claro_nery/parcela_con_casa/rio_claro_con_casa (6).webp","image/rio_claro_nery/parcela_con_casa/rio_claro_con_casa (5).webp","image/rio_claro_nery/parcela_con_casa/rio_claro_con_casa (2).webp","image/rio_claro_nery/parcela_con_casa/rio_claro_con_casa (3).webp","image/rio_claro_nery/parcela_con_casa/rio_claro_con_casa (6).webp"],"naturaleza":"no","servicios":"si","destacada":"no","tiempoConcepcion":"1 h"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'altos_quillon', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Altos de Quillón – Parcela 5.000 m²', 'Exclusiva parcela de 5.000 m² ubicada en el proyecto Altos de Quillón, Región de Ñuble, a pocos minutos del centro de la comuna y rodeada por un privilegiado entorno natural. Desde la propiedad es posible disfrutar de amplias vistas hacia el paisaje precordillerano y, en días despejados, apreciar el cordón montañoso de los Andes, aportando un escenario único durante todo el año. Cuenta con Rol Propio y factibilidad de energía eléctrica, ofreciendo excelentes condiciones para construir una vivienda permanente, una segunda residencia o desarrollar un proyecto turístico. Quillón es reconocido como uno de los principales destinos turísticos de la Región de Ñuble gracias a atractivos como la Laguna Avendaño, la Laguna Coyanco, sus playas lacustres, centros recreativos, camping, deportes náuticos y la reconocida Ruta del Vino del Valle del Itata, donde destacan viñas patrimoniales y experiencias enoturísticas. Además, la comuna dispone de supermercados, centros de salud, colegios, comercio y una excelente conectividad hacia Chillán, Concepción y otras ciudades de la zona centro-sur. Una excelente oportunidad para invertir en una parcela con alto potencial de valorización, rodeada de naturaleza y cercana a uno de los polos turísticos más importantes del sur de Chile.',
  26300000, 5000, 'Biobío', 'Quillón', 'N/A', 'N/A',
  -36.77703, -72.46799, 'si', 'no', 'si', '{"imagen_principal":"image/eric_arrepol/altos_quillon/quillon_gps.webp","imagenes":["image/eric_arrepol/altos_quillon/quillon_gps.webp"],"naturaleza":"si","servicios":"si","destacada":"si"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'pemuco_campo', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Cordilleranas de Pemuco – Campo de 10 Hectáreas | Ñuble', 'Espectacular campo de 100.000 m² (10 hectáreas) ubicado en el sector cordillerano de la comuna de Pemuco, Región de Ñuble, rodeado de un entorno natural privilegiado donde predominan bosques, esteros y paisajes precordilleranos de gran belleza. La propiedad cuenta con Rol Propio, disponibilidad de agua y un proyecto de parcelación en trámite, lo que amplía sus posibilidades de desarrollo e inversión. Su extensa superficie permite proyectar actividades agrícolas, ganaderas, forestales, turismo rural, glamping, cabañas, centros de retiro o simplemente disfrutar de un campo privado con absoluta tranquilidad. Pemuco es reconocido por ser una de las puertas de entrada hacia la precordillera de Ñuble y por su cercanía a destinos naturales como el Valle Las Trancas, las Termas de Chillán y la Reserva Nacional Ñuble, sectores que concentran actividades de montaña, senderismo, ciclismo, pesca recreativa y deportes de invierno. Además, la comuna mantiene una fuerte identidad campesina y una creciente demanda por propiedades rurales orientadas al turismo de naturaleza. Esta es una excelente oportunidad para invertir en un campo de gran superficie, con un extraordinario potencial de valorización y múltiples alternativas de desarrollo en una de las zonas con mayor proyección turística del centro-sur de Chile.',
  98000000, 100000, 'Biobío', 'Pemuco', 'N/A', 'N/A',
  -37.01864, -71.65292, 'si', 'si', 'no', '{"imagen_principal":"image/wladimir_galaz/pemuco_ (4).webp","imagenes":["image/wladimir_galaz/pemuco_ (4).webp","image/wladimir_galaz/pemuco_ (1).webp","image/wladimir_galaz/pemuco_ (2).webp","image/wladimir_galaz/pemuco_ (3).webp","image/wladimir_galaz/pemuco_ (5).webp","image/wladimir_galaz/pemuco_ (6).webp"],"naturaleza":"si","servicios":"no","destacada":"si"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'santa_ana_campo', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Santa Ana de Quillón – Campo de 10 Hectáreas | Proyecto de Parcelación', 'Excepcional campo de 100.000 m² (10 hectáreas) ubicado en el sector Santa Ana, comuna de Quillón, Región de Ñuble. La propiedad cuenta con Rol Propio y un proyecto de subdivisión en 13 parcelas, transformándola en una atractiva oportunidad para inversionistas, desarrolladores inmobiliarios o quienes buscan un proyecto de alta rentabilidad. Dispone de factibilidad de energía eléctrica y una ubicación estratégica a aproximadamente 30 minutos del centro de Quillón, permitiendo combinar privacidad, naturaleza y excelente conectividad. Quillón es uno de los destinos turísticos más importantes de la Región de Ñuble, reconocido por la Laguna Avendaño, la Laguna Coyanco, sus playas lacustres, centros recreativos, deportes náuticos y la tradicional Ruta del Vino del Valle del Itata, que atrae visitantes durante todo el año. Gracias a su superficie y configuración, este campo ofrece múltiples alternativas de desarrollo, incluyendo un proyecto de parcelas de agrado, complejo de cabañas, glamping, turismo rural, agricultura, frutales o una combinación de distintos usos. Una excelente oportunidad para invertir en una zona con creciente demanda inmobiliaria y gran proyección de valorización, donde el turismo y la calidad de vida impulsan el desarrollo del territorio.',
  120000000, 100000, 'Biobío', 'Quillón', 'N/A', 'N/A',
  -36.831954, -72.522757, 'si', 'no', 'si', '{"imagen_principal":"image/eric_arrepol/huacamala/gps_arreglado.webp","imagenes":["image/eric_arrepol/huacamala/gps_arreglado.webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (1).webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (2).webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (3).webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (4).webp"],"naturaleza":"si","servicios":"no","destacada":"si"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'santa_ana_6000mts2', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Santa Ana del Baúl – Parcela 6.000 m² | Quillón', 'Parcela de 6.000 m² ubicada en el sector Santa Ana del Baúl, comuna de Quillón, dentro de un proyecto rural de 10 hectáreas dividido en 13 parcelas. Su superficie superior al estándar entrega mayor amplitud para proyectar una vivienda, casa de descanso, quincho, huerto, jardines o un proyecto familiar en un entorno tranquilo y natural. Cuenta con Rol Propio y factibilidad de energía eléctrica, convirtiéndose en una excelente alternativa para quienes buscan iniciar una inversión accesible en una de las comunas con mayor atractivo turístico de Ñuble. Quillón destaca por la Laguna Avendaño, Laguna Coyanco, sus zonas de camping, gastronomía local, actividades recreativas y la Ruta del Vino del Valle del Itata, lo que fortalece su demanda como destino de descanso y segunda vivienda. Ubicada aproximadamente a 30 minutos del centro de Quillón, esta parcela combina privacidad, precio atractivo y proyección de valorización en un sector ideal para quienes sueñan con vivir o invertir cerca de la naturaleza.',
  10000000, 6000, 'Biobío', 'Quillón', 'N/A', 'N/A',
  -36.82842, -72.52133, 'si', 'no', 'si', '{"imagen_principal":"image/eric_arrepol/huacamala/Fotos_arregladas_ (4).webp","imagenes":["image/eric_arrepol/huacamala/Fotos_arregladas_ (4).webp","image/eric_arrepol/huacamala/gps_arreglado.webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (1).webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (2).webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (3).webp"],"naturaleza":"si","servicios":"no","destacada":"no"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'santa_ana_9500mts2', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Santa Ana del Baúl – Parcela Premium 9.500 m² | Quillón', 'Exclusiva parcela de 9.500 m² ubicada en el sector Santa Ana del Baúl, comuna de Quillón, Región de Ñuble. Gracias a su superficie cercana a una hectárea, ofrece un amplio espacio para desarrollar una vivienda de alto estándar, jardines, quincho, piscina, huertos, frutales o un completo proyecto familiar con total privacidad. Forma parte de un proyecto rural de 10 hectáreas subdividido en 13 parcelas, combinando tranquilidad, naturaleza y una excelente proyección de valorización. Cuenta con Rol Propio y factibilidad de energía eléctrica, permitiendo iniciar el desarrollo de tu proyecto con seguridad. Quillón es uno de los principales destinos turísticos del centro-sur de Chile, reconocido por la Laguna Avendaño, Laguna Coyanco, playas lacustres, camping, deportes náuticos y la Ruta del Vino del Valle del Itata, que reúne históricas viñas y experiencias enoturísticas. Ubicada aproximadamente a 30 minutos del centro de Quillón, esta propiedad representa una excelente oportunidad para quienes buscan una segunda vivienda, un proyecto turístico o una inversión patrimonial en una comuna con creciente demanda inmobiliaria y gran atractivo natural.',
  16000000, 9500, 'Biobío', 'Quillón', 'N/A', 'N/A',
  -36.82842, -72.52133, 'si', 'no', 'si', '{"imagen_principal":"image/eric_arrepol/huacamala/Fotos_arregladas_ (2).webp","imagenes":["image/eric_arrepol/huacamala/Fotos_arregladas_ (2).webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (3).webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (4).webp","image/eric_arrepol/huacamala/gps_arreglado.webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (1).webp"],"naturaleza":"si","servicios":"no","destacada":"no"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'santa_ana_8000mts2', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Santa Ana del Baúl – Parcela Premium 8.000 m² | Quillón', 'Amplia parcela de 8.000 m² ubicada en el sector Santa Ana del Baúl, comuna de Quillón, Región de Ñuble. Forma parte de un proyecto rural de 10 hectáreas subdividido en 13 parcelas, ofreciendo un entorno tranquilo, amplios espacios y excelente proyección para desarrollar una vivienda permanente, una segunda residencia o un proyecto familiar. Su superficie supera ampliamente la de una parcela tradicional, permitiendo incorporar jardines, piscina, quincho, huertos, frutales o espacios recreativos con total comodidad. La propiedad cuenta con Rol Propio y factibilidad de energía eléctrica, entregando una base sólida para comenzar un proyecto con seguridad. Quillón es reconocido como uno de los principales destinos turísticos de la Región de Ñuble gracias a atractivos como la Laguna Avendaño, la Laguna Coyanco, la Ruta del Vino del Valle del Itata, centros recreativos, playas lacustres y una variada oferta gastronómica y turística durante todo el año. Ubicada aproximadamente a 30 minutos del centro de Quillón, esta parcela representa una excelente oportunidad para quienes buscan invertir en una zona con creciente plusvalía, disfrutando de la tranquilidad del campo y de un entorno natural privilegiado.',
  13500000, 8000, 'Biobío', 'Quillón', 'N/A', 'N/A',
  -36.831166, -72.522963, 'si', 'no', 'si', '{"imagen_principal":"image/eric_arrepol/huacamala/Fotos_arregladas_ (3).webp","imagenes":["image/eric_arrepol/huacamala/Fotos_arregladas_ (3).webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (4).webp","image/eric_arrepol/huacamala/gps_arreglado.webp","image/eric_arrepol/huacamala/Fotos_arregladas_ (1).webp"],"naturaleza":"si","servicios":"no","destacada":"no"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'chequenal_4ultimas', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Chequenal – Últimas 4 Parcelas Disponibles | Nacimiento', 'Últimas cuatro parcelas de 5.000 m² disponibles en el sector Chequenal, comuna de Nacimiento, una excelente oportunidad para invertir en una zona que ha experimentado un sostenido crecimiento residencial durante los últimos años. Los terrenos destacan por su topografía mayoritariamente plana, facilitando el desarrollo de viviendas, proyectos familiares o segundas residencias. Cuentan con Rol Propio y factibilidad de energía eléctrica, entregando las condiciones necesarias para comenzar un proyecto con seguridad. Su ubicación permite acceder rápidamente al centro de Nacimiento, comercio, establecimientos educacionales y servicios, además de encontrarse cerca del río Biobío, uno de los principales atractivos naturales de la provincia. La comuna de Nacimiento también es reconocida por su cercanía a la Cordillera de Nahuelbuta, un entorno privilegiado para disfrutar de senderismo, observación de flora y fauna nativa y actividades al aire libre. Una excelente alternativa para quienes buscan calidad de vida, tranquilidad y una inversión con proyección de valorización en la Región del Biobío.',
  12500000, 5000, 'Biobío', 'Nacimiento', 'N/A', 'N/A',
  -37.359662, -72.722855, 'si', 'no', 'si', '{"imagen_principal":"image/nacimiento/nac_chequenal_12_2/chequenal_12.webp","imagenes":["image/nacimiento/nac_chequenal_12_2/chequenal_12.webp","image/nacimiento/nac_chequenal_12_2/chequenal_12_2 (2).webp","image/nacimiento/nac_chequenal_12_2/chequenal_12_2 (3).webp","image/nacimiento/nac_chequenal_12_2/chequenal_12.webp","image/nacimiento/nac_chequenal_12_2/chequenal_12_2 (1).webp"],"naturaleza":"si","servicios":"no","destacada":"si"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'caburgua', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Mirador del Villarrica – Parcela Premium | Caburgua', 'Exclusiva parcela de 5.000 m² ubicada en un condominio privado de Caburgua, uno de los destinos más exclusivos y valorados de la Región de La Araucanía. La propiedad ofrece una privilegiada vista al imponente volcán Villarrica y acceso al río dentro del condominio, combinando privacidad, seguridad y un entorno natural de categoría internacional. Además, el proyecto cuenta con aguas termales, convirtiéndose en un lugar ideal para disfrutar durante todo el año. Su ubicación permite acceder en pocos minutos al Lago Caburgua, famoso por sus aguas cristalinas y playas naturales, así como al Parque Nacional Huerquehue, reconocido por sus bosques nativos, senderos, lagunas de montaña y una de las mayores concentraciones de araucarias del país. También se encuentra muy cerca de Pucón, capital del turismo aventura en Chile, donde es posible practicar esquí, rafting, kayak, pesca deportiva, canopy, trekking y una amplia oferta gastronómica y hotelera. La propiedad cuenta con Rol Propio, disponibilidad de agua y energía eléctrica, ofreciendo una excelente oportunidad para construir una residencia de alto estándar, una segunda vivienda o desarrollar un proyecto turístico de lujo. Una inversión patrimonial única en uno de los sectores con mayor demanda y valorización del sur de Chile.',
  200000000, 5000, 'Biobío', 'Caburgua', 'N/A', 'N/A',
  -39.25332, -71.79639, 'si', 'si', 'si', '{"imagen_principal":"image/cesar_Caburgua/cesar_caburgua_(5).webp","imagenes":["image/cesar_Caburgua/cesar_caburgua_(5).webp","image/cesar_Caburgua/cesar_caburgua_(1).webp","image/cesar_Caburgua/cesar_caburgua_ (2).webp","image/cesar_Caburgua/cesar_caburgua_(3).webp","image/cesar_Caburgua/cesar_caburgua_ (4).webp","image/cesar_Caburgua/cesar_caburgua_(6).gif","image/cesar_Caburgua/cesar_caburgua_(7).webp"],"naturaleza":"si","servicios":"si","destacada":"si"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;

INSERT INTO public.publicaciones (
  codigo_publico, idempotency_key, estado, tipo_publicador,
  contacto_nombre, contacto_email, titulo_publico, descripcion_publica,
  precio_publicacion, superficie_m2, region, comuna, sector, ubicacion_publica_aproximada,
  latitud_privada, longitud_privada, rol, agua, luz, datos_formulario
) VALUES (
  'campo_ruta_cabrero', gen_random_uuid(), 'aprobada', 'dueno',
  'Administrador', 'admin@tuparcelalista.cl', 'Ruta Concepción–Cabrero – Campo Estratégico 2 Hectáreas | Yumbel', 'Campo de 20.000 m² (2 hectáreas) ubicado en un estratégico sector de la ruta que conecta Concepción, Cabrero, Yumbel y Los Ángeles, una de las principales vías de comunicación del centro-sur de Chile. Su excelente ubicación y acceso lo convierten en una alternativa ideal para desarrollar un proyecto habitacional, turístico, agrícola o comercial, aprovechando el constante flujo vehicular de la zona. La propiedad se entrega con puntera de agua y cerco perimetral, facilitando el inicio de cualquier proyecto. Su amplia superficie permite construir una vivienda, bodegas, galpones, cabañas, un centro de eventos o un emprendimiento rural, manteniendo espacios suficientes para áreas verdes o producción agrícola. La comuna de Yumbel es reconocida por su tradición campesina, su creciente desarrollo inmobiliario y el histórico Santuario de San Sebastián, uno de los principales centros de peregrinación de Chile, que atrae cientos de miles de visitantes cada año. Además, la conectividad con Concepción, Cabrero y Los Ángeles fortalece el potencial de valorización de esta propiedad. Una excelente oportunidad para invertir en un campo con ubicación privilegiada, gran visibilidad y múltiples posibilidades de desarrollo.',
  95000000, 20000, 'Biobío', 'Yumbel', 'N/A', 'N/A',
  -36.9928, -72.59044, 'no', 'no', 'si', '{"imagen_principal":"image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (9).webp","imagenes":["image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (9).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (1).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (5).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (8).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_2/ruta_concepcion_7000 (10).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (3).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (1).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_6500_ (2).webp","image/claudio_ruiz/fotos/yumbel_ruta_concepcion_1/ruta_plano_completo.webp"],"naturaleza":"no","servicios":"si"}'::jsonb
) ON CONFLICT (codigo_publico) DO NOTHING;
