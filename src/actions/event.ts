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
    },
  });

  revalidatePath("/dashboard");
  return { success: true, event };
}

// ─────────────────────────────────────────────────────────────────────────────
// ALTERNAR STATUS DO EVENTO
//
// ⚠️  CORREÇÃO CRÍTICA DE BUG:
//     O schema tem dois campos de "ativo" no Event:
//       • status: String  → lido pelo EventStatusToggle / dashboard
//       • isActive: Boolean → lido por processBatchSale para liberar o caixa
//     Eles estavam DESCONECTADOS. Ativar o evento pelo toggle não abria o PDV.
//     Agora ambos são sincronizados na mesma transação.
//
// ⚠️  MUDANÇA DE ASSINATURA:
//     Os parâmetros `tenantId` e `subdomain` foram REMOVIDOS.
//     O tenantId vem da sessão JWT (não confiamos em dados passados pelo cliente).
//     Atualize o EventStatusToggle.tsx para chamar sem esses parâmetros.
// ─────────────────────────────────────────────────────────────────────────────
export async function toggleEventStatus(
  eventId: string,
  newStatus: "ACTIVE" | "DRAFT" | "FINISHED"
) {
  const tenantId = await requireTenant();

  // Valida posse: o evento deve pertencer ao tenant logado
  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
  if (!event) return { success: false, error: "Evento não encontrado ou acesso negado." };

  try {
    if (newStatus === "ACTIVE") {
      // Garante que apenas 1 evento esteja ativo por vez (desativa os demais)
      await prisma.$transaction([
        prisma.event.updateMany({
          where: { tenantId, status: "ACTIVE" },
          data: { status: "DRAFT", isActive: false }, // ← sincroniza os dois campos
        }),
        prisma.event.update({
          where: { id: eventId },
          data: { status: "ACTIVE", isActive: true }, // ← sincroniza os dois campos
        }),
      ]);
    } else {
      await prisma.event.update({
        where: { id: eventId },
        data: { status: newStatus, isActive: false }, // ← fecha o caixa junto
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

  // WHERE garante que só altera se o evento for deste tenant
  await prisma.event.update({
    where: { id: eventId, tenantId },
    data: { ticketPrice: priceInCents },
  });

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO DEMONSTRAÇÃO
//
// Marca cartelas não pagas como pagas com price = 0.
// O campo `price: 0` é o marcador de cartelas de demo.
// A tabela Transaction NÃO recebe registros para essas cartelas,
// portanto o financeiro (que lê Transaction) permanece limpo.
//
// Nota: o campo `isDemoCard` sugerido pelo Gemini NÃO existe no schema.
// Não adicione sem criar a migration correspondente.
// ─────────────────────────────────────────────────────────────────────────────
export async function activateDemoMode(eventId: string) {
  const tenantId = await requireTenant();

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
