import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// Ensure the directory exists
const imageDir = path.join(process.cwd(), 'public', 'api', 'imagenes');
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imageDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});

// Initialize multer upload
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

export async function POST(request) {
  try {
    // Process the file upload (implementation depends on your setup)
    // This is a placeholder for the actual implementation
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se ha proporcionado ningún archivo' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = Date.now() + '-' + file.name.replace(/\s/g, '-');
    const filepath = path.join(imageDir, filename);
    
    fs.writeFileSync(filepath, buffer);
    
    // Return the relative URL path that can be used in markdown
    return NextResponse.json({
      url: `/api/imagenes/${filename}`
    });
    
  } catch (error) {
    console.error('Error al cargar la imagen:', error);
    return NextResponse.json(
      { error: 'Error al cargar la imagen' },
      { status: 500 }
    );
  }
}
