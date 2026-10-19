// Testes do fechamento de caixa (função pura, sem banco).  Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { computeCashReport } from "../src/lib/cashReport.ts";

const staff = [{ id: "A", name: "Ana" }, { id: "B", name: "Bruno" }];
const card = (staffId, price = 1000) => ({ isPaid: true, price, eventStaffId: staffId });
const tx = (method, staffId, amount = 1000) => ({ method, amount, eventStaffId: staffId });

// A conta ANTIGA da página (para provar que a nova não muda o resultado em vendas normais)
const oldMath = (ticketPrice, cards, txs) => {
  const total = cards.filter((c) => c.isPaid).reduce((s, c) => s + (c.price || ticketPrice), 0);
  const pix = txs.filter((t) => t.method === "PIX").reduce((s, t) => s + t.amount, 0);
  return { total, pix, cash: total - pix };
};

// Ana vendeu 6 (4 PIX + 2 dinheiro); Bruno vendeu 4 (2 PIX + 2 dinheiro). Preço R$ 10,00 = 1000.
const normalCards = [...Array(6).fill(0).map(() => card("A")), ...Array(4).fill(0).map(() => card("B"))];
const normalTx = [
  ...Array(4).fill(0).map(() => tx("PIX", "A")), ...Array(2).fill(0).map(() => tx("CASH", "A")),
  ...Array(2).fill(0).map(() => tx("PIX", "B")), ...Array(2).fill(0).map(() => tx("CASH", "B")),
];

test("vendas normais: totais, PIX, dinheiro e vendedores fecham", () => {
  const r = computeCashReport({ ticketPrice: 1000, cards: normalCards, transactions: normalTx, sponsorContributions: [50000, 20000], staff });
  assert.equal(r.salesCents, 10000);
  assert.equal(r.pixCents, 6000);
  assert.equal(r.cashCents, 4000);
  assert.equal(r.sponsorshipCents, 70000);
  assert.equal(r.gmvCents, 80000);
  assert.equal(r.ledgerCents, 10000);
  assert.equal(r.hasDiscrepancy, false);
  const ana = r.sellers.find((s) => s.id === "A");
  const bruno = r.sellers.find((s) => s.id === "B");
  assert.deepEqual([ana.name, ana.qtd, ana.total, ana.pix, ana.dinheiro], ["Ana", 6, 6000, 4000, 2000]);
  assert.deepEqual([bruno.name, bruno.qtd, bruno.total, bruno.pix, bruno.dinheiro], ["Bruno", 4, 4000, 2000, 2000]);
});

test("em vendas normais a conta nova dá o MESMO resultado da antiga", () => {
  const n = computeCashReport({ ticketPrice: 1000, cards: normalCards, transactions: normalTx, sponsorContributions: [], staff });
  const o = oldMath(1000, normalCards, normalTx);
  assert.deepEqual([n.salesCents, n.pixCents, n.cashCents], [o.total, o.pix, o.cash]);
});

test("acerto da tesouraria (price gravado) entra no total e no vendedor, sem divergência", () => {
  const cards = [...normalCards, ...Array(5).fill(0).map(() => card("A", 1000))];
  const txs = [...normalTx, tx("CASH", "A", 5000)]; // uma Transaction agregada por acerto
  const r = computeCashReport({ ticketPrice: 1000, cards, transactions: txs, sponsorContributions: [], staff });
  assert.equal(r.salesCents, 15000);
  assert.equal(r.cashCents, 9000);
  assert.equal(r.hasDiscrepancy, false);
  assert.equal(r.sellers.find((s) => s.id === "A").qtd, 11);
});

test("cartelas do modo demonstração (price 0) NÃO viram faturamento — a conta antiga inflava", () => {
  const demo = Array(3).fill(0).map(() => ({ isPaid: true, price: 0, eventStaffId: null }));
  const o = oldMath(1000, demo, []);
  assert.equal(o.total, 3000); // bug antigo: price 0 caía no preço cheio
  const r = computeCashReport({ ticketPrice: 1000, cards: demo, transactions: [], sponsorContributions: [], staff });
  assert.equal(r.salesCents, 0);
  assert.equal(r.hasDiscrepancy, false);
  const orphan = r.sellers.find((s) => s.id === "sem-vendedor");
  assert.deepEqual([orphan.qtd, orphan.total], [3, 0]);
});

test("preço alterado depois de cartelas legadas (price null): o relatório AVISA a divergência", () => {
  const legacy = [{ isPaid: true, price: null, eventStaffId: "A" }, { isPaid: true, price: null, eventStaffId: "A" }];
  const r = computeCashReport({ ticketPrice: 1500, cards: legacy, transactions: [tx("CASH", "A", 2000)], sponsorContributions: [], staff });
  assert.equal(r.salesCents, 3000);
  assert.equal(r.ledgerCents, 2000);
  assert.equal(r.diffCents, 1000);
  assert.equal(r.hasDiscrepancy, true);
});

test("a soma da tabela de vendedores sempre fecha com o total de vendas", () => {
  const cards = [...normalCards, { isPaid: true, price: 1000, eventStaffId: null }, { isPaid: false, price: null, eventStaffId: "A" }];
  const r = computeCashReport({ ticketPrice: 1000, cards, transactions: normalTx, sponsorContributions: [], staff });
  assert.equal(r.sellers.reduce((s, x) => s + x.total, 0), r.salesCents);
  assert.equal(r.cardsPaid, 11);
  assert.equal(r.cardsGenerated, 12);
});
