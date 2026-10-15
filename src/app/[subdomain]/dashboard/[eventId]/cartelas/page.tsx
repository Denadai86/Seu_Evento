// src/app/[subdomain]/dashboard/[eventId]/cartelas/page.tsx
//
// CARTELAS POR ID: em que estado está cada cartela (livre, com voluntário, vendida).
// Serve para conferir a pilha física, achar uma cartela pelo código (e bloquear se for perdida)
// e imprimir a lista de livres / de cada voluntário.

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import PrintButton from "../relatorio/PrintButton";
import BlockCardButton from "./BlockCardButton";
import { requirePageAccess } from "@/lib/eventAccess";
import { canBlockCards } from "@/lib/accessPolicy";
import { cardStatus, summarizeInventory, sortedCodes, type CardStatus } from "@/lib/cardInventory";

type Params = { subdomain: string; eventId: string };
type Search = { q?: string; status?: string; tipo?: string };

const STATUS_LABEL: Record<CardStatus, string> = { LIVRE: "Livre", COM_VOLUNTARIO: "Com voluntário", VENDIDA: "Vendida", BLOQUEADA: "Bloqueada" };
const STATUS_CLS: Record<CardStatus, string> = {
  LIVRE: "bg-slate-200 text-slate-700",
  COM_VOLUNTARIO: "bg-amber-100 text-amber-800",
  VENDIDA: "bg-emerald-100 text-emerald-800",
  BLOQUEADA: "bg-red-100 text-red-800",
};
const typeLabel = (t: string | null | undefined) => (t === "FULL_HOUSE" ? "Cheia" : t === "QUINA" ? "Quina" : "—");

