// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Vercel Blob Storage (usado por @vercel/blob para logos de tenants)
      {
        protocol: "https",
        hostname: "**.vercel-storage.com",
      },
      // Cloudinary (usado por next-cloudinary para uploads de imagem)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  // Necessário para que Server Actions funcionem corretamente em subdomínios
  // com domínio wildcard no Vercel. O Next.js precisa saber quais origens
  // são permitidas para Server Actions cross-origin (CSRF protection).
  experimental: {
    serverActions: {
      allowedOrigins: [
        // Domínio raiz
        process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br" || "seu-evento.social.br",
        // Wildcard de subdomínios: *.acaoleve.dev.br
        `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br" || "seu-evento.social.br"}`,
        // Desenvolvimento local
        "localhost:3000",
        "*.localhost:3000",
      ],
    },
  },
};

export default nextConfig;