"use client";

const TONE_COLOR = { gold: "var(--gold-deep)", green: "var(--green)", coral: "var(--coral)" } as const;

/** A simple horizontal bar chart — pure SVG/CSS, no charting library. */
export function BarChart({ data, tone = "gold" }: { data: { label: string; value: number }[]; tone?: keyof typeof TONE_COLOR }) {
  if (data.length === 0) return null;
  const max = Math.max(100, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">{d.label}</span>
            <span className="text-[--ink-soft]">{d.value}%</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "var(--stone-2)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, background: TONE_COLOR[tone] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A simple line/trend chart — pure SVG polyline, no charting library. */
export function LineChart({ data, tone = "gold" }: { data: { label: string; value: number }[]; tone?: keyof typeof TONE_COLOR }) {
  if (data.length === 0) return null;
  const width = 320, height = 120, pad = 20;
  const max = 100, min = 0;
  const stepX = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((d.value - min) / (max - min)) * (height - pad * 2);
    return { x, y, value: d.value, label: d.label };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const color = TONE_COLOR[tone];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: width }}>
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--stone-2)" strokeWidth={1} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color}>
          <title>{`${p.label}: ${p.value}%`}</title>
        </circle>
      ))}
    </svg>
  );
}
