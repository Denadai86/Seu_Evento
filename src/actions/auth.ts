"use server";

import  prisma  from "@/lib/prisma";
import { compare } from "bcryptjs";
import { createSession } from "../lib/session";
import { cookies } from "next/headers";

export async function loginTenantAdmin(subdomain: string, email: string, pass: string) {
  const user = await prisma.user.findFirst({
    where: { 
      email: email.toLowerCase().trim(),
      tenant: { subdomain }
    }
  });

  if (!user || !user.password) {
    return { success: false, message: "Acesso negado." };
  }

  const isValidPassword = await compare(pass, user.password);

  if (!isValidPassword) {
    return { success: false, message: "Senha incorreta." };
  }

  await createSession(user.id, subdomain, user.role);
  return { success: true };
}

export async function loginOperator(subdomain: string, username: string, pass: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain }
  });

  if (!tenant) {
    return { success: false, message: "Organização não encontrada" };
  }

  const op = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      email: username.toLowerCase(),
      role: "OPERATOR"
    }
  });

  if (!op || !op.password) {
    return { success: false, message: "Usuário ou senha inválidos" };
  }

  const isValid = await compare(pass, op.password);

  if (!isValid) {
    return { success: false, message: "Usuário ou senha inválidos" };
  }

  const cookieStore = await cookies();
  cookieStore.set(`auth_${subdomain}`, op.id, {
    maxAge: 60 * 60 * 24
  });

  return { success: true };
}