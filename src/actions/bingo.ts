// src/actions/bingo.ts

"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant";
import { unstable_noStore as noStore } from "next/cache";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// 🧮 HELPERS MATEMÁTICOS PARA GERAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

function generateUniqueIds(count: number, existingIds: string[]): string[] {
  const ids = new Set<string>();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  
  while (ids.size < count) {
    let id = "";
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!existingIds.includes(id)) ids.add(id);
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

function getCardSignature(matrix: any): string {
  return [
    ...matrix.B, ...matrix.I, ...matrix.N, ...matrix.G, ...matrix.O
  ].join('-');
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎟️ GERAÇÃO DE CARTELAS
// ─────────────────────────────────────────────────────────────────────────────

export async function generateBatchCards(eventId: string, quantity: number) {
  const tenantId = await requireTenant(); // 🔥 CORREÇÃO TYPE

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: { cards: { select: { shortId: true, matrix: true } } }
  });

  if (!event) throw new Error("Acesso negado ou evento inexistente.");

  const existingShortIds = event.cards.map(c => c.shortId);
  const existingSignatures = event.cards.map(c => getCardSignature(c.matrix));
  const shortIds = generateUniqueIds(quantity, existingShortIds);
  const cardsToCreate = [];

  let count = 0;
  
  while (count < quantity) {
    const newMatrix = {
      B: generateBingoColumn(1, 15, 5),
      I: generateBingoColumn(16, 30, 5),
      N: generateBingoColumn(31, 45, 5), 
      G: generateBingoColumn(46, 60, 5),
      O: generateBingoColumn(61, 75, 5),
    };

    const newSignature = getCardSignature(newMatrix);

    if (!existingSignatures.includes(newSignature)) {
      cardsToCreate.push({
        eventId,
        shortId: shortIds[count],
        matrix: newMatrix,
        isSold: false,
        isPaid: false
      });
      existingSignatures.push(newSignature);
      count++;
    }
  }

  await prisma.card.createMany({ data: cardsToCreate });
  return { success: true, totalCreated: quantity };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎰 SORTEIO SEGURO
// ─────────────────────────────────────────────────────────────────────────────

export async function drawNextNumber(eventId: string) {
  const tenantId = await requireTenant(); // 🔥 CORREÇÃO TYPE

  return await prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: { id: eventId, tenantId },
      select: { drawnNumbers: true },
    });

    if (!event) throw new Error("Evento não encontrado");
    
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
// 🧹 GERENCIAMENTO E CONSULTAS DA MESA
// ─────────────────────────────────────────────────────────────────────────────

export async function resetGame(eventId: string) {
  const tenantId = await requireTenant(); // 🔥 CORREÇÃO TYPE

  await prisma.event.updateMany({
    where: { id: eventId, tenantId },
    data: { drawnNumbers: [] },
  });

  return { success: true };
}

export async function toggleBoardVisibility(eventId: string, showBoard: boolean) {
  const tenantId = await requireTenant(); // 🔥 CORREÇÃO TYPE
  
  await prisma.event.updateMany({
    where: { id: eventId, tenantId },
    data: { showBoard },
  });
  return { success: true };
}

export async function getEventCards(eventId: string) {
  const tenantId = await requireTenant(); // 🔥 CORREÇÃO TYPE

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: {
      cards: { orderBy: { shortId: 'asc' } },
      sponsors: true,
    },
  });

  if (!event) throw new Error("Evento não encontrado");

  return {
    cards: event.cards.map((card) => ({
      id: card.id,
      shortId: card.shortId,
      matrix: card.matrix as any,
    })),
    sponsors: event.sponsors.map((s) => ({
      id: s.id,
      name: s.name,
      logoUrl: s.logoUrl ?? undefined,
    })),
  };
}



