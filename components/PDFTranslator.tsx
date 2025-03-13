"use client";

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import dynamic from 'next/dynamic';
import { extractTextFromPDF } from '@/lib/pdf';
import { translateChunks } from '@/lib/gemini';
import { createPDFFromText } from '@/lib/pdf';

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <p>Loading editor...</p>
});

export default function PDFTranslator() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<'idle' | 'extracting' | 'translating' | 'complete'>('idle');

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
        setCurrentStep('extracting');
        
        try {
          setIsProcessing(true);
          setProgress(10);
          
          // Extract text from PDF
          setCurrentStep('extracting');
          const text = await extractTextFromPDF(file);
          if (!text.trim()) {
            throw new Error('No text could be extracted from the PDF.');
          }
          setExtractedText(text);
          setProgress(40);
          
          // Translate text
          setCurrentStep('translating');
          const translated = await translateChunks(text);
          if (!translated.trim()) {
            throw new Error('Translation failed. Please try again.');
          }
          setTranslatedText(translated);
          setProgress(100);
          setCurrentStep('complete');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred');
          setCurrentStep('idle');
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
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    }
  };

  const getStepMessage = () => {
    switch (currentStep) {
      case 'extracting':
        return 'Extracting text from PDF...';
      case 'translating':
        return 'Translating text...';
      default:
        return 'Processing document...';
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <Card className="p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive ? 'Drop the PDF here' : 'Drag & drop a PDF file here'}
          </h3>
          <p className="text-muted-foreground">
            or click to select a file
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Maximum file size: 100MB
          </p>
        </div>
      </Card>

      {/* Progress and Status */}
      {isProcessing && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{getStepMessage()}</span>
            </div>
            <Progress value={progress} />
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Original Text */}
      {extractedText && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Original Text
          </h3>
          <div className="max-h-60 overflow-y-auto border rounded-md p-4 bg-muted/50">
            <pre className="whitespace-pre-wrap font-sans">{extractedText}</pre>
          </div>
        </Card>
      )}

      {/* Translated Text Editor */}
      {translatedText && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Translated Text
            </h3>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
          <div className="border rounded-md">
            <ReactQuill
              value={translatedText}
              onChange={setTranslatedText}
              theme="snow"
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline'],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  ['clean']
                ]
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}