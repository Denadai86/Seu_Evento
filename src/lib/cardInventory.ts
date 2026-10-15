// src/lib/cardInventory.ts
//
// Inventário de cartelas por ID: em que estado está cada uma. Função pura, com testes.
//   LIVRE          → na fábrica (sem voluntário e não paga)
//   COM_VOLUNTARIO → entregue a um voluntário, ainda não paga
//   VENDIDA        → paga (vendida no PDV ou acertada na tesouraria)

export type InvCard = {
  shortId: string;
  type?: "QUINA" | "FULL_HOUSE" | null;
  isPaid: boolean;
  eventStaffId: string | null;
  blocked?: boolean;
};

export type CardStatus = "LIVRE" | "COM_VOLUNTARIO" | "VENDIDA" | "BLOQUEADA";

export const cardStatus = (c: Pick<InvCard, "isPaid" | "eventStaffId" | "blocked">): CardStatus =>
  c.blocked ? "BLOQUEADA" : c.isPaid ? "VENDIDA" : c.eventStaffId ? "COM_VOLUNTARIO" : "LIVRE";

const emptyCounts = () => ({ livre: 0, comVoluntario: 0, vendida: 0, bloqueada: 0, total: 0 });

export function summarizeInventory(cards: InvCard[]) {
  const all = emptyCounts();
  const byType = { QUINA: emptyCounts(), FULL_HOUSE: emptyCounts(), SEM_TIPO: emptyCounts() };

  for (const c of cards) {
    const bucket = c.type === "FULL_HOUSE" ? byType.FULL_HOUSE : c.type === "QUINA" ? byType.QUINA : byType.SEM_TIPO;
    const st = cardStatus(c);
    const key = st === "LIVRE" ? "livre" : st === "COM_VOLUNTARIO" ? "comVoluntario" : st === "BLOQUEADA" ? "bloqueada" : "vendida";
    all[key]++; all.total++;
    bucket[key]++; bucket.total++;
  }
  return { ...all, byType };
}

/** Códigos em ordem crescente (a mesma da impressão). */
export const sortedCodes = (cards: Pick<InvCard, "shortId">[]) =>
  cards.map((c) => c.shortId).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
