import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { marked } from 'marked';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  const worker = new Worker(new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url));
  pdfjsLib.GlobalWorkerOptions.workerPort = worker;
}

// --- Helper Function: Convert ArrayBuffer to Base64 ---
function arrayBufferToBase64(buffer: ArrayBuffer, imageType: string): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${imageType};base64,${btoa(binary)}`;
}

// --- Type Definitions ---
interface ExtractedImage {
  page: number;
  dataUrl: string;
}

interface TextContentItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
  hasEOL: boolean;
}

// --- Main Extraction Function ---
export async function extractTextFromPDF(
  file: File, 
  progressCallback?: (progress: number, currentPage: number, totalPages: number) => void
): Promise<{ text: string; images: ExtractedImage[]; numPages: number }> {
  try {
    if (!file.type.includes('pdf')) {
      throw new Error('Invalid file type. Please upload a PDF file.');
    }

    if (file.size > 100 * 1024 * 1024) {
      throw new Error('File is too large. Maximum size is 100MB.');
    }

    const arrayBuffer = await file.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      throw new Error('The PDF file appears to be empty.');
    }

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });

    const pdf: pdfjsLib.PDFDocumentProxy = await loadingTask.promise;

    if (!pdf) {
      throw new Error('Failed to load PDF document. The file might be corrupted.');
    }

    let fullText = '';
    const images: ExtractedImage[] = [];
    const numPages = pdf.numPages;

    if (numPages === 0) {
      throw new Error('The PDF document contains no pages.');
    }
    
    // Report initial progress
    if (progressCallback) {
      progressCallback(0, 0, numPages);
    }

    const batchSize = 5; // Process 5 pages at a time for more frequent updates

    for (let i = 1; i <= numPages; i += batchSize) {
      const lastPage = Math.min(i + batchSize - 1, numPages);
      const batchPromises = [];

      for (let j = i; j <= lastPage; j++) {
        batchPromises.push(
          pdf.getPage(j).then(page =>
            page.getTextContent().then(content => {
              const pageText = content.items
                .map((item: any) => {
                  if (typeof item.str === 'string') {
                    return item.str;
                  }
                  return '';
                })
                .join(' ');

              return pageText;
            })
          )
        );
      }

      const batchResults = await Promise.all(batchPromises);
      fullText += batchResults.join('\n\n');
      
      // Report progress after each batch
      if (progressCallback) {
        const currentProgress = Math.min(100, Math.round((lastPage / numPages) * 100));
        progressCallback(currentProgress, lastPage, numPages);
      }
    }

    const cleanedText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/[^\S\n]+/g, ' ')
      .trim();

    if (!cleanedText && images.length === 0) {
      throw new Error('No text or images could be extracted from the PDF. The document might be scanned or contain only non-extractable content.');
    }

    return { text: cleanedText, images, numPages };
  } catch (error) {
    console.error('PDF extraction error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Invalid file type')) {
        throw new Error('Please upload a valid PDF file.');
      } else if (error.message.includes('File is too large')) {
        throw new Error('The PDF file is too large. Please try a smaller file (max 100MB).');
      } else if (error.message.includes('corrupted')) {
        throw new Error('The PDF file appears to be corrupted. Please try a different file.');
      } else if (error.message.includes('scanned')) {
        throw new Error('This appears to be a scanned PDF. Text and image extraction may not be fully supported for scanned PDFs.');
      }
      throw error;
    }

    throw new Error('Failed to extract content from the PDF. Please try a different file.');
  }
}

// --- Image Extraction Function ---
async function extractImagesFromPage(page: pdfjsLib.PDFPageProxy, pageNumber: number): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];
  // Use any type instead of pdfjsLib.OperatorList which doesn't exist in the type definitions
  const operatorList: any = await page.getOperatorList();

  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const op = operatorList.fnArray[i];
    // Use numeric constants instead of pdfjsLib.OPS which might not be exported correctly
    // 92 is paintImageXObject, 91 is paintXObject (based on common pdf.js values)
    if (op === 92 || op === 91) {
      const imageName = operatorList.argsArray[i][0];

      // Type assertion to bypass TypeScript error (temporary)
      const pageAny: any = page;

      let img;

      try {
        //Try to get the image using getXObject
        img = await pageAny.getXObject(imageName);
      }
      catch (error) {
        //If getXObject fails, try to get the image from the page's objects directly
        console.log("getXObject failed. Trying alternative method", error)
        img = pageAny.objs.get(imageName);
      }


      if (img && img.data) {
        const imageType = img.subtype === 'ImageB' ? 'image/bmp' : img.subtype === 'ImageC' ? 'image/jpeg' : 'image/png';
        const base64Image = arrayBufferToBase64(img.data, imageType);
        images.push({ page: pageNumber, dataUrl: base64Image });
      }
    }
  }
  return images;
}

// --- PDF Creation Function ---
export async function createPDFFromText(markdownText: string): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    // Configuración de página
    const fontSize = 11;
    const titleSize = 18;
    const h1Size = 16;
    const h2Size = 14;
    const h3Size = 13;
    const margin = 50;
    const lineHeight = fontSize * 1.5;
    const pageWidth = 612; // Tamaño carta
    const pageHeight = 792;
    const textWidth = pageWidth - (margin * 2);
    
    // Convierte markdown a HTML para mejor procesamiento
    const htmlContent = marked(markdownText);
    
    // Función auxiliar para añadir una nueva página
    const addNewPage = () => {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      return { page, y: pageHeight - margin };
    };
    
    // Función auxiliar para dibujar texto con saltos automáticos
    const drawTextWithWrapping = (text: string, x: number, y: number, options: any) => {
      let currentY = y;
      const maxWidth = options.maxWidth || textWidth;
      const words = text.split(' ');
      let currentLine = '';
      
      // Estimación simple: ~6 caracteres por cm en fuente estándar
      const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        
        // Lógica simple para estimar si el texto cabe en la línea
        if (testLine.length * (fontSize * 0.5) > maxWidth) {
          // Dibujar línea actual
          let page = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
          
          // Verificar si necesitamos una nueva página
          if (currentY - lineHeight < margin) {
            const newPage = addNewPage();
            page = newPage.page;
            currentY = newPage.y;
          }
          
          page.drawText(currentLine, {
            ...options,
            x,
            y: currentY,
            maxWidth
          });
          
          currentY -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      // Dibujar la última línea
      if (currentLine) {
        let page = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
        
        if (currentY - lineHeight < margin) {
          const newPage = addNewPage();
          page = newPage.page;
          currentY = newPage.y;
        }
        
        page.drawText(currentLine, {
          ...options,
          x,
          y: currentY,
          maxWidth
        });
        
        currentY -= lineHeight;
      }
      
      return currentY;
    };

    // Función para procesar y convertir el markdown
    const processMarkdown = () => {
      let { page, y } = addNewPage();
      
      // Separar por líneas y procesar cada una
      const lines = markdownText.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Saltar líneas vacías
        if (!line.trim()) {
          y -= lineHeight * 0.7; // Espacio entre párrafos
          continue;
        }
        
        // Procesar encabezados
        if (line.startsWith('#')) {
          const headerMatch = line.match(/^(#+)\s+(.+)$/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            
            // Añadir un espaciado adicional antes de encabezados excepto al principio de página
            if (y < pageHeight - margin - 20) {
              y -= lineHeight;
            }
            
            // Determinar tamaño y fuente según nivel del encabezado
            let headerSize = fontSize;
            switch (level) {
              case 1: headerSize = h1Size; break;
              case 2: headerSize = h2Size; break;
              case 3: headerSize = h3Size; break;
              default: headerSize = fontSize + (4 - Math.min(level, 4)); break;
            }
            
            // Verificar si necesitamos nueva página
            if (y - headerSize * 1.5 < margin) {
              const newPage = addNewPage();
              page = newPage.page;
              y = newPage.y;
            }
            
            // Dibujar encabezado
            y = drawTextWithWrapping(text, margin, y, {
              font: timesBoldFont,
              size: headerSize,
              maxWidth: textWidth
            });
            
            y -= lineHeight * 0.5; // Espacio después del encabezado
            continue;
          }
        }
        
        // Procesar listas
        if (line.match(/^(\s*[-*+]|\s*\d+\.)\s+/)) {
          const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
          if (listMatch) {
            const indentLevel = listMatch[1].length;
            const marker = listMatch[2];
            const text = listMatch[3];
            
            // Verificar espacio
            if (y - lineHeight < margin) {
              const newPage = addNewPage();
              page = newPage.page;
              y = newPage.y;
            }
            
            // Dibujar el marcador de lista y luego el texto
            page.drawText(marker, {
              x: margin + indentLevel * 10,
              y,
              font: timesRomanFont,
              size: fontSize
            });
            
            y = drawTextWithWrapping(text, margin + indentLevel * 10 + 20, y, {
              font: timesRomanFont,
              size: fontSize,
              maxWidth: textWidth - (indentLevel * 10 + 20)
            });
            
            continue;
          }
        }
        
        // Procesar texto en negrita e itálica
        let processedLine = line;
        const boldMatches = Array.from(line.matchAll(/\*\*(.*?)\*\*/g));
        const italicMatches = Array.from(line.matchAll(/\*(.*?)\*/g));
        
        // Si hay formato especial, lo procesamos por partes
        if (boldMatches.length > 0 || italicMatches.length > 0) {
          // Lógica simplificada: separamos por estilos básicos
          const segments = [];
          let lastIndex = 0;
          
          // Aquí iría una lógica más sofisticada para procesar todos los estilos
          // Para este ejemplo, simplemente detectamos el texto sin formato especial
          
          // Simplificación: tratar toda la línea como texto normal
          // En una implementación completa, procesaríamos cada segmento con su estilo
          y = drawTextWithWrapping(line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'), 
            margin, y, {
              font: timesRomanFont,
              size: fontSize,
              maxWidth: textWidth
            });
          
          continue;
        }
        
        // Texto normal (párrafo)
        y = drawTextWithWrapping(line, margin, y, {
          font: timesRomanFont,
          size: fontSize,
          maxWidth: textWidth
        });
      }
    };
    
    // Procesar el documento
    processMarkdown();
    
    return pdfDoc.save();
    
  } catch (error) {
    console.error('Error creating PDF:', error);
    throw new Error('Failed to generate the translated PDF. Please try again.');
  }
}
