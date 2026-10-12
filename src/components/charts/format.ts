// src/components/charts/format.ts
export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Valor curto para eixos: R$ 850, R$ 1,2 mil. */
export function brlShort(cents: number): string {
  const v = cents / 100;
  if (v >= 1000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

/**
 * Escala "redonda" de eixo com N intervalos iguais (ex.: 0, R$ 100, 200 … 500).
 * Evita valores quebrados nos rótulos (R$ 375, R$ 3,8 mil).
 */
export function niceAxis(value: number, intervals = 5): { max: number; step: number } {
  if (value <= 0) return { max: intervals, step: 1 };
  const raw = value / intervals;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  const nice = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((n) => n >= f) ?? 10;
  const step = nice * exp;
  return { max: step * intervals, step };
}

/** Arredonda para cima para um teto "bonito" (1, 2, 2.5, 5 × 10^n). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

export const COLORS = {
  pdv: "#10b981",
  settlement: "#f59e0b",
  cumulative: "#38bdf8",
  pix: "#22d3ee",
  cash: "#fbbf24",
  quina: "#34d399",
  full: "#a78bfa",
  free: "#475569",
  withVolunteers: "#f59e0b",
  paid: "#10b981",
  text: "#94a3b8",
  grid: "#1f2937",
} as const;
