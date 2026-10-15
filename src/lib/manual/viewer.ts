// src/lib/manual/viewer.ts
//
// Quem está lendo o manual (papéis para filtrar os assuntos). Só servidor.
// Lembrete: isto só organiza o que mostrar; a proteção real das telas e ações fica nas guardas do servidor.

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rolesFromFlags } from "@/lib/manual/roles";
import type { ManualRole } from "@/lib/manual/types";

export type ManualViewer = {
  id: string;
  name: string;
  firstName: string;
  isAdmin: boolean; // administrador da organização (ou suporte da plataforma): vê tudo
  roles: ManualRole[]; // papéis de voluntário (união dos eventos dele)
};

export async function getManualViewer(): Promise<ManualViewer | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;

  const isAdmin = user.role === "ORG_ADMIN" || user.role === "SUPER_ADMIN";
  let roles: ManualRole[] = [];
  if (user.role === "STAFF") {
    const rows = await prisma.eventStaff.findMany({
      where: { userId: user.id },
      select: { canSell: true, canOperate: true, canVerify: true, canTreasury: true, canAudit: true },
    });
    roles = rolesFromFlags(rows);
  }

  const name = user.name ?? "";
  return { id: user.id, name, firstName: name.trim().split(/\s+/)[0] || "", isAdmin, roles };
}
