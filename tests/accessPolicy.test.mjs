// Testes de quem pode ver/fazer o quê (Administrador, Tesoureiro, Conselho). Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { canViewPage, canOperateTreasury, canBlockCards, canChoosePricePhase, canSeeRanking, homeFor, managementRoleLabel } from "../src/lib/accessPolicy.ts";

const PAGES = ["tesouraria", "fechamento", "extrato", "cartelas", "resultados", "patrocinadores", "auditoria", "ranking"];
const admin = { role: "ORG_ADMIN" };
const tes = { role: "STAFF", canTreasury: true };
const cons = { role: "STAFF", canAudit: true };
const vol = { role: "STAFF" };
const both = { role: "STAFF", canTreasury: true, canAudit: true };
const support = { role: "SUPER_ADMIN" };

const visible = (a) => PAGES.filter((p) => canViewPage(a, p));

test("administrador vê tudo", () => assert.deepEqual(visible(admin), PAGES));

test("tesoureiro: tesouraria, fechamento, extrato e cartelas — e NADA além disso", () => {
  assert.deepEqual(visible(tes), ["tesouraria", "fechamento", "extrato", "cartelas"]);
  for (const p of ["resultados", "patrocinadores", "auditoria", "ranking"]) assert.equal(canViewPage(tes, p), false, p);
});

test("conselho: só leitura de painel, relatórios e auditoria; NUNCA a tesouraria nem o ranking", () => {
  assert.deepEqual(visible(cons), ["fechamento", "extrato", "cartelas", "resultados", "patrocinadores", "auditoria"]);
  assert.equal(canViewPage(cons, "tesouraria"), false);
  assert.equal(canViewPage(cons, "ranking"), false);
});

test("voluntário comum (só vende/palco/fiscal) não vê nenhuma tela de gestão", () => assert.deepEqual(visible(vol), []));

test("permissões se combinam: tesoureiro + conselho vê as duas listas, mas o ranking continua só do administrador", () => {
  assert.deepEqual(visible(both), ["tesouraria", "fechamento", "extrato", "cartelas", "resultados", "patrocinadores", "auditoria"]);
});

test("suporte da plataforma lê as telas, menos o ranking", () => {
  assert.deepEqual(visible(support), PAGES.filter((p) => p !== "ranking"));
});

test("ações: só administrador e tesoureiro operam a tesouraria e bloqueiam cartela; conselho e suporte NÃO", () => {
  for (const [a, esperado] of [[admin, true], [tes, true], [both, true], [cons, false], [vol, false], [support, false]]) {
    assert.equal(canOperateTreasury(a), esperado);
    assert.equal(canBlockCards(a), esperado);
  }
});

test("só o administrador escolhe outra fase de preço no acerto (o tesoureiro usa a vigente)", () => {
  assert.equal(canChoosePricePhase(admin), true);
  for (const a of [tes, both, cons, vol, support]) assert.equal(canChoosePricePhase(a), false);
});

test("só o administrador vê o ranking", () => {
  assert.equal(canSeeRanking(admin), true);
  for (const a of [tes, both, cons, vol, support]) assert.equal(canSeeRanking(a), false);
});

test("para onde voltar e o nome do papel", () => {
  assert.equal(homeFor(tes, "ev1"), "/gestao");
  assert.equal(homeFor(admin, "ev1"), "/dashboard/ev1");
  assert.equal(managementRoleLabel(tes), "Tesoureiro");
  assert.equal(managementRoleLabel(cons), "Conselho");
  assert.equal(managementRoleLabel(both), "Tesoureiro e Conselho");
  assert.equal(managementRoleLabel(admin), "Administrador");
  assert.equal(managementRoleLabel(vol), "Voluntário");
});

test("equipe do evento: só o administrador monta a equipe (tesoureiro, conselho, voluntário e suporte NÃO)", () => {
  assert.equal(canViewPage(admin, "equipe"), true);
  for (const a of [tes, cons, both, vol, support]) assert.equal(canViewPage(a, "equipe"), false);
});