export async function checkCard(shortId: string) {
  const card = await prisma.card.findFirst({
    where: { shortId: shortId.trim().toUpperCase() },
    include: {
      event: { include: { tenant: true } },
    },
  });

  if (!card) return { success: false, message: "Cartela não encontrada." };
  return { success: true, card };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏆 AUDITORIA DE VITÓRIA (VERIFICADOR INTELIGENTE ANTIFRAUDE)
// ─────────────────────────────────────────────────────────────────────────────

export async function validateWinningCard(eventId: string, shortId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId },
    include: { 
      cards: { where: { shortId: shortId.trim().toUpperCase() } },
      prizes: { where: { isCompleted: false }, orderBy: { order: 'asc' } }
    }
  });

  if (!event) return { success: false, error: "Evento não encontrado." };
  if (event.cards.length === 0) return { success: false, error: "Cartela não existe neste evento." };

  const card = event.cards[0];
  const drawn = event.drawnNumbers as number[];
  const matrix = card.matrix as any;

  // 🛑 TRAVA DE SEGURANÇA FINANCEIRA (REGRA DE OURO)
  if (!card.isPaid) {
    return { 
      success: false, 
      error: "⚠️ CARTELA NÃO PAGA! Esta cartela não tem direito a prêmios até que o pagamento seja baixado no caixa." 
    };
  }

  // 1. Array com todos os 24 números da cartela
  const allNumbers = [
    ...matrix.B, ...matrix.I, 
    matrix.N[0], matrix.N[1], matrix.N[3], matrix.N[4], // Pula o N[2] Centro Livre
    ...matrix.G, ...matrix.O
  ];

  const isFullHouse = allNumbers.every(n => drawn.includes(n));

  const horizontalLines = [0, 1, 2, 3, 4].map(rowIndex => {
    return ["B", "I", "N", "G", "O"].map(col => {
      if (col === "N" && rowIndex === 2) return true;
      return drawn.includes(matrix[col][rowIndex]);
    }).every(Boolean);
  });

  const verticalLines = ["B", "I", "N", "G", "O"].map(col => {
    return [0, 1, 2, 3, 4].map(rowIndex => {
      if (col === "N" && rowIndex === 2) return true;
      return drawn.includes(matrix[col][rowIndex]);
    }).every(Boolean);
  });

  const diag1 = [
    drawn.includes(matrix.B[0]), drawn.includes(matrix.I[1]),
    true, // N[2]
    drawn.includes(matrix.G[3]), drawn.includes(matrix.O[4])
  ].every(Boolean);

  const diag2 = [
    drawn.includes(matrix.B[4]), drawn.includes(matrix.I[3]),
    true, // N[2]
    drawn.includes(matrix.G[1]), drawn.includes(matrix.O[0])
  ].every(Boolean);

  const hasQuina = horizontalLines.some(Boolean) || verticalLines.some(Boolean) || diag1 || diag2;

  const currentPrize = event.prizes[0] || null;
  let isWinner = false;
  let winMessage = "";

  if (currentPrize) {
    if (currentPrize.type === "QUINA" && hasQuina) {
      isWinner = true;
      winMessage = `🎉 BINGO! Cartela bateu QUINA na rodada: ${currentPrize.prizeName}`;
    } else if (currentPrize.type === "FULL_HOUSE" && isFullHouse) {
      isWinner = true;
      winMessage = `🎉 BINGO! Cartela bateu CHEIA na rodada: ${currentPrize.prizeName}`;
    } else {
      winMessage = `Cartela Válida. Mas ainda não bateu a rodada atual (${currentPrize.type === "QUINA" ? "Quina" : "Cheia"}).`;
    }
  }

  return {
    success: true,
    cardId: card.shortId,
    isPaid: card.isPaid,
    isFullHouse,
    hasQuina,
    isWinner,
    winMessage,
    currentPrize,
    stats: { horizontalLines, verticalLines, diag1, diag2, drawnCount: drawn.length }
  };
}

// 🔥 O MOTOR DE ESTADO DO TELÃO E LOCUTOR (PARA O SWR)
export async function getGameState(eventId: string) {
  noStore(); // 🚨 MATADOR DE CACHE: Garante que a mesa leia ao vivo do banco a cada 2 segundos!

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { 
      drawnNumbers: true, 
      showBoard: true, 
      pendingWinnerCard: true,
      pendingWinnerName: true,
      bingoConfirmed: true
    }
  });

  if (!event) return null;

  return {
    drawnNumbers: event.drawnNumbers || [],
    latest: event.drawnNumbers[event.drawnNumbers.length - 1] || null,
    showBoard: event.showBoard,
    pendingWinnerCard: event.pendingWinnerCard,
    pendingWinnerName: event.pendingWinnerName,
    bingoConfirmed: event.bingoConfirmed
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 📢 NOTIFICAÇÕES (PÁTIO -> MESA) - COM MARRETADA DE CACHE!
// ─────────────────────────────────────────────────────────────────────────────

export async function alertLocutor(eventId: string, shortId: string, winnerName: string) {
  const result = await prisma.event.update({
    where: { id: eventId },
    data: {
      pendingWinnerCard: shortId.toUpperCase(),
      pendingWinnerName: winnerName,
      bingoConfirmed: false, // Garante que a celebração está desligada
    }
  });
  
  // 🔥 MARRETADA DE CACHE: Força o Next.js a atualizar a tela do locutor em todos os computadores!
  revalidatePath("/", "layout"); 
  
  return result;
}

export async function toggleBingoCelebration(eventId: string, confirm: boolean) {
  const result = await prisma.event.update({
    where: { id: eventId },
    data: {
      bingoConfirmed: confirm,
      // 🔥 CORREÇÃO: Tem que ser null SEMPRE. Assim a caixinha laranja some da mesa do locutor!
      pendingWinnerCard: null, 
      pendingWinnerName: null,
      bingoConfirmedAt: confirm ? new Date() : null,
    }
  });

  revalidatePath("/", "layout");
  
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏁 CONTROLE DE RODADAS (ENCERRAR PRÊMIO E IR PARA O PRÓXIMO)
// ─────────────────────────────────────────────────────────────────────────────

export async function completeCurrentPrizeAndNext(eventId: string, currentPrizeId: string) {
  // 1. Marca o prêmio atual como concluído
  await prisma.prize.update({
    where: { id: currentPrizeId },
    data: { isCompleted: true },
  });

  // 2. Limpa o globo de sorteio e desliga qualquer sinal de comemoração pendente no evento
  await prisma.event.update({
    where: { id: eventId },
    data: {
      drawnNumbers: [], // Zera o globo para a próxima rodada!
      pendingWinnerCard: null,
      pendingWinnerName: null,
      bingoConfirmed: false,
      bingoConfirmedAt: null,
    },
  });

  // 3. Força a atualização da tela de todo mundo (Locutor e Telão)
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/", "layout");

  return { success: true };
}