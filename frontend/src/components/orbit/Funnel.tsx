import { Info } from "lucide-react";
import { AnimatedNumber, Chip } from "./primitives";

export interface FunnelStage { value: number; label: string; rules?: string[] }

export function Funnel({ stages }: { stages: FunnelStage[] }) {
  return (
    <div>
      <ol className="grid gap-3 md:grid-cols-4">
        {stages.map((s, i) => (
          <li key={s.label} className="relative">
            <div
              className="flex h-full flex-col rounded-xl border border-line bg-surface p-4"
              style={{ clipPath: i < stages.length - 1 ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)" : undefined, opacity: 1 - i * 0.04 }}
            >
              <span className={`font-display text-3xl font-bold md:text-4xl ${i === stages.length - 1 ? "text-ai" : "text-foreground"}`}>
                <AnimatedNumber value={s.value} />
              </span>
              <span className="mt-1 pr-4 text-sm text-muted-foreground">{s.label}</span>
              {s.rules && (
                <div className="mt-3 flex flex-wrap gap-1.5 pr-4">
                  {s.rules.map((r) => <Chip key={r} className="text-[11px]">{r}</Chip>)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="size-3.5 text-ai" aria-hidden /> Las skills nunca excluyen a nadie: solo ordenan. Solo los requisitos obligatorios filtran.
      </p>
    </div>
  );
}
