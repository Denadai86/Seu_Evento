// src/actions/prize.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPrize(
  eventId: string, 
  name: string, 
  type: "QUINA" | "FULL_HOUSE", 
  prizeName: string, 
  order: number
) {
  if (!name || !prizeName || !order) {
    return { success: false, error: "Preencha todos os campos." };
  }

  await prisma.prize.create({
    data: { eventId, name, type, prizeName, order }
  });

  return { success: true };
}

export async function deletePrize(prizeId: string) {
  await prisma.prize.delete({ where: { id: prizeId } });
  return { success: true };
}

// 🔥 NOVO: Motor de Reordenação em Lote
export async function updatePrizeOrders(orderedIds: string[]) {
  if (!orderedIds.length) return { success: true };

  try {
    // Executa N atualizações simultâneas no banco de forma atômica
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.prize.update({
          where: { id },
          data: { order: index + 1 }, // A nova ordem passa a ser o índice do array + 1
        })
      )
    );
    return { success: true };
  } catch (error) {
    console.error("Erro ao reordenar prêmios:", error);
    return { success: false, error: "Falha ao salvar a nova ordem." };
  }
}