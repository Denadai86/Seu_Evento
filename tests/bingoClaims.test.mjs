// Testes da fila de avisos de bingo (ganhadores simultâneos). Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { closingDrawIndex, evaluateCard } from "../src/lib/bingoRules.ts";
import { orderClaims, summarizeQueue, joinNames, validateSelection } from "../src/lib/bingoClaims.ts";

// Cartela de exemplo (o centro do N é livre). Linha 0: 1, 16, 31, 46, 61
const M = { B: [1, 2, 3, 4, 5], I: [16, 17, 18, 19, 20], N: [31, 32, 0, 34, 35], G: [46, 47, 48, 49, 50], O: [61, 62, 63, 64, 65] };
const ALL = [...M.B, ...M.I, 31, 32, 34, 35, ...M.G, ...M.O];

test("fechou a quina em QUAL pedra: conta pela ordem do sorteio", () => {
  // a linha 0 (1, 16, 31, 46, 61) só completa quando o 61 sai, na 7ª pedra
  assert.equal(closingDrawIndex(M, [10, 1, 16, 31, 46, 70, 61], "QUINA"), 7);
  // mesma linha, mas as pedras saíram em outra ordem: fecha mais cedo
  assert.equal(closingDrawIndex(M, [61, 46, 31, 16, 1], "QUINA"), 5);
});

test("ainda não fechou: devolve null (e a pedra seguinte não 'volta' no tempo)", () => {
  assert.equal(closingDrawIndex(M, [1, 16, 31, 46], "QUINA"), null);
  assert.equal(closingDrawIndex(M, [], "QUINA"), null);
});

test("quina não é cartela cheia: cada alvo tem a sua pedra", () => {
  const drawn = [...ALL.slice().reverse()]; // todos os 24 números, em ordem qualquer
  const quina = closingDrawIndex(M, drawn, "QUINA");
  const cheia = closingDrawIndex(M, drawn, "FULL_HOUSE");
  assert.ok(quina !== null && cheia !== null);
  assert.ok(quina <= cheia, "a quina sempre fecha antes (ou junto) da cartela cheia");
  assert.equal(cheia, 24, "com 24 números só pode fechar na última pedra");
});

test("consistência com o avaliador do servidor: na pedra apontada JÁ tem bingo, na anterior AINDA não", () => {
  const drawn = [7, 1, 70, 16, 31, 2, 46, 61, 9];
  const k = closingDrawIndex(M, drawn, "QUINA");
  assert.equal(evaluateCard(M, drawn.slice(0, k)).hasQuina, true);
  assert.equal(evaluateCard(M, drawn.slice(0, k - 1)).hasQuina, false);
});

const at = (s) => new Date(`2026-10-19T20:00:${s}Z`);
const claim = (id, closedAtDraw, sec) => ({ id, closedAtDraw, createdAt: at(sec) });

test("a fila sugere quem fechou primeiro; empata pela hora do aviso; sem a pedra vai para o fim", () => {
  const ordered = orderClaims([claim("c", null, "01"), claim("b", 43, "02"), claim("a", 41, "09"), claim("d", 41, "05")]);
  assert.deepEqual(ordered.map((c) => c.id), ["d", "a", "b", "c"]);
});

test("EMPATE DE VERDADE: só quando duas cartelas fecharam na MESMA pedra, e foi a primeira", () => {
  const tie = summarizeQueue([claim("a", 41, "01"), claim("b", 41, "02"), claim("c", 43, "03")]);
  assert.equal(tie.isRealTie, true);
  assert.deepEqual(tie.tiedIds.sort(), ["a", "b"]);
  assert.equal(tie.firstDraw, 41);

  const notTie = summarizeQueue([claim("a", 41, "01"), claim("b", 43, "02")]);
  assert.equal(notTie.isRealTie, false);
  assert.equal(notTie.suggestedId, "a");

  // duas cartelas iguais, mas que NÃO foram as primeiras, não são empate
  assert.equal(summarizeQueue([claim("a", 40, "01"), claim("b", 43, "02"), claim("c", 43, "03")]).isRealTie, false);
});

test("fila vazia e aviso único não inventam empate", () => {
  assert.deepEqual(summarizeQueue([]), { total: 0, firstDraw: null, isRealTie: false, tiedIds: [], suggestedId: null });
  assert.equal(summarizeQueue([claim("a", 41, "01")]).isRealTie, false);
});

test("nomes no telão: 1, 2, 3 e mais", () => {
  assert.equal(joinNames(["Maria"]), "Maria");
  assert.equal(joinNames(["Maria", "José"]), "Maria e José");
  assert.equal(joinNames(["Maria", "José", "Ana"]), "Maria, José e Ana");
  assert.equal(joinNames(["A", "B", "C", "D"]), "A, B, C e D");
  assert.equal(joinNames(["  Maria ", "", "José"]), "Maria e José");
  assert.equal(joinNames([]), "");
});

test("decisão do locutor: um ganhador (os outros cedem) ou prêmio dividido", () => {
  const unico = validateSelection(["a", "b", "c"], ["b"]);
  assert.deepEqual(unico, { ok: true, mode: "UNICO", chosen: ["b"], yielded: ["a", "c"] });

  const dividido = validateSelection(["a", "b", "c"], ["a", "c"]);
  assert.deepEqual(dividido, { ok: true, mode: "DIVIDIDO", chosen: ["a", "c"], yielded: ["b"] });

  assert.deepEqual(validateSelection(["a"], ["a"]), { ok: true, mode: "UNICO", chosen: ["a"], yielded: [] });
});

test("decisão inválida: ninguém escolhido, aviso que saiu da fila, ou repetido", () => {
  assert.equal(validateSelection(["a", "b"], []).ok, false);
  assert.equal(validateSelection(["a", "b"], ["z"]).ok, false);
  assert.equal(validateSelection(["a", "b"], ["a", "z"]).ok, false);
  const dup = validateSelection(["a", "b"], ["a", "a"]);
  assert.deepEqual(dup, { ok: true, mode: "UNICO", chosen: ["a"], yielded: ["b"] });
});
