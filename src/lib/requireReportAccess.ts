// src/lib/requireReportAccess.ts
//
// Guarda das PÁGINAS de relatório (elas consultam o banco direto, sem passar por server action).
// Só o ORG_ADMIN do próprio tenant, ou o Super Admin (somente leitura), enxerga o dinheiro do evento.
// O proxy já barra o voluntário, mas a página não pode depender só dele.

import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function requireReportAccess(subdomain: string) {
  const session = await auth();

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    select: { id: true, name: true },
  });
  if (!tenant) notFound();

  const role = session?.user?.role;
  const allowed =
    role === "SUPER_ADMIN" || (role === "ORG_ADMIN" && session?.user?.tenantId === tenant.id);
  if (!allowed) redirect("/entrar");

  return tenant;
}
