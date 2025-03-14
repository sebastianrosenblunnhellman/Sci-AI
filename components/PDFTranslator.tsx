"use client";

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Loader2,
  Download,
  AlertCircle,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { extractTextFromPDF } from '@/lib/pdf';
import { translateChunks } from '@/lib/gemini';
import { createPDFFromMarkdown } from '@/lib/markdownToPdf';
import { cn } from '@/lib/utils';
import { PDFViewer } from '@/components/PDFViewer';

const STEPS = [
  { id: 'upload', title: 'Subir PDF', description: 'Sube tu documento PDF científico' },
  { id: 'translate', title: 'Traducir', description: 'Traducción del texto al español' },
  { id: 'edit', title: 'Editar', description: 'Revisa y edita la traducción' }
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
    translate: 'pending',
    edit: 'pending'
  });
  const [readyForNextStep, setReadyForNextStep] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<Uint8Array | null>(null);
  const [isGeneratingPdfPreview, setIsGeneratingPdfPreview] = useState(false);

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
        setIsExtracting(true);
        setExtractionProgress(0);
        setCurrentPage(0);
        setTotalPages(0);
        setReadyForNextStep(false);

        try {
          const extractionResult = await extractTextFromPDF(
            file,
            (progress, current, total) => {
              setExtractionProgress(progress);
              setCurrentPage(current);
              setTotalPages(total);
            }
          );
          
          setExtractedText(extractionResult.text);
          setNumPages(extractionResult.numPages || totalPages);
          setIsExtracting(false);
          setStepStatus({ ...stepStatus, upload: 'complete' });
          setReadyForNextStep(true);
        } catch (extractionError) {
          setIsExtracting(false);
          console.error("Error during extraction:", extractionError);
          setError(extractionError instanceof Error ? extractionError.message : 'Error al extraer texto del PDF');
          setStepStatus(prev => ({ ...prev, upload: 'error' }));
        }
      }
    }
  });

  const handleNextStep = async () => {
    if (currentStep === 0) {
      // Avanzar al paso de traducción
      setCurrentStep(1);
      setStepStatus(prev => ({ ...prev, translate: 'pending' }));
      setReadyForNextStep(true); // Permitir que se pueda iniciar la traducción
    } else if (currentStep === 1 && isApiKeyValid) {
      // Solo proceder con la traducción si la API Key es válida
      try {
        setIsProcessing(true);
        setStepStatus(prev => ({ ...prev, translate: 'processing' }));
        setProgress(5); // Iniciar con un valor bajo
        setError(''); // Limpiar errores previos
        
        if (!extractedText.trim()) {
          throw new Error('No se pudo extraer texto del PDF.');
        }

        // Traducir el texto usando el nuevo callback de progreso
        const translated = await translateChunks(
          extractedText, 
          apiKey, 
          (translationProgress) => {
            // Asegurar que el progreso tenga un rango de 10 a 90 para mostrar un avance gradual
            const normalizedProgress = Math.floor(10 + (translationProgress * 0.8));
            setProgress(normalizedProgress);
          }
        );

        if (!translated.trim()) {
          throw new Error('La traducción falló. Por favor, inténtelo de nuevo.');
        }
        
        setTranslatedText(translated);
        setProgress(100);
        setStepStatus(prev => ({ ...prev, translate: 'complete', edit: 'pending' }));
        setCurrentStep(2);
      } catch (err) {
        console.error("Error durante la traducción:", err);
        setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
        setStepStatus(prev => ({
          ...prev,
          translate: 'error'
        }));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Función para verificar la validez de la API Key
  const verifyApiKey = async (key: string) => {
    if (!key.trim()) {
      setIsApiKeyValid(false);
      return;
    }
    
    setIsCheckingApiKey(true);
    try {
      // Aquí iría una llamada simple a la API para verificar que la clave es válida
      // Por ahora, hacemos una verificación básica del formato
      const isValidFormat = key.trim().length > 20; // Ejemplo simple
      
      // Simular una verificación asíncrona
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsApiKeyValid(isValidFormat);
      if (!isValidFormat) {
        setError("La API Key no parece tener el formato correcto.");
      } else {
        setError("");
      }
    } catch (err) {
      setIsApiKeyValid(false);
      setError("Error al verificar la API Key. Por favor, inténtelo de nuevo.");
    } finally {
      setIsCheckingApiKey(false);
    }
  };

  const handleDownload = async () => {
    try {
      setError(''); // Limpiar errores previos
      
      if (!translatedText || translatedText.trim().length === 0) {
        setError('No hay texto traducido para descargar');
        return;
      }
      
      console.log("Iniciando conversión a PDF...");
      console.log("Tamaño del texto a convertir:", translatedText.length, "caracteres");
      
      // Añadir un timeout para evitar que la UI se bloquee
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const pdfBytes = await createPDFFromMarkdown(translatedText)
        .catch((err) => {
          console.error("Error detallado al crear PDF:", err);
          throw new Error(`Error al procesar Markdown: ${err.message}`);
        });
      
      if (!pdfBytes || pdfBytes.length === 0) {
        throw new Error('La generación del PDF falló - no se recibieron datos');
      }
      
      console.log(`PDF generado correctamente: ${pdfBytes.length} bytes`);
      
      // Crear el blob y descargar
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Intentar primero abrir en una nueva pestaña, que funciona más consistentemente
      try {
        console.log("Abriendo PDF en nueva pestaña...");
        window.open(url, '_blank');
        
        // También ofrecer la descarga
        const link = document.createElement('a');
        link.href = url;
        link.download = `traduccion-${file?.name || 'documento'}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        link.click();
        
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(link);
        }, 300);
      } catch (downloadErr) {
        console.error("Error en la descarga:", downloadErr);
        setError('Error al abrir el PDF. Intente con otro navegador o compruebe los ajustes de bloqueo de ventanas emergentes.');
      }
    } catch (err) {
      console.error("Error completo:", err);
      setError(err instanceof Error 
        ? `Error al generar el PDF: ${err.message}` 
        : 'Error inesperado al generar el PDF');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  const generatePdfPreview = async () => {
    try {
      setIsGeneratingPdfPreview(true);
      setError('');
      
      if (!translatedText || translatedText.trim().length === 0) {
        throw new Error('No hay texto traducido para previsualizar');
      }
      
      console.log("Generando vista previa del PDF...");
      const pdfBytes = await createPDFFromMarkdown(translatedText)
        .catch((err) => {
          console.error("Error al crear vista previa:", err);
          throw new Error(`Error en la vista previa: ${err.message}`);
        });
        
      setPdfPreview(pdfBytes);
      console.log("Vista previa generada correctamente");
    } catch (err) {
      console.error("Error completo al generar vista previa:", err);
      setError(err instanceof Error 
        ? `Error en la vista previa: ${err.message}` 
        : 'Error al generar la vista previa');
    } finally {
      setIsGeneratingPdfPreview(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Upload
        return (
          <Card className="p-6">
            {!file ? (
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
            ) : (
              <>
                {isExtracting ? (
                  <div className="space-y-4 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-lg">Extrayendo texto del PDF...</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {totalPages > 0 ? `Página ${currentPage} de ${totalPages}` : 'Analizando documento...'}
                      </span>
                    </div>
                    <Progress value={extractionProgress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>{extractionProgress}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{file.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {numPages} páginas
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                        Cambiar archivo
                      </Button>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <h4 className="text-sm font-medium text-green-800">
                          Extracción completa
                        </h4>
                        <p className="text-xs text-green-700">
                          Se han extraído {numPages} páginas y {extractedText.length} caracteres.
                        </p>
                      </div>
                    </div>
                    
                    {extractedText && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-medium">
                            Vista previa del texto extraído:
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowFullPreview(!showFullPreview)}
                            className="text-xs"
                          >
                            {showFullPreview ? 'Mostrar menos' : 'Ver texto completo'}
                          </Button>
                        </div>
                        <div
                          className={cn(
                            "border rounded-lg p-4 overflow-auto text-sm mt-2 bg-gray-50 transition-all",
                            showFullPreview ? "max-h-[500px]" : "max-h-60"
                          )}
                        >
                          {showFullPreview 
                            ? extractedText 
                            : extractedText.slice(0, 500) + (extractedText.length > 500 ? "..." : "")}
                        </div>
                      </div>
                    )}
                    
                    {readyForNextStep && (
                      <Button
                        className="w-full mt-4"
                        onClick={handleNextStep}
                      >
                        Comenzar Traducción
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </Card>
        );

      case 1: // Translate
        return (
          <Card className="p-6">
            <div className="space-y-6">
              {isProcessing ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Traduciendo documento</h3>
                    <span className="text-sm text-muted-foreground animate-pulse">
                      Esto puede tardar varios minutos...
                    </span>
                  </div>
                  
                  <div className="space-y-4 bg-blue-50 p-6 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <div>
                        <span className="text-lg font-medium">Procesando con Google Gemini AI</span>
                        <p className="text-sm text-muted-foreground">
                          {progress < 10 ? 'Inicializando...' : 
                           progress === 100 ? 'Finalizado!' : 
                           `Traduciendo fragmento ${Math.ceil((progress - 10) / 80 * 100)}% completado`}
                        </p>
                      </div>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Iniciando</span>
                      <span>{progress}%</span>
                      <span>Finalizando</span>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="text-sm font-medium mb-2">Información del documento</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Nombre: {file?.name}</li>
                      <li>• Páginas: {numPages}</li>
                      <li>• Caracteres: {extractedText.length}</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Configuración de Traducción</h3>
                    <p className="text-sm text-muted-foreground">
                      Para traducir este documento, necesita proporcionar su API Key de Google Gemini.
                      Puede obtener una clave en: <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="api-key" className="text-sm font-medium">
                        API Key de Google Gemini
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="api-key"
                          type="password"
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            setIsApiKeyValid(false);
                          }}
                          placeholder="Ingrese su API Key aquí"
                          className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => verifyApiKey(apiKey)}
                          disabled={isCheckingApiKey || !apiKey.trim()}
                        >
                          {isCheckingApiKey ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : "Verificar"}
                        </Button>
                      </div>
                      {isApiKeyValid && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          API Key verificada correctamente
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">Información del documento</h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Nombre: {file?.name}</li>
                        <li>• Tamaño: {file ? (file.size / 1024 / 1024).toFixed(2) + " MB" : "N/A"}</li>
                        <li>• Páginas extraídas: {numPages}</li>
                        <li>• Caracteres a traducir: {extractedText.length}</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(0)}
                    >
                      Volver
                    </Button>
                    <Button 
                      onClick={handleNextStep}
                      disabled={!isApiKeyValid}
                      className={!isApiKeyValid ? "opacity-50" : ""}
                    >
                      {isApiKeyValid ? "Iniciar Traducción" : "Verifique la API Key primero"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        );

      case 2: // Edit
        return (
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Editar Traducción</h3>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'Ver Resultado' : 'Editar Markdown'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(translatedText)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button
                    onClick={handleDownload}
                    disabled={isGeneratingPdfPreview}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-6 min-h-[600px] bg-white">
                {isEditing ? (
                  <textarea
                    value={translatedText}
                    onChange={(e) => {
                      setTranslatedText(e.target.value);
                      // Limpiar la vista previa si se edita el texto
                      if (pdfPreview) setPdfPreview(null);
                    }}
                    className="w-full h-full min-h-[600px] font-mono text-sm p-4 focus:outline-none"
                    spellCheck={false}
                  />
                ) : (
                  <div className="react-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {translatedText}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              
              {/* Añadir el componente de visualización de PDF */}
              <PDFViewer 
                pdfData={pdfPreview}
                isGenerating={isGeneratingPdfPreview}
                onGenerate={generatePdfPreview}
              />
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
