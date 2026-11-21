import { BREAKDOWN_LABELS, BREAKDOWN_ORDER } from "@/lib/matching";
import type { BreakdownKey, BreakdownPart } from "@/lib/types";

const shades = ["bg-blue-400", "bg-green", "bg-blue-200", "bg-blue-400/70", "bg-blue-200/60", "bg-blue-400/45", "bg-blue-200/40"];

/** Stacked bar of breakdown[*].points (0–100 total). */
export function ScoreBar({ breakdown, showLegend = true }: { breakdown: Record<BreakdownKey, BreakdownPart>; showLegend?: boolean }) {
  const parts = BREAKDOWN_ORDER.map((k, i) => ({ k, label: BREAKDOWN_LABELS[k], points: breakdown[k]?.points ?? 0, max: (breakdown[k]?.weight ?? 0) * 100, shade: shades[i] ?? "bg-blue-200" }));
  return (
    <div>
      <div className="flex h-2.5 w-full gap-px overflow-hidden bg-surface-2" role="img" aria-label={parts.map((p) => `${p.label} ${p.points.toFixed(1)}`).join(", ")}>
        {parts.map((p) => <div key={p.k} className={p.shade} style={{ width: `${p.points}%` }} title={`${p.label}: ${p.points.toFixed(1)} de ${p.max.toFixed(0)}`} />)}
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {parts.map((p) => (
            <span key={p.k} title={`${p.label}: ${p.points.toFixed(1)}`} aria-label={`${p.label}: ${p.points.toFixed(1)}`} className="inline-flex items-center gap-1"><i className={`size-2 rounded-full ${p.shade}`} /><span>{["◆", "▣", "◎", "↑", "+", "◇", "◷"][parts.indexOf(p)]}</span><b className="tnum text-blue-200">{p.points.toFixed(1)}</b></span>
          ))}
        </div>
      )}
    </div>
  );
}
