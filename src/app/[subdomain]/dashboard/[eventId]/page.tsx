//src/app/[subdomain]/dashboard/[eventId]/page.tsx

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import EventStatusToggle from "./EventStatusToggle";
import GenerateCardsButton from "./GenerateCardsButton";
import { 
  Printer, Users, Megaphone, MonitorPlay, 
  Settings, ArrowLeft, Ticket, Building2
} from "lucide-react";
import SellerManager from "./SellerManager";

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string; eventId: string }>; // Tipagem Next.js 15
}) {
  // 🔥 A MÁGICA QUE CONSERTA O ERRO: Desempacotando a Promise
  const { subdomain, eventId } = await params;
  
  const event = await prisma.event.findFirst({
    where: {
      id: (await params).eventId,
      tenant: { subdomain: (await params).subdomain },
    },
    include: {
      _count: {
        select: { cards: true, sponsors: true },
      },
      // 🔥 Puxa os vendedores (sellers) e as cartelas associadas a eles
      sellers: {
        include: { cards: { select: { id: true, isPaid: true } } },
        orderBy: { createdAt: 'desc' }
      }
    },
  });

  if (!event) notFound();

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans pb-20">
      
      {/* 🚀 HEADER PREMIUM */}
      <header className="sticky top-0 z-50 bg-[#0b0f14]/80 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide">{event.name}</h1>
              <p className="text-emerald-500/70 text-sm font-bold uppercase tracking-widest">
                Centro de Comando
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* 🔥 CORRIGIDO: O Toggle de status agora só passa o eventId e o status inicial, ou apenas o que o seu componente realmente pede */}
            <EventStatusToggle eventId={event.id} tenantId={""} subdomain={""} currentStatus={""} />
            <div className="h-6 w-px bg-slate-800"></div>
            <LogoutButton callbackUrl="/entrar" variant="dark" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* 📊 ESTATÍSTICAS RÁPIDAS (Top Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#111827] border border-emerald-900/30 p-6 rounded-3xl shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-900/40 text-emerald-400 flex items-center justify-center">
              <Ticket size={32} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Cartelas Geradas</p>
              <p className="text-4xl font-black text-white">{event._count.cards}</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-emerald-900/30 p-6 rounded-3xl shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-900/40 text-amber-400 flex items-center justify-center">
              <Building2 size={32} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Patrocinadores</p>
              <p className="text-4xl font-black text-white">{event._count.sponsors}</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-emerald-900/30 p-6 rounded-3xl shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-900/40 text-blue-400 flex items-center justify-center">
              <Users size={32} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Vendedores</p>
              <p className="text-4xl font-black text-white">{event.sellers.length}</p> 
            </div>
          </div>
        </div>

        {/* 🧩 BENTO GRID (Módulos de Ação) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* MÓDULO 1: CARTELAS E IMPRESSÃO (Ocupa 2 colunas) */}
          <div className="lg:col-span-2 bg-[#111827] border border-emerald-900/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full"></div>
            
            <div className="flex items-center gap-3 mb-8">
              <Printer className="text-emerald-400" size={28} />
              <h2 className="text-2xl font-black text-white">Fábrica de Cartelas</h2>
            </div>
            
            <p className="text-slate-400 mb-8 max-w-xl">
              Gere lotes matematicamente seguros e imprima em diferentes formatos. Em breve, envie direto para gráficas parceiras com desconto.
            </p>

            <div className="bg-[#0b0f14] p-6 rounded-2xl border border-slate-800">
              <GenerateCardsButton eventId={event.id} eventName={event.name} />
            </div>
          </div>

          {/* MÓDULO 3: VENDEDORES E LOGÍSTICA */}
          <div className="bg-gradient-to-br from-[#111827] to-[#0d131a] border border-blue-900/30 rounded-3xl p-8 shadow-2xl flex flex-col h-[500px]">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <Users className="text-blue-400" size={28} />
              <div>
                <h2 className="text-xl font-black text-white">Vendedores</h2>
                <p className="text-slate-500 text-xs mt-1">Gestão de lotes e acertos</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {/* O componente Sanfona que criamos antes! */}
              <SellerManager eventId={event.id} initialSellers={event.sellers} />
            </div>
          </div>

          {/* MÓDULO 2: PATROCINADORES */}
          <div className="lg:col-span-1 bg-[#111827] border border-amber-900/30 rounded-3xl p-8 shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Megaphone className="text-amber-400" size={28} />
              <h2 className="text-xl font-black text-white">Patrocinadores</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6 flex-1">
              Adicione logomarcas que aparecerão no rodapé do telão.
            </p>
            <button className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2">
              <Settings size={18} />
              Gerenciar
            </button>
          </div>

        {/* MÓDULO 4: LINKS RÁPIDOS E AVALIADORES */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col sm:flex-row gap-6 items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <MonitorPlay className="text-slate-300" size={24} />
              <h2 className="text-xl font-black text-white">Área de Testes & Conferência</h2>
            </div>
            <p className="text-slate-400 text-sm">
              Teste o telão e compartilhe o verificador com a equipe de conferência.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <a 
              href="/live" 
              target="_blank"
              className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all text-center flex items-center justify-center gap-2"
            >
              Mesa Locutor
            </a>
            
            <a 
              href={`/projector?event=${event.id}`} 
              target="_blank"
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 text-center flex items-center justify-center gap-2"
            >
              Abrir Telão
            </a>

            {/* 🔥 NOVO: Link para Avaliadores (Público) */}
            <a 
              href={`/${subdomain}/verify?event=${event.id}`}
              target="_blank"
              className="flex-1 sm:flex-none bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 px-6 rounded-xl transition-all text-center flex items-center justify-center gap-2 border border-violet-500/30"
            >
              <span>🔎 Verificador de Cartelas</span>
            </a>
          </div>
        </div>

        </div>
      </main>
    </div>
  );
}