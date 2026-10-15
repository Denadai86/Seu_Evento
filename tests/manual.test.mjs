// Testes do manual dentro do sistema: busca, visibilidade por papel e coerência do conteúdo. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { TOPICS, CATEGORIES, ICON_KEYS, getTopic } from "../src/lib/manual/content.ts";
import { searchTopics, normalizeText, queryTokens } from "../src/lib/manual/search.ts";
import { MANUAL_ROLES, rolesFromFlags, topicVisibleTo, visibleTopics, isManualRole } from "../src/lib/manual/roles.ts";

const ids = (list) => list.map((t) => t.id);

// ── COERÊNCIA DO CONTEÚDO (se alguém escrever um assunto torto, o teste acusa) ──
test("ids únicos, categoria e ícone válidos, papéis existentes", () => {
  const seen = new Set();
  const cats = new Set(CATEGORIES.map((c) => c.id));
  for (const t of TOPICS) {
    assert.ok(/^[a-z0-9-]+$/.test(t.id), `id inválido: ${t.id}`);
    assert.ok(!seen.has(t.id), `id repetido: ${t.id}`);
    seen.add(t.id);
    assert.ok(cats.has(t.category), `${t.id}: categoria inexistente (${t.category})`);
    assert.ok(ICON_KEYS.includes(t.icon), `${t.id}: ícone inválido (${t.icon})`);
    if (t.roles !== "todos") {
      assert.ok(t.roles.length > 0, `${t.id}: sem papéis`);
      for (const r of t.roles) assert.ok(MANUAL_ROLES.includes(r), `${t.id}: papel inexistente (${r})`);
    }
  }
});

test("todo assunto tem título, resumo, palavras-chave e pelo menos 3 passos curtos", () => {
  for (const t of TOPICS) {
    assert.ok(t.title.length >= 5, t.id);
    assert.ok(t.summary.length >= 20, `${t.id}: resumo curto demais`);
    assert.ok(t.keywords.length >= 4, `${t.id}: poucas palavras-chave`);
    assert.ok(t.steps.length >= 3, `${t.id}: poucos passos`);
    for (const s of t.steps) assert.ok(s.length <= 260, `${t.id}: passo longo demais: ${s.slice(0, 40)}…`);
  }
});

test("os assuntos relacionados existem e não apontam para si mesmos", () => {
  for (const t of TOPICS) for (const r of t.related ?? []) {
    assert.ok(getTopic(r), `${t.id}: relacionado inexistente (${r})`);
    assert.notEqual(r, t.id, `${t.id}: relaciona consigo mesmo`);
  }
});

test("toda categoria tem assunto, e todo papel tem pelo menos um assunto para ler", () => {
  for (const c of CATEGORIES) assert.ok(TOPICS.some((t) => t.category === c.id), `categoria vazia: ${c.id}`);
  for (const r of MANUAL_ROLES) assert.ok(TOPICS.some((t) => topicVisibleTo(t, [r])), `papel sem conteúdo: ${r}`);
});

test("todo papel de voluntário tem pelo menos um assunto em destaque (a tela 'Comece por aqui' nunca fica vazia)", () => {
  for (const r of MANUAL_ROLES) assert.ok(TOPICS.some((t) => t.featured && topicVisibleTo(t, [r])), `sem destaque: ${r}`);
});

// ── BUSCA ──
test("normaliza acento, maiúscula e pontuação", () => {
  assert.equal(normalizeText("  Conferência, do BINGO!! "), "conferencia do bingo");
  assert.deepEqual(queryTokens("Como eu faço para desfazer?"), ["desfazer"]);
});

test("acha pelo que a pessoa digitaria (palavras do dia a dia)", () => {
  const first = (q) => searchTopics(TOPICS, q)[0]?.id;
  assert.equal(first("desfazer venda"), "pdv-desfazer");
  assert.equal(first("perdi uma cartela"), "cartela-bloquear");
  assert.equal(first("esqueci o pin"), "acesso-entrar");
  assert.equal(first("receber acerto"), "tesouraria-receber");
  assert.equal(first("soltar telão"), "palco-sorteio");
  assert.equal(first("cartela nao paga"), "problema-nao-paga");
});

