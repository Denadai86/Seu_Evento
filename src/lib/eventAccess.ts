// src/lib/eventAccess.ts
//
// Guardas de acesso às telas de gestão e às ações da tesouraria. A decisão mora em accessPolicy.ts (pura);
// aqui só buscamos no banco quem é a pessoa e quais permissões ela tem NAQUELE evento.
// O proxy também barra voluntário em /dashboard, mas a guarda de verdade é esta (defesa em profundidade).

import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireTenant } from "@/lib/requireTenant";
import { canViewPage, homeFor, type Actor, type PageKey, type Role } from "@/lib/accessPolicy";

async function loadActor(role: Role, userId: string, eventId: string): Promise<Actor> {
  if (role !== "STAFF") return { role };
  // Por segurança, se algum dia houver linhas repetidas (usuário, evento), vale a união das permissões.
  const rows = await prisma.eventStaff.findMany({
    where: { eventId, userId },
    select: { canTreasury: true, canAudit: true },
  });
  return { role, canTreasury: rows.some((r) => r.canTreasury), canAudit: rows.some((r) => r.canAudit) };
}

/** Guarda das PÁGINAS de gestão. Devolve o tenant (id e nome) e quem está olhando. */
export async function requirePageAccess(subdomain: string, eventId: string, page: PageKey) {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  const tenant = await prisma.tenant.findUnique({ where: { subdomain }, select: { id: true, name: true } });
  if (!tenant) notFound();

  const role = session.user.role as Role;
  if (role !== "SUPER_ADMIN" && session.user.tenantId !== tenant.id) redirect("/entrar");

  const actor = await loadActor(role, session.user.id, eventId);
  if (!canViewPage(actor, page)) redirect(role === "STAFF" ? "/gestao" : homeFor(actor, eventId));

  return { id: tenant.id, name: tenant.name, actor, userId: session.user.id as string };
}

/** Guarda das AÇÕES da tesouraria: administrador do tenant OU tesoureiro DESTE evento. */
export async function requireTreasuryAccess(eventId: string) {
  const tenantId = await requireTenant(); // também valida o contrato ativo
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) throw new Error("Usuário não autenticado.");

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { id: true, ticketPrice: true, fullHousePrice: true },
  });
  if (!event) throw new Error("Acesso negado. Evento não encontrado.");

  const role = session?.user?.role as Role;
  if (role === "ORG_ADMIN") return { tenantId, event, isAdmin: true as const, userId };

  const actor = await loadActor(role, userId, eventId);
  if (role === "STAFF" && actor.canTreasury) return { tenantId, event, isAdmin: false as const, userId };

  throw new Error("Sem permissão: apenas o administrador ou o tesoureiro do evento.");
}

/** O voluntário tem alguma permissão de gestão (tesoureiro/conselho) em algum evento? */
export async function hasManagementAccess(userId: string) {
  const n = await prisma.eventStaff.count({
    where: { userId, OR: [{ canTreasury: true }, { canAudit: true }] },
  });
  return n > 0;
}
