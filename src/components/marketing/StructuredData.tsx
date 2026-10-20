// src/components/marketing/StructuredData.tsx
import { siteConfig } from "@/config/site";
import { buildStructuredData, toJsonLd } from "@/lib/seo";

export default function StructuredData() {
  const data = buildStructuredData({
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.seo.description,
    developer: siteConfig.developer,
  });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(data) }} />;
}
