import json
import sys

def log_api_request(text=None, payload=None, file_info=None):
    """
    Log information about an API request to help debug issues
    """
    debug_info = {
        "file_info": file_info or {},
        "text_length": len(text) if text else 0,
        "text_preview": text[:500] + "..." if text and len(text) > 500 else text,
        "payload_size": sys.getsizeof(payload) if payload else 0,
    }
    
    print("========== API REQUEST DEBUG INFO ==========")
    print(json.dumps(debug_info, indent=2))
    print("===========================================")

def analyze_text_content(text):
    """
    Analyze text content to identify potential issues
    """
    if not text:
        return {"error": "Empty text"}
    
    results = {
        "length": len(text),
        "lines": text.count('\n') + 1,
        "has_unusual_chars": any(ord(c) > 127 for c in text),
        "byte_size": sys.getsizeof(text),
    }
    
    # Check for binary data that might have been incorrectly extracted
    try:
        binary_chars = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
        results["binary_chars"] = binary_chars
        results["binary_ratio"] = binary_chars / len(text)
    except:
        results["binary_analysis"] = "Error analyzing binary content"
    
    return results
