export function RingGauge({ value, total, size = 96, label }: { value: number; total: number; size?: number; label?: string }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const p = total ? value / total : 0;
  const tone = p >= 0.75 ? "var(--bench)" : p >= 0.5 ? "var(--rolloff)" : "var(--gap)";
  return (
    <figure className="inline-flex flex-col items-center gap-1" aria-label={`${label ?? "Continuidad"}: ${value} de ${total}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray 700ms ease" }} />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="var(--navy)" fontFamily="var(--font-sans)" fontSize={size / 4.2} fontWeight={700}>
          {value}/{total}
        </text>
      </svg>
      {label && <figcaption className="text-xs text-muted-foreground">{label}</figcaption>}
    </figure>
  );
}
