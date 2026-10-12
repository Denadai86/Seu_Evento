// Testes das fases de preço. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { activeTier, currentPrices, pricesOfTier } from "../src/lib/priceTiers.ts";
import { priceForCard, groupByPrice } from "../src/lib/cardPricing.ts";

const d = (iso) => new Date(iso);
const BASE = { ticketPrice: 2500, fullHousePrice: 3500 }; // preço padrão (centavos)

// O exemplo do Jão: pré-venda 10/15, perto do evento 15/20, no evento 20/25
const tiers = [
  { id: "pre", name: "Pré-venda", quinaPrice: 1000, fullHousePrice: 1500, startsAt: null },
  { id: "perto", name: "Próximo ao evento", quinaPrice: 1500, fullHousePrice: 2000, startsAt: d("2026-10-20T11:00:00Z") },
  { id: "evento", name: "No evento", quinaPrice: 2000, fullHousePrice: 2500, startsAt: d("2026-10-25T11:00:00Z") },
];

test("a fase muda sozinha com a data: 10/15 → 15/20 → 20/25", () => {
  const at = (iso) => currentPrices(BASE, tiers, d(iso));
  let p = at("2026-10-12T12:00:00Z");
  assert.deepEqual([p.tier.id, p.quina, p.fullHouse], ["pre", 1000, 1500]);
  p = at("2026-10-22T12:00:00Z");
  assert.deepEqual([p.tier.id, p.quina, p.fullHouse], ["perto", 1500, 2000]);
  p = at("2026-10-25T20:00:00Z");
  assert.deepEqual([p.tier.id, p.quina, p.fullHouse], ["evento", 2000, 2500]);
});

test("na virada exata da fase (startsAt == agora) a nova já vale", () => {
  assert.equal(activeTier(tiers, d("2026-10-20T11:00:00Z")).id, "perto");
  assert.equal(activeTier(tiers, d("2026-10-20T10:59:59Z")).id, "pre");
});

test("a ordem do array não importa", () => {
  const shuffled = [tiers[2], tiers[0], tiers[1]];
  assert.equal(activeTier(shuffled, d("2026-10-22T12:00:00Z")).id, "perto");
});

test("sem nenhuma fase vigente vale o preço PADRÃO do evento", () => {
  const p1 = currentPrices(BASE, [], d("2026-10-22T12:00:00Z"));
  assert.deepEqual([p1.tier, p1.quina, p1.fullHouse], [null, 2500, 3500]);
  // só fases futuras, nenhuma sem data
  const future = [{ id: "x", name: "Futura", quinaPrice: 999, fullHousePrice: null, startsAt: d("2026-12-01T00:00:00Z") }];
  const p2 = currentPrices(BASE, future, d("2026-10-22T12:00:00Z"));
  assert.deepEqual([p2.tier, p2.quina], [null, 2500]);
});

test("fase sem preço de cartela cheia usa o PADRÃO da cartela cheia", () => {
  const t = [{ id: "a", name: "Só quina", quinaPrice: 1200, fullHousePrice: null, startsAt: null }];
  const p = currentPrices(BASE, t, d("2026-10-22T12:00:00Z"));
  assert.deepEqual([p.quina, p.fullHouse], [1200, 3500]);
  // e se nem o padrão da cheia existir, fica sem preço (não vende cheia por engano)
  const p2 = currentPrices({ ticketPrice: 2500, fullHousePrice: null }, t, d("2026-10-22T12:00:00Z"));
  assert.equal(p2.fullHouse, null);
  assert.equal(priceForCard("FULL_HOUSE", p2.quina, p2.fullHouse), null);
});

test("a tesouraria pode escolher uma fase ANTIGA (acerto de venda em papel feita na pré-venda)", () => {
  const preSale = pricesOfTier(BASE, tiers[0]);
  assert.deepEqual([preSale.quina, preSale.fullHouse], [1000, 1500]);
  // acerto no dia do evento, mas pelo preço da pré-venda: 3 quinas + 2 cheias
  const cards = [{ type: "QUINA" }, { type: "QUINA" }, { type: "QUINA" }, { type: "FULL_HOUSE" }, { type: "FULL_HOUSE" }];
  const groups = groupByPrice(cards, preSale.quina, preSale.fullHouse);
  const total = [...groups].reduce((s, [price, list]) => s + price * list.length, 0);
  assert.equal(total, 3 * 1000 + 2 * 1500);
  // o mesmo acerto pela fase vigente no evento custaria mais
  const nowPrices = pricesOfTier(BASE, tiers[2]);
  const totalNow = [...groupByPrice(cards, nowPrices.quina, nowPrices.fullHouse)].reduce((s, [p, l]) => s + p * l.length, 0);
  assert.equal(totalNow, 3 * 2000 + 2 * 2500);
  assert.ok(totalNow > total);
});

test("carrinho misto numa fase: 2 quinas + 1 cheia na fase 'Próximo ao evento' = R$ 50,00", () => {
  const p = currentPrices(BASE, tiers, d("2026-10-22T12:00:00Z"));
  const total = ["QUINA", "QUINA", "FULL_HOUSE"].reduce((s, t) => s + priceForCard(t, p.quina, p.fullHouse), 0);
  assert.equal(total, 2 * 1500 + 2000);
});
