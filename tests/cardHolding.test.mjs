// Testes de cartelas na mão, pedido entre voluntários e inventário. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { summarizeHolding, pickTransferCards, matchesRequestedType } from "../src/lib/cardHolding.ts";
import { cardStatus, summarizeInventory, sortedCodes } from "../src/lib/cardInventory.ts";

const c = (shortId, type = "QUINA") => ({ shortId, type });

test("resumo da pilha: total, tipos e faixa de códigos (do menor ao maior)", () => {
  const h = summarizeHolding([c("K9"), c("B2"), c("Z1", "FULL_HOUSE"), c("A7")]);
  assert.deepEqual([h.total, h.quina, h.fullHouse, h.first, h.last], [4, 3, 1, "A7", "Z1"]);
  assert.deepEqual(summarizeHolding([]), { total: 0, quina: 0, fullHouse: 0, first: null, last: null });
});

test("pedido: o dono entrega as ÚLTIMAS N da pilha (maiores códigos)", () => {
  const pile = ["AA1", "AB2", "AC3", "AD4", "AE5", "AF6"].map((s) => c(s));
  const picked = pickTransferCards(pile, "QUINA", 2).map((x) => x.shortId);
  assert.deepEqual(picked, ["AF6", "AE5"]);
  // o que sobra com o dono continua uma faixa contínua: AA1..AD4
  const rest = pile.filter((x) => !picked.includes(x.shortId));
  assert.deepEqual([summarizeHolding(rest).first, summarizeHolding(rest).last], ["AA1", "AD4"]);
});

test("dígitos vêm antes das letras (mesma ordem da impressão)", () => {
  const pile = [c("9ZZ"), c("A00"), c("0AA")];
  assert.deepEqual(pickTransferCards(pile, "QUINA", 3).map((x) => x.shortId), ["A00", "9ZZ", "0AA"]);
  assert.deepEqual(sortedCodes(pile), ["0AA", "9ZZ", "A00"]);
});

test("pedir mais do que o dono tem: não escolhe nada (tudo ou nada)", () => {
  const pile = [c("A1"), c("A2")];
  assert.equal(pickTransferCards(pile, "QUINA", 3), null);
  assert.equal(pickTransferCards(pile, "QUINA", 0), null);
  assert.equal(pickTransferCards(pile, "QUINA", 1.5), null);
});

test("tipos não se misturam: cheia só como cheia; cartela antiga (sem tipo) conta como quina", () => {
  const pile = [c("A1", "QUINA"), c("A2", null), c("A3", "FULL_HOUSE"), c("A4", "FULL_HOUSE")];
  assert.deepEqual(pickTransferCards(pile, "FULL_HOUSE", 2).map((x) => x.shortId), ["A4", "A3"]);
  assert.equal(pickTransferCards(pile, "FULL_HOUSE", 3), null);
  assert.deepEqual(pickTransferCards(pile, "QUINA", 2).map((x) => x.shortId), ["A2", "A1"]);
  assert.equal(matchesRequestedType(null, "QUINA"), true);
  assert.equal(matchesRequestedType(null, "FULL_HOUSE"), false);
});

test("inventário: situação de cada cartela e totais que sempre fecham", () => {
  const cards = [
    { shortId: "A1", type: "QUINA", isPaid: false, eventStaffId: null },
    { shortId: "A2", type: "QUINA", isPaid: false, eventStaffId: "m" },
    { shortId: "A3", type: "FULL_HOUSE", isPaid: true, eventStaffId: "m" },
    { shortId: "A4", type: null, isPaid: true, eventStaffId: null },
    { shortId: "A5", type: "FULL_HOUSE", isPaid: false, eventStaffId: null },
  ];
  assert.deepEqual(cards.map(cardStatus), ["LIVRE", "COM_VOLUNTARIO", "VENDIDA", "VENDIDA", "LIVRE"]);
  const s = summarizeInventory(cards);
  assert.deepEqual([s.total, s.livre, s.comVoluntario, s.vendida], [5, 2, 1, 2]);
  assert.equal(s.livre + s.comVoluntario + s.vendida, s.total);
  assert.deepEqual([s.byType.QUINA.total, s.byType.FULL_HOUSE.total, s.byType.SEM_TIPO.total], [2, 2, 1]);
  assert.equal(s.byType.FULL_HOUSE.livre, 1);
});
