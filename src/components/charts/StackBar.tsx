// src/components/charts/StackBar.tsx
// Barra única segmentada (ex.: estoque de cartelas). SVG puro.
export type StackSegment = { label: string; value: number; color: string };

export default function StackBar({ segments }: { segments: StackSegment[] }) {
  const W = 560, H = 30;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let x = 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      <rect x={0} y={0} width={W} height={H} rx={15} fill="#111c2e" />
      {total > 0 &&
        segments.map((s) => {
          if (s.value <= 0) return null;
          const w = (s.value / total) * W;
          const el = <rect key={s.label} x={x} y={0} width={Math.max(w, 2)} height={H} fill={s.color} rx={0} />;
          x += w;
          return el;
        })}
      <rect x={0} y={0} width={W} height={H} rx={15} fill="none" stroke="#0b0f14" strokeWidth={3} />
    </svg>
  );
}
