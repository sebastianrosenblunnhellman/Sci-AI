import google.generativeai as genai
from django.conf import settings
import textwrap

def process_text_with_gemini(text):
    """
    Process extracted text with Gemini API
    """
    try:
        # Configure the genai library
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Check text length and warn if it's large
        if len(text) > 1_000_000:  # Arbitrary threshold
            print(f"WARNING: Very large text being sent to API: {len(text)} characters")
        
        # Define safety settings to be permissive for all categories
        safety_settings = [
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DEROGATORY", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_TOXICITY", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_VIOLENCE", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SELF_HARM", "threshold": "BLOCK_NONE"},
            # Add any other categories that might be relevant
        ]
        
        # Get model with safety settings
        model = genai.GenerativeModel('gemini-pro', safety_settings=safety_settings)
        
        # If text is extremely large, consider chunking it
        max_chunk_size = 60000  # Adjust based on API limitations
        
        if len(text) > max_chunk_size:
            # Process text in chunks
            chunks = textwrap.wrap(text, max_chunk_size, break_long_words=False, replace_whitespace=False)
            combined_response = ""
            
            for i, chunk in enumerate(chunks):
                chunk_prompt = f"This is part {i+1} of {len(chunks)} of the document. Please analyze it: \n\n{chunk}"
                try:
                    chunk_response = model.generate_content(chunk_prompt)
                    combined_response += f"\nAnalysis of part {i+1}:\n{chunk_response.text}\n"
                except Exception as chunk_error:
                    # Handle errors for individual chunks
                    print(f"Error processing chunk {i+1}: {str(chunk_error)}")
                    combined_response += f"\nError in analysis of part {i+1}: {str(chunk_error)}\n"
            
            return combined_response
        else:
            # Process normally if text is not too large
            prompt = f"Please analyze the following document content: \n\n{text}"
            response = model.generate_content(prompt)
            return response.text
            
    except Exception as e:
        print(f"Error calling Gemini API: {str(e)}")
        return f"Error processing text with Gemini: {str(e)}"
