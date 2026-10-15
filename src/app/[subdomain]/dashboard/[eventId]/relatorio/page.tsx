// src/app/[subdomain]/dashboard/[eventId]/relatorio/page.tsx

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Wallet, QrCode, Building2, AlertTriangle } from "lucide-react";
import PrintButton from "./PrintButton";
import { requirePageAccess } from "@/lib/eventAccess";
import { homeFor } from "@/lib/accessPolicy";
import { computeCashReport } from "@/lib/cashReport";

export default async function RelatorioPage({
  params,
}: {
  params: Promise<{ subdomain: string; eventId: string }>;
}) {
  const { subdomain, eventId } = await params;

  // 🔐 Só o ORG_ADMIN do tenant (ou o Super Admin, só leitura) vê o fechamento de caixa.
  const tenant = await requirePageAccess(subdomain, eventId, "fechamento");

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    include: {
      tenant: true,
      sponsors: true,
      transactions: { select: { method: true, amount: true, eventStaffId: true } },
      cards: { select: { isPaid: true, isSold: true, price: true, type: true, eventStaffId: true } },
      // O nome do voluntário mora no User (EventStaff não tem nome): antes todos saíam como "Vendedor".
      staff: { include: { user: { select: { name: true } } } },
    },
  });

  if (!event) notFound();

  // 🧮 Toda a matemática fica em src/lib/cashReport.ts (função pura, com testes).
  const report = computeCashReport({
    ticketPrice: event.ticketPrice,
    fullHousePrice: event.fullHousePrice,
    cards: event.cards,
    transactions: event.transactions,
    sponsorContributions: event.sponsors.map((s) => s.contribution),
    staff: event.staff.map((s) => ({ id: s.id, name: s.user?.name || "Vendedor" })),
  });

  const totalCartelasGeradas = report.cardsGenerated;
  const cartelasVendidas = report.cardsPaid;
  const totalVendasCents = report.salesCents;
  const totalPatrociniosCents = report.sponsorshipCents;
  const GMV_Cents = report.gmvCents;
  const vendasPixCents = report.pixCents;
  const vendasDinheiroCents = report.cashCents;
  const sellerStats = report.sellers;

  const formatCurrency = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // O servidor roda em UTC: sem o fuso, o horário impresso saía 3h adiantado.
  const formatDateTimeBR = (d: Date) =>
    d.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20">
      
      <header className="print:hidden bg-[#0b0f14] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href={homeFor(tenant.actor, eventId)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-bold">Voltar ao Painel</h1>
          </div>
          <PrintButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-8 bg-white p-10 rounded-xl shadow-xl print:shadow-none print:p-0 print:mt-0">
        
        <div className="border-b-2 border-slate-200 pb-6 mb-8 flex justify-between items-end">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{event.tenant.name}</p>
            <h1 className="text-3xl font-black text-slate-900 mt-1">{event.name}</h1>
            <p className="text-slate-500 mt-1">Fechamento de Caixa e Prestação de Contas</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-400">Data do Relatório</p>
            <p className="font-mono text-slate-800">{formatDateTimeBR(new Date())}</p>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="text-lg font-black uppercase text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" /> Resumo Geral
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total de Patrocínios</p>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(totalPatrociniosCents)}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Vendas (Cartelas)</p>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(totalVendasCents)}</p>
              <p className="text-xs text-slate-400 mt-1">{cartelasVendidas} de {totalCartelasGeradas} cartelas vendidas</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Faturamento Bruto (GMV)</p>
              <p className="text-3xl font-black text-emerald-700">{formatCurrency(GMV_Cents)}</p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-black uppercase text-slate-800 mb-4 flex items-center gap-2">
            <Wallet className="text-blue-500" /> Espelho de Caixa (Vendas)
          </h2>
          <div className="flex gap-6">
            <div className="flex-1 bg-white border-2 border-slate-200 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-bold uppercase">Dinheiro Físico</p>
                <p className="text-xs text-slate-400">A ser recolhido no cofre</p>
              </div>
              <p className="text-3xl font-black text-slate-800">{formatCurrency(vendasDinheiroCents)}</p>
            </div>
            <div className="flex-1 bg-white border-2 border-slate-200 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-bold uppercase">Recebido no PIX</p>
                <p className="text-xs text-slate-400">Na conta da instituição</p>
              </div>
              <div className="flex items-center gap-3">
                <QrCode className="text-slate-300" />
                <p className="text-3xl font-black text-slate-800">{formatCurrency(vendasPixCents)}</p>
              </div>
            </div>
          </div>
        </section>

        {report.byType.FULL_HOUSE.qtd > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-black uppercase text-slate-800 mb-4">Vendas por tipo de cartela</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cartelas de Quina</p>
                <p className="text-2xl font-black text-slate-800">{report.byType.QUINA.qtd}</p>
                <p className="text-sm text-slate-500">{formatCurrency(report.byType.QUINA.total)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cartelas Cheias</p>
                <p className="text-2xl font-black text-slate-800">{report.byType.FULL_HOUSE.qtd}</p>
                <p className="text-sm text-slate-500">{formatCurrency(report.byType.FULL_HOUSE.total)}</p>
              </div>
            </div>
          </section>
        )}

        {report.hasDiscrepancy && (
          <section className="mb-10">
            <div className="flex gap-3 bg-amber-50 border-2 border-amber-300 text-amber-900 p-5 rounded-2xl">
              <AlertTriangle className="shrink-0 text-amber-500" />
              <div className="text-sm">
                <p className="font-black uppercase tracking-wide mb-1">Conferência necessária</p>
                <p>
                  O total das cartelas pagas ({formatCurrency(totalVendasCents)}) é diferente do total dos
                  lançamentos de pagamento ({formatCurrency(report.ledgerCents)}). Diferença:{" "}
                  {formatCurrency(report.diffCents)}. Isso costuma acontecer quando há cartelas marcadas
                  como pagas sem lançamento (por exemplo, pelo modo demonstração) ou quando o preço da
                  cartela foi alterado depois das vendas.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-lg font-black uppercase text-slate-800 mb-4 flex items-center gap-2">
            <Building2 className="text-amber-500" /> Prestação de Contas por Voluntário
          </h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-sm">
                <th className="py-3 font-bold text-slate-600">Vendedor</th>
                <th className="py-3 font-bold text-slate-600 text-center">Cartelas</th>
                <th className="py-3 font-bold text-slate-600 text-right">No PIX</th>
                <th className="py-3 font-bold text-slate-600 text-right">Em Dinheiro (Devolver)</th>
                <th className="py-3 font-bold text-slate-900 text-right">Total Vendido</th>
              </tr>
            </thead>
            <tbody>
              {sellerStats.sort((a, b) => b.total - a.total).map((seller, i) => (
                <tr key={i} className="border-b border-slate-200 text-sm">
                  <td className="py-3 font-bold text-slate-800">{seller.name}</td>
                  <td className="py-3 text-center text-slate-600">{seller.qtd}</td>
                  <td className="py-3 text-right text-slate-600">{formatCurrency(seller.pix)}</td>
                  <td className="py-3 text-right font-black text-red-600">{formatCurrency(seller.dinheiro)}</td>
                  <td className="py-3 text-right font-black text-slate-900">{formatCurrency(seller.total)}</td>
                </tr>
              ))}
              {sellerStats.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-slate-400 italic">Nenhuma venda registrada até o momento.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {event.sponsors.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-lg font-black uppercase text-slate-800 mb-4">Cotas de Patrocínio</h2>
            <div className="grid grid-cols-2 gap-4">
              {event.sponsors.map(sponsor => (
                <div key={sponsor.id} className="flex justify-between items-center border border-slate-200 p-3 rounded-lg">
                  <span className="font-bold text-slate-700">{sponsor.name}</span>
                  <span className="font-mono text-slate-900 font-bold">{formatCurrency(sponsor.contribution)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-20 pt-10 border-t border-slate-300 flex justify-around text-center print:block">
          <div>
            <div className="w-48 h-px bg-slate-800 mx-auto mb-2"></div>
            <p className="text-sm font-bold text-slate-600">Assinatura do Tesoureiro</p>
          </div>
          <div className="print:mt-16">
            <div className="w-48 h-px bg-slate-800 mx-auto mb-2"></div>
            <p className="text-sm font-bold text-slate-600">Assinatura do Auditor (Ação Leve)</p>
          </div>
        </div>

      </main>
    </div>
  );
}