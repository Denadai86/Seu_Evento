// Testes do modelo visual da cartela impressa. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DESIGN, THEMES, THEME_KEYS, FIELD_LIMITS, parseCardDesign, resolveColors, layoutProfile, prizeLine, whenWhere, kindCaption, titleSize,
} from "../src/lib/cardDesign.ts";

test("sem nada gravado (evento antigo), o modelo padrão é válido e completo", () => {
  for (const raw of [undefined, null, {}, [], "lixo", 42]) assert.deepEqual(parseCardDesign(raw), DEFAULT_DESIGN);
});

test("os temas escolhidos pelo cliente valem; tema desconhecido volta ao padrão (nunca quebra)", () => {
  for (const theme of THEME_KEYS) assert.equal(parseCardDesign({ theme }).theme, theme);
  assert.equal(parseCardDesign({ theme: "hacker" }).theme, DEFAULT_DESIGN.theme);
  assert.equal(parseCardDesign({ mode: "bw" }).mode, "bw");
  assert.equal(parseCardDesign({ mode: "roxo" }).mode, DEFAULT_DESIGN.mode);
});

test("data, local e causa são OPCIONAIS: vazio é válido, e o texto é limpo e limitado", () => {
  const d = parseCardDesign({ when: "  Sábado,\n 14   de junho\t19h ", place: "x".repeat(500), cause: 123 });
  assert.equal(d.when, "Sábado, 14 de junho 19h");
  assert.equal(d.place.length, FIELD_LIMITS.place);
  assert.equal(d.cause, "");
  assert.equal(parseCardDesign({}).when, "");
});

test("caracteres de controle não passam (nada de quebrar o layout ou injetar)", () => {
  assert.equal(parseCardDesign({ cause: "a\u0000b\u001Fc\u007Fd" }).cause, "a b c d");
});

test("canhoto: nome e telefone são opcionais, cada um por si", () => {
  assert.deepEqual(parseCardDesign({ stub: { enabled: true, name: true, phone: false } }).stub, { enabled: true, name: true, phone: false });
  assert.deepEqual(parseCardDesign({ stub: { enabled: true, name: false, phone: true } }).stub, { enabled: true, name: false, phone: true });
  assert.equal(parseCardDesign({ stub: { enabled: false } }).stub.enabled, false);
});

test("canhoto ligado mas SEM nenhum campo não faz sentido: desliga sozinho", () => {
  assert.equal(parseCardDesign({ stub: { enabled: true, name: false, phone: false } }).stub.enabled, false);
});

test("preto e branco ignora o tema inteiro e não usa nenhuma cor", () => {
  for (const theme of THEME_KEYS) {
    const c = resolveColors(parseCardDesign({ theme, mode: "bw" }), "QUINA");
    assert.equal(c.bw, true);
    assert.equal(c.decoration, "none");
    for (const hex of [c.bg, c.title, c.text, c.frame, c.cellBorder, c.cellFg, ...c.letters]) {
      assert.match(hex, /^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$|^#[0-9a-f]{6}$/i);
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      assert.ok(r === g && g === b, `${theme}: ${hex} não é cinza`);
    }
  }
});

test("preto e branco separa a pilha sem cor: Quina é faixa VAZADA, Cheia é faixa PRETA", () => {
  const q = resolveColors(parseCardDesign({ mode: "bw" }), "QUINA");
  const f = resolveColors(parseCardDesign({ mode: "bw" }), "FULL_HOUSE");
  assert.deepEqual([q.ribbonBg, q.ribbonFg], ["#ffffff", "#000000"]);
  assert.deepEqual([f.ribbonBg, f.ribbonFg], ["#000000", "#ffffff"]);
});

test("colorido: cada tipo tem a SUA cor (moldura e faixa), em todos os temas, para separar a pilha de longe", () => {
  for (const theme of THEME_KEYS) {
    const q = resolveColors(parseCardDesign({ theme }), "QUINA");
    const f = resolveColors(parseCardDesign({ theme }), "FULL_HOUSE");
    assert.notEqual(q.frame, f.frame, theme);
    assert.equal(q.frame, THEMES[theme].quina);
    assert.equal(f.frame, THEMES[theme].cheia);
    assert.equal(q.ribbonFg, "#ffffff");
    assert.equal(q.letters.length, 5);
  }
});

test("só a festa junina e o natal têm enfeite; os outros temas ficam limpos", () => {
  assert.equal(THEMES.junina.decoration, "bunting");
  assert.equal(THEMES.natal.decoration, "dots");
  assert.equal(THEMES.classico.decoration, "none");
  assert.equal(THEMES.simples.decoration, "none");
});

test("formatos de folha: 6 por folha é compacto (sem texto miúdo); os demais mostram tudo", () => {
  assert.deepEqual(layoutProfile("a4-6"), { scale: 0.68, compact: true });
  for (const l of ["a4-4", "a4-2", "a4-1", "a6"]) assert.equal(layoutProfile(l).compact, false, l);
  assert.equal(layoutProfile("a4-4").scale, 1);
  assert.ok(layoutProfile("a4-1").scale > layoutProfile("a4-2").scale && layoutProfile("a4-2").scale > layoutProfile("a4-4").scale);
});

test("linha de prêmios: junta as rodadas cadastradas, ignora prêmio vazio e limita o tamanho", () => {
  assert.equal(prizeLine([{ type: "QUINA", prizeName: "Cesta de café" }, { type: "FULL_HOUSE", prizeName: "R$ 500" }]), "Quina: Cesta de café · Cheia: R$ 500");
  assert.equal(prizeLine([{ type: "QUINA", prizeName: "  " }, { type: "OUTRO", prizeName: "x" }]), "");
  assert.equal(prizeLine([]), "");
  const longa = prizeLine(Array.from({ length: 4 }, () => ({ type: "QUINA", prizeName: "p".repeat(60) })), 50);
  assert.ok(longa.length <= 50 && longa.endsWith("…"));
});

test("data e local: junta só o que foi preenchido", () => {
  assert.equal(whenWhere({ when: "Sábado, 14/06", place: "Salão" }), "Sábado, 14/06 · Salão");
  assert.equal(whenWhere({ when: "Sábado, 14/06", place: "" }), "Sábado, 14/06");
  assert.equal(whenWhere({ when: "", place: "" }), "");
});

test("legenda do tipo: diz o que a cartela ganha; cartela antiga (sem tipo) vale para todas", () => {
  assert.equal(kindCaption("QUINA").label, "Cartela de Quina");
  assert.match(kindCaption("QUINA").sub, /linha, coluna ou diagonal/);
  assert.equal(kindCaption("FULL_HOUSE").label, "Cartela Cheia");
  assert.equal(kindCaption(null).sub, "Vale para todas as rodadas");
});

test("o título diminui conforme o nome do evento, para nome longo não espremer os números", () => {
  assert.equal(titleSize("Festa Junina"), 1.9);
  assert.equal(titleSize("Festa Junina da Comunidade São José"), 1.6);
  assert.equal(titleSize("Grande Bingo Beneficente da Paróquia Nossa Senhora Aparecida 2026"), 1.35);
  assert.ok(titleSize("a".repeat(30)) > titleSize("a".repeat(31)) && titleSize("a".repeat(48)) > titleSize("a".repeat(49)));
});
