// src/app/[subdomain]/dashboard/[eventId]/extrato/page.tsx
//
// EXTRATO POR VOLUNTÁRIO: uma folha por voluntário, para o tesoureiro conferir e o voluntário assinar.
// ?staff=<id> imprime só um voluntário.

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PrintButton from "../relatorio/PrintButton";
import { requireReportAccess } from "@/lib/requireReportAccess";
import { computeCashReport } from "@/lib/cashReport";

const TZ = "America/Sao_Paulo";
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDateTime = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function ExtratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string; eventId: string }>;
  searchParams: Promise<{ staff?: string }>;
}) {
  const { subdomain, eventId } = await params;
  const { staff: staffFilter } = await searchParams;
  const tenant = await requireReportAccess(subdomain);

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    select: {
      name: true,
      ticketPrice: true,
      fullHousePrice: true,
      tenant: { select: { name: true } },
      cards: { select: { shortId: true, type: true, isPaid: true, price: true, eventStaffId: true }, orderBy: { shortId: "asc" } },
      transactions: { select: { method: true, amount: true, eventStaffId: true } },
      staff: { select: { id: true, user: { select: { name: true } } } },
    },
  });
  if (!event) notFound();

  const staff = event.staff.map((s) => ({ id: s.id, name: s.user?.name || "Vendedor" }));
  const report = computeCashReport({
    ticketPrice: event.ticketPrice,
    fullHousePrice: event.fullHousePrice,
    cards: event.cards,
    transactions: event.transactions,
    sponsorContributions: [],
    staff,
  });

  // Mesmo critério do fechamento: price null (cartela antiga) cai no preço do TIPO dela.
  const priceOf = (c: { price: number | null; type: string | null }) =>
    c.price ?? (c.type === "FULL_HOUSE" && event.fullHousePrice && event.fullHousePrice > 0 ? event.fullHousePrice : event.ticketPrice);

  const sheets = staff
    .filter((s) => !staffFilter || s.id === staffFilter)
    .map((s) => {
      const row = report.sellers.find((r) => r.id === s.id) ?? { id: s.id, name: s.name, qtd: 0, pix: 0, dinheiro: 0, total: 0 };
      const sold = event.cards.filter((c) => c.isPaid && c.eventStaffId === s.id);
      const pendingCards = event.cards.filter((c) => !c.isPaid && c.eventStaffId === s.id);
      const byPrice = new Map<number, string[]>();
      for (const c of sold) {
        const p = priceOf(c);
        byPrice.set(p, [...(byPrice.get(p) ?? []), c.shortId]);
      }
      return { ...s, row, byPrice: [...byPrice.entries()].sort((a, b) => a[0] - b[0]), pendingCards };
    })
    .filter((s) => s.row.qtd > 0 || s.pendingCards.length > 0);

  if (staffFilter && sheets.length === 0) notFound();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20 print:bg-white print:pb-0">
      <header className="print:hidden bg-[#0b0f14] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/${eventId}/resultados`} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-bold">Extrato por Voluntário • {sheets.length} folha{sheets.length === 1 ? "" : "s"}</h1>
          </div>
          <PrintButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto mt-8 print:mt-0 space-y-8 print:space-y-0">
        {sheets.length === 0 && (
          <div className="bg-white p-10 rounded-xl text-center text-slate-500">Nenhum voluntário com vendas ou cartelas em mãos.</div>
        )}

        {sheets.map((s, i) => (
          <article key={s.id} className={`bg-white p-10 rounded-xl shadow-xl print:shadow-none print:rounded-none ${i < sheets.length - 1 ? "break-after-page" : ""}`}>
            <div className="border-b-2 border-slate-200 pb-5 mb-6 flex justify-between items-end">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{event.tenant.name}</p>
                <h1 className="text-2xl font-black">{event.name}</h1>
                <p className="text-slate-500">Extrato do voluntário</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-400">Emitido em</p>
                <p className="font-mono text-slate-800 text-sm">{fmtDateTime(new Date())}</p>
              </div>
            </div>

            <h2 className="text-3xl font-black mb-6">{s.name}</h2>

            <div className="grid grid-cols-4 gap-3 mb-8">
              {[
                ["Cartelas vendidas", `${s.row.qtd}`],
                ["Em PIX", brl(s.row.pix)],
                ["Em dinheiro", brl(s.row.dinheiro)],
                ["Total", brl(s.row.total)],
              ].map(([label, value]) => (
                <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
                  <p className="text-lg font-black">{value}</p>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 mb-2">Cartelas vendidas</h3>
            {s.byPrice.length === 0 ? (
              <p className="text-sm text-slate-400 mb-6">Nenhuma cartela vendida.</p>
            ) : (
              <div className="space-y-3 mb-6">
                {s.byPrice.map(([price, codes]) => (
                  <div key={price}>
                    <p className="text-sm font-bold">{brl(price)} • {codes.length} cartela{codes.length === 1 ? "" : "s"}</p>
                    <p className="font-mono text-[11px] text-slate-600 leading-relaxed break-words">{codes.join("  ")}</p>
                  </div>
                ))}
              </div>
            )}

            <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 mb-2">
              Cartelas ainda com o voluntário (não acertadas)
            </h3>
            {s.pendingCards.length === 0 ? (
              <p className="text-sm text-slate-400 mb-6">Nenhuma.</p>
            ) : (
              <div className="mb-6">
                <p className="text-sm font-bold">{s.pendingCards.length} cartela{s.pendingCards.length === 1 ? "" : "s"}</p>
                <p className="font-mono text-[11px] text-slate-600 leading-relaxed break-words">
                  {s.pendingCards.map((c) => c.shortId).join("  ")}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-12 mt-16 pt-2">
              <div className="border-t border-slate-800 pt-2 text-center text-xs text-slate-500">Voluntário — {s.name}</div>
              <div className="border-t border-slate-800 pt-2 text-center text-xs text-slate-500">Tesouraria</div>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
