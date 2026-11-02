// scripts/indexnow.mjs
//
// Avisa o Bing (e os demais buscadores do IndexNow) que as páginas do site mudaram.
// Lê as URLs do sitemap publicado, confere se a chave está no ar e envia tudo numa chamada.
//
// Uso local:   INDEXNOW_KEY=suachave pnpm indexnow
// Uso no CI:   .github/workflows/indexnow.yml (roda sozinho após deploy de produção)

const SITE = (process.env.SITE_URL || "https://acaoleve.dev.br").replace(/\/+$/, "");
const KEY = (process.env.INDEXNOW_KEY || "").trim();

function falhar(msg) {
  console.error(`✗ IndexNow: ${msg}`);
  process.exit(1);
}

if (!/^[a-zA-Z0-9-]{8,128}$/.test(KEY)) falhar("INDEXNOW_KEY ausente ou inválida (8 a 128 letras, números ou hífen).");

const host = new URL(SITE).host;
const keyLocation = `${SITE}/${KEY}.txt`;

// 1) A chave precisa estar publicada, senão o Bing recusa o envio (403).
const chave = await fetch(keyLocation, { redirect: "manual" });
const conteudo = chave.ok ? (await chave.text()).trim() : "";
if (conteudo !== KEY) {
  falhar(`chave não encontrada em ${keyLocation} (status ${chave.status}). Confira public/${KEY}.txt e o matcher do proxy.`);
}

// 2) URLs vêm do sitemap publicado: página nova no sitemap = página avisada, sem lista duplicada.
const sitemap = await fetch(`${SITE}/sitemap.xml`);
if (!sitemap.ok) falhar(`sitemap.xml respondeu ${sitemap.status}.`);
const xml = await sitemap.text();
const urlList = [...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/g)]
  .map((m) => m[1].replace(/&amp;/g, "&"))
  .filter((u) => new URL(u).host === host);

if (urlList.length === 0) falhar("nenhuma URL do domínio encontrada no sitemap.");

// 3) Envio
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key: KEY, keyLocation, urlList }),
});

// 200 = recebido; 202 = recebido, chave ainda em validação (normal na primeira vez)
if (res.status === 200 || res.status === 202) {
  console.log(`✓ IndexNow: ${urlList.length} URL(s) enviadas (status ${res.status})`);
  urlList.forEach((u) => console.log(`  • ${u}`));
} else {
  falhar(`resposta ${res.status} ${await res.text()}`);
}
