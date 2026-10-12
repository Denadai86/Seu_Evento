// Testes de tipo e preço de cartela. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { priceForCard, cardCanWin, groupByPrice, isCardType } from "../src/lib/cardPricing.ts";
import { computeCashReport } from "../src/lib/cashReport.ts";

test("preço pelo tipo: quina usa o preço do evento, cartela cheia usa o dela", () => {
  assert.equal(priceForCard("QUINA", 1000, 2500), 1000);
  assert.equal(priceForCard("FULL_HOUSE", 1000, 2500), 2500);
  assert.equal(priceForCard(null, 1000, 2500), 1000); // cartela antiga, sem tipo
  assert.equal(priceForCard(undefined, 1000, null), 1000);
});

test("cartela cheia SEM preço definido não tem preço (não pode ser vendida pelo preço da quina)", () => {
  assert.equal(priceForCard("FULL_HOUSE", 1000, null), null);
  assert.equal(priceForCard("FULL_HOUSE", 1000, undefined), null);
  assert.equal(priceForCard("FULL_HOUSE", 1000, 0), null);
});

test("cada tipo só concorre ao prêmio do mesmo tipo; cartela antiga concorre a todos", () => {
  assert.equal(cardCanWin("QUINA", "QUINA"), true);
  assert.equal(cardCanWin("QUINA", "FULL_HOUSE"), false);
  assert.equal(cardCanWin("FULL_HOUSE", "QUINA"), false);
  assert.equal(cardCanWin("FULL_HOUSE", "FULL_HOUSE"), true);
  assert.equal(cardCanWin(null, "QUINA"), true);
  assert.equal(cardCanWin(null, "FULL_HOUSE"), true);
  assert.equal(cardCanWin("QUINA", undefined), false); // sem prêmio ativo, cartela tipada não ganha nada
});

test("groupByPrice separa por preço e recusa cartela cheia sem preço", () => {
  const cards = [
    { id: "a", type: "QUINA" }, { id: "b", type: "FULL_HOUSE" }, { id: "c", type: "QUINA" }, { id: "d", type: null },
  ];
  const g = groupByPrice(cards, 1000, 2500);
  assert.deepEqual([...g.keys()].sort((x, y) => x - y), [1000, 2500]);
  assert.deepEqual(g.get(1000).map((c) => c.id), ["a", "c", "d"]);
  assert.deepEqual(g.get(2500).map((c) => c.id), ["b"]);
  assert.throws(() => groupByPrice(cards, 1000, null), /PRICE_UNDEFINED/);
});

test("cobrança de um carrinho misto: 3 quinas + 2 cheias", () => {
  const cart = [
    { type: "QUINA" }, { type: "QUINA" }, { type: "QUINA" }, { type: "FULL_HOUSE" }, { type: "FULL_HOUSE" },
  ];
  const total = cart.reduce((s, c) => s + priceForCard(c.type, 1000, 2500), 0);
  assert.equal(total, 3 * 1000 + 2 * 2500); // 8000 centavos = R$ 80,00
});

test("isCardType só aceita os dois tipos", () => {
  assert.equal(isCardType("QUINA"), true);
  assert.equal(isCardType("FULL_HOUSE"), true);
  assert.equal(isCardType("quina"), false);
  assert.equal(isCardType(null), false);
});

// ── Fechamento de caixa com os dois tipos ──
const staff = [{ id: "A", name: "Ana" }];
const paid = (type, price, staffId = "A") => ({ isPaid: true, price, type, eventStaffId: staffId });
const tx = (amount, method = "CASH", staffId = "A") => ({ method, amount, eventStaffId: staffId });

test("relatório: resumo por tipo e total certo com preços diferentes", () => {
  const cards = [paid("QUINA", 1000), paid("QUINA", 1000), paid("FULL_HOUSE", 2500), paid("FULL_HOUSE", 2500), paid(null, 1000)];
  const txs = [tx(1000), tx(1000), tx(2500, "PIX"), tx(2500, "PIX"), tx(1000)];
  const r = computeCashReport({ ticketPrice: 1000, fullHousePrice: 2500, cards, transactions: txs, sponsorContributions: [], staff });
  assert.equal(r.salesCents, 8000);
  assert.deepEqual(r.byType.QUINA, { qtd: 3, total: 3000 }); // inclui a cartela antiga, sem tipo
  assert.deepEqual(r.byType.FULL_HOUSE, { qtd: 2, total: 5000 });
  assert.equal(r.pixCents, 5000);
  assert.equal(r.cashCents, 3000);
  assert.equal(r.hasDiscrepancy, false);
});

test("relatório: cartela cheia antiga (price null) usa o preço da cartela cheia, não o da quina", () => {
  const cards = [{ isPaid: true, price: null, type: "FULL_HOUSE", eventStaffId: "A" }];
  const r = computeCashReport({ ticketPrice: 1000, fullHousePrice: 2500, cards, transactions: [], sponsorContributions: [], staff });
  assert.equal(r.salesCents, 2500);
});
