import { useDocumentTranslation } from '../utils/translationHooks';

// Define a type for the Gemini API response
interface GeminiTranslationResponse {
  text?: string;
  // Add other properties that might be in your response
  data?: any;
  status?: number;
}

// ...existing code...

// Add this hook at the component level
const { saveTranslation, isLoading: isSaving, error: saveError } = useDocumentTranslation();

// Find your Gemini API call function and add the database save
const handleGeminiResponse = async (response: GeminiTranslationResponse) => {
  // ...existing code...
  
  // After you've successfully received and processed the translation:
  if (translatedText) {
    try {
      const documentData = {
        nombre: currentFile.name, // Replace with your actual file name variable
        tamano: currentFile.size / (1024 * 1024), // Convert bytes to MB
        paginas: pageCount, // Replace with your actual page count variable
        caracteres: originalText.length,
        texto_original: originalText,
        texto_traducido: translatedText
      };
      
      // Save to database
      const result = await saveTranslation(
        documentData.nombre,
        documentData.tamano,
        documentData.paginas,
        documentData.caracteres,
        documentData.texto_original,
        documentData.texto_traducido
      );
      
      if (result.success) {
        console.log("Translation saved successfully:", result.document);
        // Show success notification
      } else {
        console.error("Failed to save translation:", result.error);
        // Show error notification
      }
    } catch (err) {
      console.error("Error saving translation:", err);
    }
  }
};

// ...existing code...