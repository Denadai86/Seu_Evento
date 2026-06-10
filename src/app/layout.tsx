// src/app/layout.tsx
import "./globals.css";
import { Toaster } from "sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Importação clássica do Google Fonts direto pelo navegador */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" 
          rel="stylesheet" 
        />
      </head>
      {/* Usamos font-sans para herdar a fonte configurada no Tailwind */}
      <body className="font-sans antialiased text-slate-200 bg-black min-h-screen">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}