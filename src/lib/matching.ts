import { useQuery, useQueryClient } from "@tanstack/react-query";
import { explainRecommendations } from "./api";
import mock from "@/mocks/matching.json";
import { useProject } from "./project-store";
import type { BreakdownKey, ExplainResponse, MatchCandidate, MatchOptions, MatchResponse, MatchTeam } from "./types";

const MATCHING_URL = ((import.meta.env["VITE_MATCHING_API_URL"] as string | undefined) || "https://t6-cdtm.onrender.com").replace(/\/$/, "");

/** The free Render plan sleeps after 15 min idle: the first POST /match can take ~75 s. */
const MATCH_TIMEOUT_MS = 120_000;

/** 409 from /match: the project requirements were not confirmed (step 4 of the workflow). */
export class RequisitosNoConfirmadosError extends Error {
  constructor() {
    super("requisitos_no_confirmados");
  }
}

export const TOTAL_AVAILABLE = 34003;

export const BREAKDOWN_LABELS: Record<BreakdownKey, string> = {
  mandatory: "Mandatory",
  evidence: "Project evidence",
  sectorRole: "Sector and role",
  seniority: "Seniority and years",
  desirable: "Desirable",
  langCert: "Languages and certifications",
  recency: "Recent use",
};
export const BREAKDOWN_ORDER = Object.keys(BREAKDOWN_LABELS) as BreakdownKey[];

export interface MatchResult { data: MatchResponse; simulated: boolean }

/** Simulates the service when it is not available (only for the mock fallback). */
function simulate(options: MatchOptions): MatchResponse {
  const base = structuredClone(mock as unknown as MatchResponse);
  const rates = { ...base.assumptions.rate_per_hour, ...options.rate_per_hour };
  const hours = options.hours_per_person ?? base.assumptions.hours_per_person;
  const rolloff = options.rolloff_days ?? base.assumptions.rolloff_days;
  base.assumptions = { ...base.assumptions, rate_per_hour: rates, hours_per_person: hours, rolloff_days: rolloff };
  const seniority = new Map(allCandidates(base).map((c) => [c.employee_id, c.nivel_seniority]));
  const fix = (t: MatchTeam) => {
    t.members.forEach((m) => { if (m.cost != null) m.cost = (rates[seniority.get(m.employee_id) ?? "Mid"] ?? 45) * hours; });
    if (t.cost.value != null) t.cost.value = t.members.reduce((s, m) => s + (m.cost ?? 0), 0);
  };
  base.teams.forEach(fix); base.top_teams.items.forEach(fix); base.top_teams.pending.forEach(fix);
  return base;
}

/** POST /match (timeout 120 s). 409 throws RequisitosNoConfirmadosError; any other failure falls back to src/mocks/matching.json. */
export async function fetchMatching(projectId: string, options: MatchOptions = {}): Promise<MatchResult> {
  if (MATCHING_URL) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), MATCH_TIMEOUT_MS);
      try {
        const res = await fetch(`${MATCHING_URL}/match`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId, options }),
          signal: ctrl.signal,
        });
        if (res.status === 409) throw new RequisitosNoConfirmadosError();
        if (!res.ok) throw new Error(`match ${res.status}`);
        return { data: (await res.json()) as MatchResponse, simulated: false };
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      if (e instanceof RequisitosNoConfirmadosError) throw e;
      console.warn("Matching unavailable, using simulated data", e);
    }
  }
  await new Promise((r) => setTimeout(r, 400));
  return { data: simulate(options), simulated: true };
}

/** Shared store for steps 2–4: fetched once per project and cached. */
export function useMatching() {
  const { projectId } = useProject();
  const pid = projectId ?? "mock-project";
  return useQuery({ queryKey: ["match", pid], queryFn: () => fetchMatching(pid), staleTime: Infinity, gcTime: Infinity, retry: false });
}

/** Re-runs /match with new options and replaces the shared store. */
export function useRematch() {
  const qc = useQueryClient();
  const { projectId } = useProject();
  const pid = projectId ?? "mock-project";
  return async (options: MatchOptions) => {
    const r = await fetchMatching(pid, options);
    qc.setQueryData(["match", pid], r);
    return r;
  };
}

/** explain-recommendations, called once per matching load. `enabled=false` only reads the cache. Never throws into the UI. */
export function useExplanations(enabled = true) {
  const { data: match, dataUpdatedAt } = useMatching();
  const { projectId } = useProject();
  const q = useQuery<ExplainResponse | null>({
    queryKey: ["explain", projectId ?? "mock-project", dataUpdatedAt],
    queryFn: () => explainRecommendations(match!.data).catch(() => null),
    enabled: enabled && !!match,
    staleTime: Infinity, gcTime: Infinity, retry: false,
  });
  const data = q.data && !q.data.error ? q.data : null;
  return { data, loading: q.isLoading && enabled && !!match };
}

/** Filter by min fit, sort by score desc (tie → employee_id), take Top N. */
export function selectTop(items: MatchCandidate[], minFit: number, topN: number) {
  return items
    .filter((c) => c.score >= minFit)
    .sort((a, b) => b.score - a.score || a.employee_id.localeCompare(b.employee_id))
    .slice(0, topN);
}

export function allCandidates(d: MatchResponse) {
  const m = new Map<string, MatchCandidate>();
  Object.values(d.ranking).forEach((r) => r.items.forEach((c) => m.has(c.employee_id) || m.set(c.employee_id, c)));
  d.members_detail.forEach((c) => m.has(c.employee_id) || m.set(c.employee_id, c));
  return [...m.values()];
}

export type TeamSort = "fit" | "cost" | "start" | "continuity";
export interface TeamFilters { maxBudget: number | null; minFit: number; latestStart: string | null; minContinuity: number }

/** Filters (inclusive) + sort + max 5. Teams whose pending value blocks an active filter go to `pending`. */
export function selectTeams(teams: MatchTeam[], f: TeamFilters, sort: TeamSort) {
  const shown: MatchTeam[] = [];
  const pending: MatchTeam[] = [];
  for (const t of teams) {
    if (t.fit < f.minFit || t.continuity.pct < f.minContinuity) continue;
    const budgetPending = f.maxBudget != null && t.cost.value == null;
    const startPending = f.latestStart != null && t.start.date == null;
    if (budgetPending || startPending) { pending.push(t); continue; }
    if (f.maxBudget != null && (t.cost.value ?? 0) > f.maxBudget) continue;
    if (f.latestStart != null && (t.start.date ?? "") > f.latestStart) continue;
    shown.push(t);
  }
  const big = Number.POSITIVE_INFINITY;
  const key: Record<TeamSort, (t: MatchTeam) => number> = {
    fit: (t) => -t.fit,
    cost: (t) => t.cost.value ?? big,
    start: (t) => (t.start.date ? Date.parse(t.start.date) : big),
    continuity: (t) => -t.continuity.pct,
  };
  const cmp = (a: MatchTeam, b: MatchTeam) => key[sort](a) - key[sort](b) || b.fit - a.fit || a.id.localeCompare(b.id);
  return { shown: shown.sort(cmp).slice(0, 5), pending: pending.sort(cmp) };
}
