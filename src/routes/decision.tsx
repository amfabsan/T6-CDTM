import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Coins, Crosshair, Gauge, ShieldAlert, SlidersHorizontal, Trophy, Users, X } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { DataTag, eur, formatNum, OrbitButton, Panel, SectionLabel, SimPill } from "@/components/orbit/primitives";
import { saveScenarioAssumptions } from "@/lib/api";
import { useMatching, useRematch } from "@/lib/matching";
import { teamNumbers } from "@/lib/team-presentation";
import { useProject } from "@/lib/project-store";
import { rebalance, scenarios, WEIGHT_KEYS, type Weights } from "@/lib/scenarios";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/decision")({
  head: () => ({
    meta: [
      { title: "Decision · ORBIT AI" },
      { name: "description", content: "Internal, external or hybrid: compare cost, time, coverage and risk with your assumptions." },
      { property: "og:title", content: "Decision · ORBIT AI" },
      { property: "og:description", content: "Internal, external or hybrid: compare cost, time, coverage and risk with your assumptions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StepDecision,
});

const LEVELS = ["Trainee", "Junior", "Mid", "Senior", "Lead", "Principal"];
const DEFAULT_RATES: Record<string, number> = { Trainee: 20, Junior: 30, Mid: 45, Senior: 60, Lead: 75, Principal: 90 };
const Tag = () => <span className="border border-line bg-surface-2 px-1 py-px text-[10px] font-medium text-muted-foreground">Illustrative assumption</span>;

function StepDecision() {
  const { data: match } = useMatching();
  const { teamId, projectId } = useProject();
  const rematch = useRematch();
  const a0 = match?.data.assumptions;
  const [rates, setRates] = useState<Record<string, number>>(() => ({ ...DEFAULT_RATES, ...a0?.rate_per_hour }));
  const [hours, setHours] = useState(a0?.hours_per_person ?? 160);
  const [rolloff, setRolloff] = useState(a0?.rolloff_days ?? 45);
  const [extRate, setExtRate] = useState(85);
  const [recruit, setRecruit] = useState(6000);
  const [intDays, setIntDays] = useState(10);
  const [hireDays, setHireDays] = useState(60);
  const [onbDays, setOnbDays] = useState(15);
  const [w, setW] = useState<Weights>({ cost: 30, time: 20, coverage: 25, availability: 15, risk: 10 });
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const team = match ? match.data.teams.find((t) => t.id === teamId) ?? match.data.top_teams.items[0] ?? match.data.teams[0] : undefined;
  /** Visible number of the team: position in the service's team list. */
  const numOf = useMemo(() => teamNumbers(match?.data.teams ?? []), [match]);

  // Debounced: save scenario_assumptions row + re-run /match, replacing the store.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const id = setTimeout(async () => {
      setStatus("saving");
      try {
        const rateValues = Object.values(rates);
        await saveScenarioAssumptions({
          project_id: projectId ?? "mock-project",
          rates_by_seniority: rates,
          internal_rate_per_hour: rateValues.length ? rateValues.reduce((s, v) => s + v, 0) / rateValues.length : 0,
          external_rate_per_hour: extRate,
          recruitment_cost: recruit,
          hours_per_person: hours,
          rolloff_days: rolloff,
          internal_mobilization_days: intDays,
          hiring_days: hireDays,
          onboarding_days: onbDays,
          project_days: Math.round(hours / 8),
          weights: { cost: w.cost / 100, time: w.time / 100, coverage: w.coverage / 100, availability: w.availability / 100, risk: w.risk / 100 },
          is_illustrative: true,
        }).catch(() => {});
        await rematch({ rate_per_hour: rates, hours_per_person: hours, rolloff_days: rolloff });
        setStatus("idle");
      } catch { setStatus("error"); }
    }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates, hours, rolloff, extRate, recruit, intDays, hireDays, onbDays, w]);

  const sc = useMemo(() => (team ? scenarios(team, { external_rate_per_hour: extRate, hours_per_person: hours, recruitment_cost: recruit, internal_onboarding_days: intDays, external_hiring_days: hireDays, onboarding_days: onbDays, rolloff_days: rolloff }, w) : []), [team, extRate, hours, recruit, intDays, hireDays, onbDays, rolloff, w]);
  const winner = sc.reduce<(typeof sc)[number] | null>((b, s) => (!b || s.score > b.score ? s : b), null);
  const why = winner && {
    Internal: "the talent is already in the organization, with proven evidence and no recruitment cost.",
    External: "it fills every position faster with your current weights.",
    Hybrid: "it combines people already on bench with external reinforcement where there is roll-off.",
  }[winner.key];

  const num = (label: string, v: number, set: (n: number) => void, unit = "") => (
    <label className="block text-sm">
      <span className="flex items-center justify-between gap-2"><span>{label}</span><Tag /></span>
      <span className="mt-2 flex items-center gap-3"><input aria-label={label} type="range" min={0} max={Math.max(v * 2, unit === "€" ? 20000 : unit === "h" ? 1000 : 180)} value={v} onChange={(e) => set(+e.target.value)} className="min-w-0 flex-1" /><input aria-label={`${label} value`} type="number" min={0} value={v} onChange={(e) => set(+e.target.value)} className="w-24 border border-line bg-surface px-3 py-1.5 outline-none focus:border-blue tnum" />{unit && <span className="text-xs text-muted-foreground">{unit}</span>}</span>
    </label>
  );

  return (
    <AppShell>
      <p className="mission-kicker">04 / Scenarios</p>
      <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="mission-title">Scenario comparison</h1>{match?.simulated && <SimPill />}
        {status === "saving" && <span className="text-sm text-muted-foreground" role="status">Recalculating…</span>}
        {status === "error" && <span className="text-sm text-danger" role="alert">Could not recalculate. Keeping the previous data.</span>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><Link to="/equipos" className="text-xs text-blue-200">{team ? `← Change team ${numOf(team)}` : "← Change team"}</Link><OrbitButton variant="ghost" onClick={() => setShowAssumptions(true)}><SlidersHorizontal className="size-4" />Assumptions</OrbitButton></div>

      <div className="mt-10">
        {showAssumptions && <div onKeyDown={e => e.key === "Escape" && setShowAssumptions(false)}><OrbitButton variant="ghost" className="mission-backdrop rounded-none" onClick={() => setShowAssumptions(false)} aria-label="Close assumptions" /><aside className="mission-drawer space-y-5" role="dialog" aria-modal aria-label="Assumptions">
          <div className="flex items-center justify-between"><h2 className="text-2xl">Assumptions</h2><OrbitButton variant="ghost" className="size-9 p-0" autoFocus onClick={() => setShowAssumptions(false)} aria-label="Close assumptions"><X className="size-4" /></OrbitButton></div>
          <div>
            <SectionLabel>Internal rate by seniority (€/h)</SectionLabel>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {LEVELS.map((l) => (
                <label key={l} className="text-xs">{l}
                  <input type="number" min={0} value={rates[l] ?? 0} onChange={(e) => setRates({ ...rates, [l]: +e.target.value })} className="mt-1 w-full border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-blue tnum" />
                </label>
              ))}
            </div>
            <div className="mt-1"><Tag /></div>
          </div>
          {num("Planned hours per person", hours, setHours, "h")}
          {num("Days until a roll-off arrives", rolloff, setRolloff, "days")}
          {num("External rate (€/h)", extRate, setExtRate, "€/h")}
          {num("Recruitment cost (€)", recruit, setRecruit, "€")}
          {num("Days to onboard an internal person", intDays, setIntDays, "days")}
          {num("External hiring days", hireDays, setHireDays, "days")}
          {num("Onboarding days", onbDays, setOnbDays, "days")}
          <div>
            <span className="flex items-center justify-between"><SectionLabel>Weights (add up to 100%)</SectionLabel><Tag /></span>
            {WEIGHT_KEYS.map((k) => (
              <label key={k} className="mt-3 block text-sm capitalize">
                <span className="flex justify-between"><span>{k}</span><b className="tnum text-navy">{w[k]} %</b></span>
                <input type="range" min={0} max={100} value={w[k]} onChange={(e) => setW(rebalance(w, k, +e.target.value))} className="w-full accent-[var(--blue)]" />
              </label>
            ))}
          </div>
        </aside></div>}

        <div className="grid items-start gap-6 md:grid-cols-3">
          {sc.map((s) => {
            const win = s === winner;
            const metricIcons = [Coins, Clock, Crosshair, Users, ShieldAlert, Gauge];
            let metricIndex = 0;
            const row = (label: string, value: string, kind: "dato" | "supuesto" | "calculado", extra?: "supuesto") => (
              <div><dt className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{(() => { const Icon = metricIcons[metricIndex++]; return Icon ? <Icon className="size-3.5" /> : null; })()}{label} <DataTag kind={kind} />{extra && <DataTag kind={extra} />}</dt><dd className="mt-1 text-3xl font-semibold text-navy tnum">{value}</dd></div>
            );
            return (
              <Panel key={s.key} className={cn("launch-pad flex flex-col", win && "launch-pad-winner")}>
                <svg viewBox="0 0 240 140" className="launch-art" aria-hidden="true"><circle cx="120" cy="70" r="50" strokeDasharray="3 6" /><path d="M64 97H176 M80 97V68H104V97 M108 97V49H132V97 M136 97V29H160V97" /></svg>
                <div className="flex items-center justify-between"><h3 className="text-3xl">{s.key}</h3>{win && <Trophy className="size-5 text-gold" aria-label="Recommended scenario" />}</div>
                <dl className="mt-5 space-y-4">
                  {s.cost == null
                    ? <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground">Total cost <DataTag kind="supuesto" /></dt><dd className="text-xl font-bold text-warn-ink">To be estimated</dd></div>
                    : row("Total cost", eur(s.cost), s.key === "Internal" ? "dato" : "calculado", "supuesto")}
                  {row("Time to onboard", `${formatNum(s.days)} days`, "supuesto")}
                  {row("Requirement coverage", `${Math.round(s.coverage)} %`, s.key === "Internal" ? "dato" : "supuesto")}
                  {row("Availability", `${Math.round(s.availability)} %`, s.key === "Internal" ? "dato" : "supuesto")}
                  {row("Risk", `${Math.round(s.risk)} / 100`, "calculado")}
                  {row("Score", `${s.score}`, "calculado")}
                </dl>
                {win && <p className="mt-6 text-xs text-blue-200" title={why ?? ""}><b className="text-blue-200">Why it is recommended</b><br />{winner?.key === "Internal" ? "Internal talent with proven evidence." : winner?.key === "External" ? "Full coverage according to the defined priorities." : "Internal talent plus external reinforcement."}</p>}
              </Panel>
            );
          })}
          {!team && <p className="text-muted-foreground">Choose a team in step 3.</p>}
        </div>
      </div>
    </AppShell>
  );
}
