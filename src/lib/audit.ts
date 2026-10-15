// src/lib/audit.ts
//
// Registro de auditoria: quem fez o quê, quando, com qual papel e de onde. É "best-effort": se gravar falhar,
// a operação principal NÃO pode falhar (um sorteio ou um pagamento não pode parar por causa do log).
// O texto de cada ação fica em src/lib/auditLabels.ts.
//
// Cada registro guarda, além dos dados da ação: o NOME e o PAPEL de quem fez (como estavam naquele momento),
// o endereço IP e o aparelho. Serve para o administrador e o conselho investigarem qualquer contestação,
// inclusive de dentro da própria equipe.

import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { managementRoleLabel, type Role } from "@/lib/accessPolicy";

type AuditInput = {
  action: string;
  eventId?: string; // ausente nas ações da conta/equipe (não pertencem a um evento)
  tenantId?: string | null;
  metadata?: Record<string, unknown>;
};

/** Monta a linha do log (com as evidências de quem fez). Use em `prisma.auditLog.create({ data })`. */
export async function buildAuditData(input: AuditInput) {
  const session = await auth();

  let ip: string | null = null;
  let ua: string | null = null;
  try {
    const h = await headers();
    ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null;
    ua = (h.get("user-agent") ?? "").slice(0, 160) || null;
  } catch {
    // fora de um pedido web (ex.: script): segue sem IP/aparelho
  }

  const role = session?.user?.role as Role | undefined;
  let label: string | null = null;
  if (role === "STAFF" && session?.user?.id && input.eventId) {
    const rows = await prisma.eventStaff.findMany({
      where: { eventId: input.eventId, userId: session.user.id },
      select: { canSell: true, canOperate: true, canVerify: true, canTreasury: true, canAudit: true },
    });
    const mgmt = managementRoleLabel({ role, canTreasury: rows.some((r) => r.canTreasury), canAudit: rows.some((r) => r.canAudit) });
    const duties = [
      rows.some((r) => r.canSell) ? "Vendedor" : null,
      rows.some((r) => r.canOperate) ? "Palco" : null,
      rows.some((r) => r.canVerify) ? "Fiscal" : null,
    ].filter(Boolean);
    label = mgmt !== "Voluntário" ? mgmt : duties.length ? `Voluntário (${duties.join(", ")})` : "Voluntário";
  } else if (role) {
    label = managementRoleLabel({ role });
  }

  return {
    action: input.action,
    userId: session?.user?.id ?? null,
    tenantId: input.tenantId ?? session?.user?.tenantId ?? null,
    metadata: {
      ...(input.eventId ? { eventId: input.eventId } : {}),
      ...(input.metadata ?? {}),
      actor: { name: session?.user?.name ?? null, role: role ?? null, label },
      ip,
      ua,
    } as Prisma.InputJsonValue,
  };
}

export async function logAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({ data: await buildAuditData(input) });
  } catch (error) {
    console.error("[AUDIT_LOG_ERROR]", input.action, error);
  }
}
