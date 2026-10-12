// src/lib/sponsorReport.ts
//
// Relatório de EXPOSIÇÃO de patrocinadores (prova de entrega). Função pura, testável.
//
// O que é medido (fatos registrados no sorteio):
//   • pedras oferecidas por cada patrocinador (uma linha por pedra em SponsorExposure)
//   • prêmios oferecidos por ele (Prize.sponsorId)
// O que é ESTIMADO (e o relatório diz isso):
//   • tempo em tela: intervalo até a próxima pedra, limitado a SCREEN_CAP_SECONDS por pedra,
//     para uma pausa longa entre rodadas não inflar o número.

export const SCREEN_CAP_SECONDS = 120;

export type ExposureLite = { sponsorId: string | null; sponsorName: string; createdAt: Date };
export type PrizeLite = { sponsorId: string | null; prizeName: string; isCompleted: boolean };
export type SponsorInfo = { id: string; name: string; logoUrl: string | null; contribution: number };

export type SponsorRow = {
  key: string;
  id: string | null;
  name: string;
  logoUrl: string | null;
  contribution: number;
  balls: number;
  sharePct: number;
  screenSeconds: number;
  prizes: PrizeLite[];
  prizesDelivered: number;
  removed: boolean; // patrocinador apagado depois do evento (o histórico continua)
};

export function buildSponsorReport(input: {
  exposures: ExposureLite[];
  prizes: PrizeLite[];
  sponsors: SponsorInfo[];
}) {
  const sorted = [...input.exposures].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const rows = new Map<string, SponsorRow>();

  for (const s of input.sponsors) {
    rows.set(s.id, {
      key: s.id, id: s.id, name: s.name, logoUrl: s.logoUrl, contribution: s.contribution,
      balls: 0, sharePct: 0, screenSeconds: 0, prizes: [], prizesDelivered: 0, removed: false,
    });
  }

  sorted.forEach((e, i) => {
    const key = e.sponsorId && rows.has(e.sponsorId) ? e.sponsorId : `removido:${e.sponsorName}`;
    let row = rows.get(key);
    if (!row) {
      row = {
        key, id: null, name: e.sponsorName, logoUrl: null, contribution: 0,
        balls: 0, sharePct: 0, screenSeconds: 0, prizes: [], prizesDelivered: 0, removed: true,
      };
      rows.set(key, row);
    }
    const next = sorted[i + 1];
    const seconds = next ? (next.createdAt.getTime() - e.createdAt.getTime()) / 1000 : SCREEN_CAP_SECONDS;
    row.balls += 1;
    row.screenSeconds += Math.max(0, Math.min(seconds, SCREEN_CAP_SECONDS));
  });

  for (const p of input.prizes) {
    if (!p.sponsorId) continue;
    const row = rows.get(p.sponsorId);
    if (!row) continue;
    row.prizes.push(p);
    if (p.isCompleted) row.prizesDelivered += 1;
  }

  const totalBalls = sorted.length;
  const list = [...rows.values()]
    .map((r) => ({ ...r, sharePct: totalBalls > 0 ? (r.balls / totalBalls) * 100 : 0 }))
    .sort((a, b) => b.balls - a.balls || a.name.localeCompare(b.name, "pt-BR"));

  const firstAt = sorted[0]?.createdAt ?? null;
  const lastAt = sorted[sorted.length - 1]?.createdAt ?? null;
  const spanSeconds = firstAt && lastAt ? (lastAt.getTime() - firstAt.getTime()) / 1000 : 0;

  return { rows: list, totalBalls, firstAt, lastAt, spanSeconds };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${sec} s`;
  return `${sec} s`;
}
