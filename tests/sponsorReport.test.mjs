// Testes do relatório de exposição de patrocinadores (função pura, sem banco).  Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { buildSponsorReport, formatDuration, SCREEN_CAP_SECONDS } from "../src/lib/sponsorReport.ts";

const T0 = new Date("2026-10-10T20:00:00Z").getTime();
const at = (sec) => new Date(T0 + sec * 1000);
const sponsors = [
  { id: "A", name: "Padaria A", logoUrl: null, contribution: 50000 },
  { id: "B", name: "Banco B", logoUrl: "http://x/b.png", contribution: 30000 },
  { id: "C", name: "Casa C", logoUrl: null, contribution: 0 },
];
// 7 pedras: A B C A B C (a cada 20 s) e depois uma pausa de 5 min até a 7ª (A).
const ex = (sponsorId, sponsorName, sec) => ({ sponsorId, sponsorName, createdAt: at(sec) });
const exposures = [
  ex("A", "Padaria A", 0), ex("B", "Banco B", 20), ex("C", "Casa C", 40),
  ex("A", "Padaria A", 60), ex("B", "Banco B", 80), ex("C", "Casa C", 100), ex("A", "Padaria A", 400),
];

test("conta pedras, participação e ordena por exposição", () => {
  const r = buildSponsorReport({ exposures, prizes: [], sponsors });
  assert.equal(r.totalBalls, 7);
  assert.deepEqual(r.rows.map((x) => [x.name, x.balls]), [["Padaria A", 3], ["Banco B", 2], ["Casa C", 2]]);
  assert.equal(Math.round(r.rows[0].sharePct), 43);
  assert.equal(r.spanSeconds, 400);
});

test("tempo em tela: intervalo até a próxima pedra, com teto por pedra (pausa longa não infla)", () => {
  const r = buildSponsorReport({ exposures, prizes: [], sponsors });
  const by = Object.fromEntries(r.rows.map((x) => [x.id, x.screenSeconds]));
  assert.equal(by.A, 20 + 20 + SCREEN_CAP_SECONDS); // 3ª pedra de A é a última → teto
  assert.equal(by.B, 40);
  assert.equal(by.C, 20 + SCREEN_CAP_SECONDS); // pausa de 300 s limitada ao teto
});

test("aceita registros fora de ordem", () => {
  const shuffled = [...exposures].reverse();
  const r = buildSponsorReport({ exposures: shuffled, prizes: [], sponsors });
  assert.equal(r.rows.find((x) => x.id === "A").screenSeconds, 160);
});

test("prêmios: conta os do patrocinador e os já entregues; ignora prêmio sem patrocinador", () => {
  const prizes = [
    { sponsorId: "A", prizeName: "Cesta", isCompleted: true },
    { sponsorId: "A", prizeName: "Pão por 1 mês", isCompleted: false },
    { sponsorId: "B", prizeName: "Vale R$ 100", isCompleted: false },
    { sponsorId: null, prizeName: "Prêmio da casa", isCompleted: true },
  ];
  const r = buildSponsorReport({ exposures, prizes, sponsors });
  const a = r.rows.find((x) => x.id === "A");
  assert.deepEqual([a.prizes.length, a.prizesDelivered], [2, 1]);
  assert.equal(r.rows.find((x) => x.id === "B").prizes.length, 1);
  assert.equal(r.rows.find((x) => x.id === "C").prizes.length, 0);
});

test("patrocinador apagado depois do evento continua no relatório (com o nome gravado)", () => {
  const withRemoved = [...exposures, ex(null, "Loja D", 420)];
  const r = buildSponsorReport({ exposures: withRemoved, prizes: [], sponsors });
  const d = r.rows.find((x) => x.name === "Loja D");
  assert.equal(d.removed, true);
  assert.equal(d.balls, 1);
});

test("patrocinador sem nenhuma pedra aparece com zero (não some do relatório)", () => {
  const r = buildSponsorReport({ exposures: exposures.filter((e) => e.sponsorId !== "C"), prizes: [], sponsors });
  const c = r.rows.find((x) => x.id === "C");
  assert.deepEqual([c.balls, c.sharePct, c.screenSeconds], [0, 0, 0]);
});

test("evento sem registro: tudo zerado, sem dividir por zero", () => {
  const r = buildSponsorReport({ exposures: [], prizes: [], sponsors });
  assert.equal(r.totalBalls, 0);
  assert.equal(r.spanSeconds, 0);
  assert.equal(r.firstAt, null);
  assert.ok(r.rows.every((x) => x.sharePct === 0));
});

test("formatDuration", () => {
  assert.equal(formatDuration(0), "0 s");
  assert.equal(formatDuration(59), "59 s");
  assert.equal(formatDuration(125), "2 min 5 s");
  assert.equal(formatDuration(3725), "1 h 2 min");
});
