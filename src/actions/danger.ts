// src/actions/danger.ts
"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// 🔐 Validação de Segurança Nível God
async function requireGodMode() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Acesso restrito ao Super Admin.");
  }
  return session;
}

/**
 * ⚠️ ATENÇÃO: Nuke Database
 * Apaga TODOS os dados do SaaS, exceto os usuários com role SUPER_ADMIN.
 */
export async function nukeDatabase(password: string) {
  const session = await requireGodMode();

  // 🛡️ Trava 1: Produção
  if (process.env.NODE_ENV === "production") {
    return { success: false, error: "Ação bloqueada em ambiente de produção por segurança." };
  }

  try {
    // 🛡️ Trava 2: Validação de Senha do Super Admin
    const superAdmin = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!superAdmin || !superAdmin.password) {
      return { success: false, error: "Credenciais de administrador inválidas." };
    }

    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      return { success: false, error: "Senha incorreta. Aniquilação abortada." };
    }

    // 💥 O MODO ANIQUILAÇÃO
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.transaction.deleteMany(),
      prisma.card.deleteMany(),
      prisma.prize.deleteMany(),
      prisma.sponsor.deleteMany(),
      prisma.eventStaff.deleteMany(),
      prisma.event.deleteMany(),
      prisma.tenant.deleteMany(),
      prisma.user.deleteMany({
        where: {
          role: { not: "SUPER_ADMIN" }
        }
      })
    ]);

    return { success: true, message: "Mundo aniquilado com sucesso. Apenas você restou." };
  } catch (error) {
    console.error("Erro crítico ao resetar banco:", error);
    return { success: false, error: "Falha ao executar a limpeza do banco." };
  }
}