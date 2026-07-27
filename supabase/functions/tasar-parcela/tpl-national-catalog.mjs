/**
 * TPL NATIONAL CATALOG (SSOT Territorial)
 * Fuente única de verdad geográfica para el ecosistema Tu Parcela Lista.
 * REGLA ARQUITECTÓNICA: Contiene exclusivamente información geográfica, administrativa,
 * distancias y clasificaciones territoriales. CERO variables económicas o de precio.
 * CERTIFICADO FASE 4: Cobertura total de 16 regiones, 56 provincias y 346 comunas de Chile.
 */

export const TPL_NATIONAL_CATALOG = {
  version: "2026-Q3-canonica-v2",
  country: "Chile",
  totalRegions: 16,
  totalCommunes: 346,
  status: "VALIDADA",
  description: "Catálogo territorial oficial y exhaustivo de 16 regiones, 56 provincias y 346 comunas de Chile",

  conurbations: [
  {
    "id": "urb_arica",
    "name": "Arica",
    "category": "Capital regional extremo norte",
    "centroid": {
      "lat": -18.4783,
      "lng": -70.3126
    },
    "urbanRadiusKm": 12,
    "influenceRadiusKm": 50,
    "communes": [
      "Arica",
      "Putre",
      "Camarones",
      "General Lagos"
    ],
    "marketZone": "arica_extremo_norte"
  },
  {
    "id": "urb_iquique_alto_hospicio",
    "name": "Conurbación Iquique–Alto Hospicio",
    "category": "Capital regional y puerto comercial",
    "centroid": {
      "lat": -20.2307,
      "lng": -70.1357
    },
    "urbanRadiusKm": 15,
    "influenceRadiusKm": 60,
    "communes": [
      "Iquique",
      "Alto Hospicio",
      "Pozo Almonte",
      "Pica",
      "Camiña",
      "Colchane",
      "Huara"
    ],
    "marketZone": "tarapaca_costero"
  },
  {
    "id": "urb_antofagasta",
    "name": "Antofagasta",
    "category": "Metrópoli minera y capital regional",
    "centroid": {
      "lat": -23.6509,
      "lng": -70.3975
    },
    "urbanRadiusKm": 18,
    "influenceRadiusKm": 70,
    "communes": [
      "Antofagasta",
      "Mejillones",
      "Sierra Gorda",
      "Taltal"
    ],
    "marketZone": "antofagasta_minero"
  },
  {
    "id": "urb_calama",
    "name": "Calama",
    "category": "Centro minero interior",
    "centroid": {
      "lat": -22.4544,
      "lng": -68.9294
    },
    "urbanRadiusKm": 15,
    "influenceRadiusKm": 60,
    "communes": [
      "Calama",
      "Ollagüe",
      "San Pedro de Atacama",
      "Tocopilla",
      "María Elena"
    ],
    "marketZone": "antofagasta_interior_minero"
  },
  {
    "id": "urb_copiapo",
    "name": "Copiapó",
    "category": "Capital regional minera",
    "centroid": {
      "lat": -27.3668,
      "lng": -70.3323
    },
    "urbanRadiusKm": 14,
    "influenceRadiusKm": 60,
    "communes": [
      "Copiapó",
      "Caldera",
      "Tierra Amarilla",
      "Chañaral",
      "Diego de Almagro"
    ],
    "marketZone": "atacama_central"
  },
  {
    "id": "urb_vallenar",
    "name": "Vallenar",
    "category": "Centro agro-minero valle del Huasco",
    "centroid": {
      "lat": -28.575,
      "lng": -70.7581
    },
    "urbanRadiusKm": 10,
    "influenceRadiusKm": 50,
    "communes": [
      "Vallenar",
      "Freirina",
      "Huasco",
      "Alto del Carmen"
    ],
    "marketZone": "atacama_sur_huasco"
  },
  {
    "id": "urb_la_serena_coquimbo",
    "name": "Conurbación La Serena–Coquimbo",
    "category": "Capital regional y destino costero",
    "centroid": {
      "lat": -29.9324,
      "lng": -71.2619
    },
    "urbanRadiusKm": 18,
    "influenceRadiusKm": 65,
    "communes": [
      "La Serena",
      "Coquimbo",
      "Vicuña",
      "Paihuano",
      "Andacollo",
      "La Higuera"
    ],
    "marketZone": "norte_chico_costero"
  },
  {
    "id": "urb_ovalle",
    "name": "Ovalle",
    "category": "Capital provincial agropecuaria",
    "centroid": {
      "lat": -30.6011,
      "lng": -71.2003
    },
    "urbanRadiusKm": 12,
    "influenceRadiusKm": 55,
    "communes": [
      "Ovalle",
      "Monte Patria",
      "Punitaqui",
      "Combarbalá",
      "Río Hurtado"
    ],
    "marketZone": "coquimbo_interior_limari"
  },
  {
    "id": "urb_illapel",
    "name": "Illapel",
    "category": "Centro provincial Choapa",
    "centroid": {
      "lat": -31.6308,
      "lng": -71.1653
    },
    "urbanRadiusKm": 10,
    "influenceRadiusKm": 50,
    "communes": [
      "Illapel",
      "Salamanca",
      "Los Vilos",
      "Canela"
    ],
    "marketZone": "coquimbo_sur_choapa"
  },
  {
    "id": "urb_gran_valparaiso",
    "name": "Gran Valparaíso",
    "category": "Área metropolitana costera",
    "centroid": {
      "lat": -33.0245,
      "lng": -71.5518
    },
    "urbanRadiusKm": 20,
    "influenceRadiusKm": 70,
    "communes": [
      "Valparaíso",
      "Viña del Mar",
      "Concón",
      "Quilpué",
      "Villa Alemana",
      "Casablanca",
      "Quintero",
      "Puchuncaví",
      "Juan Fernández",
      "Isla de Pascua"
    ],
    "marketZone": "costera_central"
  },
  {
    "id": "urb_quillota_calera",
    "name": "Conurbación Quillota–La Calera",
    "category": "Centro agroindustrial interior",
    "centroid": {
      "lat": -32.8803,
      "lng": -71.2474
    },
    "urbanRadiusKm": 14,
    "influenceRadiusKm": 55,
    "communes": [
      "Quillota",
      "Calera",
      "Hijuelas",
      "La Cruz",
      "Nogales",
      "Limache",
      "Olmué"
    ],
    "marketZone": "valparaiso_interior_valle"
  },
  {
    "id": "urb_san_antonio",
    "name": "Conurbación Portuaria y Litoral San Antonio",
    "category": "Litoral central costero",
    "centroid": {
      "lat": -33.5931,
      "lng": -71.6067
    },
    "urbanRadiusKm": 15,
    "influenceRadiusKm": 55,
    "communes": [
      "San Antonio",
      "Cartagena",
      "El Quisco",
      "El Tabo",
      "Algarrobo",
      "Santo Domingo"
    ],
    "marketZone": "litoral_central"
  },
  {
    "id": "urb_los_andes_san_felipe",
    "name": "Conurbación Aconcagua (Los Andes–San Felipe)",
    "category": "Centro cordillerano agro-minero",
    "centroid": {
      "lat": -32.8337,
      "lng": -70.598
    },
    "urbanRadiusKm": 15,
    "influenceRadiusKm": 55,
    "communes": [
      "Los Andes",
      "San Felipe",
      "Calle Larga",
      "Rinconada",
      "San Esteban",
      "Catemu",
      "Llaillay",
      "Panquehue",
      "Putaendo",
      "Santa María",
      "La Ligua",
      "Cabildo",
      "Papudo",
      "Petorca",
      "Zapallar"
    ],
    "marketZone": "aconcagua_cordillera"
  },
  {
    "id": "urb_gran_santiago",
    "name": "Gran Santiago",
    "category": "Metrópoli nacional",
    "centroid": {
      "lat": -33.4489,
      "lng": -70.6693
    },
    "urbanRadiusKm": 35,
    "influenceRadiusKm": 80,
    "communes": [
      "Santiago",
      "Cerrillos",
      "Cerro Navia",
      "Conchalí",
      "El Bosque",
      "Estación Central",
      "Huechuraba",
      "Independencia",
      "La Cisterna",
      "La Florida",
      "La Granja",
      "La Pintana",
      "La Reina",
      "Las Condes",
      "Lo Barnechea",
      "Lo Espejo",
      "Lo Prado",
      "Macul",
      "Maipú",
      "Ñuñoa",
      "Pedro Aguirre Cerda",
      "Peñalolén",
      "Providencia",
      "Pudahuel",
      "Quilicura",
      "Quinta Normal",
      "Recoleta",
      "Renca",
      "San Joaquín",
      "San Miguel",
      "San Ramón",
      "Vitacura",
      "Puente Alto",
      "Pirque",
      "San José de Maipo",
      "Colina",
      "Lampa",
      "Tiltil",
      "San Bernardo",
      "Buin",
      "Calera de Tango",
      "Paine",
      "Talagante",
      "El Monte",
      "Isla de Maipo",
      "Padre Hurtado",
      "Peñaflor"
    ],
    "marketZone": "metropolitana_central"
  },
  {
    "id": "urb_melipilla",
    "name": "Melipilla",
    "category": "Centro agropecuario poniente",
    "centroid": {
      "lat": -33.6891,
      "lng": -71.2158
    },
    "urbanRadiusKm": 12,
    "influenceRadiusKm": 55,
    "communes": [
      "Melipilla",
      "Alhué",
      "Curacaví",
      "María Pinto",
      "San Pedro"
    ],
    "marketZone": "metropolitana_poniente"
  },
  {
    "id": "urb_rancagua_machali",
    "name": "Conurbación Rancagua–Machalí",
    "category": "Capital regional agro-minera",
    "centroid": {
      "lat": -34.1701,
      "lng": -70.7406
    },
    "urbanRadiusKm": 15,
    "influenceRadiusKm": 60,
    "communes": [
      "Rancagua",
      "Machalí",
      "Graneros",
      "Mostazal",
      "Codegua",
      "Requínoa",
      "Rengo",
      "Coinco",
      "Coltauco",
      "Doñihue",
      "Las Cabras",
      "Malloa",
      "Olivar",
      "Peumo",
      "Pichidegua",
      "Quinta de Tilcoco",
      "San Vicente"
    ],
    "marketZone": "ohiggins_central"
  },
  {
    "id": "urb_san_fernando",
    "name": "San Fernando y Valle de Colchagua",
    "category": "Centro agroindustrial vitivinícola",
    "centroid": {
      "lat": -34.5839,
      "lng": -70.9892
    },
    "urbanRadiusKm": 14,
    "influenceRadiusKm": 60,
    "communes": [
      "San Fernando",
      "Chépica",
      "Chimbarongo",
      "Lolol",
      "Nancagua",
      "Palmilla",
      "Peralillo",
      "Placilla",
      "Pumanque",
      "Santa Cruz",
      "Pichilemu",
      "La Estrella",
      "Litueche",
      "Marchihue",
      "Navidad",
      "Paredones"
    ],
    "marketZone": "ohiggins_colchagua_secano"
  },
  {
    "id": "urb_curico",
    "name": "Curicó",
    "category": "Centro agroindustrial norte del Maule",
    "centroid": {
      "lat": -34.9828,
      "lng": -71.2394
    },
    "urbanRadiusKm": 14,
    "influenceRadiusKm": 55,
    "communes": [
      "Curicó",
      "Hualañé",
      "Licantén",
      "Molina",
      "Rauco",
      "Romeral",
      "Sagrada Familia",
      "Teno",
      "Vichuquén"
    ],
    "marketZone": "maule_norte_curico"
  },
  {
    "id": "urb_talca",
    "name": "Talca",
    "category": "Capital regional agraria",
    "centroid": {
      "lat": -35.4264,
      "lng": -71.6554
    },
    "urbanRadiusKm": 15,
    "influenceRadiusKm": 60,
    "communes": [
      "Talca",
      "Maule",
      "San Clemente",
      "Pelarco",
      "Pencahue",
      "Río Claro",
      "San Rafael",
      "Constitución",
      "Curepto",
      "Empedrado"
    ],
    "marketZone": "maule_central"
  },
  {
    "id": "urb_linares",
    "name": "Linares",
    "category": "Centro agropecuario sur del Maule",
    "centroid": {
      "lat": -35.8454,
      "lng": -71.5979
    },
    "urbanRadiusKm": 12,
    "influenceRadiusKm": 55,
    "communes": [
      "Linares",
      "Colbún",
      "Longaví",
      "Parral",
      "Retiro",
      "San Javier",
      "Villa Alegre",
      "Yerbas Buenas"
    ],
    "marketZone": "maule_sur_linares"
  },
  {
    "id": "urb_cauquenes",
    "name": "Cauquenes",
    "category": "Centro secano costero del Maule",
    "centroid": {
      "lat": -35.9671,
      "lng": -72.3149
    },
    "urbanRadiusKm": 10,
    "influenceRadiusKm": 50,
    "communes": [
      "Cauquenes",
      "Chanco",
      "Pelluhue"
    ],
    "marketZone": "maule_costa_cauquenes"
  },
  {
    "id": "urb_chillan",
    "name": "Conurbación Chillán–Chillán Viejo",
    "category": "Capital regional agroindustrial",
    "centroid": {
      "lat": -36.6066,
      "lng": -72.1034
    },
    "urbanRadiusKm": 15,
    "influenceRadiusKm": 60,
    "communes": [
      "Chillán",
      "Chillán Viejo",
      "Pinto",
      "Coihueco",
      "San Carlos",
      "Bulnes",
      "San Ignacio",
      "El Carmen",
      "Yungay",
      "Pemuco",
      "Quillón",
      "Quirihue",
      "Cobquecura",
      "Coelemu",
      "Ninhue",
      "Portezuelo",
      "Ránquil",
      "Treguaco",
      "Ñiquén",
      "San Fabián",
      "San Nicolás"
    ],
    "marketZone": "nuble_central"
  },
  {
    "id": "urb_gran_concepcion",
    "name": "Gran Concepción",
    "category": "Área metropolitana sur",
    "centroid": {
      "lat": -36.8269,
      "lng": -73.0503
    },
    "urbanRadiusKm": 22,
    "influenceRadiusKm": 70,
    "communes": [
      "Concepción",
      "San Pedro de la Paz",
      "Chiguayante",
      "Talcahuano",
      "Hualpén",
      "Penco",
      "Coronel",
      "Lota",
      "Tomé",
      "Hualqui",
      "Florida",
      "Santa Juana"
    ],
    "marketZone": "biobio_costero_urbano"
  },
  {
    "id": "urb_los_angeles",
    "name": "Los Ángeles",
    "category": "Capital provincial agroindustrial",
    "centroid": {
      "lat": -37.4697,
      "lng": -72.3537
    },
    "urbanRadiusKm": 16,
    "influenceRadiusKm": 65,
    "communes": [
      "Los Ángeles",
      "Yumbel",
      "Cabrero",
      "Laja",
      "San Rosendo",
      "Tucapel",
      "Antuco",
      "Quilleco",
      "Santa Bárbara",
      "Mulchén",
      "Negrete",
      "Nacimiento",
      "Quilaco",
      "Alto Biobío"
    ],
    "marketZone": "biobio_interior_agro"
  },
  {
    "id": "urb_arauco_lebu",
    "name": "Provincia de Arauco (Lebu–Cañete)",
    "category": "Centro forestal y costero",
    "centroid": {
      "lat": -37.6074,
      "lng": -73.6558
    },
    "urbanRadiusKm": 12,
    "influenceRadiusKm": 60,
    "communes": [
      "Lebu",
      "Arauco",
      "Cañete",
      "Contulmo",
      "Curanilahue",
      "Los Álamos",
      "Tirúa"
    ],
    "marketZone": "biobio_arauco_costa"
  },
  {
    "id": "urb_angol",
    "name": "Angol y Malleco Norte",
    "category": "Centro agro-forestal norte de La Araucanía",
    "centroid": {
      "lat": -37.7952,
      "lng": -72.7161
    },
    "urbanRadiusKm": 12,
    "influenceRadiusKm": 55,
    "communes": [
      "Angol",
      "Collipulli",
      "Curacautín",
      "Ercilla",
      "Lonquimay",
      "Los Sauces",
      "Lumaco",
      "Purén",
      "Renaico",
      "Traiguén",
      "Victoria"
    ],
    "marketZone": "araucania_malleco"
  },
  {
    "id": "urb_temuco_padre_las_casas",
    "name": "Conurbación Temuco–Padre Las Casas",
    "category": "Capital regional sur",
    "centroid": {
      "lat": -38.7359,
      "lng": -72.5904
    },
    "urbanRadiusKm": 18,
    "influenceRadiusKm": 65,
    "communes": [
      "Temuco",
      "Padre Las Casas",
      "Vilcún",
      "Freire",
      "Pitrufquén",
      "Gorbea",
      "Lautaro",
      "Perquenco",
      "Nueva Imperial",
      "Carahue",
      "Cunco",
      "Galvarino",
      "Melipeuco",
      "Saavedra",
      "Teodoro Schmidt",
      "Toltén",
      "Cholchol"
    ],
    "marketZone": "araucania_central"
  },
  {
    "id": "urb_villarrica_pucon",
    "name": "Eje Lacustre Villarrica–Pucón",
    "category": "Destino turístico lacustre internacional",
    "centroid": {
      "lat": -39.2854,
      "lng": -72.2279
    },
    "urbanRadiusKm": 16,
    "influenceRadiusKm": 60,
    "communes": [
      "Villarrica",
      "Pucón",
      "Curarrehue",
      "Loncoche"
    ],
    "marketZone": "araucania_lacustre"
  },
  {
    "id": "urb_valdivia",
    "name": "Valdivia",
    "category": "Capital regional fluvial",
    "centroid": {
      "lat": -39.8142,
      "lng": -73.2459
    },
    "urbanRadiusKm": 15,
    "influenceRadiusKm": 60,
    "communes": [
      "Valdivia",
      "Corral",
      "Paillaco",
      "Los Lagos",
      "Máfil",
      "Mariquina",
      "Lanco",
      "Panguipulli"
    ],
    "marketZone": "rios_fluvial_costero"
  },
  {
    "id": "urb_la_union_ranco",
    "name": "La Unión y Cuenca del Ranco",
    "category": "Centro agropecuario y lacustre sur",
    "centroid": {
      "lat": -40.2947,
      "lng": -73.0825
    },
    "urbanRadiusKm": 12,
    "influenceRadiusKm": 55,
    "communes": [
      "La Unión",
      "Futrono",
      "Lago Ranco",
      "Río Bueno"
    ],
    "marketZone": "rios_ranco_agro"
  },
  {
    "id": "urb_osorno",
    "name": "Osorno",
    "category": "Centro ganadero agrícola regional",
    "centroid": {
      "lat": -40.5739,
      "lng": -73.1335
    },
    "urbanRadiusKm": 14,
    "influenceRadiusKm": 60,
    "communes": [
      "Osorno",
      "Puyehue",
      "Río Negro",
      "Purranque",
      "Puerto Octay",
      "San Pablo",
      "San Juan de la Costa"
    ],
    "marketZone": "lagos_norte_agro"
  },
  {
    "id": "urb_puerto_montt_varas",
    "name": "Eje Lacustre Puerto Montt–Puerto Varas",
    "category": "Destino turístico internacional y capital regional",
    "centroid": {
      "lat": -41.3895,
      "lng": -72.9368
    },
    "urbanRadiusKm": 20,
    "influenceRadiusKm": 75,
    "communes": [
      "Puerto Montt",
      "Puerto Varas",
      "Llanquihue",
      "Frutillar",
      "Calbuco",
      "Los Muermos",
      "Cochamó",
      "Fresia",
      "Maullín"
    ],
    "marketZone": "lagos_sur_lacustre"
  },
  {
    "id": "urb_castro_ancud",
    "name": "Archipiélago de Chiloé (Castro–Ancud)",
    "category": "Centro insular patrimonial y acuícola",
    "centroid": {
      "lat": -42.4721,
      "lng": -73.7732
    },
    "urbanRadiusKm": 15,
    "influenceRadiusKm": 70,
    "communes": [
      "Castro",
      "Ancud",
      "Chonchi",
      "Curaco de Vélez",
      "Dalcahue",
      "Puqueldón",
      "Queilén",
      "Quellón",
      "Quemchi",
      "Quinchao",
      "Chaitén",
      "Futaleufú",
      "Hualaihué",
      "Palena"
    ],
    "marketZone": "lagos_chiloe_palena"
  },
  {
    "id": "urb_coyhaique",
    "name": "Coyhaique y Puerto Aysén",
    "category": "Capital regional austral interior",
    "centroid": {
      "lat": -45.5712,
      "lng": -72.0683
    },
    "urbanRadiusKm": 12,
    "influenceRadiusKm": 70,
    "communes": [
      "Coyhaique",
      "Aysén",
      "Río Ibáñez",
      "Lago Verde",
      "Cisnes",
      "Guaitecas",
      "Cochrane",
      "O'Higgins",
      "Tortel",
      "Chile Chico"
    ],
    "marketZone": "aysen_central"
  },
  {
    "id": "urb_punta_arenas",
    "name": "Punta Arenas",
    "category": "Metrópoli austral",
    "centroid": {
      "lat": -53.1638,
      "lng": -70.9171
    },
    "urbanRadiusKm": 15,
    "influenceRadiusKm": 75,
    "communes": [
      "Punta Arenas",
      "Laguna Blanca",
      "Río Verde",
      "San Gregorio",
      "Porvenir",
      "Primavera",
      "Timaukel",
      "Cabo de Hornos",
      "Antártica"
    ],
    "marketZone": "magallanes_austral"
  },
  {
    "id": "urb_puerto_natales",
    "name": "Puerto Natales y Torres del Paine",
    "category": "Centro turístico austral internacional",
    "centroid": {
      "lat": -51.7236,
      "lng": -72.5061
    },
    "urbanRadiusKm": 10,
    "influenceRadiusKm": 65,
    "communes": [
      "Natales",
      "Torres del Paine"
    ],
    "marketZone": "magallanes_natales_paine"
  }
],

  regions: [
  {
    "code": "CL-AP",
    "name": "Región de Arica y Parinacota",
    "defaultCityId": "urb_arica",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": false,
      "isLakeZone": false,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-TA",
    "name": "Región de Tarapacá",
    "defaultCityId": "urb_iquique_alto_hospicio",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": false,
      "isForestryZone": false,
      "isLakeZone": false,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-AN",
    "name": "Región de Antofagasta",
    "defaultCityId": "urb_antofagasta",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": false,
      "isForestryZone": false,
      "isLakeZone": false,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-AT",
    "name": "Región de Atacama",
    "defaultCityId": "urb_copiapo",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": false,
      "isLakeZone": false,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-CO",
    "name": "Región de Coquimbo",
    "defaultCityId": "urb_la_serena_coquimbo",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": false,
      "isLakeZone": false,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-VS",
    "name": "Región de Valparaíso",
    "defaultCityId": "urb_gran_valparaiso",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": false,
      "isLakeZone": false,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-RM",
    "name": "Región Metropolitana de Santiago",
    "defaultCityId": "urb_gran_santiago",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": false,
      "isLakeZone": false,
      "isCoastalZone": false
    }
  },
  {
    "code": "CL-LI",
    "name": "Región del Libertador General Bernardo O'Higgins",
    "defaultCityId": "urb_rancagua_machali",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": false,
      "isLakeZone": false,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-ML",
    "name": "Región del Maule",
    "defaultCityId": "urb_talca",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": true,
      "isLakeZone": true,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-NB",
    "name": "Región de Ñuble",
    "defaultCityId": "urb_chillan",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": true,
      "isLakeZone": false,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-BI",
    "name": "Región del Biobío",
    "defaultCityId": "urb_gran_concepcion",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": true,
      "isLakeZone": true,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-AR",
    "name": "Región de La Araucanía",
    "defaultCityId": "urb_temuco_padre_las_casas",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": true,
      "isLakeZone": true,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-LR",
    "name": "Región de Los Ríos",
    "defaultCityId": "urb_valdivia",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": true,
      "isLakeZone": true,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-LL",
    "name": "Región de Los Lagos",
    "defaultCityId": "urb_puerto_montt_varas",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": true,
      "isLakeZone": true,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-AI",
    "name": "Región de Aysén del General Carlos Ibáñez del Campo",
    "defaultCityId": "urb_coyhaique",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": true,
      "isLakeZone": true,
      "isCoastalZone": true
    }
  },
  {
    "code": "CL-MA",
    "name": "Región de Magallanes y de la Antártica Chilena",
    "defaultCityId": "urb_punta_arenas",
    "classifications": {
      "isTourismZone": true,
      "isAgriculturalZone": true,
      "isForestryZone": false,
      "isLakeZone": false,
      "isCoastalZone": true
    }
  }
],

  communes: [
  {
    "cut": "15101",
    "name": "Arica",
    "prov": "Arica",
    "reg": "CL-AP",
    "lat": -18.4783,
    "lng": -70.3126,
    "coast": true,
    "extreme": true,
    "cityId": "urb_arica"
  },
  {
    "cut": "15102",
    "name": "Camarones",
    "prov": "Arica",
    "reg": "CL-AP",
    "lat": -19.0061,
    "lng": -69.8681,
    "coast": true,
    "rural": true,
    "extreme": true,
    "cityId": "urb_arica"
  },
  {
    "cut": "15201",
    "name": "Putre",
    "prov": "Parinacota",
    "reg": "CL-AP",
    "lat": -18.1958,
    "lng": -69.5597,
    "rural": true,
    "extreme": true,
    "tour": true,
    "cityId": "urb_arica"
  },
  {
    "cut": "15202",
    "name": "General Lagos",
    "prov": "Parinacota",
    "reg": "CL-AP",
    "lat": -17.8425,
    "lng": -69.5811,
    "rural": true,
    "extreme": true,
    "cityId": "urb_arica"
  },
  {
    "cut": "01101",
    "name": "Iquique",
    "prov": "Iquique",
    "reg": "CL-TA",
    "lat": -20.2307,
    "lng": -70.1357,
    "coast": true,
    "tour": true,
    "cityId": "urb_iquique_alto_hospicio"
  },
  {
    "cut": "01107",
    "name": "Alto Hospicio",
    "prov": "Iquique",
    "reg": "CL-TA",
    "lat": -20.2694,
    "lng": -70.0989,
    "cityId": "urb_iquique_alto_hospicio"
  },
  {
    "cut": "01401",
    "name": "Pozo Almonte",
    "prov": "Tamarugal",
    "reg": "CL-TA",
    "lat": -20.2589,
    "lng": -69.7858,
    "rural": true,
    "cityId": "urb_iquique_alto_hospicio"
  },
  {
    "cut": "01402",
    "name": "Camiña",
    "prov": "Tamarugal",
    "reg": "CL-TA",
    "lat": -19.3114,
    "lng": -69.4244,
    "rural": true,
    "ag": true,
    "cityId": "urb_iquique_alto_hospicio"
  },
  {
    "cut": "01403",
    "name": "Colchane",
    "prov": "Tamarugal",
    "reg": "CL-TA",
    "lat": -19.2764,
    "lng": -68.6386,
    "rural": true,
    "extreme": true,
    "cityId": "urb_iquique_alto_hospicio"
  },
  {
    "cut": "01404",
    "name": "Huara",
    "prov": "Tamarugal",
    "reg": "CL-TA",
    "lat": -19.9964,
    "lng": -69.7719,
    "rural": true,
    "cityId": "urb_iquique_alto_hospicio"
  },
  {
    "cut": "01405",
    "name": "Pica",
    "prov": "Tamarugal",
    "reg": "CL-TA",
    "lat": -20.4889,
    "lng": -69.3294,
    "rural": true,
    "tour": true,
    "ag": true,
    "cityId": "urb_iquique_alto_hospicio"
  },
  {
    "cut": "02101",
    "name": "Antofagasta",
    "prov": "Antofagasta",
    "reg": "CL-AN",
    "lat": -23.6509,
    "lng": -70.3975,
    "coast": true,
    "cityId": "urb_antofagasta"
  },
  {
    "cut": "02102",
    "name": "Mejillones",
    "prov": "Antofagasta",
    "reg": "CL-AN",
    "lat": -23.1022,
    "lng": -70.4497,
    "coast": true,
    "cityId": "urb_antofagasta"
  },
  {
    "cut": "02103",
    "name": "Sierra Gorda",
    "prov": "Antofagasta",
    "reg": "CL-AN",
    "lat": -22.8889,
    "lng": -69.3197,
    "rural": true,
    "cityId": "urb_antofagasta"
  },
  {
    "cut": "02104",
    "name": "Taltal",
    "prov": "Antofagasta",
    "reg": "CL-AN",
    "lat": -25.4056,
    "lng": -70.4839,
    "coast": true,
    "rural": true,
    "cityId": "urb_antofagasta"
  },
  {
    "cut": "02201",
    "name": "Calama",
    "prov": "El Loa",
    "reg": "CL-AN",
    "lat": -22.4544,
    "lng": -68.9294,
    "cityId": "urb_calama"
  },
  {
    "cut": "02202",
    "name": "Ollagüe",
    "prov": "El Loa",
    "reg": "CL-AN",
    "lat": -21.2253,
    "lng": -68.2522,
    "rural": true,
    "extreme": true,
    "cityId": "urb_calama"
  },
  {
    "cut": "02203",
    "name": "San Pedro de Atacama",
    "prov": "El Loa",
    "reg": "CL-AN",
    "lat": -22.9119,
    "lng": -68.2,
    "rural": true,
    "tour": true,
    "cityId": "urb_calama"
  },
  {
    "cut": "02301",
    "name": "Tocopilla",
    "prov": "Tocopilla",
    "reg": "CL-AN",
    "lat": -22.0919,
    "lng": -70.1978,
    "coast": true,
    "cityId": "urb_calama"
  },
  {
    "cut": "02302",
    "name": "María Elena",
    "prov": "Tocopilla",
    "reg": "CL-AN",
    "lat": -22.3422,
    "lng": -69.6631,
    "rural": true,
    "cityId": "urb_calama"
  },
  {
    "cut": "03101",
    "name": "Copiapó",
    "prov": "Copiapó",
    "reg": "CL-AT",
    "lat": -27.3668,
    "lng": -70.3323,
    "cityId": "urb_copiapo"
  },
  {
    "cut": "03102",
    "name": "Caldera",
    "prov": "Copiapó",
    "reg": "CL-AT",
    "lat": -27.0683,
    "lng": -70.8239,
    "coast": true,
    "tour": true,
    "cityId": "urb_copiapo"
  },
  {
    "cut": "03103",
    "name": "Tierra Amarilla",
    "prov": "Copiapó",
    "reg": "CL-AT",
    "lat": -27.4819,
    "lng": -70.265,
    "rural": true,
    "ag": true,
    "cityId": "urb_copiapo"
  },
  {
    "cut": "03201",
    "name": "Chañaral",
    "prov": "Chañaral",
    "reg": "CL-AT",
    "lat": -26.3475,
    "lng": -70.6222,
    "coast": true,
    "cityId": "urb_copiapo"
  },
  {
    "cut": "03202",
    "name": "Diego de Almagro",
    "prov": "Chañaral",
    "reg": "CL-AT",
    "lat": -26.3917,
    "lng": -70.0467,
    "rural": true,
    "cityId": "urb_copiapo"
  },
  {
    "cut": "03301",
    "name": "Vallenar",
    "prov": "Huasco",
    "reg": "CL-AT",
    "lat": -28.575,
    "lng": -70.7581,
    "ag": true,
    "cityId": "urb_vallenar"
  },
  {
    "cut": "03302",
    "name": "Alto del Carmen",
    "prov": "Huasco",
    "reg": "CL-AT",
    "lat": -28.7597,
    "lng": -70.4858,
    "rural": true,
    "ag": true,
    "cityId": "urb_vallenar"
  },
  {
    "cut": "03303",
    "name": "Freirina",
    "prov": "Huasco",
    "reg": "CL-AT",
    "lat": -28.5081,
    "lng": -71.0792,
    "rural": true,
    "cityId": "urb_vallenar"
  },
  {
    "cut": "03304",
    "name": "Huasco",
    "prov": "Huasco",
    "reg": "CL-AT",
    "lat": -28.4678,
    "lng": -71.2217,
    "coast": true,
    "cityId": "urb_vallenar"
  },
  {
    "cut": "04101",
    "name": "La Serena",
    "prov": "Elqui",
    "reg": "CL-CO",
    "lat": -29.9027,
    "lng": -71.252,
    "coast": true,
    "tour": true,
    "cityId": "urb_la_serena_coquimbo"
  },
  {
    "cut": "04102",
    "name": "Coquimbo",
    "prov": "Elqui",
    "reg": "CL-CO",
    "lat": -29.9533,
    "lng": -71.3395,
    "coast": true,
    "tour": true,
    "cityId": "urb_la_serena_coquimbo"
  },
  {
    "cut": "04103",
    "name": "Andacollo",
    "prov": "Elqui",
    "reg": "CL-CO",
    "lat": -30.2289,
    "lng": -71.085,
    "rural": true,
    "cityId": "urb_la_serena_coquimbo"
  },
  {
    "cut": "04104",
    "name": "La Higuera",
    "prov": "Elqui",
    "reg": "CL-CO",
    "lat": -29.5086,
    "lng": -71.2675,
    "coast": true,
    "rural": true,
    "cityId": "urb_la_serena_coquimbo"
  },
  {
    "cut": "04105",
    "name": "Paihuano",
    "prov": "Elqui",
    "reg": "CL-CO",
    "lat": -30.0275,
    "lng": -70.5186,
    "rural": true,
    "tour": true,
    "ag": true,
    "cityId": "urb_la_serena_coquimbo"
  },
  {
    "cut": "04106",
    "name": "Vicuña",
    "prov": "Elqui",
    "reg": "CL-CO",
    "lat": -30.0319,
    "lng": -70.7081,
    "rural": true,
    "tour": true,
    "ag": true,
    "cityId": "urb_la_serena_coquimbo"
  },
  {
    "cut": "04201",
    "name": "Illapel",
    "prov": "Choapa",
    "reg": "CL-CO",
    "lat": -31.6308,
    "lng": -71.1653,
    "ag": true,
    "cityId": "urb_illapel"
  },
  {
    "cut": "04202",
    "name": "Canela",
    "prov": "Choapa",
    "reg": "CL-CO",
    "lat": -31.3986,
    "lng": -71.455,
    "rural": true,
    "cityId": "urb_illapel"
  },
  {
    "cut": "04203",
    "name": "Los Vilos",
    "prov": "Choapa",
    "reg": "CL-CO",
    "lat": -31.9125,
    "lng": -71.5122,
    "coast": true,
    "tour": true,
    "cityId": "urb_illapel"
  },
  {
    "cut": "04204",
    "name": "Salamanca",
    "prov": "Choapa",
    "reg": "CL-CO",
    "lat": -31.7792,
    "lng": -70.965,
    "rural": true,
    "ag": true,
    "cityId": "urb_illapel"
  },
  {
    "cut": "04301",
    "name": "Ovalle",
    "prov": "Limarí",
    "reg": "CL-CO",
    "lat": -30.6011,
    "lng": -71.2003,
    "ag": true,
    "cityId": "urb_ovalle"
  },
  {
    "cut": "04302",
    "name": "Combarbalá",
    "prov": "Limarí",
    "reg": "CL-CO",
    "lat": -31.1833,
    "lng": -71,
    "rural": true,
    "cityId": "urb_ovalle"
  },
  {
    "cut": "04303",
    "name": "Monte Patria",
    "prov": "Limarí",
    "reg": "CL-CO",
    "lat": -30.6936,
    "lng": -70.9472,
    "rural": true,
    "ag": true,
    "cityId": "urb_ovalle"
  },
  {
    "cut": "04304",
    "name": "Punitaqui",
    "prov": "Limarí",
    "reg": "CL-CO",
    "lat": -30.8267,
    "lng": -71.2583,
    "rural": true,
    "ag": true,
    "cityId": "urb_ovalle"
  },
  {
    "cut": "04305",
    "name": "Río Hurtado",
    "prov": "Limarí",
    "reg": "CL-CO",
    "lat": -30.2667,
    "lng": -70.6667,
    "rural": true,
    "ag": true,
    "cityId": "urb_ovalle"
  },
  {
    "cut": "05101",
    "name": "Valparaíso",
    "prov": "Valparaíso",
    "reg": "CL-VS",
    "lat": -33.0472,
    "lng": -71.6127,
    "coast": true,
    "tour": true,
    "cityId": "urb_gran_valparaiso"
  },
  {
    "cut": "05102",
    "name": "Casablanca",
    "prov": "Valparaíso",
    "reg": "CL-VS",
    "lat": -33.3211,
    "lng": -71.4081,
    "ag": true,
    "tour": true,
    "cityId": "urb_gran_valparaiso"
  },
  {
    "cut": "05103",
    "name": "Concón",
    "prov": "Valparaíso",
    "reg": "CL-VS",
    "lat": -32.9228,
    "lng": -71.5194,
    "coast": true,
    "tour": true,
    "cityId": "urb_gran_valparaiso"
  },
  {
    "cut": "05104",
    "name": "Juan Fernández",
    "prov": "Valparaíso",
    "reg": "CL-VS",
    "lat": -33.6425,
    "lng": -78.8317,
    "coast": true,
    "insular": true,
    "extreme": true,
    "tour": true,
    "cityId": "urb_gran_valparaiso"
  },
  {
    "cut": "05105",
    "name": "Puchuncaví",
    "prov": "Valparaíso",
    "reg": "CL-VS",
    "lat": -32.7233,
    "lng": -71.4136,
    "coast": true,
    "tour": true,
    "cityId": "urb_gran_valparaiso"
  },
  {
    "cut": "05107",
    "name": "Quintero",
    "prov": "Valparaíso",
    "reg": "CL-VS",
    "lat": -32.7817,
    "lng": -71.5303,
    "coast": true,
    "cityId": "urb_gran_valparaiso"
  },
  {
    "cut": "05109",
    "name": "Viña del Mar",
    "prov": "Valparaíso",
    "reg": "CL-VS",
    "lat": -33.0245,
    "lng": -71.5518,
    "coast": true,
    "tour": true,
    "cityId": "urb_gran_valparaiso"
  },
  {
    "cut": "05201",
    "name": "Isla de Pascua",
    "prov": "Isla de Pascua",
    "reg": "CL-VS",
    "lat": -27.15,
    "lng": -109.4333,
    "coast": true,
    "insular": true,
    "extreme": true,
    "tour": true,
    "cityId": "urb_gran_valparaiso"
  },
  {
    "cut": "05301",
    "name": "Los Andes",
    "prov": "Los Andes",
    "reg": "CL-VS",
    "lat": -32.8337,
    "lng": -70.598,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05302",
    "name": "Calle Larga",
    "prov": "Los Andes",
    "reg": "CL-VS",
    "lat": -32.8542,
    "lng": -70.6231,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05303",
    "name": "Rinconada",
    "prov": "Los Andes",
    "reg": "CL-VS",
    "lat": -32.8681,
    "lng": -70.6869,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05304",
    "name": "San Esteban",
    "prov": "Los Andes",
    "reg": "CL-VS",
    "lat": -32.8,
    "lng": -70.5833,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05401",
    "name": "La Ligua",
    "prov": "Petorca",
    "reg": "CL-VS",
    "lat": -32.4497,
    "lng": -71.2319,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05402",
    "name": "Cabildo",
    "prov": "Petorca",
    "reg": "CL-VS",
    "lat": -32.4278,
    "lng": -71.0708,
    "rural": true,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05403",
    "name": "Papudo",
    "prov": "Petorca",
    "reg": "CL-VS",
    "lat": -32.5078,
    "lng": -71.4475,
    "coast": true,
    "tour": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05404",
    "name": "Petorca",
    "prov": "Petorca",
    "reg": "CL-VS",
    "lat": -32.2536,
    "lng": -70.9328,
    "rural": true,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05405",
    "name": "Zapallar",
    "prov": "Petorca",
    "reg": "CL-VS",
    "lat": -32.5539,
    "lng": -71.4597,
    "coast": true,
    "tour": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05501",
    "name": "Quillota",
    "prov": "Quillota",
    "reg": "CL-VS",
    "lat": -32.8803,
    "lng": -71.2474,
    "ag": true,
    "cityId": "urb_quillota_calera"
  },
  {
    "cut": "05502",
    "name": "Calera",
    "prov": "Quillota",
    "reg": "CL-VS",
    "lat": -32.7869,
    "lng": -71.1925,
    "cityId": "urb_quillota_calera"
  },
  {
    "cut": "05503",
    "name": "Hijuelas",
    "prov": "Quillota",
    "reg": "CL-VS",
    "lat": -32.8,
    "lng": -71.1333,
    "ag": true,
    "cityId": "urb_quillota_calera"
  },
  {
    "cut": "05504",
    "name": "La Cruz",
    "prov": "Quillota",
    "reg": "CL-VS",
    "lat": -32.8258,
    "lng": -71.2294,
    "ag": true,
    "cityId": "urb_quillota_calera"
  },
  {
    "cut": "05506",
    "name": "Nogales",
    "prov": "Quillota",
    "reg": "CL-VS",
    "lat": -32.735,
    "lng": -71.2069,
    "ag": true,
    "cityId": "urb_quillota_calera"
  },
  {
    "cut": "05601",
    "name": "San Antonio",
    "prov": "San Antonio",
    "reg": "CL-VS",
    "lat": -33.5931,
    "lng": -71.6067,
    "coast": true,
    "cityId": "urb_san_antonio"
  },
  {
    "cut": "05602",
    "name": "Algarrobo",
    "prov": "San Antonio",
    "reg": "CL-VS",
    "lat": -33.3678,
    "lng": -71.6697,
    "coast": true,
    "tour": true,
    "cityId": "urb_san_antonio"
  },
  {
    "cut": "05603",
    "name": "Cartagena",
    "prov": "San Antonio",
    "reg": "CL-VS",
    "lat": -33.5531,
    "lng": -71.6083,
    "coast": true,
    "tour": true,
    "cityId": "urb_san_antonio"
  },
  {
    "cut": "05604",
    "name": "El Quisco",
    "prov": "San Antonio",
    "reg": "CL-VS",
    "lat": -33.3956,
    "lng": -71.6978,
    "coast": true,
    "tour": true,
    "cityId": "urb_san_antonio"
  },
  {
    "cut": "05605",
    "name": "El Tabo",
    "prov": "San Antonio",
    "reg": "CL-VS",
    "lat": -33.4561,
    "lng": -71.6644,
    "coast": true,
    "tour": true,
    "cityId": "urb_san_antonio"
  },
  {
    "cut": "05606",
    "name": "Santo Domingo",
    "prov": "San Antonio",
    "reg": "CL-VS",
    "lat": -33.6367,
    "lng": -71.6264,
    "coast": true,
    "tour": true,
    "cityId": "urb_san_antonio"
  },
  {
    "cut": "05701",
    "name": "San Felipe",
    "prov": "San Felipe de Aconcagua",
    "reg": "CL-VS",
    "lat": -32.7503,
    "lng": -70.725,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05702",
    "name": "Catemu",
    "prov": "San Felipe de Aconcagua",
    "reg": "CL-VS",
    "lat": -32.7833,
    "lng": -70.95,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05703",
    "name": "Llaillay",
    "prov": "San Felipe de Aconcagua",
    "reg": "CL-VS",
    "lat": -32.8425,
    "lng": -70.9542,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05704",
    "name": "Panquehue",
    "prov": "San Felipe de Aconcagua",
    "reg": "CL-VS",
    "lat": -32.7667,
    "lng": -70.8333,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05705",
    "name": "Putaendo",
    "prov": "San Felipe de Aconcagua",
    "reg": "CL-VS",
    "lat": -32.6289,
    "lng": -70.7161,
    "rural": true,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05706",
    "name": "Santa María",
    "prov": "San Felipe de Aconcagua",
    "reg": "CL-VS",
    "lat": -32.7481,
    "lng": -70.6583,
    "ag": true,
    "cityId": "urb_los_andes_san_felipe"
  },
  {
    "cut": "05801",
    "name": "Quilpué",
    "prov": "Marga Marga",
    "reg": "CL-VS",
    "lat": -33.0483,
    "lng": -71.4425,
    "cityId": "urb_gran_valparaiso"
  },
  {
    "cut": "05802",
    "name": "Limache",
    "prov": "Marga Marga",
    "reg": "CL-VS",
    "lat": -33.0036,
    "lng": -71.2681,
    "ag": true,
    "cityId": "urb_quillota_calera"
  },
  {
    "cut": "05803",
    "name": "Olmué",
    "prov": "Marga Marga",
    "reg": "CL-VS",
    "lat": -32.9972,
    "lng": -71.1856,
    "tour": true,
    "cityId": "urb_quillota_calera"
  },
  {
    "cut": "05804",
    "name": "Villa Alemana",
    "prov": "Marga Marga",
    "reg": "CL-VS",
    "lat": -33.0425,
    "lng": -71.3733,
    "cityId": "urb_gran_valparaiso"
  },
  {
    "cut": "13101",
    "name": "Santiago",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4489,
    "lng": -70.6693,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13102",
    "name": "Cerrillos",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.5,
    "lng": -70.7167,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13103",
    "name": "Cerro Navia",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4225,
    "lng": -70.7333,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13104",
    "name": "Conchalí",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.3833,
    "lng": -70.6833,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13105",
    "name": "El Bosque",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.5667,
    "lng": -70.6667,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13106",
    "name": "Estación Central",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4667,
    "lng": -70.7,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13107",
    "name": "Huechuraba",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.3667,
    "lng": -70.6333,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13108",
    "name": "Independencia",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4167,
    "lng": -70.6667,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13109",
    "name": "La Cisterna",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.5333,
    "lng": -70.6667,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13110",
    "name": "La Florida",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.5228,
    "lng": -70.5986,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13111",
    "name": "La Granja",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.5333,
    "lng": -70.6167,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13112",
    "name": "La Pintana",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.5833,
    "lng": -70.6333,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13113",
    "name": "La Reina",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.45,
    "lng": -70.5333,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13114",
    "name": "Las Condes",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4167,
    "lng": -70.5833,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13115",
    "name": "Lo Barnechea",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.35,
    "lng": -70.5167,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13116",
    "name": "Lo Espejo",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.5167,
    "lng": -70.6833,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13117",
    "name": "Lo Prado",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.45,
    "lng": -70.7333,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13118",
    "name": "Macul",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4833,
    "lng": -70.6,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13119",
    "name": "Maipú",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.5167,
    "lng": -70.7667,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13120",
    "name": "Ñuñoa",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.45,
    "lng": -70.6,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13121",
    "name": "Pedro Aguirre Cerda",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4833,
    "lng": -70.6833,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13122",
    "name": "Peñalolén",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4833,
    "lng": -70.55,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13123",
    "name": "Providencia",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4333,
    "lng": -70.6167,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13124",
    "name": "Pudahuel",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4333,
    "lng": -70.7667,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13125",
    "name": "Quilicura",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.3667,
    "lng": -70.7333,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13126",
    "name": "Quinta Normal",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4333,
    "lng": -70.7,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13127",
    "name": "Recoleta",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4,
    "lng": -70.6333,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13128",
    "name": "Renca",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4,
    "lng": -70.7167,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13129",
    "name": "San Joaquín",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4833,
    "lng": -70.6333,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13130",
    "name": "San Miguel",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.5,
    "lng": -70.65,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13131",
    "name": "San Ramón",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.5333,
    "lng": -70.6333,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13132",
    "name": "Vitacura",
    "prov": "Santiago",
    "reg": "CL-RM",
    "lat": -33.4,
    "lng": -70.6,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13201",
    "name": "Puente Alto",
    "prov": "Cordillera",
    "reg": "CL-RM",
    "lat": -33.6167,
    "lng": -70.5833,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13202",
    "name": "Pirque",
    "prov": "Cordillera",
    "reg": "CL-RM",
    "lat": -33.6333,
    "lng": -70.55,
    "rural": true,
    "ag": true,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13203",
    "name": "San José de Maipo",
    "prov": "Cordillera",
    "reg": "CL-RM",
    "lat": -33.6333,
    "lng": -70.35,
    "rural": true,
    "tour": true,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13301",
    "name": "Colina",
    "prov": "Chacabuco",
    "reg": "CL-RM",
    "lat": -33.2,
    "lng": -70.6833,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13302",
    "name": "Lampa",
    "prov": "Chacabuco",
    "reg": "CL-RM",
    "lat": -33.2833,
    "lng": -70.8833,
    "rural": true,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13303",
    "name": "Tiltil",
    "prov": "Chacabuco",
    "reg": "CL-RM",
    "lat": -33.0833,
    "lng": -70.9333,
    "rural": true,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13401",
    "name": "San Bernardo",
    "prov": "Maipo",
    "reg": "CL-RM",
    "lat": -33.5833,
    "lng": -70.7,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13402",
    "name": "Buin",
    "prov": "Maipo",
    "reg": "CL-RM",
    "lat": -33.7333,
    "lng": -70.7333,
    "ag": true,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13403",
    "name": "Calera de Tango",
    "prov": "Maipo",
    "reg": "CL-RM",
    "lat": -33.6333,
    "lng": -70.7833,
    "ag": true,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13404",
    "name": "Paine",
    "prov": "Maipo",
    "reg": "CL-RM",
    "lat": -33.8167,
    "lng": -70.75,
    "rural": true,
    "ag": true,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13501",
    "name": "Melipilla",
    "prov": "Melipilla",
    "reg": "CL-RM",
    "lat": -33.6891,
    "lng": -71.2158,
    "ag": true,
    "cityId": "urb_melipilla"
  },
  {
    "cut": "13502",
    "name": "Alhué",
    "prov": "Melipilla",
    "reg": "CL-RM",
    "lat": -34.0333,
    "lng": -71.1,
    "rural": true,
    "cityId": "urb_melipilla"
  },
  {
    "cut": "13503",
    "name": "Curacaví",
    "prov": "Melipilla",
    "reg": "CL-RM",
    "lat": -33.4,
    "lng": -71.1333,
    "rural": true,
    "ag": true,
    "cityId": "urb_melipilla"
  },
  {
    "cut": "13504",
    "name": "María Pinto",
    "prov": "Melipilla",
    "reg": "CL-RM",
    "lat": -33.5167,
    "lng": -71.1167,
    "rural": true,
    "ag": true,
    "cityId": "urb_melipilla"
  },
  {
    "cut": "13505",
    "name": "San Pedro",
    "prov": "Melipilla",
    "reg": "CL-RM",
    "lat": -33.8967,
    "lng": -71.4633,
    "rural": true,
    "ag": true,
    "cityId": "urb_melipilla"
  },
  {
    "cut": "13601",
    "name": "Talagante",
    "prov": "Talagante",
    "reg": "CL-RM",
    "lat": -33.6667,
    "lng": -70.9333,
    "ag": true,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13602",
    "name": "El Monte",
    "prov": "Talagante",
    "reg": "CL-RM",
    "lat": -33.6833,
    "lng": -71.0167,
    "ag": true,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13603",
    "name": "Isla de Maipo",
    "prov": "Talagante",
    "reg": "CL-RM",
    "lat": -33.75,
    "lng": -70.9,
    "ag": true,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13604",
    "name": "Padre Hurtado",
    "prov": "Talagante",
    "reg": "CL-RM",
    "lat": -33.5667,
    "lng": -70.8167,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "13605",
    "name": "Peñaflor",
    "prov": "Talagante",
    "reg": "CL-RM",
    "lat": -33.6167,
    "lng": -70.8833,
    "cityId": "urb_gran_santiago"
  },
  {
    "cut": "06101",
    "name": "Rancagua",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.1701,
    "lng": -70.7406,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06102",
    "name": "Codegua",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.0333,
    "lng": -70.6667,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06103",
    "name": "Coinco",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.2667,
    "lng": -70.95,
    "rural": true,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06104",
    "name": "Coltauco",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.3,
    "lng": -71.0833,
    "rural": true,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06105",
    "name": "Doñihue",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.2167,
    "lng": -70.9667,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06106",
    "name": "Graneros",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.0667,
    "lng": -70.7333,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06107",
    "name": "Las Cabras",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.2833,
    "lng": -71.4667,
    "rural": true,
    "ag": true,
    "tour": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06108",
    "name": "Machalí",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.1833,
    "lng": -70.65,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06109",
    "name": "Malloa",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.45,
    "lng": -70.95,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06110",
    "name": "Mostazal",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34,
    "lng": -70.6833,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06111",
    "name": "Olivar",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.2333,
    "lng": -70.8,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06112",
    "name": "Peumo",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.3967,
    "lng": -71.1689,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06113",
    "name": "Pichidegua",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.35,
    "lng": -71.35,
    "rural": true,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06114",
    "name": "Quinta de Tilcoco",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.35,
    "lng": -70.9667,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06115",
    "name": "Rengo",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.4167,
    "lng": -70.8667,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06116",
    "name": "Requínoa",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.2833,
    "lng": -70.8167,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06117",
    "name": "San Vicente",
    "prov": "Cachapoal",
    "reg": "CL-LI",
    "lat": -34.4333,
    "lng": -71.0833,
    "ag": true,
    "cityId": "urb_rancagua_machali"
  },
  {
    "cut": "06201",
    "name": "Pichilemu",
    "prov": "Cardenal Caro",
    "reg": "CL-LI",
    "lat": -34.385,
    "lng": -72.0047,
    "coast": true,
    "tour": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06202",
    "name": "La Estrella",
    "prov": "Cardenal Caro",
    "reg": "CL-LI",
    "lat": -34.2,
    "lng": -71.65,
    "rural": true,
    "ag": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06203",
    "name": "Litueche",
    "prov": "Cardenal Caro",
    "reg": "CL-LI",
    "lat": -34.1167,
    "lng": -71.7333,
    "rural": true,
    "ag": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06204",
    "name": "Marchihue",
    "prov": "Cardenal Caro",
    "reg": "CL-LI",
    "lat": -34.4,
    "lng": -71.6167,
    "rural": true,
    "ag": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06205",
    "name": "Navidad",
    "prov": "Cardenal Caro",
    "reg": "CL-LI",
    "lat": -33.95,
    "lng": -71.8333,
    "coast": true,
    "rural": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06206",
    "name": "Paredones",
    "prov": "Cardenal Caro",
    "reg": "CL-LI",
    "lat": -34.65,
    "lng": -71.9,
    "coast": true,
    "rural": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06301",
    "name": "San Fernando",
    "prov": "Colchagua",
    "reg": "CL-LI",
    "lat": -34.5839,
    "lng": -70.9892,
    "ag": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06302",
    "name": "Chépica",
    "prov": "Colchagua",
    "reg": "CL-LI",
    "lat": -34.7333,
    "lng": -71.2833,
    "rural": true,
    "ag": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06303",
    "name": "Chimbarongo",
    "prov": "Colchagua",
    "reg": "CL-LI",
    "lat": -34.7,
    "lng": -71.05,
    "ag": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06304",
    "name": "Lolol",
    "prov": "Colchagua",
    "reg": "CL-LI",
    "lat": -34.7333,
    "lng": -71.65,
    "rural": true,
    "ag": true,
    "tour": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06305",
    "name": "Nancagua",
    "prov": "Colchagua",
    "reg": "CL-LI",
    "lat": -34.6667,
    "lng": -71.2167,
    "ag": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06306",
    "name": "Palmilla",
    "prov": "Colchagua",
    "reg": "CL-LI",
    "lat": -34.6,
    "lng": -71.3667,
    "ag": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06307",
    "name": "Peralillo",
    "prov": "Colchagua",
    "reg": "CL-LI",
    "lat": -34.4833,
    "lng": -71.4833,
    "ag": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06308",
    "name": "Placilla",
    "prov": "Colchagua",
    "reg": "CL-LI",
    "lat": -34.6333,
    "lng": -71.1167,
    "ag": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06309",
    "name": "Pumanque",
    "prov": "Colchagua",
    "reg": "CL-LI",
    "lat": -34.6,
    "lng": -71.6667,
    "rural": true,
    "ag": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "06310",
    "name": "Santa Cruz",
    "prov": "Colchagua",
    "reg": "CL-LI",
    "lat": -34.6333,
    "lng": -71.3667,
    "ag": true,
    "tour": true,
    "cityId": "urb_san_fernando"
  },
  {
    "cut": "07101",
    "name": "Talca",
    "prov": "Talca",
    "reg": "CL-ML",
    "lat": -35.4264,
    "lng": -71.6554,
    "cityId": "urb_talca"
  },
  {
    "cut": "07102",
    "name": "Constitución",
    "prov": "Talca",
    "reg": "CL-ML",
    "lat": -35.3333,
    "lng": -72.4167,
    "coast": true,
    "tour": true,
    "cityId": "urb_talca"
  },
  {
    "cut": "07103",
    "name": "Curepto",
    "prov": "Talca",
    "reg": "CL-ML",
    "lat": -35.0833,
    "lng": -72.0333,
    "rural": true,
    "ag": true,
    "cityId": "urb_talca"
  },
  {
    "cut": "07104",
    "name": "Empedrado",
    "prov": "Talca",
    "reg": "CL-ML",
    "lat": -35.6,
    "lng": -72.2833,
    "rural": true,
    "forest": true,
    "cityId": "urb_talca"
  },
  {
    "cut": "07105",
    "name": "Maule",
    "prov": "Talca",
    "reg": "CL-ML",
    "lat": -35.5167,
    "lng": -71.7,
    "ag": true,
    "cityId": "urb_talca"
  },
  {
    "cut": "07106",
    "name": "Pelarco",
    "prov": "Talca",
    "reg": "CL-ML",
    "lat": -35.3833,
    "lng": -71.45,
    "ag": true,
    "cityId": "urb_talca"
  },
  {
    "cut": "07107",
    "name": "Pencahue",
    "prov": "Talca",
    "reg": "CL-ML",
    "lat": -35.4,
    "lng": -71.8,
    "rural": true,
    "ag": true,
    "cityId": "urb_talca"
  },
  {
    "cut": "07108",
    "name": "Río Claro",
    "prov": "Talca",
    "reg": "CL-ML",
    "lat": -35.1833,
    "lng": -71.2667,
    "ag": true,
    "cityId": "urb_talca"
  },
  {
    "cut": "07109",
    "name": "San Clemente",
    "prov": "Talca",
    "reg": "CL-ML",
    "lat": -35.5333,
    "lng": -71.4833,
    "ag": true,
    "tour": true,
    "cityId": "urb_talca"
  },
  {
    "cut": "07110",
    "name": "San Rafael",
    "prov": "Talca",
    "reg": "CL-ML",
    "lat": -35.3167,
    "lng": -71.5333,
    "ag": true,
    "cityId": "urb_talca"
  },
  {
    "cut": "07201",
    "name": "Cauquenes",
    "prov": "Cauquenes",
    "reg": "CL-ML",
    "lat": -35.9671,
    "lng": -72.3149,
    "ag": true,
    "forest": true,
    "cityId": "urb_cauquenes"
  },
  {
    "cut": "07202",
    "name": "Chanco",
    "prov": "Cauquenes",
    "reg": "CL-ML",
    "lat": -35.7333,
    "lng": -72.5333,
    "coast": true,
    "rural": true,
    "cityId": "urb_cauquenes"
  },
  {
    "cut": "07203",
    "name": "Pelluhue",
    "prov": "Cauquenes",
    "reg": "CL-ML",
    "lat": -35.8167,
    "lng": -72.5667,
    "coast": true,
    "tour": true,
    "cityId": "urb_cauquenes"
  },
  {
    "cut": "07301",
    "name": "Curicó",
    "prov": "Curicó",
    "reg": "CL-ML",
    "lat": -34.9828,
    "lng": -71.2394,
    "ag": true,
    "cityId": "urb_curico"
  },
  {
    "cut": "07302",
    "name": "Hualañé",
    "prov": "Curicó",
    "reg": "CL-ML",
    "lat": -34.9833,
    "lng": -71.8,
    "ag": true,
    "cityId": "urb_curico"
  },
  {
    "cut": "07303",
    "name": "Licantén",
    "prov": "Curicó",
    "reg": "CL-ML",
    "lat": -35,
    "lng": -72.0167,
    "coast": true,
    "rural": true,
    "cityId": "urb_curico"
  },
  {
    "cut": "07304",
    "name": "Molina",
    "prov": "Curicó",
    "reg": "CL-ML",
    "lat": -35.1167,
    "lng": -71.2833,
    "ag": true,
    "tour": true,
    "cityId": "urb_curico"
  },
  {
    "cut": "07305",
    "name": "Rauco",
    "prov": "Curicó",
    "reg": "CL-ML",
    "lat": -34.9333,
    "lng": -71.3167,
    "ag": true,
    "cityId": "urb_curico"
  },
  {
    "cut": "07306",
    "name": "Romeral",
    "prov": "Curicó",
    "reg": "CL-ML",
    "lat": -34.9667,
    "lng": -71.1333,
    "ag": true,
    "cityId": "urb_curico"
  },
  {
    "cut": "07307",
    "name": "Sagrada Familia",
    "prov": "Curicó",
    "reg": "CL-ML",
    "lat": -35,
    "lng": -71.3833,
    "ag": true,
    "cityId": "urb_curico"
  },
  {
    "cut": "07308",
    "name": "Teno",
    "prov": "Curicó",
    "reg": "CL-ML",
    "lat": -34.8667,
    "lng": -71.1833,
    "ag": true,
    "cityId": "urb_curico"
  },
  {
    "cut": "07309",
    "name": "Vichuquén",
    "prov": "Curicó",
    "reg": "CL-ML",
    "lat": -34.8833,
    "lng": -72,
    "coast": true,
    "lake": true,
    "tour": true,
    "cityId": "urb_curico"
  },
  {
    "cut": "07401",
    "name": "Linares",
    "prov": "Linares",
    "reg": "CL-ML",
    "lat": -35.8454,
    "lng": -71.5979,
    "ag": true,
    "cityId": "urb_linares"
  },
  {
    "cut": "07402",
    "name": "Colbún",
    "prov": "Linares",
    "reg": "CL-ML",
    "lat": -35.7,
    "lng": -71.4167,
    "ag": true,
    "lake": true,
    "tour": true,
    "cityId": "urb_linares"
  },
  {
    "cut": "07403",
    "name": "Longaví",
    "prov": "Linares",
    "reg": "CL-ML",
    "lat": -35.9667,
    "lng": -71.6833,
    "ag": true,
    "cityId": "urb_linares"
  },
  {
    "cut": "07404",
    "name": "Parral",
    "prov": "Linares",
    "reg": "CL-ML",
    "lat": -36.15,
    "lng": -71.8333,
    "ag": true,
    "cityId": "urb_linares"
  },
  {
    "cut": "07405",
    "name": "Retiro",
    "prov": "Linares",
    "reg": "CL-ML",
    "lat": -36.05,
    "lng": -71.7667,
    "ag": true,
    "cityId": "urb_linares"
  },
  {
    "cut": "07406",
    "name": "San Javier",
    "prov": "Linares",
    "reg": "CL-ML",
    "lat": -35.5833,
    "lng": -71.7333,
    "ag": true,
    "cityId": "urb_linares"
  },
  {
    "cut": "07407",
    "name": "Villa Alegre",
    "prov": "Linares",
    "reg": "CL-ML",
    "lat": -35.6667,
    "lng": -71.75,
    "ag": true,
    "cityId": "urb_linares"
  },
  {
    "cut": "07408",
    "name": "Yerbas Buenas",
    "prov": "Linares",
    "reg": "CL-ML",
    "lat": -35.75,
    "lng": -71.5667,
    "ag": true,
    "cityId": "urb_linares"
  },
  {
    "cut": "16101",
    "name": "Chillán",
    "prov": "Diguillín",
    "reg": "CL-NB",
    "lat": -36.6066,
    "lng": -72.1034,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16102",
    "name": "Bulnes",
    "prov": "Diguillín",
    "reg": "CL-NB",
    "lat": -36.7333,
    "lng": -72.3,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16103",
    "name": "Chillán Viejo",
    "prov": "Diguillín",
    "reg": "CL-NB",
    "lat": -36.6333,
    "lng": -72.1333,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16104",
    "name": "El Carmen",
    "prov": "Diguillín",
    "reg": "CL-NB",
    "lat": -36.8833,
    "lng": -72.0333,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16105",
    "name": "Pemuco",
    "prov": "Diguillín",
    "reg": "CL-NB",
    "lat": -36.9833,
    "lng": -72.1,
    "rural": true,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16106",
    "name": "Pinto",
    "prov": "Diguillín",
    "reg": "CL-NB",
    "lat": -36.85,
    "lng": -71.9,
    "ag": true,
    "tour": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16107",
    "name": "Quillón",
    "prov": "Diguillín",
    "reg": "CL-NB",
    "lat": -36.75,
    "lng": -72.4667,
    "ag": true,
    "lake": true,
    "tour": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16108",
    "name": "San Ignacio",
    "prov": "Diguillín",
    "reg": "CL-NB",
    "lat": -36.8333,
    "lng": -72.05,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16109",
    "name": "Yungay",
    "prov": "Diguillín",
    "reg": "CL-NB",
    "lat": -37.1167,
    "lng": -72.0167,
    "ag": true,
    "forest": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16201",
    "name": "Quirihue",
    "prov": "Itata",
    "reg": "CL-NB",
    "lat": -36.2833,
    "lng": -72.5333,
    "ag": true,
    "forest": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16202",
    "name": "Cobquecura",
    "prov": "Itata",
    "reg": "CL-NB",
    "lat": -36.1333,
    "lng": -72.7833,
    "coast": true,
    "tour": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16203",
    "name": "Coelemu",
    "prov": "Itata",
    "reg": "CL-NB",
    "lat": -36.4833,
    "lng": -72.7,
    "coast": true,
    "forest": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16204",
    "name": "Ninhue",
    "prov": "Itata",
    "reg": "CL-NB",
    "lat": -36.4,
    "lng": -72.4,
    "rural": true,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16205",
    "name": "Portezuelo",
    "prov": "Itata",
    "reg": "CL-NB",
    "lat": -36.5333,
    "lng": -72.4333,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16206",
    "name": "Ránquil",
    "prov": "Itata",
    "reg": "CL-NB",
    "lat": -36.65,
    "lng": -72.55,
    "ag": true,
    "forest": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16207",
    "name": "Treguaco",
    "prov": "Itata",
    "reg": "CL-NB",
    "lat": -36.4333,
    "lng": -72.6667,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16301",
    "name": "San Carlos",
    "prov": "Punilla",
    "reg": "CL-NB",
    "lat": -36.4333,
    "lng": -71.95,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16302",
    "name": "Coihueco",
    "prov": "Punilla",
    "reg": "CL-NB",
    "lat": -36.6167,
    "lng": -71.8333,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16303",
    "name": "Ñiquén",
    "prov": "Punilla",
    "reg": "CL-NB",
    "lat": -36.2833,
    "lng": -71.9,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16304",
    "name": "San Fabián",
    "prov": "Punilla",
    "reg": "CL-NB",
    "lat": -36.55,
    "lng": -71.55,
    "rural": true,
    "tour": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "16305",
    "name": "San Nicolás",
    "prov": "Punilla",
    "reg": "CL-NB",
    "lat": -36.5,
    "lng": -72.2167,
    "ag": true,
    "cityId": "urb_chillan"
  },
  {
    "cut": "08101",
    "name": "Concepción",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -36.8269,
    "lng": -73.0503,
    "coast": true,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08102",
    "name": "Coronel",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -37.0167,
    "lng": -73.1333,
    "coast": true,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08103",
    "name": "Chiguayante",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -36.9167,
    "lng": -73.0167,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08104",
    "name": "Florida",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -36.8167,
    "lng": -72.6667,
    "rural": true,
    "forest": true,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08105",
    "name": "Hualpén",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -36.8,
    "lng": -73.0833,
    "coast": true,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08106",
    "name": "Hualqui",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -36.9833,
    "lng": -72.9333,
    "rural": true,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08107",
    "name": "Lota",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -37.0833,
    "lng": -73.15,
    "coast": true,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08108",
    "name": "Penco",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -36.7333,
    "lng": -72.9833,
    "coast": true,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08109",
    "name": "San Pedro de la Paz",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -36.8422,
    "lng": -73.1042,
    "coast": true,
    "lake": true,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08110",
    "name": "Santa Juana",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -37.1667,
    "lng": -72.9333,
    "rural": true,
    "forest": true,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08111",
    "name": "Talcahuano",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -36.7167,
    "lng": -73.1167,
    "coast": true,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08112",
    "name": "Tomé",
    "prov": "Concepción",
    "reg": "CL-BI",
    "lat": -36.6167,
    "lng": -72.95,
    "coast": true,
    "tour": true,
    "cityId": "urb_gran_concepcion"
  },
  {
    "cut": "08201",
    "name": "Lebu",
    "prov": "Arauco",
    "reg": "CL-BI",
    "lat": -37.6074,
    "lng": -73.6558,
    "coast": true,
    "cityId": "urb_arauco_lebu"
  },
  {
    "cut": "08202",
    "name": "Arauco",
    "prov": "Arauco",
    "reg": "CL-BI",
    "lat": -37.25,
    "lng": -73.3167,
    "coast": true,
    "forest": true,
    "cityId": "urb_arauco_lebu"
  },
  {
    "cut": "08203",
    "name": "Cañete",
    "prov": "Arauco",
    "reg": "CL-BI",
    "lat": -37.8,
    "lng": -73.4,
    "ag": true,
    "forest": true,
    "lake": true,
    "cityId": "urb_arauco_lebu"
  },
  {
    "cut": "08204",
    "name": "Contulmo",
    "prov": "Arauco",
    "reg": "CL-BI",
    "lat": -38.0167,
    "lng": -73.2333,
    "forest": true,
    "lake": true,
    "tour": true,
    "cityId": "urb_arauco_lebu"
  },
  {
    "cut": "08205",
    "name": "Curanilahue",
    "prov": "Arauco",
    "reg": "CL-BI",
    "lat": -37.4833,
    "lng": -73.35,
    "forest": true,
    "cityId": "urb_arauco_lebu"
  },
  {
    "cut": "08206",
    "name": "Los Álamos",
    "prov": "Arauco",
    "reg": "CL-BI",
    "lat": -37.6333,
    "lng": -73.45,
    "forest": true,
    "cityId": "urb_arauco_lebu"
  },
  {
    "cut": "08207",
    "name": "Tirúa",
    "prov": "Arauco",
    "reg": "CL-BI",
    "lat": -38.3333,
    "lng": -73.5,
    "coast": true,
    "rural": true,
    "cityId": "urb_arauco_lebu"
  },
  {
    "cut": "08301",
    "name": "Los Ángeles",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.4697,
    "lng": -72.3537,
    "ag": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08302",
    "name": "Antuco",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.3333,
    "lng": -71.6833,
    "rural": true,
    "tour": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08303",
    "name": "Cabrero",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.0333,
    "lng": -72.4,
    "ag": true,
    "forest": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08304",
    "name": "Laja",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.2667,
    "lng": -72.7,
    "forest": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08305",
    "name": "Mulchén",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.7167,
    "lng": -72.2333,
    "ag": true,
    "forest": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08306",
    "name": "Nacimiento",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.5,
    "lng": -72.6667,
    "forest": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08307",
    "name": "Negrete",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.5833,
    "lng": -72.5333,
    "ag": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08308",
    "name": "Quilaco",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.6667,
    "lng": -71.9833,
    "rural": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08309",
    "name": "Quilleco",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.4667,
    "lng": -71.9667,
    "ag": true,
    "forest": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08310",
    "name": "San Rosendo",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.2667,
    "lng": -72.7333,
    "rural": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08311",
    "name": "Santa Bárbara",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.6667,
    "lng": -72.0167,
    "ag": true,
    "forest": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08312",
    "name": "Tucapel",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.2833,
    "lng": -71.95,
    "ag": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08313",
    "name": "Yumbel",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.0833,
    "lng": -72.5667,
    "ag": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "08314",
    "name": "Alto Biobío",
    "prov": "Biobío",
    "reg": "CL-BI",
    "lat": -37.8833,
    "lng": -71.3667,
    "rural": true,
    "extreme": true,
    "tour": true,
    "cityId": "urb_los_angeles"
  },
  {
    "cut": "09101",
    "name": "Temuco",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.7359,
    "lng": -72.5904,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09102",
    "name": "Carahue",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.7167,
    "lng": -73.1667,
    "coast": true,
    "ag": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09103",
    "name": "Cunco",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.9167,
    "lng": -72.0333,
    "ag": true,
    "lake": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09104",
    "name": "Curarrehue",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -39.35,
    "lng": -71.5833,
    "rural": true,
    "tour": true,
    "cityId": "urb_villarrica_pucon"
  },
  {
    "cut": "09105",
    "name": "Freire",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.95,
    "lng": -72.6333,
    "ag": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09106",
    "name": "Galvarino",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.4167,
    "lng": -72.7833,
    "rural": true,
    "forest": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09107",
    "name": "Gorbea",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -39.1,
    "lng": -72.6833,
    "ag": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09108",
    "name": "Lautaro",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.5333,
    "lng": -72.45,
    "ag": true,
    "forest": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09109",
    "name": "Loncoche",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -39.3667,
    "lng": -72.6333,
    "ag": true,
    "forest": true,
    "cityId": "urb_villarrica_pucon"
  },
  {
    "cut": "09110",
    "name": "Melipeuco",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.85,
    "lng": -71.7,
    "rural": true,
    "tour": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09111",
    "name": "Nueva Imperial",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.7333,
    "lng": -72.95,
    "ag": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09112",
    "name": "Padre Las Casas",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.7667,
    "lng": -72.5833,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09113",
    "name": "Perquenco",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.4167,
    "lng": -72.4333,
    "ag": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09114",
    "name": "Pitrufquén",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.9833,
    "lng": -72.6333,
    "ag": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09115",
    "name": "Pucón",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -39.2833,
    "lng": -71.9667,
    "lake": true,
    "tour": true,
    "cityId": "urb_villarrica_pucon"
  },
  {
    "cut": "09116",
    "name": "Saavedra",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.7833,
    "lng": -73.3833,
    "coast": true,
    "tour": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09117",
    "name": "Teodoro Schmidt",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.9667,
    "lng": -73.05,
    "coast": true,
    "ag": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09118",
    "name": "Toltén",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -39.2167,
    "lng": -73.2333,
    "coast": true,
    "rural": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09119",
    "name": "Vilcún",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.65,
    "lng": -72.2333,
    "ag": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09120",
    "name": "Villarrica",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -39.2854,
    "lng": -72.2279,
    "lake": true,
    "tour": true,
    "cityId": "urb_villarrica_pucon"
  },
  {
    "cut": "09121",
    "name": "Cholchol",
    "prov": "Cautín",
    "reg": "CL-AR",
    "lat": -38.6,
    "lng": -72.85,
    "rural": true,
    "ag": true,
    "cityId": "urb_temuco_padre_las_casas"
  },
  {
    "cut": "09201",
    "name": "Angol",
    "prov": "Malleco",
    "reg": "CL-AR",
    "lat": -37.7952,
    "lng": -72.7161,
    "ag": true,
    "forest": true,
    "cityId": "urb_angol"
  },
  {
    "cut": "09202",
    "name": "Collipulli",
    "prov": "Malleco",
    "reg": "CL-AR",
    "lat": -37.95,
    "lng": -72.4333,
    "forest": true,
    "cityId": "urb_angol"
  },
  {
    "cut": "09203",
    "name": "Curacautín",
    "prov": "Malleco",
    "reg": "CL-AR",
    "lat": -38.4333,
    "lng": -71.8833,
    "forest": true,
    "tour": true,
    "cityId": "urb_angol"
  },
  {
    "cut": "09204",
    "name": "Ercilla",
    "prov": "Malleco",
    "reg": "CL-AR",
    "lat": -38.05,
    "lng": -72.45,
    "rural": true,
    "forest": true,
    "cityId": "urb_angol"
  },
  {
    "cut": "09205",
    "name": "Lonquimay",
    "prov": "Malleco",
    "reg": "CL-AR",
    "lat": -38.4333,
    "lng": -71.35,
    "rural": true,
    "extreme": true,
    "tour": true,
    "cityId": "urb_angol"
  },
  {
    "cut": "09206",
    "name": "Los Sauces",
    "prov": "Malleco",
    "reg": "CL-AR",
    "lat": -37.9833,
    "lng": -72.8333,
    "ag": true,
    "forest": true,
    "cityId": "urb_angol"
  },
  {
    "cut": "09207",
    "name": "Lumaco",
    "prov": "Malleco",
    "reg": "CL-AR",
    "lat": -38.1667,
    "lng": -72.9167,
    "rural": true,
    "forest": true,
    "cityId": "urb_angol"
  },
  {
    "cut": "09208",
    "name": "Purén",
    "prov": "Malleco",
    "reg": "CL-AR",
    "lat": -38.0333,
    "lng": -73.0833,
    "forest": true,
    "cityId": "urb_angol"
  },
  {
    "cut": "09209",
    "name": "Renaico",
    "prov": "Malleco",
    "reg": "CL-AR",
    "lat": -37.6667,
    "lng": -72.5833,
    "ag": true,
    "cityId": "urb_angol"
  },
  {
    "cut": "09210",
    "name": "Traiguén",
    "prov": "Malleco",
    "reg": "CL-AR",
    "lat": -38.25,
    "lng": -72.6667,
    "ag": true,
    "forest": true,
    "cityId": "urb_angol"
  },
  {
    "cut": "09211",
    "name": "Victoria",
    "prov": "Malleco",
    "reg": "CL-AR",
    "lat": -38.2333,
    "lng": -72.3333,
    "ag": true,
    "cityId": "urb_angol"
  },
  {
    "cut": "14101",
    "name": "Valdivia",
    "prov": "Valdivia",
    "reg": "CL-LR",
    "lat": -39.8142,
    "lng": -73.2459,
    "coast": true,
    "tour": true,
    "cityId": "urb_valdivia"
  },
  {
    "cut": "14102",
    "name": "Corral",
    "prov": "Valdivia",
    "reg": "CL-LR",
    "lat": -39.8833,
    "lng": -73.4333,
    "coast": true,
    "tour": true,
    "cityId": "urb_valdivia"
  },
  {
    "cut": "14103",
    "name": "Lanco",
    "prov": "Valdivia",
    "reg": "CL-LR",
    "lat": -39.45,
    "lng": -72.7833,
    "ag": true,
    "cityId": "urb_valdivia"
  },
  {
    "cut": "14104",
    "name": "Los Lagos",
    "prov": "Valdivia",
    "reg": "CL-LR",
    "lat": -39.85,
    "lng": -72.8333,
    "ag": true,
    "forest": true,
    "cityId": "urb_valdivia"
  },
  {
    "cut": "14105",
    "name": "Máfil",
    "prov": "Valdivia",
    "reg": "CL-LR",
    "lat": -39.65,
    "lng": -72.95,
    "ag": true,
    "cityId": "urb_valdivia"
  },
  {
    "cut": "14106",
    "name": "Mariquina",
    "prov": "Valdivia",
    "reg": "CL-LR",
    "lat": -39.5167,
    "lng": -72.9833,
    "coast": true,
    "ag": true,
    "forest": true,
    "cityId": "urb_valdivia"
  },
  {
    "cut": "14107",
    "name": "Paillaco",
    "prov": "Valdivia",
    "reg": "CL-LR",
    "lat": -40.0333,
    "lng": -72.8833,
    "ag": true,
    "cityId": "urb_valdivia"
  },
  {
    "cut": "14108",
    "name": "Panguipulli",
    "prov": "Valdivia",
    "reg": "CL-LR",
    "lat": -39.6333,
    "lng": -72.3333,
    "lake": true,
    "tour": true,
    "cityId": "urb_valdivia"
  },
  {
    "cut": "14201",
    "name": "La Unión",
    "prov": "Ranco",
    "reg": "CL-LR",
    "lat": -40.2947,
    "lng": -73.0825,
    "ag": true,
    "cityId": "urb_la_union_ranco"
  },
  {
    "cut": "14202",
    "name": "Futrono",
    "prov": "Ranco",
    "reg": "CL-LR",
    "lat": -40.1333,
    "lng": -72.4,
    "ag": true,
    "lake": true,
    "tour": true,
    "cityId": "urb_la_union_ranco"
  },
  {
    "cut": "14203",
    "name": "Lago Ranco",
    "prov": "Ranco",
    "reg": "CL-LR",
    "lat": -40.3167,
    "lng": -72.4833,
    "lake": true,
    "tour": true,
    "cityId": "urb_la_union_ranco"
  },
  {
    "cut": "14204",
    "name": "Río Bueno",
    "prov": "Ranco",
    "reg": "CL-LR",
    "lat": -40.3333,
    "lng": -72.95,
    "ag": true,
    "cityId": "urb_la_union_ranco"
  },
  {
    "cut": "10101",
    "name": "Puerto Montt",
    "prov": "Llanquihue",
    "reg": "CL-LL",
    "lat": -41.4689,
    "lng": -72.9411,
    "coast": true,
    "cityId": "urb_puerto_montt_varas"
  },
  {
    "cut": "10102",
    "name": "Calbuco",
    "prov": "Llanquihue",
    "reg": "CL-LL",
    "lat": -41.7667,
    "lng": -73.1333,
    "coast": true,
    "cityId": "urb_puerto_montt_varas"
  },
  {
    "cut": "10103",
    "name": "Cochamó",
    "prov": "Llanquihue",
    "reg": "CL-LL",
    "lat": -41.4833,
    "lng": -72.3,
    "coast": true,
    "tour": true,
    "cityId": "urb_puerto_montt_varas"
  },
  {
    "cut": "10104",
    "name": "Fresia",
    "prov": "Llanquihue",
    "reg": "CL-LL",
    "lat": -41.15,
    "lng": -73.4333,
    "ag": true,
    "forest": true,
    "cityId": "urb_puerto_montt_varas"
  },
  {
    "cut": "10105",
    "name": "Frutillar",
    "prov": "Llanquihue",
    "reg": "CL-LL",
    "lat": -41.1167,
    "lng": -73.05,
    "lake": true,
    "tour": true,
    "cityId": "urb_puerto_montt_varas"
  },
  {
    "cut": "10106",
    "name": "Los Muermos",
    "prov": "Llanquihue",
    "reg": "CL-LL",
    "lat": -41.4,
    "lng": -73.4833,
    "ag": true,
    "cityId": "urb_puerto_montt_varas"
  },
  {
    "cut": "10107",
    "name": "Llanquihue",
    "prov": "Llanquihue",
    "reg": "CL-LL",
    "lat": -41.2667,
    "lng": -73.0167,
    "lake": true,
    "cityId": "urb_puerto_montt_varas"
  },
  {
    "cut": "10108",
    "name": "Maullín",
    "prov": "Llanquihue",
    "reg": "CL-LL",
    "lat": -41.6167,
    "lng": -73.6,
    "coast": true,
    "cityId": "urb_puerto_montt_varas"
  },
  {
    "cut": "10109",
    "name": "Puerto Varas",
    "prov": "Llanquihue",
    "reg": "CL-LL",
    "lat": -41.3167,
    "lng": -72.9833,
    "lake": true,
    "tour": true,
    "cityId": "urb_puerto_montt_varas"
  },
  {
    "cut": "10201",
    "name": "Castro",
    "prov": "Chiloé",
    "reg": "CL-LL",
    "lat": -42.4721,
    "lng": -73.7732,
    "coast": true,
    "insular": true,
    "tour": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10202",
    "name": "Ancud",
    "prov": "Chiloé",
    "reg": "CL-LL",
    "lat": -41.8667,
    "lng": -73.8333,
    "coast": true,
    "insular": true,
    "tour": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10203",
    "name": "Chonchi",
    "prov": "Chiloé",
    "reg": "CL-LL",
    "lat": -42.6167,
    "lng": -73.7833,
    "coast": true,
    "insular": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10204",
    "name": "Curaco de Vélez",
    "prov": "Chiloé",
    "reg": "CL-LL",
    "lat": -42.4333,
    "lng": -73.6,
    "coast": true,
    "insular": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10205",
    "name": "Dalcahue",
    "prov": "Chiloé",
    "reg": "CL-LL",
    "lat": -42.3833,
    "lng": -73.65,
    "coast": true,
    "insular": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10206",
    "name": "Puqueldón",
    "prov": "Chiloé",
    "reg": "CL-LL",
    "lat": -42.5833,
    "lng": -73.6667,
    "coast": true,
    "insular": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10207",
    "name": "Queilén",
    "prov": "Chiloé",
    "reg": "CL-LL",
    "lat": -42.8833,
    "lng": -73.4667,
    "coast": true,
    "insular": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10208",
    "name": "Quellón",
    "prov": "Chiloé",
    "reg": "CL-LL",
    "lat": -43.1167,
    "lng": -73.6167,
    "coast": true,
    "insular": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10209",
    "name": "Quemchi",
    "prov": "Chiloé",
    "reg": "CL-LL",
    "lat": -42.15,
    "lng": -73.4833,
    "coast": true,
    "insular": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10210",
    "name": "Quinchao",
    "prov": "Chiloé",
    "reg": "CL-LL",
    "lat": -42.4667,
    "lng": -73.5,
    "coast": true,
    "insular": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10301",
    "name": "Osorno",
    "prov": "Osorno",
    "reg": "CL-LL",
    "lat": -40.5739,
    "lng": -73.1335,
    "ag": true,
    "cityId": "urb_osorno"
  },
  {
    "cut": "10302",
    "name": "Puerto Octay",
    "prov": "Osorno",
    "reg": "CL-LL",
    "lat": -40.9667,
    "lng": -72.8833,
    "ag": true,
    "lake": true,
    "tour": true,
    "cityId": "urb_osorno"
  },
  {
    "cut": "10303",
    "name": "Purranque",
    "prov": "Osorno",
    "reg": "CL-LL",
    "lat": -40.9167,
    "lng": -73.1667,
    "ag": true,
    "cityId": "urb_osorno"
  },
  {
    "cut": "10304",
    "name": "Puyehue",
    "prov": "Osorno",
    "reg": "CL-LL",
    "lat": -40.65,
    "lng": -72.6,
    "lake": true,
    "tour": true,
    "cityId": "urb_osorno"
  },
  {
    "cut": "10305",
    "name": "Río Negro",
    "prov": "Osorno",
    "reg": "CL-LL",
    "lat": -40.8,
    "lng": -73.2167,
    "ag": true,
    "cityId": "urb_osorno"
  },
  {
    "cut": "10306",
    "name": "San Juan de la Costa",
    "prov": "Osorno",
    "reg": "CL-LL",
    "lat": -40.5167,
    "lng": -73.3833,
    "coast": true,
    "rural": true,
    "cityId": "urb_osorno"
  },
  {
    "cut": "10307",
    "name": "San Pablo",
    "prov": "Osorno",
    "reg": "CL-LL",
    "lat": -40.4,
    "lng": -73.0167,
    "ag": true,
    "cityId": "urb_osorno"
  },
  {
    "cut": "10401",
    "name": "Chaitén",
    "prov": "Palena",
    "reg": "CL-LL",
    "lat": -42.9167,
    "lng": -72.7167,
    "coast": true,
    "extreme": true,
    "tour": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10402",
    "name": "Futaleufú",
    "prov": "Palena",
    "reg": "CL-LL",
    "lat": -43.1833,
    "lng": -71.8667,
    "extreme": true,
    "tour": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10403",
    "name": "Hualaihué",
    "prov": "Palena",
    "reg": "CL-LL",
    "lat": -41.9667,
    "lng": -72.6833,
    "coast": true,
    "extreme": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "10404",
    "name": "Palena",
    "prov": "Palena",
    "reg": "CL-LL",
    "lat": -43.6167,
    "lng": -71.8,
    "extreme": true,
    "cityId": "urb_castro_ancud"
  },
  {
    "cut": "11101",
    "name": "Coyhaique",
    "prov": "Coyhaique",
    "reg": "CL-AI",
    "lat": -45.5712,
    "lng": -72.0683,
    "cityId": "urb_coyhaique"
  },
  {
    "cut": "11102",
    "name": "Lago Verde",
    "prov": "Coyhaique",
    "reg": "CL-AI",
    "lat": -44.2333,
    "lng": -71.85,
    "rural": true,
    "extreme": true,
    "cityId": "urb_coyhaique"
  },
  {
    "cut": "11201",
    "name": "Aysén",
    "prov": "Aysén",
    "reg": "CL-AI",
    "lat": -45.4,
    "lng": -72.7,
    "coast": true,
    "cityId": "urb_coyhaique"
  },
  {
    "cut": "11202",
    "name": "Cisnes",
    "prov": "Aysén",
    "reg": "CL-AI",
    "lat": -44.75,
    "lng": -72.7,
    "coast": true,
    "extreme": true,
    "cityId": "urb_coyhaique"
  },
  {
    "cut": "11203",
    "name": "Guaitecas",
    "prov": "Aysén",
    "reg": "CL-AI",
    "lat": -43.8833,
    "lng": -73.75,
    "coast": true,
    "insular": true,
    "extreme": true,
    "cityId": "urb_coyhaique"
  },
  {
    "cut": "11301",
    "name": "Cochrane",
    "prov": "Capitán Prat",
    "reg": "CL-AI",
    "lat": -47.25,
    "lng": -72.5667,
    "extreme": true,
    "tour": true,
    "cityId": "urb_coyhaique"
  },
  {
    "cut": "11302",
    "name": "O'Higgins",
    "prov": "Capitán Prat",
    "reg": "CL-AI",
    "lat": -48.4667,
    "lng": -72.5667,
    "rural": true,
    "extreme": true,
    "cityId": "urb_coyhaique"
  },
  {
    "cut": "11303",
    "name": "Tortel",
    "prov": "Capitán Prat",
    "reg": "CL-AI",
    "lat": -47.7967,
    "lng": -73.5317,
    "coast": true,
    "extreme": true,
    "tour": true,
    "cityId": "urb_coyhaique"
  },
  {
    "cut": "11401",
    "name": "Chile Chico",
    "prov": "General Carrera",
    "reg": "CL-AI",
    "lat": -46.5333,
    "lng": -71.7333,
    "lake": true,
    "extreme": true,
    "tour": true,
    "cityId": "urb_coyhaique"
  },
  {
    "cut": "11402",
    "name": "Río Ibáñez",
    "prov": "General Carrera",
    "reg": "CL-AI",
    "lat": -46.2667,
    "lng": -71.9333,
    "lake": true,
    "extreme": true,
    "cityId": "urb_coyhaique"
  },
  {
    "cut": "12101",
    "name": "Punta Arenas",
    "prov": "Magallanes",
    "reg": "CL-MA",
    "lat": -53.1638,
    "lng": -70.9171,
    "coast": true,
    "cityId": "urb_punta_arenas"
  },
  {
    "cut": "12102",
    "name": "Laguna Blanca",
    "prov": "Magallanes",
    "reg": "CL-MA",
    "lat": -52.25,
    "lng": -71.9167,
    "rural": true,
    "extreme": true,
    "cityId": "urb_punta_arenas"
  },
  {
    "cut": "12103",
    "name": "Río Verde",
    "prov": "Magallanes",
    "reg": "CL-MA",
    "lat": -52.55,
    "lng": -71.5,
    "rural": true,
    "extreme": true,
    "cityId": "urb_punta_arenas"
  },
  {
    "cut": "12104",
    "name": "San Gregorio",
    "prov": "Magallanes",
    "reg": "CL-MA",
    "lat": -52.3333,
    "lng": -70.0833,
    "rural": true,
    "extreme": true,
    "cityId": "urb_punta_arenas"
  },
  {
    "cut": "12201",
    "name": "Cabo de Hornos",
    "prov": "Antártica Chilena",
    "reg": "CL-MA",
    "lat": -54.9333,
    "lng": -67.6167,
    "coast": true,
    "insular": true,
    "extreme": true,
    "tour": true,
    "cityId": "urb_punta_arenas"
  },
  {
    "cut": "12202",
    "name": "Antártica",
    "prov": "Antártica Chilena",
    "reg": "CL-MA",
    "lat": -69,
    "lng": -63,
    "insular": true,
    "extreme": true,
    "cityId": "urb_punta_arenas"
  },
  {
    "cut": "12301",
    "name": "Porvenir",
    "prov": "Tierra del Fuego",
    "reg": "CL-MA",
    "lat": -53.295,
    "lng": -70.3678,
    "coast": true,
    "insular": true,
    "extreme": true,
    "cityId": "urb_punta_arenas"
  },
  {
    "cut": "12302",
    "name": "Primavera",
    "prov": "Tierra del Fuego",
    "reg": "CL-MA",
    "lat": -52.75,
    "lng": -69.25,
    "rural": true,
    "insular": true,
    "extreme": true,
    "cityId": "urb_punta_arenas"
  },
  {
    "cut": "12303",
    "name": "Timaukel",
    "prov": "Tierra del Fuego",
    "reg": "CL-MA",
    "lat": -54,
    "lng": -68.8333,
    "rural": true,
    "insular": true,
    "extreme": true,
    "cityId": "urb_punta_arenas"
  },
  {
    "cut": "12401",
    "name": "Natales",
    "prov": "Última Esperanza",
    "reg": "CL-MA",
    "lat": -51.7236,
    "lng": -72.5061,
    "coast": true,
    "extreme": true,
    "tour": true,
    "cityId": "urb_puerto_natales"
  },
  {
    "cut": "12402",
    "name": "Torres del Paine",
    "prov": "Última Esperanza",
    "reg": "CL-MA",
    "lat": -51.25,
    "lng": -72.8833,
    "extreme": true,
    "tour": true,
    "cityId": "urb_puerto_natales"
  }
],

  normalizeText(value = '') {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  },

  getCommune(communeName) {
    if (!communeName) return null;
    const clean = this.normalizeText(communeName);
    return this.communes.find(c => this.normalizeText(c.name) === clean) || null;
  },

  getCityForCommune(communeName, regionName) {
    if (!communeName) return null;
    const cleanCommune = this.normalizeText(communeName);
    
    // 1. Buscar directamente por nombre en comunas del catálogo
    const commObj = this.getCommune(communeName);
    if (commObj && commObj.cityId) {
      const cityById = this.conurbations.find(c => c.id === commObj.cityId);
      if (cityById) return cityById;
    }

    // 2. Buscar en arreglos de conurbaciones
    for (const city of this.conurbations) {
      if (city.communes.some(c => this.normalizeText(c) === cleanCommune)) {
        return city;
      }
    }
    
    // 3. Buscar por región
    if (regionName) {
      const cleanReg = this.normalizeText(regionName);
      const reg = this.regions.find(r => this.normalizeText(r.name).includes(cleanReg) || cleanReg.includes(this.normalizeText(r.name)));
      if (reg && reg.defaultCityId) {
        return this.conurbations.find(c => c.id === reg.defaultCityId) || null;
      }
    }
    
    // 4. Fallback nacional
    return this.conurbations[0];
  },

  resolveTerritorialCascade(communeName, regionName, lat = null, lng = null, sameCommuneCount = 0) {
    const commObj = this.getCommune(communeName);
    const cityObj = this.getCityForCommune(communeName, regionName);
    
    let outsideChile = false;
    if (lat !== null && lng !== null && (lat < -90.0 || lat > -17.0 || lng < -109.5 || lng > -53.0)) {
      outsideChile = true;
    }

    let level = 'country';
    if (sameCommuneCount >= 3) {
      level = 'commune';
    } else if (sameCommuneCount > 0 || cityObj) {
      level = 'city';
    } else if (regionName || (commObj && commObj.reg)) {
      level = 'region';
    }

    let distanceKm = 0;
    if (lat !== null && lng !== null && cityObj && cityObj.centroid) {
      const rad = val => val * Math.PI / 180;
      const dLat = rad(cityObj.centroid.lat - lat);
      const dLng = rad(cityObj.centroid.lng - lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(cityObj.centroid.lat)) * Math.sin(dLng / 2) ** 2;
      distanceKm = Number((2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
    }

    return {
      level,
      referenceId: commObj ? commObj.cut : (cityObj ? cityObj.id : 'country'),
      referenceName: commObj ? commObj.name : (communeName || 'Chile'),
      referenceCityName: cityObj ? cityObj.name : 'Gran Santiago',
      distanceKm,
      outsideChile,
      isRemote: distanceKm > (cityObj ? cityObj.influenceRadiusKm : 80.0)
    };
  }
};

if (typeof globalThis !== "undefined") {
  globalThis.TPL_NATIONAL_CATALOG = TPL_NATIONAL_CATALOG;
}
