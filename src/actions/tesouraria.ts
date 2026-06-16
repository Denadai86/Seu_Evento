// src/actions/tesouraria.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function assignCardsToStaff(eventId: string, eventStaffId: string, codes: string[]) {
  try {
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
    return { success: false, error: error.message };
  }
}

export async function returnCardsFromStaff(eventId: string, eventStaffId: string, codes: string[]) {
  try {
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
    return { success: false, error: error.message };
  }
}

// Adicione no final do arquivo src/actions/tesouraria.ts

export async function registerCardPayment(eventId: string, eventStaffId: string, codes: string[]) {
  try {
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

    // Registra o pagamento (Baixa a cartela)
    // isSold = true (Foi vendida pro cliente final)
    // isPaid = true (O dinheiro já está na Tesouraria)
    await prisma.card.updateMany({
      where: { id: { in: cardIds } },
      data: { 
        isSold: true, 
        isPaid: true 
      },
    });

    // BÔNUS SÊNIOR: Aqui no futuro você pode dar um prisma.transaction.create() 
    // para registrar o fluxo de caixa exato dessa operação no fechamento.

    revalidatePath(`/dashboard/${eventId}/tesouraria`);
    return { success: true, count: cardIds.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}