import { Sparkles } from "lucide-react";
import type { ExplainPoint } from "@/lib/types";

export function ExplainSkeleton() {
  return (
    <div className="mt-4 border-t border-line pt-3" role="status" aria-live="polite">
      <p className="text-xs text-muted-foreground">Analyzing why it fits…</p>
      <div className="mt-2 h-2 w-3/4 animate-pulse bg-surface-2" /><div className="mt-1.5 h-2 w-1/2 animate-pulse bg-surface-2" />
    </div>
  );
}

/** "Why…" block from explain-recommendations. */
export function ExplainBlock({ title, summary, points, source }: { title: string; summary: string; points: ExplainPoint[]; source: string }) {
  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy">
        <Sparkles className="size-4 text-blue" aria-hidden />{title}
        {source === "fallback" && <span className="border border-line bg-surface-2 px-1.5 py-px text-[10px] font-medium text-muted-foreground">automatic summary (no AI)</span>}
      </p>
      <details className="mt-2 text-xs text-blue-200"><summary className="cursor-pointer">View details</summary><p className="mt-2">{summary}</p>{points.length > 3 && <ul className="mt-2 list-disc pl-4">{points.slice(3).map((p,i) => <li key={i}>{p.text}</li>)}</ul>}</details>
      {points.length > 0 && <ul className="mt-1 list-disc pl-5 text-sm">{points.slice(0, 3).map((p, i) => <li key={i} title={p.text}>{p.text.split(/\s+/).length > 12 ? `${p.text.split(/\s+/).slice(0, 12).join(" ")}…` : p.text}</li>)}</ul>}
    </div>
  );
}
