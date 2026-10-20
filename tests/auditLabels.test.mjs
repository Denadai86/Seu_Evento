// Testes do catálogo do log de auditoria. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS, CATEGORY_LABEL, actionsOfCategory, describeAudit } from "../src/lib/auditLabels.ts";

const who = (id) => ({ s1: "Maria", s2: "João" }[id] ?? "voluntário");

test("todas as ações têm nome, categoria válida e frase própria (não cai no código cru)", () => {
  for (const [action, meta] of Object.entries(AUDIT_ACTIONS)) {
    assert.ok(meta.label.length > 0, action);
    assert.ok(Object.keys(CATEGORY_LABEL).includes(meta.category), action);
    assert.notEqual(describeAudit(action, {}, who), action, `${action} sem descrição`);
  }
});

test("pagamento: mostra voluntário, quantidade, valor e preço aplicado", () => {
  const t = describeAudit("PAYMENT_REGISTERED", { staffId: "s1", count: 38, amount: 38000, tier: "Pré-venda", mode: "all" }, who);
  assert.match(t, /Maria/);
  assert.match(t, /38 cartelas/);
  assert.match(t, /R\$\s?380,00/);
  assert.match(t, /Pré-venda/);
  assert.match(t, /tudo o que estava com o voluntário/);
});

test("venda desfeita lista os códigos e o valor", () => {
  const t = describeAudit("SALE_UNDONE", { staffId: "s2", codes: ["AB12CD", "XY98ZT"], total: 2000 }, who);
  assert.match(t, /João/);
  assert.match(t, /2 cartelas/);
  assert.match(t, /AB12CD, XY98ZT/);
  assert.match(t, /R\$\s?20,00/);
});

test("singular e plural: 1 cartela / 2 cartelas", () => {
  assert.match(describeAudit("CARDS_RETURNED", { staffId: "s1", count: 1 }, who), /1 cartela de Maria/);
  assert.match(describeAudit("CARDS_RETURNED", { staffId: "s1", count: 2 }, who), /2 cartelas de Maria/);
});

test("entrega por quantidade mostra a faixa de códigos", () => {
  const t = describeAudit("CARDS_ASSIGNED", { staffId: "s1", count: 50, first: "A00001", last: "A00050", mode: "quantity" }, who);
  assert.match(t, /50 cartelas a Maria \(de A00001 até A00050\)/);
});

test("bingo solto no telão NÃO mostra o nome do fiscal no ganhador", () => {
  const t = describeAudit("BINGO_RELEASED", { card: "CMCPKW", winnerName: "ze (Fiscal: jao)" }, who);
  assert.match(t, /CMCPKW/);
  assert.match(t, /"ze"/);
  assert.doesNotMatch(t, /Fiscal: jao/);
});

test("bloqueio informa motivo e se já estava vendida", () => {
  const t = describeAudit("CARD_BLOCKED", { shortId: "LFG9KI", reason: "perdida", wasPaid: true }, who);
  assert.match(t, /LFG9KI/); assert.match(t, /perdida/); assert.match(t, /já estava vendida/);
});

test("categorias: dinheiro agrupa pagamento e venda desfeita; ações sensíveis estão marcadas", () => {
  const dinheiro = actionsOfCategory("DINHEIRO");
  assert.ok(dinheiro.includes("PAYMENT_REGISTERED") && dinheiro.includes("SALE_UNDONE"));
  assert.ok(!dinheiro.includes("CARD_BLOCKED"));
  for (const a of ["SALE_UNDONE", "CARD_BLOCKED", "GAME_RESET", "EVENT_CLOSED", "BINGO_FALSE_ALARM"]) assert.equal(AUDIT_ACTIONS[a].sensitive, true, a);
  assert.ok(!AUDIT_ACTIONS.PAYMENT_REGISTERED.sensitive);
});

test("dados ausentes não quebram a frase", () => {
  assert.doesNotThrow(() => describeAudit("PAYMENT_REGISTERED", null, who));
  assert.doesNotThrow(() => describeAudit("ACAO_NOVA_QUE_NAO_EXISTE", undefined, who));
  assert.equal(describeAudit("ACAO_NOVA_QUE_NAO_EXISTE", undefined, who), "ACAO_NOVA_QUE_NAO_EXISTE");
});

