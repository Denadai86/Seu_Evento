// src/app/[subdomain]/dashboard/[eventId]/page.tsx

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import GenerateCardsButton from "./GenerateCardsButton";
import SponsorManager from "./SponsorManager";
import EventStatusToggle from "./EventStatusToggle";
import { MonitorPlay, Mic2, ThermometerSun } from "lucide-react";

interface EventControlPanelProps {
  params: Promise<{ subdomain: string; eventId: string }>;
}

export default async function EventControlPanel({ params }: EventControlPanelProps) {
  const { subdomain, eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { 
      tenant: true,
      sponsors: true 
    }
  });

  if (!event || !event.tenant || event.tenant.subdomain !== subdomain) {
    redirect("/dashboard");
  }

  // 🌡️ Cálculos do Termômetro do Sorteio
  const drawnCount = event.drawnNumbers.length;
  const tempPercentage = Math.round((drawnCount / 75) * 100);
  
  // Cor dinâmica baseada na "temperatura" (quantidade de bolas)
  let tempColor = "bg-blue-500"; // Início (Frio)
  if (tempPercentage > 33) tempColor = "bg-amber-500"; // Meio (Esquentando)
  if (tempPercentage > 66) tempColor = "bg-red-500"; // Fim (Fervendo/Batendo!)

  return (
    <div className="p-6 md:p-10 font-sans max-w-6xl mx-auto">
      <Link href="/dashboard" className="text-sm font-bold text-slate-400 hover:text-emerald-500 mb-6 inline-block transition-colors">
        &larr; Voltar para Eventos
      </Link>

      {/* CABEÇALHO E STATUS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">{event.name}</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Status atual: <span className="font-bold uppercase px-3 py-1 bg-slate-100 rounded-lg ml-1">{event.status}</span>
          </p>
        </div>
        
        <EventStatusToggle 
          eventId={event.id} 
          tenantId={event.tenantId} 
          subdomain={subdomain} 
          currentStatus={event.status} 
        />
      </div>

      {/* TERMÔMETRO DO EVENTO */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
        <div className="flex justify-between items-end mb-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl text-white ${tempColor} transition-colors duration-500 shadow-lg`}>
              <ThermometerSun size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Termômetro do Sorteio</h2>
              <p className="text-slate-500 text-sm">Acompanhe o andamento das pedras sorteadas</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black text-slate-800">{drawnCount}</span>
            <span className="text-slate-400 font-bold text-xl"> / 75</span>
          </div>
        </div>
        
        {/* Barra de Progresso Animada */}
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div 
            className={`h-full ${tempColor} transition-all duration-1000 ease-out`}
            style={{ width: `${tempPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* AS PORTAS DE ACESSO (SÓ APARECEM SE O EVENTO ESTIVER ATIVO) */}
      {event.status === "ACTIVE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <a 
            href={`/projector?event=${event.id}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-5 bg-slate-900 hover:bg-slate-800 text-white p-6 rounded-3xl border border-slate-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 group"
          >
            <div className="bg-emerald-500/20 p-4 rounded-2xl text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-all">
              <MonitorPlay size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors">Telão do Público</h3>
              <p className="text-sm text-slate-400 mt-1">Projete a mesa em uma TV ou Datashow</p>
            </div>
          </a>

          <a 
            href={`/live?event=${event.id}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-5 bg-slate-900 hover:bg-slate-800 text-white p-6 rounded-3xl border border-slate-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 group"
          >
            <div className="bg-amber-500/20 p-4 rounded-2xl text-amber-400 group-hover:scale-110 group-hover:-rotate-3 transition-all">
              <Mic2 size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors">Painel do Locutor</h3>
              <p className="text-sm text-slate-400 mt-1">Abra a mesa de sorteio e inicie o jogo</p>
            </div>
          </a>
        </div>
      )}

      {/* GERENCIAMENTO INFERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Lote de Cartelas</h2>
          <p className="text-slate-500 mb-6 text-sm">Gere o arquivo das cartelas para distribuir aos jogadores.</p>
          <GenerateCardsButton eventId={event.id} eventName={event.name} />
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
           {/* Reutilizamos o componente original que você já tinha */}
           <SponsorManager eventId={event.id} initialSponsors={event.sponsors} />
        </div>
      </div>
    </div>
  );
}