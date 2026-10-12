// src/components/charts/DonutChart.tsx
// Rosca com valor no centro. SVG puro (círculos com stroke-dasharray).
import { COLORS } from "./format";

export type DonutSegment = { label: string; value: number; color: string };

export default function DonutChart({ segments, centerTop, centerBottom }: {
  segments: DonutSegment[];
  centerTop?: string;
  centerBottom?: string;
}) {
  const size = 200, c = size / 2, r = 70, stroke = 26;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);

  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 220 }} role="img">
      <circle cx={c} cy={c} r={r} fill="none" stroke="#111c2e" strokeWidth={stroke} />
      {total > 0 &&
        segments.map((s) => {
          if (s.value <= 0) return null;
          const len = (s.value / total) * circ;
          const el = (
            <circle
              key={s.label}
              cx={c} cy={c} r={r} fill="none"
              stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(len - (segments.filter((x) => x.value > 0).length > 1 ? 2 : 0), 0.1)} ${circ}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
          offset += len;
          return el;
        })}
      {centerTop && <text x={c} y={c - 2} textAnchor="middle" fontSize="22" fontWeight="800" fill="#f8fafc">{centerTop}</text>}
      {centerBottom && <text x={c} y={c + 18} textAnchor="middle" fontSize="11" fill={COLORS.text}>{centerBottom}</text>}
    </svg>
  );
}
