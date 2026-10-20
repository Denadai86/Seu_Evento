// Testes das regras de indexação do Google. Rodar:  pnpm test
import test from "node:test";
import assert from "node:assert/strict";
import { isTenantHost, robotsPolicy, PRIVATE_PATHS } from "../src/lib/seo.ts";

const ROOT = "acaoleve.dev.br";

test("o site principal e o www NÃO são ambiente de cliente", () => {
  assert.equal(isTenantHost("acaoleve.dev.br", ROOT), false);
  assert.equal(isTenantHost("www.acaoleve.dev.br", ROOT), false);
  assert.equal(isTenantHost("ACAOLEVE.DEV.BR", ROOT), false);
});

test("subdomínio de cliente é ambiente de cliente (com ou sem porta)", () => {
  assert.equal(isTenantHost("igreja.acaoleve.dev.br", ROOT), true);
  assert.equal(isTenantHost("sjose.acaoleve.dev.br:443", ROOT), true);
  assert.equal(isTenantHost("a.b.acaoleve.dev.br", ROOT), true);
});

test("domínio parecido ou de fora não é confundido com cliente", () => {
  assert.equal(isTenantHost("outroacaoleve.dev.br", ROOT), false);
  assert.equal(isTenantHost("acaoleve.dev.br.exemplo.com", ROOT), false);
  assert.equal(isTenantHost("localhost:3000", ROOT), false);
  assert.equal(isTenantHost("", ROOT), false);
});

test("site principal: indexa, menos as áreas privadas (incluindo o manual e a gestão)", () => {
  const p = robotsPolicy("acaoleve.dev.br", ROOT);
  assert.equal(p.allowAll, true);
  for (const path of ["/dashboard", "/vendas", "/live", "/projector", "/verify", "/manual", "/gestao", "/admin", "/api/"]) {
    assert.ok(p.disallow.includes(path), `${path} deveria estar bloqueado`);
  }
  for (const path of ["/", "/termos", "/privacidade"]) assert.ok(!p.disallow.includes(path), `${path} precisa ficar liberado`);
});

test("subdomínio de cliente: NADA é indexado", () => {
  assert.deepEqual(robotsPolicy("igreja.acaoleve.dev.br", ROOT), { allowAll: false, disallow: ["/"] });
});

test("as páginas públicas do site nunca entram na lista de bloqueio", () => {
  for (const pub of ["/", "/termos", "/privacidade", "/sitemap.xml"]) {
    assert.ok(!PRIVATE_PATHS.some((p) => pub === p || pub.startsWith(p)), pub);
  }
});

// ── Título, descrição e dados estruturados ──
import { buildStructuredData, toJsonLd } from "../src/lib/seo.ts";
import { siteConfig } from "../src/config/site.ts";

test("título e descrição cabem no Google (não são cortados) e dizem o que o site é", () => {
  const { title, description } = siteConfig.seo;
  assert.ok(title.length <= 60, `título com ${title.length} caracteres`);
  assert.ok(description.length >= 110 && description.length <= 160, `descrição com ${description.length} caracteres`);
  assert.match(title, /Seu Evento/);
  assert.match(title, /eventos/i);
  assert.match(title, /bingos beneficentes/i); // a palavra aparece UMA vez, onde a busca mora
});

test("a descrição não promete nada que o sistema não faça nem afirma legalidade", () => {
  const d = siteConfig.seo.description.toLowerCase();
  for (const proibido of ["legal", "autorizado", "aprovado", "garantid", "100%", "sem internet", "offline"]) {
    assert.ok(!d.includes(proibido), `a descrição não deve conter "${proibido}"`);
  }
});

test("dados estruturados: site e software, em português, sem preço nem avaliação inventados", () => {
  const data = buildStructuredData({ name: "Seu Evento", url: "https://acaoleve.dev.br", description: "x", developer: "Ação Leve" });
  const types = data["@graph"].map((n) => n["@type"]);
  assert.deepEqual(types, ["WebSite", "SoftwareApplication"]);
  const app = data["@graph"][1];
  assert.equal(app.applicationCategory, "BusinessApplication");
  assert.equal(app.inLanguage, "pt-BR");
  const json = JSON.stringify(data);
  for (const inventado of ["offers", "price", "aggregateRating", "review", "telephone", "sameAs"]) {
    assert.ok(!json.includes(inventado), `não pode ter "${inventado}"`);
  }
});

test("JSON-LD é seguro para ir dentro de <script> (um texto não fecha a tag)", () => {
  const out = toJsonLd({ a: "</script><script>alert(1)</script>" });
  assert.ok(!out.includes("</script"), "não pode conter </script");
  assert.deepEqual(JSON.parse(out), { a: "</script><script>alert(1)</script>" }); // e continua lendo igual
});
