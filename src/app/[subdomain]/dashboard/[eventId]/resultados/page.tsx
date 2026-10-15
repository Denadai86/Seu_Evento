// src/app/[subdomain]/dashboard/[eventId]/resultados/page.tsx
//
// PAINEL DE RESULTADOS: visão de tudo que o evento já registrou. Só mostra o que o sistema sabe
// (vendas e acertos têm horário; a data de uma venda em papel não é registrada).
// Os documentos para IMPRIMIR (caixa, patrocinadores, extratos) abrem com um clique.

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, FileSignature, Megaphone, ReceiptText, AlertTriangle, Ticket, ShieldCheck } from "lucide-react";
import { requirePageAccess } from "@/lib/eventAccess";
import { canSeeRanking } from "@/lib/accessPolicy";
import { computeCashReport } from "@/lib/cashReport";
import { buildTimeline, buildByPrice, buildStock, pendingByStaff, buildDrawSummary } from "@/lib/dashboardData";
import { buildSponsorReport, formatDuration } from "@/lib/sponsorReport";
import TimelineChart from "@/components/charts/TimelineChart";
import HBarChart from "@/components/charts/HBarChart";
import DonutChart from "@/components/charts/DonutChart";
import StackBar from "@/components/charts/StackBar";
import { brl, COLORS } from "@/components/charts/format";
import AutoRefresh from "./AutoRefresh";
import { buildRanking, type RankBy } from "@/lib/ranking";

