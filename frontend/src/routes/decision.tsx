import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { AppShell } from "@/components/orbit/AppShell";
import { DataTag, eur, formatEs, Panel, SectionLabel, SimPill } from "@/components/orbit/primitives";
import { saveScenarioAssumptions } from "@/lib/api";
import { useMatching, useRematch } from "@/lib/matching";
import { useProject } from "@/lib/project-store";
import { rebalance, scenarios, WEIGHT_KEYS, type Weights } from "@/lib/scenarios";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/decision")({
  head: () => ({
    meta: [
      { title: "Decisión · ORBIT AI" },
      { name: "description", content: "Interno, externo o híbrido: compara coste, tiempo, cobertura y riesgo con tus supuestos." },
      { property: "og:title", content: "Decisión · ORBIT AI" },
      { property: "og:description", content: "Interno, externo o híbrido: compara coste, tiempo, cobertura y riesgo con tus supuestos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StepDecision,
});

const LEVELS = ["Trainee", "Junior", "Mid", "Senior", "Lead", "Principal"];
const DEFAULT_RATES: Record<string, number> = { Trainee: 20, Junior: 30, Mid: 45, Senior: 60, Lead: 75, Principal: 90 };
const Tag = () => <span className="border border-line bg-surface-2 px-1 py-px text-[10px] font-medium text-muted-foreground">Supuesto ilustrativo</span>;

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
  const [w, setW] = useState<Weights>({ coste: 30, tiempo: 20, cobertura: 25, disponibilidad: 15, riesgo: 10 });
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const team = match ? match.data.teams.find((t) => t.id === teamId) ?? match.data.top_teams.items[0] ?? match.data.teams[0] : undefined;

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
          weights: { cost: w.coste / 100, time: w.tiempo / 100, coverage: w.cobertura / 100, availability: w.disponibilidad / 100, risk: w.riesgo / 100 },
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
    Interno: "el talento ya está en casa, con evidencia demostrada y sin coste de selección.",
    Externo: "cubre todas las plazas en menos tiempo con tus pesos actuales.",
    Híbrido: "combina a quien ya está en banca con refuerzo externo donde hay roll-off.",
  }[winner.key];

  const num = (label: string, v: number, set: (n: number) => void, unit = "") => (
    <label className="block text-sm">
      <span className="flex items-center justify-between gap-2"><span>{label}</span><Tag /></span>
      <span className="mt-1 flex items-center gap-2"><input type="number" min={0} value={v} onChange={(e) => set(+e.target.value)} className="w-full border border-line bg-surface px-3 py-1.5 outline-none focus:border-blue tnum" />{unit && <span className="text-xs text-muted-foreground">{unit}</span>}</span>
    </label>
  );

  return (
    <AppShell>
      <p className="text-sm text-muted-foreground">Paso 4 · Decisión</p>
      <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="text-4xl">La decisión</h1>{match?.simulated && <SimPill />}
        {status === "saving" && <span className="text-sm text-muted-foreground" role="status">Recalculando…</span>}
        {status === "error" && <span className="text-sm text-danger" role="alert">No se pudo recalcular. Se mantienen los datos anteriores.</span>}
      </div>
      {team && winner && <p className="mt-3 text-lg">Con el equipo <b className="text-navy">{team.id}</b> y tus supuestos, <b className="text-blue">{winner.key} gana con {winner.score} puntos.</b> <Link to="/equipos" className="text-sm text-blue hover:underline">Cambiar equipo</Link></p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Panel className="h-fit space-y-5">
          <h2 className="text-xl">Supuestos</h2>
          <div>
            <SectionLabel>Tarifa interna por seniority (€/h)</SectionLabel>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {LEVELS.map((l) => (
                <label key={l} className="text-xs">{l}
                  <input type="number" min={0} value={rates[l] ?? 0} onChange={(e) => setRates({ ...rates, [l]: +e.target.value })} className="mt-1 w-full border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-blue tnum" />
                </label>
              ))}
            </div>
            <div className="mt-1"><Tag /></div>
          </div>
          {num("Horas planificadas por persona", hours, setHours, "h")}
          {num("Días hasta que llega un Roll-off", rolloff, setRolloff, "días")}
          {num("Tarifa externa (€/h)", extRate, setExtRate, "€/h")}
          {num("Coste de selección (€)", recruit, setRecruit, "€")}
          {num("Días hasta incorporar a alguien interno", intDays, setIntDays, "días")}
          {num("Días de contratación externa", hireDays, setHireDays, "días")}
          {num("Días de onboarding", onbDays, setOnbDays, "días")}
          <div>
            <span className="flex items-center justify-between"><SectionLabel>Pesos (suman 100 %)</SectionLabel><Tag /></span>
            {WEIGHT_KEYS.map((k) => (
              <label key={k} className="mt-3 block text-sm capitalize">
                <span className="flex justify-between"><span>{k}</span><b className="tnum text-navy">{w[k]} %</b></span>
                <input type="range" min={0} max={100} value={w[k]} onChange={(e) => setW(rebalance(w, k, +e.target.value))} className="w-full accent-[var(--blue)]" />
              </label>
            ))}
          </div>
        </Panel>

        <div className="grid items-start gap-4 md:grid-cols-3">
          {sc.map((s) => {
            const win = s === winner;
            const row = (label: string, value: string, kind: "dato" | "supuesto" | "calculado", extra?: "supuesto") => (
              <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground">{label} <DataTag kind={kind} />{extra && <DataTag kind={extra} />}</dt><dd className="text-xl font-bold text-navy tnum">{value}</dd></div>
            );
            return (
              <Panel key={s.key} className={cn("flex flex-col", win && "border-t-4 border-t-gold shadow-lg")}>
                <div className="flex items-center justify-between"><h3 className="text-2xl">{s.key}</h3>{win && <Trophy className="size-5 text-gold" aria-label="Ganador" />}</div>
                <dl className="mt-5 space-y-4">
                  {s.cost == null
                    ? <div><dt className="flex items-center gap-1.5 text-xs text-muted-foreground">Coste total <DataTag kind="supuesto" /></dt><dd className="text-xl font-bold text-warn-ink">Por estimar</dd></div>
                    : row("Coste total", eur(s.cost), s.key === "Interno" ? "dato" : "calculado", "supuesto")}
                  {row("Tiempo hasta incorporación", `${formatEs(s.days)} días`, "supuesto")}
                  {row("Cobertura de requisitos", `${Math.round(s.coverage)} %`, s.key === "Interno" ? "dato" : "supuesto")}
                  {row("Disponibilidad", `${Math.round(s.availability)} %`, s.key === "Interno" ? "dato" : "supuesto")}
                  {row("Riesgo", `${Math.round(s.risk)} / 100`, "calculado")}
                  {row("Score", `${s.score}`, "calculado")}
                </dl>
                {win && <p className="mt-6 text-sm"><b className="text-blue">Por qué gana:</b> {why}</p>}
              </Panel>
            );
          })}
          {!team && <p className="text-muted-foreground">Elige un equipo en el paso 3.</p>}
        </div>
      </div>
    </AppShell>
  );
}
