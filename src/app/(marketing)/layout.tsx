///src/app/(marketing)/layout.tsx

import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import StructuredData from "@/components/marketing/StructuredData";

const { title, description } = siteConfig.seo;

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
      <StructuredData />
      {children}
    </div>
  );
}
