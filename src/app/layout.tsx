// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

// Só ícones e manifest (caminhos fixos em /public). Nada de URL montada por variável de ambiente aqui.
// Vale para todo o app: landing e também os subdomínios dos clientes (telão, PDV, painel).
export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/site.webmanifest",
};

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