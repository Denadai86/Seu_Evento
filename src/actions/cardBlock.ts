// src/actions/cardBlock.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireTreasuryAccess } from "@/lib/eventAccess";
import { buildAuditData } from "@/lib/audit";

// Cartela PERDIDA ou CANCELADA: bloqueada, ela não pode ser vendida, entregue, transferida nem premiada.
// Administrador e tesoureiro bloqueiam/desbloqueiam, sempre com justificativa, e tudo fica no log de auditoria.
export async function blockCard(eventId: string, shortId: string, reason: string) {
  try {
    const { tenantId } = await requireTreasuryAccess(eventId);

    const cleanReason = String(reason ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!cleanReason) return { success: false as const, error: "Informe o motivo (ex.: cartela perdida)." };

    const code = String(shortId ?? "").trim().toUpperCase();
    const card = await prisma.card.findFirst({
      where: { eventId, shortId: code },
      select: { id: true, blocked: true, isPaid: true, eventStaffId: true },
    });
    if (!card) return { success: false as const, error: "Cartela não encontrada neste evento." };
    if (card.blocked) return { success: false as const, error: "Esta cartela já está bloqueada." };

    const auditData = await buildAuditData({
      action: "CARD_BLOCKED",
      eventId,
      tenantId,
      metadata: { shortId: code, reason: cleanReason, wasPaid: card.isPaid, heldBy: card.eventStaffId },
    });

    await prisma.$transaction([
      prisma.card.update({ where: { id: card.id }, data: { blocked: true, blockedAt: new Date(), blockedReason: cleanReason } }),
      prisma.auditLog.create({ data: auditData }),
    ]);

    revalidatePath(`/dashboard/${eventId}/cartelas`);
    return { success: true as const, wasPaid: card.isPaid };
  } catch (error: any) {
    return { success: false as const, error: error.message as string };
  }
}

export async function unblockCard(eventId: string, shortId: string, reason: string) {
  try {
    const { tenantId } = await requireTreasuryAccess(eventId);
    const code = String(shortId ?? "").trim().toUpperCase();

    // Desbloquear também exige justificativa: fica no log para o conselho ler.
    const cleanReason = String(reason ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!cleanReason) return { success: false as const, error: "Informe a justificativa para desbloquear." };

    const card = await prisma.card.findFirst({ where: { eventId, shortId: code }, select: { id: true, blocked: true } });
    if (!card) return { success: false as const, error: "Cartela não encontrada neste evento." };
    if (!card.blocked) return { success: false as const, error: "Esta cartela não está bloqueada." };

    const auditData = await buildAuditData({
      action: "CARD_UNBLOCKED",
      eventId,
      tenantId,
      metadata: { shortId: code, reason: cleanReason },
    });

    await prisma.$transaction([
      prisma.card.update({ where: { id: card.id }, data: { blocked: false, blockedAt: null, blockedReason: null } }),
      prisma.auditLog.create({ data: auditData }),
    ]);

    revalidatePath(`/dashboard/${eventId}/cartelas`);
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message as string };
  }
}
