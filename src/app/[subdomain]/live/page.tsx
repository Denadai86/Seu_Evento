// src/app/[subdomain]/live/page.tsx

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import BingoGame from "./BingoGame";

interface LivePageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ event?: string }>;
}

export default async function LivePage({
  params,
  searchParams,
}: LivePageProps) {
  const { subdomain } = await params;
  const resolvedSearchParams = await searchParams;
  let eventIdToLoad = resolvedSearchParams.event;

  // 1. Auth: Verificação segura e moderna com NextAuth
  const session = await auth();
  if (!session) {
    redirect("/entrar");
  }

  // 🔥 2. A SOLUÇÃO DO LOOP: Se não tem ID na URL, usa o evento ativo DIRETAMENTE, sem redirecionar.
  if (!eventIdToLoad) {
    const activeEvent = await prisma.event.findFirst({
      where: {
        tenant: { subdomain },
        status: "ACTIVE", 
      },
      orderBy: { createdAt: "desc" }
    });

    if (activeEvent) {
      eventIdToLoad = activeEvent.id; // Assume o ID internamente no servidor
    } else {
      // Nenhum evento ativo encontrado
      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-center p-6">
          <h1 className="text-4xl font-black text-[#d4af37] mb-4">Nenhum evento ativo</h1>
          <p className="text-gray-400 text-lg">
            Aguarde o organizador iniciar o sorteio no painel de controle.
          </p>
        </div>
      );
    }
  }

  // 3. Busca o evento específico (seja o da URL ou o ativo que acabamos de assumir)
  const event = await prisma.event.findUnique({
    where: { id: eventIdToLoad },
    include: {
      sponsors: true,
      tenant: true,
    },
  });

  // 4. Validação de isolamento (Multi-tenant)
  if (!event || !event.tenant || event.tenant.subdomain !== subdomain) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-red-500 text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-gray-400">Este evento não pertence à sua organização.</p>
      </div>
    );
  }

  // 5. Renderiza o jogo perfeitamente
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden">
      <BingoGame
        eventId={event.id}
        eventName={event.name}
        initialDrawn={event.drawnNumbers}
        sponsors={event.sponsors}
      />
    </div>
  );
}