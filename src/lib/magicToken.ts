// src/lib/magicToken.ts
//
// Token mágico (acesso remoto do suporte): vale por poucos minutos e só pode ser usado UMA vez.
// Função pura, com testes. O "uso único" é garantido no banco (src/lib/auth.ts): consumo atômico.

export const MAGIC_TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * O token ainda vale? Token SEM data de validade (gerado antes desta regra) NÃO vale: é preciso gerar outro.
 */
export function isMagicTokenUsable(token: string | null | undefined, expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!token || !expiresAt) return false;
  return expiresAt.getTime() > now.getTime();
}