// ── Auditoria explícita (papéis, acerto com fase, PIN, preço antes/depois) ──
import { isSensitiveEntry, PERMISSION_LABEL } from "../src/lib/auditLabels.ts";

test("acerto mostra o desdobramento da conta e a fase aplicada", () => {
  const t = describeAudit("PAYMENT_REGISTERED", { staffId: "s1", count: 5, amount: 6500, breakdown: [{ price: 1000, qty: 3 }, { price: 1500, qty: 2 }], tier: "Pré-venda", mode: "codes" }, who);
  assert.match(t, /\[3 × R\$\s?10,00 \+ 2 × R\$\s?15,00\]/);
  assert.match(t, /\(fase: Pré-venda\)/);
  assert.doesNotMatch(t, /ATENÇÃO/);
});

test("acerto com fase diferente da vigente (só administrador) vira ALERTA e fica em destaque", () => {
  const md = { staffId: "s1", count: 2, amount: 2000, tier: "Pré-venda", vigente: "No evento", overridden: true };
  const t = describeAudit("PAYMENT_REGISTERED", md, who);
  assert.match(t, /ATENÇÃO/);
  assert.match(t, /Pré-venda/);
  assert.match(t, /a vigente era "No evento"/);
  assert.equal(isSensitiveEntry("PAYMENT_REGISTERED", md), true);
  assert.equal(isSensitiveEntry("PAYMENT_REGISTERED", { staffId: "s1", overridden: false }), false);
});

test("permissões: escalar, ganhar/perder papel e retirar da equipe", () => {
  const base = { targetName: "Maria", targetUsername: "MARIA1234", assigned: true };
  const none = { canSell: true, canOperate: false, canVerify: false, canTreasury: false, canAudit: false };
  const first = describeAudit("STAFF_PERMISSIONS_CHANGED", { ...base, before: null, after: { ...none, canTreasury: true } }, who);
  assert.match(first, /Escalou Maria \(MARIA1234\) no evento com: Vender \(PDV\), Tesouraria/);

  const changed = describeAudit("STAFF_PERMISSIONS_CHANGED", { ...base, before: { ...none, canTreasury: true }, after: { ...none, canAudit: true } }, who);
  assert.match(changed, /passou a ter Conselho/);
  assert.match(changed, /deixou de ter Tesouraria/);

  assert.match(describeAudit("STAFF_PERMISSIONS_CHANGED", { ...base, assigned: false }, who), /Retirou Maria \(MARIA1234\) da equipe do evento/);
  assert.equal(PERMISSION_LABEL.canTreasury, "Tesouraria");
  assert.equal(PERMISSION_LABEL.canAudit, "Conselho");
});

test("mudança de permissão e PIN redefinido são ações sensíveis, na categoria Equipe", () => {
  for (const a of ["STAFF_PERMISSIONS_CHANGED", "PIN_RESET"]) {
    assert.equal(AUDIT_ACTIONS[a].sensitive, true, a);
    assert.equal(AUDIT_ACTIONS[a].category, "EQUIPE", a);
  }
  assert.ok(actionsOfCategory("EQUIPE").includes("PIN_RESET"));
  assert.match(describeAudit("PIN_RESET", { targetName: "João", targetUsername: "JOAO9999" }, who), /Redefiniu o PIN de João \(JOAO9999\)/);
});

test("desbloqueio mostra a justificativa; preço mostra de quanto para quanto", () => {
  assert.match(describeAudit("CARD_UNBLOCKED", { shortId: "LFG9KI", reason: "achada no salão" }, who), /justificativa "achada no salão"/);
  const t = describeAudit("TICKET_PRICE_CHANGED", { kind: "QUINA", from: 1000, price: 1500 }, who);
  assert.match(t, /de R\$\s?10,00 para R\$\s?15,00/);
});

test("fase apagada guarda os valores dela no registro", () => {
  const t = describeAudit("PRICE_TIER_DELETED", { name: "Pré-venda", quinaPrice: 1000, fullHousePrice: 1500 }, who);
  assert.match(t, /Pré-venda/); assert.match(t, /quina R\$\s?10,00/); assert.match(t, /cheia R\$\s?15,00/);
});

