import { BREAKDOWN_LABELS, BREAKDOWN_ORDER } from "@/lib/matching";
import type { BreakdownKey, BreakdownPart } from "@/lib/types";

const shades = ["bg-blue", "bg-blue/80", "bg-blue/65", "bg-blue/50", "bg-blue/38", "bg-blue/26", "bg-blue/16"];

/** Stacked bar of breakdown[*].points (0–100 total). */
export function ScoreBar({ breakdown, showLegend = true }: { breakdown: Record<BreakdownKey, BreakdownPart>; showLegend?: boolean }) {
  const parts = BREAKDOWN_ORDER.map((k, i) => ({ k, label: BREAKDOWN_LABELS[k], points: breakdown[k]?.points ?? 0, max: (breakdown[k]?.weight ?? 0) * 100, shade: shades[i]! }));
  return (
    <div>
      <div className="flex h-2.5 w-full gap-px overflow-hidden bg-surface-2" role="img" aria-label={parts.map((p) => `${p.label} ${p.points.toFixed(1)}`).join(", ")}>
        {parts.map((p) => <div key={p.k} className={p.shade} style={{ width: `${p.points}%` }} title={`${p.label}: ${p.points.toFixed(1)} de ${p.max.toFixed(0)}`} />)}
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {parts.map((p) => (
            <span key={p.k} className="inline-flex items-center gap-1"><i className={`size-2 ${p.shade}`} />{p.label} <b className="tnum text-navy">{p.points.toFixed(1)}</b></span>
          ))}
        </div>
      )}
    </div>
  );
}
