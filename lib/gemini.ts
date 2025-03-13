import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyAW4iM1HEkhmdJRkfk0DvVF4KqKfcM5bM4");

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

export async function translateChunks(text: string, chunkSize: number = 2000): Promise<string> {
  if (!text || text.trim() === '') {
    throw new Error('El texto a traducir está vacío');
  }

  try {
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
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
              continue;
            }
          }
        }
        
        throw new Error(`No se pudo traducir el fragmento ${index + 1} después de ${maxRetries} intentos: ${lastError?.message || 'Error desconocido'}`);
      })
    );

    return translatedChunks.join('\n\n');
  } catch (error) {
    console.error('Error in chunk translation:', error);
    throw error;
  }
}
