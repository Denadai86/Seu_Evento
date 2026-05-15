// src/actions/vendas.ts
"use server";

import prisma from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";

export async function processCardSale({
  eventId,
  shortId,
  method,
  sellerId,
}: {
  eventId: string;
  shortId: string;
  method: PaymentMethod;
  sellerId?: string;
}) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { ticketPrice: true }
    });

    if (!event) return { success: false, error: "Evento não encontrado." };

    // Executa ambas as operações juntas de forma segura
    await prisma.$transaction(async (tx) => {
      // 1. Atualiza o estado da cartela no pátio
      const card = await tx.card.update({
        where: { shortId: shortId.toUpperCase() },
        data: {
          isSold: true,
          isPaid: true,
          sellerId: sellerId || null,
          price: event.ticketPrice
        }
      });

      // 2. Alimenta o Extrato e Gráficos do Dashboard Financeiro
      await tx.transaction.create({
        data: {
          eventId,
          cardId: card.id,
          sellerId: sellerId || null,
          amount: event.ticketPrice,
          method
        }
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Erro no PDV:", error);
    return { success: false, error: "Falha ao registrar venda da cartela." };
  }
}