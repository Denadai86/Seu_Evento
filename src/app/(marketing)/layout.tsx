///src/app/(marketing)/layout.tsx

import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

const title = "Seu Evento | Gestão de Bingos e Sorteios Profissionais";
const description =
  "Plataforma completa para Paróquias, ONGs e Empresas. Crie cartelas, gerencie vendas e tenha um telão interativo incrível.";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: title, template: "%s | Seu Evento" },
  description,
  alternates: { canonical: "/" },
  // Prévia do link quando compartilhado no WhatsApp, Facebook, etc.
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Seu Evento",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#091510]">
      {children}
    </div>
  );
}
