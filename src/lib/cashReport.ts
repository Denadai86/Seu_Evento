// src/lib/cashReport.ts
//
// Matemática do FECHAMENTO DE CAIXA (relatório que o tesoureiro assina). Função pura: sem banco,
// para poder ser testada com cenários. Valores no MESMO formato do banco (centavos).

export type PaymentMethodLite = "PIX" | "CASH" | "CARD";

export type CashCard = {
  isPaid: boolean;
  price: number | null;
  eventStaffId: string | null;
  type?: "QUINA" | "FULL_HOUSE" | null;
};
export type CashTx = { method: PaymentMethodLite; amount: number; eventStaffId: string | null };
export type CashStaff = { id: string; name: string };

export type SellerRow = {
  id: string;
  name: string;
  qtd: number;
  pix: number;
  dinheiro: number;
  total: number;
};

const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

export function computeCashReport(input: {
  ticketPrice: number;
  fullHousePrice?: number | null;
  cards: CashCard[];
  transactions: CashTx[];
  sponsorContributions: number[];
  staff: CashStaff[];
}) {
  const { ticketPrice, fullHousePrice, cards, transactions, sponsorContributions, staff } = input;

  // ⚠️ `??` e não `||`: price 0 (cartela do modo demonstração) vale ZERO, não o preço cheio.
  // price null (legado) cai no preço atual do evento.
  // Cartela legada (price null) cai no preço do TIPO dela: cartela cheia usa o preço da cartela cheia.
  const priceOf = (c: CashCard) =>
    c.price ?? (c.type === "FULL_HOUSE" && fullHousePrice && fullHousePrice > 0 ? fullHousePrice : ticketPrice);

  const paidCards = cards.filter((c) => c.isPaid);
  const salesCents = sum(paidCards.map(priceOf));
  const sponsorshipCents = sum(sponsorContributions);

  const pixOf = (txs: CashTx[]) => sum(txs.filter((t) => t.method === "PIX").map((t) => t.amount));
  const cardOf = (txs: CashTx[]) => sum(txs.filter((t) => t.method === "CARD").map((t) => t.amount));

  const pixCents = pixOf(transactions);
  const cardCents = cardOf(transactions);
  // Dinheiro físico = o que foi vendido e não entrou por PIX nem cartão.
  const cashCents = salesCents - pixCents - cardCents;

  // 🔎 Conferência: cartelas pagas × lançamentos de pagamento. Se divergem, o relatório avisa.
  const ledgerCents = sum(transactions.map((t) => t.amount));
  const diffCents = salesCents - ledgerCents;
  const hasDiscrepancy = Math.abs(diffCents) > 0.5;

  // Resumo por tipo de cartela (cartelas antigas, sem tipo, entram em "Quina").
  const byType = {
    QUINA: { qtd: 0, total: 0 },
    FULL_HOUSE: { qtd: 0, total: 0 },
  };
  for (const c of paidCards) {
    const bucket = c.type === "FULL_HOUSE" ? byType.FULL_HOUSE : byType.QUINA;
    bucket.qtd += 1;
    bucket.total += priceOf(c);
  }

  const knownIds = new Set(staff.map((s) => s.id));

  const sellers: SellerRow[] = staff
    .map((s) => {
      const mine = paidCards.filter((c) => c.eventStaffId === s.id);
      const myTx = transactions.filter((t) => t.eventStaffId === s.id);
      const total = sum(mine.map(priceOf));
      const pix = pixOf(myTx);
      return { id: s.id, name: s.name, qtd: mine.length, pix, dinheiro: total - pix - cardOf(myTx), total };
    })
    .filter((r) => r.qtd > 0);

  // Cartelas pagas sem vendedor conhecido (ex.: modo demonstração): aparecem numa linha própria,
  // para a soma da tabela sempre fechar com o total.
  const orphanCards = paidCards.filter((c) => !c.eventStaffId || !knownIds.has(c.eventStaffId));
  if (orphanCards.length > 0) {
    const orphanTx = transactions.filter((t) => !t.eventStaffId || !knownIds.has(t.eventStaffId));
    const total = sum(orphanCards.map(priceOf));
    const pix = pixOf(orphanTx);
    sellers.push({
      id: "sem-vendedor",
      name: "Sem vendedor atribuído",
      qtd: orphanCards.length,
      pix,
      dinheiro: total - pix - cardOf(orphanTx),
      total,
    });
  }

  return {
    cardsGenerated: cards.length,
    cardsPaid: paidCards.length,
    salesCents,
    sponsorshipCents,
    gmvCents: salesCents + sponsorshipCents,
    pixCents,
    cardCents,
    cashCents,
    ledgerCents,
    diffCents,
    hasDiscrepancy,
    byType,
    sellers,
  };
}
