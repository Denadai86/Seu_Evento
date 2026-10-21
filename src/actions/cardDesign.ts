// src/actions/cardDesign.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireEventAdmin } from "@/lib/requireTenant";
import { logAudit } from "@/lib/audit";
import { parseCardDesign } from "@/lib/cardDesign";

// Só o administrador muda o modelo. Tudo que vem do navegador passa por parseCardDesign (limpa e limita).
export async function saveCardDesign(eventId: string, input: unknown) {
  try {
    const { tenantId } = await requireEventAdmin(eventId);
    const design = parseCardDesign(input);

    const updated = await prisma.event.updateMany({
      where: { id: eventId, tenantId },
      data: { cardDesign: design },
    });
    if (updated.count !== 1) return { success: false as const, error: "Evento não encontrado." };

    await logAudit({ tenantId, action: "CARD_DESIGN_CHANGED", eventId, metadata: { theme: design.theme, mode: design.mode } });
    revalidatePath(`/dashboard/${eventId}`);
    return { success: true as const, design };
  } catch (error: any) {
    return { success: false as const, error: (error?.message as string) ?? "Não foi possível salvar o modelo." };
  }
}
