// src/config/site.ts
//
// Fonte única de verdade da marca, do contato e dos dados da empresa nas páginas públicas.
// Os campos de `company` começam VAZIOS: o site só mostra o que você preencher aqui
// (nenhum dado é inventado). Preencha razão social, CNPJ, e-mail e cidade antes de vender.

/**
 * Domínio principal SEM protocolo e SEM barra. A variável NEXT_PUBLIC_ROOT_DOMAIN pode vir como
 * "acaoleve.dev.br" ou "https://acaoleve.dev.br/" (na Vercel já veio assim): tudo vira "acaoleve.dev.br".
 * Antes, o valor cru gerava "https://https://acaoleve.dev.br" no sitemap, no canonical e no QR das cartelas.
 */
export function normalizeRootDomain(raw: string | null | undefined, fallback = "acaoleve.dev.br"): string {
  const cleaned = String(raw ?? "")
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "") // tira o protocolo (http://, https://)
    .split("/")[0] // tira o caminho e a barra final
    .trim()
    .toLowerCase();
  return cleaned || fallback;
}

const rootDomain = normalizeRootDomain(process.env.NEXT_PUBLIC_ROOT_DOMAIN);

type Company = {
  legalName: string; // razão social (ou nome do MEI)
  cnpj: string; // 00.000.000/0000-00
  email: string; // e-mail de contato e de privacidade (LGPD)
  city: string; // cidade/UF
};

const company: Company = {
  legalName: "",
  cnpj: "",
  email: "",
  city: "",
};

export const siteConfig = {
  name: "Seu Evento",
  developer: "Ação Leve", // quem desenvolve o produto
  rootDomain, // sem protocolo e sem barra
  url: `https://${rootDomain}`,

  // Texto que aparece no Google e na prévia do link (WhatsApp, Facebook…).
  // Título até ~60 caracteres e descrição até ~160 (o teste confere), para não ser cortado nos resultados.
  seo: {
    title: "Seu Evento | Sistema para eventos e bingos beneficentes",
    description:
      "Cartelas, vendas, voluntários, sorteio ao vivo no telão e prestação de contas para paróquias, ONGs e associações. Tudo no navegador, sem aplicativo.",
    ogHeadline: "Eventos beneficentes com controle de verdade",
  },

  // Data exibida em Termos e Privacidade. ATUALIZE manualmente quando o texto mudar
  // (antes a página mostrava a data de HOJE, o que fazia o documento parecer mudar todo dia).
  legalUpdatedAt: "10 de outubro de 2026",

  urls: {
    home: "/",
    login: "/entrar",
    pricing: "/#planos",
    faq: "/#faq",
    howItWorks: "/#como-funciona",
    whatsapp: "https://wa.me/5514997665374",
    instagram: "https://instagram.com/seuevento",
    privacy: "/privacidade",
    terms: "/termos",
  },

  company,
} as const;

/** Link do WhatsApp com mensagem já preenchida. */
export const whatsappLink = (text: string) =>
  `${siteConfig.urls.whatsapp}?text=${encodeURIComponent(text)}`;
