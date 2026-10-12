// src/app/robots.ts
import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Áreas privadas dos organizadores e páginas de cartela nunca devem ir para o Google.
        disallow: ["/api/", "/admin", "/dashboard", "/live", "/projector", "/vendas", "/verify", "/cartela/", "/print", "/imprimir", "/entrar"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
