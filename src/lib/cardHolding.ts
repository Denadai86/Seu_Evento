// src/lib/cardHolding.ts
//
// Cartelas "na mão" de um voluntário e escolha das cartelas num pedido entre voluntários.
// Função pura (sem banco), com testes.
//
// Regra do pedido: o voluntário que LIBERA entrega as ÚLTIMAS N cartelas da pilha dele
// (as de MAIOR código). A tesouraria entrega códigos consecutivos em ordem crescente, então a pilha
// física já está em ordem e "as últimas N" são fáceis de separar sem bipar nada.
// A ordem usada é a de código crescente (dígitos antes de letras), a mesma da impressão.

export type HoldCard = { shortId: string; type?: "QUINA" | "FULL_HOUSE" | null };

const byCode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Cartela antiga (sem tipo) conta como Quina; cartela cheia só conta como cartela cheia.
export const matchesRequestedType = (cardType: HoldCard["type"], requested: "QUINA" | "FULL_HOUSE") =>
  requested === "FULL_HOUSE" ? cardType === "FULL_HOUSE" : cardType === "QUINA" || !cardType;

export function summarizeHolding(cards: HoldCard[]) {
  const sorted = [...cards].sort((a, b) => byCode(a.shortId, b.shortId));
  const fullHouse = sorted.filter((c) => c.type === "FULL_HOUSE").length;
  return {
    total: sorted.length,
    quina: sorted.length - fullHouse,
    fullHouse,
    first: sorted[0]?.shortId ?? null,
    last: sorted[sorted.length - 1]?.shortId ?? null,
  };
}

/** As N cartelas de MAIOR código do tipo pedido, ou null se o dono tiver menos que N. */
export function pickTransferCards<T extends HoldCard>(
  cards: T[],
  requested: "QUINA" | "FULL_HOUSE",
  quantity: number
): T[] | null {
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  const eligible = cards.filter((c) => matchesRequestedType(c.type, requested));
  if (eligible.length < quantity) return null;
  return [...eligible].sort((a, b) => byCode(b.shortId, a.shortId)).slice(0, quantity);
}
