'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'

export default function DocumentForm() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Example insert operation
      const { data, error } = await supabase
        .from('Documento')
        .insert([
          { title, content }
        ])
        .select()
        
      if (error) throw error
      
      // Success - reset form
      setTitle('')
      setContent('')
      alert('Document created successfully!')
    } catch (error) {
      console.error('Error creating document:', error)
      alert('Error creating document')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        required
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Document'}
      </button>
    </form>
  )
}
