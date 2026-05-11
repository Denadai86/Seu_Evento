// src/app/[subdomain]/dashboard/[eventId]/page.tsx

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import EventStatusToggle from "./EventStatusToggle";
import GenerateCardsButton from "./GenerateCardsButton";
import { 
  Printer, Users, Megaphone, MonitorPlay, 
  Settings, ArrowLeft, Ticket, Building2, Wallet
} from "lucide-react";
import SellerManager from "./SellerManager";

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
      // 🔥 Puxa as cartelas para contar faturamento global
      cards: {
        select: { isPaid: true, isSold: true }
      },
      sellers: {
        include: { cards: { select: { id: true, isPaid: true } } },
        orderBy: { createdAt: 'desc' }
      }
    },
  });

  if (!event) notFound();

  // 💰 Cálculos Financeiros (Exemplo: Cartela a R$ 10)
  const TICKET_PRICE = 10;
  const totalPaid = event.cards.filter(c => c.isPaid).length;
  const revenue = totalPaid * TICKET_PRICE;

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
            <EventStatusToggle eventId={event.id} tenantId={""} subdomain={""} currentStatus={""} />
            <div className="h-6 w-px bg-slate-800"></div>
            <LogoutButton callbackUrl="/entrar" variant="dark" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* 📊 ESTATÍSTICAS RÁPIDAS (Top Cards agora com 4 colunas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-[#111827] border border-emerald-500/30 p-6 rounded-3xl shadow-xl flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-900/40 text-emerald-400 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black">R$</span>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total em Caixa</p>
              <p className="text-2xl font-black text-white">
                {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

        {/* 🧩 BENTO GRID (Módulos de Ação) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* MÓDULO 1: CARTELAS E IMPRESSÃO (2 colunas) */}
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

          {/* MÓDULO 2: PATROCINADORES (1 coluna) */}
          <div className="lg:col-span-1 bg-gradient-to-br from-[#111827] to-[#0d131a] border border-amber-900/30 rounded-3xl p-8 shadow-2xl flex flex-col">
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

          {/* MÓDULO 3: VENDEDORES (2 colunas) */}
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

          {/* MÓDULO 4: AUDITORIA DE VENDAS (1 coluna) */}
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
                  const sellerPaid = seller.cards.filter(c => c.isPaid).length;
                  const sellerRevenue = sellerPaid * TICKET_PRICE;

                  return (
                    <div key={seller.id} className="flex justify-between items-center p-3 bg-black/20 rounded-xl border border-slate-800">
                      <div>
                        <p className="text-sm font-bold text-slate-200 truncate max-w-[120px]">{seller.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{sellerPaid} pagas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-black text-sm">
                          R$ {sellerRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* MÓDULO 5: LINKS RÁPIDOS (Ocupa a linha toda) */}
          <div className="lg:col-span-3 bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col sm:flex-row gap-6 items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <MonitorPlay className="text-slate-300" size={24} />
                <h2 className="text-xl font-black text-white">Área de Testes & Links</h2>
              </div>
              <p className="text-slate-400 text-sm max-w-xl">
                Acesse a mesa do locutor, abra o telão do evento ou compartilhe o painel de verificação com a sua equipe de pátio.
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
                href={`/projector?eventId=${event.id}`} 
                target="_blank"
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 text-center flex items-center justify-center gap-2"
              >
                Abrir Telão
              </a>

              {/* Link Corrigido do Verificador/PDV */}
              <a 
                href={`/verify?event=${event.id}`}
                target="_blank"
                className="flex-1 sm:flex-none bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 px-6 rounded-xl transition-all text-center flex items-center justify-center gap-2 border border-violet-500/30"
              >
                <span>🔎 Verificador</span>
              </a>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}