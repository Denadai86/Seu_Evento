export type Plan = {
  id: string;
  name: string;
  price: number;
  featured?: boolean;
  featuredLabel?: string;
  features: string[];
  cta: string;
};

export const plans: Plan[] = [
  {
    id: "single",
    name: "Evento Único",
    price: 97,
    features: [
      "1 evento",
      "Cartelas ilimitadas",
      "Telão ao vivo",
      "Relatórios",
    ],
    cta: "Escolher plano",
  },
  {
    id: "pack",
    name: "3 Eventos",
    price: 237,
    featured: true,
    featuredLabel: "MAIS ESCOLHIDO",
    features: [
      "3 eventos completos",
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
    price: 397,
    features: [
      "Eventos ilimitados",
      "Equipe ilimitada",
      "Todos os recursos",
      "Melhor custo-benefício",
    ],
    cta: "Escolher plano",
  },
];
