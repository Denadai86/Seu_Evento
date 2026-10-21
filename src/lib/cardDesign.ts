// src/lib/cardDesign.ts
//
// MODELO VISUAL DA CARTELA IMPRESSA. O visual é uma ESCOLHA DO ORGANIZADOR na hora de imprimir: não fica gravado
// na cartela. Trocar de tema (ou de colorido para preto e branco) NÃO exige gerar cartelas de novo, e a amostra
// aparece antes mesmo de existirem cartelas. Função pura, sem dependências, com testes.
//
// Para ACRESCENTAR um tema: copie um item de THEMES (só dados) e acrescente o nome em CardTheme.

export type CardTheme = "junina" | "natal" | "classico" | "simples";
export type CardMode = "color" | "bw";
export type CardKind = "QUINA" | "FULL_HOUSE" | null;
export type PrintLayout = "a4-4" | "a4-2" | "a4-1" | "a4-6" | "a6";

export type CardDesign = {
  theme: CardTheme;
  mode: CardMode;
  when: string; // texto livre e OPCIONAL: "Sábado, 14 de junho · 19h"
  place: string; // "Salão Paroquial"
  cause: string; // "Renda para a reforma do telhado do salão"
  showPrizes: boolean;
  showSponsors: boolean;
  stub: { enabled: boolean; name: boolean; phone: boolean }; // canhoto destacável, cada campo é opcional
};

export const THEME_KEYS: readonly CardTheme[] = ["junina", "natal", "classico", "simples"];

export const DEFAULT_DESIGN: CardDesign = {
  theme: "classico",
  mode: "color",
  when: "",
  place: "",
  cause: "",
  showPrizes: true,
  showSponsors: true,
  stub: { enabled: true, name: true, phone: true },
};

type ThemeData = {
  label: string;
  description: string;
  bg: string;
  title: string;
  text: string;
  letters: [string, string, string, string, string];
  quina: string; // cor da moldura e da faixa da Cartela de Quina
  cheia: string; // idem, Cartela Cheia: cores diferentes separam as pilhas só de olhar
  free: { bg: string; fg: string; border: string };
  cell: { border: string; fg: string };
  decoration: "bunting" | "dots" | "none";
  decoColors: string[];
};

