import { CATEGORIAS_PARCELAS } from '../config/categorias-parcelas.js';

/**
 * Normaliza un texto para búsqueda (minúsculas, sin acentos)
 */
function normalizeText(text) {
  if (!text) return '';
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Calcula los puntajes de las 4 categorías para una parcela dada
 * @param {Object} parcela - Objeto con datos confirmados (precio, comuna, etc.) y texto (relato)
 * @returns {Object} - Objeto con los puntajes y estado de coincidencia
 */
export function calcularCategoriasParcela(parcela) {
  const resultados = {};
  
  // Extraer información base
  const relato = normalizeText(parcela.relato || parcela.descripcion_publica || '');
  const precio = Number(parcela.precio) || 0;
  const distancia = Number(parcela.distanciaCiudad) || null;
  const agua = parcela.agua || '';
  const luz = parcela.luz || '';
  const acceso = normalizeText(parcela.acceso || '');
  
  // 1. DESCANSO CERCA DE TODO
  let pDescanso = 0;
  let razonesDescanso = [];
  
  if (distancia !== null && distancia <= 30) {
    pDescanso += 40;
    razonesDescanso.push(`A ${distancia} minutos de ciudad (cerca)`);
  } else if (distancia !== null && distancia <= 45) {
    pDescanso += 20;
    razonesDescanso.push(`A ${distancia} minutos de ciudad (distancia media)`);
  }
  
  if (relato.includes('naturaleza') || relato.includes('pradera') || relato.includes('tranquilidad') || relato.includes('campo')) {
    pDescanso += 30;
    razonesDescanso.push('Menciona naturaleza o tranquilidad');
  }
  
  if (acceso.includes('pavimentado') || acceso.includes('asfalto') || acceso.includes('bueno')) {
    pDescanso += 20;
    razonesDescanso.push('Buen acceso confirmado');
  }
  
  if (luz === 'si' && agua === 'si') {
    pDescanso += 10;
    razonesDescanso.push('Servicios básicos confirmados');
  }
  
  resultados.descanso = {
    puntaje: Math.min(100, pDescanso),
    coincide: pDescanso >= CATEGORIAS_PARCELAS.descanso.puntajeMinimo,
    razones: razonesDescanso
  };

  // 2. INVERSIÓN INTELIGENTE
  let pInversion = 0;
  let razonesInversion = [];
  
  // Lógica simplificada: si el precio es bajo (< 12 millones por ej)
  if (precio > 0 && precio <= 12000000) {
    pInversion += 40;
    razonesInversion.push(`Precio económico detectado ($${(precio/1000000).toFixed(1)}M)`);
  } else if (precio > 12000000 && precio <= 18000000) {
    pInversion += 20;
    razonesInversion.push('Precio competitivo de mercado');
  }
  
  if (relato.includes('inversion') || relato.includes('plusvalia') || relato.includes('crecimiento')) {
    pInversion += 30;
    razonesInversion.push('Menciona potencial de inversión o plusvalía');
  }
  
  if (parcela.facilidadPago === 'si' || relato.includes('credito') || relato.includes('cuotas')) {
    pInversion += 20;
    razonesInversion.push('Ofrece facilidades de pago');
  }
  
  if (parcela.rol === 'si' || relato.includes('rol propio')) {
    pInversion += 20;
    razonesInversion.push('Rol propio confirmado');
  }
  
  resultados.inversion = {
    puntaje: Math.min(100, pInversion),
    coincide: pInversion >= CATEGORIAS_PARCELAS.inversion.puntajeMinimo,
    razones: razonesInversion
  };

  // 3. INMERSIÓN NATURAL
  let pNativas = 0;
  let razonesNativas = [];
  
  CATEGORIAS_PARCELAS.nativas.reglas.palabrasClave.forEach(keyword => {
    if (relato.includes(keyword)) {
      pNativas += 25;
      razonesNativas.push(`Menciona '${keyword}'`);
    }
  });
  
  if (distancia !== null && distancia >= 40) {
    pNativas += 30;
    razonesNativas.push(`Distancia mayor a 40 minutos (aislamiento)`);
  }
  
  if (agua === 'no' || luz === 'no') {
    pNativas += 10;
    razonesNativas.push('Ausencia de servicios urbanos (off-grid)');
  }
  
  resultados.nativas = {
    puntaje: Math.min(100, pNativas),
    coincide: pNativas >= CATEGORIAS_PARCELAS.nativas.puntajeMinimo,
    razones: [...new Set(razonesNativas)]
  };

  // 4. VIDA JUNTO AL AGUA
  let pAgua = 0;
  let razonesAgua = [];
  
  CATEGORIAS_PARCELAS.agua.reglas.palabrasClave.forEach(keyword => {
    // Buscar la palabra exacta (con \b) para evitar falsos positivos (ej. "precio" no debe calzar con "río" aunque no pasará por la tilde, pero "lago" en "lagoons")
    const regex = new RegExp(`\\b${normalizeText(keyword)}\\b`, 'g');
    if (regex.test(relato)) {
      pAgua += 40;
      razonesAgua.push(`Menciona cuerpo de agua: '${keyword}'`);
    }
  });
  
  resultados.agua = {
    puntaje: Math.min(100, pAgua),
    coincide: pAgua >= CATEGORIAS_PARCELAS.agua.puntajeMinimo,
    razones: [...new Set(razonesAgua)]
  };

  return resultados;
}
