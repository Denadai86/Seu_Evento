// src/lib/dashboardData.ts
//
// Agregações do PAINEL DE RESULTADOS (função pura, sem banco). Só mostra o que o sistema REGISTRA:
//  • Vendas no PDV: uma Transaction por cartela, com horário (cardId preenchido).
//  • Acertos da tesouraria: uma Transaction agregada, com o horário do ACERTO (cardId nulo).
//    A data da venda em papel não é registrada, então o acerto aparece como "acerto", nunca como venda.

const TZ = "America/Sao_Paulo";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type DashCard = {
  type?: "QUINA" | "FULL_HOUSE" | null;
  isPaid: boolean;
  price: number | null;
  eventStaffId: string | null;
  blocked?: boolean;
};

export type DashTx = { amount: number; createdAt: Date; cardId: string | null };

export type TimelinePoint = {
  key: number; // horário de parede (São Paulo) como ms
  label: string; // curto, para o eixo
  fullLabel: string; // completo, para dica
  pdv: number; // centavos vendidos no PDV no período
  settlement: number; // centavos acertados na tesouraria no período
  count: number; // nº de cartelas vendidas no PDV no período
  cumulative: number; // total acumulado (PDV + acertos)
};

// "Horário de parede" de São Paulo como ms (como se fosse UTC): não depende do fuso do servidor.
const wallFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
});
function wallParts(d: Date) {
  const p = Object.fromEntries(wallFormat.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour };
}
function bucketKey(d: Date, step: number): number {
  const { y, m, d: day, h } = wallParts(d);
  return step === DAY ? Date.UTC(y, m - 1, day) : Date.UTC(y, m - 1, day, h);
}
const two = (n: number) => String(n).padStart(2, "0");

export function buildTimeline(txs: DashTx[], maxPoints = 400) {
  if (txs.length === 0) {
    return { unit: "hour" as const, points: [] as TimelinePoint[], peak: null as TimelinePoint | null };
  }

  const times = txs.map((t) => t.createdAt.getTime());
  const span = Math.max(...times) - Math.min(...times);
  let step = span <= 48 * HOUR ? HOUR : DAY;
  if (step === HOUR && span / HOUR > maxPoints) step = DAY;

  const buckets = new Map<number, { pdv: number; settlement: number; count: number }>();
  for (const t of txs) {
    const key = bucketKey(t.createdAt, step);
    const b = buckets.get(key) ?? { pdv: 0, settlement: 0, count: 0 };
    if (t.cardId) { b.pdv += t.amount; b.count += 1; } else { b.settlement += t.amount; }
    buckets.set(key, b);
  }

  const keys = [...buckets.keys()];
  const first = Math.min(...keys);
  const last = Math.max(...keys);

  const sameDay = Math.floor(first / DAY) === Math.floor(last / DAY);
  const points: TimelinePoint[] = [];
  let cumulative = 0;
  for (let key = first; key <= last; key += step) {
    const b = buckets.get(key) ?? { pdv: 0, settlement: 0, count: 0 };
    cumulative += b.pdv + b.settlement;
    const dt = new Date(key);
    const dd = `${two(dt.getUTCDate())}/${two(dt.getUTCMonth() + 1)}`;
    const hh = `${two(dt.getUTCHours())}h`;
    points.push({
      key,
      label: step === DAY ? dd : sameDay ? hh : `${dd} ${hh}`,
      fullLabel: step === DAY ? dd : `${dd} às ${hh}`,
      pdv: b.pdv, settlement: b.settlement, count: b.count, cumulative,
    });
  }

  const peak = points.reduce<TimelinePoint | null>(
    (best, p) => (p.pdv + p.settlement > (best ? best.pdv + best.settlement : -1) ? p : best), null
  );
  return { unit: step === DAY ? ("day" as const) : ("hour" as const), points, peak };
}

// Mesma regra do fechamento de caixa: price null (cartela antiga) cai no preço do TIPO dela.
const priceOf = (c: DashCard, ticketPrice: number, fullHousePrice: number | null | undefined) =>
  c.price ?? (c.type === "FULL_HOUSE" && fullHousePrice && fullHousePrice > 0 ? fullHousePrice : ticketPrice);

/** Vendas agrupadas pelo preço praticado (mostra o efeito das fases de preço). */
export function buildByPrice(cards: DashCard[], ticketPrice: number, fullHousePrice: number | null | undefined) {
  const map = new Map<number, { qtd: number; total: number }>();
  for (const c of cards) {
    if (!c.isPaid) continue;
    const price = priceOf(c, ticketPrice, fullHousePrice);
    const row = map.get(price) ?? { qtd: 0, total: 0 };
    row.qtd += 1; row.total += price;
    map.set(price, row);
  }
  return [...map.entries()].map(([price, v]) => ({ price, ...v })).sort((a, b) => a.price - b.price);
}

/** Para onde foram as cartelas: livres, com voluntários (ainda não acertadas) ou pagas. */
export function buildStock(cards: DashCard[]) {
  let free = 0, withVolunteers = 0, paid = 0, blocked = 0;
  for (const c of cards) {
    if (c.blocked) blocked++;
    else if (c.isPaid) paid++;
    else if (c.eventStaffId) withVolunteers++;
    else free++;
  }
  return { total: cards.length, free, withVolunteers, paid, blocked };
}

/** Quantas cartelas cada voluntário ainda tem na mão (atribuídas e não pagas). */
export function pendingByStaff(cards: DashCard[]) {
  const map = new Map<string, number>();
  for (const c of cards) {
    if (!c.isPaid && !c.blocked && c.eventStaffId) map.set(c.eventStaffId, (map.get(c.eventStaffId) ?? 0) + 1);
  }
  return map;
}

/** Resumo do sorteio a partir dos registros de exposição (uma linha por pedra sorteada). */
export function buildDrawSummary(exposureTimes: Date[]) {
  if (exposureTimes.length === 0) return { balls: 0, firstAt: null as Date | null, lastAt: null as Date | null, spanSeconds: 0, perMinute: 0 };
  const sorted = exposureTimes.map((d) => d.getTime()).sort((a, b) => a - b);
  const spanSeconds = (sorted[sorted.length - 1] - sorted[0]) / 1000;
  return {
    balls: sorted.length,
    firstAt: new Date(sorted[0]),
    lastAt: new Date(sorted[sorted.length - 1]),
    spanSeconds,
    perMinute: spanSeconds > 0 ? (sorted.length / spanSeconds) * 60 : 0,
  };
}
