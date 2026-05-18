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
      _sum: { amount: true }
    })
  ]);

  const getRoleCount = (roleName: string) => 
    usersByRole.find(r => r.role === roleName)?._count._all || 0;

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

// 🚀 3. ONBOARDING EXPRESS (Cria ambiente calculando expiração das licenças automaticamente)
export async function createTenantExpress(data: { 
  name: string; 
  subdomain: string; 
  adminName: string; 
  adminEmail: string; 
  adminPass: string;
  planType: "SINGLE_EVENT" | "ANNUAL"; 
  eventDate?: string; 
}) {
  await requireGodMode();

  const existingSubdomain = await prisma.tenant.findUnique({ where: { subdomain: data.subdomain } });
  if (existingSubdomain) throw new Error("Subdomínio já está em uso.");

  const existingEmail = await prisma.user.findUnique({ where: { email: data.adminEmail } });
  if (existingEmail) throw new Error("E-mail já cadastrado na plataforma.");

  const hashedPassword = await hash(data.adminPass, 12);

  // 🧠 CÁLCULO DA EXPIRAÇÃO AUTOMÁTICA
  let calculatedExpiration: Date | null = null;

  if (data.planType === "ANNUAL") {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    calculatedExpiration = oneYearFromNow;
  } else if (data.planType === "SINGLE_EVENT" && data.eventDate) {
    // Transforma a string recebida do form num Date nativo
    const eventDay = new Date(data.eventDate);
    // Regra do João: adiciona exatamente 7 dias de tolerância pós-evento
    eventDay.setDate(eventDay.getDate() + 7);
    // Trava no último segundo do dia limite (23:59:59.999)
    eventDay.setHours(23, 59, 59, 999);
    calculatedExpiration = eventDay;
  }

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: data.name,
        subdomain: data.subdomain.toLowerCase(),
        active: true,
        planType: data.planType,
        expiresAt: calculatedExpiration
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

// 🛑 4. SOFT DELETE (Consertado: Agora devolve 'newStatus' para forçar a reatividade na tela do admin)
export async function toggleTenantSuspension(tenantId: string, currentStatus: boolean) {
  await requireGodMode();
  
  const updatedTenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { active: !currentStatus }
  });
  
  revalidatePath("/admin");
  return { success: true, newStatus: updatedTenant.active };
}

// 🔑 5. RESET DE SENHA
export async function resetUserPassword(userId: string) {
  // Chamamos a função real de segurança que já existe no topo do arquivo!
  await requireGodMode(); 
  
  try {
    const hashedPassword = await hash("mudar123", 12);
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
    
    return { success: true, tempPassword: "mudar123" };
  } catch (error) {
    console.error("Erro ao resetar senha:", error);
    throw new Error("Falha ao resetar a senha. Verifique se o usuário existe.");
  }
}