export default async function CartelasPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { subdomain, eventId } = await params;
  const { q, status, tipo } = await searchParams;
  const tenant = await requirePageAccess(subdomain, eventId, "cartelas");

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    select: {
      name: true,
      tenant: { select: { name: true } },
      cards: { select: { shortId: true, type: true, isPaid: true, price: true, eventStaffId: true, blocked: true, blockedReason: true } },
      staff: { select: { id: true, user: { select: { name: true } } } },
    },
  });
  if (!event) notFound();

  const staffName = new Map(event.staff.map((s) => [s.id, s.user?.name || "Voluntário"]));
  const summary = summarizeInventory(event.cards);

  // filtro de tipo
  const byTipo = event.cards.filter((c) =>
    tipo === "QUINA" ? c.type === "QUINA" : tipo === "FULL_HOUSE" ? c.type === "FULL_HOUSE" : tipo === "SEM_TIPO" ? !c.type : true
  );

  // busca por código
  const query = (q ?? "").trim().toUpperCase();
  const found = query ? event.cards.filter((c) => c.shortId.startsWith(query)).sort((a, b) => (a.shortId < b.shortId ? -1 : 1)).slice(0, 30) : [];

  const show = (s: string) => !status || status === s;
  const livres = byTipo.filter((c) => cardStatus(c) === "LIVRE");
  const comVol = byTipo.filter((c) => cardStatus(c) === "COM_VOLUNTARIO");
  const vendidas = byTipo.filter((c) => cardStatus(c) === "VENDIDA");
  const bloqueadas = byTipo.filter((c) => cardStatus(c) === "BLOQUEADA");

  const groupByHolder = (cards: typeof event.cards) => {
    const map = new Map<string, typeof event.cards>();
    for (const c of cards) {
      const key = c.eventStaffId ?? "sem";
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return [...map.entries()]
      .map(([id, list]) => ({ id, name: id === "sem" ? "Sem voluntário" : staffName.get(id) ?? "Voluntário", codes: sortedCodes(list) }))
      .sort((a, b) => b.codes.length - a.codes.length);
  };

  const base = `/dashboard/${eventId}/cartelas`;
  const link = (next: Partial<Search>) => {
    const p = new URLSearchParams();
    const merged = { status, tipo, ...next } as Record<string, string | undefined>;
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border transition ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300 hover:border-slate-500"}`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20 print:bg-white print:pb-0">
      <header className="print:hidden bg-[#0b0f14] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href={tenant.actor.role === "STAFF" ? "/gestao" : `/dashboard/${eventId}/resultados`} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-bold">Cartelas por ID</h1>
          </div>
          <PrintButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-8 print:mt-0 bg-white p-10 rounded-xl shadow-xl print:shadow-none print:p-0">
        <div className="border-b-2 border-slate-200 pb-5 mb-6">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{event.tenant.name}</p>
          <h1 className="text-2xl font-black">{event.name}</h1>
          <p className="text-slate-500">Cartelas por ID — {summary.total} no total</p>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            ["Total", summary.total],
            ["Livres (fábrica)", summary.livre],
            ["Com voluntários", summary.comVoluntario],
            ["Vendidas", summary.vendida],
            ["Bloqueadas", summary.bloqueada],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
              <p className="text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Quina: {summary.byType.QUINA.total} ({summary.byType.QUINA.livre} livres) • Cartela cheia: {summary.byType.FULL_HOUSE.total} (
          {summary.byType.FULL_HOUSE.livre} livres)
          {summary.byType.SEM_TIPO.total > 0 ? ` • Sem tipo (antigas): ${summary.byType.SEM_TIPO.total}` : ""}
        </p>

        <div className="print:hidden space-y-3 mb-8">
          <form action={base} method="get" className="flex gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            {tipo && <input type="hidden" name="tipo" value={tipo} />}
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar pelo código (ex.: AB12)"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase text-sm"
            />
            <button type="submit" className="bg-slate-900 text-white font-bold px-4 rounded-lg flex items-center gap-2 text-sm">
              <Search size={14} /> Buscar
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Link href={link({ status: undefined })} className={chip(!status)}>Livres e com voluntários</Link>
            <Link href={link({ status: "livres" })} className={chip(status === "livres")}>Só livres</Link>
            <Link href={link({ status: "voluntarios" })} className={chip(status === "voluntarios")}>Só com voluntários</Link>
            <Link href={link({ status: "vendidas" })} className={chip(status === "vendidas")}>Vendidas</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={link({ tipo: undefined })} className={chip(!tipo)}>Todos os tipos</Link>
            <Link href={link({ tipo: "QUINA" })} className={chip(tipo === "QUINA")}>Quina</Link>
            <Link href={link({ tipo: "FULL_HOUSE" })} className={chip(tipo === "FULL_HOUSE")}>Cartela cheia</Link>
            {summary.byType.SEM_TIPO.total > 0 && <Link href={link({ tipo: "SEM_TIPO" })} className={chip(tipo === "SEM_TIPO")}>Sem tipo</Link>}
          </div>
        </div>

        {query && (
          <section className="mb-8">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-600 mb-2">Resultado da busca por &quot;{query}&quot;</h2>
            {found.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma cartela com esse código neste evento.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b">
                    <th className="py-2">Código</th><th>Tipo</th><th>Situação</th><th>Voluntário</th><th className="print:hidden">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {found.map((c) => (
                    <tr key={c.shortId} className="border-b border-slate-100">
                      <td className="py-2 font-mono font-bold">{c.shortId}</td>
                      <td>{typeLabel(c.type)}</td>
                      <td><span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_CLS[cardStatus(c)]}`}>{STATUS_LABEL[cardStatus(c)]}</span></td>
                      <td>{c.eventStaffId ? staffName.get(c.eventStaffId) ?? "—" : "—"}</td>
                      <td className="print:hidden">
                        {/* Só administrador e tesoureiro bloqueiam. O conselho só enxerga. */}
                        {canBlockCards(tenant.actor) ? (
                          <BlockCardButton eventId={eventId} shortId={c.shortId} blocked={c.blocked} />
                        ) : (
                          <span className="text-xs text-slate-400">somente leitura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {show("livres") && (
          <section className="mb-8">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-600 mb-2">Livres na fábrica • {livres.length}</h2>
            {livres.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma.</p>
            ) : (
              <p className="font-mono text-[11px] text-slate-700 leading-relaxed break-words">{sortedCodes(livres).join("  ")}</p>
            )}
          </section>
        )}

        {show("voluntarios") && (
          <section className="mb-8">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-600 mb-3">Com voluntários (ainda não vendidas) • {comVol.length}</h2>
            {comVol.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma.</p>
            ) : (
              <div className="space-y-4">
                {groupByHolder(comVol).map((g) => (
                  <div key={g.id} className="break-inside-avoid">
                    <p className="text-sm font-bold">{g.name} • {g.codes.length}</p>
                    <p className="font-mono text-[11px] text-slate-700 leading-relaxed break-words">{g.codes.join("  ")}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {bloqueadas.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-black uppercase tracking-wider text-red-700 mb-2">Bloqueadas (perdidas/canceladas) • {bloqueadas.length}</h2>
            <ul className="text-sm space-y-1">
              {bloqueadas.map((c) => (
                <li key={c.shortId}>
                  <span className="font-mono font-bold">{c.shortId}</span>
                  <span className="text-slate-500"> — {c.blockedReason || "sem motivo informado"}{c.eventStaffId ? ` (estava com ${staffName.get(c.eventStaffId) ?? "voluntário"})` : ""}{c.isPaid ? " — já vendida" : ""}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {status === "vendidas" ? (
          <section className="mb-8">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-600 mb-3">Vendidas • {vendidas.length}</h2>
            {vendidas.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma.</p>
            ) : (
              <div className="space-y-4">
                {groupByHolder(vendidas).map((g) => (
                  <div key={g.id} className="break-inside-avoid">
                    <p className="text-sm font-bold">{g.name} • {g.codes.length}</p>
                    <p className="font-mono text-[11px] text-slate-700 leading-relaxed break-words">{g.codes.join("  ")}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <p className="text-xs text-slate-400 print:hidden">
            {summary.vendida} vendidas não listadas aqui. <Link href={link({ status: "vendidas" })} className="underline">Ver vendidas por voluntário</Link>.
          </p>
        )}
      </main>
    </div>
  );
}
