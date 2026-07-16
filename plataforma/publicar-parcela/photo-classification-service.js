/**
 * Stub para el servicio de clasificación visual.
 * En el futuro, esto enviará las imágenes a una IA (ej. OpenAI Vision) 
 * para extraer etiquetas visuales de la parcela.
 */

export const VISUAL_LABELS = {
  BOSQUE: 'bosque',
  PRADERA: 'pradera',
  VEGETACION: 'vegetacion',
  AGUA_VISIBLE: 'agua visible',
  TERRENO_PLANO: 'terreno plano',
  ENTORNO_RURAL: 'entorno rural'
};

/**
 * Analiza un conjunto de fotos y sugiere etiquetas visuales.
 * @param {Array<File>} photos - Archivos de imagen
 * @returns {Promise<Array<{etiqueta: string, confianza: number, estado: string}>>}
 */
export async function analyzePhotosForClassification(photos) {
  // TODO: Integrar API real de visión.
  // Por ahora, simulamos un retorno vacío o básico después de un retardo.
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Retornamos un análisis simulado vacío o con sugerencias genéricas
      resolve([
        // Ejemplo de respuesta que daría la API:
        // { etiqueta: VISUAL_LABELS.VEGETACION, confianza: 0.85, estado: 'pendiente_confirmacion' }
      ]);
    }, 500);
  });
}
