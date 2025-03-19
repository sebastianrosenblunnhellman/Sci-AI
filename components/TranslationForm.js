// Ejemplo de función para enviar traducción
async function guardarTraduccion(data) {
  try {
    const response = await fetch('/api/guardarTraduccion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Respuesta del servidor: ${response.status} ${errorText}`);
      throw new Error(`Método no permitido (${response.status}): La API no acepta solicitudes POST. Verifique la configuración del servidor.`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al guardar traducción:', error.message);
    throw error;
  }
}
