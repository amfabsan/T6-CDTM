import { Award, Briefcase, Wrench } from "lucide-react";
import { foundByMeaning } from "@/lib/mock-data";
import type { EnrichedCandidate, Evidence } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvailabilityBadge, Chip, chipVariants, GapChip, HiddenTalentBadge, MeaningBadge } from "./primitives";
import { ScoreBar } from "./ScoreBar";

const evIcon = { skill: Wrench, project: Briefcase, cert: Award };

export function EvidenceChip({ e, onOpen }: { e: Evidence; onOpen?: ((ref: string) => void) | undefined }) {
  const I = evIcon[e.kind];
  const tone = e.demonstrated === true ? "bench" : e.demonstrated === false ? "rolloff" : "neutral";
  return (
    <button type="button" onClick={() => onOpen?.(e.ref)} title="Ver en el perfil"
      className={cn(chipVariants({ tone }), "cursor-pointer hover:brightness-125")}>
      <I className="size-3" aria-hidden />{e.label}{e.demonstrated === false && " · solo declarada"}
    </button>
  );
}

export function CandidateCard({
  c, rank, active, compared, onCompare, compareDisabled, onHover, onOpenProfile,
}: {
  c: EnrichedCandidate; rank?: number; active?: boolean; compared?: boolean; onCompare?: () => void; compareDisabled?: boolean;
  onHover?: (h: boolean) => void; onOpenProfile?: (ref: string | null) => void;
}) {
  const shown = c.evidence.slice(0, 3);
  const more = c.evidence.length - shown.length;
  return (
    <article onMouseEnter={() => onHover?.(true)} onMouseLeave={() => onHover?.(false)}
      className={cn("lift rounded-xl border bg-surface p-4", active ? "border-ai/70" : "border-line")}>
      <header className="flex items-start gap-3">
        {rank != null && <span className="mt-1 font-display text-sm font-semibold text-muted-foreground tnum">#{rank}</span>}
        <div className="min-w-0 flex-1">
          <button className="truncate text-left text-base font-semibold hover:text-ai" onClick={() => onOpenProfile?.(null)}>{c.name}</button>
          <p className="text-xs text-muted-foreground">{c.area}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <AvailabilityBadge value={c.availability} />
            {c.hidden_talent && <HiddenTalentBadge />}
            {foundByMeaning(c) && <MeaningBadge />}
          </div>
        </div>
        <div className="text-right">
          <span className="font-display text-4xl font-bold leading-none tnum">{c.fit}<span className="text-xl text-muted-foreground">%</span></span>
          <p className="text-[11px] text-muted-foreground">encaje</p>
        </div>
      </header>
      <div className="mt-3" title={c.breakdown.map((p) => `${p.label} ${p.value}`).join(" · ")}><ScoreBar parts={c.breakdown} showLegend={false} /></div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {shown.map((e) => <EvidenceChip key={e.ref} e={e} onOpen={onOpenProfile} />)}
        {more > 0 && <button className={chipVariants({ tone: "neutral" })} onClick={() => onOpenProfile?.(null)}>+{more} evidencias</button>}
        {c.certifications.length === 0 && <Chip>Sin certificaciones</Chip>}
        {c.gaps.map((g) => <GapChip key={g} skill={g} />)}
      </div>
      {onCompare && (
        <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={compared} disabled={!compared && compareDisabled} onChange={onCompare} className="accent-[var(--ai)]" />
          Comparar
        </label>
      )}
    </article>
  );
}
