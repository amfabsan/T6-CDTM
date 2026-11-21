import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { ExplainBlock, ExplainSkeleton } from "@/components/orbit/Explain";
import { AvailabilityBadge, eur, IdealBadge, OrbitButton, Panel, SectionLabel, SimPill } from "@/components/orbit/primitives";
import { Proposal } from "@/components/orbit/Proposal";
import { RingGauge } from "@/components/orbit/RingGauge";
import { allCandidates, selectTeams, useExplanations, useMatching, type TeamFilters, type TeamSort } from "@/lib/matching";
import { MOCK_INTERPRET } from "@/lib/mock-data";
import { setProject, useProject } from "@/lib/project-store";
import type { ExplainResponse, MatchResponse, MatchTeam } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/equipos")({
  head: () => ({
    meta: [
      { title: "Equipos · ORBIT AI" },
      { name: "description", content: "Los mejores equipos posibles con encaje, coste, inicio y continuidad." },
      { property: "og:title", content: "Equipos · ORBIT AI" },
      { property: "og:description", content: "Los mejores equipos posibles con encaje, coste, inicio y continuidad." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StepTeams,
});

const SORTS: { k: TeamSort; label: string }[] = [
  { k: "fit", label: "Mayor encaje" }, { k: "cost", label: "Menor coste" }, { k: "start", label: "Inicio más próximo" }, { k: "continuity", label: "Mayor continuidad" },
];
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
const GreyTag = ({ children, title }: { children: string; title?: string }) => (
  <span title={title} className="border border-line bg-surface-2 px-1.5 py-px text-[10px] font-medium text-muted-foreground">{children}</span>
);

function StepTeams() {
  const { data: match, isLoading } = useMatching();
  const { data: explain, loading: explaining } = useExplanations(true);
  const { requirements, teamId } = useProject();
  const req = requirements ?? MOCK_INTERPRET.requirements;
  const navigate = useNavigate();
  const [sort, setSort] = useState<TeamSort>("fit");
  const [f, setF] = useState<TeamFilters>({ maxBudget: null, minFit: 0, latestStart: null, minContinuity: 0 });
  const [proposalFor, setProposalFor] = useState<string | null>(null);
  const { shown, pending } = useMemo(() => (match ? selectTeams(match.data.teams, f, sort) : { shown: [], pending: [] }), [match, f, sort]);
  const proposalTeam = match?.data.teams.find((t) => t.id === proposalFor);
  const inputCls = "mt-1 w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-blue";

  return (
    <AppShell>
      <p className="text-sm text-muted-foreground">Paso 3 · Equipos</p>
      <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-4xl">Mejores equipos</h1>{match?.simulated && <SimPill />}</div>
      {shown[0] && <p className="mt-3 text-lg">Estos son los {shown.length} mejores equipos con tus filtros; <b className="text-blue">elige uno y úsalo en la decisión.</b></p>}

      <Panel className="mt-6 grid gap-4 md:grid-cols-5">
        <label className="text-xs text-muted-foreground md:col-span-1">Ordenar por
          <select className={inputCls} value={sort} onChange={(e) => setSort(e.target.value as TeamSort)}>{SORTS.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}</select>
        </label>
        <label className="text-xs text-muted-foreground">Presupuesto máximo (€)
          <input type="number" min={0} step={1000} className={inputCls} value={f.maxBudget ?? ""} onChange={(e) => setF({ ...f, maxBudget: e.target.value ? +e.target.value : null })} placeholder="Sin límite" />
        </label>
        <label className="text-xs text-muted-foreground">Encaje mínimo (%)
          <input type="number" min={0} max={100} className={inputCls} value={f.minFit} onChange={(e) => setF({ ...f, minFit: +e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">Inicio como tarde (fecha)
          <input type="date" className={inputCls} value={f.latestStart ?? ""} onChange={(e) => setF({ ...f, latestStart: e.target.value || null })} />
        </label>
        <label className="text-xs text-muted-foreground">Continuidad mínima (%)
          <input type="number" min={0} max={100} className={inputCls} value={f.minContinuity} onChange={(e) => setF({ ...f, minContinuity: +e.target.value })} />
        </label>
      </Panel>

      {isLoading || !match ? <p className="mt-16 text-center text-muted-foreground">Formando equipos…</p> : (
        <>
          {shown.length === 0 && <p className="mt-8 text-muted-foreground">Ningún equipo cumple estos filtros. Prueba a relajarlos.</p>}
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((t, i) => (
              <TeamCard key={t.id} t={t} match={match.data} ideal={sort === "fit" && i === 0} selected={teamId === t.id}
                why={explain?.teams.find((x) => x.team_id === t.id)} explaining={explaining}
                onUse={() => { setProject({ teamId: t.id }); navigate({ to: "/decision" }); }}
                onProposal={() => setProposalFor(t.id)} />
            ))}
          </div>
          {pending.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl">Pendientes de dato</h2>
              <p className="mt-1 text-sm text-muted-foreground">Equipos sin coste o fecha confirmados: no podemos saber si cumplen tus filtros.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pending.map((t) => (
                  <TeamCard key={t.id} t={t} match={match.data} ideal={false} selected={teamId === t.id} why={explain?.teams.find((x) => x.team_id === t.id)} explaining={explaining}
                    onUse={() => { setProject({ teamId: t.id }); navigate({ to: "/decision" }); }} onProposal={() => setProposalFor(t.id)} />
                ))}
              </div>
            </section>
          )}
          {proposalTeam && <Proposal team={proposalTeam} match={match.data} projectName={req.project.project_name} req={req} />}
        </>
      )}
    </AppShell>
  );
}

function TeamCard({ t, match, ideal, selected, why, explaining, onUse, onProposal }: {
  t: MatchTeam; match: MatchResponse; ideal: boolean; selected: boolean; why?: ExplainResponse["teams"][number] | undefined; explaining: boolean; onUse: () => void; onProposal: () => void;
}) {
  const names = new Map(allCandidates(match).map((c) => [c.employee_id, c.nombre_completo]));
  t.members.forEach((m) => names.set(m.employee_id, m.nombre_completo));
  const byRole = t.members.reduce<Record<string, typeof t.members>>((acc, m) => ((acc[m.role] ??= []).push(m), acc), {});
  const w = t.continuity.worst;
  const sub = w.substitute ? names.get(w.substitute) ?? w.substitute : w.late_substitute ? `${names.get(w.late_substitute.employee_id) ?? w.late_substitute.employee_id} (llega el ${fmtDate(w.late_substitute.available_on)})` : "ninguno";
  return (
    <Panel className={cn("lift flex flex-col", selected && "glow-ai")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">EQUIPO {t.id}</p>
          <p className="text-5xl font-bold text-navy tnum">{Math.round(t.fit)}<span className="text-2xl text-muted-foreground">%</span></p>
          <p className="text-xs text-muted-foreground">encaje medio</p>
        </div>
        {ideal && <IdealBadge />}
      </div>
      <div className="mt-4 space-y-3">
        {Object.entries(byRole).map(([role, ms]) => (
          <div key={role}>
            <SectionLabel>{role}</SectionLabel>
            <ul className="mt-1 space-y-1.5">{ms.map((m) => (
              <li key={m.employee_id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate"><b className="text-navy">{m.nombre_completo}</b> · <span className="tnum">{Math.round(m.score)}%</span></span>
                <AvailabilityBadge value={m.disponibilidad} />
              </li>
            ))}</ul>
          </div>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
        <div><dt className="text-xs text-muted-foreground">Coste</dt>
          <dd className="flex flex-wrap items-center gap-1.5 font-semibold text-navy">{t.cost.value == null ? <span className="text-warn-ink">Por estimar</span> : <>{eur(t.cost.value)} <GreyTag>supuesto</GreyTag></>}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Inicio</dt>
          <dd className="flex flex-wrap items-center gap-1.5 font-semibold text-navy">
            {t.start.status === "por confirmar" || !t.start.date
              ? <span className="text-warn-ink" title="Roll-off próximo: menos de 3 meses, sin fecha confirmada">Por confirmar</span>
              : <>{fmtDate(t.start.date)}{t.start.status === "supuesto" && <GreyTag title={`Fecha estimada suponiendo que el roll-off llega en ${match.assumptions.rolloff_days} días`}>supuesto</GreyTag>}</>}
          </dd></div>
      </dl>
      <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
        <RingGauge value={t.continuity.covered} total={t.continuity.total} size={64} />
        <div className="text-sm">
          <p className="font-semibold text-navy">Continuidad tras una baja: {t.continuity.pct} %</p>
          <p className="text-xs text-muted-foreground">Si se va {names.get(w.employee_id) ?? w.employee_id}, quedan {t.continuity.covered} de {t.continuity.total} plazas · sustituto: {sub}</p>
        </div>
      </div>
      {why ? <ExplainBlock title="Por qué este equipo" summary={why.summary} points={why.reasons} source={why.source} /> : explaining ? <ExplainSkeleton /> : null}
      <div className="mt-auto flex flex-wrap justify-end gap-2 pt-5">
        <OrbitButton variant="ghost" onClick={onProposal}><FileText className="size-4" />Generar propuesta de equipo</OrbitButton>
        <OrbitButton onClick={onUse}>Usar en la decisión <ArrowRight className="size-4" /></OrbitButton>
      </div>
    </Panel>
  );
}
