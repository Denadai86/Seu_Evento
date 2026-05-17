// src/actions/vendas.ts
"use server";

import prisma from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";

// 🔥 NOVA FUNÇÃO: Valida se a cartela pode ser vendida
export async function validateCardForSale(eventId: string, shortId: string) {
  const card = await prisma.card.findUnique({
    where: { shortId },
    select: { id: true, shortId: true, isSold: true, eventId: true }
  });

  if (!card) throw new Error("Cartela não encontrada no sistema.");
  if (card.eventId !== eventId) throw new Error("Atenção: Cartela de outro evento!");
  if (card.isSold) throw new Error("Conflito: Esta cartela já foi vendida!");

  return card;
}

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

export async function processBatchSale(
  eventId: string,
  shortIds: string[], // Agora recebe um array de cartelas (ex: ["A1B2", "X9Z8"])
  method: PaymentMethod, // Ou o seu PaymentMethod do Prisma
  sellerId: string
) {
  if (!shortIds || shortIds.length === 0) return { success: false, error: "Carrinho vazio." };

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      // Assumindo que você tenha ticketPrice no Prisma. Se não tiver, substitua por um valor fixo por enquanto.
      select: { ticketPrice: true } 
    });

    if (!event) return { success: false, error: "Evento não encontrado." };

    const ticketPrice = event.ticketPrice || 2500; // Fallback para R$ 25,00 em centavos

    // $transaction garante que ou salva TODAS as cartelas do carrinho, ou nenhuma.
    await prisma.$transaction(async (tx) => {
      // 1. Verifica se alguma das cartelas do lote já foi vendida (proteção contra duplo bip)
      const existingCards = await tx.card.findMany({
        where: { shortId: { in: shortIds }, eventId }
      });

      if (existingCards.length !== shortIds.length) {
        throw new Error("Uma ou mais cartelas não são válidas para este evento.");
      }

      const alreadySold = existingCards.filter(c => c.isSold);
      if (alreadySold.length > 0) {
        throw new Error(`As cartelas a seguir já foram vendidas: ${alreadySold.map(c => c.shortId).join(", ")}`);
      }

      // 2. Atualiza todas as cartelas do carrinho
      await tx.card.updateMany({
        where: { shortId: { in: shortIds } },
        data: {
          isSold: true,
          isPaid: true,
          sellerId: sellerId,
          price: ticketPrice
        }
      });

      // 3. Registra as transações financeiras para cada cartela
      const transactionsData = existingCards.map(card => ({
        eventId,
        cardId: card.id,
        sellerId,
        amount: ticketPrice,
        method
      }));

      await tx.transaction.createMany({
        data: transactionsData
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Erro no PDV Lote:", error);
    return { success: false, error: error.message || "Falha ao processar carrinho." };
  }
}