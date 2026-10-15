// src/actions/priceTier.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireEventAdmin } from "@/lib/requireTenant";
import { logAudit } from "@/lib/audit";

type TierInput = {
  name: string;
  quinaPrice: number; // centavos
  fullHousePrice?: number | null; // centavos
  startsAt?: string | null; // ISO
};

const MAX_CENTS = 100_000_000;
const validCents = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= MAX_CENTS;

// 🛡️ Só o administrador da organização define preço. O PDV e os voluntários apenas aplicam.
export async function createPriceTier(eventId: string, input: TierInput) {
  try {
    await requireEventAdmin(eventId);

    const name = String(input.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!name) return { success: false, error: "Dê um nome para a fase (ex.: Pré-venda)." };
    if (!validCents(input.quinaPrice)) return { success: false, error: "Preço da cartela inválido." };
    if (input.fullHousePrice != null && !validCents(input.fullHousePrice)) {
      return { success: false, error: "Preço da cartela cheia inválido." };
    }

    let startsAt: Date | null = null;
    if (input.startsAt) {
      startsAt = new Date(input.startsAt);
      if (Number.isNaN(startsAt.getTime())) return { success: false, error: "Data de início inválida." };
    }

    const existing = await prisma.priceTier.findMany({ where: { eventId }, select: { startsAt: true } });
    if (!startsAt && existing.some((t) => !t.startsAt)) {
      return { success: false, error: "Já existe uma fase sem data (valendo desde o início). Defina uma data para esta." };
    }
    if (startsAt && existing.some((t) => t.startsAt && t.startsAt.getTime() === startsAt!.getTime())) {
      return { success: false, error: "Já existe uma fase começando exatamente nesse horário." };
    }

    await prisma.priceTier.create({
      data: {
        eventId,
        name,
        quinaPrice: Math.round(input.quinaPrice),
        fullHousePrice: input.fullHousePrice != null ? Math.round(input.fullHousePrice) : null,
        startsAt,
      },
    });

    await logAudit({
      action: "PRICE_TIER_CREATED",
      eventId,
      metadata: { name, quinaPrice: Math.round(input.quinaPrice), fullHousePrice: input.fullHousePrice ?? null, startsAt: startsAt ? startsAt.toISOString() : null },
    });
    revalidatePath(`/dashboard/${eventId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Não foi possível criar a fase." };
  }
}

// Apagar uma fase NÃO altera cartelas já vendidas: o preço cobrado fica gravado em cada cartela.
export async function deletePriceTier(eventId: string, tierId: string) {
  try {
    await requireEventAdmin(eventId);
    const gone = await prisma.priceTier.findFirst({ where: { id: tierId, eventId }, select: { name: true, quinaPrice: true, fullHousePrice: true, startsAt: true } });
    await prisma.priceTier.deleteMany({ where: { id: tierId, eventId } });
    await logAudit({ action: "PRICE_TIER_DELETED", eventId, metadata: { tierId, name: gone?.name ?? null, quinaPrice: gone?.quinaPrice ?? null, fullHousePrice: gone?.fullHousePrice ?? null, startsAt: gone?.startsAt ? gone.startsAt.toISOString() : null } });
    revalidatePath(`/dashboard/${eventId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Não foi possível apagar a fase." };
  }
}
