// src/lib/priceTiers.ts
//
// Fases de preço (pré-venda → perto do evento → no evento). Função pura, sem banco.
//
// Regras:
//  • Fase vigente = a de MAIOR `startsAt` que já começou (startsAt <= agora).
//    Fase sem data (`startsAt` null) vale "desde o início" e só vigora se nenhuma outra começou.
//  • Nenhuma fase vigente → vale o preço PADRÃO do evento.
//  • Fase sem preço de cartela cheia → usa o preço padrão da cartela cheia (nunca fica sem preço por isso).

export type TierLite = {
  id: string;
  name: string;
  quinaPrice: number;
  fullHousePrice: number | null;
  startsAt: Date | null;
};

export type BasePrices = { ticketPrice: number; fullHousePrice: number | null | undefined };
export type ResolvedPrices = { quina: number; fullHouse: number | null; tier: TierLite | null };

export function activeTier(tiers: TierLite[], now: Date = new Date()): TierLite | null {
  const started = tiers.filter((t) => !t.startsAt || t.startsAt.getTime() <= now.getTime());
  if (started.length === 0) return null;
  return [...started].sort(
    (a, b) => (b.startsAt?.getTime() ?? -Infinity) - (a.startsAt?.getTime() ?? -Infinity)
  )[0];
}

/** Preços de uma fase específica (usado também quando a tesouraria escolhe a fase manualmente). */
export function pricesOfTier(base: BasePrices, tier: TierLite): ResolvedPrices {
  return { quina: tier.quinaPrice, fullHouse: tier.fullHousePrice ?? base.fullHousePrice ?? null, tier };
}

/** Preços em vigor AGORA. */
export function currentPrices(base: BasePrices, tiers: TierLite[], now: Date = new Date()): ResolvedPrices {
  const tier = activeTier(tiers, now);
  if (tier) return pricesOfTier(base, tier);
  return { quina: base.ticketPrice, fullHouse: base.fullHousePrice ?? null, tier: null };
}
