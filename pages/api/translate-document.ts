import type { NextApiRequest, NextApiResponse } from 'next';
import { saveDocumentWithDuplicationCheck } from '../../lib/documentUtils';

type ResponseData = {
  success: boolean;
  document?: any;
  error?: string;
  isDuplicate?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  console.log("API: Recibida solicitud para guardar traducción");

  try {
    const { nombre, tamano, paginas, caracteres, texto_original, texto_traducido } = req.body;

    // Validar que se proporcionaron los datos necesarios
    if (!nombre || tamano === undefined || !paginas || caracteres === undefined) {
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
          error: result.error,
          isDuplicate: true
        });
      }
      
      console.log("API: Error al guardar documento:", result.error);
      return res.status(500).json({ 
        success: false, 
        error: result.error
      });
    }

    console.log("API: Documento guardado exitosamente:", result.document?.id);
    return res.status(201).json({ 
      success: true, 
      document: result.document || undefined 
    });
    
  } catch (error) {
    console.error("API: Error al procesar la solicitud:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
