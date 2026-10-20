// src/actions/bingo.ts

"use server";

import prisma from "@/lib/prisma";
import { requireTenant, requireEventAdmin, requireEventCapability } from "@/lib/requireTenant";
import { auth } from "@/lib/auth";
import { secureInt, securePick } from "@/lib/random";
import { evaluateCard, closingDrawIndex } from "@/lib/bingoRules";
import { joinNames, validateSelection } from "@/lib/bingoClaims";
import { logAudit, logUnpaidCardCheck, buildAuditData } from "@/lib/audit";
import { cardCanWin, CARD_TYPE_LABEL, type CardType } from "@/lib/cardPricing";
import { SPONSOR_SELECT, sponsorOrderBy, resolveSponsorSlots } from "@/lib/sponsorRotation";
import { unstable_noStore as noStore } from "next/cache";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO AUXILIAR DE SEGURANÇA (DRY)
// ─────────────────────────────────────────────────────────────────────────────
// As guardas por papel ficam em @/lib/requireTenant:
//   requireEventAdmin(eventId)                    → só ORG_ADMIN
//   requireEventCapability(eventId, "canOperate") → ORG_ADMIN ou staff com a capacidade

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS MATEMÁTICOS
// ─────────────────────────────────────────────────────────────────────────────

function generateUniqueIds(count: number, existingIds: string[]): string[] {
  const ids = new Set<string>();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  while (ids.size < count) {
    let id = "";
    for (let i = 0; i < 6; i++) id += chars.charAt(secureInt(0, chars.length - 1));
    if (!existingIds.includes(id)) ids.add(id);
  }
  return Array.from(ids);
}

function generateBingoColumn(min: number, max: number, count: number): number[] {
  const numbers = new Set<number>();
  while (numbers.size < count) numbers.add(secureInt(min, max));
  return Array.from(numbers).sort((a, b) => a - b);
}

function getCardSignature(matrix: any): string {
  return [...matrix.B, ...matrix.I, ...matrix.N, ...matrix.G, ...matrix.O].join("-");
}

// ─────────────────────────────────────────────────────────────────────────────
// GERAÇÃO DE CARTELAS
// ─────────────────────────────────────────────────────────────────────────────

export async function generateBatchCards(eventId: string, quantity: number, type: CardType = "QUINA") {
  // 🛡️ SEGURANÇA: Reaproveitando a função auxiliar
  const { tenantId, event } = await requireEventAdmin(eventId);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5000) {
    return { success: false, error: "Quantidade inválida (de 1 a 5000)." };
  }
  if (type !== "QUINA" && type !== "FULL_HOUSE") {
    return { success: false, error: "Tipo de cartela inválido." };
  }
  // Cartela cheia tem preço próprio: sem ele a cartela seria vendida pelo preço errado.
  if (type === "FULL_HOUSE" && !(event.fullHousePrice && event.fullHousePrice > 0)) {
    const tierWithFullHouse = await prisma.priceTier.count({ where: { eventId, fullHousePrice: { gt: 0 } } });
    if (tierWithFullHouse === 0) {
      return { success: false, error: "Defina o preço da cartela cheia (padrão ou em alguma fase) antes de gerar cartelas desse tipo." };
    }
  }

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
      cardsToCreate.push({ eventId, shortId: shortIds[count], matrix: newMatrix, type, isSold: false, isPaid: false });
      existingSignatures.push(sig);
      count++;
    }
  }

  await prisma.card.createMany({ data: cardsToCreate });
  await logAudit({ tenantId, action: "CARDS_GENERATED", eventId, metadata: { quantity, type } });
  return { success: true, totalCreated: quantity };
}

// ─────────────────────────────────────────────────────────────────────────────
// SORTEIO SEGURO (CONDIÇÃO DE CORRIDA RESOLVIDA VIA RAW QUERY)
// ─────────────────────────────────────────────────────────────────────────────

