// src/app/[subdomain]/dashboard/[eventId]/page.tsx

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import EventStatusToggle from "./EventStatusToggle";
import GenerateCardsButton from "./GenerateCardsButton";
import { 
  Printer, Users, Megaphone, MonitorPlay, 
  ArrowLeft, Ticket, Building2, Wallet, Trophy, ShieldAlert
} from "lucide-react";
import SellerManager from "./SellerManager";
import PrizeManager from "./PrizeManager";
import SponsorManager from "./SponsorManager";
import TicketPriceEditor from "./TicketPriceEditor";
import EventWizard from "./EventWizard";


export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string; eventId: string }>;
}) {
  const { subdomain, eventId } = await params;

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      tenant: { subdomain: subdomain },
    },
    include: {
      _count: {
        select: { cards: true, sponsors: true },
      },
      sponsors: true,
      cards: {
        select: { isPaid: true, isSold: true, price: true }
      },
      prizes: { orderBy: { order: 'asc' } },
      sellers: {
        include: { cards: { select: { id: true, isPaid: true, price: true } } },
        orderBy: { createdAt: 'desc' }
      }
    },
  });

  if (!event) notFound();

  // 💰 CÁLCULOS FINANCEIROS
  const totalPaid = event.cards.filter(c => c.isPaid).length;
  
  const cardsRevenueCents = event.cards
    .filter(c => c.isPaid)
    .reduce((sum, card) => sum + (card.price || event.ticketPrice), 0);

  const sponsorsRevenueCents = event.sponsors.reduce((sum, s) => sum + s.contribution, 0);
  const totalEmCaixaReal = (cardsRevenueCents + sponsorsRevenueCents) / 100;

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
            <TicketPriceEditor eventId={event.id} initialPrice={event.ticketPrice} />
            
            <div className="hidden sm:block h-6 w-px bg-slate-700"></div>

            <EventStatusToggle eventId={event.id} tenantId={""} subdomain={""} currentStatus={""} />
            <div className="h-6 w-px bg-slate-800"></div>
            <LogoutButton callbackUrl="/entrar" variant="dark" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* 🔥 A MÁGICA ENTRA AQUI: WIZARD VS DASHBOARD */}
        {event.status === "DRAFT" && event._count.cards === 0 ? (
          <EventWizard event={event} prizes={event.prizes} sponsors={event.sponsors} />
        ) : (
          <>
            {/* 📊 ESTATÍSTICAS RÁPIDAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-[#111827] border border-emerald-500/30 p-6 rounded-3xl shadow-xl flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-900/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-black">R$</span>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total em Caixa</p>
                  <p className="text-2xl font-black text-white">
                    {totalEmCaixaReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="bg-[#111827] border border-emerald-900/30 p-6 rounded-3xl shadow-xl flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-900/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <Ticket size={28} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Cartelas Pagas</p>
                  <p className="text-2xl font-black text-white">
                    {totalPaid} <span className="text-sm text-slate-500 font-normal">/ {event._count.cards}</span>
                  </p>
                </div>
              </div>

              <div className="bg-[#111827] border border-amber-900/30 p-6 rounded-3xl shadow-xl flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-900/40 text-amber-400 flex items-center justify-center shrink-0">
                  <Building2 size={28} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Patrocinadores</p>
                  <p className="text-2xl font-black text-white">{event._count.sponsors}</p>
                </div>
              </div>

              <div className="bg-[#111827] border border-blue-900/30 p-6 rounded-3xl shadow-xl flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-900/40 text-blue-400 flex items-center justify-center shrink-0">
                  <Users size={28} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Vendedores</p>
                  <p className="text-2xl font-black text-white">{event.sellers.length}</p> 
                </div>
              </div>
            </div>

            {/* 🧩 BENTO GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* MÓDULO 1: CARTELAS E IMPRESSÃO */}
              <div className="lg:col-span-2 bg-[#111827] border border-emerald-900/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full"></div>
                <div className="flex items-center gap-3 mb-8">
                  <Printer className="text-emerald-400" size={28} />
                  <h2 className="text-2xl font-black text-white">Fábrica de Cartelas</h2>
                </div>
                <p className="text-slate-400 mb-8 max-w-xl">
                  Gere lotes matematicamente seguros e imprima em diferentes formatos.
                </p>
                <div className="bg-[#0b0f14] p-6 rounded-2xl border border-slate-800">
                  <GenerateCardsButton eventId={event.id} eventName={event.name} />
                </div>
              </div>

              {/* MÓDULO 2: PATROCINADORES */}
              <div className="lg:col-span-1 bg-gradient-to-br from-[#111827] to-[#0d131a] border border-amber-900/30 rounded-3xl p-8 shadow-2xl flex flex-col h-[400px]">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <Megaphone className="text-amber-400" size={28} />
                  <h2 className="text-xl font-black text-white">Patrocinadores</h2>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <SponsorManager eventId={event.id} initialSponsors={event.sponsors} />
                </div>
              </div>

              {/* MÓDULO EXTRA: REGRAS DE VITÓRIA / RODADAS */}
              <div className="lg:col-span-2 bg-[#111827] border border-violet-900/30 rounded-3xl p-8 shadow-2xl flex flex-col h-[400px]">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <Trophy className="text-violet-400" size={28} />
                  <div>
                    <h2 className="text-xl font-black text-white">Gestão de Rodadas</h2>
                    <p className="text-slate-500 text-xs mt-1">Configure os prêmios e patrocinadores</p>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {/* 🔥 CORREÇÃO: Enviando o eventId e a lista de sponsors para cá! */}
                  <PrizeManager eventId={event.id} initialPrizes={event.prizes} sponsors={event.sponsors} />
                </div>
              </div>

              {/* MÓDULO 3: VENDEDORES */}
              <div className="lg:col-span-2 bg-[#111827] border border-blue-900/30 rounded-3xl p-8 shadow-2xl flex flex-col h-[500px]">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <Users className="text-blue-400" size={28} />
                  <div>
                    <h2 className="text-xl font-black text-white">Vendedores & Logística</h2>
                    <p className="text-slate-500 text-xs mt-1">Gestão de lotes físicos e repasses</p>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <SellerManager eventId={event.id} initialSellers={event.sellers} />
                </div>
              </div>

              {/* MÓDULO 4: AUDITORIA DE VENDAS */}
              <div className="lg:col-span-1 bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col h-[500px]">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <Wallet className="text-emerald-400" size={28} />
                  <h2 className="text-xl font-black text-white">Auditoria</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                  {event.sellers.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">Nenhum dado financeiro.</p>
                  ) : (
                    event.sellers.map((seller) => {
                      const sellerPaidCount = seller.cards.filter(c => c.isPaid).length;
                      
                      const sellerRevenueInCents = seller.cards
                        .filter(c => c.isPaid)
                        .reduce((sum, card) => sum + (card.price || event.ticketPrice), 0);

                      return (
                        <div key={seller.id} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-slate-800">
                          <div>
                            <p className="text-sm font-bold text-slate-200 truncate max-w-[120px]">{seller.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase">{sellerPaidCount} pagas</p>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-black text-sm">
                              R$ {(sellerRevenueInCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* MÓDULO 5: LINKS RÁPIDOS E AÇÕES GLOBAIS */}
              <div className="lg:col-span-3 bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <MonitorPlay className="text-slate-300" size={24} />
                      <h2 className="text-xl font-black text-white">Área de Testes & Links Operacionais</h2>
                    </div>
                    <p className="text-slate-400 text-sm max-w-2xl">
                      Acesse ferramentas externas do evento: mesa de sorteio, painel do telão, validador de cartelas e o fechamento de caixa detalhado.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full relative z-10">
                  <a 
                    href="/live" 
                    target="_blank"
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-xl transition-all text-center flex items-center justify-center gap-2 border border-slate-700"
                  >
                    Mesa Locutor
                  </a>
                  
                  <a 
                    href={`/projector?eventId=${event.id}`} 
                    target="_blank"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 text-center flex items-center justify-center gap-2"
                  >
                    Abrir Telão
                  </a>

                  <a 
                    href={`/verify?event=${event.id}`}
                    target="_blank"
                    className="bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 px-6 rounded-xl transition-all text-center flex items-center justify-center gap-2 border border-violet-500/30"
                  >
                    🔎 Verificador
                  </a>
                  
                  <form action={async () => {
                    "use server";
                    const { activateDemoMode } = await import("@/actions/event");
                    await activateDemoMode(event.id);
                  }}>
                    <button 
                      type="submit"
                      className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-pink-900/20 text-center flex items-center justify-center gap-2"
                    >
                      ✨ Validar Todas (Demo)
                    </button>
                  </form>

                  <a 
                    href={`/dashboard/${event.id}/relatorio`} 
                    target="_blank"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                  >
                    📄 Fechar Caixa
                  </a>
                </div>
              </div>

            </div>
          </>
        )}

        {/* 🌟 FOOTER MEGA BLASTER PREMIUM SAAS */}
        <footer className="mt-20 border-t border-slate-800/50 pt-12 pb-8 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
            <ShieldAlert size={28} /> 
          </div>
          
          <h3 className="text-2xl font-black text-white tracking-[0.2em] uppercase mb-3">Ação Leve</h3>
          <p className="text-slate-500 text-sm mb-8 max-w-md leading-relaxed">
            Tecnologia antifraude e transparência financeira para eventos beneficentes de alto padrão.
          </p>
          
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 bg-black/40 px-5 py-2.5 rounded-full border border-slate-800/80 shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            SISTEMA OPERACIONAL E PROTEGIDO
          </div>
        </footer>

      </main>
    </div>
  );
}