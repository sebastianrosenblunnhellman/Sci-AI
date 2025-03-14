import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_CHUNK_SIZE = 4000; // Tamaño máximo de cada fragmento para la API

/**
 * Divide el texto en fragmentos más pequeños para procesar con la API
 */
function splitIntoChunks(text: string, maxSize: number): string[] {
  if (!text) return [];
  
  // Dividir por párrafos primero
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // Si el párrafo por sí solo excede el tamaño máximo, dividirlo por oraciones
    if (paragraph.length > maxSize) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length + 1 <= maxSize) {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          
          // Si una sola oración es mayor que el tamaño máximo, dividirla
          if (sentence.length > maxSize) {
            const words = sentence.split(' ');
            currentChunk = '';
            
            for (const word of words) {
              if (currentChunk.length + word.length + 1 <= maxSize) {
                currentChunk += (currentChunk ? ' ' : '') + word;
              } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = word;
              }
            }
          } else {
            currentChunk = sentence;
          }
        }
      }
    } else if (currentChunk.length + paragraph.length + 2 <= maxSize) {
      // Añadir el párrafo completo si cabe en el fragmento actual
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      // Guardar el fragmento actual y comenzar uno nuevo con este párrafo
      chunks.push(currentChunk);
      currentChunk = paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

export async function translateText(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    throw new Error('El texto a traducir está vacío');
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Actúa como un traductor científico experto en inglés y español. Tu tarea es traducir con precisión el siguiente texto científico al español, siguiendo estas instrucciones específicas:

      1. Formato y Estructura:
         - Usa # para títulos principales
         - ## para subtítulos
         - ### para secciones menores
         - Mantén listas con - o números cuando corresponda
         - Preserva el énfasis usando *cursiva* o **negrita** según corresponda

      2. Limpieza del Texto:
         - Elimina números de página
         - Remueve códigos editoriales
         - Quita información redundante o metadata innecesaria
         - Elimina encabezados y pies de página repetitivos
         - Mantén solo el contenido científico relevante

      3. Traducción:
         - Usa terminología científica estándar en español
         - Mantén la precisión técnica
         - Asegura una traducción clara y natural
         - Preserva el significado exacto de términos técnicos
         - Adapta el texto para la audiencia hispanohablante

      4. Estructura Final:
         - Organiza el contenido en secciones claras
         - Mantén la jerarquía de información
         - Usa espaciado adecuado entre secciones
         - Asegura una presentación limpia y profesional

      IMPORTANTE: Devuelve SOLO el texto traducido en formato Markdown, sin añadir marcadores adicionales ni texto explicativo.

      Texto a traducir:
      ${text}
    `;

    const result = await model.generateContent(prompt);
    
    if (!result || !result.response) {
      throw new Error('No se recibió respuesta de la API');
    }

    const response = result.response;
    const translatedText = response.text().trim();
    
    if (!translatedText) {
      throw new Error('La API devolvió una respuesta vacía');
    }
    
    // Remove any ```markdown or ``` tags if present
    return translatedText.replace(/^```markdown\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

export async function translateChunks(text: string, apiKey: string): Promise<string> {
  if (!text.trim()) return '';
  if (!apiKey) throw new Error('Se requiere una API Key válida para la traducción');
  
  try {
    const chunks = splitIntoChunks(text, MAX_CHUNK_SIZE);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const translatedChunks = await Promise.all(
      chunks.map(async (chunk, index) => {
        try {
          const prompt = `Por favor, traduce el siguiente texto científico del inglés al español, manteniendo la estructura, las imágenes y formato. Conserva términos técnicos si es necesario. Asegúrate que el texto sea coherente y fluido:\n\n${chunk}`;
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        } catch (error) {
          console.error(`Error en el fragmento ${index + 1}:`, error);
          throw new Error(`Error al traducir el fragmento ${index + 1}. Por favor, verifica tu API Key e inténtalo de nuevo.`);
        }
      })
    );
    
    return translatedChunks.join('\n\n');
  } catch (error) {
    console.error('Error en traducción:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error durante la traducción. Por favor, verifica tu API Key e inténtalo de nuevo.');
  }
}