export async function drawNextNumber(eventId: string) {
  const { tenantId } = await requireEventCapability(eventId, "canOperate");

  try {
    // 🔒 COMPARE-AND-SWAP: o sponsorCursor sobe a CADA pedra, então serve de "versão" da linha.
    // Se dois cliques (ou duas abas) sorteiam ao mesmo tempo, só um update passa
    // (count === 1); o outro relê o estado e sorteia de novo — nunca repete pedra.
    for (let attempt = 0; attempt < 5; attempt++) {
      const event = await prisma.event.findFirst({
        where: { id: eventId, tenantId },
        select: { drawnNumbers: true, sponsorCursor: true },
      });

      if (!event) throw new Error("Evento não encontrado.");

      const drawnNumbers: number[] = event.drawnNumbers as number[];
      if (drawnNumbers.length >= 75) return { error: "Todas as pedras já foram sorteadas!" };

      const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(
        (n) => !drawnNumbers.includes(n)
      );
      const nextNumber = securePick(available);

      // Patrocinadores ANTES do update: a pedra deste sorteio é a de número (cursor + 1).
      const sponsors = await prisma.sponsor.findMany({
        where: { eventId },
        orderBy: sponsorOrderBy(),
        select: SPONSOR_SELECT,
      });
      const { currentSponsor, nextSponsor } = resolveSponsorSlots(
        sponsors,
        event.sponsorCursor + 1,
        true
      );

      // Pedra e cursor de patrocinadores avançam no MESMO update (atômico).
      const swapped = await prisma.event.updateMany({
        where: { id: eventId, tenantId, sponsorCursor: event.sponsorCursor },
        data: {
          drawnNumbers: { push: nextNumber },
          sponsorCursor: { increment: 1 },
        },
      });

      if (swapped.count === 0) continue; // alguém sorteou no meio: relê e tenta de novo

      // 📊 Registro de exposição (base do relatório do patrocinador).
      // Best-effort: se falhar, o SORTEIO NÃO PODE parar — só registramos o erro.
      if (currentSponsor) {
        try {
          await prisma.sponsorExposure.create({
            data: {
              eventId,
              sponsorId: currentSponsor.id,
              sponsorName: currentSponsor.name,
              ballNumber: nextNumber,
              sequence: event.sponsorCursor + 1,
            },
          });
        } catch (logError) {
          console.error("[EXPOSURE_LOG_ERROR]", logError);
        }
      }

      return {
        success: true,
        drawnNumbers: [...drawnNumbers, nextNumber],
        latest: nextNumber,
        currentSponsor,
        nextSponsor,
      };
    }

    return { error: "Sorteio simultâneo detectado. Tente novamente." };
  } catch (error: any) {
    console.error("[DRAW_NUMBER_ERROR]", error);
    return { error: "Erro ao sortear o número. Tente novamente." };
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// GERENCIAMENTO DA MESA
// ─────────────────────────────────────────────────────────────────────────────

export async function resetGame(eventId: string) {
  const { tenantId } = await requireEventCapability(eventId, "canOperate");
  await prisma.event.update({
    where: { id: eventId }, // Já garantimos a posse, basta usar o ID único
    // Zera também um alerta/celebração pendente: senão o telão ficava "em festa" com a grade vazia.
    data: {
      drawnNumbers: [],
      pendingWinnerCard: null,
      pendingWinnerName: null,
      bingoConfirmed: false,
      bingoConfirmedAt: null,
    },
  });
  // Os avisos ainda sem decisão perdem o sentido (as pedras foram zeradas): saem da fila.
  await prisma.bingoClaim.updateMany({
    where: { eventId, status: "PENDING" },
    data: { status: "DISCARDED", activeKey: null, decidedAt: new Date() },
  });
  await logAudit({ tenantId, action: "GAME_RESET", eventId });
  return { success: true };
}

export async function toggleBoardVisibility(eventId: string, showBoard: boolean) {
  const { tenantId } = await requireEventCapability(eventId, "canOperate");
  await prisma.event.update({
    where: { id: eventId },
    data: { showBoard },
  });
  return { success: true };
}

export async function getEventCards(eventId: string) {
  const { tenantId } = await requireEventCapability(eventId, ["canOperate", "canVerify"]);
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: { cards: { orderBy: { shortId: "asc" } }, sponsors: true },
  });
  if (!event) throw new Error("Evento não encontrado.");

  return {
    cards: event.cards.map((c) => ({ id: c.id, shortId: c.shortId, matrix: c.matrix as any, type: c.type })),
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
  let tenantId: string;
  try {
    ({ tenantId } = await requireEventCapability(eventId, ["canOperate", "canVerify"]));
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Sem permissão." };
  }

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

  // CRITÉRIO 0: cartela BLOQUEADA (perdida/cancelada) nunca ganha
  if (card.blocked) {
    return {
      success: false,
      reason: "BLOCKED",
      error: `⛔ CARTELA BLOQUEADA${card.blockedReason ? ` (${card.blockedReason})` : ""}. Ela foi dada como perdida ou cancelada e não pode ser premiada.`,
    };
  }

  // CRITÉRIO 1: Pagamento obrigatório
  if (!card.isPaid) {
    // Fica registrado: se esta cartela for paga DEPOIS desta conferência, a auditoria destaca (golpe de "pagar depois do bingo").
    await logUnpaidCardCheck({ tenantId, eventId, shortId: card.shortId, holderStaffId: card.eventStaffId });
    return {
      success: false,
      reason: "NOT_PAID",
      error: "⚠️ CARTELA NÃO PAGA! O pagamento precisa ser baixado no caixa antes de participar.",
    };
  }

  // CRITÉRIOS 2-4: as regras ficam em src/lib/bingoRules.ts (a mesa do locutor usa a MESMA conta).
  const { isFullHouse, hasQuina, hasHorizontalQuina, hasVerticalQuina, hasDiag1, hasDiag2 } =
    evaluateCard(matrix, drawn);

  const currentPrize = event.prizes[0] || null;
  let isWinner = false;
  let winMessage = "";

  if (currentPrize && !cardCanWin(card.type, currentPrize.type)) {
    // Cartela de Quina não concorre a prêmio de Cartela Cheia (e vice-versa): nunca é "vencedora".
    winMessage = `Esta cartela é de ${CARD_TYPE_LABEL[card.type as CardType]}, mas a rodada atual premia ${CARD_TYPE_LABEL[currentPrize.type as CardType]}.`;
  } else if (currentPrize) {
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

  // Em qual pedra a cartela fechou o padrão da rodada (desempate objetivo na fila de avisos).
  const closedAtDraw = isWinner && currentPrize ? closingDrawIndex(matrix, drawn, currentPrize.type as "QUINA" | "FULL_HOUSE") : null;

  return {
    success: true,
    cardId: card.shortId,
    cardType: card.type,
    isPaid: card.isPaid,
    isFullHouse,
    hasQuina,
    isWinner,
    closedAtDraw,
    winMessage,
    currentPrize,
    stats: { hasHorizontalQuina, hasVerticalQuina, hasDiag1, hasDiag2, drawnCount: drawn.length },
  };
}

export async function alertLocutor(eventId: string, shortId: string, winnerName: string) {
  const { tenantId } = await requireEventCapability(eventId, "canVerify");

  // 🛡️ A cartela é conferida AQUI: o navegador não decide quem ganhou.
  const validation = await validateWinningCard(eventId, shortId);
  if (!validation.success) {
    return { success: false, error: validation.error ?? "Cartela inválida." };
  }
  if (!validation.isWinner) {
    return { success: false, error: validation.winMessage || "Esta cartela não está vencendo a rodada atual." };
  }

  // O dono da cartela não é guardado no sistema: o fiscal digita o nome. Limpa e limita.
  const cleanName = String(winnerName ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (!cleanName) return { success: false, error: "Informe o nome do ganhador." };

  // O "Fiscal" vem da SESSÃO, nunca do navegador.
  const session = await auth();
  const fiscal = String(session?.user?.name ?? "Fiscal").slice(0, 40);

  // FILA: todo aviso válido entra, mesmo que já haja outros (ganhadores simultâneos são aceitos).
  // Quem decide é o LOCUTOR: um ganhador (os outros cedem) ou prêmio dividido.
  const claimedCard = validation.cardId ?? shortId.trim().toUpperCase();
  const prize = validation.currentPrize;
  if (!prize) return { success: false, error: "Não há rodada ativa para receber o aviso." };

  try {
    await prisma.$transaction(async (tx) => {
      const ev = await tx.event.findFirst({ where: { id: eventId, tenantId }, select: { bingoConfirmed: true } });
      if (!ev) throw new Error("Evento inválido ou acesso negado.");
      if (ev.bingoConfirmed) {
        throw new Error("A rodada já foi decidida e solta no telão. Fale com o locutor (ele pode reabrir a decisão).");
      }
      await tx.bingoClaim.create({
        data: {
          eventId,
          prizeId: prize.id,
          cardShortId: claimedCard,
          claimantName: cleanName,
          fiscalName: fiscal,
          fiscalUserId: session?.user?.id ?? null,
          closedAtDraw: validation.closedAtDraw ?? null,
          drawnCount: validation.stats?.drawnCount ?? 0,
          activeKey: `${prize.id}:${claimedCard}`,
        },
      });
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { success: false, error: "Esta cartela já foi avisada nesta rodada. O locutor já tem o aviso dela na fila." };
    }
    return { success: false, error: error?.message ?? "Não foi possível enviar o aviso." };
  }

  await logAudit({
    tenantId,
    action: "BINGO_ALERT",
    eventId,
    metadata: { card: claimedCard, winnerName: cleanName, fiscal, closedAtDraw: validation.closedAtDraw ?? null },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// DECISÃO DO LOCUTOR SOBRE A FILA DE AVISOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Solta no telão o(s) ganhador(es) escolhido(s): UM só (os demais avisos ficam como "cederam") ou VÁRIOS
 * (prêmio dividido: o telão mostra todos os nomes). A decisão e o registro de auditoria entram na MESMA
 * transação: sem registro, não há decisão.
 */
export async function releaseWinners(eventId: string, claimIds: string[]) {
  try {
    const { tenantId } = await requireEventCapability(eventId, "canOperate");
    const session = await auth();
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const ev = await tx.event.findFirst({ where: { id: eventId, tenantId }, select: { bingoConfirmed: true } });
      if (!ev) throw new Error("Evento inválido ou acesso negado.");
      if (ev.bingoConfirmed) return { already: true as const };

      const prize = await tx.prize.findFirst({ where: { eventId, isCompleted: false }, orderBy: { order: "asc" }, select: { id: true } });
      if (!prize) throw new Error("Não há rodada ativa.");

      const pending = await tx.bingoClaim.findMany({
        where: { eventId, prizeId: prize.id, status: "PENDING" },
        orderBy: [{ closedAtDraw: "asc" }, { createdAt: "asc" }],
      });
      const sel = validateSelection(pending.map((p) => p.id), claimIds ?? []);
      if (!sel.ok) throw new Error(sel.error);

      const won = await tx.bingoClaim.updateMany({
        where: { id: { in: sel.chosen }, eventId, prizeId: prize.id, status: "PENDING" },
        data: { status: "WINNER", decidedById: session?.user?.id ?? null, decidedAt: now },
      });
      if (won.count !== sel.chosen.length) throw new Error("Os avisos mudaram enquanto você decidia. Atualize a tela e tente de novo.");

      if (sel.yielded.length > 0) {
        await tx.bingoClaim.updateMany({
          where: { id: { in: sel.yielded }, eventId, prizeId: prize.id, status: "PENDING" },
          data: { status: "YIELDED", decidedById: session?.user?.id ?? null, decidedAt: now },
        });
      }

      const winners = pending.filter((p) => sel.chosen.includes(p.id));
      const flipped = await tx.event.updateMany({
        where: { id: eventId, tenantId, bingoConfirmed: false },
        data: {
          bingoConfirmed: true,
          bingoConfirmedAt: now,
          // O telão e a mesa leem estes dois campos; para vários ganhadores eles trazem todos.
          pendingWinnerCard: winners.map((w) => w.cardShortId).join(", "),
          pendingWinnerName: joinNames(winners.map((w) => w.claimantName)),
        },
      });
      if (flipped.count !== 1) throw new Error("A rodada já foi decidida.");

      await tx.auditLog.create({
        data: await buildAuditData({
          action: "BINGO_RELEASED",
          eventId,
          tenantId,
          metadata: {
            mode: sel.mode,
            winners: winners.map((w) => ({ card: w.cardShortId, name: w.claimantName, closedAtDraw: w.closedAtDraw })),
            yielded: pending.filter((p) => sel.yielded.includes(p.id)).map((p) => ({ card: p.cardShortId, name: p.claimantName })),
          },
        }),
      });
      return { already: false as const, mode: sel.mode, count: winners.length };
    });

    revalidatePath("/", "layout");
    return { success: true as const, ...result };
  } catch (error: any) {
    return { success: false as const, error: (error?.message as string) ?? "Não foi possível soltar o telão." };
  }
}

/** Descarta um aviso da fila (falso alarme, nome errado…). O fiscal pode reenviar a cartela com o nome corrigido. */
export async function discardClaim(eventId: string, claimId: string) {
  try {
    const { tenantId } = await requireEventCapability(eventId, "canOperate");
    const session = await auth();

    const done = await prisma.$transaction(async (tx) => {
      const claim = await tx.bingoClaim.findFirst({ where: { id: claimId, eventId, status: "PENDING" } });
      if (!claim) return false;
      await tx.bingoClaim.update({
        where: { id: claim.id },
        data: { status: "DISCARDED", activeKey: null, decidedById: session?.user?.id ?? null, decidedAt: new Date() },
      });
      await tx.auditLog.create({
        data: await buildAuditData({
          action: "BINGO_CLAIM_DISCARDED",
          eventId,
          tenantId,
          metadata: { card: claim.cardShortId, name: claim.claimantName },
        }),
      });
      return true;
    });

    revalidatePath("/", "layout");
    return { success: true as const, nothingToDo: !done };
  } catch (error: any) {
    return { success: false as const, error: (error?.message as string) ?? "Não foi possível descartar." };
  }
}

/** Desfaz a decisão já solta no telão (por engano, ou apareceu mais alguém): todos voltam para a fila. */
export async function reopenDecision(eventId: string) {
  try {
    const { tenantId } = await requireEventCapability(eventId, "canOperate");

    const done = await prisma.$transaction(async (tx) => {
      const flipped = await tx.event.updateMany({
        where: { id: eventId, tenantId, bingoConfirmed: true },
        data: { bingoConfirmed: false, bingoConfirmedAt: null, pendingWinnerCard: null, pendingWinnerName: null },
      });
      if (flipped.count !== 1) return false;

      const prize = await tx.prize.findFirst({ where: { eventId, isCompleted: false }, orderBy: { order: "asc" }, select: { id: true } });
      if (prize) {
        await tx.bingoClaim.updateMany({
          where: { eventId, prizeId: prize.id, status: { in: ["WINNER", "YIELDED"] } },
          data: { status: "PENDING", decidedById: null, decidedAt: null },
        });
      }
      await tx.auditLog.create({ data: await buildAuditData({ action: "BINGO_DECISION_REOPENED", eventId, tenantId }) });
      return true;
    });

    revalidatePath("/", "layout");
    return { success: true as const, nothingToDo: !done };
  } catch (error: any) {
    return { success: false as const, error: (error?.message as string) ?? "Não foi possível reabrir a decisão." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENCERRAR RODADA E AVANÇAR PARA A PRÓXIMA
// ─────────────────────────────────────────────────────────────────────────────

export async function completeCurrentPrizeAndNext(eventId: string, currentPrizeId: string) {
  // ⚠️ CORREÇÃO CRÍTICA (Item 5): Garante posse do evento
  const { tenantId } = await requireEventCapability(eventId, "canOperate");

  // ⚠️ CORREÇÃO CRÍTICA (Item 5): Garante que o prêmio a encerrar pertence EXATAMENTE a este evento!
  const prize = await prisma.prize.findUnique({
    where: { id: currentPrizeId }
  });

  if (!prize || prize.eventId !== eventId) {
    throw new Error("Manipulação detectada. O prêmio não pertence a este evento.");
  }

  // Avisos de bingo AGUARDANDO decisão: não deixa encerrar (um ganhador legítimo se perderia). Decida ou descarte antes.
  const waiting = await prisma.bingoClaim.count({ where: { eventId, prizeId: currentPrizeId, status: "PENDING" } });
  if (waiting > 0) {
    return {
      success: false,
      error: `Há ${waiting} aviso${waiting === 1 ? "" : "s"} de bingo aguardando decisão. Solte o telão ou descarte antes de encerrar a rodada.`,
    };
  }

  // 🔒 Só UMA chamada encerra a rodada: o `where` exige o prêmio ainda aberto. Um segundo clique (ou outro aparelho)
  // encontra count = 0 e não zera as pedras da rodada seguinte por engano.
  const closedNow = await prisma.$transaction(async (tx) => {
    const closed = await tx.prize.updateMany({
      where: { id: currentPrizeId, eventId, isCompleted: false },
      data: { isCompleted: true },
    });
    if (closed.count !== 1) return false;
    await tx.event.update({
      where: { id: eventId },
      data: {
        drawnNumbers: [],
        pendingWinnerCard: null,
        pendingWinnerName: null,
        bingoConfirmed: false,
        bingoConfirmedAt: null,
      },
    });
    return true;
  });

  if (!closedNow) {
    revalidatePath("/", "layout");
    return { success: true, alreadyCompleted: true }; // já estava encerrada: nada a fazer, sem registro repetido
  }

  await logAudit({ tenantId, action: "ROUND_COMPLETED", eventId, metadata: { prizeName: prize.prizeName, prizeType: prize.type } });

  revalidatePath("/", "layout");
  return { success: true };
}