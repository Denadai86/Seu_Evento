// src/actions/manual.ts
"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Marca que a pessoa já viu o aviso de boas-vindas (aparece uma única vez, em qualquer aparelho).
export async function markManualSeen() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false as const };
    await prisma.user.update({ where: { id: session.user.id }, data: { manualSeenAt: new Date() } });
    return { success: true as const };
  } catch {
    return { success: false as const };
  }
}
