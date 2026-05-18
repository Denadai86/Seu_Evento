// src/lib/requireTenant.ts
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma"; // Adicione essa importação se não tiver

export async function requireTenant() {
  const session = await auth();
  
  if (!session?.user?.tenantId) {
    throw new Error("Não autorizado. Faça login.");
  }

  // 🔥 VALIDAÇÃO DE CONTRATO ATIVO
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { active: true, expiresAt: true }
  });

  if (!tenant || !tenant.active) {
    throw new Error("Acesso suspenso pelo Administrador da plataforma.");
  }

  // Se tem data de expiração, e hoje é MAIOR que a data limite
  if (tenant.expiresAt && new Date() > new Date(tenant.expiresAt)) {
    throw new Error("Período de contrato expirado. Contate o suporte.");
  }

  return session.user.tenantId;
}