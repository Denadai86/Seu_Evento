import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import PDVClient from "./PDVClient";

export default async function VendasPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;

  // Busca o evento que está ativo no momento para este cliente
  const activeEvent = await prisma.event.findFirst({
    where: { 
      tenant: { subdomain },
      isActive: true 
    },
  });

  if (!activeEvent) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex flex-col items-center justify-center text-white p-6 text-center">
        <h1 className="text-2xl font-black mb-2">Nenhum Evento Ativo</h1>
        <p className="text-slate-400 mb-8">Peça para o administrador iniciar o evento no painel principal.</p>
        <LogoutButton callbackUrl="/entrar" variant="dark" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div>
          <h1 className="font-black text-emerald-400 leading-tight">CAIXA RÁPIDO</h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 truncate max-w-[200px]">
            {activeEvent.name}
          </p>
        </div>
        <LogoutButton callbackUrl="/entrar" variant="dark" />
      </header>

      <main className="flex-1 flex flex-col">
        {/* Passa o ID do evento para o componente interativo */}
        <PDVClient eventId={activeEvent.id} />
      </main>
    </div>
  );
}