export const THEMES: Record<CardTheme, ThemeData> = {
  junina: {
    label: "Festa junina",
    description: "Bandeirinhas e cores de arraiá",
    bg: "#fffaf0", title: "#8c1d18", text: "#4a3520",
    letters: ["#d7352b", "#e8772e", "#2e8b57", "#2a6fb0", "#7a3fa0"],
    quina: "#2f7d4b", cheia: "#c8452c",
    free: { bg: "#f7c948", fg: "#7a4b00", border: "#e4b02c" },
    cell: { border: "#ead9b8", fg: "#3b2a1a" },
    decoration: "bunting", decoColors: ["#d7352b", "#f7c948", "#2e8b57", "#2a6fb0", "#e8772e"],
  },
  natal: {
    label: "Natal",
    description: "Vermelho, verde e dourado",
    bg: "#fffdf7", title: "#8f1d2c", text: "#3f2d22",
    letters: ["#b3202f", "#1f6b43", "#b3202f", "#1f6b43", "#b8892b"],
    quina: "#1f6b43", cheia: "#b3202f",
    free: { bg: "#ecc86a", fg: "#6b4a00", border: "#c9a227" },
    cell: { border: "#e7d9c3", fg: "#2f2218" },
    decoration: "dots", decoColors: ["#b3202f", "#1f6b43", "#d9a93a"],
  },
  classico: {
    label: "Clássico",
    description: "Sóbrio, azul e dourado, serve para qualquer evento",
    bg: "#fbfaf6", title: "#1c2b4a", text: "#333a4a",
    letters: ["#1c2b4a", "#1c2b4a", "#1c2b4a", "#1c2b4a", "#1c2b4a"],
    quina: "#1c4f8f", cheia: "#8a6d1d",
    free: { bg: "#f1e3b5", fg: "#6b5200", border: "#c9a94a" },
    cell: { border: "#d9d4c4", fg: "#14213b" },
    decoration: "none", decoColors: [],
  },
  simples: {
    label: "Simples",
    description: "Limpo e moderno, com pouca tinta",
    bg: "#ffffff", title: "#111827", text: "#374151",
    letters: ["#374151", "#374151", "#374151", "#374151", "#374151"],
    quina: "#0f766e", cheia: "#9a3412",
    free: { bg: "#e5e7eb", fg: "#111827", border: "#cbd5e1" },
    cell: { border: "#d1d5db", fg: "#111827" },
    decoration: "none", decoColors: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LIMPEZA: tudo que o organizador digita passa por aqui antes de ser gravado ou desenhado.
// ─────────────────────────────────────────────────────────────────────────────
const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

export const FIELD_LIMITS = { when: 60, place: 60, cause: 90 } as const;

/** Lê o que está gravado (ou veio do formulário) e devolve SEMPRE um modelo válido. Nunca lança erro. */
export function parseCardDesign(raw: unknown): CardDesign {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const stubRaw = (r.stub && typeof r.stub === "object" ? r.stub : {}) as Record<string, unknown>;

  const name = bool(stubRaw.name, DEFAULT_DESIGN.stub.name);
  const phone = bool(stubRaw.phone, DEFAULT_DESIGN.stub.phone);
  // Canhoto sem nenhum campo não faz sentido: some.
  const enabled = bool(stubRaw.enabled, DEFAULT_DESIGN.stub.enabled) && (name || phone);

  return {
    theme: THEME_KEYS.includes(r.theme) ? r.theme : DEFAULT_DESIGN.theme,
    mode: r.mode === "bw" || r.mode === "color" ? r.mode : DEFAULT_DESIGN.mode,
    when: clean(r.when, FIELD_LIMITS.when),
    place: clean(r.place, FIELD_LIMITS.place),
    cause: clean(r.cause, FIELD_LIMITS.cause),
    showPrizes: bool(r.showPrizes, DEFAULT_DESIGN.showPrizes),
    showSponsors: bool(r.showSponsors, DEFAULT_DESIGN.showSponsors),
    stub: { enabled, name, phone },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CORES RESOLVIDAS: o que a cartela usa de fato (preto e branco ignora o tema).
// ─────────────────────────────────────────────────────────────────────────────
export type ResolvedColors = {
  bw: boolean;
  bg: string; title: string; text: string;
  frame: string; ribbonBg: string; ribbonFg: string; ribbonBorder: string;
  letters: string[];
  cellBorder: string; cellFg: string;
  freeBg: string; freeFg: string; freeBorder: string;
  decoration: "bunting" | "dots" | "none"; decoColors: string[];
};

export function resolveColors(design: CardDesign, kind: CardKind): ResolvedColors {
  if (design.mode === "bw") {
    // Preto e branco de verdade (copiadora): a Quina é faixa VAZADA e a Cheia é faixa PRETA, para separar a pilha.
    const solid = kind === "FULL_HOUSE";
    return {
      bw: true, bg: "#ffffff", title: "#000000", text: "#111111",
      frame: "#000000",
      ribbonBg: solid ? "#000000" : "#ffffff", ribbonFg: solid ? "#ffffff" : "#000000", ribbonBorder: "#000000",
      letters: ["#000000", "#000000", "#000000", "#000000", "#000000"],
      cellBorder: "#333333", cellFg: "#000000",
      freeBg: "#e6e6e6", freeFg: "#000000", freeBorder: "#333333",
      decoration: "none", decoColors: [],
    };
  }
  const t = THEMES[design.theme];
  const accent = kind === "FULL_HOUSE" ? t.cheia : t.quina;
  return {
    bw: false, bg: t.bg, title: t.title, text: t.text,
    frame: accent, ribbonBg: accent, ribbonFg: "#ffffff", ribbonBorder: accent,
    letters: [...t.letters],
    cellBorder: t.cell.border, cellFg: t.cell.fg,
    freeBg: t.free.bg, freeFg: t.free.fg, freeBorder: t.free.border,
    decoration: t.decoration, decoColors: [...t.decoColors],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATO DA FOLHA: a cartela é desenhada em "em", então escala junto com o formato.
// Nos formatos pequenos (6 por folha) o texto extra ficaria ilegível: aparece só o essencial.
// ─────────────────────────────────────────────────────────────────────────────
export function layoutProfile(layout: PrintLayout): { scale: number; compact: boolean } {
  switch (layout) {
    case "a4-4": return { scale: 1, compact: false };
    case "a4-2": return { scale: 1.3, compact: false };
    case "a4-1": return { scale: 1.75, compact: false };
    case "a4-6": return { scale: 0.68, compact: true };
    case "a6":   return { scale: 1.02, compact: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXTOS DERIVADOS DO EVENTO
// ─────────────────────────────────────────────────────────────────────────────
const KIND_LABEL = { QUINA: "Quina", FULL_HOUSE: "Cheia" } as const;

/** "Quina: cesta de café · Cheia: R$ 500" a partir das rodadas cadastradas (até 4, com limite de tamanho). */
export function prizeLine(prizes: { type: string; prizeName: string }[], max = 110): string {
  const parts = prizes
    .filter((p) => (p.type === "QUINA" || p.type === "FULL_HOUSE") && clean(p.prizeName, 60))
    .slice(0, 4)
    .map((p) => `${KIND_LABEL[p.type as "QUINA" | "FULL_HOUSE"]}: ${clean(p.prizeName, 60)}`);
  const line = parts.join(" · ");
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** "Sábado, 14 de junho · 19h · Salão Paroquial": junta só o que foi preenchido. */
export function whenWhere(design: Pick<CardDesign, "when" | "place">): string {
  return [design.when, design.place].filter(Boolean).join(" · ");
}

/** Tamanho do título (em) conforme o tamanho do nome: nome longo NÃO pode espremer os números da cartela. */
export function titleSize(name: string): number {
  const n = name.trim().length;
  return n <= 30 ? 1.9 : n <= 48 ? 1.6 : 1.35;
}

/** Descrição da faixa do tipo (o que a cartela ganha). */
export function kindCaption(kind: CardKind): { label: string; sub: string } {
  if (kind === "FULL_HOUSE") return { label: "Cartela Cheia", sub: "Ganha com a cartela toda" };
  if (kind === "QUINA") return { label: "Cartela de Quina", sub: "Ganha com uma linha, coluna ou diagonal" };
  return { label: "Cartela", sub: "Vale para todas as rodadas" }; // cartela antiga, sem tipo
}
