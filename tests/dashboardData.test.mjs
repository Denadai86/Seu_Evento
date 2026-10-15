// Testes das agregações do painel. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { buildTimeline, buildByPrice, buildStock, pendingByStaff, buildDrawSummary } from "../src/lib/dashboardData.ts";

const at = (iso) => new Date(iso);
// São Paulo = UTC-3. 12/10 às 14h SP = 17h UTC.
const tx = (iso, amount, cardId = "c") => ({ amount, createdAt: at(iso), cardId });

test("linha do tempo por hora: separa PDV de acertos e acumula", () => {
  const txs = [
    tx("2026-10-10T17:05:00Z", 1000), tx("2026-10-10T17:40:00Z", 1000), // 14h SP: 2 vendas
    tx("2026-10-10T19:10:00Z", 1500),                                    // 16h SP: 1 venda
    { amount: 5000, createdAt: at("2026-10-10T19:30:00Z"), cardId: null }, // 16h SP: acerto
  ];
  const r = buildTimeline(txs);
  assert.equal(r.unit, "hour");
  assert.deepEqual(r.points.map((p) => p.label), ["14h", "15h", "16h"]); // 15h existe, vazia, para a linha ser contínua
  assert.deepEqual(r.points.map((p) => [p.pdv, p.settlement, p.count]), [[2000, 0, 2], [0, 0, 0], [1500, 5000, 1]]);
  assert.deepEqual(r.points.map((p) => p.cumulative), [2000, 2000, 8500]);
  assert.equal(r.peak.label, "16h");
});

test("a soma da linha do tempo fecha com a soma das transações", () => {
  const txs = [tx("2026-10-10T17:05:00Z", 1000), tx("2026-10-11T09:00:00Z", 2500), { amount: 700, createdAt: at("2026-10-12T10:00:00Z"), cardId: null }];
  const r = buildTimeline(txs);
  const total = r.points.reduce((s, p) => s + p.pdv + p.settlement, 0);
  assert.equal(total, 4200);
  assert.equal(r.points.at(-1).cumulative, 4200);
});

test("período longo (mais de 48h) agrupa por DIA", () => {
  const r = buildTimeline([tx("2026-10-10T17:00:00Z", 1000), tx("2026-10-14T17:00:00Z", 1000)]);
  assert.equal(r.unit, "day");
  assert.deepEqual(r.points.map((p) => p.label), ["10/10", "11/10", "12/10", "13/10", "14/10"]);
});

test("virada do dia usa o horário de São Paulo, não o UTC", () => {
  // 02:30 UTC de 11/10 = 23:30 de 10/10 em São Paulo
  const r = buildTimeline([tx("2026-10-11T02:30:00Z", 1000), tx("2026-10-11T04:00:00Z", 1000)]);
  assert.deepEqual(r.points.map((p) => p.label), ["10/10 23h", "11/10 00h", "11/10 01h"]);
  assert.deepEqual(r.points.map((p) => p.pdv), [1000, 0, 1000]);
});

test("sem transações: nada a mostrar (sem inventar dados)", () => {
  const r = buildTimeline([]);
  assert.deepEqual([r.points.length, r.peak], [0, null]);
});

test("vendas por preço praticado revela o efeito das fases de preço", () => {
  const cards = [
    ...Array(5).fill(0).map(() => ({ isPaid: true, price: 1000, eventStaffId: "A" })),
    ...Array(3).fill(0).map(() => ({ isPaid: true, price: 1500, eventStaffId: "A" })),
    { isPaid: true, price: 0, eventStaffId: null },            // demonstração
    { isPaid: true, price: null, type: "FULL_HOUSE", eventStaffId: "A" }, // antiga, cheia
    { isPaid: false, price: null, eventStaffId: "A" },          // não paga: fora
  ];
  const rows = buildByPrice(cards, 1000, 2500);
  assert.deepEqual(rows, [{ price: 0, qtd: 1, total: 0 }, { price: 1000, qtd: 5, total: 5000 }, { price: 1500, qtd: 3, total: 4500 }, { price: 2500, qtd: 1, total: 2500 }]);
});

test("estoque: livres + com voluntários + pagas = total", () => {
  const cards = [
    { isPaid: false, price: null, eventStaffId: null }, { isPaid: false, price: null, eventStaffId: null },
    { isPaid: false, price: null, eventStaffId: "A" },
    { isPaid: true, price: 1000, eventStaffId: "A" }, { isPaid: true, price: 1000, eventStaffId: null },
  ];
  const s = buildStock(cards);
  assert.deepEqual(s, { total: 5, free: 2, withVolunteers: 1, paid: 2, blocked: 0 });
  assert.equal(s.free + s.withVolunteers + s.paid, s.total);
  assert.equal(pendingByStaff(cards).get("A"), 1);
});

test("resumo do sorteio: pedras, duração e ritmo", () => {
  const s = buildDrawSummary([at("2026-10-10T20:00:00Z"), at("2026-10-10T20:01:00Z"), at("2026-10-10T20:02:00Z"), at("2026-10-10T20:04:00Z")]);
  assert.equal(s.balls, 4);
  assert.equal(s.spanSeconds, 240);
  assert.equal(s.perMinute, 1);
  assert.equal(buildDrawSummary([]).balls, 0);
});
