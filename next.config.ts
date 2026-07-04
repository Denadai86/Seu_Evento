// next.config.ts
import type { NextConfig } from "next";

const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  experimental: {
    serverActions: {
      // Permite Server Actions vindas de qualquer subdomínio do rootDomain.
      // Necessário porque o middleware reescreve sjose.acaoleve.dev.br/live
      // para acaoleve.dev.br/sjose/live internamente, causando mismatch de Origin.
      allowedOrigins: [
        rootDomain,
        `*.${rootDomain}`,
        "localhost:3000",
      ],
    },
  },
};

export default nextConfig;