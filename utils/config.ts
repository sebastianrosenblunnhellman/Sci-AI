// Configuration file for environment-specific settings

// Get the base URL for API requests based on environment
export const getApiBaseUrl = (): string => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Server-side rendering context
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
  } else {
    // Client-side context
    // Check for environment variable first (Next.js makes these available to the client if prefixed with NEXT_PUBLIC_)
    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (envUrl) {
      // Remove trailing slash if present
      return envUrl.replace(/\/$/, '');
    }
    
    // If no environment variable is set, use window.location.origin
    return window.location.origin;
  }
};

// Helper function to build API URLs
export const buildApiUrl = (path: string): string => {
  let baseUrl = getApiBaseUrl();
  
  // Safety check for completely invalid URLs like "http://api"
  if (baseUrl === 'http://api' || baseUrl === 'https://api') {
    console.warn('Invalid base URL detected, falling back to current origin');
    baseUrl = window.location.origin;
  }
  
  // If the path already includes /api and baseUrl ends with /api, avoid duplicating
  if (path.startsWith('/api') && baseUrl.endsWith('/api')) {
    path = path.substring(4); // Remove /api from path
  }
  
  // Make sure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // For debugging in development and production
  console.log('Building API URL with:', { 
    baseUrl, 
    normalizedPath, 
    result: `${baseUrl}${normalizedPath}`,
    envUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    windowOrigin: typeof window !== 'undefined' ? window.location.origin : 'not-browser'
  });
  
  // Build and return the full URL
  return `${baseUrl}${normalizedPath}`;
};
