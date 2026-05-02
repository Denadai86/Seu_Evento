import { auth } from "@/lib/auth";

export async function requireRole(roles: ("SUPER_ADMIN" | "ORG_ADMIN" | "OPERATOR")[]) {
  const session = await auth();

  if (!session) {
    throw new Error("Não autenticado");
  }

  if (!roles.includes(session.user.role as any)) {
    throw new Error("Sem permissão");
  }

  return session;
}

export async function requireTenantAccess() {
  const session = await requireRole(["ORG_ADMIN", "SUPER_ADMIN"]);

  if (!session.user.tenantId) {
    throw new Error("Tenant inválido");
  }

  return {
    session,
    tenantId: session.user.tenantId,
  };
}