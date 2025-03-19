import { prisma } from './prisma';

export interface DocumentData {
  nombre: string;
  tamano: number;
  paginas: number;
  caracteres: number;
  texto_original?: string;
  texto_traducido?: string;
}

export async function saveDocumentTranslation(documentData: DocumentData) {
  try {
    const savedDocument = await prisma.documento.create({
      data: {
        nombre: documentData.nombre,
        tamano: documentData.tamano,
        paginas: documentData.paginas,
        caracteres: documentData.caracteres,
        texto_original: documentData.texto_original,
        texto_traducido: documentData.texto_traducido
      }
    });
    
    return { success: true, document: savedDocument };
  } catch (error) {
    console.error('Error saving document translation:', error);
    return { success: false, error };
  }
}

export async function getDocuments() {
  try {
    return await prisma.documento.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}
