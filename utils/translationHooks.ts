import { useState } from 'react';
import { buildApiUrl } from './config';

// First, check if the API is available
const checkApiAvailability = async (): Promise<boolean> => {
  try {
    const healthCheckUrl = buildApiUrl('/api/healthcheck');
    const response = await fetch(healthCheckUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    console.log("Health check response:", response.status);
    return response.ok;
  } catch (error) {
    console.error("API health check failed:", error);
    return false;
  }
};

interface TranslationResult {
  success: boolean;
  document?: any;
  error?: string;
  isDuplicate?: boolean;
}

export function useDocumentTranslation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  // Check API availability on component mount
  useState(() => {
    checkApiAvailability().then(available => {
      setApiAvailable(available);
      console.log("API availability check:", available ? "API is available" : "API is not available");
    });
  });

  const saveTranslation = async (
    nombre: string,
    tamano: number,
    paginas: number,
    caracteres: number,
    texto_original?: string,
    texto_traducido?: string
  ): Promise<TranslationResult> => {
    setIsLoading(true);
    setError(null);
    setIsDuplicate(false);
    
    console.log("Iniciando guardado en base de datos...");
    
    // Validación básica
    if (!texto_traducido || texto_traducido.trim() === '') {
      console.error("Error: Texto traducido vacío");
      setError("El texto traducido está vacío");
      setIsLoading(false);
      return {
        success: false,
        error: "El texto traducido no puede estar vacío",
        isDuplicate: false
      };
    }

    // Check API availability first
    if (apiAvailable === false) {
      const errorMsg = "La API no está disponible en este momento. Verifique su conexión o inténtelo más tarde.";
      setError(errorMsg);
      setIsLoading(false);
      return {
        success: false,
        error: errorMsg,
        isDuplicate: false
      };
    }
    
    try {
      // Get the full API URL for debugging
      const apiUrl = buildApiUrl('/api/translate-document');
      console.log("URL de API completa:", apiUrl);
      
      console.log("Enviando solicitud a la API...");
      console.log("Longitud del texto original:", texto_original?.length || 0);
      console.log("Longitud del texto traducido:", texto_traducido?.length || 0);
      
      // Make the API request with explicit headers and mode
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          nombre,
          tamano,
          paginas,
          caracteres,
          texto_original,
          texto_traducido
        }),
      });
      
      console.log("Respuesta del servidor:", response.status, response.statusText);
      
      // Check for common HTTP errors first
      if (response.status === 405) {
        const errorMsg = "Método no permitido (405): La API no acepta solicitudes POST. Verifique la configuración del servidor.";
        console.error(errorMsg);
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
          isDuplicate: false
        };
      }
      
      // Try to parse the JSON, with fallbacks for error cases
      let data;
      try {
        const textResponse = await response.text();
        console.log("Respuesta de texto:", textResponse);
        
        // Only attempt to parse if there's content
        if (textResponse.trim()) {
          data = JSON.parse(textResponse);
        } else {
          data = { error: "Respuesta vacía del servidor" };
        }
      } catch (parseError) {
        console.error("Error al analizar la respuesta JSON:", parseError);
        return {
          success: false,
          error: `Error de formato en la respuesta: ${response.statusText || "Desconocido"}`,
          isDuplicate: false
        };
      }
      
      console.log("Datos de respuesta:", data);
      
      if (!response.ok) {
        if (response.status === 409) {
          // Es un documento duplicado
          setIsDuplicate(true);
          console.log("Documento duplicado detectado");
          return {
            success: false,
            error: data?.error || 'Este documento ya existe en la base de datos',
            isDuplicate: true
          };
        }
        
        throw new Error(data?.error || `Error HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log("Guardado exitoso, documento:", data?.document);
      return {
        success: true,
        document: data?.document,
        isDuplicate: false
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error("Error capturado:", errorMessage);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        isDuplicate: false
      };
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    saveTranslation,
    isLoading,
    error,
    isDuplicate,
    apiAvailable
  };
}
