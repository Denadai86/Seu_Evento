export type Plan = {
  id: string;
  name: string;
  price: number;
  featured?: boolean;
  featuredLabel?: string;
  features: string[];
  cta: string;
};

// ⚠️ Fonte única dos preços exibidos no site. O texto do Hero/CTA usa `plans[0].price`.
export const plans: Plan[] = [
  {
    id: "single",
    name: "Evento Único",
    price: 199,
    features: [
      "1 evento",
      "Acesso até 7 dias após a data do evento",
      "Cartelas ilimitadas",
      "Telão ao vivo",
      "Relatórios",
    ],
    cta: "Escolher plano",
  },
  {
    id: "pack",
    name: "3 Eventos",
    price: 299,
    featured: true,
    featuredLabel: "MAIS ESCOLHIDO",
    features: [
      "3 eventos completos",
      "Válido por 12 meses",
      "Controle por voluntário",
      "Fiscal anti-fraude",
      "Relatórios financeiros",
      "Patrocinadores",
    ],
    cta: "Começar agora",
  },
  {
    id: "annual",
    name: "Anual",
    price: 499,
    features: [
      "Eventos ilimitados por 12 meses",
      "Equipe ilimitada",
      "Todos os recursos",
      "Melhor custo-benefício",
    ],
    cta: "Escolher plano",
  },
];
