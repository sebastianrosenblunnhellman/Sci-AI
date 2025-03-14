import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { marked } from 'marked';

/**
 * Convierte texto Markdown a un PDF con formato adecuado
 */
export async function createPDFFromMarkdown(markdownText: string): Promise<Uint8Array> {
  try {
    // Crear un nuevo documento PDF
    const pdfDoc = await PDFDocument.create();
    
    // Cargar fuentes
    const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const boldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
    
    // Configuración de página
    const pageWidth = 612; // Carta ancho
    const pageHeight = 792; // Carta alto
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);
    
    // Configuración de texto
    const fontSize = 11;
    const headerSizes = {
      h1: 24, // Aumentado para títulos de artículos
      h2: 16,
      h3: 14,
      h4: 12,
    };
    const lineHeight = fontSize * 1.5;
    
    // Primera página
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    
    // Analizar estructura del documento para identificar metadatos académicos
    const lines = markdownText.split('\n');
    let documentTitle = '';
    let authors = [];
    let affiliations = [];
    let contactInfo = '';
    
    // Buscar título, autores y afiliación en las primeras líneas
    let titleFound = false;
    let authorSection = false;
    
    // Extraer metadatos del documento (título, autores, afiliaciones)
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i].trim();
      
      // El título suele ser el primer H1 o un texto muy destacado
      if (!titleFound && (line.startsWith('# ') || lines[i].startsWith('#'))) {
        documentTitle = line.replace(/^#+\s*/, '');
        titleFound = true;
        continue;
      }
      
      // Los autores suelen aparecer después del título, a menudo en negritas
      if (titleFound && !authorSection && 
         (line.match(/\*\*.*\*\*/) || line.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+/))) {
        authors.push(line.replace(/\*\*/g, ''));
        authorSection = true;
        continue;
      }
      
      // Las afiliaciones suelen aparecer después de los autores, a menudo en itálicas
      if (authorSection && (line.match(/\*.+\*/) || line.includes('@') || line.includes('Universidad') || line.includes('University'))) {
        affiliations.push(line.replace(/\*/g, ''));
        if (line.includes('@')) {
          contactInfo = line.trim();
        }
      }
      
      // Si encontramos una línea vacía después de las afiliaciones, terminamos la búsqueda
      if (authorSection && affiliations.length > 0 && line === '') {
        break;
      }
    }
    
    // Convertir Markdown a texto plano estructurado usando marked
    const tokens = marked.lexer(markdownText);
    
    // Función para añadir una nueva página cuando sea necesario
    const addPageIfNeeded = (heightNeeded: number): void => {
      if (y - heightNeeded < margin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    };
    
    // Función para escribir texto con saltos de línea automáticos
    const writeTextWithWrapping = (
      text: string,
      { font = regular, size = fontSize, indent = 0, spacing = 0, center = false } = {}
    ): void => {
      try {
        // Seguridad: Si el texto es nulo o vacío, salir
        if (!text || text.trim() === '') return;
        
        // Dividir en palabras para manejo de saltos de línea
        const words = text.split(' ');
        let line = '';
        const effectiveWidth = contentWidth - indent;
        
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const testLine = line ? `${line} ${word}` : word;
          let textWidth: number;
          
          try {
            textWidth = font.widthOfTextAtSize(testLine, size);
          } catch (e) {
            console.warn('Error al medir texto:', e);
            textWidth = testLine.length * (size * 0.5); // Estimación aproximada
          }
          
          if (textWidth > effectiveWidth && line) {
            // Verificar espacio disponible en la página actual
            addPageIfNeeded(lineHeight);
            
            // Calcular posición x para centrado si es necesario
            let xPos = margin + indent;
            if (center) {
              try {
                const lineWidth = font.widthOfTextAtSize(line, size);
                xPos = margin + (contentWidth - lineWidth) / 2;
              } catch (e) {
                console.warn('Error al centrar texto:', e);
              }
            }
            
            // Escribir línea actual
            currentPage.drawText(line, {
              x: xPos,
              y,
              size,
              font
            });
            
            y -= lineHeight;
            line = word;
          } else {
            line = testLine;
          }
        }
        
        // Escribir última línea si quedó algo
        if (line) {
          addPageIfNeeded(lineHeight);
          
          // Calcular posición x para centrado si es necesario
          let xPos = margin + indent;
          if (center) {
            try {
              const lineWidth = font.widthOfTextAtSize(line, size);
              xPos = margin + (contentWidth - lineWidth) / 2;
            } catch (e) {
              console.warn('Error al centrar texto:', e);
            }
          }
          
          currentPage.drawText(line, {
            x: xPos,
            y,
            size,
            font
          });
          y -= lineHeight;
        }
        
        // Aplicar espaciado adicional después del texto
        if (spacing > 0) {
          y -= spacing;
        }
      } catch (error) {
        console.error('Error al escribir texto en PDF:', error);
        // Continuar con el siguiente texto en caso de error
      }
    };
    
    // Generar página de título con metadatos académicos si se encontraron
    if (documentTitle || authors.length > 0) {
      // Título del documento
      if (documentTitle) {
        y = pageHeight - margin * 2; // Empezar más abajo para centrar visualmente
        
        writeTextWithWrapping(documentTitle, { 
          font: bold, 
          size: headerSizes.h1, 
          spacing: 30,
          center: true 
        });
      }
      
      // Autores
      if (authors.length > 0) {
        authors.forEach(author => {
          writeTextWithWrapping(author, { 
            font: bold, 
            size: fontSize * 1.2, 
            spacing: 5,
            center: true 
          });
        });
        
        y -= 10; // Espacio extra después de autores
      }
      
      // Afiliaciones
      if (affiliations.length > 0) {
        affiliations.forEach(affiliation => {
          writeTextWithWrapping(affiliation, { 
            font: italic, 
            size: fontSize, 
            spacing: 3,
            center: true 
          });
        });
        
        y -= 10; // Espacio extra después de afiliaciones
      }
      
      // Información de contacto
      if (contactInfo) {
        y -= 10; // Espacio adicional antes de la información de contacto
        writeTextWithWrapping(contactInfo, { 
          font: italic, 
          size: fontSize, 
          spacing: 20,
          center: true 
        });
      }
      
      // Agregar una línea horizontal para separar la cabecera del contenido
      currentPage.drawLine({
        start: { x: margin, y: y - 10 },
        end: { x: pageWidth - margin, y: y - 10 },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7)
      });
      
      y -= 40; // Espacio después de la línea separadora
    }
    
    // Función para detectar negrita, cursiva o ambos en un texto
    const detectEmphasis = (text: string): { text: string, font: typeof regular | typeof bold | typeof italic | typeof boldItalic } => {
      // Detectar negrita y cursiva (***texto***)
      if (text.match(/\*\*\*(.+?)\*\*\*/)) {
        return { 
          text: text.replace(/\*\*\*(.+?)\*\*\*/g, '$1'), 
          font: boldItalic 
        };
      }
      
      // Detectar negrita (**texto**)
      if (text.match(/\*\*(.+?)\*\*/)) {
        return { 
          text: text.replace(/\*\*(.+?)\*\*/g, '$1'), 
          font: bold 
        };
      }
      
      // Detectar cursiva (*texto*)
      if (text.match(/\*(.+?)\*/)) {
        return { 
          text: text.replace(/\*(.+?)\*/g, '$1'), 
          font: italic 
        };
      }
      
      // Texto regular sin énfasis
      return { text, font: regular };
    };
    
    // Procesar los tokens y escribir en el PDF
    for (const token of tokens) {
      try {
        switch (token.type) {
          case 'heading': {
            // Espaciado antes de encabezados
            y -= 15;
            
            addPageIfNeeded(lineHeight * 2);
            const level = Math.min(token.depth, 4);
            const size = headerSizes[`h${level}` as keyof typeof headerSizes] || fontSize;
            
            // Si es un encabezado de primer nivel (H1), centrar y usar negrita
            if (level === 1) {
              writeTextWithWrapping(token.text, { 
                font: bold,
                size,
                spacing: 15,
                center: true
              });
            } else {
              writeTextWithWrapping(token.text, { 
                font: bold,
                size,
                spacing: 10
              });
            }
            break;
          }
          
          case 'paragraph': {
            addPageIfNeeded(lineHeight);
            
            // Analizar si hay énfasis en el texto
            const { text, font } = detectEmphasis(token.text);
            
            writeTextWithWrapping(text, { 
              font,
              spacing: 10
            });
            break;
          }
          
          case 'list': {
            const items = token.items || [];
            const isOrdered = token.ordered;
            
            for (let i = 0; i < items.length; i++) {
              addPageIfNeeded(lineHeight);
              
              // Escribir el marcador de la lista
              const bullet = isOrdered ? `${i + 1}.` : '•';
              currentPage.drawText(bullet, {
                x: margin,
                y,
                size: fontSize,
                font: regular
              });
              
              // Escribir el texto del elemento
              const itemText = items[i].text || '';
              const { text, font } = detectEmphasis(itemText);
              
              writeTextWithWrapping(text, { 
                font,
                indent: 20 
              });
              
              // Espacio antes del siguiente elemento
              y -= 5;
            }
            break;
          }
          
          case 'code': {
            addPageIfNeeded(lineHeight * 2);
            
            // Dibujar un fondo para el bloque de código
            const codeLines = token.text.split('\n');
            const codeBlockHeight = lineHeight * codeLines.length + 15;
            
            currentPage.drawRectangle({
              x: margin - 5,
              y: y - codeBlockHeight + lineHeight,
              width: contentWidth + 10,
              height: codeBlockHeight,
              color: rgb(0.95, 0.95, 0.95),
              borderColor: rgb(0.8, 0.8, 0.8),
              borderWidth: 1
            });
            
            // Escribir cada línea de código
            for (const line of codeLines) {
              addPageIfNeeded(lineHeight);
              writeTextWithWrapping(line, { 
                font: regular,
                size: fontSize * 0.9,
                indent: 10
              });
            }
            
            // Espacio después del bloque de código
            y -= 10;
            break;
          }
          
          case 'blockquote': {
            addPageIfNeeded(lineHeight * 2);
            
            // Dibujar una línea vertical para la cita
            const quoteLines = token.text.split('\n');
            const quoteHeight = lineHeight * quoteLines.length + 10;
            
            currentPage.drawLine({
              start: { x: margin - 10, y },
              end: { x: margin - 10, y: y - quoteHeight },
              thickness: 3,
              color: rgb(0.8, 0.8, 0.8)
            });
            
            // Escribir texto de la cita
            for (const line of quoteLines) {
              addPageIfNeeded(lineHeight);
              writeTextWithWrapping(line, { 
                font: italic,
                indent: 15
              });
            }
            
            // Espacio después de la cita
            y -= 10;
            break;
          }
          
          case 'space': {
            y -= lineHeight;
            break;
          }
          
          case 'hr': {
            // Línea horizontal
            addPageIfNeeded(lineHeight * 2);
            
            currentPage.drawLine({
              start: { x: margin, y: y - lineHeight / 2 },
              end: { x: margin + contentWidth, y: y - lineHeight / 2 },
              thickness: 1,
              color: rgb(0.8, 0.8, 0.8)
            });
            
            y -= lineHeight * 2;
            break;
          }
          
          case 'table': {
            addPageIfNeeded(lineHeight * 3);
            
            // Parámetros de la tabla
            const header = token.header || [];
            const rows = token.rows || [];
            const cellPadding = 5;
            const cellHeight = lineHeight * 1.2;
            const columnWidths = [];
            
            // Calcular ancho de columnas (distribución equitativa)
            const numColumns = Math.max(header.length, ...rows.map(row => row.length));
            const columnWidth = contentWidth / numColumns;
            
            // Dibujar encabezados
            for (let i = 0; i < header.length; i++) {
              const cellContent = header[i] || '';
              const cellX = margin + (i * columnWidth);
              
              // Dibujar fondo de encabezado
              currentPage.drawRectangle({
                x: cellX,
                y: y - cellHeight,
                width: columnWidth,
                height: cellHeight,
                color: rgb(0.9, 0.9, 0.9)
              });
              
              // Texto de encabezado
              writeTextWithWrapping(cellContent, {
                font: bold,
                indent: i * columnWidth + cellPadding
              });
            }
            
            y -= cellHeight;
            
            // Dibujar filas
            for (const row of rows) {
              // Verificar si hay espacio para esta fila
              addPageIfNeeded(cellHeight);
              
              for (let i = 0; i < row.length; i++) {
                const cellContent = row[i] || '';
                const cellX = margin + (i * columnWidth);
                
                // Dibujar líneas de celda
                currentPage.drawLine({
                  start: { x: cellX, y: y + cellHeight },
                  end: { x: cellX, y: y },
                  thickness: 0.5,
                  color: rgb(0.8, 0.8, 0.8)
                });
                
                // Texto de celda
                writeTextWithWrapping(cellContent, {
                  indent: i * columnWidth + cellPadding
                });
              }
              
              // Línea horizontal para separar filas
              currentPage.drawLine({
                start: { x: margin, y: y },
                end: { x: margin + contentWidth, y: y },
                thickness: 0.5,
                color: rgb(0.8, 0.8, 0.8)
              });
              
              y -= cellHeight;
            }
            
            break;
          }
          
          default: {
            // Otros elementos no procesados específicamente,
            // intentamos extraer texto si está disponible
            if (token.text) {
              writeTextWithWrapping(token.text);
            }
          }
        }
      } catch (tokenError) {
        console.error(`Error procesando token ${token.type}:`, tokenError);
        // Continuar con el siguiente token en caso de error
      }
    }
    
    // Guardar documento
    return await pdfDoc.save();
    
  } catch (error) {
    console.error("Error detallado al generar PDF:", error);
    if (error instanceof Error) {
      throw new Error(`Error al generar PDF: ${error.message}`);
    } else {
      throw new Error("No se pudo crear el PDF debido a un error desconocido.");
    }
  }
}
