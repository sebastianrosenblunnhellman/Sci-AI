import type { NextApiRequest, NextApiResponse } from 'next';
import { saveDocumentWithDuplicationCheck } from '../../lib/documentUtils';

type ResponseData = {
  success: boolean;
  document?: any;
  error?: string;
  isDuplicate?: boolean;
};

// Helper function to set CORS headers
const setCorsHeaders = (res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Set CORS headers for all responses
  setCorsHeaders(res);
  
  // Handle OPTIONS requests (for CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Log the request method for debugging
  console.log("API: Método de solicitud recibido:", req.method);
  console.log("API: Headers recibidos:", req.headers);
  console.log("API: URL completa:", req.url);
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log("API: Método no permitido:", req.method);
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  console.log("API: Recibida solicitud para guardar traducción");

  try {
    const { nombre, tamano, paginas, caracteres, texto_original, texto_traducido } = req.body;

    // Validar que se proporcionaron los datos necesarios
    if (!nombre || tamano === undefined || !paginas || caracteres === undefined) {
      console.log("API: Faltan datos requeridos:", { nombre, tamano, paginas, caracteres });
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan datos requeridos para el documento' 
      });
    }

    console.log("API: Iniciando verificación de duplicados y guardado");
    console.log("API: Datos a guardar:", {
      nombre,
      tamano,
      paginas,
      caracteres
    });

    if (texto_traducido) {
      console.log("API: Longitud del texto traducido:", texto_traducido.length);
    }

    // Usar nuestra función que verifica duplicados
    const result = await saveDocumentWithDuplicationCheck(
      nombre, tamano, paginas, caracteres, texto_original, texto_traducido
    );

    if (!result.success) {
      // Verificar si el error es por duplicado
      if (result.isDuplicate) {
        console.log("API: Se detectó un documento duplicado");
        return res.status(409).json({ 
          success: false, 
          error: result.error || 'Documento duplicado',
          isDuplicate: true
        });
      }
      
      console.log("API: Error al guardar documento:", result.error);
      return res.status(500).json({ 
        success: false, 
        error: result.error || 'Error al guardar el documento'
      });
    }

    console.log("API: Documento guardado exitosamente:", result.document?.id);
    return res.status(201).json({ 
      success: true, 
      document: result.document || {} 
    });
    
  } catch (error) {
    console.error("API: Error al procesar la solicitud:", error);
    // Mejorar el manejo de errores para la implementación en Vercel
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error("API: Detalle del error:", errorMessage);
    
    return res.status(500).json({ 
      success: false, 
      error: errorMessage
    });
  }
}

// Define config for this API route to extend the maximum body size
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
