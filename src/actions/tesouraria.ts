"use server";

// src/actions/tesouraria.ts


import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireOrgAdmin } from "@/lib/requireTenant";
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
    select: { id: true, ticketPrice: true }
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
export async function registerCardPayment(eventId: string, eventStaffId: string, codes: string[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Usuário não autenticado.");

    // 🛡️ SEGURANÇA: só ORG_ADMIN; evento do tenant; traz o preço atual da cartela
    const event = await requireEventAccess(eventId);
    await requireStaffOfEvent(eventId, eventStaffId);

    if (!codes || codes.length === 0) throw new Error("Nenhum código informado.");

    // 🔒 IDEMPOTENTE: leitura, baixa e Transaction acontecem na MESMA transação, e a baixa só
    // atinge cartelas que ainda estão isPaid:false. Dois cliques / dois aparelhos ao mesmo tempo:
    // o segundo encontra count === 0 e NÃO cria pagamento. O valor usa o count REAL da baixa.
    const paidCount = await prisma.$transaction(async (tx) => {
      const unpaid = await tx.card.findMany({
        where: { eventId, eventStaffId, shortId: { in: codes }, isPaid: false },
        select: { id: true },
      });
      if (unpaid.length === 0) return 0;

      const marked = await tx.card.updateMany({
        where: { id: { in: unpaid.map((c) => c.id) }, eventId, eventStaffId, isPaid: false },
        data: { isSold: true, isPaid: true },
      });
      if (marked.count === 0) return 0;

      await tx.transaction.create({
        data: {
          eventId,
          eventStaffId, // O voluntário (EventStaff) a quem as cartelas pertenciam
          amount: marked.count * event.ticketPrice,
          method: "CASH", // Acerto direto na tesouraria
        },
      });

      return marked.count;
    });

    if (paidCount === 0) {
      return { success: false, error: "Nenhuma cartela pendente encontrada (ou o pagamento já foi registrado)." };
    }

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    return { success: true, count: paidCount };
  } catch (error: any) {
    console.error("[REGISTER_PAYMENT_ERROR]", error);
    return { success: false, error: error.message };
  }
}
