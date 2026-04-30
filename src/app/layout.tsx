import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Otimização de fonte nativa do Next.js (Não dá "pulo" na tela ao carregar)
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Metadados Sênior para SEO e compartilhamento no WhatsApp/Redes Sociais
export const metadata: Metadata = {
  title: {
    template: "%s | Ação Leve Hub",
    default: "Ação Leve Hub - Gestão de Eventos e Bingos",
  },
  description: "O motor central de micro-SaaS para a gestão de bingos, eventos e experiências.",
  icons: {
    icon: "/favicon.ico", // Adicione um favicon depois na pasta /public
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} antialiased`}>
      {/* 
        A classe antialiased deixa as fontes mais suaves no Mac e Windows.
        O bg-slate-950 aqui garante que o fundo não pisque branco ao carregar páginas escuras.
      */}
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}