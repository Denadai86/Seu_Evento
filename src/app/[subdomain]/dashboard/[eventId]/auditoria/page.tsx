// src/app/[subdomain]/dashboard/[eventId]/auditoria/page.tsx
//
// LOG DE AUDITORIA do evento: quem fez o quê, e quando (pagamentos, vendas desfeitas, cartelas
// bloqueadas, bingos soltos no telão, encerramento…). Só o administrador acessa.
// ?cat=DINHEIRO | CARTELAS | SORTEIO | EVENTO filtra por categoria; ?atencao=1 mostra só o que merece atenção.

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import PrintButton from "../relatorio/PrintButton";
import { requirePageAccess } from "@/lib/eventAccess";

import { AUDIT_ACTIONS, CATEGORY_LABEL, actionsOfCategory, describeAudit, isSensitiveEntry, type AuditCategory } from "@/lib/auditLabels";

const LIMIT = 300;
const ROLE_LABEL: Record<string, string> = { ORG_ADMIN: "Administrador", STAFF: "Voluntário", SUPER_ADMIN: "Plataforma" };
const CATEGORY_CLS: Record<AuditCategory, string> = {
  DINHEIRO: "bg-emerald-100 text-emerald-800",
  CARTELAS: "bg-sky-100 text-sky-800",
  SORTEIO: "bg-violet-100 text-violet-800",
  EQUIPE: "bg-rose-100 text-rose-800",
  EVENTO: "bg-slate-200 text-slate-700",
};

// "Chrome • Windows" a partir do user-agent (só para leitura humana).
function deviceLabel(ua?: string | null): string {
  if (!ua) return "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "navegador";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} • ${os}` : browser;
}

const fmtWhen = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default async function AuditoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string; eventId: string }>;
  searchParams: Promise<{ cat?: string; atencao?: string }>;
}) {
  const { subdomain, eventId } = await params;
  const { cat, atencao } = await searchParams;
  const tenant = await requirePageAccess(subdomain, eventId, "auditoria");

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId: tenant.id },
    select: {
      name: true,
      tenant: { select: { name: true } },
      staff: { select: { id: true, user: { select: { name: true } } } },
    },
  });
  if (!event) notFound();

  const category = (["DINHEIRO", "CARTELAS", "SORTEIO", "EVENTO"] as const).find((c) => c === cat) ?? null;
  const sensitiveOnly = atencao === "1";

  const actionFilter = category
    ? actionsOfCategory(category)
    : sensitiveOnly
      ? Object.entries(AUDIT_ACTIONS).filter(([, v]) => v.sensitive).map(([k]) => k)
      : null;

  // Só os registros DESTE evento (o eventId vai dentro do metadata de cada registro).
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId: tenant.id,
      metadata: { path: ["eventId"], equals: eventId },
      // Sem filtro: as vendas do PDV (uma linha por venda) ficam de fora para não esconder o que importa; estão em "Dinheiro".
      ...(actionFilter ? { action: { in: actionFilter } } : { action: { not: "SALE_COMPLETED" } }),
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
  });

  const userIds = [...new Set(logs.map((l) => l.userId).filter((id): id is string => !!id))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, role: true } })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));
  const staffName = new Map(event.staff.map((s) => [s.id, s.user?.name || "voluntário"]));
  const who = (staffId: string) => (staffId ? staffName.get(staffId) ?? "voluntário" : "voluntário");

  const base = `/dashboard/${eventId}/auditoria`;
  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border transition ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300 hover:border-slate-500"}`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20 print:bg-white print:pb-0">
      <header className="print:hidden bg-[#0b0f14] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href={tenant.actor.role === "STAFF" ? "/gestao" : `/dashboard/${eventId}/resultados`} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-bold">Auditoria</h1>
          </div>
          <PrintButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 print:mt-0 bg-white p-8 rounded-xl shadow-xl print:shadow-none print:p-0">
        <div className="border-b-2 border-slate-200 pb-5 mb-6">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{event.tenant.name}</p>
          <h1 className="text-2xl font-black">{event.name}</h1>
          <p className="text-slate-500">
            Auditoria — {logs.length} registro{logs.length === 1 ? "" : "s"}
            {logs.length === LIMIT ? ` (os ${LIMIT} mais recentes)` : ""}
            {category ? ` • ${CATEGORY_LABEL[category]}` : sensitiveOnly ? " • só o que merece atenção" : ""}
          </p>
        </div>

        <div className="print:hidden flex flex-wrap gap-2 mb-6">
          <Link href={base} className={chip(!category && !sensitiveOnly)}>Tudo</Link>
          {(Object.keys(CATEGORY_LABEL) as AuditCategory[]).map((c) => (
            <Link key={c} href={`${base}?cat=${c}`} className={chip(category === c)}>{CATEGORY_LABEL[c]}</Link>
          ))}
          <Link href={`${base}?atencao=1`} className={`${chip(sensitiveOnly)} flex items-center gap-1`}>
            <ShieldAlert size={12} /> Merece atenção
          </Link>
        </div>

        {logs.length === 0 ? (
          <div className="text-center text-slate-500 border border-dashed border-slate-300 rounded-2xl p-10">
            <p className="font-bold text-slate-700 mb-1">Nenhum registro neste filtro.</p>
            <p className="text-sm">
              O log registra as ações feitas a partir desta atualização do sistema. Eventos anteriores não têm registro.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-300">
                  <th className="py-2 pr-3 whitespace-nowrap">Quando</th>
                  <th className="py-2 pr-3">Quem</th>
                  <th className="py-2 pr-3">O que aconteceu</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const meta = AUDIT_ACTIONS[l.action];
                  const user = l.userId ? userById.get(l.userId) : null;
                  const md = (l.metadata ?? {}) as Record<string, any>;
                  return (
                    <tr key={l.id} className={`border-b border-slate-100 align-top break-inside-avoid ${isSensitiveEntry(l.action, md) ? "bg-amber-50/60" : ""}`}>
                      <td className="py-2.5 pr-3 font-mono text-xs text-slate-500 whitespace-nowrap">{fmtWhen(l.createdAt)}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span className="font-bold">{md.actor?.name ?? user?.name ?? "—"}</span>
                        {(md.actor?.label || user) && (
                          <span className="block text-[10px] text-slate-500">{md.actor?.label ?? ROLE_LABEL[user!.role] ?? user!.role}</span>
                        )}
                        {(md.ip || md.ua) && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {[md.ip, deviceLabel(md.ua)].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mr-2 ${meta ? CATEGORY_CLS[meta.category] : "bg-slate-100 text-slate-500"}`}>
                          {meta?.label ?? l.action}
                        </span>
                        <span className="text-slate-700">{describeAudit(l.action, md, who)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-8 print:hidden">
          Linhas em destaque amarelo merecem atenção: vendas desfeitas, bloqueios e desbloqueios, falsos alarmes, mudanças de permissão,
          PIN redefinido, reset do globo, encerramento e acertos em que o administrador usou uma fase de preço diferente da vigente.
          Cada linha mostra quem fez, com qual papel, de qual IP e aparelho. As vendas do PDV, uma linha por venda, aparecem no filtro Dinheiro.
          O sistema não permite editar nem apagar registros.
        </p>
      </main>
    </div>
  );
}
