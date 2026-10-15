// src/app/[subdomain]/dashboard/[eventId]/ranking/page.tsx
//
// RANKING DE VENDAS para imprimir/anunciar (e entregar uma prenda). Só o administrador acessa.
// ?by=valor | qtd

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PrintButton from "../relatorio/PrintButton";
import { requirePageAccess } from "@/lib/eventAccess";

import { computeCashReport } from "@/lib/cashReport";
import { buildRanking, type RankBy } from "@/lib/ranking";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const MEDAL = ["🥇", "🥈", "🥉"];

export default async function RankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string; eventId: string }>;
  searchParams: Promise<{ by?: string }>;
}) {
  const { subdomain, eventId } = await params;
  const { by } = await searchParams;
  const rankBy: RankBy = by === "qtd" ? "qtd" : "valor";
  const tenant = await requirePageAccess(subdomain, eventId, "ranking");

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    select: {
      name: true,
      ticketPrice: true,
      fullHousePrice: true,
      tenant: { select: { name: true } },
      cards: { select: { isPaid: true, price: true, type: true, eventStaffId: true } },
      transactions: { select: { method: true, amount: true, eventStaffId: true } },
      staff: { select: { id: true, user: { select: { name: true } } } },
    },
  });
  if (!event) notFound();

  const report = computeCashReport({
    ticketPrice: event.ticketPrice,
    fullHousePrice: event.fullHousePrice,
    cards: event.cards,
    transactions: event.transactions,
    sponsorContributions: [],
    staff: event.staff.map((s) => ({ id: s.id, name: s.user?.name || "Voluntário" })),
  });
  const ranking = buildRanking(report.sellers, rankBy);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20 print:bg-white print:pb-0">
      <header className="print:hidden bg-[#0b0f14] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href={tenant.actor.role === "STAFF" ? "/gestao" : `/dashboard/${eventId}/resultados`} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-bold">Ranking de vendas</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/${eventId}/ranking?by=valor`} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${rankBy === "valor" ? "bg-emerald-600" : "bg-slate-800"}`}>Por valor</Link>
            <Link href={`/dashboard/${eventId}/ranking?by=qtd`} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${rankBy === "qtd" ? "bg-emerald-600" : "bg-slate-800"}`}>Por cartelas</Link>
            <PrintButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto mt-8 print:mt-0 bg-white p-10 rounded-xl shadow-xl print:shadow-none">
        <div className="text-center border-b-2 border-slate-200 pb-6 mb-8">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{event.tenant.name}</p>
          <h1 className="text-3xl font-black mt-1">{event.name}</h1>
          <p className="text-slate-500 mt-1">Ranking de vendas • {rankBy === "valor" ? "por valor vendido" : "por cartelas vendidas"}</p>
        </div>

        {ranking.length === 0 ? (
          <p className="text-center text-slate-400">Ninguém vendeu ainda.</p>
        ) : (
          <ol className="space-y-3">
            {ranking.map((r) => (
              <li key={r.id} className={`flex items-center justify-between rounded-2xl border p-5 ${r.position === 1 ? "border-yellow-400 bg-yellow-50" : "border-slate-200"}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-3xl w-12 text-center">{r.position <= 3 ? MEDAL[r.position - 1] : `${r.position}º`}</span>
                  <span className="text-xl font-black truncate">{r.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-black">{rankBy === "valor" ? brl(r.total) : `${r.qtd} cartelas`}</p>
                  <p className="text-xs text-slate-500">{rankBy === "valor" ? `${r.qtd} cartelas` : brl(r.total)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-14 pt-4 border-t border-slate-300 text-sm text-slate-500">
          Prenda: ______________________________________________________
        </div>
      </main>
    </div>
  );
}
