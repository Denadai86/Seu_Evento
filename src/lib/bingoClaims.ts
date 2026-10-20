// src/lib/bingoClaims.ts
//
// FILA DE AVISOS DE BINGO. Quando dois (ou mais) fiscais avisam bingo na mesma rodada, NENHUM aviso é descartado:
// todos entram numa fila para o LOCUTOR, que decide na hora com os ganhadores:
//   • um só ganha (os outros cederam), ou
//   • o prêmio é DIVIDIDO (o telão mostra todos os nomes).
// O sistema ajuda com um dado objetivo: em qual pedra cada cartela fechou. Função pura, com testes.

export type ClaimLike = { id: string; closedAtDraw: number | null; createdAt: Date | string | number };

const time = (v: Date | string | number) => new Date(v).getTime();

/** Ordem sugerida: quem fechou o padrão primeiro; depois quem avisou primeiro. Sem a pedra, vai para o fim. */
export function orderClaims<T extends ClaimLike>(claims: readonly T[]): T[] {
  return [...claims].sort((a, b) => {
    const ka = a.closedAtDraw ?? Number.POSITIVE_INFINITY;
    const kb = b.closedAtDraw ?? Number.POSITIVE_INFINITY;
    return ka - kb || time(a.createdAt) - time(b.createdAt);
  });
}

export function summarizeQueue(claims: readonly ClaimLike[]) {
  const ordered = orderClaims(claims);
  const known = ordered.filter((c) => c.closedAtDraw != null);
  const firstDraw = known[0]?.closedAtDraw ?? null;
  // EMPATE DE VERDADE: duas ou mais cartelas fecharam na MESMA pedra, e foi a primeira.
  const tiedIds = firstDraw == null ? [] : known.filter((c) => c.closedAtDraw === firstDraw).map((c) => c.id);
  return {
    total: ordered.length,
    firstDraw,
    isRealTie: tiedIds.length > 1,
    tiedIds,
    suggestedId: ordered[0]?.id ?? null,
  };
}

/** "Maria", "Maria e José", "Maria, José e Ana". */
export function joinNames(names: readonly string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? "";
  if (clean.length === 2) return `${clean[0]} e ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} e ${clean[clean.length - 1]}`;
}

export type Selection =
  | { ok: true; mode: "UNICO" | "DIVIDIDO"; chosen: string[]; yielded: string[] }
  | { ok: false; error: string };

/** Valida a decisão do locutor: quais avisos da fila ganham. Os que sobram ficam como "cederam". */
export function validateSelection(pendingIds: readonly string[], chosenIds: readonly string[]): Selection {
  const pending = new Set(pendingIds);
  const chosen = [...new Set(chosenIds)];
  if (chosen.length === 0) return { ok: false, error: "Escolha pelo menos um ganhador." };
  if (chosen.some((id) => !pending.has(id))) {
    return { ok: false, error: "Algum aviso escolhido não está mais na fila. Atualize a tela e tente de novo." };
  }
  return {
    ok: true,
    mode: chosen.length === 1 ? "UNICO" : "DIVIDIDO",
    chosen,
    yielded: pendingIds.filter((id) => !chosen.includes(id)),
  };
}
