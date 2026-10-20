// src/lib/seo.ts
//
// Regras de indexação do Google. Função pura, com testes.
//
//  • O SITE PÚBLICO (acaoleve.dev.br) pode ser indexado, menos as áreas privadas.
//  • O ambiente de CADA CLIENTE (igreja.acaoleve.dev.br) NUNCA vai para o Google: é a operação deles
//    (venda, caixa, telão, verificador), não é conteúdo público.

/** Áreas privadas: nunca devem aparecer no Google, nem no site principal. */
export const PRIVATE_PATHS = [
  "/api/", "/admin", "/dashboard", "/live", "/projector", "/vendas", "/verify",
  "/cartela/", "/print", "/imprimir", "/entrar", "/manual", "/gestao",
] as const;

const bare = (host: string) => host.split(":")[0].trim().toLowerCase();

/** O endereço é o de um cliente (subdomínio), e não o do site principal? */
export function isTenantHost(host: string, rootHost: string): boolean {
  const h = bare(host);
  const root = bare(rootHost);
  if (!h || !root) return false;
  if (h === root || h === `www.${root}`) return false;
  return h.endsWith(`.${root}`);
}

/** O que o robots.txt deve dizer para este endereço. */
export function robotsPolicy(host: string, rootHost: string): { allowAll: boolean; disallow: string[] } {
  if (isTenantHost(host, rootHost)) return { allowAll: false, disallow: ["/"] };
  return { allowAll: true, disallow: [...PRIVATE_PATHS] };
}

// ─────────────────────────────────────────────────────────────────────────────
// DADOS ESTRUTURADOS (JSON-LD): ajudam o Google a entender que o site é um software.
// Só entra o que é VERDADE e já está público: nada de preço, avaliação ou dado inventado.
// ─────────────────────────────────────────────────────────────────────────────
export function buildStructuredData(i: { name: string; url: string; description: string; developer: string }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${i.url}/#website`, name: i.name, url: i.url, inLanguage: "pt-BR" },
      {
        "@type": "SoftwareApplication",
        "@id": `${i.url}/#app`,
        name: i.name,
        url: i.url,
        description: i.description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "pt-BR",
        publisher: { "@type": "Organization", name: i.developer },
      },
    ],
  };
}

/** JSON para dentro de <script>: escapa "<" para um texto nunca conseguir fechar a tag e injetar HTML. */
export const toJsonLd = (data: unknown): string => JSON.stringify(data).replace(/</g, "\\u003c");
