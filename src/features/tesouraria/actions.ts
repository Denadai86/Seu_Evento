"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant"; 
// Ajuste o import conforme seu projeto

export async function assignCardsToStaff(eventId: string, eventStaffId: string, shortIds: string[]) {
  try {
    await requireTenant(); // Validação de segurança

    if (!shortIds || shortIds.length === 0) {
      return { success: false, error: "Nenhuma cartela informada." };
    }

    // Atualiza apenas as cartelas que pertencem ao evento e ainda não foram vendidas
    const result = await prisma.card.updateMany({
      where: {
        eventId: eventId,
        shortId: { in: shortIds },
        isSold: false, // Não pode atribuir cartela já vendida
      },
      data: {
        eventStaffId: eventStaffId,
      },
    });

    if (result.count === 0) {
      return { success: false, error: "Nenhuma cartela válida encontrada para atribuição." };
    }

    return { success: true, count: result.count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function returnCardsFromStaff(eventId: string, eventStaffId: string, shortIds: string[]) {
  try {
    await requireTenant ();

    if (!shortIds || shortIds.length === 0) {
      return { success: false, error: "Nenhuma cartela informada." };
    }

    // Remove o eventStaffId, devolvendo ao estoque geral, DESDE QUE não esteja paga
    const result = await prisma.card.updateMany({
      where: {
        eventId: eventId,
        eventStaffId: eventStaffId,
        shortId: { in: shortIds },
        isPaid: false, // Trava financeira: não pode devolver cartela que já foi paga!
      },
      data: {
        eventStaffId: null,
      },
    });

    if (result.count === 0) {
      return { success: false, error: "Nenhuma cartela válida para devolução (ou já foram pagas)." };
    }

    return { success: true, count: result.count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}