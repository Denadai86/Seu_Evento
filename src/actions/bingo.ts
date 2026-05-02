//src/actions/bingo.ts

"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant";

/**
 * 🎟️ GERAÇÃO DE CARTELAS
 */
export async function generateBatchCards(eventId: string, quantity: number) {
  await prisma.card.deleteMany({ where: { eventId } });

  const cardsToCreate = Array.from({ length: quantity }).map(() => ({
    eventId,
    shortId: Math.random().toString(36).substring(2, 6).toUpperCase(),
    matrix: {
      B: Array.from({ length: 5 }, () => Math.floor(Math.random() * 15) + 1),
      I: Array.from({ length: 5 }, () => Math.floor(Math.random() * 15) + 16),
      N: Array.from({ length: 5 }, () => Math.floor(Math.random() * 15) + 31),
      G: Array.from({ length: 5 }, () => Math.floor(Math.random() * 15) + 46),
      O: Array.from({ length: 5 }, () => Math.floor(Math.random() * 15) + 61),
    },
    isSold: true,
  }));

  await prisma.card.createMany({ data: cardsToCreate });

  return {
    success: true,
    sampleId: cardsToCreate[0]?.shortId,
  };
}

/**
 * 🎲 SORTEIO MANUAL (LEGADO)
 */
export async function drawNumber(eventId: string, number: number) {
  return await prisma.event.update({
    where: { id: eventId },
    data: {
      drawnNumbers: { push: number },
      status: "ACTIVE",
    },
  });
}

/**
 * 🔍 CONSULTA CARTELA
 */
export async function checkCard(shortId: string) {
  const card = await prisma.card.findFirst({
    where: { shortId: shortId.trim().toUpperCase() },
    include: {
      event: {
        include: { tenant: true },
      },
    },
  });

  if (!card) {
    return { success: false, message: "Não encontrada." };
  }

  return { success: true, card };
}

/**
 * 🔄 RESET EVENTO
 */
export async function resetEvent(eventId: string) {
  return await prisma.event.update({
    where: { id: eventId },
    data: {
      drawnNumbers: [],
      status: "DRAFT",
    },
  });
}

/**
 * 🎰 SORTEIO SEGURO (TRANSACTION)
 */
export async function drawNextNumber(eventId: string) {
  const { tenantId } = await requireTenant();

  return await prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: {
        id: eventId,
        tenantId,
      },
      select: {
        drawnNumbers: true,
      },
    });

    if (!event) {
      throw new Error("Evento não encontrado");
    }

    if (event.drawnNumbers.length >= 75) {
      return { error: "Todas as pedras já foram aclamadas!" };
    }

    const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (n) => !event.drawnNumbers.includes(n)
    );

    const randomIndex = Math.floor(Math.random() * available.length);
    const nextNumber = available[randomIndex];

    const updatedEvent = await tx.event.update({
      where: { id: eventId },
      data: {
        drawnNumbers: { push: nextNumber },
      },
      select: {
        drawnNumbers: true,
      },
    });

    return {
      success: true,
      drawnNumbers: updatedEvent.drawnNumbers,
      latest: nextNumber,
    };
  });
}

/**
 * 🧹 RESET JOGO
 */
export async function resetGame(eventId: string) {
  const { tenantId } = await requireTenant();

  await prisma.event.updateMany({
    where: {
      id: eventId,
      tenantId,
    },
    data: {
      drawnNumbers: [],
    },
  });

  return { success: true };
}

/**
 * 📄 BUSCAR CARTELAS PARA PDF
 */

export async function getEventCards(eventId: string) {
  const { tenantId } = await requireTenant();

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      tenantId, // 🔐 isolamento
    },
    include: {
      cards: true,
      sponsors: true,
    },
  });

  if (!event) {
    throw new Error("Evento não encontrado");
  }

return {
  cards: event.cards.map((card) => ({
    id: card.id,
    shortId: card.shortId,
    matrix: card.matrix as {
      B: number[];
      I: number[];
      N: number[];
      G: number[];
      O: number[];
    },
  })),
  sponsors: event.sponsors.map((s) => ({
    id: s.id,
    name: s.name,
    logoUrl: s.logoUrl ?? undefined, // 🧠 AQUI ESTÁ A MÁGICA
  })),
};
}