// Pasos 7-10 en una llamada. Entrada: el plan (salida del LLM, paso 2) y, por rol, los perfiles candidatos
// que devuelven los pasos 5-6 (filtros duros + búsqueda híbrida en SQL). Sin LLM ni base de datos: puro y testeable.
import { fromLlmPlan, type LlmPlan, normalizeProfile } from "./contract.ts";
import { rankRole, type ScoredCandidate, scoreCandidate, WEIGHTS, type Weights } from "./scoring.ts";
import { type Assumptions, buildTeams, scoreTeams } from "./teams.ts";

export interface PipelineOptions {
  weights?: Weights; refYear?: number;
  top?: number; minScore?: number;                 // controles del ranking (paso 8)
  poolSize?: number; beam?: number; teams?: number; // paso 9
  assumptions?: Assumptions;                       // paso 10
}

export function runMatching(plan: LlmPlan, candidatesByRole: Record<string, unknown[]>, o: PipelineOptions = {}) {
  const { project, roles } = fromLlmPlan(plan);
  const scoredByRole: Record<string, ScoredCandidate[]> = {};
  for (const r of roles) {
    scoredByRole[r.role] = (candidatesByRole[r.role] ?? []).map((p) =>
      scoreCandidate(normalizeProfile(p), r, project, o.refYear ?? 2026, o.weights ?? WEIGHTS));
  }
  const slots = roles.map(({ role, count }) => ({ role, count }));
  const combos = buildTeams(slots, scoredByRole, { poolSize: o.poolSize ?? 10, beam: o.beam ?? 60, top: o.teams ?? 15 });
  return {
    weights: o.weights ?? WEIGHTS,
    ranking: Object.fromEntries(roles.map((r) => [r.role, rankRole(scoredByRole[r.role], { top: o.top ?? 5, minScore: o.minScore ?? 0 })])),
    teams: scoreTeams(combos, slots, scoredByRole, o.assumptions ?? {}, { poolSize: o.poolSize ?? 10 }),
  };
}
