// src/components/charts/HBarChart.tsx
// Barras horizontais com rótulo e valor. SVG puro.
import { COLORS } from "./format";

export type HBarRow = { label: string; value: number; display: string; sub?: string; color?: string };

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default function HBarChart({ rows, color = COLORS.pdv, emptyText = "Sem dados ainda." }: {
  rows: HBarRow[];
  color?: string;
  emptyText?: string;
}) {
  const W = 560, rowH = 40, labelW = 150, valueW = 118, pad = 4;
  if (rows.length === 0) {
    return (
      <svg viewBox={`0 0 ${W} 80`} width="100%" role="img">
        <text x={W / 2} y={44} textAnchor="middle" fill={COLORS.text} fontSize={14}>{emptyText}</text>
      </svg>
    );
  }
  const H = rows.length * rowH + pad * 2;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const barArea = W - labelW - valueW;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      {rows.map((r, i) => {
        const y = pad + i * rowH;
        const w = Math.max(r.value > 0 ? 4 : 0, (r.value / max) * barArea);
        return (
          <g key={`${r.label}-${i}`}>
            <text x={2} y={y + 18} fontSize="13" fontWeight="700" fill="#e2e8f0">{cut(r.label, 20)}</text>
            {r.sub && <text x={2} y={y + 33} fontSize="10.5" fill={COLORS.text}>{cut(r.sub, 26)}</text>}
            <rect x={labelW} y={y + 8} width={barArea} height={16} rx={8} fill="#111c2e" />
            <rect x={labelW} y={y + 8} width={w} height={16} rx={8} fill={r.color ?? color} />
            <text x={labelW + barArea + 10} y={y + 21} fontSize="13" fontWeight="800" fill="#f1f5f9">{r.display}</text>
          </g>
        );
      })}
    </svg>
  );
}
