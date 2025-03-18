"use client";

import { useState, useEffect } from 'react';
import { getImage } from '@/lib/imageStorage';
import { useParams } from 'next/navigation';

export default function ImagePage() {
  const params = useParams();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const filename = params?.filename as string;

  useEffect(() => {
    async function loadImage() {
      try {
        if (!filename) return;
        
        // Get blob URL directly
        const url = await getImage(filename);
        if (url) {
          setImageUrl(url);
        }
      } catch (error) {
        console.error("Error loading image:", error);
      } finally {
        setLoading(false);
      }
    }

    loadImage();
  }, [filename]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando imagen...</p>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No se pudo cargar la imagen</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-4xl w-full bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">{filename}</h1>
        </div>
        <div className="p-4 flex justify-center">
          <img src={imageUrl} alt={filename} className="max-w-full h-auto" />
        </div>
      </div>
    </div>
  );
}
