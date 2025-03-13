import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyBzZNUGL6XDMVGTMLUk6827vKkuzyG-2bU");

export async function translateText(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      You are a professional scientific translator. Translate the following English text to Spanish.
      Maintain academic and scientific terminology accurately. Preserve the formal tone and technical precision.
      Keep any citations, references, or mathematical formulas unchanged.
      
      Text to translate:
      ${text}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate text');
  }
}

export async function translateChunks(text: string, chunkSize: number = 2000): Promise<string> {
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

  // Translate each chunk
  const translatedChunks = await Promise.all(
    chunks.map(chunk => translateText(chunk))
  );

  // Combine translated chunks
  return translatedChunks.join('\n\n');
}