// Configuration file for environment-specific settings

// Get the base URL for API requests based on environment
export const getApiBaseUrl = (): string => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Server-side rendering context
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
  } else {
    // Client-side context - prioritize the configured URL if available
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      // Remove trailing slash if present
      return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '');
    }
    // Fallback to current origin
    return window.location.origin;
  }
};

// Helper function to build API URLs
export const buildApiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  // Make sure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // For debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Building API URL with:', { baseUrl, normalizedPath, result: `${baseUrl}${normalizedPath}` });
  }
  
  return `${baseUrl}${normalizedPath}`;
};
