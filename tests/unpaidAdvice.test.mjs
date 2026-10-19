// Testes do "regularizar agora" na conferência de cartela não paga. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { unpaidCardAdvice } from "../src/lib/unpaidAdvice.ts";

const holder = { staffId: "st-maria", userId: "u-maria", name: "Maria" };
const fiscal = { userId: "u-fiscal", isAdmin: false, canSell: false, canTreasury: false };
const admin = { userId: "u-admin", isAdmin: true, canSell: false, canTreasury: false };
const tesoureiro = { userId: "u-tes", isAdmin: false, canSell: false, canTreasury: true };
const mariaVendedora = { userId: "u-maria", isAdmin: false, canSell: true, canTreasury: false };
const outroVendedor = { userId: "u-jose", isAdmin: false, canSell: true, canTreasury: false };
const base = { eventId: "ev1", code: "AB12CD" };

test("cartela SEM DONO: nunca há convite de venda (evita comprar a cartela vencedora depois do bingo)", () => {
  for (const viewer of [fiscal, admin, tesoureiro, mariaVendedora, outroVendedor]) {
    const a = unpaidCardAdvice({ ...base, holder: null, viewer });
    assert.ok(!a.action || a.action.href.startsWith("/dashboard/ev1/cartelas"), "só pode haver link de CONSULTA, nunca de venda");
    assert.ok(!a.action?.href.includes("/vendas"), "nunca leva ao PDV");
    assert.ok(!a.action?.href.includes("/tesouraria"), "nunca leva ao acerto");
  }
  assert.equal(unpaidCardAdvice({ ...base, holder: null, viewer: fiscal }).action, null);
  assert.match(unpaidCardAdvice({ ...base, holder: null, viewer: fiscal }).note, /não pode ser premiada/);
});

test("cartela com dono: o fiscal vê o NOME de quem está com ela", () => {
  const a = unpaidCardAdvice({ ...base, holder, viewer: fiscal });
  assert.match(a.headline, /Maria/);
  assert.equal(a.holderName, "Maria");
  assert.equal(a.action, null); // fiscal comum só avisa
  assert.match(a.note, /Avise Maria ou a tesouraria/);
});

test("o próprio dono (vendedor) é levado ao PDV com a cartela já escolhida", () => {
  const a = unpaidCardAdvice({ ...base, holder, viewer: mariaVendedora });
  assert.match(a.headline, /está com você/);
  assert.equal(a.action?.href, "/vendas?cartela=AB12CD");
  assert.match(a.action.label, /Regularizar agora/);
});

test("outro vendedor NÃO recebe convite para vender a cartela de um colega", () => {
  const a = unpaidCardAdvice({ ...base, holder, viewer: outroVendedor });
  assert.equal(a.action, null);
  assert.match(a.headline, /com Maria/);
});

test("tesoureiro e administrador vão ao acerto DAQUELE voluntário, com o código preenchido", () => {
  for (const viewer of [tesoureiro, admin]) {
    const a = unpaidCardAdvice({ ...base, holder, viewer });
    assert.equal(a.action?.href, "/dashboard/ev1/tesouraria?staff=st-maria&cartela=AB12CD");
    assert.match(a.action.label, /receber o acerto de Maria/);
  }
});

test("se o dono é também tesoureiro, prevalece registrar a venda (é a própria cartela dele)", () => {
  const a = unpaidCardAdvice({ ...base, holder, viewer: { userId: "u-maria", isAdmin: false, canSell: true, canTreasury: true } });
  assert.equal(a.action?.href, "/vendas?cartela=AB12CD");
});

test("o código e o id vão codificados na URL (sem quebrar a rota)", () => {
  const a = unpaidCardAdvice({ eventId: "ev1", code: "A B&1", holder: { staffId: "s&1", userId: "x", name: "Z" }, viewer: tesoureiro });
  assert.ok(a.action.href.includes("staff=s%261") && a.action.href.includes("cartela=A%20B%261"));
});
