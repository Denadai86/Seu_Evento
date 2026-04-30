import { prisma } from "../../../.././lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import GenerateCardsButton from "./GenerateCardsButton";
import SponsorManager from "./SponsorManager"; // <-- Importamos o painel aqui

export default async function EventControlPanel({ params }: { params: Promise<{ subdomain: string, eventId: string }> }) {
  const { subdomain, eventId } = await params;

  // Busca o evento e já traz a lista de patrocinadores salvos!
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { 
      organization: true,
      sponsors: true 
    }
  });

  if (!event || event.organization.slug !== subdomain) {
    redirect("/dashboard");
  }

  return (
    <div className="p-10 font-sans max-w-5xl mx-auto">
      <Link href="/dashboard" className="text-sm font-bold text-slate-400 hover:text-emerald-500 mb-6 inline-block">
        &larr; Voltar para Eventos
      </Link>

      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-800">{event.name}</h1>
        <p className="text-slate-500 mt-2">Sala de controle do sorteio.</p>
      </header>

      {/* AQUI ESTÁ A NOSSA CAIXINHA DE PATROCINADORES */}
      <SponsorManager eventId={event.id} initialSponsors={event.sponsors} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 border rounded-2xl bg-white shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-2">1. Lote de Cartelas</h2>
          <p className="text-slate-500 mb-6 text-sm">Gere as cartelas virtuais que serão distribuídas para os jogadores.</p>
          <GenerateCardsButton eventId={event.id} eventName={event.name} />
        </div>

        <div className="p-8 border rounded-2xl bg-slate-900 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-2">2. Painel do Locutor</h2>
          <p className="text-slate-400 mb-6 text-sm">Abra o globo virtual para começar a sortear as bolas do bingo ao vivo.</p>
          <a href={`/live?event=${event.id}`} target="_blank" className="block text-center w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            🏆 ABRIR GLOBO DE SORTEIO
          </a>
        </div>
      </div>
    </div>
  );
}