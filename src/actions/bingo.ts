// src/actions/bingo.ts

"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant";
import { unstable_noStore as noStore } from "next/cache";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO AUXILIAR DE SEGURANÇA (DRY)
// ─────────────────────────────────────────────────────────────────────────────
async function requireEventAccess(eventId: string) {
  const tenantId = await requireTenant();
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
  });
  if (!event) throw new Error("Acesso negado. Evento não encontrado.");
  return { tenantId, event };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS MATEMÁTICOS
// ─────────────────────────────────────────────────────────────────────────────

function generateUniqueIds(count: number, existingIds: string[]): string[] {
  const ids = new Set<string>();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  while (ids.size < count) {
    let id = "";
    for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    if (!existingIds.includes(id)) ids.add(id);
  }
  return Array.from(ids);
}

function generateBingoColumn(min: number, max: number, count: number): number[] {
  const numbers = new Set<number>();
  while (numbers.size < count) numbers.add(Math.floor(Math.random() * (max - min + 1)) + min);
  return Array.from(numbers).sort((a, b) => a - b);
}

function getCardSignature(matrix: any): string {
  return [...matrix.B, ...matrix.I, ...matrix.N, ...matrix.G, ...matrix.O].join("-");
}

// ─────────────────────────────────────────────────────────────────────────────
// GERAÇÃO DE CARTELAS
// ─────────────────────────────────────────────────────────────────────────────

export async function generateBatchCards(eventId: string, quantity: number) {
  // 🛡️ SEGURANÇA: Reaproveitando a função auxiliar
  const { tenantId, event } = await requireEventAccess(eventId);

  const eventWithCards = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: { cards: { select: { shortId: true, matrix: true } } },
  });
  
  if (!eventWithCards) throw new Error("Acesso negado.");

  const existingShortIds = eventWithCards.cards.map((c) => c.shortId);
  const existingSignatures = eventWithCards.cards.map((c) => getCardSignature(c.matrix));
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
    const sig = getCardSignature(newMatrix);
    if (!existingSignatures.includes(sig)) {
      cardsToCreate.push({ eventId, shortId: shortIds[count], matrix: newMatrix, isSold: false, isPaid: false });
      existingSignatures.push(sig);
      count++;
    }
  }

  await prisma.card.createMany({ data: cardsToCreate });
  return { success: true, totalCreated: quantity };
}

// ─────────────────────────────────────────────────────────────────────────────
// SORTEIO SEGURO (CONDIÇÃO DE CORRIDA RESOLVIDA VIA RAW QUERY)
// ─────────────────────────────────────────────────────────────────────────────

