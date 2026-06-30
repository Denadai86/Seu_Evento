// src/actions/venda.ts
"use server";

import prisma from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { requireTenant, requireStaffForEvent } from "@/lib/requireTenant"; // 🔥 Importação Corrigida
import { auth } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// PROCESSAR VENDA EM LOTE (PDV — transação atômica)
// ─────────────────────────────────────────────────────────────────────────────
export async function processBatchSale(
  eventId: string,
  shortIds: string[],
  method: PaymentMethod,
  eventStaffId: string 
) {
  if (!shortIds || shortIds.length === 0) return { success: false, error: "Carrinho vazio." };

  try {
    const tenantId = await requireTenant();
    
    // 🛡️ CORREÇÃO CRÍTICA: Vazamento de Permissões
    // Não basta estar logado. O voluntário precisa da permissão 'canSell' para ESTE evento.
    // O requireStaffForEvent (que você mesmo criou) lança um erro se a permissão for falsa.
    await requireStaffForEvent(eventId, 'canSell');

    // 🛡️ SEGURANÇA: Garantimos que o eventStaffId enviado no payload pertence 
    // ao usuário que está executando a action (prevenindo que o Vendedor A venda em nome do Vendedor B)
    const session = await auth();

    const staff = await prisma.eventStaff.findUnique({
      where: { id: eventStaffId },
      select: { userId: true },
    });

    if (!staff || staff.userId !== session!.user.id) {
      return { success: false, error: "Acesso negado. Você não pode vender em nome de outro vendedor." };
    }

    // Se o middleware NextAuth passar um ID de sessão, vamos cruzar:
    // NOTA: Como você não exporta a sessão diretamente aqui, o requireStaffForEvent 
    // já buscou a sessão por baixo dos panos, o que nos garante a camada de cima.

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { ticketPrice: true, isActive: true, tenantId: true, status: true },
    });

    if (!event || event.tenantId !== tenantId) return { success: false, error: "Evento inválido ou acesso negado." };
    if (event.status === "ENCERRADO") return { success: false, error: "Este evento já está encerrado. O caixa encontra-se fechado." };
    if (!event.isActive) return { success: false, error: "Evento não está ativo. O caixa foi encerrado pela administração." };

    const ticketPrice = event.ticketPrice > 0 ? event.ticketPrice : 2500;

    await prisma.$transaction(async (tx) => {
      const existingCards = await tx.card.findMany({
        where: { shortId: { in: shortIds }, eventId },
      });

      if (existingCards.length !== shortIds.length) {
        throw new Error("Uma ou mais cartelas não pertencem a este evento.");
      }

      const alreadySold = existingCards.filter((c) => c.isSold);
      if (alreadySold.length > 0) {
        throw new Error(
          `Conflito! Cartelas já vendidas: ${alreadySold.map((c) => c.shortId).join(", ")}`
        );
      }

      // Atualiza cartelas
      await tx.card.updateMany({
        where: { shortId: { in: shortIds } },
        data: { isSold: true, isPaid: true, eventStaffId, price: ticketPrice },
      });

      // Registra caixa financeiro atrelado à escala do funcionário
      await tx.transaction.createMany({
        data: existingCards.map((card) => ({
          eventId,
          cardId: card.id,
          eventStaffId,
          amount: ticketPrice,
          method,
        })),
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("[PROCESS_BATCH_SALE_ERROR]", error);
    return { success: false, error: error.message || "Falha crítica ao processar carrinho." };
  }
}