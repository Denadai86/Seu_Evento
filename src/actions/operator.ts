"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

async function requireTenantAdmin() {
  const session = await auth();

  if (!session || !session.user?.tenantId) {
    throw new Error("Não autorizado");
  }

  return session;
}

// 🔐 Reset de senha
export async function resetOperatorPassword(operatorId: string) {
  const session = await requireTenantAdmin();

  const operator = await prisma.user.findFirst({
    where: {
      id: operatorId,
      tenantId: session.user.tenantId,
      role: "OPERATOR",
    },
  });

  if (!operator) {
    return { success: false, error: "Operador não encontrado" };
  }

  const newPassword = Math.random().toString(36).slice(-8) + "!";

  const hashed = await hash(newPassword, 10);

  await prisma.user.update({
    where: { id: operatorId },
    data: { password: hashed },
  });

  revalidatePath("/dashboard");

  return {
    success: true,
    password: newPassword,
  };
}