// src/app/robots.ts
import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { siteConfig } from "@/config/site";
import { robotsPolicy } from "@/lib/seo";

// O robots.txt depende do ENDEREÇO: o site principal pode ser indexado (menos as áreas privadas);
// o subdomínio de cada cliente nunca.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "";
  const rootHost = siteConfig.rootDomain;
  const policy = robotsPolicy(host, rootHost);

  return {
    rules: [
      policy.allowAll
        ? { userAgent: "*", allow: "/", disallow: policy.disallow }
        : { userAgent: "*", disallow: policy.disallow },
    ],
    // O mapa do site só existe para o endereço principal.
    ...(policy.allowAll ? { sitemap: `${siteConfig.url}/sitemap.xml` } : {}),
  };
}
