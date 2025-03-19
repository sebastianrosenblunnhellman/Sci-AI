import { NextResponse } from 'next/server';

// Si estás usando App Router (Next.js 13+)
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Tu lógica para guardar la traducción
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Importante: Exportar los métodos permitidos para evitar error 405
export const config = {
  api: {
    bodyParser: true,
  },
};
