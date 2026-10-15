// src/app/[subdomain]/gestao/page.tsx
//
// "Gestão": a tela inicial de quem tem um papel de gestão (Tesoureiro e/ou Conselho) em algum evento.
// Mostra, por evento, só as telas que a pessoa pode abrir. O administrador vai para o painel normal.

import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Wallet, ShieldCheck, ShoppingCart } from "lucide-react";
import { canViewPage, managementRoleLabel, type PageKey } from "@/lib/accessPolicy";
import LogoutLink from "./LogoutLink";

const PAGES: { key: PageKey; label: string; path: string }[] = [
  { key: "tesouraria", label: "Tesouraria", path: "tesouraria" },
  { key: "fechamento", label: "Fechamento de Caixa", path: "relatorio" },
  { key: "extrato", label: "Extrato por Voluntário", path: "extrato" },
  { key: "cartelas", label: "Cartelas por ID", path: "cartelas" },
  { key: "resultados", label: "Painel de Resultados", path: "resultados" },
  { key: "patrocinadores", label: "Relatório de Patrocinadores", path: "patrocinadores" },
  { key: "auditoria", label: "Auditoria", path: "auditoria" },
];

const STATUS: Record<string, string> = { ACTIVE: "Ativo", DRAFT: "Rascunho", FINISHED: "Encerrado" };

export default async function GestaoPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");
  if (session.user.role === "ORG_ADMIN") redirect("/dashboard");
  if (session.user.role !== "STAFF") redirect("/entrar");

  const tenant = await prisma.tenant.findUnique({ where: { subdomain }, select: { id: true, name: true } });
  if (!tenant || tenant.id !== session.user.tenantId) redirect("/entrar");

  const rows = await prisma.eventStaff.findMany({
    where: { userId: session.user.id, event: { tenantId: tenant.id }, OR: [{ canTreasury: true }, { canAudit: true }] },
    select: {
      canTreasury: true,
      canAudit: true,
      event: { select: { id: true, name: true, status: true, createdAt: true } },
    },
  });
  if (rows.length === 0) redirect("/vendas");

  // Uma pessoa pode ter mais de uma linha por evento (sem unique no banco): junta as permissões.
  const byEvent = new Map<string, { event: (typeof rows)[number]["event"]; canTreasury: boolean; canAudit: boolean }>();
  for (const r of rows) {
    const cur = byEvent.get(r.event.id) ?? { event: r.event, canTreasury: false, canAudit: false };
    cur.canTreasury ||= r.canTreasury;
    cur.canAudit ||= r.canAudit;
    byEvent.set(r.event.id, cur);
  }
  const events = [...byEvent.values()].sort(
    (a, b) => Number(b.event.status === "ACTIVE") - Number(a.event.status === "ACTIVE") || b.event.createdAt.getTime() - a.event.createdAt.getTime()
  );

  const sells = await prisma.eventStaff.count({ where: { userId: session.user.id, canSell: true } });

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans p-6 pb-20">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-emerald-500/70 text-xs font-bold uppercase tracking-widest">{tenant.name}</p>
            <h1 className="text-3xl font-black text-white">Gestão</h1>
            <p className="text-slate-400 text-sm mt-1">Olá, {session.user.name ?? "voluntário"}. Estas são as telas liberadas para você.</p>
          </div>
          <LogoutLink />
        </div>

        {sells > 0 && (
          <Link href="/vendas" className="flex items-center gap-3 mb-6 bg-[#111827] border border-emerald-900/30 hover:border-emerald-500/50 rounded-2xl p-4 transition">
            <ShoppingCart size={20} className="text-emerald-400" />
            <span className="font-bold text-white">Abrir o caixa (PDV)</span>
          </Link>
        )}

        <div className="space-y-5">
          {events.map(({ event, canTreasury, canAudit }) => {
            const actor = { role: "STAFF" as const, canTreasury, canAudit };
            const allowed = PAGES.filter((p) => canViewPage(actor, p.key));
            return (
              <section key={event.id} className="bg-[#111827] border border-emerald-900/30 rounded-3xl p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-white truncate">{event.name}</h2>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      {canTreasury ? <Wallet size={12} /> : <ShieldCheck size={12} />}
                      {managementRoleLabel(actor)}
                    </p>
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${event.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                    {STATUS[event.status] ?? event.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allowed.map((p) => (
                    <Link
                      key={p.key}
                      href={`/dashboard/${event.id}/${p.path}`}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-slate-200 font-bold text-sm px-4 py-3 rounded-xl transition"
                    >
                      {p.label}
                    </Link>
                  ))}
                </div>
                {!canTreasury && (
                  <p className="text-[11px] text-slate-500 mt-4">Acesso somente leitura: você acompanha, mas não altera nada.</p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
