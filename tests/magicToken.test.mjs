// Testes do token mágico (acesso remoto do suporte). Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { isMagicTokenUsable, MAGIC_TOKEN_TTL_MS } from "../src/lib/magicToken.ts";

const now = new Date("2026-10-19T12:00:00Z");
const inMin = (m) => new Date(now.getTime() + m * 60_000);

test("a validade é de poucos minutos (10), não de horas", () => {
  assert.equal(MAGIC_TOKEN_TTL_MS, 10 * 60 * 1000);
});

test("token dentro da validade vale", () => {
  assert.equal(isMagicTokenUsable("abc", inMin(9), now), true);
});

test("token vencido NÃO vale (nem no segundo exato do vencimento)", () => {
  assert.equal(isMagicTokenUsable("abc", inMin(-1), now), false);
  assert.equal(isMagicTokenUsable("abc", now, now), false);
});

test("token SEM data de validade (gerado antes desta regra) não vale: tem que gerar outro", () => {
  assert.equal(isMagicTokenUsable("abc", null, now), false);
  assert.equal(isMagicTokenUsable("abc", undefined, now), false);
});

test("sem token (já usado/apagado) não vale, mesmo com validade futura", () => {
  assert.equal(isMagicTokenUsable(null, inMin(5), now), false);
  assert.equal(isMagicTokenUsable("", inMin(5), now), false);
  assert.equal(isMagicTokenUsable(undefined, inMin(5), now), false);
});
