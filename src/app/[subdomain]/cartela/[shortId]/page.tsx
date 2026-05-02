// src/app/[subdomain]/cartela/[shortId]/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import InteractiveCard from "./InteractiveCard";

export default async function DigitalCardPage({
  params
}: {
  params: { subdomain: string; shortId: string }
}) {
  // 1. Busca a cartela validando o subdomínio e a organização
  const cardData = await prisma.card.findFirst({
    where: {
      shortId: params.shortId,
      event: {
        tenant: {
          subdomain: params.subdomain
        }
      }
    },
    include: {
      event: {
        include: { sponsors: true }
      }
    }
  });

  if (!cardData) {
    notFound(); // Redireciona para a página 404 customizada do Next.js se a cartela não existir
  }

  // O parse da matrix (assumindo que você salva como JSON no banco)
  const matrix = typeof cardData.matrix === 'string' 
    ? JSON.parse(cardData.matrix) 
    : cardData.matrix;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-wide">
            {cardData.event.name}
          </h1>
          <p className="text-sm text-slate-500 font-mono">Cartela: {cardData.shortId}</p>
        </header>

        {/* 2. Injeta os dados no componente Client-Side que lidará com os cliques */}
        <InteractiveCard 
          shortId={cardData.shortId} 
          matrix={matrix} 
          sponsors={cardData.event.sponsors} 
        />
      </div>
    </div>
  );
}