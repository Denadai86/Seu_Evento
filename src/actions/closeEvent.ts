// src/actions/closeEvent.ts
"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant";
import { revalidatePath } from "next/cache";

export async function closeEventAndGenerateReport(eventId: string) {
  const tenantId = await requireTenant();

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: {
      transactions: true,
      staff: {
        include: {
          user: { select: { name: true } },
          cards: true,
        },
      },
    },
  });

  if (!event) throw new Error("Evento não encontrado.");

  // Fechar o evento
  await prisma.event.update({
    where: { id: eventId },
    data: { 
      status: "FINISHED", 
      isActive: false 
    },
  });

  // Gerar relatório consolidado
  const totalRevenue = event.transactions.reduce((sum, t) => sum + t.amount, 0);
  const byMethod = event.transactions.reduce((acc: any, t) => {
    acc[t.method] = (acc[t.method] || 0) + t.amount;
    return acc;
  }, {});

  const staffRanking = event.staff
    .map((staff) => ({
      name: staff.user.name || "Sem nome",
      totalSold: staff.cards.filter(c => c.isPaid).length,
      revenue: staff.cards
        .filter(c => c.isPaid)
        .reduce((sum, c) => sum + (c.price || 0), 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const report = {
    eventName: event.name,
    closedAt: new Date().toISOString(),
    totalCardsSold: event.transactions.length,
    totalRevenue,
    byMethod,
    staffRanking,
    totalStaff: event.staff.length,
  };

  revalidatePath(`/dashboard/${eventId}`);
  revalidatePath("/dashboard");

  return { 
    success: true, 
    report,
    message: "Evento encerrado com sucesso. Relatório gerado." 
  };
}