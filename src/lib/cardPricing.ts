// src/lib/cardPricing.ts
//
// Tipos de cartela e preços. Função pura (sem banco), usada pelo servidor e pelas telas.
//
//  • Cartela de QUINA        → só concorre a prêmio de Quina; vale o `ticketPrice` do evento.
//  • Cartela de CARTELA CHEIA → só concorre a prêmio de Cartela Cheia; vale o `fullHousePrice`.
//  • Cartela sem tipo (antigas) → valem para qualquer prêmio e custam o `ticketPrice`.

export type CardType = "QUINA" | "FULL_HOUSE";

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  QUINA: "Quina",
  FULL_HOUSE: "Cartela Cheia",
};

export const isCardType = (v: unknown): v is CardType => v === "QUINA" || v === "FULL_HOUSE";

/**
 * Preço (em centavos) de uma cartela.
 * Retorna null quando é cartela cheia e o preço dela ainda não foi definido: nesse caso NÃO se vende
 * (cobrar o preço da quina por engano seria dinheiro errado no caixa).
 */
export function priceForCard(
  type: CardType | null | undefined,
  ticketPrice: number,
  fullHousePrice: number | null | undefined
): number | null {
  if (type === "FULL_HOUSE") return fullHousePrice != null && fullHousePrice > 0 ? fullHousePrice : null;
  return ticketPrice;
}

/** Cartela de um tipo só concorre a prêmio do mesmo tipo. Cartela antiga (sem tipo) vale para todos. */
export function cardCanWin(cardType: string | null | undefined, prizeType: string | null | undefined): boolean {
  return !cardType || cardType === prizeType;
}

/** Agrupa cartelas pelo preço de cada uma. Lança "PRICE_UNDEFINED" se houver cartela cheia sem preço. */
export function groupByPrice<T extends { type?: CardType | null }>(
  cards: T[],
  ticketPrice: number,
  fullHousePrice: number | null | undefined
): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  for (const card of cards) {
    const price = priceForCard(card.type, ticketPrice, fullHousePrice);
    if (price === null) throw new Error("PRICE_UNDEFINED");
    const list = groups.get(price);
    if (list) list.push(card);
    else groups.set(price, [card]);
  }
  return groups;
}
