/*====================================================
  MATERIALES
====================================================*/

const materiales = [

{
    id:"madera",
    nombre:"Madera",

    precioM2:270000,

    imagen:"image/materiales/madera.jpg",

    descripcion:"Construcción en madera estructural seca, rápida ejecución y excelente aislación térmica."
},

{
    id:"metalcon",
    nombre:"Metalcon",

    precioM2:370000,

    imagen:"image/materiales/metalcon.jpg",

    descripcion:"Estructura galvanizada de alta resistencia, ideal para proyectos modernos."
},

{
    id:"material",
    nombre:"Obra Gruesa",

    precioM2:720000,

    imagen:"image/materiales/material.jpg",

    descripcion:"Construcción en hormigón y albañilería con máxima durabilidad."
}

];


/*====================================================
  TERMINACIONES
====================================================*/

const terminaciones = [

{

id:"obra",

nombre:"Obra Gruesa",

precioM2:0,

incluye:[

"Fundaciones",

"Radier",

"Estructura",

"Muros",

"Cerchas",

"Techumbre",

"Revestimiento exterior"

]

},

{

id:"normal",

nombre:"Terminación Estándar",

precioM2:70000,

incluye:[

"Puerta principal",

"Puertas interiores",

"Ventanas aluminio",

"Cerradura principal",

"Guardapolvos",

"Molduras",

"Pintura interior",

"Cielo terminado",

"Instalación eléctrica",

"Instalación sanitaria"

]

},

{

id:"full",

nombre:"Terminación Full",

precioM2:140000,

incluye:[

"Todo lo incluido en Terminación Estándar",

"Piso cerámico o piso flotante",

"Cerámica en baños",

"Cerámica cocina",

"Closets",

"Muebles de cocina",

"Lavaplatos",

"Campana",

"Grifería monomando",

"Pintura premium",

"Iluminación LED"

]

}

];


/*====================================================
  PISOS
====================================================*/

const pisos = [

{
id:"radier",
nombre:"Radier Afinado",
precioM2:0
},

{
id:"ceramica",
nombre:"Cerámica",
precioM2:28000
},

{
id:"flotante",
nombre:"Piso Flotante",
precioM2:22000
},

{
id:"alfombra",
nombre:"Alfombra",
precioM2:18000
}

];


/*====================================================
  VENTANAS
====================================================*/

const ventanas = [

{

id:"aluminio",

nombre:"Aluminio",

precioM2:0

},

{

id:"termopanel",

nombre:"PVC Termopanel",

precioM2:42000

}

];


/*====================================================
  COCINAS
====================================================*/

const cocinas = [

{

id:"ninguna",

nombre:"Sin muebles",

precio:0

},

{

id:"basica",

nombre:"Cocina Básica",

precio:1800000

},

{

id:"premium",

nombre:"Cocina Premium",

precio:4200000

}

];


/*====================================================
  BAÑOS
====================================================*/

const banos = [

{

id:"economico",

nombre:"Equipamiento Económico",

precio:0

},

{

id:"estandar",

nombre:"Equipamiento Estándar",

precio:650000

},

{

id:"premium",

nombre:"Equipamiento Premium",

precio:1500000

}

];



// Exponer constructor diseño propio para cotizador premium
window.materiales = typeof materiales !== "undefined" ? materiales : [];
window.terminaciones = typeof terminaciones !== "undefined" ? terminaciones : [];
window.cocinas = typeof cocinas !== "undefined" ? cocinas : [];
window.banos = typeof banos !== "undefined" ? banos : [];
