// js/categoria.js

// Funciones de ayuda para parsear datos heredados de parcelas.js
function extractNumber(str) {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  return parseFloat(str.replace(/[^\d]/g, '')) || 0;
}

function parseTiempoMinutos(tiempoStr) {
  if (!tiempoStr) return 0;
  let totalMinutos = 0;
  const str = tiempoStr.toLowerCase();
  
  const horasMatch = str.match(/(\d+)\s*h/);
  if (horasMatch) totalMinutos += parseInt(horasMatch[1], 10) * 60;
  
  const minMatch = str.match(/(\d+)\s*min/);
  if (minMatch) totalMinutos += parseInt(minMatch[1], 10);
  
  return totalMinutos;
}

function parseDistanciaKm(distanciaStr) {
  return extractNumber(distanciaStr);
}

// Cálculo del puntaje para cada categoría
function calcularCategoriasParcela(parcela, contextoCatalogo) {
  const result = {
    descanso: { puntaje: 0, coincide: false, razones: [] },
    inversion: { puntaje: 0, coincide: false, razones: [] },
    nativas: { puntaje: 0, coincide: false, razones: [] },
    agua: { puntaje: 0, coincide: false, razones: [] }
  };

  // 1. Extraer variables limpias
  const precio = extractNumber(parcela.precio);
  const tamano = extractNumber(parcela.tamano) || 5000;
  const precioM2 = tamano > 0 ? precio / tamano : 0;
  
  const tiempoMinutos = parseTiempoMinutos(parcela.tiempoConcepcion) || extractNumber(parcela.distanciaCiudadMinutos) || 999;
  const distanciaKm = parseDistanciaKm(parcela.distanciaConcepcion) || extractNumber(parcela.distanciaRutaPrincipalKm) || 999;
  
  const tieneServicios = parcela.servicios === 'si' || (parcela.serviciosCercanos && parcela.serviciosCercanos.length > 0);
  const accesoFacil = parcela.accesoTodoElAno === true || (tiempoMinutos < 60); // Asumimos acceso fácil si está muy cerca
  const precioBajoMedia = precio > 0 && precio < (contextoCatalogo.medianaPrecio || 25000000);
  
  const naturalezaStr = String(parcela.naturaleza || "").toLowerCase();
  const descripcionStr = String(parcela.descripcion || "").toLowerCase();
  const cuerposAguaArr = parcela.cuerposAgua || [];
  const naturalezaTiposArr = parcela.naturalezaTipos || [];
  const aguaStr = String(parcela.agua || "").toLowerCase();

  // === REGLAS DESCANSO ===
  if (tiempoMinutos <= 30) { result.descanso.puntaje += 30; result.descanso.razones.push("A menos de 30 min de la ciudad"); }
  else if (tiempoMinutos <= 50) { result.descanso.puntaje += 20; result.descanso.razones.push("A menos de 50 min de la ciudad"); }
  
  if (tieneServicios) { result.descanso.puntaje += 15; result.descanso.razones.push("Servicios cercanos"); }
  if (precioBajoMedia) { result.descanso.puntaje += 15; result.descanso.razones.push("Precio competitivo"); }
  if (accesoFacil) { result.descanso.puntaje += 10; }
  if (naturalezaStr === "si" || naturalezaTiposArr.length > 0) { result.descanso.puntaje += 10; }
  
  if (tiempoMinutos > 120) { result.descanso.puntaje -= 20; }
  result.descanso.coincide = result.descanso.puntaje >= (window.categoriasEstilo?.descanso?.puntajeMinimo || 30);


  // === REGLAS INVERSION ===
  const precioM2CatalogoPromedio = contextoCatalogo.promedioPrecioM2 || 5000;
  if (precioM2 > 0 && precioM2 < precioM2CatalogoPromedio * 0.8) { 
    result.inversion.puntaje += 25; 
    result.inversion.razones.push(`Bajo precio por m² (${Math.round(precioM2)}/m²)`); 
  }
  
  if (distanciaKm < 15) { result.inversion.puntaje += 20; result.inversion.razones.push("Cercana a ruta/ciudad principal"); }
  if (tiempoMinutos <= 45) { result.inversion.puntaje += 20; }
  if (parcela.facilidad === "si" || parcela.facilidadPago === true) { result.inversion.puntaje += 15; result.inversion.razones.push("Facilidad de pago"); }
  if (parcela.rol === "si") { result.inversion.puntaje += 10; }
  if (tamano >= 7000) { result.inversion.puntaje += 10; result.inversion.razones.push("Superficie mayor al promedio"); }
  if (tieneServicios) { result.inversion.puntaje += 10; }
  if (parcela.rol === "no") { result.inversion.puntaje -= 20; }
  
  result.inversion.coincide = result.inversion.puntaje >= (window.categoriasEstilo?.inversion?.puntajeMinimo || 40);


  // === REGLAS NATIVAS ===
  if (naturalezaStr === "nativo" || naturalezaStr === "bosque nativo" || naturalezaTiposArr.includes("Bosque nativo")) {
    result.nativas.puntaje += 60;
    result.nativas.razones.push("Bosque nativo confirmado");
  }
  
  const keywordsNativas = ["bosque nativo", "robles", "coigües", "boldos", "arrayanes", "vegetación autóctona", "vegetación nativa"];
  let detectadoTexto = false;
  keywordsNativas.forEach(kw => {
    if (descripcionStr.includes(kw)) {
      detectadoTexto = true;
    }
  });
  
  if (detectadoTexto) { 
    result.nativas.puntaje += 30; 
    if (result.nativas.razones.length === 0) result.nativas.razones.push("Vegetación nativa sugerida");
  }
  
  if (naturalezaTiposArr.includes("Vegetación mixta")) { result.nativas.puntaje += 15; }
  if (naturalezaStr === "no" || naturalezaTiposArr.includes("Sin vegetación destacada")) { result.nativas.puntaje -= 50; }
  
  result.nativas.coincide = result.nativas.puntaje >= (window.categoriasEstilo?.nativas?.puntajeMinimo || 20);


  // === REGLAS AGUA ===
  const confirmacionFuerteAgua = aguaStr === "si" || aguaStr === "rio" || aguaStr === "estero";
  if (confirmacionFuerteAgua || cuerposAguaArr.length > 0) {
    result.agua.puntaje += 70;
    result.agua.razones.push(cuerposAguaArr.join(", ") || "Cuerpo de agua confirmado");
  }
  
  const keywordsAgua = ["río", "estero", "arroyo", "vertiente", "laguna", "lago", "acceso al agua"];
  let detectadoAgua = false;
  keywordsAgua.forEach(kw => {
    if (descripcionStr.includes(kw)) detectadoAgua = true;
  });
  
  if (detectadoAgua && !confirmacionFuerteAgua) {
    result.agua.puntaje += 10;
    if (result.agua.razones.length === 0) result.agua.razones.push("Posible presencia de agua sugerida");
  }
  
  if (aguaStr === "no") { result.agua.puntaje -= 100; }
  
  result.agua.coincide = result.agua.puntaje >= (window.categoriasEstilo?.agua?.puntajeMinimo || 30);


  // Limitar razones a 2
  result.descanso.razones = result.descanso.razones.slice(0, 2);
  result.inversion.razones = result.inversion.razones.slice(0, 2);
  result.nativas.razones = result.nativas.razones.slice(0, 2);
  result.agua.razones = result.agua.razones.slice(0, 2);

  return result;
}

