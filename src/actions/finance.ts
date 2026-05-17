'use server';

import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/requireTenant';

export interface FinanceStats {
  totalRevenue: number;
  byMethod: {
    method: string;
    total: number;
  }[];
  operatorRanking: {
    name: string;
    total: number;
    count: number;
  }[];
}

export async function getEventFinanceStats(
  eventId: string
): Promise<FinanceStats> {
  // Segurança do tenant
  await requireTenant();

  // ==========================================
  // RECEITA POR MÉTODO
  // ==========================================
  const methodStats = await prisma.transaction.groupBy({
    by: ['method'],
    where: {
      eventId,
    },
    _sum: {
      amount: true,
    },
    _count: {
      _all: true,
    },
  });

  // ==========================================
  // RANKING DE VENDEDORES
  // ==========================================
  const operatorStats = await prisma.transaction.groupBy({
    by: ['sellerId'],
    where: {
      eventId,
      sellerId: {
        not: null,
      },
    },
    _sum: {
      amount: true,
    },
    _count: {
      _all: true,
    },
    orderBy: {
      _sum: {
        amount: 'desc',
      },
    },
    take: 10,
  });

  // ==========================================
  // BUSCA NOMES DOS SELLERS
  // ==========================================
  const sellerIds = operatorStats
    .map((op) => op.sellerId)
    .filter((id): id is string => Boolean(id));

  const sellers = await prisma.seller.findMany({
    where: {
      id: {
        in: sellerIds,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  // ==========================================
  // TOTAL GERAL
  // ==========================================
  const totalRevenue = methodStats.reduce((acc, curr) => {
    return acc + (curr._sum.amount ?? 0);
  }, 0);

  // ==========================================
  // FORMATA RANKING
  // ==========================================
  const formattedOperatorRanking = operatorStats.map((op) => {
    const seller = sellers.find(
      (seller) => seller.id === op.sellerId
    );

    return {
      name: seller?.name ?? 'Desconhecido',
      total: op._sum.amount ?? 0,
      count: op._count._all,
    };
  });

  // ==========================================
  // RETORNO FINAL
  // ==========================================
  return {
    totalRevenue,

    byMethod: methodStats.map((method) => ({
      method: method.method,
      total: method._sum.amount ?? 0,
    })),

    operatorRanking: formattedOperatorRanking,
  };
}