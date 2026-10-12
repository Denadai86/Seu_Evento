// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/termos", "/privacidade"].map((path) => ({
    url: `${siteConfig.url}${path}`,
  }));
}
