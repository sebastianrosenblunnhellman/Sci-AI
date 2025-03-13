import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { marked } from 'marked';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  const worker = new Worker(new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url));
  pdfjsLib.GlobalWorkerOptions.workerPort = worker;
}

export async function extractTextFromPDF(file: File): Promise<string> {
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

    const pdf = await loadingTask.promise;

    if (!pdf) {
      throw new Error('Failed to load PDF document. The file might be corrupted.');
    }

    let fullText = '';
    const numPages = pdf.numPages;

    if (numPages === 0) {
      throw new Error('The PDF document contains no pages.');
    }

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
            if (typeof item.str === 'string') {
              return item.str;
            } else if (item.chars) {
              return item.chars.map((char: any) => char.unicode).join('');
            }
            return '';
          })
          .join(' ');

        fullText += `${pageText}\n\n`;
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
      }
    }

    const cleanedText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/[^\S\n]+/g, ' ')
      .trim();

    if (!cleanedText) {
      throw new Error('No text could be extracted from the PDF. The document might be scanned or contain only images.');
    }

    return cleanedText;
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
        throw new Error('This appears to be a scanned PDF. Text extraction is only supported for digital PDFs.');
      }
      throw error;
    }
    
    throw new Error('Failed to extract text from the PDF. Please try a different file.');
  }
}

export async function createPDFFromText(markdownText: string): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Convert markdown to HTML
    const htmlContent = marked(markdownText);
    
    // Basic HTML to text conversion (you might want to enhance this)
    const plainText = htmlContent
      .replace(/<h1.*?>(.*?)<\/h1>/g, '\n# $1\n')
      .replace(/<h2.*?>(.*?)<\/h2>/g, '\n## $1\n')
      .replace(/<h3.*?>(.*?)<\/h3>/g, '\n### $1\n')
      .replace(/<p.*?>(.*?)<\/p>/g, '\n$1\n')
      .replace(/<.*?>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();

    const lines = plainText.split('\n');
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.5;
    
    let currentPage = pdfDoc.addPage();
    const { width, height } = currentPage.getSize();
    let y = height - margin;

    for (const line of lines) {
      if (line.startsWith('#')) {
        // Handle headers
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s*/, '');
        const headerSize = fontSize + (3 - level) * 4;
        
        if (y - headerSize < margin) {
          currentPage = pdfDoc.addPage();
          y = height - margin;
        }
        
        currentPage.drawText(text, {
          x: margin,
          y,
          size: headerSize,
          font: timesBoldFont
        });
        
        y -= headerSize * 1.5;
      } else if (line.trim()) {
        // Handle regular text
        if (y - lineHeight < margin) {
          currentPage = pdfDoc.addPage();
          y = height - margin;
        }
        
        currentPage.drawText(line.trim(), {
          x: margin,
          y,
          size: fontSize,
          font: timesRomanFont,
          lineHeight,
          maxWidth: width - 2 * margin
        });
        
        y -= lineHeight;
      }
    }

    return pdfDoc.save();
  } catch (error) {
    console.error('Error creating PDF:', error);
    throw new Error('Failed to generate the translated PDF. Please try again.');
  }
}