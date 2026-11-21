import type { ScorePart } from "@/lib/types";
const shades = ["bg-ai", "bg-ai/70", "bg-ai/45", "bg-ai/25"];
export function ScoreBar({ parts, showLegend = true }: { parts: ScorePart[]; showLegend?: boolean }) {
  return (
    <div>
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {parts.map((p, i) => <div key={p.label} className={shades[i % 4]} style={{ width: `${p.value}%` }} />)}
      </div>
      {showLegend && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {parts.map((p, i) => (
            <span key={p.label} className="inline-flex items-center gap-1"><i className={`size-2 rounded-full ${shades[i % 4]}`} />{p.label} <b className="tnum text-foreground">{p.value}</b></span>
          ))}
        </div>
      )}
    </div>
  );
}