// ── "Regularizar agora": conferência de cartela não paga e pagamento depois dela ──
test("conferência de cartela não paga mostra com quem estava (ou que estava sem voluntário)", () => {
  assert.match(describeAudit("UNPAID_CARD_CHECKED", { card: "AB12CD", holderStaffId: "s1" }, who), /cartela AB12CD: ainda não estava paga \(estava com Maria\)/);
  assert.match(describeAudit("UNPAID_CARD_CHECKED", { card: "AB12CD", holderStaffId: null }, who), /sem voluntário/);
});

test("pagamento DEPOIS da conferência é ação sensível, descrita por onde entrou", () => {
  assert.equal(AUDIT_ACTIONS.PAID_AFTER_BINGO_CHECK.sensitive, true);
  assert.equal(AUDIT_ACTIONS.PAID_AFTER_BINGO_CHECK.category, "DINHEIRO");
  const pdv = describeAudit("PAID_AFTER_BINGO_CHECK", { cards: ["AB12CD"], via: "PDV", staffId: "s2" }, who);
  assert.match(pdv, /1 cartela \(AB12CD\)/); assert.match(pdv, /NÃO PAGAS/); assert.match(pdv, /venda no PDV \(João\)/);
  assert.match(describeAudit("PAID_AFTER_BINGO_CHECK", { cards: ["A1", "B2"], via: "ACERTO" }, who), /2 cartelas \(A1, B2\).*acerto na tesouraria/);
});

// ── Venda no PDV agora entra no log (antes só o "desfazer" aparecia) ──
test("venda no PDV: quem vendeu, quais cartelas, quanto e como", () => {
  const t = describeAudit("SALE_COMPLETED", { staffId: "s1", codes: ["AB12CD", "XY98ZT"], total: 2500, method: "PIX" }, who);
  assert.match(t, /Vendeu 2 cartelas \(AB12CD, XY98ZT\)/);
  assert.match(t, /R\$\s?25,00/); assert.match(t, /no PIX \(Maria\)/);
  assert.match(describeAudit("SALE_COMPLETED", { staffId: "s2", codes: ["A1"], total: 1000, method: "CASH" }, who), /1 cartela \(A1\).*no dinheiro \(João\)/);
  assert.equal(AUDIT_ACTIONS.SALE_COMPLETED.category, "DINHEIRO");
});

// ── Fila de avisos de bingo: ganhadores simultâneos ──
test("bingo solto: ganhador único, com quem cedeu", () => {
  const t = describeAudit("BINGO_RELEASED", { mode: "UNICO", winners: [{ card: "AB12CD", name: "Maria" }], yielded: [{ name: "José" }] }, who);
  assert.match(t, /Maria \(cartela AB12CD\)/); assert.match(t, /ganhador único/); assert.match(t, /cederam: José/);
});

test("bingo solto: prêmio DIVIDIDO mostra todos os ganhadores", () => {
  const t = describeAudit("BINGO_RELEASED", { mode: "DIVIDIDO", winners: [{ card: "A1", name: "Maria" }, { card: "B2", name: "José" }], yielded: [] }, who);
  assert.match(t, /Maria \(cartela A1\) e José \(cartela B2\)/); assert.match(t, /prêmio DIVIDIDO/); assert.doesNotMatch(t, /cederam/);
});

test("registros antigos de bingo solto (antes da fila) continuam legíveis", () => {
  assert.match(describeAudit("BINGO_RELEASED", { card: "CMCPKW", winnerName: "ze (Fiscal: jao)" }, who), /cartela CMCPKW, ganhador "ze"/);
});

test("descartar aviso e reabrir decisão são ações sensíveis e descritas", () => {
  assert.equal(AUDIT_ACTIONS.BINGO_CLAIM_DISCARDED.sensitive, true);
  assert.equal(AUDIT_ACTIONS.BINGO_DECISION_REOPENED.sensitive, true);
  assert.match(describeAudit("BINGO_CLAIM_DISCARDED", { card: "AB12CD", name: "Maria" }, who), /Descartou o aviso de bingo da cartela AB12CD \(Maria\)/);
  assert.match(describeAudit("BINGO_DECISION_REOPENED", {}, who), /Reabriu a decisão do bingo/);
});

test("aviso de bingo mostra em qual pedra a cartela fechou", () => {
  assert.match(describeAudit("BINGO_ALERT", { card: "AB12CD", winnerName: "Maria", fiscal: "Paulo", closedAtDraw: 41 }, who), /fechou na pedra 41/);
});
