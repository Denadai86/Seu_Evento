// src/app/[subdomain]/dashboard/[eventId]/patrocinadores/page.tsx
//
// Relatório de EXPOSIÇÃO de patrocinadores: a prova de entrega que o organizador mostra
// ao patrocinador. Versão por patrocinador: ?sponsor=<id> (mostra só os dados dele).

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Megaphone, Gift, Clock } from "lucide-react";
import PrintButton from "../relatorio/PrintButton";
import { requirePageAccess } from "@/lib/eventAccess";

import { sponsorOrderBy } from "@/lib/sponsorRotation";
import { buildSponsorReport, formatDuration, SCREEN_CAP_SECONDS } from "@/lib/sponsorReport";

const TZ = "America/Sao_Paulo";
const fmtDateTime = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtTime = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const fmtMoney = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function PatrocinadoresPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string; eventId: string }>;
  searchParams: Promise<{ sponsor?: string }>;
}) {
  const { subdomain, eventId } = await params;
  const { sponsor: sponsorFilter } = await searchParams;

  const tenant = await requirePageAccess(subdomain, eventId, "patrocinadores");

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    select: {
      name: true,
      tenant: { select: { name: true } },
      sponsors: { orderBy: sponsorOrderBy(), select: { id: true, name: true, logoUrl: true, contribution: true } },
      prizes: { select: { sponsorId: true, prizeName: true, isCompleted: true } },
    },
  });
  if (!event) notFound();

  const exposures = await prisma.sponsorExposure.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: { sponsorId: true, sponsorName: true, createdAt: true },
  });

  const report = buildSponsorReport({ exposures, prizes: event.prizes, sponsors: event.sponsors });

  // Versão para UM patrocinador: nunca mostra os números dos outros.
  const rows = sponsorFilter ? report.rows.filter((r) => r.key === sponsorFilter) : report.rows;
  if (sponsorFilter && rows.length === 0) notFound();
  const single = sponsorFilter ? rows[0] : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20">
      <header className="print:hidden bg-[#0b0f14] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href={sponsorFilter ? `/dashboard/${eventId}/patrocinadores` : tenant.actor.role === "STAFF" ? "/gestao" : `/dashboard/${eventId}`} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-bold">{sponsorFilter ? "Voltar ao relatório geral" : "Voltar ao Painel"}</h1>
          </div>
          <PrintButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-8 bg-white p-10 rounded-xl shadow-xl print:shadow-none print:p-0 print:mt-0">
        <div className="border-b-2 border-slate-200 pb-6 mb-8 flex justify-between items-end">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{event.tenant.name}</p>
            <h1 className="text-3xl font-black text-slate-900 mt-1">{event.name}</h1>
            <p className="text-slate-500 mt-1">
              {single ? `Relatório de Exposição — ${single.name}` : "Relatório de Exposição de Patrocinadores"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-400">Gerado em</p>
            <p className="font-mono text-slate-800">{fmtDateTime(new Date())}</p>
          </div>
        </div>

        {report.totalBalls === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-600">
            <p className="font-bold text-slate-800 mb-2">Nenhuma pedra patrocinada registrada neste evento.</p>
            <p className="text-sm">
              O registro de exposição acontece a cada sorteio feito com patrocinadores cadastrados. Eventos sorteados
              antes desta função existir não têm o registro, e ele não pode ser reconstruído depois.
            </p>
          </div>
        ) : (
          <>
            <section className="mb-10">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Pedras sorteadas</p>
                  <p className="text-3xl font-black text-slate-800">{report.totalBalls}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Duração do sorteio</p>
                  <p className="text-3xl font-black text-slate-800">{formatDuration(report.spanSeconds)}</p>
                  {report.firstAt && report.lastAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      das {fmtTime(report.firstAt)} às {fmtTime(report.lastAt)}
                    </p>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Patrocinadores</p>
                  <p className="text-3xl font-black text-slate-800">{event.sponsors.length}</p>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              {rows.map((row) => (
                <article key={row.key} className="border-2 border-slate-200 rounded-2xl p-6 break-inside-avoid">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-4 min-w-0">
                      {row.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.logoUrl} alt={row.name} className="h-14 max-w-[8rem] object-contain" />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <Megaphone size={22} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="text-xl font-black text-slate-900 truncate">{row.name}</h2>
                        {row.removed && <p className="text-xs text-slate-400">patrocinador removido do evento depois do sorteio</p>}
                        {row.contribution > 0 && <p className="text-sm text-slate-500">Cota: {fmtMoney(row.contribution)}</p>}
                      </div>
                    </div>
                    {!sponsorFilter && row.id && (
                      <Link
                        href={`/dashboard/${eventId}/patrocinadores?sponsor=${row.id}`}
                        className="print:hidden shrink-0 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                      >
                        Versão para o patrocinador
                      </Link>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Pedras oferecidas</p>
                      <p className="text-2xl font-black text-slate-800">{row.balls}</p>
                      <p className="text-xs text-slate-400">{row.sharePct.toFixed(0)}% das pedras</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock size={12} /> Tempo em tela (estimado)
                      </p>
                      <p className="text-2xl font-black text-slate-800">{formatDuration(row.screenSeconds)}</p>
                      <p className="text-xs text-slate-400">cartão &quot;Pedra oferecida por&quot;</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Gift size={12} /> Prêmios oferecidos
                      </p>
                      <p className="text-2xl font-black text-slate-800">{row.prizes.length}</p>
                      <p className="text-xs text-slate-400">{row.prizesDelivered} já entregue(s)</p>
                    </div>
                  </div>

                  {row.prizes.length > 0 && (
                    <ul className="mt-4 text-sm text-slate-600 list-disc list-inside">
                      {row.prizes.map((p, i) => (
                        <li key={i}>
                          {p.prizeName} {p.isCompleted ? "— entregue" : "— pendente"}
                        </li>
                      ))}
                    </ul>
                  )}

                  {row.id && (
                    <p className="mt-4 text-xs text-slate-400">
                      Além disso, a marca ficou visível na faixa de patrocinadores do telão durante todo o sorteio.
                    </p>
                  )}
                </article>
              ))}
            </section>

            <p className="mt-10 text-xs text-slate-400 leading-relaxed border-t border-slate-200 pt-4">
              Como ler: &quot;pedras oferecidas&quot; e &quot;prêmios&quot; são registros do sistema. O &quot;tempo em tela&quot; é uma
              estimativa: soma o intervalo até a próxima pedra (no máximo {formatDuration(SCREEN_CAP_SECONDS)} por pedra) e
              pressupõe o telão ligado durante o sorteio.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
