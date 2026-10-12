// src/components/charts/TimelineChart.tsx
// Barras empilhadas (vendas no PDV + acertos da tesouraria) e linha do total acumulado. SVG puro.
import type { TimelinePoint } from "@/lib/dashboardData";
import { brlShort, niceAxis, COLORS } from "./format";

export default function TimelineChart({ points, idPrefix = "tl" }: { points: TimelinePoint[]; idPrefix?: string }) {
  const W = 860, H = 300, L = 66, R = 78, T = 30, B = 40;

  if (points.length === 0) {
    return (
      <svg viewBox={`0 0 ${W} 120`} width="100%" role="img" aria-label="Sem vendas registradas">
        <text x={W / 2} y={64} textAnchor="middle" fill={COLORS.text} fontSize={14}>
          Ainda não há vendas registradas neste evento.
        </text>
      </svg>
    );
  }

  const innerW = W - L - R;
  const innerH = H - T - B;
  // Mesma quantidade de intervalos nos dois eixos: as linhas da grade servem para os dois lados.
  const maxBar = niceAxis(Math.max(...points.map((p) => p.pdv + p.settlement), 1), 5).max;
  const maxCum = niceAxis(points[points.length - 1].cumulative || 1, 5).max;
  const band = innerW / points.length;
  const barW = Math.max(2, Math.min(30, band * 0.68));

  const x = (i: number) => L + band * i + band / 2;
  const yBar = (v: number) => T + innerH - (v / maxBar) * innerH;
  const yCum = (v: number) => T + innerH - (v / maxCum) * innerH;

  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const labelStep = Math.max(1, Math.ceil(points.length / 9));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yCum(p.cumulative).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${(T + innerH).toFixed(1)} L${x(0).toFixed(1)},${(T + innerH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Linha do tempo de vendas">
      <defs>
        <linearGradient id={`${idPrefix}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.cumulative} stopOpacity="0.28" />
          <stop offset="100%" stopColor={COLORS.cumulative} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* legenda */}
      <g fontSize="12" fill={COLORS.text}>
        <rect x={L} y={8} width={10} height={10} rx={2} fill={COLORS.pdv} />
        <text x={L + 16} y={17}>Vendas no PDV</text>
        <rect x={L + 112} y={8} width={10} height={10} rx={2} fill={COLORS.settlement} />
        <text x={L + 128} y={17}>Acertos da tesouraria</text>
        <line x1={L + 268} y1={13} x2={L + 288} y2={13} stroke={COLORS.cumulative} strokeWidth={2.5} />
        <text x={L + 294} y={17}>Total acumulado</text>
      </g>

      {/* grade + eixos */}
      {ticks.map((t) => {
        const y = T + innerH - t * innerH;
        return (
          <g key={t}>
            <line x1={L} y1={y} x2={W - R} y2={y} stroke={COLORS.grid} strokeWidth={1} />
            <text x={L - 8} y={y + 4} textAnchor="end" fontSize="11" fill={COLORS.text}>{brlShort(maxBar * t)}</text>
            <text x={W - R + 8} y={y + 4} textAnchor="start" fontSize="11" fill={COLORS.cumulative}>{brlShort(maxCum * t)}</text>
          </g>
        );
      })}

      {/* barras empilhadas */}
      {points.map((p, i) => {
        const hPdv = (p.pdv / maxBar) * innerH;
        const hSet = (p.settlement / maxBar) * innerH;
        return (
          <g key={p.key}>
            {p.pdv > 0 && <rect x={x(i) - barW / 2} y={T + innerH - hPdv} width={barW} height={hPdv} rx={2} fill={COLORS.pdv} />}
            {p.settlement > 0 && <rect x={x(i) - barW / 2} y={T + innerH - hPdv - hSet} width={barW} height={hSet} rx={2} fill={COLORS.settlement} />}
          </g>
        );
      })}

      {/* acumulado */}
      <path d={areaPath} fill={`url(#${idPrefix}-area)`} />
      <path d={linePath} fill="none" stroke={COLORS.cumulative} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={yCum(points[points.length - 1].cumulative)} r={4} fill={COLORS.cumulative} />

      {/* rótulos do eixo X */}
      {points.map((p, i) =>
        i % labelStep === 0 ? (
          <text key={p.key} x={x(i)} y={H - 14} textAnchor="middle" fontSize="11" fill={COLORS.text}>{p.label}</text>
        ) : null
      )}
    </svg>
  );
}
