# ...existing code...

@api_view(['POST'])
def process_document(request):
    try:
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        file_extension = os.path.splitext(file.name)[1].lower()
        
        if file_extension == '.pdf':
            text = extract_text_from_pdf(file)
        elif file_extension in ['.doc', '.docx']:
            text = extract_text_from_docx(file)
        elif file_extension == '.txt':
            text = file.read().decode('utf-8')
        else:
            return Response({"error": "Unsupported file format"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not text:
            return Response({"error": "Could not extract text from the document"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Debug information
        text_length = len(text)
        print(f"Extracted text length: {text_length} characters")
        
        # Import and use debug utilities
        from .debug_utils import log_api_request, analyze_text_content
        
        # Log detailed information about the content
        file_info = {"name": file.name, "size": file.size, "content_type": file.content_type}
        log_api_request(text=text, file_info=file_info)
        
        # Analyze the content for potential issues
        content_analysis = analyze_text_content(text)
        print("Content analysis:", content_analysis)
        
        # Call to Google API
        response = process_text_with_gemini(text)
        
        return Response({
            "extracted_text": text[:1000] + "..." if len(text) > 1000 else text,  # Just send preview
            "api_response": response
        })
    except Exception as e:
        print(f"Error in process_document: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# ...existing code...
