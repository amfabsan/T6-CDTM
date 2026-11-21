import { Link } from "@tanstack/react-router";
import { AlertTriangle, Briefcase, Check } from "lucide-react";
import type { MatchCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvailabilityBadge, Chip, SectionLabel } from "./primitives";
import { FitGauge, SkillDots } from "./MissionVisuals";
import { ScoreBar } from "./ScoreBar";
import { ExplainBlock } from "./Explain";
import type { ExplainResponse } from "@/lib/types";

export function CandidateCard({
  c, rank, active, compared, onCompare, compareDisabled, onHover, why,
}: { why?: ExplainResponse["candidates"][number] | undefined; c: MatchCandidate; rank?: number; active?: boolean; compared?: boolean; onCompare?: () => void; compareDisabled?: boolean; onHover?: (h: boolean) => void }) {
  return (
    <article onMouseEnter={() => onHover?.(true)} onMouseLeave={() => onHover?.(false)} className={cn("card lift p-5", active && "glow-ai")}>
      <header className="flex items-start gap-3">
        {rank != null && <span className="mt-1 text-sm font-semibold text-muted-foreground tnum">#{rank}</span>}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg">{c.nombre_completo}</h3>
          <p className="text-sm text-muted-foreground">{c.puesto_actual} · {c.nivel_seniority} · {c.pais}</p>
          <div className="mt-2"><AvailabilityBadge value={c.disponibilidad} /></div>
        </div>
        <FitGauge value={c.score} />
      </header>

      <div className="mt-4"><ScoreBar breakdown={c.breakdown} /></div>

      {c.gaps.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Gaps</SectionLabel>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{c.gaps.map((g) => <Chip key={g} tone="gap" icon={<AlertTriangle className="size-3.5" aria-hidden />}>{g}</Chip>)}</div>
        </div>
      )}
      {c.risks.length > 0 && (
        <div className="mt-3">
          <SectionLabel>Riesgos</SectionLabel>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{c.risks.map((r) => <Chip key={r} tone="rolloff">{r}</Chip>)}</div>
        </div>
      )}

      {why && <ExplainBlock title="Por qué encaja" summary={why.summary} points={why.strengths} source={why.source} />}

      <div className="mt-4"><SectionLabel>Evidencia</SectionLabel><div className="project-timeline">{c.evidence.map(e => <Link to="/persona/$id" params={{ id: c.employee_id }} key={e.proyecto + e.anio} className="project-tile text-xs"><Briefcase className="mb-2 size-4 text-blue-200" /><b className="block text-sm">{e.proyecto}</b><span className="mt-1 block text-blue-200">{e.anio} · {e.sector}</span><span className="mt-2 flex flex-wrap gap-1">{e.skills.map(n => <Chip key={n} tone="ai">{n}</Chip>)}</span></Link>)}{c.evidence.length === 0 && <p className="text-xs text-blue-200">Sin proyectos registrados</p>}</div></div>
      <details className="mt-4 group">
        <summary className="cursor-pointer text-sm font-medium text-blue">Skills y evidencia</summary>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Skill</th><th className="font-medium">Tipo</th><th className="font-medium">Nivel</th><th className="font-medium">Años</th><th className="font-medium">Evidencia</th></tr></thead>
          <tbody>
            {c.skills.map((s) => (
              <tr key={s.name} className="border-t border-line">
                <td className="py-1.5 text-navy">{s.name}</td>
                <td className="text-xs">{s.tipo}</td>
                <td className="tnum"><SkillDots level={s.nivel} /></td>
                <td className="tnum">{s.anios}</td>
                <td>{s.demostrada ? <span className="inline-flex items-center gap-1 text-success-ink"><Check className="size-3.5" aria-hidden />demostrada</span> : <span className="text-warn-ink">solo declarada</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <SectionLabel><span className="mt-4 block">Evidencia</span></SectionLabel>
        <ul className="mt-2 space-y-2">
          {c.evidence.map((e) => (
            <li key={e.proyecto + e.anio} className="text-sm">
              <span className="flex items-center gap-1.5"><Briefcase className="size-3.5 text-muted-foreground" aria-hidden /><b className="text-navy">{e.proyecto}</b> · {e.anio} · {e.sector}</span>
              <span className="mt-1 flex flex-wrap gap-1">{e.skills.map((s) => <Chip key={s} tone="ai">{s}</Chip>)}</span>
            </li>
          ))}
          {c.evidence.length === 0 && <li className="text-sm text-muted-foreground">Sin proyectos registrados</li>}
        </ul>
      </details>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        {onCompare ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={compared} disabled={!compared && compareDisabled} onChange={onCompare} className="accent-[var(--blue)]" />Comparar
          </label>
        ) : <span />}
        <Link to="/persona/$id" params={{ id: c.employee_id }} className="text-sm font-semibold text-blue hover:underline">Ver ficha →</Link>
      </div>
    </article>
  );
}
