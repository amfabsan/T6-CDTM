import type { MatchTeam } from "./types";

export const WEIGHT_KEYS = ["coste", "tiempo", "cobertura", "disponibilidad", "riesgo"] as const;
export type WeightKey = (typeof WEIGHT_KEYS)[number];
export type Weights = Record<WeightKey, number>;

/** Sets one weight and rescales the others so the total stays exactly 100. */
export function rebalance(w: Weights, key: WeightKey, value: number): Weights {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const others = WEIGHT_KEYS.filter((k) => k !== key);
  const rest = others.reduce((s, k) => s + w[k], 0);
  const out = { ...w, [key]: v } as Weights;
  let left = 100 - v;
  others.forEach((k, i) => {
    const share = i === others.length - 1 ? left : Math.round(rest ? ((100 - v) * w[k]) / rest : (100 - v) / others.length);
    out[k] = Math.max(0, Math.min(left, share));
    left -= out[k];
  });
  return out;
}

export interface ScenarioInputs {
  external_rate_per_hour: number; hours_per_person: number; recruitment_cost: number;
  internal_onboarding_days: number; external_hiring_days: number; onboarding_days: number; rolloff_days: number;
}
export interface Scenario { key: "Interno" | "Externo" | "Híbrido"; cost: number | null; days: number; coverage: number; availability: number; risk: number; score: number }

/** Compares the three options for the chosen team. Internal cost comes from the service as-is. */
export function scenarios(team: MatchTeam, a: ScenarioInputs, w: Weights): Scenario[] {
  const n = team.members.length;
  const bench = team.members.filter((m) => m.disponibilidad === "En banca");
  const notBench = n - bench.length;
  const extPerson = a.external_rate_per_hour * a.hours_per_person + a.recruitment_cost;
  const extDays = a.external_hiring_days + a.onboarding_days;
  const intDays = a.internal_onboarding_days + (notBench ? a.rolloff_days : 0);
  const benchCost = bench.every((m) => m.cost != null) ? bench.reduce((s, m) => s + (m.cost ?? 0), 0) : null;
  const raw = [
    { key: "Interno" as const, cost: team.cost.value, days: intDays, coverage: team.fit, availability: (bench.length / n) * 100, risk: Math.min(100, team.gaps * 15 + notBench * 15 + (100 - team.continuity.pct) / 2) },
    { key: "Externo" as const, cost: extPerson * n, days: extDays, coverage: 75, availability: 100, risk: 55 },
    { key: "Híbrido" as const, cost: benchCost == null ? null : benchCost + extPerson * notBench, days: notBench ? Math.max(a.internal_onboarding_days, extDays) : a.internal_onboarding_days, coverage: (team.fit * bench.length + 75 * notBench) / n, availability: 100, risk: Math.min(100, team.gaps * 10 + notBench * 20) },
  ];
  const costs = raw.map((r) => r.cost).filter((c): c is number => c != null);
  const minCost = Math.min(...costs), minDays = Math.min(...raw.map((r) => r.days));
  return raw.map((r) => {
    const parts = {
      coste: r.cost == null ? 0 : minCost / r.cost,
      tiempo: minDays / Math.max(1, r.days),
      cobertura: r.coverage / 100,
      disponibilidad: r.availability / 100,
      riesgo: 1 - r.risk / 100,
    };
    const score = WEIGHT_KEYS.reduce((s, k) => s + parts[k] * w[k], 0);
    return { ...r, score: Math.round(score) };
  });
}
