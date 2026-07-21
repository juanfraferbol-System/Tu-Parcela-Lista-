const fundaciones = [
  
  {
    id: "Instalacion_+_base_pilotes_madera",
    nombre: "Instalación Pilotes de madera + Casa Full",
    tipoCalculo: "mt2",
    valor: 60000,
    empresa: "nogales"
  },
  {
    id: "Instalacion_+_base_radier",
    nombre: "Instalación radier y Casa Full",
    tipoCalculo: "mt2",
    valor: 95000,
    empresa: "nogales"
  },

   {

      id: "Instalacion completa radier + llave en mano full + piso ceramico",
    nombre: "Instalacion completa llave en mano full",
    tipoCalculo: "mt2",
    valor: 140000,
    empresa: "nogales"
  },


];



const extrasAutomaticos = [];


const extrasOpcionales = [



    {
    id: "Instalacion_electrica",
    nombre: "Instalación eléctrica incl/materiales",
    tipoCalculo: "mt2",
    valor: 15000,
    empresa: "nogales",
    tipoCalculo2:"casa"
  },

    {
    id: "piso ceramico",
    nombre: "Instalación piso cerámico incl/materiales",
    tipoCalculo: "mt2",
    valor: 32000,
    empresa: "nogales",
    tipoCalculo2:"casa"
  },

    {
    id: "pintura",
    nombre: "Servicio pintura con materiales",
    tipoCalculo: "mt2",
    valor: 15000,
    empresa: "nogales",
    tipoCalculo2:"casa"
  },



  {
    id: "instalacion_sanitaria",
    nombre: "Instalación sanitaria incl/materiales",
    tipoCalculo: "mt2",
    valor: 18000,
    empresa: "nogales",
    tipoCalculo2: "casa",
    descripcion: "Red sanitaria interior referencial según modelo de casa."
  },
  {
    id: "artefactos_cocina",
    nombre: "Artefactos cocina",
    tipoCalculo: "unidad",
    valor: 850000,
    defaultQty: 1,
    minQty: 1,
    maxQty: 1,
    descripcion: "Kit referencial de artefactos de cocina según disponibilidad."
  },
  {
    id: "artefactos_bano",
    nombre: "Artefactos baño",
    tipoCalculo: "unidad",
    valor: 750000,
    defaultQty: 1,
    minQty: 1,
    maxQty: 3,
    descripcion: "Artefactos sanitarios básicos para baño."
  },
    {
    id: "fosa_septica",
    nombre: "Fosa séptica con instalación precio referencial estimado",
    tipoCalculo: "unidad",
    valor: 1500000,
    defaultQty: 1,
    minQty: 1,
    maxQty: 5,
    descripcion: "Instalación de fosa y kit de drenaje"
  },
  {
    id: "pozo_profundo",
    nombre: "Pozo profundo según profundidad",
    tipoCalculo: "metro",
    valor: 50000,
    defaultQty: 30,
    minQty: 10,
    maxQty: 100,
    descripcion: "Excavación de pozo de agua potable"
  },
  {
    id: "cierre_perimetral",
    nombre: "Cerco de alambre de púas según perímetro de la parcela",
    tipoCalculo: "metro",
    valor: 2000,
    defaultQty: 100,
    minQty: 20,
    maxQty: 500,
    descripcion: "Cercado perimetral estimado desde los m² de la parcela seleccionada.",
    tipoCalculo2:"parcela"
  },
  {
    id: "porton",
    nombre: "Portón acceso",
    tipoCalculo: "unidad",
    valor: 1200000,
    defaultQty: 1,
    minQty: 1,
    maxQty: 3,
    descripcion: "Portón de madera/fierro para acceso principal"
  },
  {
    id: "empalme_electrico",
    nombre: "Empalme eléctrico",
    tipoCalculo: "unidad",
    valor: 1500000,
    defaultQty: 1,
    minQty: 1,
    maxQty: 3,
    descripcion: "Acometida y poste para conexión a red eléctrica"
  },

  {
    id: "maquinaria",
    nombre: "Maquinaria retroescavadora",
    tipoCalculo: "hora",
    valor: 42000,
    defaultQty: 10,
    minQty: 1,
    maxQty: 100,
    descripcion: "Horas de retroexcavadora/nivelación"
  },
  {
    id: "piscina",
    nombre: "Piscina",
    tipoCalculo: "mt2",
    valor: 200000,
    defaultQty: 18,
    minQty: 6,
    maxQty: 50,
    descripcion: "Construcción de piscina de hormigón/fibra"
  },
  {
    id: "quincho",
    nombre: "Quincho",
    tipoCalculo: "mt2",
    valor: 250000,
    defaultQty: 12,
    minQty: 4,
    maxQty: 30,
    descripcion: "Quincho premium de asados techado"
  },
  {
    id: "terraza",
    nombre: "Terraza",
    tipoCalculo: "mt2",
    valor: 200000,
    defaultQty: 15,
    minQty: 5,
    maxQty: 60,
    descripcion: "Terraza exterior en madera impregnada"
  },

];


// Exponer datos para páginas que leen desde window (cotizador.html).
window.fundaciones = fundaciones;
window.extrasAutomaticos = extrasAutomaticos;
window.extrasOpcionales = extrasOpcionales;
