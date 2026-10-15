// Testes de leitura de QR, ranking e bloqueio de cartela. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { extractCardCode } from "../src/lib/qrCode.ts";
import { buildRanking } from "../src/lib/ranking.ts";
import { cardStatus, summarizeInventory } from "../src/lib/cardInventory.ts";
import { buildStock, pendingByStaff } from "../src/lib/dashboardData.ts";

test("QR da cartela: extrai o código da URL de verificação", () => {
  assert.equal(extractCardCode("https://sjose.acaoleve.dev.br/verify?event=cmv4abc&id=cmcpkw"), "CMCPKW");
  assert.equal(extractCardCode("http://sjose.localhost:3000/verify?event=x&id=LFG9KI"), "LFG9KI");
});

test("QR da cartela: aceita o código puro e rejeita lixo", () => {
  assert.equal(extractCardCode("  a1b2c3 "), "A1B2C3");
  assert.equal(extractCardCode(""), null);
  assert.equal(extractCardCode("https://exemplo.com/sem-id"), null);
  assert.equal(extractCardCode("isto não é um código!"), null);
  assert.equal(extractCardCode("AB"), null); // curto demais
  assert.equal(extractCardCode("https://x.com/verify?id=<script>"), null);
});

const row = (id, name, qtd, total) => ({ id, name, qtd, total });

test("ranking por valor, com desempate pela quantidade", () => {
  const r = buildRanking([row("a", "Ana", 10, 10000), row("b", "Bia", 8, 12000), row("c", "Caio", 12, 10000)], "valor");
  assert.deepEqual(r.map((x) => [x.name, x.position]), [["Bia", 1], ["Caio", 2], ["Ana", 3]]);
});

test("ranking por quantidade, com desempate pelo valor", () => {
  const r = buildRanking([row("a", "Ana", 10, 10000), row("b", "Bia", 10, 12000), row("c", "Caio", 5, 99999)], "qtd");
  assert.deepEqual(r.map((x) => x.name), ["Bia", "Ana", "Caio"]);
});

test("empate total divide a posição (1º, 1º, 3º) e ordena por nome", () => {
  const r = buildRanking([row("a", "Zé", 5, 5000), row("b", "Ana", 5, 5000), row("c", "Lia", 2, 2000)], "valor");
  assert.deepEqual(r.map((x) => [x.name, x.position]), [["Ana", 1], ["Zé", 1], ["Lia", 3]]);
});

test("ranking ignora 'sem vendedor' e quem não vendeu nada", () => {
  const r = buildRanking([row("sem-vendedor", "Sem vendedor atribuído", 9, 99999), row("a", "Ana", 0, 0), row("b", "Bia", 1, 1000)], "valor");
  assert.deepEqual(r.map((x) => x.name), ["Bia"]);
});

test("cartela bloqueada: situação própria, vale mesmo se já estava paga", () => {
  assert.equal(cardStatus({ isPaid: false, eventStaffId: null, blocked: true }), "BLOQUEADA");
  assert.equal(cardStatus({ isPaid: true, eventStaffId: "m", blocked: true }), "BLOQUEADA");
  assert.equal(cardStatus({ isPaid: true, eventStaffId: "m", blocked: false }), "VENDIDA");
});

test("inventário com bloqueadas: os totais continuam fechando", () => {
  const cards = [
    { shortId: "A1", type: "QUINA", isPaid: false, eventStaffId: null },
    { shortId: "A2", type: "QUINA", isPaid: false, eventStaffId: "m", blocked: true },
    { shortId: "A3", type: "QUINA", isPaid: true, eventStaffId: "m" },
    { shortId: "A4", type: "FULL_HOUSE", isPaid: false, eventStaffId: "m" },
  ];
  const s = summarizeInventory(cards);
  assert.deepEqual([s.total, s.livre, s.comVoluntario, s.vendida, s.bloqueada], [4, 1, 1, 1, 1]);
  assert.equal(s.livre + s.comVoluntario + s.vendida + s.bloqueada, s.total);
});

test("estoque do painel: bloqueada não conta como livre, com voluntário nem paga", () => {
  const cards = [
    { isPaid: false, price: null, eventStaffId: null },
    { isPaid: false, price: null, eventStaffId: "A", blocked: true },
    { isPaid: false, price: null, eventStaffId: "A" },
    { isPaid: true, price: 1000, eventStaffId: "A" },
  ];
  const s = buildStock(cards);
  assert.deepEqual(s, { total: 4, free: 1, withVolunteers: 1, paid: 1, blocked: 1 });
  assert.equal(s.free + s.withVolunteers + s.paid + s.blocked, s.total);
  assert.equal(pendingByStaff(cards).get("A"), 1); // a bloqueada não está "na mão" de ninguém
});
