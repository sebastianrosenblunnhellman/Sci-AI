import React, { useState } from 'react';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

interface PDFViewerProps {
  pdfData: Uint8Array | null;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function PDFViewer({ pdfData, isGenerating, onGenerate }: PDFViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Crear un URL para los datos del PDF si existen
  const pdfUrl = pdfData ? URL.createObjectURL(new Blob([pdfData], { type: 'application/pdf' })) : null;
  
  // Limpiar URL cuando el componente se desmonte
  React.useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Vista previa del PDF</h3>
        <div className="space-x-2">
          {!pdfData && (
            <Button 
              onClick={onGenerate} 
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : "Generar Vista Previa"}
            </Button>
          )}
          
          {pdfData && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Reducir' : 'Expandir'}
            </Button>
          )}
        </div>
      </div>
      
      {isGenerating && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Generando vista previa del PDF...</span>
        </div>
      )}
      
      {pdfUrl && (
        <div 
          className={`border rounded overflow-hidden transition-all duration-300 ${
            isExpanded ? 'h-[600px]' : 'h-[300px]'
          }`}
        >
          <iframe 
            src={`${pdfUrl}#toolbar=0`}
            className="w-full h-full"
            title="Vista previa del PDF"
          />
        </div>
      )}
    </div>
  );
}