test("ignora acento e maiúscula: 'conferencia' acha 'Conferir um bingo'", () => {
  assert.ok(ids(searchTopics(TOPICS, "CONFERENCIA")).includes("fiscal-conferir"));
  assert.ok(ids(searchTopics(TOPICS, "câmera")).includes("pdv-vender"));
});

test("tolera um erro de digitação em palavras maiores ('desfaser', 'auditora')", () => {
  assert.equal(searchTopics(TOPICS, "desfaser")[0]?.id, "pdv-desfazer");
  assert.ok(ids(searchTopics(TOPICS, "auditora")).includes("conselho-auditoria"));
});

test("várias palavras: exige todas; se nada casar com todas, aceita alguma", () => {
  assert.deepEqual(ids(searchTopics(TOPICS, "desfazer venda")).slice(0, 1), ["pdv-desfazer"]);
  const or = ids(searchTopics(TOPICS, "desfazer entregar"));
  assert.ok(or.includes("pdv-desfazer") && or.includes("tesouraria-entregar"));
});

test("busca vazia ou sem sentido não devolve nada", () => {
  assert.deepEqual(searchTopics(TOPICS, ""), []);
  assert.deepEqual(searchTopics(TOPICS, "   "), []);
  assert.deepEqual(searchTopics(TOPICS, "como eu"), []); // só palavras vazias
  assert.deepEqual(searchTopics(TOPICS, "xyzkw"), []);
});

// ── VISIBILIDADE POR PAPEL ──
test("rolesFromFlags: junta as permissões de todos os eventos da pessoa", () => {
  assert.deepEqual(rolesFromFlags([]), []);
  assert.deepEqual(rolesFromFlags([{ canSell: true }]), ["vendedor"]);
  assert.deepEqual(rolesFromFlags([{ canSell: true }, { canTreasury: true, canAudit: true }]), ["vendedor", "tesoureiro", "conselho"]);
  assert.deepEqual(rolesFromFlags([{ canSell: false, canOperate: null }]), []);
});

test("voluntário vendedor vê os assuntos dele e os de todos, e NADA de tesouraria/conselho/admin", () => {
  const seen = ids(visibleTopics(TOPICS, { roles: ["vendedor"], isAdmin: false }));
  assert.ok(seen.includes("pdv-vender") && seen.includes("acesso-entrar") && seen.includes("problema-nao-paga"));
  for (const hidden of ["tesouraria-entregar", "conselho-auditoria", "evento-preparar", "palco-sorteio"]) assert.ok(!seen.includes(hidden), hidden);
});

test("conselho vê auditoria e os assuntos para todos, mas não os de venda", () => {
  const seen = ids(visibleTopics(TOPICS, { roles: ["conselho"], isAdmin: false }));
  assert.ok(seen.includes("conselho-auditoria") && seen.includes("acesso-entrar"));
  assert.ok(!seen.includes("pdv-vender") && !seen.includes("tesouraria-receber"));
});

test("quem não tem papel nenhum só vê o que é para todos", () => {
  const seen = visibleTopics(TOPICS, { roles: [], isAdmin: false });
  assert.ok(seen.length > 0 && seen.every((t) => t.roles === "todos"));
});

test("administrador vê tudo; 'ver como' mostra exatamente o que aquele papel veria", () => {
  assert.equal(visibleTopics(TOPICS, { roles: [], isAdmin: true }).length, TOPICS.length);
  const asVendedor = ids(visibleTopics(TOPICS, { roles: [], isAdmin: true, viewAs: "vendedor" }));
  const realVendedor = ids(visibleTopics(TOPICS, { roles: ["vendedor"], isAdmin: false }));
  assert.deepEqual(asVendedor, realVendedor);
});

test("a busca respeita a visibilidade: voluntário não 'acha' assunto que não é dele", () => {
  const visible = visibleTopics(TOPICS, { roles: ["vendedor"], isAdmin: false });
  assert.ok(!ids(searchTopics(visible, "auditoria")).includes("conselho-auditoria"));
  assert.ok(ids(searchTopics(TOPICS, "auditoria")).includes("conselho-auditoria"));
});

test("isManualRole valida o que vem da URL (?como=…)", () => {
  assert.equal(isManualRole("vendedor"), true);
  assert.equal(isManualRole("hacker"), false);
  assert.equal(isManualRole(undefined), false);
});
