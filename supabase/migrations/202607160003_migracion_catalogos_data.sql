-- MIGRACIÓN CATÁLOGO DE CASAS Y EXTRAS

-- === INSERCIÓN DE CASAS ===

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura18',
  'Casa prefabricada 18m²',
  null,
  18,
  1,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp","image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura24',
  'Casa prefabricada 24m²',
  null,
  24,
  2,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_foto.webp","image/casas/pre_fabricadas/36mts2/pequenas/18_cabana_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura36',
  'Casa prefabricada 36m²',
  null,
  36,
  2,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/pequenas/36_caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura42',
  'Casa prefabricada 42m²',
  null,
  42,
  3,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/medianas/42_caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura48',
  'Casa prefabricada 48m²',
  null,
  48,
  3,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/medianas/48_caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura54',
  'Casa prefabricada 48m²',
  null,
  54,
  3,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_render.webp","image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/medianas/54_6caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura72',
  'Casa prefabricada 72m²',
  null,
  72,
  3,
  2,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/medianas/72_2a_render.webp","image/casas/pre_fabricadas/36mts2/medianas/72_2a_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura84_1',
  'Casa prefabricada 82mts2,',
  null,
  84,
  4,
  2,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp","image/casas/pre_fabricadas/36mts2/grandes/82_caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura84_2',
  'Casa prefabricada 84mts2 de 6 aguas,',
  null,
  84,
  4,
  2,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/84_6caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura108',
  'Casa prefabricada 108mts2 de 6 aguas,',
  null,
  108,
  6,
  2,
  undefined,
  'Modular',
  'image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp',
  null,
  '["image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp","image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_render.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'aura120',
  'Casa prefabricada 120mts2 de 6 aguas,',
  null,
  120,
  6,
  2,
  undefined,
  'Modular',
  'image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp',
  null,
  '["image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_foto.webp","image/casas/pre_fabricadas/36mts2/grandes/108_6caida_agua_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'Innova18',
  'Casa Moderna madera full 18mts2,',
  null,
  18,
  1,
  1,
  undefined,
  'Modular',
  'image/casas/pro/innova/innova_1_habitacion_plano.webp',
  null,
  '["image/casas/pro/innova/innova_1_habitacion_foto.webp","image/casas/pro/innova/innova_1_habitacion_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'Innova54',
  'Casa Moderna completa full 54mts2,',
  null,
  54,
  3,
  1,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pro/innova/innova_3_habitaciones_foto_1.webp","image/casas/pro/innova/innova_3_habitaciones_foto_2.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.casas (codigo, nombre, descripcion, superficie_m2, habitaciones, banos, precio_base, tipo_construccion, plano_url, imagen_principal_url, imagenes, activa, destacada)
VALUES (
  'Nogal72',
  'Casa Moderna completa full 72mts2,',
  null,
  72,
  3,
  2,
  undefined,
  'Modular',
  null,
  null,
  '["image/casas/pro/nogales/Alfa_72_mt2_.webp","image/casas/pro/nogales/Alfa_72_mt2_plano.webp"]'::jsonb,
  true,
  false
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

-- === INSERCIÓN DE EXTRAS ===

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'Instalacion_+_base_pilotes_madera',
  'Instalación Pilotes de madera + Casa Full',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'Instalacion_+_base_radier',
  'Instalación radier y Casa Full',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'Instalacion completa radier + llave en mano full + piso ceramico',
  'Instalacion completa llave en mano full',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'Instalacion_electrica',
  'Instalación eléctrica incl/materiales',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'piso ceramico',
  'Instalación piso cerámico incl/materiales',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'pintura',
  'Servicio pintura con materiales',
  '',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'instalacion_sanitaria',
  'Instalación sanitaria incl/materiales',
  'Red sanitaria interior referencial según modelo de casa.',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'artefactos_cocina',
  'Artefactos cocina',
  'Kit referencial de artefactos de cocina según disponibilidad.',
  'general',
  'unidad',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'artefactos_bano',
  'Artefactos baño',
  'Artefactos sanitarios básicos para baño.',
  'general',
  'unidad',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'fosa_septica',
  'Fosa séptica con instalación precio referencial estimado',
  'Instalación de fosa y kit de drenaje',
  'general',
  'unidad',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'pozo_profundo',
  'Pozo profundo según profundidad',
  'Excavación de pozo de agua potable',
  'general',
  'metro',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'cierre_perimetral',
  'Cerco de alambre de púas según perímetro de la parcela',
  'Cercado perimetral estimado desde los m² de la parcela seleccionada.',
  'general',
  'metro',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'porton',
  'Portón acceso',
  'Portón de madera/fierro para acceso principal',
  'general',
  'unidad',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'empalme_electrico',
  'Empalme eléctrico',
  'Acometida y poste para conexión a red eléctrica',
  'general',
  'unidad',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'maquinaria',
  'Maquinaria retroescavadora',
  'Horas de retroexcavadora/nivelación',
  'general',
  'hora',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'piscina',
  'Piscina',
  'Construcción de piscina de hormigón/fibra',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'quincho',
  'Quincho',
  'Quincho premium de asados techado',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;

INSERT INTO public.extras (codigo, nombre, descripcion, categoria, tipo_calculo, precio_base, unidad, activo, requiere_contratista)
VALUES (
  'terraza',
  'Terraza',
  'Terraza exterior en madera impregnada',
  'general',
  'mt2',
  undefined,
  'unidad',
  true,
  true
) ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, precio_base = EXCLUDED.precio_base;
