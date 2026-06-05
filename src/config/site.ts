import link from "next/link";

export const siteConfig = {
  name: "SeuEvento",

  urls: {
    home: "/",

    login: "/entrar",

    pricing: "/#planos",

    faq: "/#faq",

    howItWorks: "/#como-funciona",

    whatsapp: "https://wa.me/5514997665374",

    instagram: "https://instagram.com/seuevento",

    sponsors: "/patrocinadores",

    privacy: "/privacidade",

    terms: "/termos",
  },
} as const;