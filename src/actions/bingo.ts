// src/actions/bingo.ts

"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant";

// ─────────────────────────────────────────────────────────────────────────────
// 🧮 HELPERS MATEMÁTICOS PARA GERAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera um lote de códigos únicos (ex: "A9B2X1") garantindo zero colisões no array
 */
function generateUniqueIds(count: number): string[] {
  const ids = new Set<string>();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  
  while (ids.size < count) {
    let id = "";
    for (let i = 0; i < 6; i++) { // Aumentado para 6 caracteres (à prova de falhas)
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    ids.add(id);
  }
  return Array.from(ids);
}

/**
 * Gera uma coluna de Bingo com números únicos e já ordenados para facilitar a leitura
 */
function generateBingoColumn(min: number, max: number, count: number): number[] {
  const numbers = new Set<number>();
  
  while (numbers.size < count) {
    numbers.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  
  // Ordena os números do menor para o maior (Padrão ouro de cartelas de bingo)
  return Array.from(numbers).sort((a, b) => a - b);
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎟️ GERAÇÃO DE CARTELAS
// ─────────────────────────────────────────────────────────────────────────────

export async function generateBatchCards(eventId: string, quantity: number) {
  // 1. Blindagem de Segurança Absoluta
  const { tenantId } = await requireTenant();

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
  });

  if (!event) {
    throw new Error("Acesso negado ou evento inexistente.");
  }

  // 2. Limpa as cartelas antigas do evento
  await prisma.card.deleteMany({ where: { eventId } });

  // 3. Gera os IDs únicos para este lote
  const shortIds = generateUniqueIds(quantity);

  // 4. Cria as cartelas matematicamente perfeitas
  const cardsToCreate = shortIds.map((shortId) => ({
    eventId,
    shortId,
    matrix: {
      B: generateBingoColumn(1, 15, 5),
      I: generateBingoColumn(16, 30, 5),
      N: generateBingoColumn(31, 45, 5), // O espaço do meio (N3) será tratado na UI (PDF)
      G: generateBingoColumn(46, 60, 5),
      O: generateBingoColumn(61, 75, 5),
    },
    isSold: true,
  }));

  // 5. Inserção em massa super rápida
  await prisma.card.createMany({ data: cardsToCreate });

  return {
    success: true,
    sampleId: cardsToCreate[0]?.shortId,
    totalCreated: quantity,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎰 SORTEIO SEGURO (TRANSACTION)
// ─────────────────────────────────────────────────────────────────────────────

export async function drawNextNumber(eventId: string) {
  const { tenantId } = await requireTenant();

  // Usa transação para evitar condições de corrida (vários cliques simultâneos)
  return await prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: { id: eventId, tenantId },
      select: { drawnNumbers: true },
    });

    if (!event) throw new Error("Evento não encontrado");
    
    if (event.drawnNumbers.length >= 75) {
      return { error: "Todas as pedras já foram aclamadas!" };
    }

    // Filtra apenas os números que AINDA NÃO saíram
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
      select: { drawnNumbers: true },
    });

    return {
      success: true,
      drawnNumbers: updatedEvent.drawnNumbers,
      latest: nextNumber,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 🧹 GERENCIAMENTO DO JOGO E CARTELAS
// ─────────────────────────────────────────────────────────────────────────────

export async function resetGame(eventId: string) {
  const { tenantId } = await requireTenant();

  await prisma.event.updateMany({
    where: { id: eventId, tenantId },
    data: { drawnNumbers: [] },
  });

  return { success: true };
}

export async function checkCard(shortId: string) {
  const card = await prisma.card.findFirst({
    where: { shortId: shortId.trim().toUpperCase() },
    include: {
      event: {
        include: { tenant: true },
      },
    },
  });

  if (!card) return { success: false, message: "Cartela não encontrada." };

  return { success: true, card };
}

export async function getEventCards(eventId: string) {
  const { tenantId } = await requireTenant();

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: {
      cards: {
        orderBy: { shortId: 'asc' } // Ordena alfabeticamente para a impressão
      },
      sponsors: true,
    },
  });

  if (!event) throw new Error("Evento não encontrado");

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
      logoUrl: s.logoUrl ?? undefined,
    })),
  };
}

export async function toggleBoardVisibility(eventId: string, showBoard: boolean) {
  const { tenantId } = await requireTenant();
  await prisma.event.updateMany({
    where: { id: eventId, tenantId },
    data: { showBoard },
  });
  return { success: true };
}

