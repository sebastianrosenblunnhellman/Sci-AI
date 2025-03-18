// ...existing code...

// Update the image upload handler
const imageHandler = async () => {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/*');
  
  input.click();
  
  input.onchange = async () => {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Create FormData
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        // Show loading indicator if needed
        setLoading(true);
        
        // Upload to your API endpoint
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar la imagen');
        }
        
        const data = await response.json();
        
        // Insert the image with the proper path returned from the server
        const range = editorRef.current.getEditor().getSelection(true);
        editorRef.current.getEditor().insertEmbed(range.index, 'image', data.url);
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error al cargar la imagen. Por favor intente de nuevo.');
      } finally {
        setLoading(false);
      }
    }
  };
};

// ...existing code...

// Make sure the modules include the imageHandler
const modules = {
  toolbar: {
    container: [
      // ...existing code...
      ['image'],
      // ...existing code...
    ],
    handlers: {
      image: imageHandler
    }
  }
};

// ...existing code...
