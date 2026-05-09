// src/actions/seller.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 1. Cria um novo vendedor
export async function createSeller(eventId: string, name: string, phone?: string) {
  await prisma.seller.create({
    data: { eventId, name, phone },
  });
  revalidatePath("/");
  return { success: true };
}

// 2. Entrega um lote de cartelas para um vendedor
export async function assignCardsToSeller(eventId: string, sellerId: string, quantity: number) {
  // Pega cartelas que ainda não têm dono
  const availableCards = await prisma.card.findMany({
    where: { eventId, sellerId: null },
    take: quantity,
    select: { id: true },
  });

  if (availableCards.length < quantity) {
    return { success: false, error: `Há apenas ${availableCards.length} cartelas livres no estoque. Gere mais cartelas primeiro.` };
  }

  const cardIds = availableCards.map(c => c.id);

  await prisma.card.updateMany({
    where: { id: { in: cardIds } },
    data: { sellerId },
  });

  revalidatePath("/");
  return { success: true, count: cardIds.length };
}

// 3. Dá a baixa financeira (Total ou Parcial)
export async function markSellerAsPaid(sellerId: string, quantity: number) {
  // Busca apenas as cartelas não pagas desse vendedor
  const unpaidCards = await prisma.card.findMany({
    where: { sellerId, isPaid: false },
    take: quantity,
    select: { id: true },
  });

  if (unpaidCards.length < quantity) {
    return { success: false, error: "O vendedor não possui essa quantidade de cartelas pendentes para pagar." };
  }

  const cardIds = unpaidCards.map(c => c.id);

  await prisma.card.updateMany({
    where: { id: { in: cardIds } },
    data: { isPaid: true },
  });
  
  revalidatePath("/");
  return { success: true };
}

// 4. Devolve cartelas não vendidas para o estoque geral
export async function returnCardsFromSeller(sellerId: string, quantity: number) {
  // Pega apenas as cartelas que estão com o vendedor e AINDA NÃO foram pagas
  const availableToReturn = await prisma.card.findMany({
    where: { sellerId, isPaid: false },
    take: quantity,
    select: { id: true },
  });

  if (availableToReturn.length < quantity) {
    return { success: false, error: "O vendedor não possui essa quantidade de cartelas pendentes para devolver." };
  }

  const cardIds = availableToReturn.map(c => c.id);

  // Remove o sellerId, devolvendo as cartelas para o bolo do evento
  await prisma.card.updateMany({
    where: { id: { in: cardIds } },
    data: { sellerId: null },
  });

  revalidatePath("/");
  return { success: true };
}

// 5. Excluir Vendedor (Com trava de segurança financeira)
export async function deleteSeller(sellerId: string) {
  // Verifica se ele já pagou alguma coisa
  const paidCount = await prisma.card.count({ where: { sellerId, isPaid: true } });
  
  if (paidCount > 0) {
    return { 
      success: false, 
      error: "Este vendedor possui cartelas pagas no histórico. Por segurança financeira e auditoria, ele não pode ser excluído." 
    };
  }

  // Se não tem dinheiro envolvido, devolve as cartelas soltas pro estoque...
  await prisma.card.updateMany({
    where: { sellerId },
    data: { sellerId: null },
  });

  // ...e apaga o vendedor!
  await prisma.seller.delete({ where: { id: sellerId } });
  revalidatePath("/");
  return { success: true };
}


