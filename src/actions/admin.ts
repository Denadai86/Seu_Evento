// src/actions/admin.ts
"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

// 🔐 Validação de Segurança Nível God
async function requireGodMode() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Acesso restrito ao Super Admin.");
  }
}

// 📊 1. ESTATÍSTICAS GLOBAIS (O Raio-X do SaaS)
export async function getGodModeStats() {
  await requireGodMode();

  // Executa todas as queries pesadas em paralelo no banco
  const [
    tenantsCount,
    eventsCount,
    cardsCount,
    sponsorsCount,
    usersByRole,
    gmvData
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.event.count(),
    prisma.card.count(),
    prisma.sponsor.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      // Removido o where: { status: "COMPLETED" } pois não existe no seu schema
    })
  ]);

  // Formata a contagem de usuários por cargo
  const getRoleCount = (roleName: string) => 
    usersByRole.find(r => r.role === roleName)?._count._all || 0;

  return {
    totalGMV: gmvData._sum?.amount || 0, // 🔥 Correção do TypeScript (Uso do encadeamento opcional ?.)
    tenants: tenantsCount,
    events: eventsCount,
    cards: cardsCount,
    sponsors: sponsorsCount,
    roles: {
      orgAdmins: getRoleCount("ORG_ADMIN"),
      operators: getRoleCount("OPERATOR"), 
      verifiers: getRoleCount("VERIFIER"),
    }
  };
}

// 🏢 2. LISTAGEM DE CLIENTES COM STATUS
export async function getTenantsList() {
  await requireGodMode();
  return prisma.tenant.findMany({
    include: {
      _count: { select: { events: true, users: true } },
      users: {
        where: { role: "ORG_ADMIN" },
        select: { name: true, email: true },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

// 🚀 3. ONBOARDING EXPRESS (Cria Cliente + Admin Numa Tacada)
export async function createTenantExpress(data: { name: string; subdomain: string; adminName: string; adminEmail: string; adminPass: string }) {
  await requireGodMode();

  const existingSubdomain = await prisma.tenant.findUnique({ where: { subdomain: data.subdomain } });
  if (existingSubdomain) throw new Error("Subdomínio já está em uso.");

  const existingEmail = await prisma.user.findUnique({ where: { email: data.adminEmail } });
  if (existingEmail) throw new Error("E-mail já cadastrado na plataforma.");

  const hashedPassword = await hash(data.adminPass, 12);

  // Usa transação para garantir que cria o Tenant e o Usuário juntos
  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: data.name,
        subdomain: data.subdomain.toLowerCase(),
        active: true, // 🔥 Correção: Ajustado para "active" conforme seu schema.prisma
      }
    });

    await tx.user.create({
      data: {
        name: data.adminName,
        email: data.adminEmail,
        password: hashedPassword,
        role: "ORG_ADMIN",
        tenantId: tenant.id
      }
    });
  });

  revalidatePath("/admin");
  return { success: true };
}

// 🛑 4. SOFT DELETE (Suspender Cliente)
export async function toggleTenantSuspension(tenantId: string, currentStatus: boolean) {
  await requireGodMode();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { active: !currentStatus } // 🔥 Correção: Ajustado para "active" conforme seu schema.prisma
  });
  revalidatePath("/admin");
  return { success: true };
}

// 🔑 5. RESET DE SENHA
export async function resetUserPassword(userId: string) {
  await requireGodMode();
  const hashedPassword = await hash("mudar123", 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });
  return { success: true, tempPassword: "mudar123" };
}