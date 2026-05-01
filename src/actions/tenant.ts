"use server";

import { cookies } from "next/headers";
import { prisma } from "../lib/prisma";
import { hash } from "bcryptjs";

export async function getAllOrganizations() {
  return await prisma.organization.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createOrganization(name: string, slug: string, clientEmail: string) {
  const tempPassword = Math.random().toString(36).slice(-6) + "!";
  const hashedPassword = await hash(tempPassword, 10);

  try {
    const org = await prisma.organization.create({
      data: {
        name,
        slug: slug.toLowerCase(),
        users: { 
          create: { 
            email: clientEmail.toLowerCase().trim(),
            password: hashedPassword,
            role: "ORG_ADMIN" 
          } 
        }
      }
    });

    return { 
      success: true, 
      org, 
      credentials: { email: clientEmail, password: tempPassword, loginUrl: `http://${slug}.localhost:3000/entrar` } 
    };
  } catch (error: any) {
    if (error.code === 'P2002') throw new Error("E-mail ou subdomínio já em uso.");
    throw new Error("Erro ao criar cliente.");
  }
}

export async function deleteOrganization(id: string) {
  return await prisma.organization.delete({ where: { id } });
}

// ============================================================================
// BLOCO 3: GESTÃO DE OPERADORES (Locutores)
// ============================================================================

export async function createOperator(orgId: string, username: string, pass: string) {
  return await prisma.operator.create({
    data: { 
      organizationId: orgId, 
      username: username.toLowerCase(), 
      password: pass // Como é acesso restrito temporário, mantemos simples
    }
  });
}

export async function deleteOperator(id: string) {
  return await prisma.operator.delete({ where: { id } });
}

export async function loginOperator(subdomain: string, username: string, pass: string) {
  const org = await prisma.organization.findUnique({ where: { slug: subdomain } });
  if (!org) return { success: false, message: "Organização não encontrada" };

  const op = await prisma.operator.findFirst({
    where: { organizationId: org.id, username: username.toLowerCase(), password: pass }
  });

  if (op) {
    const cookieStore = await cookies();
    cookieStore.set(`auth_${subdomain}`, op.id, { maxAge: 60 * 60 * 24 }); // Cookie simples de 24h
    return { success: true };
  }
  return { success: false, message: "Usuário ou senha inválidos" };
}

