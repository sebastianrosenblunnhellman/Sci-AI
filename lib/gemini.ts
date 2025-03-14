import { GoogleGenerativeAI } from "@google/generative-ai";

// Ajustamos para gemini-2.0-flash que puede manejar hasta 1 millón de tokens
const APPROX_CHARS_PER_PAGE = 2000; // Estimación promedio de caracteres por página
const PAGES_PER_CHUNK = 15; // Procesamos 15 páginas por vez
const MAX_CHUNK_SIZE = APPROX_CHARS_PER_PAGE * PAGES_PER_CHUNK; // Aproximadamente 30,000 caracteres

/**
 * Divide el texto en fragmentos más grandes para aprovechar gemini-2.0-flash
 */
function splitIntoChunks(text: string, maxSize: number): string[] {
  if (!text) return [];
  
  const chunks: string[] = [];
  
  // Si el texto completo es menor que el tamaño máximo, devolverlo como un único fragmento
  if (text.length <= maxSize) {
    return [text];
  }
  
  // Para textos más grandes, dividir en secciones lógicas (por capítulos o secciones)
  const sectionBreaks = [
    /\n\s*?(?:CAPITULO|CAPÍTULO|CHAPTER)\s+\d+/gi, // Capítulos numerados
    /\n\s*?(?:SECTION|SECCIÓN)\s+\d+/gi,          // Secciones numeradas
    /\n\s*?\d+\.\s+[A-Z]/g,                      // Secciones con formato "1. Título"
    /\n\s*?[IVX]+\.\s+[A-Z]/g,                   // Secciones en numeración romana
    /\n\s*?#{1,3}\s+/g,                          // Encabezados markdown
    /\n\s*?\*\*\*+\s*?\n/g,                      // Separadores
    /\n\s*?---+\s*?\n/g,                         // Separadores alternativos
    /\n\s*?\n\s*?\n/g                            // Párrafos dobles
  ];
  
  // Unir todas las expresiones regulares para encontrar puntos de ruptura naturales
  const allBreakpoints: number[] = [];
  sectionBreaks.forEach(regex => {
    let match;
    const re = new RegExp(regex);
    while ((match = re.exec(text)) !== null) {
      allBreakpoints.push(match.index);
    }
  });
  
  // Ordenar los puntos de ruptura
  allBreakpoints.sort((a, b) => a - b);
  
  let currentPosition = 0;
  
  while (currentPosition < text.length) {
    let nextBreakpoint = text.length;
    
    // Buscar el próximo punto de ruptura dentro del tamaño máximo
    for (let i = 0; i < allBreakpoints.length; i++) {
      if (allBreakpoints[i] > currentPosition && 
          allBreakpoints[i] - currentPosition < maxSize) {
        nextBreakpoint = allBreakpoints[i];
      } else if (allBreakpoints[i] > currentPosition + maxSize) {
        break;
      }
    }
    
    // Si no encontramos un punto de ruptura adecuado, dividir en el tamaño máximo
    if (nextBreakpoint === text.length && nextBreakpoint - currentPosition > maxSize) {
      // Buscar el último punto o salto de línea dentro del límite
      const segment = text.substring(currentPosition, currentPosition + maxSize);
      const lastPeriod = Math.max(
        segment.lastIndexOf('. '),
        segment.lastIndexOf('.\n'),
        segment.lastIndexOf('\n\n')
      );
      
      if (lastPeriod > 0) {
        nextBreakpoint = currentPosition + lastPeriod + 1;
      } else {
        // Si no hay un buen punto de ruptura, usar el tamaño máximo
        nextBreakpoint = currentPosition + maxSize;
      }
    }
    
    // Añadir el fragmento al array
    chunks.push(text.substring(currentPosition, nextBreakpoint).trim());
    currentPosition = nextBreakpoint;
  }
  
  return chunks;
}

/**
 * Traduce un fragmento de texto usando gemini-2.0-flash
 */
