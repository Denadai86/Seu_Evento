// src/app/[subdomain]/dashboard/[eventId]/tesouraria/page.tsx
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import TesourariaClient from "./TesourariaClient";
import { requirePageAccess } from "@/lib/eventAccess";
import { canChoosePricePhase, homeFor } from "@/lib/accessPolicy";
import { currentPrices } from "@/lib/priceTiers";

export default async function TesourariaPage({ 
  params,
  searchParams,
}: { 
  params: Promise<{ subdomain: string; eventId: string }>;
  searchParams: Promise<{ staff?: string; cartela?: string }>;
}) {
  const { subdomain, eventId } = await params;
  const { staff: autoStaff, cartela: autoCard } = await searchParams;

  // 1. Resolve o tenant pela URL e exige ORG_ADMIN dele (ou Super Admin, só leitura)
  const tenant = await requirePageAccess(subdomain, eventId, "tesouraria");

  // 2. Busca o Evento e a Equipe (somente quem tem permissão canSell)
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
  });

  if (!event) return notFound();

  // Fases de preço: a tesouraria escolhe qual preço aplicar no acerto (padrão: a vigente agora)
  const tiers = await prisma.priceTier.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, quinaPrice: true, fullHousePrice: true, startsAt: true },
  });
  const base = { ticketPrice: event.ticketPrice, fullHousePrice: event.fullHousePrice };
  const nowPrices = currentPrices(base, tiers);
  const brl = (cents: number | null) =>
    cents == null ? "—" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const canChoosePhase = canChoosePricePhase(tenant.actor);
  const allPriceOptions = [
    {
      value: "",
      label: `Fase vigente agora: ${nowPrices.tier?.name ?? "preço padrão"} (quina ${brl(nowPrices.quina)} • cheia ${brl(nowPrices.fullHouse)})`,
    },
    ...tiers.map((t) => ({
      value: t.id,
      label: `${t.name} (quina ${brl(t.quinaPrice)} • cheia ${brl(t.fullHousePrice ?? event.fullHousePrice ?? null)})`,
    })),
  ];
  // O tesoureiro só vê (e só usa) a fase vigente; escolher outra fase é do administrador.
  const priceOptions = canChoosePhase ? allPriceOptions : allPriceOptions.slice(0, 1);

  // 3. Busca a equipe escalada com suas cartelas
  const eventStaff = await prisma.eventStaff.findMany({
    where: { eventId, canSell: true },
    include: {
      user: { select: { name: true, username: true } },
      cards: {
        select: { id: true, shortId: true, isPaid: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // 4. KPI de Fábrica (Cartelas sem dono neste evento)
  const availableCardsCount = await prisma.card.count({
    where: { eventId, eventStaffId: null }
  });

  // Pedidos de cartelas entre voluntários (registro para o admin acompanhar)
  const transfers = await prisma.cardTransfer.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true, type: true, quantity: true, status: true, codes: true, createdAt: true,
      requester: { select: { user: { select: { name: true } } } },
      owner: { select: { user: { select: { name: true } } } },
    },
  });
  const statusLabel: Record<string, string> = { PENDING: "Aguardando", ACCEPTED: "Aceito", DECLINED: "Recusado", CANCELLED: "Cancelado" };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans pb-20">
      <header className="sticky top-0 z-50 bg-[#0b0f14]/80 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link 
            href={homeFor(tenant.actor, eventId)}
            className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="w-10 h-10 bg-emerald-900/40 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Tesouraria & Estoque</h1>
            <p className="text-emerald-500/70 text-xs font-bold uppercase tracking-widest">{event.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8">
        {/* Passando os dados para o Client Component mesclado */}
        <TesourariaClient 
          autoOpen={autoStaff && autoCard && /^[A-Z0-9]{4,10}$/i.test(autoCard) ? { staffId: autoStaff, code: autoCard.toUpperCase() } : null}
         
          eventId={eventId} 
          initialStaff={eventStaff} 
          availableCardsCount={availableCardsCount} 
          priceOptions={priceOptions}
          canChoosePhase={canChoosePhase}
        />

        <section className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">Pedidos entre voluntários</h2>
            <a href={`/dashboard/${eventId}/cartelas`} target="_blank" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
              Ver cartelas por ID
            </a>
          </div>
          {transfers.length === 0 ? (
            <p className="text-sm text-slate-500 border border-dashed border-slate-700 rounded-2xl p-5">
              Nenhum pedido ainda. Os voluntários pedem cartelas uns aos outros pelo PDV (botão Equipe) e o registro aparece aqui.
            </p>
          ) : (
            <div className="overflow-x-auto bg-[#111827] border border-slate-800 rounded-2xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <th className="p-3">Quando</th><th className="p-3">De (pediu)</th><th className="p-3">Para (entregou)</th>
                    <th className="p-3">Cartelas</th><th className="p-3">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => {
                    const codes = Array.isArray(t.codes) ? (t.codes as string[]).slice().sort() : [];
                    return (
                      <tr key={t.id} className="border-b border-slate-800/60">
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          {t.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-3 font-bold text-white">{t.requester.user?.name || "Voluntário"}</td>
                        <td className="p-3 text-slate-300">{t.owner.user?.name || "Voluntário"}</td>
                        <td className="p-3 text-slate-300">
                          {t.quantity} {t.type === "FULL_HOUSE" ? "cheia" : "quina"}
                          {codes.length > 0 && <span className="block font-mono text-[11px] text-slate-500">{codes[0]} … {codes[codes.length - 1]}</span>}
                        </td>
                        <td className="p-3 font-bold text-slate-300">{statusLabel[t.status]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}