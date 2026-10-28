// src/app/(marketing)/layout.tsx
//
// Layout das páginas públicas: landing (/), /termos e /privacidade.
// Os subdomínios dos clientes (telão, PDV, painel) NÃO passam por aqui,
// por isso o botão do WhatsApp e o SEO ficam restritos ao site público.

import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import StructuredData from "@/components/marketing/StructuredData";
import WhatsAppFloat from "@/components/marketing/WhatsAppFloat";

const { title, description } = siteConfig.seo;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: title, template: "%s | Seu Evento" },
  description,
  // Canonical da home. Termos e Privacidade declaram o próprio na página (senão herdariam "/").
  alternates: { canonical: "/" },
  // Prévia do link quando compartilhado no WhatsApp, Facebook etc.
  // A imagem vem sozinha do opengraph-image.tsx desta pasta.
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: siteConfig.name,
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#091510]">
      <StructuredData />
      {children}
      <WhatsAppFloat />
    </div>
  );
}