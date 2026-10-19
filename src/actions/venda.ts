// src/actions/venda.ts
"use server";

import prisma from "@/lib/prisma";
import { groupByPrice, priceForCard } from "@/lib/cardPricing";
import { currentPrices } from "@/lib/priceTiers";
import { UNDO_WINDOW_MS } from "@/lib/saleRules";
import { buildAuditData, codesCheckedUnpaid, logAudit } from "@/lib/audit";
import { randomUUID } from "node:crypto";
import { PaymentMethod } from "@prisma/client";
import { requireTenant, requireStaffForEvent } from "@/lib/requireTenant"; // 🔥 Importação Corrigida
import { auth } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// PROCESSAR VENDA EM LOTE (PDV — transação atômica)
// ─────────────────────────────────────────────────────────────────────────────
export async function processBatchSale(
  eventId: string,
  shortIds: string[],
  method: PaymentMethod,
  eventStaffId: string,
  expectedTotal?: number // total (centavos) que o caixa viu na tela: se a fase de preço mudou no meio, a venda é recusada
) {
  if (!shortIds || shortIds.length === 0) return { success: false, error: "Carrinho vazio." };

  try {
    const tenantId = await requireTenant();
    
    // 🛡️ CORREÇÃO CRÍTICA: Vazamento de Permissões
    // Não basta estar logado. O voluntário precisa da permissão 'canSell' para ESTE evento.
    // O requireStaffForEvent (que você mesmo criou) lança um erro se a permissão for falsa.
    await requireStaffForEvent(eventId, 'canSell');

    // 🛡️ SEGURANÇA: Garantimos que o eventStaffId enviado no payload pertence 
    // ao usuário que está executando a action (prevenindo que o Vendedor A venda em nome do Vendedor B)
    const session = await auth();

    const staff = await prisma.eventStaff.findUnique({
      where: { id: eventStaffId },
      select: { userId: true, eventId: true },
    });

    if (!staff || staff.userId !== session!.user.id || staff.eventId !== eventId) {
      return { success: false, error: "Acesso negado. Você não pode vender em nome de outro vendedor." };
    }

    // Se o middleware NextAuth passar um ID de sessão, vamos cruzar:
    // NOTA: Como você não exporta a sessão diretamente aqui, o requireStaffForEvent 
    // já buscou a sessão por baixo dos panos, o que nos garante a camada de cima.

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { ticketPrice: true, fullHousePrice: true, isActive: true, tenantId: true, status: true },
    });

    if (!event || event.tenantId !== tenantId) return { success: false, error: "Evento inválido ou acesso negado." };
    // closeEvent grava "FINISHED"; "ENCERRADO" fica por compatibilidade com dados antigos
    if (event.status === "ENCERRADO" || event.status === "FINISHED") return { success: false, error: "Este evento já está encerrado. O caixa encontra-se fechado." };
    if (!event.isActive) return { success: false, error: "Evento não está ativo. O caixa foi encerrado pela administração." };

    const ticketPrice = event.ticketPrice > 0 ? event.ticketPrice : 2500;

    // 💰 O preço vem da FASE VIGENTE definida pelo admin (ou do preço padrão), calculado aqui no servidor.
    const tiers = await prisma.priceTier.findMany({
      where: { eventId },
      select: { id: true, name: true, quinaPrice: true, fullHousePrice: true, startsAt: true },
    });
    const prices = currentPrices({ ticketPrice, fullHousePrice: event.fullHousePrice }, tiers);

    const batchId = randomUUID();

    await prisma.$transaction(async (tx) => {
      const existingCards = await tx.card.findMany({
        where: { shortId: { in: shortIds }, eventId },
      });

      if (existingCards.length !== shortIds.length) {
        throw new Error("Uma ou mais cartelas não pertencem a este evento.");
      }

      const blockedCards = existingCards.filter((c) => c.blocked);
      if (blockedCards.length > 0) {
        throw new Error(`Cartela bloqueada (perdida ou cancelada): ${blockedCards.map((c) => c.shortId).join(", ")}`);
      }

      const alreadySold = existingCards.filter((c) => c.isSold);
      if (alreadySold.length > 0) {
        throw new Error(
          `Conflito! Cartelas já vendidas: ${alreadySold.map((c) => c.shortId).join(", ")}`
        );
      }

      // 💰 O preço de CADA cartela vem do tipo dela (quina ou cartela cheia), calculado aqui no servidor.
      // O navegador só mostra o total; nunca decide o valor cobrado.
      let byPrice: Map<number, typeof existingCards>;
      try {
        byPrice = groupByPrice(existingCards, prices.quina, prices.fullHouse);
      } catch {
        throw new Error("Há cartela cheia sem preço definido. Defina o preço da cartela cheia no painel do evento.");
      }
      const priceById = new Map<string, number>();
      for (const [price, group] of byPrice) for (const c of group) priceById.set(c.id, price);

      // Se a fase de preço virou entre o "adicionar cartela" e o "finalizar", o total da tela ficou velho.
      // Recusa a venda (nada é cobrado) para o caixa conferir o valor novo.
      if (expectedTotal != null) {
        const total = existingCards.reduce((sum, c) => sum + priceById.get(c.id)!, 0);
        if (Math.round(total) !== Math.round(expectedTotal)) throw new Error("PRICE_CHANGED");
      }

      // Atualiza cartelas — 🔒 só as que AINDA não foram vendidas (isSold: false no próprio UPDATE).
      // A checagem acima não basta: dois caixas no mesmo instante passariam os dois por ela.
      let markedTotal = 0;
      for (const [price, group] of byPrice) {
        const marked = await tx.card.updateMany({
          where: { shortId: { in: group.map((c) => c.shortId) }, eventId, isSold: false, blocked: false },
          data: { isSold: true, isPaid: true, eventStaffId, price },
        });
        markedTotal += marked.count;
      }

      if (markedTotal !== shortIds.length) {
        // Desfaz a transação inteira: nada é vendido nem cobrado pela metade.
        throw new Error("Conflito! Outra venda ocupou uma ou mais cartelas agora há pouco. Atualize a lista e tente de novo.");
      }

      // Registra caixa financeiro atrelado à escala do funcionário
      await tx.transaction.createMany({
        data: existingCards.map((card) => ({
          eventId,
          cardId: card.id,
          eventStaffId,
          amount: priceById.get(card.id)!,
          method,
          batchId, // agrupa esta venda: é o que permite desfazer
        })),
      });
    });

    // Cartela que o fiscal já tinha conferido como NÃO paga e que só agora foi paga: fica destacado na auditoria.
    const late = await codesCheckedUnpaid(eventId, shortIds);
    if (late.length > 0) {
      await logAudit({ tenantId, action: "PAID_AFTER_BINGO_CHECK", eventId, metadata: { cards: late, via: "PDV", staffId: eventStaffId } });
    }

    return { success: true };
  } catch (error: any) {
    if (error?.message === "PRICE_CHANGED") {
      return {
        success: false,
        priceChanged: true,
        error: "Os preços mudaram desde que as cartelas foram adicionadas. Os valores foram atualizados: confira o total e tente de novo.",
      };
    }
    console.error("[PROCESS_BATCH_SALE_ERROR]", error);
    return { success: false, error: error.message || "Falha crítica ao processar carrinho." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTA DE CARTELA PARA O PDV
// O caixa precisa saber o TIPO e o PREÇO de cada cartela antes de fechar a venda
// (cartela cheia custa diferente da quina). Também avisa na hora se o código não existe ou já foi vendido.
// ─────────────────────────────────────────────────────────────────────────────
export async function lookupCardForSale(eventId: string, shortId: string) {
  try {
    const tenantId = await requireTenant();
    await requireStaffForEvent(eventId, "canSell");

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { ticketPrice: true, fullHousePrice: true },
    });
    if (!event) return { success: false, error: "Evento inválido ou acesso negado." };

    const tiers = await prisma.priceTier.findMany({
      where: { eventId },
      select: { id: true, name: true, quinaPrice: true, fullHousePrice: true, startsAt: true },
    });

    const card = await prisma.card.findFirst({
      where: { eventId, shortId: shortId.trim().toUpperCase() },
      select: { shortId: true, type: true, isSold: true, blocked: true },
    });
    if (!card) return { success: false, error: "Cartela não encontrada neste evento." };
    if (card.blocked) return { success: false, error: "Esta cartela está BLOQUEADA (perdida ou cancelada). Não pode ser vendida." };
    if (card.isSold) return { success: false, error: "Esta cartela já foi vendida." };

    const ticketPrice = event.ticketPrice > 0 ? event.ticketPrice : 2500;
    const prices = currentPrices({ ticketPrice, fullHousePrice: event.fullHousePrice }, tiers);
    const price = priceForCard(card.type, prices.quina, prices.fullHouse);
    if (price === null) {
      return { success: false, error: "O preço da cartela cheia ainda não foi definido. Avise o administrador." };
    }

    return { success: true, shortId: card.shortId, type: card.type, price, tierName: prices.tier?.name ?? null };
  } catch (error: any) {
    return { success: false, error: error.message || "Não foi possível consultar a cartela." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DESFAZER A ÚLTIMA VENDA (erro de digitação, cliente desistiu)
// Só a PRÓPRIA última venda do voluntário, dentro de 10 minutos. As cartelas voltam para a mão dele,
// os lançamentos são apagados e FICA REGISTRADO no log de auditoria (quem, quando, quais cartelas).
// ─────────────────────────────────────────────────────────────────────────────
export async function undoLastSale(eventId: string) {
  try {
    const tenantId = await requireTenant();
    const me = await requireStaffForEvent(eventId, "canSell");

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { status: true } });
    if (!event) throw new Error("Evento inválido ou acesso negado.");
    if (event.status === "ENCERRADO" || event.status === "FINISHED") {
      throw new Error("Evento encerrado: o caixa está fechado e a venda não pode ser desfeita.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const last = await tx.transaction.findFirst({
        where: { eventId, eventStaffId: me.id, cardId: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { batchId: true, createdAt: true },
      });
      if (!last) throw new Error("Você ainda não fez nenhuma venda.");
      if (!last.batchId) throw new Error("Esta venda é antiga e não pode ser desfeita automaticamente. Fale com o administrador.");
      if (Date.now() - last.createdAt.getTime() > UNDO_WINDOW_MS) {
        throw new Error("Passaram mais de 10 minutos. Fale com o administrador para corrigir.");
      }

      const batch = await tx.transaction.findMany({
        where: { eventId, eventStaffId: me.id, batchId: last.batchId },
        select: { id: true, cardId: true, amount: true, method: true, card: { select: { shortId: true } } },
      });
      const cardIds = batch.map((b) => b.cardId).filter((id): id is string => !!id);
      const codes = batch.map((b) => b.card?.shortId).filter((c): c is string => !!c).sort();
      const total = batch.reduce((s, b) => s + b.amount, 0);

      const reverted = await tx.card.updateMany({
        where: { id: { in: cardIds }, eventId, isPaid: true, eventStaffId: me.id },
        data: { isSold: false, isPaid: false, price: null },
      });
      if (reverted.count !== cardIds.length) {
        throw new Error("Algumas cartelas dessa venda já foram alteradas. Fale com o administrador.");
      }

      await tx.transaction.deleteMany({ where: { id: { in: batch.map((b) => b.id) } } });

      await tx.auditLog.create({
        data: await buildAuditData({
          action: "SALE_UNDONE",
          eventId,
          tenantId,
          metadata: { staffId: me.id, batchId: last.batchId, codes, total, method: batch[0]?.method ?? null },
        }),
      });

      return { count: codes.length, total, codes };
    });

    return { success: true as const, ...result };
  } catch (error: any) {
    return { success: false as const, error: error.message as string };
  }
}
