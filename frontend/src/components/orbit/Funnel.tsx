import { Info } from "lucide-react";
import { AnimatedNumber } from "./primitives";
export interface FunnelStage { value: number; label: string; rules?: string[] }
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  return <div className="py-3"><ol className="funnel-line">{stages.map((s, i) => <li key={s.label} title={s.rules?.join(' · ')}><strong className={`funnel-number tnum ${i === stages.length - 1 ? 'text-blue-400' : ''}`}><AnimatedNumber value={s.value} /></strong><span className="mt-1 block text-xs text-blue-200">{s.label}</span></li>)}</ol><details className="mt-3 text-xs text-muted-foreground"><summary className="inline-flex cursor-pointer items-center gap-1.5"><Info className="size-3.5" />View details</summary><p className="mt-2">Only people who are “Assigned” are excluded and, if the country is required, those outside it. Everything else is scored.</p>{stages.map(s => s.rules && <p key={s.label} className="mt-1">{s.label}: {s.rules.join(' · ')}</p>)}</details></div>;
}
