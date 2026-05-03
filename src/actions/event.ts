"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createEvent(name: string) {
  const session = await auth();

  if (!session || !session.user?.tenantId) {
    throw new Error("Não autorizado");
  }

  const event = await prisma.event.create({
    data: {
      name,
      tenantId: session.user.tenantId,
    },
  });

  // Atualiza dashboard automaticamente
  revalidatePath("/dashboard");

  return { success: true, event };
}

export async function toggleEventStatus(
  eventId: string,
  tenantId: string,
  subdomain: string,
  newStatus: "ACTIVE" | "DRAFT" | "FINISHED"
) {
  try {
    // Se estiver ativando este evento, primeiro "pausa" (DRAFT) todos os outros deste cliente
    if (newStatus === "ACTIVE") {
      await prisma.$transaction([
        prisma.event.updateMany({
          where: { tenantId: tenantId, status: "ACTIVE" },
          data: { status: "DRAFT" },
        }),
        prisma.event.update({
          where: { id: eventId },
          data: { status: newStatus },
        }),
      ]);
    } else {
      // Se for apenas pausar ou finalizar, altera só ele
      await prisma.event.update({
        where: { id: eventId },
        data: { status: newStatus },
      });
    }

    // Atualiza as telas em tempo real
    revalidatePath(`/[subdomain]/dashboard`, "page");
    revalidatePath(`/[subdomain]/dashboard/[eventId]`, "page");

    return { success: true };
  } catch (error) {
    console.error("Erro ao alterar status do evento:", error);
    return { success: false, error: "Falha ao alterar o status." };
  }
}