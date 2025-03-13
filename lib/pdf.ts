import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts } from 'pdf-lib';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  const worker = new Worker(new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url));
  pdfjsLib.GlobalWorkerOptions.workerPort = worker;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Validate file type
    if (!file.type.includes('pdf')) {
      throw new Error('Invalid file type. Please upload a PDF file.');
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('File is too large. Maximum size is 100MB.');
    }

    const arrayBuffer = await file.arrayBuffer();
    
    // Validate PDF structure
    if (arrayBuffer.byteLength === 0) {
      throw new Error('The PDF file appears to be empty.');
    }

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;

    if (!pdf) {
      throw new Error('Failed to load PDF document. The file might be corrupted.');
    }

    let fullText = '';
    const numPages = pdf.numPages;

    // Validate page count
    if (numPages === 0) {
      throw new Error('The PDF document contains no pages.');
    }

    // Extract text from each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      
      if (!page) {
        console.warn(`Failed to load page ${i}`);
        continue;
      }

      try {
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => {
            // Handle different text item formats
            if (typeof item.str === 'string') {
              return item.str;
            } else if (item.chars) {
              return item.chars.map((char: any) => char.unicode).join('');
            }
            return '';
          })
          .join(' ');

        // Add page number for better context
        fullText += `[Page ${i}]\n${pageText}\n\n`;
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
        fullText += `[Page ${i} - Text extraction failed]\n\n`;
      }
    }

    // Clean up the extracted text
    const cleanedText = fullText
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n\n')    // Replace multiple newlines with double newline
      .replace(/[^\S\n]+/g, ' ')      // Replace multiple spaces (except newlines) with single space
      .trim();

    if (!cleanedText) {
      throw new Error('No text could be extracted from the PDF. The document might be scanned or contain only images.');
    }

    return cleanedText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    
    // Provide specific error messages for common issues
    if (error instanceof Error) {
      if (error.message.includes('Invalid file type')) {
        throw new Error('Please upload a valid PDF file.');
      } else if (error.message.includes('File is too large')) {
        throw new Error('The PDF file is too large. Please try a smaller file (max 100MB).');
      } else if (error.message.includes('corrupted')) {
        throw new Error('The PDF file appears to be corrupted. Please try a different file.');
      } else if (error.message.includes('scanned')) {
        throw new Error('This appears to be a scanned PDF. Text extraction is only supported for digital PDFs.');
      }
      throw error;
    }
    
    throw new Error('Failed to extract text from the PDF. Please try a different file.');
  }
}

export async function createPDFFromText(text: string): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 12;
    const margin = 50;
    const maxWidth = width - 2 * margin;
    const lineHeight = fontSize * 1.5;
    const maxLinesPerPage = Math.floor((height - 2 * margin) / lineHeight);

    let currentPage = page;
    let yPosition = height - margin;
    let currentLine = '';
    const words = text.split(' ');

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const lineWidth = timesRomanFont.widthOfTextAtSize(testLine, fontSize);

      if (lineWidth > maxWidth && currentLine) {
        // Draw current line
        currentPage.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: timesRomanFont,
        });

        yPosition -= lineHeight;
        currentLine = word;

        // Check if we need a new page
        if (yPosition < margin) {
          currentPage = pdfDoc.addPage();
          yPosition = height - margin;
        }
      } else {
        currentLine = testLine;
      }
    }

    // Draw remaining text
    if (currentLine) {
      currentPage.drawText(currentLine, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: timesRomanFont,
      });
    }

    return pdfDoc.save();
  } catch (error) {
    console.error('Error creating PDF:', error);
    throw new Error('Failed to generate the translated PDF. Please try again.');
  }
}