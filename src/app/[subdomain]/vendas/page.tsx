// src/app/[subdomain]/vendas/page.tsx
import prisma from "@/lib/prisma";
import LogoutButton from "@/components/auth/LogoutButton";
import PDVClient from "./PDVClient";

export default async function VendasPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;

  // 🔥 Busca o evento COM OS VENDEDORES e DADOS FINANCEIROS
  const activeEvent = await prisma.event.findFirst({
    where: { 
      tenant: { subdomain },
      isActive: true 
    },
    select: {
      id: true,
      name: true,
      ticketPrice: true,
      pixKey: true, // Se não tiver essa coluna no Prisma, comente essa linha
      staff: {
      where: { canSell: true },
      include: { user: { select: { id: true, name: true } } }
    }
    }
  });

  if (!activeEvent) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex flex-col items-center justify-center text-white p-6 text-center">
        <h1 className="text-2xl font-black mb-2">Nenhum Evento Ativo</h1>
        <p className="text-slate-400 mb-8">Peça para o administrador iniciar o evento no painel principal.</p>
        <LogoutButton />
      </div>
    );
  }

  // Fallback caso a chave PIX ainda não exista no banco de dados
  const eventData = {
    ...activeEvent,
    ticketPrice: activeEvent.ticketPrice || 2500,
    pixKey: activeEvent.pixKey || "sua-chave-pix-aqui@email.com",
    sellers: activeEvent.staff.map(staff => ({
      id: staff.id,
      name: staff.user.name || "Vendedor",
      userId: staff.userId,
    })),
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div>
          <h1 className="font-black text-emerald-400 leading-tight">CAIXA RÁPIDO</h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 truncate max-w-[200px]">
            {activeEvent.name}
          </p>
        </div>
        <LogoutButton />
      </header>

      <main className="flex-1 flex flex-col">
        {/* 🔥 Correção: Agora passamos o objeto inteiro para o PDVClient */}
        <PDVClient activeEvent={eventData} />
      </main>
    </div>
  );
}