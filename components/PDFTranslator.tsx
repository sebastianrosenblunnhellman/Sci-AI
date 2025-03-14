"use client";

import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Loader2,
  Download,
  AlertCircle,
  Copy,
  CheckCircle2,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  Info,
  FileText
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
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
      // Mostrar notificación de éxito
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white py-2 px-4 rounded-md shadow-lg animate-fade-in-out z-50';
      notification.textContent = '¡Texto copiado al portapapeles!';
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      setError('No se pudo copiar al portapapeles. Intente manualmente.');
    }
  };

  // Detectar si es dispositivo móvil
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Renderizar indicador de pasos responsivo
  const renderStepIndicator = () => (
    <div className="w-full mb-6">
      {/* Versión para pantallas medianas y grandes */}
      <div className="hidden md:flex justify-between mb-2">
        {STEPS.map((step, index) => (
          <div 
            key={step.id} 
            className={cn(
              "flex flex-col items-center text-center flex-1 relative",
              index <= currentStep ? "text-primary" : "text-muted-foreground"
            )}
          >
            {/* Línea conectora */}
            {index > 0 && (
              <div className={cn(
                "absolute left-0 right-0 top-5 h-0.5 -translate-y-1/2 -z-10",
                index <= currentStep ? "bg-primary" : "bg-border"
              )}></div>
            )}
            
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all mb-2 bg-background",
              {
                'border-primary bg-primary text-primary-foreground': stepStatus[step.id] === 'complete',
                'border-primary text-primary': currentStep === index && stepStatus[step.id] !== 'complete',
                'border-muted-foreground/30': currentStep < index,
                'animate-pulse': stepStatus[step.id] === 'processing'
              }
            )}>
              {stepStatus[step.id] === 'complete' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : stepStatus[step.id] === 'error' ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <span className="font-medium">{index + 1}</span>
              )}
            </div>
            <p className="font-medium text-sm">{step.title}</p>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
      
      {/* Versión móvil simplificada */}
      <div className="md:hidden mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">
            Paso {currentStep + 1} de {STEPS.length}
          </span>
          <Badge variant="outline" className="text-xs">
            {STEPS[currentStep].title}
          </Badge>
        </div>
        <Progress 
          value={((currentStep) / (STEPS.length - 1)) * 100} 
          className="h-2" 
        />
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Upload
        return (
          <Card className="p-4 md:p-6 transition-all">
            {!file ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 md:p-12 text-center cursor-pointer transition-all
                  ${isDragActive ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-muted-foreground/25 hover:border-primary/50'}`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-4 md:mb-6" />
                <h3 className="text-xl md:text-2xl font-semibold mb-2 md:mb-3">
                  {isDragActive ? 'Suelte el PDF aquí' : 'Arrastre y suelte un archivo PDF aquí'}
                </h3>
                <p className="text-base md:text-lg text-muted-foreground">
                  o haga clic para seleccionar un archivo
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-4">
                  Tamaño máximo: 100MB
                </p>
              </div>
            ) : (
              <>
                {isExtracting ? (
                  <div className="space-y-4 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                        <span className="text-base md:text-lg font-medium">Extrayendo texto...</span>
                      </div>
                      <Badge variant="outline" className="animate-pulse">
                        {totalPages > 0 ? `Página ${currentPage} de ${totalPages}` : 'Analizando...'}
                      </Badge>
                    </div>
                    <Progress value={extractionProgress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Iniciando</span>
                      <span>{Math.round(extractionProgress)}%</span>
                      <span>Completando</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-50 p-2 rounded-md">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 line-clamp-1">{file.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {numPages} páginas
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setFile(null)}
                        className="w-full sm:w-auto"
                      >
                        Cambiar archivo
                      </Button>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 md:p-4 flex items-center gap-3">
                      <div className="bg-green-100 p-1.5 rounded-full">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-green-800">
                          Extracción completa
                        </h4>
                        <p className="text-xs text-green-700">
                          Se han extraído {numPages} páginas y {extractedText.length.toLocaleString()} caracteres.
                        </p>
                      </div>
                    </div>
                    
                    {extractedText && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-medium">Vista previa del texto extraído</h4>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Este es el texto que será traducido
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowFullPreview(!showFullPreview)}
                            className="text-xs h-8"
                          >
                            {showFullPreview ? 'Mostrar menos' : 'Ver completo'}
                          </Button>
                        </div>
                        <div
                          className={cn(
                            "border rounded-md p-3 overflow-auto text-sm mt-1 bg-muted/40 font-mono transition-all",
                            showFullPreview ? "max-h-[500px]" : "max-h-40"
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
                        size={isMobile ? "default" : "lg"}
                      >
                        Continuar a Traducción
                        <ChevronRight className="ml-1.5 h-4 w-4" />
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
          <Card className="p-4 md:p-6 transition-all">
            <div className="space-y-6">
              {isProcessing ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="text-xl font-semibold">Traduciendo documento</h3>
                    <Badge variant="outline" className="text-sm animate-pulse sm:self-start">
                      En progreso...
                    </Badge>
                  </div>
                  
                  <div className="bg-blue-50/60 p-5 rounded-lg border border-blue-100 shadow-sm">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-white p-2 rounded-full shadow-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                      <div>
                        <span className="text-lg font-medium text-blue-900">Procesando con Google Gemini AI</span>
                        <p className="text-sm text-blue-700 mt-0.5">
                          {progress < 10 ? 'Inicializando traducción...' : 
                           progress === 100 ? '¡Traducción completada!' : 
                           `Traduciendo (${Math.round(progress)}% completado)`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <Progress value={progress} className="h-2.5 rounded-full" />
                      <div className="flex justify-between text-xs text-blue-600 mt-2 font-medium">
                        <span>Iniciando</span>
                        <span>{Math.round(progress)}%</span>
                        <span>Finalizando</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-muted/20 rounded-lg p-3 border">
                      <div className="text-xs uppercase text-muted-foreground font-medium mb-1">Documento</div>
                      <div className="text-sm font-medium line-clamp-1">{file?.name || "Documento"}</div>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3 border">
                      <div className="text-xs uppercase text-muted-foreground font-medium mb-1">Páginas</div>
                      <div className="text-sm font-medium">{numPages}</div>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3 border">
                      <div className="text-xs uppercase text-muted-foreground font-medium mb-1">Caracteres</div>
                      <div className="text-sm font-medium">{extractedText.length.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                    <Info className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Por favor, no cierre ni recargue esta página durante el proceso de traducción.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Configuración de traducción</h3>
                    <p className="text-sm text-muted-foreground">
                      Para traducir este documento, proporcione su API Key de Google Gemini.{' '}
                      <a 
                        href="https://ai.google.dev/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary underline hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                      >
                        Obtener una clave gratuita
                        <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-[1px] group-hover:translate-y-[-1px]">
                          <path d="M3.64645 11.3536C3.45118 11.1583 3.45118 10.8417 3.64645 10.6465L10.2929 4L6 4C5.72386 4 5.5 3.77614 5.5 3.5C5.5 3.22386 5.72386 3 6 3L11.5 3C11.6326 3 11.7598 3.05268 11.8536 3.14645C11.9473 3.24022 12 3.36739 12 3.5L12 9.00001C12 9.27615 11.7761 9.50001 11.5 9.50001C11.2239 9.50001 11 9.27615 11 9.00001V4.70711L4.35355 11.3536C4.15829 11.5488 3.84171 11.5488 3.64645 11.3536Z" fill="currentColor"></path>
                        </svg>
                      </a>
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label htmlFor="api-key" className="text-sm font-medium flex items-center gap-2">
                        API Key de Google Gemini
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-xs">
                              La clave API nunca se almacena en nuestros servidores y solo se usa para esta traducción
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1 group">
                          <div className={cn(
                            "absolute inset-0 rounded-md -z-10 transition-all",
                            isApiKeyValid ? "bg-green-100/10" : "bg-transparent"
                          )}></div>
                          <input
                            id="api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => {
                              setApiKey(e.target.value);
                              setIsApiKeyValid(false);
                            }}
                            placeholder="Pegue su clave API aquí"
                            className={cn(
                              "w-full px-3 py-2 border rounded-md text-sm transition-all duration-200",
                              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                              "placeholder:text-muted-foreground/70",
                              isApiKeyValid ? "border-green-500/40 shadow-sm shadow-green-500/10" : "border-input"
                            )}
                            aria-invalid={isApiKeyValid === false && apiKey.length > 0}
                          />
                          {isApiKeyValid && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 pointer-events-none">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <Button 
                          onClick={() => verifyApiKey(apiKey)}
                          disabled={isCheckingApiKey || !apiKey.trim()}
                          className={cn(
                            "whitespace-nowrap min-w-[140px] transition-all duration-200",
                            isCheckingApiKey ? "bg-primary/80" : ""
                          )}
                        >
                          {isCheckingApiKey ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Verificando...
                            </>
                          ) : "Verificar API Key"}
                        </Button>
                      </div>
                      {isApiKeyValid && (
                        <p className="text-xs text-green-600 flex items-center gap-1.5 animate-fadeIn">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          API Key verificada correctamente
                        </p>
                      )}
                      {!isApiKeyValid && apiKey.length > 0 && (
                        <p className="text-xs text-amber-600 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5" />
                          La API Key debe ser verificada antes de continuar
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50/80 to-blue-50/40 border border-blue-200 rounded-lg p-4 shadow-sm transition-all hover:shadow-md duration-300">
                      <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                        <div className="bg-blue-100 p-1 rounded">
                          <Info className="h-4 w-4 text-blue-600" />
                        </div>
                        Información del documento
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white/60 rounded-md p-2.5 border border-blue-100/80 transition-colors hover:bg-white/80 duration-200">
                          <div className="text-xs text-blue-500 mb-1">Nombre del archivo</div>
                          <div className="font-medium text-sm text-blue-900 truncate" title={file?.name || "N/A"}>
                            {file?.name || "N/A"}
                          </div>
                        </div>
                        <div className="bg-white/60 rounded-md p-2.5 border border-blue-100/80 transition-colors hover:bg-white/80 duration-200">
                          <div className="text-xs text-blue-500 mb-1">Tamaño del archivo</div>
                          <div className="font-medium text-sm text-blue-900">
                            {file ? (file.size / 1024 / 1024).toFixed(2) + " MB" : "N/A"}
                          </div>
                        </div>
                        <div className="bg-white/60 rounded-md p-2.5 border border-blue-100/80 transition-colors hover:bg-white/80 duration-200">
                          <div className="text-xs text-blue-500 mb-1">Páginas</div>
                          <div className="font-medium text-sm text-blue-900">
                            {numPages} {numPages === 1 ? "página" : "páginas"}
                          </div>
                        </div>
                        <div className="bg-white/60 rounded-md p-2.5 border border-blue-100/80 transition-colors hover:bg-white/80 duration-200">
                          <div className="text-xs text-blue-500 mb-1">Caracteres</div>
                          <div className="font-medium text-sm text-blue-900">
                            {extractedText.length.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(0)}
                      className="flex items-center transition-transform hover:-translate-x-0.5 duration-200"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Volver
                    </Button>
                    <Button 
                      onClick={handleNextStep}
                      disabled={!isApiKeyValid}
                      className={cn(
                        "transition-all duration-200",
                        !isApiKeyValid ? "opacity-50 cursor-not-allowed" : "hover:translate-x-0.5"
                      )}
                    >
                      {isApiKeyValid ? (
                        <>
                          Iniciar traducción
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </>
                      ) : "Verifique la API Key primero"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        );

      case 2: // Edit
        return (
          <Card className="p-4 md:p-6 transition-all">
            <div className="space-y-6">
              <Tabs defaultValue="editor" className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">Documento traducido</h3>
                    <p className="text-sm text-muted-foreground">
                      Revise y realice ajustes al texto traducido
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <TabsList className="grid grid-cols-2 h-8">
                      <TabsTrigger value="editor" className="text-xs">Editor</TabsTrigger>
                      <TabsTrigger value="preview" className="text-xs">Vista previa</TabsTrigger>
                    </TabsList>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => copyToClipboard(translatedText)}
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden sm:inline">Copiar</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Copiar texto traducido
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm" 
                            className="h-8"
                            onClick={handleDownload}
                            disabled={isGeneratingPdfPreview}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden sm:inline">Descargar</span> PDF
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Descargar documento PDF traducido
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                <TabsContent value="editor" className="mt-0 border-0 p-0">
                  <div className="border rounded-lg focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                    <textarea
                      value={translatedText}
                      onChange={(e) => {
                        setTranslatedText(e.target.value);
                      }}
                      className="w-full h-[400px] md:h-[500px] font-mono text-sm p-4 focus:outline-none resize-none rounded-lg"
                      spellCheck={false}
                      placeholder="El texto traducido aparecerá aquí..."
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="preview" className="mt-0 border-0 p-0">
                  <div className="border rounded-lg p-5 min-h-[400px] md:min-h-[500px] bg-white overflow-auto prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {translatedText || "*No hay contenido para mostrar. El texto traducido aparecerá aquí.*"}
                    </ReactMarkdown>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-start pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(1)}
                  size="sm"
                >
                  <ChevronLeft className="mr-1.5 h-4 w-4" />
                  Volver a configuración
                </Button>
              </div>
            </div>
          </Card>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {renderStepIndicator()}
      
      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-4 animate-fadeIn">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <div className="transition-all duration-300">
        {renderStepContent()}
      </div>
    </div>
  );
}
