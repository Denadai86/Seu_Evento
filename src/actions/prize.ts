// src/actions/prize.ts
"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/requireTenant";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR PRÊMIO / RODADA
// ─────────────────────────────────────────────────────────────────────────────
export async function createPrize(
  eventId: string,
  name: string,
  type: "QUINA" | "FULL_HOUSE",
  prizeName: string,
  order: number,
  sponsorId?: string | null
) {
  const tenantId = await requireTenant();

  // Valida posse do evento
  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
  if (!event) throw new Error("Acesso negado.");

  await prisma.prize.create({
    data: {
      eventId,
      name: name.trim(),
      type,
      prizeName: prizeName.trim(),
      order,
      sponsorId: sponsorId || null,
    },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// REORDENAR PRÊMIOS EM LOTE (drag-and-drop)
// ─────────────────────────────────────────────────────────────────────────────
export async function updatePrizeOrders(orderedIds: string[]) {
  if (!orderedIds.length) return { success: true };

  const tenantId = await requireTenant();

  // Valida que TODOS os prêmios passados pertencem a eventos deste tenant
  const prizes = await prisma.prize.findMany({
    where: { id: { in: orderedIds }, event: { tenantId } },
    select: { id: true },
  });

  if (prizes.length !== orderedIds.length) {
    throw new Error("Violação de segurança: prêmios de outro tenant.");
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.prize.update({ where: { id }, data: { order: index + 1 } })
    )
  );

  revalidatePath("/", "layout");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCLUIR PRÊMIO
// ─────────────────────────────────────────────────────────────────────────────
export async function deletePrize(prizeId: string) {
  const tenantId = await requireTenant();

  // Valida posse antes de deletar
  const prize = await prisma.prize.findFirst({
    where: { id: prizeId, event: { tenantId } },
  });
  if (!prize) throw new Error("Prêmio não encontrado ou acesso negado.");

  await prisma.prize.delete({ where: { id: prizeId } });
  revalidatePath("/", "layout");
  return { success: true };
}
