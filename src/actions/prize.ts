// src/actions/prize.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";


// Adicionamos o sponsorId como último parâmetro (opcional)
export async function createPrize(eventId: string, name: string, type: "QUINA" | "FULL_HOUSE", prizeName: string, order: number, sponsorId?: string | null) {
  await prisma.prize.create({
    data: {
      eventId,
      name,
      type,
      prizeName,
      order,
      sponsorId: sponsorId || null, // Salva o patrocinador ou deixa null
    }
  });
  
  revalidatePath("/", "layout");
  return { success: true };
}

// Suas outras funções continuam iguais (deletePrize, updatePrizeOrders, etc)...


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

export async function addPrize(eventId: string, name: string, type: "QUINA" | "FULL_HOUSE", prizeName: string, sponsorId?: string) {
  const count = await prisma.prize.count({ where: { eventId } });
  
  await prisma.prize.create({
    data: {
      eventId,
      name,
      type,
      prizeName,
      order: count + 1,
      // Se não vier patrocinador, ele salva como null (Próprio)
      sponsorId: sponsorId || null, 
    }
  });
  
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deletePrize(prizeId: string) {
  await prisma.prize.delete({ where: { id: prizeId } });
  revalidatePath("/", "layout");
  return { success: true };
}