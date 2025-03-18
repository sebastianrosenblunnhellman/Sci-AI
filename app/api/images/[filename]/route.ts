import { NextRequest, NextResponse } from 'next/server';
import { getImage } from '@/lib/imageStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    const imageUrl = await getImage(filename);
    
    if (!imageUrl) {
      return new NextResponse('Image not found', { status: 404 });
    }
    
    // Since we're now using blob URLs directly, we need to redirect to them
    // Note: This won't work in production as blob URLs are only valid in the browser context that created them
    // This is provided only for completeness of the API route
    return NextResponse.redirect(imageUrl);
    
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
