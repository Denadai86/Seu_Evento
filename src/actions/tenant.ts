// src/actions/tenant.ts
"use server";

import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { requireTenantAccess } from "@/lib/permissions";

// ============================================================================
// UTILITÁRIOS DE SEGURANÇA
// ============================================================================

/**
 * Valida se quem está chamando a action tem permissão de SUPER_ADMIN (Você)
 */
async function requireSuperAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== "SUPER_ADMIN") {
    throw new Error("Acesso negado. Apenas o administrador global pode executar esta ação.");
  }
  return session;
}

/**
 * Valida se quem está chamando a action tem permissão de gerenciar o Tenant logado
 */
async function requireTenantAdmin() {
  const session = await auth();
  if (!session || (session.user?.role !== "ORG_ADMIN" && session.user?.role !== "SUPER_ADMIN")) {
    throw new Error("Acesso negado. Apenas organizadores podem executar esta ação.");
  }
  if (!session.user.tenantId) {
    throw new Error("Erro de contexto. Usuário não pertence a nenhum Tenant.");
  }
  return session;
}

// ============================================================================
// BLOCO 1: GESTÃO DE TENANTS (Apenas para o Super Admin / Hub)
// ============================================================================

export async function getAllTenants() {
  await requireSuperAdmin();
  return await prisma.tenant.findMany({ 
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { users: true, events: true } } } // Traz métricas úteis pro seu painel
  });
}

export async function createTenant(name: string, subdomain: string, clientEmail: string) {
  await requireSuperAdmin();

  // Gera uma senha temporária segura de 8 caracteres
  const tempPassword = Math.random().toString(36).slice(-8) + "!";
  const hashedPassword = await hash(tempPassword, 10);
  const cleanSubdomain = subdomain.toLowerCase().trim();

  try {
    const tenant = await prisma.tenant.create({
      data: {
        name,
        subdomain: cleanSubdomain,
        users: { 
          create: { 
            email: clientEmail.toLowerCase().trim(),
            password: hashedPassword,
            role: "ORG_ADMIN" 
          } 
        }
      }
    });

    revalidatePath("/admin");

    return { 
      success: true, 
      tenant, 
      credentials: { 
        email: clientEmail, 
        password: tempPassword, 
        // Em dev usa localhost, em prod usa o domínio oficial
        loginUrl: process.env.NODE_ENV === "production" 
          ? `https://${cleanSubdomain}.acaoleve.com/entrar`
          : `http://${cleanSubdomain}.localhost:3000/entrar`
      } 
    };
  } catch (error: any) {
    if (error.code === 'P2002') throw new Error("E-mail ou subdomínio já em uso no sistema.");
    throw new Error("Erro interno ao criar o cliente.");
  }
}

export async function deleteTenant(id: string) {
  await requireSuperAdmin();
  
  // O Prisma cuidará de deletar os usuários e eventos atrelados se o onDelete: Cascade estiver configurado no schema
  await prisma.tenant.delete({ where: { id } });
  revalidatePath("/hub/admin");
  
  return { success: true };
}

// ============================================================================
// BLOCO 2: GESTÃO DE OPERADORES (Locutores do Evento)
// ============================================================================

export async function createOperator(name: string, email: string, rawPassword: string) {
  const session = await requireTenantAdmin();

  if (!session.user.tenantId) {
    return { success: false, error: "Tenant inválido" };
  }

  const tenantId = session.user.tenantId;
  const normalizedEmail = email.toLowerCase().trim();

  if (!name.trim() || !normalizedEmail || !rawPassword.trim()) {
    return { success: false, error: "Preencha todos os campos" };
  }

  if (rawPassword.length < 6) {
    return { success: false, error: "Senha muito curta" };
  }

  try {
    const hashedPassword = await hash(rawPassword, 10);

    await prisma.user.create({
      data: {
        tenantId,
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "OPERATOR"
      }
    });

    revalidatePath("/dashboard");

    return { success: true };

  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "E-mail já está em uso." };
    }

    console.error("Erro ao criar operador:", error);
    return { success: false, error: "Erro interno." };
  }
}

export async function deleteOperator(operatorId: string) {
  const session = await requireTenantAdmin();

  if (!session.user.tenantId) {
    return { success: false, error: "Tenant inválido" };
  }

  const tenantId = session.user.tenantId;

  const result = await prisma.user.deleteMany({
    where: {
      id: operatorId,
      tenantId,
      role: "OPERATOR"
    }
  });

  if (result.count === 0) {
    return {
      success: false,
      error: "Operador não encontrado ou não pertence à sua organização."
    };
  }

  revalidatePath("/dashboard");

  return { success: true };
}

// Nota: A função loginOperator foi intencionalmente REMOVIDA.
// A autenticação do operador agora é feita 100% pelo Auth.js (Credentials Provider) 
// através do componente de login que criamos anteriormente.