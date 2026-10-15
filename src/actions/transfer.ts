// src/actions/transfer.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireTenant, requireStaffForEvent } from "@/lib/requireTenant";
import { pickTransferCards, summarizeHolding, matchesRequestedType } from "@/lib/cardHolding";
import { UNDO_WINDOW_MS } from "@/lib/saleRules";
import { logAudit } from "@/lib/audit";

// Quem sou eu neste evento (o EventStaff do usuário LOGADO — nunca vem do navegador).
async function getMe(eventId: string) {
  const tenantId = await requireTenant();
  const me = await requireStaffForEvent(eventId, "canSell");
  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { id: true } });
  if (!event) throw new Error("Evento inválido ou acesso negado.");
  return me;
}

const nameOf = (s: { user: { name: string | null } | null } | null | undefined) => s?.user?.name || "Voluntário";

// ─────────────────────────────────────────────────────────────────────────────
// VISÃO DO VOLUNTÁRIO NO PDV: meu caixa, minhas cartelas, equipe e pedidos
// ─────────────────────────────────────────────────────────────────────────────
export async function getPdvOverview(eventId: string) {
  try {
    const me = await getMe(eventId);
    const meUser = await prisma.user.findUnique({ where: { id: me.userId }, select: { name: true } });

    const staff = await prisma.eventStaff.findMany({
      where: { eventId, canSell: true },
      select: { id: true, user: { select: { name: true } } },
    });

    const pending = await prisma.card.findMany({
      where: { eventId, eventStaffId: { not: null }, isPaid: false, blocked: false },
      select: { shortId: true, type: true, eventStaffId: true },
    });

    // Meu caixa: o que EU vendi no PDV (cada venda é uma Transaction com cartela)
    const sales = await prisma.transaction.findMany({
      where: { eventId, eventStaffId: me.id, cardId: { not: null } },
      select: { amount: true, method: true },
    });
    const sold = {
      qtd: sales.length,
      total: sales.reduce((s, t) => s + t.amount, 0),
      pix: sales.filter((t) => t.method === "PIX").reduce((s, t) => s + t.amount, 0),
      cash: sales.filter((t) => t.method === "CASH").reduce((s, t) => s + t.amount, 0),
    };

    // Última venda (para o botão "Desfazer")
    let lastSale: { count: number; total: number; at: string; codes: string[]; canUndo: boolean } | null = null;
    const lastTx = await prisma.transaction.findFirst({
      where: { eventId, eventStaffId: me.id, cardId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { batchId: true, createdAt: true },
    });
    if (lastTx?.batchId) {
      const batch = await prisma.transaction.findMany({
        where: { eventId, eventStaffId: me.id, batchId: lastTx.batchId },
        select: { amount: true, card: { select: { shortId: true } } },
      });
      lastSale = {
        count: batch.length,
        total: batch.reduce((s, b) => s + b.amount, 0),
        at: lastTx.createdAt.toISOString(),
        codes: batch.map((b) => b.card?.shortId).filter((c): c is string => !!c).sort(),
        canUndo: Date.now() - lastTx.createdAt.getTime() <= UNDO_WINDOW_MS,
      };
    }

    // Equipe: só QUANTAS cartelas cada um tem na mão (para saber de quem pedir). Sem valores de venda.
    const team = staff
      .filter((s) => s.id !== me.id)
      .map((s) => {
        const h = summarizeHolding(pending.filter((c) => c.eventStaffId === s.id));
        return { id: s.id, name: nameOf(s), total: h.total, quina: h.quina, fullHouse: h.fullHouse };
      });

    const incoming = await prisma.cardTransfer.findMany({
      where: { eventId, ownerId: me.id, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { id: true, type: true, quantity: true, createdAt: true, requester: { select: { user: { select: { name: true } } } } },
    });

    const outgoing = await prisma.cardTransfer.findMany({
      where: { eventId, requesterId: me.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, type: true, quantity: true, status: true, codes: true, createdAt: true, owner: { select: { user: { select: { name: true } } } } },
    });

    return {
      success: true as const,
      me: { id: me.id, name: meUser?.name || "Voluntário", holding: summarizeHolding(pending.filter((c) => c.eventStaffId === me.id)), sold, lastSale },
      team,
      incoming: incoming.map((t) => ({
        id: t.id, type: t.type, quantity: t.quantity, from: nameOf(t.requester), at: t.createdAt.toISOString(),
      })),
      outgoing: outgoing.map((t) => {
        const codes = Array.isArray(t.codes) ? (t.codes as string[]).slice().sort() : [];
        return {
          id: t.id, type: t.type, quantity: t.quantity, status: t.status, to: nameOf(t.owner), at: t.createdAt.toISOString(),
          first: codes[0] ?? null, last: codes[codes.length - 1] ?? null,
        };
      }),
    };
  } catch (error: any) {
    return { success: false as const, error: (error.message as string) || "Não foi possível carregar." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PEDIR cartelas a outro voluntário
// ─────────────────────────────────────────────────────────────────────────────
export async function requestCards(eventId: string, ownerStaffId: string, quantity: number, type: "QUINA" | "FULL_HOUSE") {
  try {
    const me = await getMe(eventId);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) throw new Error("Quantidade inválida (de 1 a 500).");
    if (type !== "QUINA" && type !== "FULL_HOUSE") throw new Error("Tipo de cartela inválido.");
    if (ownerStaffId === me.id) throw new Error("Você não pode pedir cartelas para você mesmo.");

    const owner = await prisma.eventStaff.findFirst({
      where: { id: ownerStaffId, eventId, canSell: true },
      select: { id: true, user: { select: { name: true } } },
    });
    if (!owner) throw new Error("Voluntário não encontrado neste evento.");

    // Feedback imediato: o outro voluntário tem essas cartelas na mão?
    const ownerCards = await prisma.card.findMany({
      where: { eventId, eventStaffId: owner.id, isPaid: false, isSold: false, blocked: false },
      select: { shortId: true, type: true },
    });
    const available = ownerCards.filter((c) => matchesRequestedType(c.type, type)).length;
    if (available < quantity) {
      throw new Error(`${nameOf(owner)} só tem ${available} cartela(s) de ${type === "FULL_HOUSE" ? "cartela cheia" : "quina"} na mão.`);
    }

    const already = await prisma.cardTransfer.count({
      where: { eventId, requesterId: me.id, ownerId: owner.id, type, status: "PENDING" },
    });
    if (already > 0) throw new Error(`Você já tem um pedido aguardando resposta de ${nameOf(owner)}.`);

    await prisma.cardTransfer.create({
      data: { eventId, requesterId: me.id, ownerId: owner.id, type, quantity },
    });

    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message as string };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONDER (quem tem as cartelas): aceitar ou recusar
// ─────────────────────────────────────────────────────────────────────────────
export async function respondToTransfer(eventId: string, transferId: string, accept: boolean, codes?: string[]) {
  try {
    const me = await getMe(eventId);

    if (!accept) {
      const declined = await prisma.cardTransfer.updateMany({
        where: { id: transferId, eventId, ownerId: me.id, status: "PENDING" },
        data: { status: "DECLINED", respondedAt: new Date() },
      });
      if (declined.count === 0) throw new Error("Pedido não encontrado ou já respondido.");
      return { success: true as const, declined: true as const };
    }

    // 🔒 Tudo na MESMA transação: ler o pedido, escolher as cartelas, mudar o dono e fechar o pedido.
    let requesterOut = "";
    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.cardTransfer.findFirst({
        where: { id: transferId, eventId, ownerId: me.id, status: "PENDING" },
      });
      if (!transfer) throw new Error("Pedido não encontrado ou já respondido.");

      const mine = await tx.card.findMany({
        where: { eventId, eventStaffId: me.id, isPaid: false, isSold: false, blocked: false },
        select: { id: true, shortId: true, type: true },
      });

      let chosen: typeof mine | null;
      if (codes && codes.length > 0) {
        // Escolha manual: o voluntário informa exatamente quais cartelas está entregando.
        const wanted = [...new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean))];
        if (wanted.length !== transfer.quantity) throw new Error(`Informe exatamente ${transfer.quantity} código(s).`);
        chosen = mine.filter((c) => wanted.includes(c.shortId) && matchesRequestedType(c.type, transfer.type));
        if (chosen.length !== wanted.length) throw new Error("Algum código não é seu, já foi vendido ou não é do tipo pedido.");
      } else {
        // Padrão: as ÚLTIMAS N da pilha (maiores códigos). Sem bipar nada.
        chosen = pickTransferCards(mine, transfer.type, transfer.quantity);
        if (!chosen) {
          const have = mine.filter((c) => matchesRequestedType(c.type, transfer.type)).length;
          throw new Error(`Você só tem ${have} cartela(s) desse tipo na mão.`);
        }
      }

      const moved = await tx.card.updateMany({
        where: { id: { in: chosen.map((c) => c.id) }, eventId, eventStaffId: me.id, isPaid: false },
        data: { eventStaffId: transfer.requesterId },
      });
      if (moved.count !== chosen.length) throw new Error("As cartelas mudaram enquanto você aceitava. Tente de novo.");

      const closed = await tx.cardTransfer.updateMany({
        where: { id: transfer.id, status: "PENDING" },
        data: { status: "ACCEPTED", respondedAt: new Date(), codes: chosen.map((c) => c.shortId).sort() },
      });
      if (closed.count !== 1) throw new Error("O pedido já foi respondido.");

      requesterOut = transfer.requesterId;
      return chosen.map((c) => c.shortId).sort();
    });

    await logAudit({
      action: "TRANSFER_ACCEPTED",
      eventId,
      metadata: { fromStaff: me.id, toStaff: requesterOut, count: result.length, first: result[0], last: result[result.length - 1] },
    });

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    return { success: true as const, count: result.length, first: result[0], last: result[result.length - 1], codes: result };
  } catch (error: any) {
    return { success: false as const, error: error.message as string };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCELAR um pedido meu que ainda não foi respondido
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelTransfer(eventId: string, transferId: string) {
  try {
    const me = await getMe(eventId);
    const cancelled = await prisma.cardTransfer.updateMany({
      where: { id: transferId, eventId, requesterId: me.id, status: "PENDING" },
      data: { status: "CANCELLED", respondedAt: new Date() },
    });
    if (cancelled.count === 0) throw new Error("Pedido não encontrado ou já respondido.");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message as string };
  }
}
