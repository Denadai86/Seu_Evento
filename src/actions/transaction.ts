"use server";

import prisma from "@/lib/prisma";

export async function getFinancialReport(eventId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { eventId },
    include: {
      seller: { select: { name: true } },
      card: { select: { shortId: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  // Agregações eficientes em memória
  const summary = transactions.reduce(
    (acc, tx) => {
      acc.total += tx.amount;
      if (tx.method === "PIX") acc.pix += tx.amount;
      if (tx.method === "CASH") acc.cash += tx.amount;
      if (tx.method === "CARD") acc.card += tx.amount;
      return acc;
    },
    { total: 0, pix: 0, cash: 0, card: 0 }
  );

  return {
    success: true,
    summary,
    transactions: transactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      method: tx.method,
      createdAt: tx.createdAt,
      sellerName: tx.seller?.name || "Administração",
      cardId: tx.card?.shortId || "N/A"
    }))
  };
}