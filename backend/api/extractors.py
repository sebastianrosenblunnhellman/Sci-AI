# ...existing code...

def extract_text_from_pdf(pdf_file):
    """
    Extract text from a PDF file
    """
    try:
        pdf = PdfReader(pdf_file)
        text = ""
        
        # Get total pages for logging
        total_pages = len(pdf.pages)
        print(f"Processing PDF with {total_pages} pages")
        
        for i, page in enumerate(pdf.pages):
            try:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
                print(f"Extracted page {i+1}/{total_pages}: {len(page_text) if page_text else 0} characters")
            except Exception as page_error:
                print(f"Error extracting text from page {i+1}: {str(page_error)}")
                # Continue with other pages despite errors
                
        # Clean text to remove any problematic characters
        # This may help with API processing
        text = ''.join(char if ord(char) < 65536 else ' ' for char in text)
        
        print(f"Total extracted text: {len(text)} characters")
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        return None
# ...existing code...
