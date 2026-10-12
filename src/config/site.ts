// src/config/site.ts
//
// Fonte única de verdade da marca, do contato e dos dados da empresa nas páginas públicas.
// Os campos de `company` começam VAZIOS: o site só mostra o que você preencher aqui
// (nenhum dado é inventado). Preencha razão social, CNPJ, e-mail e cidade antes de vender.

const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "acaoleve.dev.br";

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
  url: `https://${rootDomain}`,

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
