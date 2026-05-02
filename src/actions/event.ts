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