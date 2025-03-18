/**
 * Service for saving extracted images and managing their references
 * This implementation uses localStorage for metadata and blob URLs for image data
 */

// A simple in-memory cache for blob URLs to avoid duplicates
const blobUrlCache: Record<string, string> = {};

interface ImageMetadata {
  id: string;
  filename: string;
  blobUrl: string;
  timestamp: number;
  pageNumber?: number;
  width?: number;
  height?: number;
  type?: string;
}

// Storage key for image metadata in localStorage
const STORAGE_KEY = 'sci-ai-image-metadata';

// Get all image metadata from storage
function getMetadataFromStorage(): ImageMetadata[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    return [];
  }
}

// Save metadata to storage
function saveMetadataToStorage(metadata: ImageMetadata[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
  } catch (e) {
    console.error('Error writing to localStorage:', e);
  }
}

// Save an image and return its URL
export async function saveImage(imageData: Blob, filename: string, pageNumber?: number): Promise<string> {
  // Create a blob URL for the image data
  const blobUrl = URL.createObjectURL(imageData);
  
  // Store in our cache
  blobUrlCache[filename] = blobUrl;
  
  // Create metadata
  const metadata: ImageMetadata = {
    id: Math.random().toString(36).substring(2, 15),
    filename,
    blobUrl,
    timestamp: Date.now(),
    pageNumber,
    type: imageData.type,
  };
  
  // Add to storage
  const existingMetadata = getMetadataFromStorage();
  saveMetadataToStorage([...existingMetadata, metadata]);
  
  return blobUrl;
}

// Get an image by filename
export async function getImage(filename: string): Promise<string | null> {
  // Check cache first
  if (blobUrlCache[filename]) {
    return blobUrlCache[filename];
  }
  
  // Look up in metadata
  const metadata = getMetadataFromStorage();
  const imageMetadata = metadata.find(img => img.filename === filename);
  
  return imageMetadata ? imageMetadata.blobUrl : null;
}

// Get all images metadata
export async function getAllImages(): Promise<ImageMetadata[]> {
  return getMetadataFromStorage();
}

// Clear all images
export async function clearImages(): Promise<void> {
  // Revoke all blob URLs to prevent memory leaks
  const metadata = getMetadataFromStorage();
  
  metadata.forEach(img => {
    try {
      URL.revokeObjectURL(img.blobUrl);
      delete blobUrlCache[img.filename];
    } catch (e) {
      console.error('Error revoking blob URL:', e);
    }
  });
  
  // Clear storage
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
