import { supabase } from '@/lib/supabase-client'
import { NextResponse } from 'next/server'

// POST - Create a document
export async function POST(request) {
  try {
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('Documento')
      .insert([body])
      .select()
      
    if (error) throw error
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Update a document
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    const { data, error } = await supabase
      .from('Documento')
      .update(updateData)
      .eq('id', id)
      .select()
      
    if (error) throw error
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete a document
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    const { error } = await supabase
      .from('Documento')
      .delete()
      .eq('id', id)
      
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
