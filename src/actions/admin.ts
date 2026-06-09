// src/actions/admin.ts
"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// 🔐 GUARD: Apenas Super Admin passa
// O throw aqui é esperado, pois é uma barreira de segurança bruta (retorna 500/403).
// ─────────────────────────────────────────────────────────────────────────────
async function requireGodMode() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Acesso restrito ao Super Admin.");
  }
  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ESTATÍSTICAS GLOBAIS
// ─────────────────────────────────────────────────────────────────────────────
export async function getGodModeStats() {
  await requireGodMode();

  const [tenantsCount, eventsCount, cardsCount, sponsorsCount, usersByRole, gmvData] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.event.count(),
      prisma.card.count(),
      prisma.sponsor.count(),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.transaction.aggregate({ _sum: { amount: true } }),
    ]);

  const getRoleCount = (roleName: string) =>
    usersByRole.find((r) => r.role === roleName)?._count._all || 0;

  return {
    totalGMV: gmvData._sum?.amount || 0,
    tenants: tenantsCount,
    events: eventsCount,
    cards: cardsCount,
    sponsors: sponsorsCount,
    roles: {
      orgAdmins: getRoleCount("ORG_ADMIN"),
      operators: getRoleCount("OPERATOR"),
      verifiers: getRoleCount("VERIFIER"),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LISTAGEM DE CLIENTES
// ─────────────────────────────────────────────────────────────────────────────
export async function getTenantsList() {
  await requireGodMode();
  return prisma.tenant.findMany({
    include: {
      _count: { select: { events: true, users: true } },
      users: {
        where: { role: "ORG_ADMIN" },
        select: { name: true, email: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ONBOARDING EXPRESS (Atualizado com Documento, Telefone e Graceful Error)
// ─────────────────────────────────────────────────────────────────────────────
export async function createTenantExpress(data: {
  name: string;
  subdomain: string;
  document?: string;  // Novo
  phone?: string;     // Novo
  adminName: string;
  adminEmail: string;
  adminPass: string;
  planType: "SINGLE_EVENT" | "ANNUAL";
  eventDate?: string;
}) {
  try {
    await requireGodMode();

    const [existingSubdomain, existingEmail] = await Promise.all([
      prisma.tenant.findUnique({ where: { subdomain: data.subdomain } }),
      prisma.user.findUnique({ where: { email: data.adminEmail } }),
    ]);

    // 🔥 Graceful Error Handling: Retorna o erro limpo pro UI
    if (existingSubdomain) return { success: false, error: "Subdomínio já está em uso." };
    if (existingEmail) return { success: false, error: "E-mail já cadastrado na plataforma." };

    const hashedPassword = await hash(data.adminPass, 12);

    // Calculando a validade do ambiente
    let calculatedExpiration: Date | null = null;
    if (data.planType === "ANNUAL") {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      calculatedExpiration = d;
    } else if (data.planType === "SINGLE_EVENT" && data.eventDate) {
      const d = new Date(data.eventDate);
      d.setDate(d.getDate() + 7); // Libera o sistema por 7 dias após o evento
      d.setHours(23, 59, 59, 999);
      calculatedExpiration = d;
    }

    // Transação: Garante que Tenant e User sejam criados juntos
    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          subdomain: data.subdomain.toLowerCase().trim(),
          document: data.document, // Novo
          phone: data.phone,       // Novo
          active: true,
          planType: data.planType,
          expiresAt: calculatedExpiration,
        },
      });

      await tx.user.create({
        data: {
          name: data.adminName,
          email: data.adminEmail.toLowerCase().trim(),
          password: hashedPassword,
          role: "ORG_ADMIN",
          tenantId: tenant.id,
        },
      });
    });

    revalidatePath("/admin");
    return { success: true };

  } catch (error: any) {
    console.error("[CREATE_TENANT_ERROR]", error);
    return { success: false, error: error.message || "Erro interno ao provisionar o cliente." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUSPENSÃO DE TENANT (Soft Delete)
// ─────────────────────────────────────────────────────────────────────────────
export async function toggleTenantSuspension(tenantId: string, currentStatus: boolean) {
  try {
    await requireGodMode();

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { active: !currentStatus },
    });

    revalidatePath("/admin");
    return { success: true, newStatus: updated.active };
  } catch (error) {
    return { success: false, error: "Falha ao alterar status do cliente." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. RESET DE SENHA — Qualquer usuário da plataforma
// ─────────────────────────────────────────────────────────────────────────────
export async function resetUserPassword(userId: string) {
  try {
    await requireGodMode();

    const newTemporaryPassword = randomBytes(4).toString("hex") + "!";
    const hashedPassword = await hash(newTemporaryPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, temporaryPassword: newTemporaryPassword };
  } catch (error) {
    return { success: false, error: "Erro ao resetar a senha deste usuário." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. RESET DE SENHA DO ADMIN DE UM TENANT ESPECÍFICO
// ─────────────────────────────────────────────────────────────────────────────
export async function resetTenantAdminPassword(tenantId: string) {
  try {
    await requireGodMode();

    const adminUser = await prisma.user.findFirst({
      where: { tenantId, role: "ORG_ADMIN" },
    });

    if (!adminUser) {
      return { success: false, error: "Administrador principal não encontrado." };
    }

    const newPassword = randomBytes(4).toString("hex") + "!";
    const hashedPassword = await hash(newPassword, 12);

    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: hashedPassword },
    });

    return { success: true, email: adminUser.email, newPassword };
  } catch (error) {
    return { success: false, error: "Falha catastrófica ao redefinir a senha do admin." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. TOKEN DE ACESSO REMOTO (Impersonation — uso único)
// ─────────────────────────────────────────────────────────────────────────────
export async function getImpersonationToken(tenantId: string) {
  try {
    await requireGodMode();

    // 64 caracteres hex — criptograficamente seguro
    const magicToken = randomBytes(32).toString("hex");

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { token: magicToken },
    });

    return { success: true, token: magicToken, subdomain: tenant.subdomain };
  } catch (error) {
    return { success: false, error: "Erro ao gerar chave de acesso remoto." };
  }
}