const TZ = "America/Sao_Paulo";
const fmtClock = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-[#111827] border border-emerald-900/30 rounded-3xl p-6 shadow-xl ${className}`}>
      <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Kpi({ label, value, sub, accent = "text-white" }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#111827] border border-emerald-900/30 rounded-2xl p-5 shadow-lg">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">{label}</p>
      <p className={`text-2xl sm:text-3xl font-black leading-none ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-2">{sub}</p>}
    </div>
  );
}

function Legend({ items }: { items: { label: string; value: string; color: string }[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((i) => (
        <li key={i.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-sm" style={{ background: i.color }} />
            {i.label}
          </span>
          <span className="font-bold text-white">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ResultadosPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string; eventId: string }>;
  searchParams: Promise<{ rank?: string }>;
}) {
  const { subdomain, eventId } = await params;
  const { rank } = await searchParams;
  const rankBy: RankBy = rank === "qtd" ? "qtd" : "valor";
  const tenant = await requirePageAccess(subdomain, eventId, "resultados");

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    select: {
      name: true,
      ticketPrice: true,
      fullHousePrice: true,
      tenant: { select: { name: true } },
      sponsors: { select: { id: true, name: true, logoUrl: true, contribution: true } },
      prizes: { select: { sponsorId: true, prizeName: true, isCompleted: true } },
      cards: { select: { type: true, isPaid: true, isSold: true, price: true, eventStaffId: true, blocked: true } },
      transactions: { select: { method: true, amount: true, eventStaffId: true, cardId: true, createdAt: true } },
      staff: { select: { id: true, user: { select: { name: true } } } },
    },
  });
  if (!event) notFound();

  const exposures = await prisma.sponsorExposure.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: { sponsorId: true, sponsorName: true, createdAt: true },
  });

  // 🧮 Toda a matemática mora em src/lib (funções puras, com testes).
  const staff = event.staff.map((s) => ({ id: s.id, name: s.user?.name || "Vendedor" }));
  const report = computeCashReport({
    ticketPrice: event.ticketPrice,
    fullHousePrice: event.fullHousePrice,
    cards: event.cards,
    transactions: event.transactions,
    sponsorContributions: event.sponsors.map((s) => s.contribution),
    staff,
  });
  const timeline = buildTimeline(event.transactions);
  const byPrice = buildByPrice(event.cards, event.ticketPrice, event.fullHousePrice);
  const stock = buildStock(event.cards);
  const pending = pendingByStaff(event.cards);
  const draw = buildDrawSummary(exposures.map((e) => e.createdAt));
  const sponsorReport = buildSponsorReport({ exposures, prizes: event.prizes, sponsors: event.sponsors });

  const avgTicket = report.cardsPaid > 0 ? report.salesCents / report.cardsPaid : 0;
  const prizesDelivered = event.prizes.filter((p) => p.isCompleted).length;
  const base = `/dashboard/${eventId}`;

  const sellersSorted = [...report.sellers].sort((a, b) => b.total - a.total);
  const ranking = buildRanking(report.sellers, rankBy);
  const methodSegments = [
    { label: "PIX", value: report.pixCents, color: COLORS.pix },
    { label: "Dinheiro", value: report.cashCents, color: COLORS.cash },
    ...(report.cardCents > 0 ? [{ label: "Cartão", value: report.cardCents, color: "#a78bfa" }] : []),
  ];
  const typeSegments = [
    { label: "Quina", value: report.byType.QUINA.qtd, color: COLORS.quina },
    { label: "Cartela cheia", value: report.byType.FULL_HOUSE.qtd, color: COLORS.full },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0b0f14]/85 backdrop-blur-md border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-4">
            <Link href={tenant.actor.role === "STAFF" ? "/gestao" : base} className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide">{event.name}</h1>
              <p className="text-emerald-500/70 text-xs font-bold uppercase tracking-widest">
                Painel de Resultados • {event.tenant.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Atualizado às {fmtClock(new Date())}</span>
            <AutoRefresh seconds={30} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
        {/* IMPRESSÕES AO CLIQUE */}
        <section className="bg-[#111827] border border-emerald-900/30 rounded-3xl p-5 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3 text-slate-300 shrink-0">
            <Printer size={20} className="text-emerald-400" />
            <span className="font-black text-sm">Imprimir</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={`${base}/relatorio`} target="_blank" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition">
              <FileSignature size={16} /> Fechamento de Caixa
            </a>
            <a href={`${base}/extrato`} target="_blank" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition border border-slate-700">
              <ReceiptText size={16} /> Extrato por Voluntário
            </a>
            <a href={`${base}/cartelas`} target="_blank" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition border border-slate-700">
              <Ticket size={16} /> Cartelas por ID
            </a>
            <a href={`${base}/auditoria`} target="_blank" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition border border-slate-700">
              <ShieldCheck size={16} /> Auditoria
            </a>
            <a href={`${base}/patrocinadores`} target="_blank" className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition">
              <Megaphone size={16} /> Relatório de Patrocinadores
            </a>
          </div>
        </section>

        {report.hasDiscrepancy && (
          <div className="flex gap-3 bg-amber-500/10 border border-amber-500/40 text-amber-200 p-4 rounded-2xl text-sm">
            <AlertTriangle className="shrink-0 text-amber-400" size={20} />
            <p>
              <strong>Conferência necessária:</strong> o total das cartelas pagas ({brl(report.salesCents)}) difere do total dos
              lançamentos ({brl(report.ledgerCents)}). Veja o Fechamento de Caixa para o detalhe.
            </p>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Faturamento bruto" value={brl(report.gmvCents)} sub={`cartelas ${brl(report.salesCents)} + patrocínios ${brl(report.sponsorshipCents)}`} accent="text-emerald-400" />
          <Kpi label="Cartelas pagas" value={`${report.cardsPaid}`} sub={`de ${report.cardsGenerated} geradas (${pct(report.cardsPaid, report.cardsGenerated)}%)`} />
          <Kpi label="Ticket médio" value={brl(avgTicket)} sub="valor médio por cartela paga" />
          <Kpi
            label="Pico de vendas"
            value={timeline.peak ? brl(timeline.peak.pdv + timeline.peak.settlement) : "—"}
            sub={timeline.peak ? `em ${timeline.peak.fullLabel}` : "ainda sem vendas"}
            accent="text-sky-300"
          />
          <Kpi label="PIX" value={brl(report.pixCents)} sub={`${pct(report.pixCents, report.salesCents)}% das vendas`} accent="text-cyan-300" />
          <Kpi label="Dinheiro" value={brl(report.cashCents)} sub={`${pct(report.cashCents, report.salesCents)}% das vendas`} accent="text-amber-300" />
          <Kpi label="Pedras sorteadas" value={draw.balls > 0 ? `${draw.balls}` : "—"} sub={draw.balls > 0 ? `em ${formatDuration(draw.spanSeconds)} • ${draw.perMinute.toFixed(1)}/min` : "registro começa no 1º sorteio"} />
          <Kpi label="Prêmios entregues" value={`${prizesDelivered}/${event.prizes.length}`} sub="rodadas encerradas" />
        </div>

        {/* LINHA DO TEMPO */}
        <Card title="Linha do tempo de vendas">
          <TimelineChart points={timeline.points} idPrefix="resultados-tl" />
          <p className="text-xs text-slate-500 mt-3">
            O PDV registra cada cartela na hora. Cartelas vendidas em papel entram no horário do <em>acerto</em> da tesouraria
            (barra laranja), porque a data da venda em papel não é registrada.
          </p>
        </Card>

        {/* RANKING (só o administrador vê: serve para premiar com uma prenda, sem metas) */}
        {canSeeRanking(tenant.actor) && (
        <Card title="Ranking de vendedores • só você vê">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex gap-2">
              {([["valor", "Por valor vendido"], ["qtd", "Por cartelas vendidas"]] as const).map(([v, label]) => (
                <Link
                  key={v}
                  href={`${base}/resultados?rank=${v}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    rankBy === v ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
            <a href={`${base}/ranking?by=${rankBy}`} target="_blank" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
              Imprimir ranking
            </a>
          </div>

          {ranking.length === 0 ? (
            <p className="text-sm text-slate-500">Ninguém vendeu ainda.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {ranking.filter((r) => r.position <= 3).slice(0, 3).map((r) => (
                  <div key={r.id} className={`rounded-2xl p-5 border ${r.position === 1 ? "border-yellow-500/50 bg-yellow-500/5" : "border-slate-700 bg-black/30"}`}>
                    <p className="text-3xl">{["🥇", "🥈", "🥉"][r.position - 1]}</p>
                    <p className="text-lg font-black text-white mt-2 truncate">{r.name}</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{rankBy === "valor" ? brl(r.total) : `${r.qtd} cartelas`}</p>
                    <p className="text-xs text-slate-500 mt-1">{rankBy === "valor" ? `${r.qtd} cartelas` : brl(r.total)}</p>
                  </div>
                ))}
              </div>
              {ranking.filter((r) => r.position > 3).length > 0 && (
                <ol className="space-y-2 text-sm">
                  {ranking.filter((r) => r.position > 3).map((r) => (
                    <li key={r.id} className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-300"><strong className="text-slate-500 mr-3">{r.position}º</strong>{r.name}</span>
                      <span className="font-bold text-white">{rankBy === "valor" ? `${brl(r.total)} • ${r.qtd} cartelas` : `${r.qtd} cartelas • ${brl(r.total)}`}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
          <p className="text-xs text-slate-500 mt-4">
            Conta tudo que foi creditado ao voluntário: vendas no PDV e cartelas acertadas na tesouraria. Os voluntários não veem este ranking.
          </p>
        </Card>
        )}

        {/* VOLUNTÁRIOS + MÉTODO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Vendas por voluntário" className="lg:col-span-2">
            <HBarChart
              rows={sellersSorted.slice(0, 8).map((s) => ({
                label: s.name,
                sub: `${s.qtd} cartelas • ${pct(s.pix, s.total)}% PIX`,
                value: s.total,
                display: brl(s.total),
              }))}
              emptyText="Nenhum voluntário vendeu ainda."
            />
          </Card>
          <Card title="Forma de pagamento">
            <div className="flex flex-col items-center gap-5">
              <DonutChart segments={methodSegments} centerTop={`${pct(report.pixCents, report.salesCents)}%`} centerBottom="em PIX" />
              <div className="w-full">
                <Legend items={methodSegments.map((s) => ({ label: s.label, value: brl(s.value), color: s.color }))} />
              </div>
            </div>
          </Card>
        </div>

        {/* TIPO + PREÇO + ESTOQUE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Tipo de cartela vendida">
            <div className="flex flex-col items-center gap-5">
              <DonutChart segments={typeSegments} centerTop={`${report.cardsPaid}`} centerBottom="cartelas pagas" />
              <div className="w-full">
                <Legend
                  items={[
                    { label: "Quina", value: `${report.byType.QUINA.qtd} • ${brl(report.byType.QUINA.total)}`, color: COLORS.quina },
                    { label: "Cartela cheia", value: `${report.byType.FULL_HOUSE.qtd} • ${brl(report.byType.FULL_HOUSE.total)}`, color: COLORS.full },
                  ]}
                />
              </div>
            </div>
          </Card>
          <Card title="Vendas por preço praticado">
            <HBarChart
              color={COLORS.pdv}
              rows={byPrice.map((p) => ({
                label: brl(p.price),
                sub: `${p.qtd} cartelas`,
                value: p.total,
                display: brl(p.total),
              }))}
              emptyText="Nenhuma cartela paga ainda."
            />
            <p className="text-xs text-slate-500 mt-2">Mostra o efeito das fases de preço (pré-venda, perto do evento, no evento).</p>
          </Card>
          <Card title="Estoque de cartelas">
            <StackBar
              segments={[
                { label: "Livres", value: stock.free, color: COLORS.free },
                { label: "Com voluntários", value: stock.withVolunteers, color: COLORS.withVolunteers },
                { label: "Pagas", value: stock.paid, color: COLORS.paid },
                { label: "Bloqueadas", value: stock.blocked, color: "#ef4444" },
              ]}
            />
            <div className="mt-5">
              <Legend
                items={[
                  { label: "Livres na fábrica", value: `${stock.free}`, color: COLORS.free },
                  { label: "Com voluntários (a acertar)", value: `${stock.withVolunteers}`, color: COLORS.withVolunteers },
                  { label: "Pagas", value: `${stock.paid}`, color: COLORS.paid },
                  ...(stock.blocked > 0 ? [{ label: "Bloqueadas (perdidas)", value: `${stock.blocked}`, color: "#ef4444" }] : []),
                  { label: "Total gerado", value: `${stock.total}`, color: "transparent" },
                ]}
              />
            </div>
          </Card>
        </div>

        {/* PATROCINADORES */}
        <Card title="Exposição dos patrocinadores">
          <HBarChart
            color="#f59e0b"
            rows={sponsorReport.rows.slice(0, 5).map((r) => ({
              label: r.name,
              sub: `${r.sharePct.toFixed(0)}% das pedras`,
              value: r.balls,
              display: `${r.balls} pedras`,
            }))}
            emptyText="Nenhuma pedra patrocinada registrada ainda."
          />
          <a href={`${base}/patrocinadores`} target="_blank" className="inline-block mt-3 text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2">
            Abrir relatório completo para imprimir
          </a>
        </Card>

        {/* RANKING DE VOLUNTÁRIOS */}
        <Card title="Prestação de contas por voluntário">
          {sellersSorted.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma venda registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <th className="py-2 pr-4">Voluntário</th>
                    <th className="py-2 pr-4 text-right">Cartelas</th>
                    <th className="py-2 pr-4 text-right">PIX</th>
                    <th className="py-2 pr-4 text-right">Dinheiro</th>
                    <th className="py-2 pr-4 text-right">Total</th>
                    <th className="py-2 pr-4 text-right">% do total</th>
                    <th className="py-2 text-right">Ainda com ele</th>
                  </tr>
                </thead>
                <tbody>
                  {sellersSorted.map((s) => (
                    <tr key={s.id} className="border-b border-slate-800/60">
                      <td className="py-3 pr-4 font-bold text-white">{s.name}</td>
                      <td className="py-3 pr-4 text-right">{s.qtd}</td>
                      <td className="py-3 pr-4 text-right text-cyan-300">{brl(s.pix)}</td>
                      <td className="py-3 pr-4 text-right text-amber-300">{brl(s.dinheiro)}</td>
                      <td className="py-3 pr-4 text-right font-black text-white">{brl(s.total)}</td>
                      <td className="py-3 pr-4 text-right text-slate-400">{pct(s.total, report.salesCents)}%</td>
                      <td className="py-3 text-right text-slate-400">{s.id === "sem-vendedor" ? "—" : `${pending.get(s.id) ?? 0} cartelas`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
