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

  //revalidatePath("/");
  return { success: true };
}

export async function deletePrize(prizeId: string) {
  await prisma.prize.delete({ where: { id: prizeId } });
  revalidatePath("/");
  return { success: true };
}