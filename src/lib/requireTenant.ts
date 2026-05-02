import { auth } from "@/lib/auth";

export async function requireTenant() {
  const session = await auth();

  if (!session) {
    throw new Error("Não autorizado");
  }

  if (!session.user?.tenantId) {
    throw new Error("Tenant inválido");
  }

  return {
    session,
    tenantId: session.user.tenantId,
  };
}
