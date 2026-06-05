// src/actions/finance.ts
"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant";

export interface FinanceStats {
  totalRevenue: number;
  byMethod: { method: string; total: number; count: number }[];
  operatorRanking: { name: string; total: number; count: number }[];
}

export async function getEventFinanceStats(eventId: string): Promise<FinanceStats> {
  const tenantId = await requireTenant();

  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
  if (!event) throw new Error("Evento não encontrado ou acesso negado.");

  // 1. Receita por método
  const methodStats = await prisma.transaction.groupBy({
    by: ["method"],
    where: { eventId },
    _sum: { amount: true },
    _count: { _all: true },
  });

  // 2. Ranking de Vendas por Membro da Equipe (Agrupa por eventStaffId)
  const staffSalesStats = await prisma.transaction.groupBy({
    by: ["eventStaffId"],
    where: { eventId, eventStaffId: { not: null } },
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 10,
  });

  const eventStaffIds = staffSalesStats
    .map((op) => op.eventStaffId)
    .filter((id): id is string => Boolean(id));

  // Busca os nomes associados na tabela User através do EventStaff
  const staffMembers = await prisma.eventStaff.findMany({
    where: { id: { in: eventStaffIds } },
    include: {
      user: { select: { name: true } },
    },
  });

  const totalRevenue = methodStats.reduce((acc, curr) => acc + (curr._sum?.amount ?? 0), 0);

  return {
    totalRevenue,
    byMethod: methodStats.map((m) => ({
      method: m.method,
      total: m._sum?.amount ?? 0,
      count: m._count?._all ?? 0, // 🔥 Correção do erro de tipagem aplicada aqui
    })),
    operatorRanking: staffSalesStats.map((stat) => {
      const staff = staffMembers.find((s) => s.id === stat.eventStaffId);
      return {
        name: staff?.user?.name ?? "Desconhecido",
        total: stat._sum?.amount ?? 0,
        count: stat._count?._all ?? 0, // 🔥 Correção do erro de tipagem aplicada aqui
      };
    }),
  };
}