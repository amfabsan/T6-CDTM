import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { MatchingStatus } from "@/components/orbit/MatchingStatus";
import { ExplainBlock, ExplainSkeleton } from "@/components/orbit/Explain";
import { AvailabilityBadge, eur, IdealBadge, OrbitButton, Panel, SectionLabel, SimPill } from "@/components/orbit/primitives";
import { Proposal } from "@/components/orbit/Proposal";
import { CrewOrbit } from "@/components/orbit/MissionVisuals";
import { RingGauge } from "@/components/orbit/RingGauge";
import { TeamAlternatives } from "@/components/orbit/TeamAlternatives";
import { RocketJourney } from "@/components/orbit/RocketJourney";
import { topFourTeams, topPerCriterion } from "@/lib/team-presentation";
import { allCandidates, useExplanations, useMatching, type TeamFilters, type TeamSort } from "@/lib/matching";
import { MOCK_INTERPRET } from "@/lib/mock-data";
import { setProject, useProject } from "@/lib/project-store";
import type { ExplainResponse, MatchResponse, MatchTeam } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/equipos")({
  head: () => ({
    meta: [
      { title: "Teams · ORBIT AI" },
      { name: "description", content: "The best possible teams by fit, cost, start date and continuity." },
      { property: "og:title", content: "Teams · ORBIT AI" },
      { property: "og:description", content: "The best possible teams by fit, cost, start date and continuity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StepTeams,
});

const SORTS: { k: TeamSort; label: string }[] = [
  { k: "fit", label: "Best fit" }, { k: "cost", label: "Lowest cost" }, { k: "start", label: "Earliest start" }, { k: "continuity", label: "Lowest risk" },
];
const SORT_HELP: Record<TeamSort, string> = { fit: "Service fit, highest first. Tie-break: ID. No extra synergy is computed in the app.", cost: "Cost, lowest first. Tie-break: higher fit, then ID.", start: "Earliest start date. Tie-break: higher fit, then ID.", continuity: "Highest continuity if someone drops out. Tie-break: higher fit, then ID." };
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const GreyTag = ({ children, title }: { children: string; title?: string }) => (
  <span title={title} className="border border-line bg-surface-2 px-1.5 py-px text-[10px] font-medium text-muted-foreground">{children}</span>
);

function StepTeams() {
  const { data: match, isLoading, error } = useMatching();
  const { data: explain, loading: explaining } = useExplanations(true);
  const { requirements, teamId, teamArrival } = useProject();
  const req = requirements ?? MOCK_INTERPRET.requirements;
  const navigate = useNavigate();
  const [sort, setSort] = useState<TeamSort>("fit");
  const [f, setF] = useState<TeamFilters>({ maxBudget: null, minFit: 0, latestStart: null, minContinuity: 0 });
  const [proposalFor, setProposalFor] = useState<string | null>(null);
  const { shown, pending } = useMemo(() => (match ? topFourTeams(match.data.teams, f, sort) : { shown: [], pending: [] }), [match, f, sort]);
  const tops = useMemo(() => (match ? topPerCriterion(match.data.teams, f) : []), [match, f]);
  const mainTeam = match?.data.teams.find(t => t.id === teamId) ?? shown[0];
  const setFilters = (filters: TeamFilters) => { setF(filters); setProject({ teamId: null, teamArrival: false }); };
  const focusTeam = (id: string) => { setProject({ teamId: id, teamArrival: false }); document.getElementById('main-team')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); };
  const proposalTeam = match?.data.teams.find((t) => t.id === proposalFor);
  const inputCls = "mt-1 w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-blue";

  return (
    <AppShell>
      <p className="mission-kicker">03 / Teams</p>
      <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="mission-title">Team proposals</h1>{match?.simulated && <SimPill />}</div>


      <div role="tablist" aria-label="Team criterion" className="mt-6 flex flex-wrap gap-2">{SORTS.map(s => <OrbitButton key={s.k} variant="ghost" role="tab" aria-selected={sort === s.k} aria-controls="team-results" title={SORT_HELP[s.k]} onClick={() => { setSort(s.k); setProject({ teamId: null, teamArrival: false }); }}>{s.label}</OrbitButton>)}</div>
      <section className="mt-4 grid grid-cols-2 gap-3 border-y border-line py-4 md:grid-cols-4">
        <label className="text-xs text-muted-foreground">Maximum budget (€)
          <input type="number" min={0} step={1000} className={inputCls} value={f.maxBudget ?? ""} onChange={(e) => setFilters({ ...f, maxBudget: e.target.value ? +e.target.value : null })} placeholder="No limit" />
        </label>
        <label className="text-xs text-muted-foreground">Minimum fit (%)
          <input type="number" min={0} max={100} className={inputCls} value={f.minFit} onChange={(e) => setFilters({ ...f, minFit: +e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">Latest start (date)
          <input type="date" className={inputCls} value={f.latestStart ?? ""} onChange={(e) => setFilters({ ...f, latestStart: e.target.value || null })} />
        </label>
        <label className="text-xs text-muted-foreground">Minimum continuity (%)
          <input type="number" min={0} max={100} className={inputCls} value={f.minContinuity} onChange={(e) => setFilters({ ...f, minContinuity: +e.target.value })} />
        </label>
      </section>

      {isLoading || !match ? <MatchingStatus error={error} /> : (
        <>
          <section aria-label="Top by criterion" className="mt-6">
            <h2 className="text-lg">Top by criterion</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {tops.map(({ sort: k, team: top }) => (
                <button key={k} type="button" disabled={!top} title={SORT_HELP[k]}
                  onClick={() => { if (top) { setSort(k); focusTeam(top.id); } }}
                  className={cn("border border-line bg-surface p-4 text-left transition-colors", top ? "hover:border-blue cursor-pointer" : "opacity-50")}>
                  <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground">{SORTS.find(s => s.k === k)?.label.toUpperCase()}</p>
                  {top ? (
                    <>
                      <p className="mt-2 text-sm font-semibold text-navy">Team {top.id}</p>
                      <p className="mt-1 text-2xl font-bold text-navy tnum">
                        {k === "cost" ? (top.cost.value != null ? eur(top.cost.value) : "To be estimated")
                          : k === "start" ? (top.start.date ? fmtDate(top.start.date) : "To be confirmed")
                          : k === "continuity" ? `${top.continuity.pct} %`
                          : `${Math.round(top.fit)} %`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{k === "cost" ? "cost" : k === "start" ? "start" : k === "continuity" ? "continuity" : "fit"}</p>
                    </>
                  ) : <p className="mt-2 text-xs text-muted-foreground">No teams with these filters</p>}
                </button>
              ))}
            </div>
          </section>
          {shown.length === 0 && <p className="mt-8 text-muted-foreground">No team meets these filters. Try relaxing them.</p>}
          <section id="team-results" role="tabpanel" aria-label={SORTS.find(s => s.k === sort)?.label} className="mt-6">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg">{teamId && !shown.some(t => t.id === teamId) ? 'Selected team' : `Top ${shown.length} teams`}</h2><span className="text-xs text-muted-foreground" title={SORT_HELP[sort]}>Criterion and tie-breaks ⓘ</span></div>
            {mainTeam && <div id="main-team" className="relative scroll-mt-24">
              {teamArrival && <RocketJourney arriving />}
              <TeamCard key={mainTeam.id} t={mainTeam} match={match.data} ideal={sort === 'fit' && shown[0]?.id === mainTeam.id} selected primary
                why={explain?.teams.find(x => x.team_id === mainTeam.id)} explaining={explaining}
                onUse={() => { setProject({ teamId: mainTeam.id }); navigate({ to: '/decision' }); }} onProposal={() => setProposalFor(mainTeam.id)} />
              <h2 className="mb-4 mt-8 text-2xl">Other Top 4 teams</h2>
              <div className="grid gap-4 lg:grid-cols-3">{shown.filter(t => t.id !== mainTeam.id).map(t => <TeamCard key={t.id} t={t} match={match.data} ideal={sort === 'fit' && shown[0]?.id === t.id} selected={false} why={explain?.teams.find(x => x.team_id === t.id)} explaining={explaining} onView={() => focusTeam(t.id)} onUse={() => { setProject({ teamId: t.id }); navigate({ to: '/decision' }); }} onProposal={() => setProposalFor(t.id)} />)}</div>
              <TeamAlternatives match={match.data} team={mainTeam} onTeam={focusTeam} />
            </div>}
          </section>
          {pending.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl">Pending data</h2>
              <p className="mt-1 text-xs text-blue-200" title="Teams without a confirmed cost or date: we can't tell whether they meet your filters.">Cost or date to be confirmed.</p>
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

function TeamCard({ t, match, ideal, selected, primary = false, why, explaining, onUse, onProposal, onView }: {
  t: MatchTeam; match: MatchResponse; ideal: boolean; selected: boolean; primary?: boolean; why?: ExplainResponse["teams"][number] | undefined; explaining: boolean; onUse: () => void; onProposal: () => void; onView?: () => void;
}) {
  const names = new Map(allCandidates(match).map((c) => [c.employee_id, c.nombre_completo]));
  t.members.forEach((m) => names.set(m.employee_id, m.nombre_completo));
  const byRole = t.members.reduce<Record<string, typeof t.members>>((acc, m) => ((acc[m.role] ??= []).push(m), acc), {});
  const w = t.continuity.worst;
  const sub = w.substitute ? names.get(w.substitute) ?? w.substitute : w.late_substitute ? `${names.get(w.late_substitute.employee_id) ?? w.late_substitute.employee_id} (arrives ${fmtDate(w.late_substitute.available_on)})` : "none";
  return (
    <Panel className={cn("crew-patch lift flex flex-col", primary && "team-main", selected && "glow-ai")}>
      <div className="team-composition">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">TEAM {t.id}</p>
          <p className="text-5xl font-bold text-navy tnum">{Math.round(t.fit)}<span className="text-2xl text-muted-foreground">%</span></p>
          <p className="text-xs text-muted-foreground" title="Fit provided by the service. No locally computed synergy is added.">team fit</p>
        </div>
        {ideal && <IdealBadge />}
      </div>
      <CrewOrbit members={t.members} teamId={t.id} />
      <div className="mt-4 space-y-3">
        {Object.entries(byRole).map(([role, ms]) => (
          <div key={role}>
            <SectionLabel>{role}</SectionLabel>
            <ul className="mt-1 space-y-1.5">{ms.map((m) => (
              <li key={m.employee_id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <Link to="/persona/$id" params={{ id: m.employee_id }} onClick={() => setProject({ teamId: t.id, teamArrival: false })} className="min-w-0 text-blue-200 underline decoration-line underline-offset-4 hover:text-navy" title={`View profile of ${m.nombre_completo}`}><b>{m.nombre_completo}</b> · <span className="tnum">{Math.round(m.score)}%</span></Link>
                <AvailabilityBadge value={m.disponibilidad} />
              </li>
            ))}</ul>
          </div>
        ))}
      </div>
      </div><div className="team-summary">
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
        <div><dt className="text-xs text-muted-foreground">Cost</dt>
          <dd className="flex flex-wrap items-center gap-1.5 font-semibold text-navy">{t.cost.value == null ? <span className="text-warn-ink">To be estimated</span> : <>{eur(t.cost.value)} <GreyTag>assumption</GreyTag></>}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Start</dt>
          <dd className="flex flex-wrap items-center gap-1.5 font-semibold text-navy">
            {t.start.status === "por confirmar" || !t.start.date
              ? <span className="text-warn-ink" title="Roll-off soon: under 3 months, no confirmed date">To be confirmed</span>
              : <>{fmtDate(t.start.date)}{t.start.status === "supuesto" && <GreyTag title={`Estimated date assuming the roll-off arrives in ${match.assumptions.rolloff_days} days`}>assumption</GreyTag>}</>}
          </dd></div>
      </dl>
      <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
        <RingGauge value={t.continuity.covered} total={t.continuity.total} size={64} />
        <div className="text-sm">
          <p className="font-semibold text-navy">Continuity · {t.continuity.pct}%</p>
          <p className="text-xs text-muted-foreground" title={`If ${names.get(w.employee_id) ?? w.employee_id} leaves, ${t.continuity.covered} of ${t.continuity.total} positions remain · substitute: ${sub}`}>↳ {t.continuity.covered}/{t.continuity.total} positions · {sub === "none" ? "no substitute" : sub}</p>
        </div>
      </div>
      {why ? <ExplainBlock title="Why this team" summary={why.summary} points={why.reasons} source={why.source} /> : explaining ? <ExplainSkeleton /> : null}
      <div className="mt-auto flex flex-wrap justify-end gap-2 pt-5">
        {onView && <OrbitButton variant="ghost" onClick={onView}>View team</OrbitButton>}
        <OrbitButton variant="ghost" onClick={onProposal}><FileText className="size-4" />Generate team proposal</OrbitButton>
        <OrbitButton onClick={onUse}>Compare scenarios</OrbitButton>
      </div>
      </div>
    </Panel>
  );
}
