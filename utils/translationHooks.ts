import { useState } from 'react';
import { buildApiUrl } from './config';

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
    
    try {
      console.log("Enviando solicitud a la API...");
      console.log("Longitud del texto original:", texto_original?.length || 0);
      console.log("Longitud del texto traducido:", texto_traducido?.length || 0);
      
      // Use the buildApiUrl function to ensure the URL works in any environment
      const response = await fetch(buildApiUrl('/api/translate-document'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre,
          tamano,
          paginas,
          caracteres,
          texto_original,
          texto_traducido
        }),
      });
      
      console.log("Respuesta del servidor:", response.status);
      const data = await response.json();
      console.log("Datos de respuesta:", data);
      
      if (!response.ok) {
        if (response.status === 409) {
          // Es un documento duplicado
          setIsDuplicate(true);
          console.log("Documento duplicado detectado");
          return {
            success: false,
            error: data.error || 'Este documento ya existe en la base de datos',
            isDuplicate: true
          };
        }
        
        throw new Error(data.error || 'Error al guardar la traducción');
      }
      
      console.log("Guardado exitoso, documento:", data.document);
      return {
        success: true,
        document: data.document,
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
    isDuplicate
  };
}
