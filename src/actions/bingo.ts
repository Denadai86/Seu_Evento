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
function generateUniqueIds(count: number, existingIds: string[]): string[] {
  const ids = new Set<string>();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  
  while (ids.size < count) {
    let id = "";
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Garante que não repete nem no novo lote, nem com as que já estão no banco!
    if (!existingIds.includes(id)) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

function generateBingoColumn(min: number, max: number, count: number): number[] {
  const numbers = new Set<number>();
  while (numbers.size < count) {
    numbers.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

// 🔥 Helper para criar uma "Assinatura Única" de uma cartela
function getCardSignature(matrix: any): string {
  return [
    ...matrix.B, ...matrix.I, ...matrix.N, ...matrix.G, ...matrix.O
  ].join('-');
}
// ─────────────────────────────────────────────────────────────────────────────
// 🎟️ GERAÇÃO DE CARTELAS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 🎟️ GERAÇÃO DE CARTELAS (CRIANDO LOTES SEGUROS)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateBatchCards(eventId: string, quantity: number) {
  const { tenantId } = await requireTenant();

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: { cards: { select: { shortId: true, matrix: true } } } // Pega as antigas
  });

  if (!event) throw new Error("Acesso negado ou evento inexistente.");

  const existingShortIds = event.cards.map(c => c.shortId);
  
  // Array com as "Assinaturas" das cartelas que já existem
  const existingSignatures = event.cards.map(c => getCardSignature(c.matrix));

  const shortIds = generateUniqueIds(quantity, existingShortIds);
  const cardsToCreate = [];

  let count = 0;
  
  // 🎰 GERAÇÃO MATEMATICAMENTE A PROVA DE CLONES
  while (count < quantity) {
    const newMatrix = {
      B: generateBingoColumn(1, 15, 5),
      I: generateBingoColumn(16, 30, 5),
      N: generateBingoColumn(31, 45, 5), 
      G: generateBingoColumn(46, 60, 5),
      O: generateBingoColumn(61, 75, 5),
    };

    const newSignature = getCardSignature(newMatrix);

    // Se essa exata combinação de 25 números já existe, descarta e tenta de novo
    if (!existingSignatures.includes(newSignature)) {
      cardsToCreate.push({
        eventId,
        shortId: shortIds[count],
        matrix: newMatrix,
        isSold: false, // 🔥 Corrigido: Nenhuma cartela nasce vendida/paga. O Vendedor que vende!
      });
      existingSignatures.push(newSignature); // Adiciona na memória pra não repetir neste lote
      count++;
    }
  }

  // Inserção no Banco
  await prisma.card.createMany({ data: cardsToCreate });

  return { success: true, totalCreated: quantity };
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

