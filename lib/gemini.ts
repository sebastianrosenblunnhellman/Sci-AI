import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyAW4iM1HEkhmdJRkfk0DvVF4KqKfcM5bM4");

export async function translateText(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    throw new Error('El texto a traducir está vacío');
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Actúa como un traductor científico experto en inglés y español. Tu única tarea es traducir con precisión el siguiente texto científico al español, sin agregar introducciones, conclusiones ni comentarios. La respuesta debe ser exclusivamente el texto traducido.

      Instrucciones:
      Precisión terminológica: Usa la terminología científica estándar en español, priorizando la opción más utilizada en la comunidad hispanohablante.
      Claridad y fluidez: Asegura una traducción clara y natural, evitando literalismos que generen ambigüedad.
      Estructura: Mantén la organización original del texto, incluyendo párrafos, secciones, ecuaciones y referencias.
      Registro formal: Usa un tono formal y preciso, adecuado para textos científicos.
      
      Texto a traducir:
      ${text}
    `;

    const result = await model.generateContent(prompt);
    
    if (!result || !result.response) {
      throw new Error('No se recibió respuesta de la API');
    }

    const response = result.response;
    const translatedText = response.text();
    
    if (!translatedText) {
      throw new Error('La API devolvió una respuesta vacía');
    }
    
    return translatedText;
  } catch (error) {
    if (error instanceof Error) {
      // Log the full error for debugging
      console.error('Detailed translation error:', {
        message: error.message,
        stack: error.stack,
        error
      });

      // Handle specific API errors
      if (error.message.includes('PERMISSION_DENIED')) {
        throw new Error('Error de autenticación con la API. Por favor, verifique la API key.');
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        throw new Error('Se ha excedido la cuota de la API. Por favor, inténtelo más tarde.');
      } else if (error.message.includes('INVALID_ARGUMENT')) {
        throw new Error('El texto proporcionado no es válido para la traducción.');
      } else if (error.message.includes('blocked')) {
        throw new Error('La solicitud fue bloqueada por la API. Por favor, revise el contenido.');
      } else if (error.message.includes('not found')) {
        throw new Error('El modelo de traducción no está disponible. Por favor, contacte al soporte técnico.');
      }
      
      throw new Error(`Error en la traducción: ${error.message}`);
    }
    throw new Error('Error inesperado durante la traducción');
  }
}

export async function translateChunks(text: string, chunkSize: number = 2000): Promise<string> {
  if (!text || text.trim() === '') {
    throw new Error('El texto a traducir está vacío');
  }

  try {
    // Split text into chunks while preserving paragraphs
    const chunks = [];
    let currentChunk = '';
    
    const paragraphs = text.split(/\n\n+/);
    
    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > chunkSize && currentChunk) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    if (chunks.length === 0) {
      throw new Error('No se pudo dividir el texto en fragmentos válidos');
    }

    // Translate each chunk with retries
    const translatedChunks = await Promise.all(
      chunks.map(async (chunk, index) => {
        const maxRetries = 3;
        let lastError = null;
        
        for (let retries = 0; retries < maxRetries; retries++) {
          try {
            const translated = await translateText(chunk);
            if (!translated) {
              throw new Error('Traducción vacía recibida');
            }
            return translated;
          } catch (error) {
            lastError = error;
            if (retries < maxRetries - 1) {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
              continue;
            }
          }
        }
        
        throw new Error(`No se pudo traducir el fragmento ${index + 1} después de ${maxRetries} intentos: ${lastError?.message || 'Error desconocido'}`);
      })
    );

    const finalTranslation = translatedChunks.join('\n\n');
    if (!finalTranslation) {
      throw new Error('La traducción final está vacía');
    }

    return finalTranslation;
  } catch (error) {
    console.error('Error in chunk translation:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    });
    throw error;
  }
}