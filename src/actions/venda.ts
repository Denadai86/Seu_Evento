// src/actions/venda.ts
"use server";

import prisma from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { requireTenant } from "@/lib/requireTenant";

// ─────────────────────────────────────────────────────────────────────────────
// PROCESSAR VENDA EM LOTE (PDV — transação atômica)
// ─────────────────────────────────────────────────────────────────────────────
export async function processBatchSale(
  eventId: string,
  shortIds: string[],
  method: PaymentMethod,
  eventStaffId: string // 🔥 Mudou de sellerId para eventStaffId
) {
  if (!shortIds || shortIds.length === 0) return { success: false, error: "Carrinho vazio." };

  const tenantId = await requireTenant();

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { ticketPrice: true, isActive: true, tenantId: true, status: true },
    });

    if (!event || event.tenantId !== tenantId) return { success: false, error: "Evento inválido." };
    if (event.status === "ENCERRADO") return { success: false, error: "Este evento já está encerrado. O caixa encontra-se fechado." };
    if (!event.isActive) return { success: false, error: "Evento não está ativo. O caixa foi encerrado pela administração." };

    const ticketPrice = event.ticketPrice > 0 ? event.ticketPrice : 2500;

    await prisma.$transaction(async (tx) => {
      const existingCards = await tx.card.findMany({
        where: { shortId: { in: shortIds }, eventId },
      });

      if (existingCards.length !== shortIds.length) {
        throw new Error("Uma ou mais cartelas não pertencem a este evento.");
      }

      const alreadySold = existingCards.filter((c) => c.isSold);
      if (alreadySold.length > 0) {
        throw new Error(
          `Conflito! Cartelas já vendidas: ${alreadySold.map((c) => c.shortId).join(", ")}`
        );
      }

      // Atualiza cartelas
      await tx.card.updateMany({
        where: { shortId: { in: shortIds } },
        data: { isSold: true, isPaid: true, eventStaffId, price: ticketPrice },
      });

      // Registra caixa financeiro atrelado à escala do funcionário
      await tx.transaction.createMany({
        data: existingCards.map((card) => ({
          eventId,
          cardId: card.id,
          eventStaffId, // 🔥 Mudou aqui
          amount: ticketPrice,
          method,
        })),
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Falha crítica ao processar carrinho." };
  }
}

