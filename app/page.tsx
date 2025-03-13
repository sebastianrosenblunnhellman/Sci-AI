import PDFTranslator from '@/components/PDFTranslator';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-primary">PDF Scientific Translator</h1>
          <p className="text-muted-foreground mt-2">
            Translate scientific PDF documents from English to Spanish with precision
          </p>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <PDFTranslator />
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
          <p>© 2024 PDF Scientific Translator. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}