"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs"; // Ou a lib que você usa para senhas

async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") {
    throw new Error("Acesso restrito ao Super Admin.");
  }
}

export async function getGlobalStats() {
  await requireSuperAdmin();

  const [tenants, events, cards, operators] = await Promise.all([
    prisma.tenant.count(),
    prisma.event.count(),
    prisma.card.count(),
    prisma.user.count({ where: { role: "OPERATOR" } }),
  ]);

  return { tenants, events, cards, operators };
}

export async function resetUserPassword(userId: string) {
  await requireSuperAdmin();
  
  // Define uma senha padrão temporária (ex: 123456) 
  // O ideal seria gerar uma aleatória e mostrar na tela
  const hashedPassword = await hash("mudar123", 12);
  
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  return { success: true, tempPassword: "mudar123" };
}