// src/actions/tesouraria.ts

"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireOrgAdmin } from "@/lib/requireTenant";
import { groupByPrice } from "@/lib/cardPricing";
import { currentPrices, pricesOfTier } from "@/lib/priceTiers";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO AUXILIAR: VALIDAÇÃO DE SEGURANÇA (DRY - Don't Repeat Yourself)
// ─────────────────────────────────────────────────────────────────────────────
async function requireEventAccess(eventId: string) {
  // 🛡️ Tesouraria mexe em dinheiro: só o administrador da organização (ORG_ADMIN).
  const tenantId = await requireOrgAdmin();
  
  // Busca o evento para garantir que pertence à ONG atual e retorna dados úteis (como o preço)
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { id: true, ticketPrice: true, fullHousePrice: true }
  });

  if (!event) {
    throw new Error("Acesso negado. Evento não encontrado ou não pertence à sua organização.");
  }

  return event;
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
      },
      select: { id: true, shortId: true },
    });

    if (availableCards.length === 0) {
      return { success: false, error: "Nenhuma cartela livre encontrada com os códigos informados." };
    }

    const cardIds = availableCards.map(c => c.id);

    // Atualiza em lote — só as que AINDA estão livres (duas pessoas atribuindo juntas não se sobrescrevem)
    const assigned = await prisma.card.updateMany({
      where: { id: { in: cardIds }, eventId, eventStaffId: null },
      data: { eventStaffId },
    });

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    return { success: true, count: assigned.count };
  } catch (error: any) {
    console.error("[ASSIGN_CARDS_ERROR]", error);
    return { success: false, error: error.message };
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
      return { success: false, error: "Nenhuma cartela válida para devolução (ou já foram pagas)." };
    }

    const cardIds = returnableCards.map(c => c.id);

    // Remove o vínculo — só de cartelas que continuam com esse vendedor e NÃO pagas
    const returned = await prisma.card.updateMany({
      where: { id: { in: cardIds }, eventId, eventStaffId, isPaid: false },
      data: { eventStaffId: null },
    });

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    return { success: true, count: returned.count };
  } catch (error: any) {
    console.error("[RETURN_CARDS_ERROR]", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRAR PAGAMENTO DE CARTELAS NA TESOURARIA (FECHAMENTO DE CAIXA)
// ─────────────────────────────────────────────────────────────────────────────
export async function registerCardPayment(
  eventId: string,
  eventStaffId: string,
  codes: string[],
  tierId?: string // fase de preço a aplicar; vazio = a vigente agora
) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Usuário não autenticado.");

    // 🛡️ SEGURANÇA: só ORG_ADMIN; evento do tenant; traz os preços padrão do evento
    const event = await requireEventAccess(eventId);
    await requireStaffOfEvent(eventId, eventStaffId);

    if (!codes || codes.length === 0) throw new Error("Nenhum código informado.");

    // 💰 Qual preço vale neste acerto? A cartela vendida em papel na pré-venda deve ser acertada pelo preço
    // da pré-venda, mesmo que o acerto aconteça no dia do evento. Por isso é o ADMIN quem escolhe a fase
    // (padrão: a vigente agora).
    const tiers = await prisma.priceTier.findMany({
      where: { eventId },
      select: { id: true, name: true, quinaPrice: true, fullHousePrice: true, startsAt: true },
    });
    const base = { ticketPrice: event.ticketPrice, fullHousePrice: event.fullHousePrice };
    let prices;
    if (tierId) {
      const chosen = tiers.find((t) => t.id === tierId);
      if (!chosen) throw new Error("Fase de preço inválida para este evento.");
      prices = pricesOfTier(base, chosen);
    } else {
      prices = currentPrices(base, tiers);
    }

    // 🔒 IDEMPOTENTE: leitura, baixa e Transaction acontecem na MESMA transação, e a baixa só
    // atinge cartelas que ainda estão isPaid:false. Dois cliques / dois aparelhos ao mesmo tempo:
    // o segundo encontra count === 0 e NÃO cria pagamento. O valor usa o count REAL da baixa.
    const result = await prisma.$transaction(async (tx) => {
      const unpaid = await tx.card.findMany({
        where: { eventId, eventStaffId, shortId: { in: codes }, isPaid: false },
        select: { id: true, type: true },
      });
      if (unpaid.length === 0) return { count: 0, amount: 0 };

      // Preço de cada cartela pelo TIPO dela, na fase escolhida. O valor fica gravado em `price`.
      let byPrice: Map<number, typeof unpaid>;
      try {
        byPrice = groupByPrice(unpaid, prices.quina, prices.fullHouse);
      } catch {
        throw new Error("Há cartela cheia sem preço definido. Defina o preço da cartela cheia no painel do evento.");
      }

      let paidTotal = 0;
      let amount = 0;
      for (const [price, group] of byPrice) {
        const marked = await tx.card.updateMany({
          where: { id: { in: group.map((c) => c.id) }, eventId, eventStaffId, isPaid: false },
          data: { isSold: true, isPaid: true, price },
        });
        paidTotal += marked.count;
        amount += marked.count * price;
      }
      if (paidTotal === 0) return { count: 0, amount: 0 };

      await tx.transaction.create({
        data: {
          eventId,
          eventStaffId, // O voluntário (EventStaff) a quem as cartelas pertenciam
          amount,
          method: "CASH", // Acerto direto na tesouraria
        },
      });

      return { count: paidTotal, amount };
    });

    if (result.count === 0) {
      return { success: false, error: "Nenhuma cartela pendente encontrada (ou o pagamento já foi registrado)." };
    }

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    return { success: true, count: result.count, amount: result.amount, tierName: prices.tier?.name ?? null };
  } catch (error: any) {
    console.error("[REGISTER_PAYMENT_ERROR]", error);
    return { success: false, error: error.message };
  }
}
