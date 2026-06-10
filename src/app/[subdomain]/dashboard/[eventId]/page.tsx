// src/app/[subdomain]/dashboard/[eventId]/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import EventStatusToggle from "./EventStatusToggle";
import GenerateCardsButton from "./GenerateCardsButton";
import { 
  Printer, Users, Megaphone, MonitorPlay, 
  ArrowLeft, Ticket, Building2, Wallet, Trophy, ShieldAlert, ArrowRight
} from "lucide-react";
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
      // 🏦 MUDANÇA ARQUITETURAL: Puxamos as transações (O Livro Razão) para auditoria perfeita
      transactions: {
        select: { amount: true, eventStaffId: true }
      },
      staff: {
        include: { 
          user: { select: { name: true, username: true } }, 
          cards: { select: { id: true, isPaid: true, price: true } } // Isso é o estoque físico dele
        },
        orderBy: { createdAt: 'desc' }
      }
    },
  });

  if (!event) notFound();

  // 💰 CÁLCULOS FINANCEIROS GLOBAIS
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
              href={`/${subdomain}/dashboard`}
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

            <EventStatusToggle 
              eventId={event.id} 
              initialStatus={event.status} 
              tenantId={event.tenantId} 
              subdomain={subdomain} 
            />
            <div className="h-6 w-px bg-slate-800"></div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        
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
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Equipe na Escala</p>
                  <p className="text-2xl font-black text-white">{event.staff.length}</p> 
                </div>
              </div>
            </div>

            {/* 🧩 BENTO GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
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

              <div className="lg:col-span-1 bg-gradient-to-br from-[#111827] to-[#0d131a] border border-amber-900/30 rounded-3xl p-8 shadow-2xl flex flex-col h-[400px]">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <Megaphone className="text-amber-400" size={28} />
                  <h2 className="text-xl font-black text-white">Patrocinadores</h2>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <SponsorManager eventId={event.id} initialSponsors={event.sponsors} />
                </div>
              </div>

              <div className="lg:col-span-2 bg-[#111827] border border-violet-900/30 rounded-3xl p-8 shadow-2xl flex flex-col h-[400px]">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <Trophy className="text-violet-400" size={28} />
                  <div>
                    <h2 className="text-xl font-black text-white">Gestão de Rodadas</h2>
                    <p className="text-slate-500 text-xs mt-1">Configure os prêmios e patrocinadores</p>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <PrizeManager eventId={event.id} initialPrizes={event.prizes} sponsors={event.sponsors} />
                </div>
              </div>

              {/* MÓDULO 3: GESTÃO DE EQUIPE */}
              <div className="lg:col-span-2 bg-gradient-to-br from-[#111827] to-[#0d131a] border border-blue-900/50 rounded-3xl p-8 shadow-2xl flex flex-col justify-center h-[400px] relative overflow-hidden group">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full"></div>
                <div className="relative z-10 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                    <Users size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4">Central da Equipe</h2>
                  <p className="text-slate-400 mb-8 max-w-md">
                    Aloque voluntários, gere PINs de acesso, defina quem pode vender cartelas e quem terá acesso ao palco do locutor.
                  </p>
                  <Link 
                    href={`/${subdomain}/dashboard/${event.id}/equipe`}
                    className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-8 rounded-xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_50px_rgba(37,99,235,0.5)]"
                  >
                    Gerenciar Permissões e Escala <ArrowRight size={20} />
                  </Link>
                </div>
              </div>

              {/* 💵 MÓDULO 4: AUDITORIA DE VENDAS 100% CORRIGIDO */}
              <div className="lg:col-span-1 bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col h-[400px]">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <Wallet className="text-emerald-400" size={28} />
                  <div>
                    <h2 className="text-xl font-black text-white">Auditoria PDV</h2>
                    <p className="text-slate-500 text-xs mt-1">Vendas reais no caixa</p>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                  {event.staff.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">Nenhuma equipe alocada.</p>
                  ) : (
                    event.staff.map((member) => {
                      // O ESTOQUE FÍSICO (Cartelas que estão no bolso da pessoa, pagas ou não)
                      const totalAssignedCards = member.cards.length;
                      
                      // O LIVRO RAZÃO (Vendas 100% confirmadas através do seu PDV)
                      const memberTransactions = event.transactions.filter(t => t.eventStaffId === member.id);
                      const pdvSalesCount = memberTransactions.length;
                      const pdvRevenueInCents = memberTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

                      // Se o voluntário não pegou bloco de cartela e não vendeu nada no app, oculta ele pra não poluir.
                      if (totalAssignedCards === 0 && pdvSalesCount === 0) return null;

                      // Calcula a % de vendas se ele tiver estoque
                      const salesProgress = totalAssignedCards > 0 
                        ? Math.min(100, (pdvSalesCount / totalAssignedCards) * 100) 
                        : 0;

                      return (
                        <div key={member.id} className="flex flex-col p-4 bg-black/20 rounded-xl border border-slate-800 gap-3">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-bold text-slate-200 truncate max-w-[120px]">{member.user.name}</p>
                            <p className="text-emerald-400 font-black text-sm">
                              R$ {(pdvRevenueInCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          
                          <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                            <span className="text-slate-500">{totalAssignedCards} no Bolso</span>
                            <span className="text-emerald-500/70">{pdvSalesCount} Vendas (PDV)</span>
                          </div>
                          
                          {/* Barra de Progresso do Estoque vs Venda */}
                          {totalAssignedCards > 0 && (
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                                style={{ width: `${salesProgress}%` }}
                              ></div>
                            </div>
                          )}
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
                    href={`/${subdomain}/live`} 
                    target="_blank"
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-xl transition-all text-center flex items-center justify-center gap-2 border border-slate-700"
                  >
                    Mesa Locutor
                  </a>
                  
                  <a 
                    href={`/${subdomain}/projector?eventId=${event.id}`} 
                    target="_blank"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 text-center flex items-center justify-center gap-2"
                  >
                    Abrir Telão
                  </a>

                  <a 
                    href={`/${subdomain}/verify?event=${event.id}`}
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
                    href={`/${subdomain}/dashboard/${event.id}/relatorio`} 
                    target="_blank"
                    className="col-span-full sm:col-span-2 lg:col-span-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 mt-2"
                  >
                    📄 Fechar Caixa Definitivo
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