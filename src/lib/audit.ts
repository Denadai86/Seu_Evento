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

/** Registra que o fiscal conferiu uma cartela NÃO paga (no máximo uma vez a cada 10 minutos por cartela). */
export async function logUnpaidCardCheck(input: { tenantId: string; eventId: string; shortId: string; holderStaffId: string | null }) {
  try {
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const recent = await prisma.auditLog.findMany({
      where: { tenantId: input.tenantId, action: "UNPAID_CARD_CHECKED", createdAt: { gte: since } },
      select: { metadata: true },
      take: 200,
    });
    const already = recent.some((r) => {
      const m = (r.metadata ?? {}) as Record<string, unknown>;
      return m.eventId === input.eventId && m.card === input.shortId;
    });
    if (already) return;
    await logAudit({
      tenantId: input.tenantId,
      action: "UNPAID_CARD_CHECKED",
      eventId: input.eventId,
      metadata: { card: input.shortId, holderStaffId: input.holderStaffId },
    });
  } catch (error) {
    console.error("[UNPAID_CHECK_LOG_ERROR]", error);
  }
}

/** Dos códigos informados, quais JÁ tinham sido conferidos como NÃO pagos (para destacar pagamento depois do bingo). */
export async function codesCheckedUnpaid(eventId: string, codes: string[]): Promise<string[]> {
  if (codes.length === 0) return [];
  try {
    const rows = await prisma.auditLog.findMany({
      where: { action: "UNPAID_CARD_CHECKED", metadata: { path: ["eventId"], equals: eventId } },
      select: { metadata: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const wanted = new Set(codes.map((c) => c.toUpperCase()));
    const found = new Set<string>();
    for (const r of rows) {
      const card = String(((r.metadata ?? {}) as Record<string, unknown>).card ?? "").toUpperCase();
      if (wanted.has(card)) found.add(card);
    }
    return [...found];
  } catch (error) {
    console.error("[CHECKED_UNPAID_LOOKUP_ERROR]", error);
    return [];
  }
}
