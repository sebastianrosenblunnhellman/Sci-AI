import PDFTranslator from '@/components/PDFTranslator';

export default function Home() {
  return (
    <main className="min-h-screen bg-background py-8">
      <PDFTranslator />
      
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
          <p>© 2024 Psy AI By Psi Colab All rights reserved.</p>
        </div>
      </footer>
    </main>
  );  
}
