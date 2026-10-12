// src/lib/requireTenant.ts

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma"; // Adicione essa importação se não tiver

export async function requireTenant() {
  const session = await auth();
  
  if (!session?.user?.tenantId) {
    throw new Error("Não autorizado. Faça login.");
  }

  // 🔥 VALIDAÇÃO DE CONTRATO ATIVO
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { active: true, expiresAt: true }
  });

  if (!tenant || !tenant.active) {
    throw new Error("Acesso suspenso pelo Administrador da plataforma.");
  }

  // Se tem data de expiração, e hoje é MAIOR que a data limite
  if (tenant.expiresAt && new Date() > new Date(tenant.expiresAt)) {
    throw new Error("Período de contrato expirado. Contate o suporte.");
  }

  return session.user.tenantId;
}

export async function requireStaffForEvent(eventId: string, capability: 'canSell' | 'canOperate' | 'canVerify') {
  const tenantId = await requireTenant();
  const session = await auth();

  const staff = await prisma.eventStaff.findFirst({
    where: {
      eventId,
      userId: session?.user?.id,
      [capability]: true
    }
  });

  if (!staff) throw new Error(`Sem permissão: ${capability}`);
  return staff;
}

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ PAPÉIS NO SERVIDOR
// A tela esconder um botão NÃO protege nada: qualquer usuário logado pode chamar a
// server action direto. Por isso a checagem de papel mora aqui, dentro de cada action.
//
//  • ORG_ADMIN (dono do tenant) → passa em tudo que é do próprio tenant
//  • STAFF                     → só com a capacidade marcada em EventStaff
//                                 (canSell / canOperate / canVerify) NAQUELE evento
// ─────────────────────────────────────────────────────────────────────────────

export type EventCapability = "canSell" | "canOperate" | "canVerify";

/** Só o administrador da organização (ORG_ADMIN). Retorna o tenantId. */
export async function requireOrgAdmin(): Promise<string> {
  const tenantId = await requireTenant();
  const session = await auth();
  if (session?.user?.role !== "ORG_ADMIN") {
    throw new Error("Sem permissão: apenas o administrador da organização.");
  }
  return tenantId;
}

/** ORG_ADMIN + o evento tem que ser do tenant dele. */
export async function requireEventAdmin(eventId: string) {
  const tenantId = await requireOrgAdmin();
  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
  if (!event) throw new Error("Acesso negado. Evento não encontrado.");
  return { tenantId, event };
}

/**
 * ORG_ADMIN do tenant OU staff do evento com (qualquer uma das) capacidades pedidas.
 * Ex.: requireEventCapability(id, "canOperate")  ou  (id, ["canOperate", "canVerify"])
 */
export async function requireEventCapability(
  eventId: string,
  capability: EventCapability | EventCapability[]
) {
  const tenantId = await requireTenant();
  const session = await auth();

  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
  if (!event) throw new Error("Acesso negado. Evento não encontrado.");

  if (session?.user?.role === "ORG_ADMIN") return { tenantId, event };

  const caps = Array.isArray(capability) ? capability : [capability];
  const staff = await prisma.eventStaff.findFirst({
    where: {
      eventId,
      userId: session?.user?.id,
      OR: caps.map((c) =>
        c === "canSell" ? { canSell: true } : c === "canOperate" ? { canOperate: true } : { canVerify: true }
      ),
    },
    select: { id: true },
  });
  if (!staff) throw new Error(`Sem permissão: ${caps.join(" ou ")}`);

  return { tenantId, event };
}
