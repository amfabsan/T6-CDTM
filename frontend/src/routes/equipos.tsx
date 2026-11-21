import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Star } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { AvailabilityBadge, Chip, DataTag, formatEs, Panel, PendingChip, SimPill } from "@/components/orbit/primitives";
import { RingGauge } from "@/components/orbit/RingGauge";
import { setProject, useProject } from "@/lib/project-store";
import { buildTeams, type Team } from "@/lib/teams";
import { useCandidates } from "@/lib/use-candidates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/equipos")({
  head: () => ({
    meta: [
      { title: "Equipos · ORBIT AI" },
      { name: "description", content: "Los 5 mejores equipos posibles con encaje, coste, inicio y continuidad." },
      { property: "og:title", content: "Equipos · ORBIT AI" },
      { property: "og:description", content: "Los 5 mejores equipos posibles con encaje, coste, inicio y continuidad." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StepTeams,
});

type Sort = "Encaje" | "Coste" | "Inicio" | "Continuidad";

function StepTeams() {
  const { data, req, isLoading } = useCandidates();
  const { teamIndex } = useProject();
  const [sort, setSort] = useState<Sort>("Encaje");
  const [minFit, setMinFit] = useState(0);
  const teams = useMemo(() => (data ? buildTeams(req, data) : []), [data, req]);
  const best = teams.reduce<Team | null>((b, t) => (!b || t.fit > b.fit ? t : b), null);
  const sorted = useMemo(() => {
    const f = teams.filter((t) => t.fit >= minFit);
    const key: Record<Sort, (t: Team) => number> = { Encaje: (t) => -t.fit, Coste: (t) => t.costPerDay, Inicio: () => 0, Continuidad: (t) => -t.continuity.kept };
    return f.sort((a, b) => (a.start === b.start ? 0 : a.start === "Por confirmar" ? 1 : -1) || key[sort](a) - key[sort](b));
  }, [teams, sort, minFit]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <p className="text-sm text-muted-foreground">Paso 3 · Equipos</p>
        <div className="mt-1 flex flex-wrap items-center gap-3"><h2 className="text-4xl font-bold">Top 5 equipos</h2><SimPill /></div>
        {best && <p className="mt-3 text-lg">ORBIT ha combinado a los mejores candidatos de cada rol: <span className="text-ai">el equipo ideal encaja un <b className="font-display tnum">{best.fit}%</b>.</span> Los que tienen datos pendientes van al final.</p>}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1" role="group" aria-label="Ordenar">
            {(["Encaje", "Coste", "Inicio", "Continuidad"] as Sort[]).map((k) => (
              <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)} className={cn("rounded-full px-3 py-1 text-xs font-medium", sort === k ? "bg-ai text-on-accent" : "text-muted-foreground hover:text-foreground")}>{k}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">Encaje mínimo
            <input type="range" min={0} max={90} step={5} value={minFit} onChange={(e) => setMinFit(+e.target.value)} className="accent-[var(--ai)]" /><b className="w-6 text-foreground tnum">{minFit}</b>
          </label>
        </div>
        {isLoading ? <p className="mt-16 text-center text-muted-foreground">Formando equipos…</p> : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((t) => {
              const selected = teamIndex === t.id;
              return (
                <button key={t.id} onClick={() => setProject({ teamIndex: t.id })} aria-pressed={selected} className="text-left">
                  <Panel className={cn("lift relative h-full rounded-2xl", selected && "glow-ai border-ai")}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-xs font-semibold tracking-[0.2em] text-muted-foreground">MISIÓN {String(t.id + 1).padStart(2, "0")}</p>
                        <p className="font-display text-5xl font-bold tnum">{t.fit}<span className="text-2xl text-muted-foreground">%</span></p>
                      </div>
                      {best?.id === t.id && <Chip tone="ai" icon={<Star className="size-3.5" aria-hidden />}>Equipo ideal</Chip>}
                    </div>
                    <ul className="mt-4 space-y-2">
                      {t.members.map((m) => (
                        <li key={m.c.employee_id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0"><b className="block truncate">{m.c.name}</b><span className="text-xs text-muted-foreground">{m.roleTitle}</span></span>
                          <AvailabilityBadge value={m.c.availability} />
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
                      <RingGauge value={t.continuity.kept} total={t.continuity.total} size={72} />
                      <div className="space-y-1.5 text-xs">
                        <p className="text-muted-foreground">Si se va {t.continuity.leaving}, quedan {t.continuity.kept} de {t.continuity.total} roles · sustituto: {t.continuity.substitute ?? "ninguno"}</p>
                        <p className="flex items-center gap-1.5"><span className="font-display text-base font-semibold tnum">{formatEs(t.costPerDay)} €/día</span><DataTag kind="supuesto" /></p>
                        {t.start === "Día 0" ? <Chip tone="bench">Inicio: Día 0</Chip> : <PendingChip>Inicio: Por confirmar</PendingChip>}
                      </div>
                    </div>
                  </Panel>
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-8 flex justify-end">
          <Link to="/decision" className="inline-flex items-center gap-2 rounded-full bg-ai px-7 py-3 text-base font-semibold text-on-accent transition-all hover:glow-ai">
            Decidir con este equipo <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
