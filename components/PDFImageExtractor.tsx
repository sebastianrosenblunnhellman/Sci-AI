"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Download, X, ImageIcon, FileUp, Plus, GridIcon, ListIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { saveImage } from '@/lib/imageStorage';

export interface ExtractedImageProps {
  id: string;
  dataUrl: string;
  page: number;
  width?: number;
  height?: number;
  size?: number;
}

interface PDFImageExtractorProps {
  images: ExtractedImageProps[];
  isExtracting: boolean;
  onAddImageToMarkdown: (imageUrl: string, caption?: string) => void;
}

export function PDFImageExtractor({ 
  images, 
  isExtracting, 
  onAddImageToMarkdown 
}: PDFImageExtractorProps) {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filteredImages, setFilteredImages] = useState<ExtractedImageProps[]>([]);
  
  useEffect(() => {
    // Filter out any potential duplicate images by comparing data URLs
    const uniqueImages = images.filter((image, index) => {
      return index === images.findIndex((img) => img.dataUrl === image.dataUrl);
    });
    
    setFilteredImages(uniqueImages);
  }, [images]);

  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
  };

  const handleAddToMarkdown = async () => {
    const imagesToAdd = filteredImages.filter(img => selectedImages.has(img.id));
    
    try {
      // Process each selected image
      for (let i = 0; i < imagesToAdd.length; i++) {
        const img = imagesToAdd[i];
        // Convert data URL to blob
        const byteString = atob(img.dataUrl.split(',')[1]);
        const mimeString = img.dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let j = 0; j < byteString.length; j++) {
          ia[j] = byteString.charCodeAt(j);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        
        // Generate a filename with the page number
        const extension = mimeString.split('/')[1] || 'png';
        const filename = `figura${i + 1}_pagina${img.page || 0}.${extension}`;
        
        // Save the image and get its blob URL - this will work without external dependencies
        const blobUrl = await saveImage(blob, filename, img.page);
        
        // Format a caption for the image
        const caption = `Figura ${i + 1}: Imagen ${img.page > 0 ? `de la página ${img.page}` : 'extraída'}`;
        
        // Create markdown with the blob URL
        onAddImageToMarkdown(`![${caption}](${blobUrl})`, caption);
      }
    } catch (error) {
      console.error("Error adding images to markdown:", error);
      
      // Fallback to direct data URLs if our storage approach fails
      imagesToAdd.forEach((img, index) => {
        const caption = `Figura ${index + 1}: Imagen ${img.page > 0 ? `de la página ${img.page}` : 'extraída'}`;
        onAddImageToMarkdown(`![${caption}](${img.dataUrl})`, caption);
      });
    }
    
    // Clear selection after adding
    setSelectedImages(new Set());
  };

  const downloadImage = async (dataURL: string, index: number) => {
    try {
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `imagen_${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  if (isExtracting) {
    return (
      <div className="p-4 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-center text-muted-foreground">
          Extrayendo imágenes del PDF...
        </p>
      </div>
    );
  }

  if (filteredImages.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="mb-4 flex justify-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h3 className="text-base font-medium mb-2">No se encontraron imágenes</h3>
        <p className="text-sm text-muted-foreground">
          No se pudieron extraer imágenes de este PDF o el formato no es compatible.
        </p>
        <div className="mt-4">
          <Alert variant="info" className="bg-blue-50 text-blue-800 border-blue-200">
            <AlertDescription className="text-sm">
              Algunos PDFs utilizan tecnologías de protección o formatos especiales que dificultan la extracción de imágenes directamente.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-medium">
            Imágenes extraídas
          </h3>
          <p className="text-sm text-muted-foreground">
            Se encontraron {filteredImages.length} imágenes en el documento
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}>
            <ToggleGroupItem value="grid" size="sm" aria-label="Vista en cuadrícula">
              <GridIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" size="sm" aria-label="Vista en lista">
              <ListIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          {selectedImages.size > 0 && (
            <div className="flex gap-2">
              <Badge variant="outline">
                {selectedImages.size} seleccionadas
              </Badge>
              <Button 
                onClick={handleAddToMarkdown} 
                size="sm" 
                variant="default"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Añadir al texto
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredImages.map((img, index) => (
            <Card 
              key={img.id} 
              className={`overflow-hidden flex flex-col border transition-all ${
                selectedImages.has(img.id) ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div 
                className="relative h-24 sm:h-32 cursor-pointer bg-gray-100 flex items-center justify-center"
                onClick={() => toggleImageSelection(img.id)}
              >
                <img 
                  src={img.dataUrl} 
                  alt={`Imagen ${index + 1}`} 
                  className="max-h-full max-w-full object-contain"
                />
                {selectedImages.has(img.id) && (
                  <div className="absolute top-1 right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    ✓
                  </div>
                )}
              </div>
              <div className="p-2 text-xs space-y-1">
                <p className="font-medium truncate">
                  {img.page > 0 ? `Página ${img.page}` : 'Imagen extraída'}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {img.width && img.height ? `${img.width}x${img.height}px` : ''}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => downloadImage(img.dataUrl, index)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredImages.map((img, index) => (
            <div 
              key={img.id}
              className={`flex items-center border rounded-md p-2 gap-3 transition-all ${
                selectedImages.has(img.id) ? 'bg-primary/5 ring-1 ring-primary' : ''
              }`}
              onClick={() => toggleImageSelection(img.id)}
            >
              <div className="h-14 w-14 flex-shrink-0 bg-gray-100 flex items-center justify-center rounded">
                <img 
                  src={img.dataUrl} 
                  alt={`Imagen ${index + 1}`} 
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {img.page > 0 ? `Imagen de página ${img.page}` : 'Imagen extraída'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {img.width && img.height ? `${img.width}x${img.height}px` : ''}
                  {img.size ? ` • ${Math.round(img.size / 1024)}KB` : ''}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {selectedImages.has(img.id) && (
                  <div className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    ✓
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(img.dataUrl, index);
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
