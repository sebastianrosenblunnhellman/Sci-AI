import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';

// Define the directory for storing images
const imageDir = path.join(process.cwd(), 'public', 'api', 'imagenes');

export async function POST(request) {
  try {
    // Ensure the target directory exists
    await mkdir(imageDir, { recursive: true });
    
    const formData = await request.formData();
    const file = formData.get('image');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se ha proporcionado ninguna imagen' },
        { status: 400 }
      );
    }

    // Check if it's actually an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }
    
    // Create a unique filename
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    const filepath = path.join(imageDir, filename);
    
    // Write the file to disk
    await writeFile(filepath, buffer);
    
    // Return the path that should be used in markdown
    return NextResponse.json({
      url: `/api/imagenes/${filename}`
    });
    
  } catch (error) {
    console.error('Error al subir la imagen:', error);
    return NextResponse.json(
      { error: 'Error al procesar la imagen' },
      { status: 500 }
    );
  }
}
