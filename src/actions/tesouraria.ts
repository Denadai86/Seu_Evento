// src/actions/tesouraria.ts

"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireTreasuryAccess } from "@/lib/eventAccess";
import { groupByPrice } from "@/lib/cardPricing";
import { logAudit, codesCheckedUnpaid } from "@/lib/audit";
import { currentPrices, pricesOfTier } from "@/lib/priceTiers";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO AUXILIAR: VALIDAÇÃO DE SEGURANÇA (DRY - Don't Repeat Yourself)
// ─────────────────────────────────────────────────────────────────────────────
async function requireEventAccess(eventId: string) {
  // 🛡️ Tesouraria mexe em dinheiro: administrador OU tesoureiro DESTE evento (permissão "Tesouraria").
  const access = await requireTreasuryAccess(eventId);
  return { ...access.event, isAdmin: access.isAdmin };
}

// O voluntário informado precisa ser DESTE evento (impede apontar para staff de outro evento).
async function requireStaffOfEvent(eventId: string, eventStaffId: string) {
  const staff = await prisma.eventStaff.findFirst({ where: { id: eventStaffId, eventId }, select: { id: true } });
  if (!staff) throw new Error("Voluntário não pertence a este evento.");
}

// ─────────────────────────────────────────────────────────────────────────────
// ATRIBUIR CARTELAS PARA O VENDEDOR (STAFF)
// ─────────────────────────────────────────────────────────────────────────────
export async function assignCardsToStaff(eventId: string, eventStaffId: string, codes: string[]) {
  try {
    // 🛡️ SEGURANÇA: Garante que o evento pertence ao tenant logado
    await requireEventAccess(eventId);
    await requireStaffOfEvent(eventId, eventStaffId);

    if (!codes || codes.length === 0) throw new Error("Nenhum código informado.");

    // Busca apenas cartelas que existem no evento e estão LIVRES
    const availableCards = await prisma.card.findMany({
      where: {
        eventId,
        shortId: { in: codes },
        eventStaffId: null,
        blocked: false,
      },
      select: { id: true, shortId: true },
    });

    if (availableCards.length === 0) {
      return { success: false as const, error: "Nenhuma cartela livre encontrada com os códigos informados." };
    }

    const cardIds = availableCards.map(c => c.id);

    // Atualiza em lote — só as que AINDA estão livres (duas pessoas atribuindo juntas não se sobrescrevem)
    const assigned = await prisma.card.updateMany({
      where: { id: { in: cardIds }, eventId, eventStaffId: null },
      data: { eventStaffId },
    });

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    await logAudit({ action: "CARDS_ASSIGNED", eventId, metadata: { staffId: eventStaffId, count: assigned.count, mode: "codes" } });
    return { success: true as const, count: assigned.count };
  } catch (error: any) {
    console.error("[ASSIGN_CARDS_ERROR]", error);
    return { success: false as const, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVOLVER CARTELAS DO VENDEDOR (STAFF) PARA A TESOURARIA
// ─────────────────────────────────────────────────────────────────────────────
export async function returnCardsFromStaff(eventId: string, eventStaffId: string, codes: string[]) {
  try {
    // 🛡️ SEGURANÇA: Garante que o evento pertence ao tenant logado
    await requireEventAccess(eventId);
    await requireStaffOfEvent(eventId, eventStaffId);

    if (!codes || codes.length === 0) throw new Error("Nenhum código informado.");

    // Busca cartelas que estão com ESSE vendedor e NÃO foram pagas
    const returnableCards = await prisma.card.findMany({
      where: {
        eventId,
        eventStaffId,
        shortId: { in: codes },
        isPaid: false, // Regra de Ouro: Cartela paga não volta pro estoque!
      },
      select: { id: true },
    });

    if (returnableCards.length === 0) {
      return { success: false as const, error: "Nenhuma cartela válida para devolução (ou já foram pagas)." };
    }

    const cardIds = returnableCards.map(c => c.id);

    // Remove o vínculo — só de cartelas que continuam com esse vendedor e NÃO pagas
    const returned = await prisma.card.updateMany({
      where: { id: { in: cardIds }, eventId, eventStaffId, isPaid: false },
      data: { eventStaffId: null },
    });

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    await logAudit({ action: "CARDS_RETURNED", eventId, metadata: { staffId: eventStaffId, count: returned.count } });
    return { success: true as const, count: returned.count };
  } catch (error: any) {
    console.error("[RETURN_CARDS_ERROR]", error);
    return { success: false as const, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRAR PAGAMENTO DE CARTELAS NA TESOURARIA (FECHAMENTO DE CAIXA)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ENTREGA POR QUANTIDADE
// Sem "bipar" carta por carta: o admin diz quantas cartelas e de qual tipo, e o sistema separa as
// PRÓXIMAS livres na ORDEM DA IMPRESSÃO (código crescente). Basta entregar ao voluntário as próximas N
// da pilha impressa (impressa por tipo). Tudo ou nada: se faltar cartela livre, nada é entregue.
// ─────────────────────────────────────────────────────────────────────────────
export async function assignCardsByQuantity(
  eventId: string,
  eventStaffId: string,
  quantity: number,
  type: "QUINA" | "FULL_HOUSE"
) {
  try {
    await requireEventAccess(eventId);
    await requireStaffOfEvent(eventId, eventStaffId);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 2000) {
      throw new Error("Quantidade inválida (de 1 a 2000).");
    }
    if (type !== "QUINA" && type !== "FULL_HOUSE") throw new Error("Tipo de cartela inválido.");

    const codes = await prisma.$transaction(async (tx) => {
      const free = await tx.card.findMany({
        where: {
          eventId,
          eventStaffId: null,
          isSold: false,
          isPaid: false,
          blocked: false,
          // Cartela antiga (sem tipo) conta como Quina; cartela cheia só entra como cartela cheia.
          ...(type === "FULL_HOUSE" ? { type: "FULL_HOUSE" as const } : { OR: [{ type: "QUINA" as const }, { type: null }] }),
        },
        orderBy: { shortId: "asc" },
        take: quantity,
        select: { id: true, shortId: true },
      });

      if (free.length < quantity) {
        throw new Error(
          `Só há ${free.length} cartela(s) livre(s) desse tipo na fábrica. Gere mais cartelas ou reduza a quantidade.`
        );
      }

      const updated = await tx.card.updateMany({
        where: { id: { in: free.map((c) => c.id) }, eventStaffId: null },
        data: { eventStaffId },
      });
      if (updated.count !== free.length) {
        // Outra entrega pegou algumas no meio: desfaz tudo.
        throw new Error("Outra entrega ocupou algumas dessas cartelas agora há pouco. Tente de novo.");
      }

      return free.map((c) => c.shortId);
    });

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    await logAudit({
      action: "CARDS_ASSIGNED",
      eventId,
      metadata: { staffId: eventStaffId, count: codes.length, type, first: codes[0], last: codes[codes.length - 1], mode: "quantity" },
    });
    return { success: true as const, count: codes.length, first: codes[0], last: codes[codes.length - 1], codes };
  } catch (error: any) {
    console.error("[ASSIGN_BY_QUANTITY_ERROR]", error);
    return { success: false as const, error: error.message as string };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREÇOS DO ACERTO (fase escolhida pelo admin, ou a vigente agora)
// ─────────────────────────────────────────────────────────────────────────────
async function resolvePaymentPrices(
  eventId: string,
  event: { ticketPrice: number; fullHousePrice: number | null },
  tierId?: string
) {
  const tiers = await prisma.priceTier.findMany({
    where: { eventId },
    select: { id: true, name: true, quinaPrice: true, fullHousePrice: true, startsAt: true },
  });
  const base = { ticketPrice: event.ticketPrice, fullHousePrice: event.fullHousePrice };
  const current = currentPrices(base, tiers);
  const vigenteName = current.tier?.name ?? null;

  if (tierId) {
    const chosen = tiers.find((t) => t.id === tierId);
    if (!chosen) throw new Error("Fase de preço inválida para este evento.");
    // `overridden`: o administrador escolheu uma fase DIFERENTE da vigente (vai para a auditoria)
    return { ...pricesOfTier(base, chosen), vigenteName, overridden: chosen.id !== current.tier?.id };
  }
  return { ...current, vigenteName, overridden: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRÉVIA DO ACERTO "TUDO O QUE FICOU COM O VOLUNTÁRIO"
// Mostra quantas cartelas e quanto seria cobrado ANTES de confirmar (nada é gravado).
// ─────────────────────────────────────────────────────────────────────────────
export async function previewRemainingPayment(eventId: string, eventStaffId: string, tierId?: string) {
  try {
    const event = await requireEventAccess(eventId);
    if (tierId && !event.isAdmin) {
      throw new Error("Só o administrador pode escolher outra fase de preço. O acerto usa sempre a fase vigente.");
    }
    await requireStaffOfEvent(eventId, eventStaffId);
    const prices = await resolvePaymentPrices(eventId, event, tierId);

    const unpaid = await prisma.card.findMany({
      where: { eventId, eventStaffId, isPaid: false, blocked: false },
      select: { type: true },
    });
    if (unpaid.length === 0) return { success: false as const, error: "O voluntário não tem cartelas pendentes." };

    let byPrice: Map<number, typeof unpaid>;
    try {
      byPrice = groupByPrice(unpaid, prices.quina, prices.fullHouse);
    } catch {
      return { success: false as const, error: "Há cartela cheia sem preço definido. Defina o preço da cartela cheia no painel do evento." };
    }

    let amount = 0;
    for (const [price, group] of byPrice) amount += price * group.length;
    const fullHouse = unpaid.filter((c) => c.type === "FULL_HOUSE").length;

    return {
      success: true as const,
      count: unpaid.length,
      quina: unpaid.length - fullHouse,
      fullHouse,
      amount,
      tierName: prices.tier?.name ?? null,
    };
  } catch (error: any) {
    return { success: false as const, error: error.message as string };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACERTO (por códigos ou "tudo o que ficou com o voluntário")
// ─────────────────────────────────────────────────────────────────────────────
async function settlePayment(
  eventId: string,
  eventStaffId: string,
  codes: string[] | null, // null = todas as cartelas pendentes do voluntário
  tierId?: string // fase de preço a aplicar; vazio = a vigente agora
) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Usuário não autenticado.");

    // 🛡️ SEGURANÇA: só ORG_ADMIN; evento do tenant; traz os preços padrão do evento
    const event = await requireEventAccess(eventId);
    if (tierId && !event.isAdmin) {
      throw new Error("Só o administrador pode escolher outra fase de preço. O acerto usa sempre a fase vigente.");
    }
    await requireStaffOfEvent(eventId, eventStaffId);

    if (codes !== null && (!codes || codes.length === 0)) throw new Error("Nenhum código informado.");

    // 💰 Qual preço vale neste acerto? A cartela vendida em papel na pré-venda deve ser acertada pelo preço
    // da pré-venda, mesmo que o acerto aconteça no dia do evento. Por isso é o ADMIN quem escolhe a fase
    // (padrão: a vigente agora).
    const prices = await resolvePaymentPrices(eventId, event, tierId);

    // 🔒 IDEMPOTENTE: leitura, baixa e Transaction acontecem na MESMA transação, e a baixa só
    // atinge cartelas que ainda estão isPaid:false. Dois cliques / dois aparelhos ao mesmo tempo:
    // o segundo encontra count === 0 e NÃO cria pagamento. O valor usa o count REAL da baixa.
    const result = await prisma.$transaction(async (tx) => {
      const unpaid = await tx.card.findMany({
        where: {
          eventId,
          eventStaffId,
          isPaid: false,
          blocked: false, // cartela perdida não entra no acerto
          ...(codes ? { shortId: { in: codes } } : {}),
        },
        select: { id: true, type: true, shortId: true },
      });
      if (unpaid.length === 0) return { count: 0, amount: 0, breakdown: [] as { price: number; qty: number }[], codes: [] as string[] };

      // Preço de cada cartela pelo TIPO dela, na fase escolhida. O valor fica gravado em `price`.
      let byPrice: Map<number, typeof unpaid>;
      try {
        byPrice = groupByPrice(unpaid, prices.quina, prices.fullHouse);
      } catch {
        throw new Error("Há cartela cheia sem preço definido. Defina o preço da cartela cheia no painel do evento.");
      }

      let paidTotal = 0;
      let amount = 0;
      const breakdown: { price: number; qty: number }[] = [];
      for (const [price, group] of byPrice) {
        const marked = await tx.card.updateMany({
          where: { id: { in: group.map((c) => c.id) }, eventId, eventStaffId, isPaid: false },
          data: { isSold: true, isPaid: true, price },
        });
        paidTotal += marked.count;
        amount += marked.count * price;
        if (marked.count > 0) breakdown.push({ price, qty: marked.count });
      }
      if (paidTotal === 0) return { count: 0, amount: 0, breakdown, codes: [] as string[] };

      await tx.transaction.create({
        data: {
          eventId,
          eventStaffId, // O voluntário (EventStaff) a quem as cartelas pertenciam
          amount,
          method: "CASH", // Acerto direto na tesouraria
        },
      });

      return { count: paidTotal, amount, breakdown, codes: unpaid.map((c) => c.shortId) };
    });

    if (result.count === 0) {
      return { success: false as const, error: "Nenhuma cartela pendente encontrada (ou o pagamento já foi registrado)." };
    }

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    const late = await codesCheckedUnpaid(eventId, result.codes);
    if (late.length > 0) {
      await logAudit({ action: "PAID_AFTER_BINGO_CHECK", eventId, metadata: { cards: late, via: "ACERTO", staffId: eventStaffId } });
    }
    await logAudit({
      action: "PAYMENT_REGISTERED",
      eventId,
      metadata: {
        staffId: eventStaffId,
        count: result.count,
        amount: result.amount,
        breakdown: result.breakdown, // ex.: 3 × R$ 10,00 + 2 × R$ 15,00
        tier: prices.tier?.name ?? null, // fase aplicada
        vigente: prices.vigenteName, // fase vigente na hora do acerto
        overridden: prices.overridden, // o administrador escolheu outra fase que não a vigente
        mode: codes ? "codes" : "all",
        asAdmin: event.isAdmin,
      },
    });
    return { success: true as const, count: result.count, amount: result.amount, tierName: prices.tier?.name ?? null };
  } catch (error: any) {
    console.error("[REGISTER_PAYMENT_ERROR]", error);
    return { success: false as const, error: error.message as string };
  }
}

export async function registerCardPayment(
  eventId: string,
  eventStaffId: string,
  codes: string[],
  tierId?: string
) {
  return settlePayment(eventId, eventStaffId, codes, tierId);
}

/** Acerta TUDO o que continua com o voluntário (depois de devolver as não vendidas). */
export async function registerPaymentForAllRemaining(eventId: string, eventStaffId: string, tierId?: string) {
  return settlePayment(eventId, eventStaffId, null, tierId);
}
