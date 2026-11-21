// Pasos 7-10 en una llamada. Entrada: el plan (salida del LLM, paso 2) y, por rol, los perfiles candidatos
// que devuelven los pasos 5-6 (filtros duros + búsqueda híbrida en SQL). Sin LLM ni base de datos: puro y testeable.
import { fromLlmPlan, type LlmPlan, normalizeProfile } from "./contract.ts";
import { hardFilterReasons, rankRole, type ScoredCandidate, scoreCandidate, WEIGHTS, type Weights } from "./scoring.ts";
import { type Assumptions, buildTeams, scoreTeams, type SortBy, type TeamFilters, topTeams } from "./teams.ts";

export interface PipelineOptions {
  weights?: Weights; refYear?: number;
  top?: number; minScore?: number;                          // controles del ranking de perfiles (paso 8)
  poolSize?: number; beam?: number; maxExhaustive?: number; // paso 9
  assumptions?: Assumptions;                                // paso 10
  sortBy?: SortBy; filters?: TeamFilters; topTeams?: number; // Top 5 de equipos
}

export function runMatching(plan: LlmPlan, candidatesByRole: Record<string, unknown[]>, o: PipelineOptions = {}) {
  const { project, roles } = fromLlmPlan(plan);
  const eligible: Record<string, ScoredCandidate[]> = {};
  const excluded: Record<string, { employee_id: string; reasons: string[] }[]> = {};
  for (const r of roles) {
    eligible[r.role] = []; excluded[r.role] = [];
    for (const raw of candidatesByRole[r.role] ?? []) {
      const p = normalizeProfile(raw);
      const reasons = hardFilterReasons(p, r, project);
      if (reasons.length) excluded[r.role].push({ employee_id: p.employee_id, reasons });
      else eligible[r.role].push(scoreCandidate(p, r, project, o.refYear ?? 2026, o.weights ?? WEIGHTS));
    }
  }
  const slots = roles.map(({ role, count, plannedHours }) => ({ role, count, hours: plannedHours }));
  const combos = buildTeams(slots, eligible, { poolSize: o.poolSize, beam: o.beam, maxExhaustive: o.maxExhaustive });
  const teams = scoreTeams(combos, slots, eligible, project, o.assumptions ?? {});
  return {
    weights: o.weights ?? WEIGHTS,
    ranking: Object.fromEntries(roles.map((r) => [r.role, rankRole(eligible[r.role], { top: o.top ?? 5, minScore: o.minScore ?? 0 })])),
    excluded,
    teams_total: teams.length,
    top_teams: topTeams(teams, { sortBy: o.sortBy, filters: o.filters, top: o.topTeams ?? 5 }),
    teams,                                                  // todos los válidos: la UI reordena/filtra con topTeams()
  };
}
