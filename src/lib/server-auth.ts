import { auth } from "./auth"; // Ajusta para o teu caminho do NextAuth/Auth.js ou outra lib
import  prisma  from "@/lib/prisma";

/**
 * 1. Garante que existe um utilizador autenticado e devolve a sessão.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("Não autenticado. Por favor, inicie sessão.");
  }
  return session.user;
}

/**
 * 2. Garante que o utilizador pertence a um Tenant específico.
 * NUNCA recebas o tenantId do client. Usa sempre o da sessão.
 */
export async function requireTenant() {
  const user = await requireAuth();
  if (!user.tenantId) {
    throw new Error("Utilizador não está associado a nenhuma organização (Tenant).");
  }
  return { user, tenantId: user.tenantId };
}

/**
 * 3. A Guarda de Ouro: Valida se um evento pertence de facto ao Tenant do utilizador logado.
 * Previne que um atacante passe o eventId de outra ONG no payload.
 */
export async function requireEventOwnership(eventId: string) {
  const { user, tenantId } = await requireTenant();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, tenantId: true } // Otimização: traz apenas o necessário
  });

  if (!event) {
    throw new Error("Evento não encontrado.");
  }

  if (event.tenantId !== tenantId) {
    // Log de segurança importante aqui (possível tentativa de invasão)
    console.error(`[ALERTA DE SEGURANÇA] User ${user.id} tentou aceder ao evento ${eventId} do tenant ${event.tenantId}`);
    throw new Error("Acesso negado. Este evento não pertence à sua organização.");
  }

  return { user, tenantId, event };
}