export async function drawNextNumber(eventId: string) {
  const { tenantId } = await requireEventAccess(eventId);

  try {
    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { drawnNumbers: true },
    });

    if (!event) throw new Error("Evento não encontrado.");

    const drawnNumbers: number[] = event.drawnNumbers as number[];
    if (drawnNumbers.length >= 75) return { error: "Todas as pedras já foram sorteadas!" };

    const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (n) => !drawnNumbers.includes(n)
    );
    const nextNumber = available[Math.floor(Math.random() * available.length)];

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { drawnNumbers: { push: nextNumber } },
      select: { drawnNumbers: true },
    });

    return { success: true, drawnNumbers: updated.drawnNumbers, latest: nextNumber };
  } catch (error: any) {
    console.error("[DRAW_NUMBER_ERROR]", error);
    return { error: "Erro ao sortear o número. Tente novamente." };
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// GERENCIAMENTO DA MESA
// ─────────────────────────────────────────────────────────────────────────────

export async function resetGame(eventId: string) {
  const { tenantId } = await requireEventAccess(eventId);
  await prisma.event.update({
    where: { id: eventId }, // Já garantimos a posse, basta usar o ID único
    data: { drawnNumbers: [] },
  });
  return { success: true };
}

export async function toggleBoardVisibility(eventId: string, showBoard: boolean) {
  const { tenantId } = await requireEventAccess(eventId);
  await prisma.event.update({
    where: { id: eventId },
    data: { showBoard },
  });
  return { success: true };
}

export async function getEventCards(eventId: string) {
  const { tenantId } = await requireEventAccess(eventId);
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: { cards: { orderBy: { shortId: "asc" } }, sponsors: true },
  });
  if (!event) throw new Error("Evento não encontrado.");

  return {
    cards: event.cards.map((c) => ({ id: c.id, shortId: c.shortId, matrix: c.matrix as any })),
    sponsors: event.sponsors.map((s) => ({ id: s.id, name: s.name, logoUrl: s.logoUrl ?? undefined })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA PÚBLICA — sem auth (usada pela cartela digital do jogador)
// ─────────────────────────────────────────────────────────────────────────────

export async function checkCard(shortId: string) {
  const card = await prisma.card.findFirst({
    where: { shortId: shortId.trim().toUpperCase() },
    // ⚠️ CORREÇÃO (Item 13): Removido o { include: { tenant: true } }.
    // Isso vazava tokens super secretos, CNPJ e PIX da ONG publicamente!
    // Agora retornamos APENAS o nome do evento e o ID para a UI da cartela digital.
    select: { 
      id: true,
      shortId: true,
      matrix: true,
      isPaid: true,
      eventId: true,
      event: { select: { name: true, drawnNumbers: true } }
    }
  });
  
  if (!card) return { success: false, message: "Cartela não encontrada." };
  return { success: true, card };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDITORIA DE VITÓRIA (ANTIFRAUDE)
// ─────────────────────────────────────────────────────────────────────────────

export async function validateWinningCard(eventId: string, shortId: string) {
  const { tenantId } = await requireEventAccess(eventId);

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: {
      cards: { where: { shortId: shortId.trim().toUpperCase() } },
      prizes: { where: { isCompleted: false }, orderBy: { order: "asc" } },
    },
  });

  if (!event) return { success: false, error: "Evento não encontrado." };
  if (event.cards.length === 0) return { success: false, error: "Cartela não existe neste evento." };

  const card = event.cards[0];
  const drawn = event.drawnNumbers as number[];
  const matrix = card.matrix as any;

  // CRITÉRIO 1: Pagamento obrigatório
  if (!card.isPaid) {
    return {
      success: false,
      error: "⚠️ CARTELA NÃO PAGA! O pagamento precisa ser baixado no caixa antes de participar.",
    };
  }

  // CRITÉRIO 2-4: Verificação matemática (MANTIDA ORIGINAL - OK)
  const allNumbers = [
    ...matrix.B, ...matrix.I,
    matrix.N[0], matrix.N[1], matrix.N[3], matrix.N[4], // N[2] = FREE
    ...matrix.G, ...matrix.O,
  ];
  const isFullHouse = allNumbers.every((n) => drawn.includes(n));

  const hasHorizontalQuina = [0, 1, 2, 3, 4].some((row) =>
    ["B", "I", "N", "G", "O"].every((col) => {
      if (col === "N" && row === 2) return true;
      return drawn.includes(matrix[col][row]);
    })
  );
  const hasVerticalQuina = ["B", "I", "N", "G", "O"].some((col) =>
    [0, 1, 2, 3, 4].every((row) => {
      if (col === "N" && row === 2) return true;
      return drawn.includes(matrix[col][row]);
    })
  );
  const hasDiag1 = [matrix.B[0], matrix.I[1], matrix.G[3], matrix.O[4]].every((n) => drawn.includes(n));
  const hasDiag2 = [matrix.B[4], matrix.I[3], matrix.G[1], matrix.O[0]].every((n) => drawn.includes(n));
  const hasQuina = hasHorizontalQuina || hasVerticalQuina || hasDiag1 || hasDiag2;

  const currentPrize = event.prizes[0] || null;
  let isWinner = false;
  let winMessage = "";

  if (currentPrize) {
    if (currentPrize.type === "QUINA" && hasQuina) {
      isWinner = true;
      winMessage = `🎉 BINGO! Quina confirmada — ${currentPrize.prizeName}`;
    } else if (currentPrize.type === "FULL_HOUSE" && isFullHouse) {
      isWinner = true;
      winMessage = `🎉 BINGO! Cartela cheia — ${currentPrize.prizeName}`;
    } else {
      winMessage = `Cartela válida, mas ainda não bateu ${currentPrize.type === "QUINA" ? "Quina" : "Cartela Cheia"}.`;
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
    stats: { hasHorizontalQuina, hasVerticalQuina, hasDiag1, hasDiag2, drawnCount: drawn.length },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO AO VIVO DO TELÃO (SWR polling)
// ─────────────────────────────────────────────────────────────────────────────

export async function getGameState(eventId: string) {
  noStore();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      drawnNumbers: true,
      showBoard: true,
      pendingWinnerCard: true,
      pendingWinnerName: true,
      bingoConfirmed: true,
    },
  });
  if (!event) return null;

  return {
    drawnNumbers: event.drawnNumbers || [],
    latest: event.drawnNumbers[event.drawnNumbers.length - 1] || null,
    showBoard: event.showBoard,
    pendingWinnerCard: event.pendingWinnerCard,
    pendingWinnerName: event.pendingWinnerName,
    bingoConfirmed: event.bingoConfirmed,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROTOCOLO DE 3 VIAS
// ─────────────────────────────────────────────────────────────────────────────

export async function alertLocutor(eventId: string, shortId: string, winnerName: string) {
  // ⚠️ CORREÇÃO CRÍTICA (Item 4): Antes, permitia fraude injetando eventId de outros.
  const { tenantId } = await requireEventAccess(eventId);

  await prisma.event.update({
    where: { id: eventId }, // Segurança garantida no passo anterior
    data: {
      pendingWinnerCard: shortId.toUpperCase(),
      pendingWinnerName: winnerName,
      bingoConfirmed: false,
    },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function toggleBingoCelebration(eventId: string, confirm: boolean) {
  // ⚠️ CORREÇÃO CRÍTICA (Item 4): Garantindo posse do evento.
  const { tenantId } = await requireEventAccess(eventId);

  await prisma.event.update({
    where: { id: eventId },
    data: {
      bingoConfirmed: confirm,
      pendingWinnerCard: null,
      pendingWinnerName: null,
      bingoConfirmedAt: confirm ? new Date() : null,
    },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENCERRAR RODADA E AVANÇAR PARA A PRÓXIMA
// ─────────────────────────────────────────────────────────────────────────────

export async function completeCurrentPrizeAndNext(eventId: string, currentPrizeId: string) {
  // ⚠️ CORREÇÃO CRÍTICA (Item 5): Garante posse do evento
  const { tenantId } = await requireEventAccess(eventId);

  // ⚠️ CORREÇÃO CRÍTICA (Item 5): Garante que o prêmio a encerrar pertence EXATAMENTE a este evento!
  const prize = await prisma.prize.findUnique({
    where: { id: currentPrizeId }
  });

  if (!prize || prize.eventId !== eventId) {
    throw new Error("Manipulação detectada. O prêmio não pertence a este evento.");
  }

  await prisma.$transaction([
    prisma.prize.update({
      where: { id: currentPrizeId },
      data: { isCompleted: true },
    }),
    prisma.event.update({
      where: { id: eventId },
      data: {
        drawnNumbers: [],
        pendingWinnerCard: null,
        pendingWinnerName: null,
        bingoConfirmed: false,
        bingoConfirmedAt: null,
      },
    }),
  ]);

  revalidatePath("/", "layout");
  return { success: true };
}