// Testes do domínio principal e do endereço do QR. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRootDomain } from "../src/config/site.ts";
import { buildVerifyUrl } from "../src/lib/verifyUrl.ts";
import { isTenantHost, robotsPolicy } from "../src/lib/seo.ts";

test("o domínio vira sempre 'acaoleve.dev.br', venha como vier da variável de ambiente", () => {
  for (const raw of ["acaoleve.dev.br", "https://acaoleve.dev.br", "https://acaoleve.dev.br/", "http://acaoleve.dev.br", "  ACAOLEVE.dev.br  ", "https://acaoleve.dev.br/qualquer/coisa"]) {
    assert.equal(normalizeRootDomain(raw), "acaoleve.dev.br", raw);
  }
});

test("variável vazia ou ausente usa o domínio padrão", () => {
  for (const raw of [undefined, null, "", "   ", "https://"]) assert.equal(normalizeRootDomain(raw), "acaoleve.dev.br");
  assert.equal(normalizeRootDomain("", "meu.dominio.com"), "meu.dominio.com");
});

test("REGRESSÃO do que aconteceu em produção: com 'https://' na variável, o sitemap NÃO vira 'https://https://…'", () => {
  const root = normalizeRootDomain("https://acaoleve.dev.br");
  const url = `https://${root}`;
  assert.equal(url, "https://acaoleve.dev.br");
  assert.equal(new URL(url).host, "acaoleve.dev.br");
  assert.equal((`${url}/sitemap.xml`.match(/https:\/\//g) || []).length, 1);
});

test("REGRESSÃO: com 'https://' na variável o robots.txt AINDA identifica o cliente (antes o 'host' virava 'https')", () => {
  const root = normalizeRootDomain("https://acaoleve.dev.br");
  assert.equal(isTenantHost("3eventos.acaoleve.dev.br", root), true);
  assert.deepEqual(robotsPolicy("3eventos.acaoleve.dev.br", root), { allowAll: false, disallow: ["/"] });
  assert.equal(robotsPolicy("acaoleve.dev.br", root).allowAll, true);
});

test("QR da cartela em produção: endereço certo, um único https e o caminho de conferência", () => {
  const root = normalizeRootDomain("https://acaoleve.dev.br");
  const url = buildVerifyUrl({ subdomain: "3eventos", rootDomain: root, eventId: "cmv4abc", shortId: "AB12CD" });
  assert.equal(url, "https://3eventos.acaoleve.dev.br/verify?event=cmv4abc&id=AB12CD");
  assert.equal(new URL(url).hostname, "3eventos.acaoleve.dev.br");
});

test("QR em desenvolvimento usa localhost", () => {
  const url = buildVerifyUrl({ subdomain: "sjose", rootDomain: "acaoleve.dev.br", eventId: "e1", shortId: "ZZ99", isLocal: true });
  assert.equal(url, "https://sjose.localhost:3000/verify?event=e1&id=ZZ99");
});

test("o protocolo aceita 'https', 'https:' e 'https://' (e http para testes)", () => {
  const base = { subdomain: "a", rootDomain: "x.com", eventId: "e", shortId: "S" };
  for (const protocol of ["https", "https:", "https://"]) assert.ok(buildVerifyUrl({ ...base, protocol }).startsWith("https://a.x.com/"), protocol);
  assert.ok(buildVerifyUrl({ ...base, protocol: "http://" }).startsWith("http://a.x.com/"));
});

test("o QR gerado é lido de volta pela câmera do PDV/fiscal (ida e volta)", async () => {
  const { extractCardCode } = await import("../src/lib/qrCode.ts");
  const url = buildVerifyUrl({ subdomain: "3eventos", rootDomain: "acaoleve.dev.br", eventId: "cmv4abc", shortId: "ab12cd" });
  assert.equal(extractCardCode(url), "AB12CD");
});
