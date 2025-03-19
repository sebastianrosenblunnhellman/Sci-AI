// Configuration file for environment-specific settings

// Get the base URL for API requests based on environment
export const getApiBaseUrl = (): string => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Server-side rendering context
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
  } else {
    // Client-side context - use the current origin
    return window.location.origin;
  }
};

// Helper function to build API URLs
export const buildApiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  // Make sure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};
