// Testes das regras de bingo. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCard, cardNumbers } from "../src/lib/bingoRules.ts";

const COLS = ["B", "I", "N", "G", "O"];
const RANGES = { B: [1, 15], I: [16, 30], N: [31, 45], G: [46, 60], O: [61, 75] };

// Gerador de cartela como o do sistema: 5 números distintos por coluna; centro de N é livre.
function randomCard(rand) {
  const m = {};
  for (const c of COLS) {
    const pool = Array.from({ length: 15 }, (_, i) => RANGES[c][0] + i);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    m[c] = pool.slice(0, 5);
  }
  m.N[2] = 0; // centro livre
  return m;
}
// PRNG determinístico (teste reproduzível)
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── A lógica ANTIGA do servidor, copiada literalmente, para comparar ──
function oldServerLogic(matrix, drawn) {
  const allNumbers = [...matrix.B, ...matrix.I, matrix.N[0], matrix.N[1], matrix.N[3], matrix.N[4], ...matrix.G, ...matrix.O];
  const isFullHouse = allNumbers.every((n) => drawn.includes(n));
  const hasHorizontalQuina = [0, 1, 2, 3, 4].some((row) => ["B", "I", "N", "G", "O"].every((col) => { if (col === "N" && row === 2) return true; return drawn.includes(matrix[col][row]); }));
  const hasVerticalQuina = ["B", "I", "N", "G", "O"].some((col) => [0, 1, 2, 3, 4].every((row) => { if (col === "N" && row === 2) return true; return drawn.includes(matrix[col][row]); }));
  const hasDiag1 = [matrix.B[0], matrix.I[1], matrix.G[3], matrix.O[4]].every((n) => drawn.includes(n));
  const hasDiag2 = [matrix.B[4], matrix.I[3], matrix.G[1], matrix.O[0]].every((n) => drawn.includes(n));
  return { isFullHouse, hasHorizontalQuina, hasVerticalQuina, hasDiag1, hasDiag2, hasQuina: hasHorizontalQuina || hasVerticalQuina || hasDiag1 || hasDiag2 };
}

test("a função nova dá o MESMO resultado da lógica antiga do servidor (20.000 cartelas e sorteios aleatórios)", () => {
  const rand = mulberry32(12345);
  for (let i = 0; i < 20000; i++) {
    const m = randomCard(rand);
    const all = Array.from({ length: 75 }, (_, k) => k + 1).sort(() => rand() - 0.5);
    const drawn = all.slice(0, Math.floor(rand() * 76));
    const o = oldServerLogic(m, drawn);
    const n = evaluateCard(m, drawn);
    assert.deepEqual(
      [n.isFullHouse, n.hasHorizontalQuina, n.hasVerticalQuina, n.hasDiag1, n.hasDiag2, n.hasQuina],
      [o.isFullHouse, o.hasHorizontalQuina, o.hasVerticalQuina, o.hasDiag1, o.hasDiag2, o.hasQuina]
    );
  }
});

test("quinaMissing é 0 exatamente quando há quina; fullMissing é 0 exatamente quando é cartela cheia", () => {
  const rand = mulberry32(777);
  for (let i = 0; i < 20000; i++) {
    const m = randomCard(rand);
    const drawn = Array.from({ length: 75 }, (_, k) => k + 1).sort(() => rand() - 0.5).slice(0, Math.floor(rand() * 76));
    const e = evaluateCard(m, drawn);
    assert.equal(e.quinaMissing === 0, e.hasQuina);
    assert.equal(e.fullMissing === 0, e.isFullHouse);
  }
});

test("PROVA: cartela que falta 4 ou menos para a cheia JÁ tem quina (por isso a lista antiga mostrava ganhadoras)", () => {
  const rand = mulberry32(2026);
  let checked = 0;
  for (let i = 0; i < 40000; i++) {
    const m = randomCard(rand);
    const drawn = Array.from({ length: 75 }, (_, k) => k + 1).sort(() => rand() - 0.5).slice(0, 40 + Math.floor(rand() * 36));
    const e = evaluateCard(m, drawn);
    if (e.fullMissing <= 4) { assert.equal(e.hasQuina, true); checked++; }
  }
  assert.ok(checked > 1000, `poucos casos verificados: ${checked}`);
});

test("exemplos conhecidos", () => {
  const m = { B: [1, 2, 3, 4, 5], I: [16, 17, 18, 19, 20], N: [31, 32, 0, 34, 35], G: [46, 47, 48, 49, 50], O: [61, 62, 63, 64, 65] };
  assert.equal(cardNumbers(m).length, 24);
  // linha 3 (índice 2) só tem 4 números por causa do centro livre: 3, 18, 48, 63
  const e = evaluateCard(m, [3, 18, 48, 63]);
  assert.equal(e.hasHorizontalQuina, true);
  assert.equal(e.hasQuina, true);
  assert.equal(e.quinaMissing, 0);
  assert.equal(e.fullMissing, 20);
  // diagonal principal: B0, I1, G3, O4 = 1, 17, 49, 65
  assert.equal(evaluateCard(m, [1, 17, 49, 65]).hasDiag1, true);
  // sem nada sorteado
  const z = evaluateCard(m, []);
  assert.deepEqual([z.hasQuina, z.isFullHouse, z.fullMissing, z.quinaMissing], [false, false, 24, 4]);
  // cartela cheia
  assert.equal(evaluateCard(m, cardNumbers(m)).isFullHouse, true);
});