async function translateChunkWithRetry(
  chunk: string, 
  apiKey: string, 
  genAI: GoogleGenerativeAI,
  maxRetries = 2
): Promise<string> {
  let retries = 0;
  let lastError: Error | null = null;
  
  while (retries <= maxRetries) {
    try {
      // Usar gemini-2.0-flash en lugar de gemini-pro
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 50000, // Permitir respuestas grandes
        }
      });
      
      // Prompt mejorado que exige explícitamente formato Markdown
      const prompt = `
        Traduce este texto científico/técnico del inglés al español, entregando el resultado en formato Markdown bien estructurado.
        
        INSTRUCCIONES:
        - Estructura el texto utilizando elementos Markdown:
          * # para títulos principales
          * ## para subtítulos secundarios
          * ### para encabezados terciarios
          * **texto** para negritas
          * *texto* para cursivas
          * Listas con guiones (-) o numeración (1., 2.)
          * Tablas con formato Markdown si es necesario
          * > para citas
        
        - Mantén la terminología técnica y científica original cuando sea apropiado
        - Preserva la estructura jerárquica y organización del texto original
        - Traduce con fidelidad sin añadir, omitir o interpretar información
        - Usa español formal y académico
        - Respeta párrafos y saltos de línea importantes
        - Mantén el formato de cualquier ecuación, referencia o elemento especial

        IMPORTANTE: Devuelve EXCLUSIVAMENTE el texto traducido en formato Markdown, sin comentarios adicionales ni marcas de código (como \`\`\`markdown).

        TEXTO A TRADUCIR:
        ${chunk}
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translated = response.text();
      
      if (!translated || translated.trim().length < chunk.length * 0.1) {
        throw new Error("La traducción devuelta es demasiado corta en comparación con el texto original");
      }
      
      // Limpiar posibles marcadores de código que la IA podría insertar
      return translated
        .replace(/^```\s*markdown\s*\n/i, '')
        .replace(/\n```\s*$/i, '')
        .trim();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Intento ${retries + 1} fallido para traducir fragmento grande. Error:`, lastError);
      retries++;
      
      // Esperar antes de reintentar (backoff exponencial)
      if (retries <= maxRetries) {
        const waitTime = Math.pow(2, retries) * 1500; // 3s, 6s
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError || new Error("No se pudo traducir el fragmento después de varios intentos");
}

export async function translateChunks(text: string, apiKey: string, progressCallback?: (progress: number) => void): Promise<string> {
  if (!text.trim()) return '';
  if (!apiKey) throw new Error('Se requiere una API Key válida para la traducción');
  
  try {
    // Inicializar la API de Google
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Dividir el texto en fragmentos más grandes
    const chunks = splitIntoChunks(text, MAX_CHUNK_SIZE);
    console.log(`Texto dividido en ${chunks.length} fragmentos grandes para traducción. Aproximadamente ${chunks.length * PAGES_PER_CHUNK} páginas.`);
    
    // Array para almacenar los resultados
    const translatedChunks: string[] = [];
    
    // Procesar fragmentos secuencialmente
    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i];
        console.log(`Traduciendo fragmento ${i+1}/${chunks.length} (${chunk.length} caracteres)`);
        
        const translated = await translateChunkWithRetry(chunk, apiKey, genAI);
        translatedChunks.push(translated);
        
        // Notificar progreso si hay un callback
        if (progressCallback) {
          const progress = Math.round(((i + 1) / chunks.length) * 100);
          progressCallback(progress);
        }
      } catch (error) {
        console.error(`Error en el fragmento ${i + 1} de ${chunks.length}:`, error);
        throw new Error(`Error al procesar el fragmento ${i + 1}. El modelo puede estar experimentando dificultades con esta sección. Por favor, intente nuevamente.`);
      }
    }
    
    return translatedChunks.join('\n\n');
  } catch (error) {
    console.error('Error en traducción:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error durante la traducción. Por favor, verifica tu API Key e inténtalo de nuevo.');
  }
}
