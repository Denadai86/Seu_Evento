// src/actions/tesouraria.ts

"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireTenant } from "@/lib/requireTenant";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO AUXILIAR: VALIDAÇÃO DE SEGURANÇA (DRY - Don't Repeat Yourself)
// ─────────────────────────────────────────────────────────────────────────────
async function requireEventAccess(eventId: string) {
  const tenantId = await requireTenant();
  
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

// ─────────────────────────────────────────────────────────────────────────────
// ATRIBUIR CARTELAS PARA O VENDEDOR (STAFF)
// ─────────────────────────────────────────────────────────────────────────────
export async function assignCardsToStaff(eventId: string, eventStaffId: string, codes: string[]) {
  try {
    // 🛡️ SEGURANÇA: Garante que o evento pertence ao tenant logado
    await requireEventAccess(eventId);

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

    // Atualiza em lote (MUITO mais rápido que fazer um por um)
    await prisma.card.updateMany({
      where: { id: { in: cardIds } },
      data: { eventStaffId },
    });

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    return { success: true, count: cardIds.length };
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

    // Remove o vínculo (volta pra fábrica)
    await prisma.card.updateMany({
      where: { id: { in: cardIds } },
      data: { eventStaffId: null },
    });

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    return { success: true, count: cardIds.length };
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

    // 🛡️ SEGURANÇA: Retorna o evento apenas se pertencer ao tenant e traz o preço atual da cartela
    const event = await requireEventAccess(eventId);

    if (!codes || codes.length === 0) throw new Error("Nenhum código informado.");

    // Busca as cartelas que estão com ESSE voluntário e ainda NÃO foram pagas
    const unpaidCards = await prisma.card.findMany({
      where: {
        eventId,
        eventStaffId,
        shortId: { in: codes },
        isPaid: false,
      },
      select: { id: true },
    });

    if (unpaidCards.length === 0) {
      return { success: false, error: "Nenhuma cartela pendente encontrada com os códigos informados." };
    }

    const cardIds = unpaidCards.map(c => c.id);
    
    // 🧮 CÁLCULO FINANCEIRO: Quantidade de cartelas * Preço do Evento
    const totalAmountInCents = cardIds.length * event.ticketPrice;

    // ⚠️ CORREÇÃO CRÍTICA (Item 12): Transação ACID adaptada ao seu Schema Prisma Real
    await prisma.$transaction(async (tx) => {
      // 1. Baixa as cartelas
      await tx.card.updateMany({
        where: { id: { in: cardIds } },
        data: { 
          isSold: true, 
          isPaid: true 
        },
      });

      // 2. Cria a Transação vinculando ao EventStaff
      // O TypeScript agora ficará feliz, pois os campos batem 100% com o schema!
      await tx.transaction.create({
        data: {
          eventId: eventId,
          eventStaffId: eventStaffId, // O voluntário (EventStaff) a quem as cartelas pertenciam
          amount: totalAmountInCents, // Valor sendo inserido
          method: "CASH", // Assumimos dinheiro espécie no acerto direto de tesouraria
        }
      });
    });

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    return { success: true, count: cardIds.length };
  } catch (error: any) {
    console.error("[REGISTER_PAYMENT_ERROR]", error);
    return { success: false, error: error.message };
  }
}