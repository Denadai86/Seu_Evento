// src/app/[subdomain]/dashboard/[eventId]/equipe/page.tsx
//
// EQUIPE DO EVENTO: quem trabalha neste evento e o que cada pessoa pode fazer nele.
// A mesma pessoa pode estar em vários eventos, cada um com a sua permissão (vendedora num, tesoureira noutro).
// Só o administrador acessa.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { requirePageAccess } from "@/lib/eventAccess";
import EventTeamClient from "./EventTeamClient";

export const metadata = { title: "Equipe do evento" };

export default async function EventTeamPage({ params }: { params: Promise<{ subdomain: string; eventId: string }> }) {
  const { subdomain, eventId } = await params;
  const tenant = await requirePageAccess(subdomain, eventId, "equipe");

  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId: tenant.id }, select: { id: true, name: true } });
  if (!event) notFound();

  const [staffRows, volunteers, otherEvents] = await Promise.all([
    prisma.eventStaff.findMany({
      where: { eventId, user: { tenantId: tenant.id } },
      select: {
        userId: true, canSell: true, canOperate: true, canVerify: true, canTreasury: true, canAudit: true,
        user: { select: { name: true, username: true } },
      },
    }),
    prisma.user.findMany({
      where: { tenantId: tenant.id, role: "STAFF" },
      select: { id: true, name: true, username: true },
      orderBy: { name: "asc" },
    }),
    prisma.event.findMany({
      where: { tenantId: tenant.id, id: { not: eventId } },
      select: { id: true, name: true, _count: { select: { staff: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Uma linha por pessoa (se algum dia houver linhas repetidas, vale a união das permissões).
  const byUser = new Map<string, {
    userId: string; name: string; username: string;
    canSell: boolean; canOperate: boolean; canVerify: boolean; canTreasury: boolean; canAudit: boolean;
  }>();
  for (const r of staffRows) {
    const cur = byUser.get(r.userId);
    byUser.set(r.userId, {
      userId: r.userId,
      name: r.user.name ?? "Voluntário",
      username: r.user.username ?? "",
      canSell: (cur?.canSell ?? false) || r.canSell,
      canOperate: (cur?.canOperate ?? false) || r.canOperate,
      canVerify: (cur?.canVerify ?? false) || r.canVerify,
      canTreasury: (cur?.canTreasury ?? false) || r.canTreasury,
      canAudit: (cur?.canAudit ?? false) || r.canAudit,
    });
  }
  const members = [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const available = volunteers
    .filter((v) => !byUser.has(v.id))
    .map((v) => ({ id: v.id, name: v.name ?? "Voluntário", username: v.username ?? "" }));

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-200 font-sans pb-24">
      <header className="sticky top-0 z-40 bg-[#0b0f14]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href={`/dashboard/${eventId}`} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition">
            <ArrowLeft size={18} /> Voltar ao evento
          </Link>
          <Link href="/dashboard/equipe" className="text-xs font-bold text-slate-500 hover:text-slate-300 underline underline-offset-2">
            Central de Voluntários (todos os eventos)
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 pt-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500/80 mb-2">Equipe do evento</p>
        <h1 className="text-3xl font-black text-white mb-1">{event.name}</h1>
        <p className="text-slate-500 text-sm mb-8">Quem trabalha neste evento e o que cada pessoa pode fazer nele. Cada evento tem as suas permissões.</p>

        <EventTeamClient
          eventId={eventId}
          members={members}
          available={available}
          otherEvents={otherEvents.map((e) => ({ id: e.id, name: e.name, count: e._count.staff }))}
        />
      </main>
    </div>
  );
}
