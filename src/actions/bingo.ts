"use server";

import { prisma } from "../lib/prisma";

export async function generateBatchCards(eventId: string, quantity: number) {
  await prisma.card.deleteMany({ where: { eventId } });
  const cardsToCreate = [];
  
  for (let i = 0; i < quantity; i++) {
    cardsToCreate.push({
      eventId,
      shortId: Math.random().toString(36).substring(2, 6).toUpperCase(),
      matrix: {
        B: Array.from({length: 5}, () => Math.floor(Math.random() * 15) + 1),
        I: Array.from({length: 5}, () => Math.floor(Math.random() * 15) + 16),
        N: Array.from({length: 5}, () => Math.floor(Math.random() * 15) + 31),
        G: Array.from({length: 5}, () => Math.floor(Math.random() * 15) + 46),
        O: Array.from({length: 5}, () => Math.floor(Math.random() * 15) + 61),
      },
      isSold: true
    });
  }
  await prisma.card.createMany({ data: cardsToCreate });
  return { success: true, sampleId: cardsToCreate[0]?.shortId };
}

export async function drawNumber(eventId: string, number: number) {
  return await prisma.event.update({
    where: { id: eventId },
    data: { drawnNumbers: { push: number }, status: "ACTIVE" }
  });
}

export async function checkCard(shortId: string) {
  const card = await prisma.card.findFirst({
    where: { shortId: shortId.trim().toUpperCase() },
    include: { event: { include: { organization: true } } }
  });
  return card ? { success: true, card } : { success: false, message: "Não encontrada." };
}

export async function resetEvent(eventId: string) {
  return await prisma.event.update({
    where: { id: eventId },
    data: {
      drawnNumbers: [],
      status: "DRAFT"
    }
  });
}