// Inyección en la página categoria.html
document.addEventListener("DOMContentLoaded", async () => {
  if (window.location.pathname.includes("categoria.html")) {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("cat");
    const config = window.categoriasEstilo[cat];

    if (!config) {
      document.getElementById("categoria-content").innerHTML = `
        <div style="text-align:center; padding:100px 20px;">
          <h2>Categoría no encontrada</h2>
          <a href="index.html" class="primary-action">Volver al inicio</a>
        </div>
      `;
      return;
    }

    // Inyectar Configuración
    window.TPLSEO?.applyCategory?.(config, cat);
    document.getElementById("hero-section").style.backgroundImage = `linear-gradient(to right, rgba(12,43,46,0.95), rgba(12,43,46,0.6)), url('${config.imagenHero}')`;
    document.getElementById("hero-title").textContent = config.titulo;
    document.getElementById("hero-subtitle").textContent = config.subtitulo;
    document.getElementById("hero-description").textContent = config.descripcion;
    document.getElementById("hero-para-quien").textContent = config.paraQuien;
    
    const actHtml = config.actividades.map(a => `<li><i class="fa-solid fa-check" style="color:var(--accent); margin-right:8px;"></i>${a}</li>`).join("");
    document.getElementById("list-actividades").innerHTML = actHtml;

    const venHtml = config.ventajas.map(v => `<li><i class="fa-solid fa-star" style="color:var(--primary); margin-right:8px;"></i>${v}</li>`).join("");
    document.getElementById("list-ventajas").innerHTML = venHtml;

    document.getElementById("recomendacion-text").textContent = config.recomendaciones;

    const faqHtml = config.preguntasFrecuentes.map(f => `
      <div style="margin-bottom:16px;">
        <strong style="color:var(--primary);">${f.pregunta}</strong>
        <p style="margin:4px 0 0 0; color:var(--text-muted);">${f.respuesta}</p>
      </div>
    `).join("");
    document.getElementById("faq-container").innerHTML = faqHtml;

    document.getElementById("btn-cta").textContent = config.textoCta;

    // Obtener parcelas
    // Asumimos que parcelas.js está cargado en window.parcelas.
    // También validaremos si app.js expone window.getAllParcelas().
    let listaOriginal = [];
    if (typeof window.getAllParcelas === 'function') {
      listaOriginal = window.getAllParcelas();
    } else if (typeof parcelas !== 'undefined') {
      listaOriginal = parcelas;
    }

    // Calcular contexto
    let preciosValidos = listaOriginal.map(p => extractNumber(p.precio)).filter(p => p > 0);
    preciosValidos.sort((a,b) => a-b);
    const medianaPrecio = preciosValidos[Math.floor(preciosValidos.length / 2)] || 25000000;
    
    let preciosM2Validos = listaOriginal.map(p => {
      const pr = extractNumber(p.precio);
      const tam = extractNumber(p.tamano) || 5000;
      return pr / tam;
    }).filter(p => p > 0);
    const sumaM2 = preciosM2Validos.reduce((a,b) => a+b, 0);
    const promedioPrecioM2 = preciosM2Validos.length ? sumaM2 / preciosM2Validos.length : 5000;

    const contextoCatalogo = { medianaPrecio, promedioPrecioM2 };

    // Filtrar y ordenar
    const parcelasFiltradas = listaOriginal.map(p => {
      const score = calcularCategoriasParcela(p, contextoCatalogo);
      return { parcela: p, score: score[cat] };
    })
    .filter(item => item.score.coincide)
    .sort((a, b) => b.score.puntaje - a.score.puntaje);

    // Renderizar
    const container = document.getElementById("categoria-parcelas-grid");
    if (parcelasFiltradas.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; background:#f8fafc; border-radius:12px;">No encontramos parcelas en esta categoría por el momento. <br><br><a href="index.html#parcelas" style="color:var(--primary); font-weight:bold;">Ver todas las parcelas</a></div>`;
    } else {
      container.innerHTML = "";
      // Usaremos un render inline rápido simulando app.js para no depender de dependencias cruzadas
      parcelasFiltradas.forEach(item => {
        const p = item.parcela;
        const img = Array.isArray(p.imagenes) ? p.imagenes[0] : (p.imagen || "");
        
        const card = document.createElement("div");
        card.className = "parcela-card";
        // Agregar distintivo de la razón
        const badgeRazon = item.score.razones.length > 0 
          ? `<div style="position:absolute; top:10px; left:10px; background:var(--accent); color:white; font-size:0.75rem; font-weight:700; padding:4px 8px; border-radius:4px; z-index:2;">${item.score.razones[0]}</div>`
          : "";

        card.innerHTML = `
          ${badgeRazon}
          <a href="parcela.html?id=${encodeURIComponent(p.id)}" aria-label="Ver ficha completa de ${p.nombre}" style="text-decoration:none; color:inherit; display:block;">
            <div class="card-image-wrapper">
              <img src="${img}" alt="${p.nombre}" loading="lazy" style="width:100%; height:200px; object-fit:cover;">
            </div>
            <div class="card-content" style="padding:16px;">
              <h3 style="font-size:1.1rem; margin:0 0 8px 0; color:var(--primary);">${p.nombre}</h3>
              <p style="font-size:1.25rem; font-weight:800; color:var(--text); margin:0 0 12px 0;">${typeof p.precio === 'string' ? p.precio : '$'+(p.precio||0).toLocaleString('es-CL')}</p>
              <div style="display:flex; gap:8px; font-size:0.85rem; color:var(--text-muted); flex-wrap:wrap;">
                <span><i class="fa-solid fa-ruler-combined"></i> ${p.tamano} m²</span>
                ${p.comuna ? `<span><i class="fa-solid fa-location-dot"></i> ${p.comuna}</span>` : ''}
              </div>
            </div>
          </a>
        `;
        container.appendChild(card);
      });
    }
  }
});

// Exportar global para que módulo Publicar pueda usarlo
window.calcularCategoriasParcela = calcularCategoriasParcela;
window.extractNumber = extractNumber;
