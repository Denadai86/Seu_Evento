// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Inter servida pelo próprio site (next/font): sem requisição ao Google Fonts no navegador
// e sem "pulo" de layout quando a fonte chega. A variável alimenta o font-sans do Tailwind.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-inter",
});

// Vale para o app inteiro: landing e subdomínios dos clientes (telão, PDV, painel).
// Só caminhos fixos de /public: nada de URL montada por variável de ambiente aqui.
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

// Cor da barra do navegador no celular (mesma do site.webmanifest).
export const viewport: Viewport = {
  themeColor: "#091510",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-black font-sans text-slate-200 antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}