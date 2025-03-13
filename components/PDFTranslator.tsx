"use client";

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  Loader2, 
  Download, 
  AlertCircle, 
  Type, 
  Copy,
  CheckCircle2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import dynamic from 'next/dynamic';
import { extractTextFromPDF } from '@/lib/pdf';
import { translateChunks } from '@/lib/gemini';
import { createPDFFromText } from '@/lib/pdf';
import { cn } from '@/lib/utils';

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <p>Cargando editor...</p>
});

const STEPS = [
  { id: 'upload', title: 'Subir PDF', description: 'Sube tu documento PDF científico' },
  { id: 'extract', title: 'Extraer Texto', description: 'Extracción del texto del documento' },
  { id: 'translate', title: 'Traducir', description: 'Traducción del texto al español' },
  { id: 'edit', title: 'Editar', description: 'Revisa y edita la traducción' }
];

const QUILL_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    ['blockquote', 'code-block'],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ]
};

const QUILL_FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'script',
  'indent',
  'blockquote', 'code-block',
  'color', 'background'
];

export default function PDFTranslator() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatus, setStepStatus] = useState<Record<string, 'pending' | 'processing' | 'complete' | 'error'>>({
    upload: 'pending',
    extract: 'pending',
    translate: 'pending',
    edit: 'pending'
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setFile(file);
        setError('');
        setProgress(0);
        setExtractedText('');
        setTranslatedText('');
        setStepStatus({ ...stepStatus, upload: 'complete' });
        
        try {
          setIsProcessing(true);
          setProgress(10);
          
          // Extract text from PDF
          setStepStatus(prev => ({ ...prev, extract: 'processing' }));
          const text = await extractTextFromPDF(file);
          if (!text.trim()) {
            throw new Error('No se pudo extraer texto del PDF.');
          }
          setExtractedText(text);
          setProgress(40);
          setStepStatus(prev => ({ ...prev, extract: 'complete' }));
          
          // Translate text
          setStepStatus(prev => ({ ...prev, translate: 'processing' }));
          const translated = await translateChunks(text);
          if (!translated.trim()) {
            throw new Error('La traducción falló. Por favor, inténtelo de nuevo.');
          }
          setTranslatedText(translated);
          setProgress(100);
          setStepStatus(prev => ({ ...prev, translate: 'complete', edit: 'pending' }));
          setCurrentStep(3); // Move to edit step
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
          setStepStatus(prev => ({
            ...prev,
            [STEPS[currentStep].id]: 'error'
          }));
        } finally {
          setIsProcessing(false);
        }
      }
    }
  });

  const handleDownload = async () => {
    try {
      const pdfBytes = await createPDFFromText(translatedText);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `translated-${file?.name || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el PDF');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Upload
        return (
          <Card className="p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
                ${isDragActive ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-muted-foreground/25 hover:border-primary/50'}`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
              <h3 className="text-2xl font-semibold mb-3">
                {isDragActive ? 'Suelte el PDF aquí' : 'Arrastre y suelte un archivo PDF aquí'}
              </h3>
              <p className="text-muted-foreground text-lg">
                o haga clic para seleccionar un archivo
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Tamaño máximo: 100MB
              </p>
            </div>
          </Card>
        );

      case 1: // Extract
        return (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-lg">Extrayendo texto del PDF...</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </Card>
        );

      case 2: // Translate
        return (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-lg">Traduciendo texto...</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="bg-muted/50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap font-sans">{extractedText}</pre>
              </div>
            </div>
          </Card>
        );

      case 3: // Edit
        return (
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Editar Traducción</h3>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(translatedText)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-muted-foreground">Texto Original</h4>
                  <div className="border rounded-lg p-4 bg-muted/50 max-h-[600px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans">{extractedText}</pre>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-muted-foreground">Texto Traducido</h4>
                  <div className="border rounded-lg">
                    <ReactQuill
                      value={translatedText}
                      onChange={setTranslatedText}
                      modules={QUILL_MODULES}
                      formats={QUILL_FORMATS}
                      theme="snow"
                      className="min-h-[600px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Progress Steps */}
      <div className="flex justify-between items-center">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  {
                    'border-primary bg-primary text-primary-foreground': stepStatus[step.id] === 'complete',
                    'border-primary bg-primary/20': currentStep === index,
                    'border-muted-foreground/30': currentStep < index,
                    'animate-pulse': stepStatus[step.id] === 'processing'
                  }
                )}
              >
                {stepStatus[step.id] === 'complete' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="font-medium">{index + 1}</span>
                )}
              </div>
              <div className="text-center mt-2">
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div className="flex-1 h-[2px] bg-muted-foreground/30 mx-4" />
            )}
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      {renderStepContent()}
    </div>
  );
}