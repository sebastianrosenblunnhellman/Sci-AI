import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Guarda un documento en la base de datos
 */
export async function saveDocument(
  nombre: string,
  tamano: number,
  paginas: number,
  caracteres: number,
  texto_original?: string,
  texto_traducido?: string
) {
  // Guardar directamente sin verificar duplicados
  try {
    const document = await prisma.documento.create({
      data: {
        nombre,
        tamano,
        paginas,
        caracteres,
        texto_original,
        texto_traducido
      }
    });
    
    return {
      success: true,
      document
    };
  } catch (error) {
    console.error("Error al guardar el documento:", error);
    return {
      success: false,
      error: 'Error al guardar el documento.'
    };
  }
}

/**
 * Guarda un documento verificando duplicados primero
 */
export async function saveDocumentWithDuplicationCheck(
  nombre: string,
  tamano: number,
  paginas: number,
  caracteres: number,
  texto_original?: string,
  texto_traducido?: string
) {
  try {
    // Verificar si ya existe un documento con las mismas características
    const existingDocument = await prisma.documento.findFirst({
      where: {
        nombre: nombre,
        tamano: tamano,
        paginas: paginas
      }
    });
    
    // Si encontramos un documento con las mismas características, es probable que sea un duplicado
    if (existingDocument) {
      console.log("Documento posiblemente duplicado encontrado:", existingDocument.id);
      return {
        success: false,
        isDuplicate: true,
        error: 'Este documento ya existe en la base de datos'
      };
    }
    
    // Si no es duplicado, guardamos el nuevo documento
    const document = await prisma.documento.create({
      data: {
        nombre,
        tamano,
        paginas,
        caracteres,
        texto_original,
        texto_traducido
      }
    });
    
    return {
      success: true,
      document,
      isDuplicate: false
    };
  } catch (error) {
    console.error("Error al guardar el documento con verificación de duplicados:", error);
    return {
      success: false,
      error: 'Error al guardar el documento.',
      isDuplicate: false
    };
  }
}
