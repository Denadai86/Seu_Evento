"use server";

import { prisma } from "../lib/prisma";
import { compare } from "bcryptjs";
import { createSession } from "../lib/session";
import { cookies } from "next/headers";

export async function loginTenantAdmin(subdomain: string, email: string, pass: string) {
  const user = await prisma.user.findFirst({
    where: { 
      email: email.toLowerCase().trim(),
      organization: { slug: subdomain }
    }
  });

  if (!user) return { success: false, message: "Acesso negado." };

  const isValidPassword = await compare(pass, user.password);
  if (!isValidPassword) return { success: false, message: "Senha incorreta." };

  await createSession(user.id, subdomain, user.role);
  return { success: true };
}

export async function loginOperator(subdomain: string, username: string, pass: string) {
  const org = await prisma.organization.findUnique({ where: { slug: subdomain } });
  if (!org) return { success: false, message: "Organização não encontrada" };

  const op = await prisma.operator.findFirst({
    where: { organizationId: org.id, username: username.toLowerCase(), password: pass }
  });

  if (op) {
    const cookieStore = await cookies();
    cookieStore.set(`auth_${subdomain}`, op.id, { maxAge: 60 * 60 * 24 });
    return { success: true };
  }
  return { success: false, message: "Usuário ou senha inválidos" };
}