// src/actions/event.ts

"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireTenant } from "@/lib/requireTenant";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR EVENTO
// ─────────────────────────────────────────────────────────────────────────────
export async function createEvent(name: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Não autorizado.");

  const event = await prisma.event.create({
    data: {
      name: name.trim(),
      tenantId: session.user.tenantId,
      // ⚠️ CORREÇÃO DO BUG 7: O banco define default 10.00, mas o app usa centavos.
      // Se não enviarmos nada, ele nasce cobrando R$ 0,10. Forçando R$ 10,00 (1000 centavos).
      ticketPrice: 1000, 
    },
  });

  revalidatePath("/dashboard");
  return { success: true, event };
}

// ─────────────────────────────────────────────────────────────────────────────
// ALTERNAR STATUS DO EVENTO
// ─────────────────────────────────────────────────────────────────────────────
export async function toggleEventStatus(
  eventId: string,
  newStatus: "ACTIVE" | "DRAFT" | "FINISHED"
) {
  const tenantId = await requireTenant();

  // 🛡️ SEGURANÇA: Valida posse. O evento DEVE pertencer ao tenant logado.
  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
  if (!event) return { success: false, error: "Evento não encontrado ou acesso negado." };

  try {
    if (newStatus === "ACTIVE") {
      // Garante que apenas 1 evento esteja ativo por vez (desativa os demais)
      await prisma.$transaction([
        prisma.event.updateMany({
          where: { tenantId, status: "ACTIVE" },
          data: { status: "DRAFT", isActive: false },
        }),
        prisma.event.update({
          where: { id: eventId },
          data: { status: "ACTIVE", isActive: true },
        }),
      ]);
    } else {
      await prisma.event.update({
        where: { id: eventId },
        data: { status: newStatus, isActive: false },
      });
    }

    revalidatePath("/dashboard", "page");
    return { success: true };
  } catch (error) {
    console.error("Erro ao alterar status do evento:", error);
    return { success: false, error: "Falha ao alterar o status." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ALTERAR PREÇO DA CARTELA
// ─────────────────────────────────────────────────────────────────────────────
export async function updateTicketPrice(eventId: string, priceInCents: number) {
  const tenantId = await requireTenant();
  
  if (priceInCents < 0) throw new Error("O valor não pode ser negativo.");

  // 🛡️ SEGURANÇA: O 'where' duplo garante que não altere preço de eventos de terceiros
  const event = await prisma.event.update({
    where: { id: eventId, tenantId },
    data: { ticketPrice: priceInCents },
  });

  if (!event) throw new Error("Acesso negado ou evento inexistente.");

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO DEMONSTRAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
export async function activateDemoMode(eventId: string) {
  const tenantId = await requireTenant();

  // 🛡️ SEGURANÇA: Verifica posse antes de manipular cartelas
  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
  if (!event) throw new Error("Acesso negado.");

  await prisma.card.updateMany({
    where: { eventId, isPaid: false },
    data: {
      isSold: true,
      isPaid: true,
      price: 0, // Marcador de demo — sem Transaction associada
    },
  });

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// ATUALIZAR CHAVE PIX
// ─────────────────────────────────────────────────────────────────────────────
export async function updatePixKey(eventId: string, newPixKey: string) {
  // 🛡️ CORREÇÃO CRÍTICA (Item 3 do Overview): Estava sem NENHUMA validação de Auth.
  const tenantId = await requireTenant();

  // 🛡️ SEGURANÇA: Garantir que o evento pertence ao tenant que está tentando alterar
  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
  if (!event) return { success: false, error: "Acesso negado. Tentativa de manipulação detectada." };

  try {
    const cleanKey = newPixKey.trim();
    
    await prisma.event.update({
      where: { id: eventId },
      data: { pixKey: cleanKey === "" ? null : cleanKey },
    });

    // Atualiza a tela do dashboard e do PDV
    // Nota: Removi o [subdomain] do revalidatePath, pois o App Router muitas vezes lida
    // melhor com layouts genéricos dependendo da sua estrutura de pastas reais.
    revalidatePath(`/dashboard/${eventId}`, "page");
    revalidatePath(`/vendas`, "page");
    
    return { success: true };
  } catch (error) {
    console.error("[PIX_KEY_ERROR]", error);
    return { success: false, error: "Erro ao salvar a chave PIX." };
  }
}