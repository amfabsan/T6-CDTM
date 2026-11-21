// Pasos 9-10 · Equipos y su puntuación, según docs/ORBIT_AI_Rankings_y_Filtros.pdf.
// - Todas las combinaciones válidas si caben (≤ maxExhaustive); si no, beam search sobre el pool (8-10 por rol).
// - Una persona nunca ocupa dos plazas del mismo equipo (ni como sustituta); sí puede estar en equipos distintos.
// - Encaje, coste, inicio y continuidad ante una baja; orden por cualquiera de los cuatro y filtros inclusivos.
import type { Project } from "./contract.ts";
import type { ScoredCandidate } from "./scoring.ts";

export interface Slot { role: string; count: number; hours?: number | null }
/** Supuestos editables: el dataset no trae tarifas ni fechas. Lo que falte sale «por estimar» / «por confirmar». */
export interface Assumptions {
  hoursPerPerson?: number;                                   // si el rol no trae planned_hours
  ratePerHour?: number | Partial<Record<string, number>>;   // si el candidato no trae cost_per_hour: único o por seniority
}
export interface Team {
  id: string;                                                // IDs en el orden de los roles del plan, unidos por «+»
  members: { role: string; employee_id: string; nombre_completo: string; score: number; disponibilidad: string;
             available_on: string | null; cost: number | null }[];
  fit: number;                                               // encaje: media simple, sin redondear (la UI redondea)
  cost: { value: number | null; status: "estimado" | "por estimar"; is_illustrative: true };
  start: { date: string | null; status: "estimado" | "por confirmar" };
  continuity: {
    covered: number; total: number; pct: number;             // peor caso al retirar a cada integrante
    worst: { employee_id: string; role: string; substitute: string | null; late_substitute: { employee_id: string; available_on: string | null } | null } | null;
  };
  gaps: number;
}
export type SortBy = "fit" | "cost" | "start" | "risk";
export interface TeamFilters { minFit?: number; maxCost?: number; latestStart?: string; minContinuity?: number }

const byScore = (a: ScoredCandidate, b: ScoredCandidate) => b.score - a.score || a.employee_id.localeCompare(b.employee_id);
const choose = (n: number, k: number) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };

/** Paso 9 · Combinaciones válidas: exhaustivo si caben; si no, beam search quedándose con las `beam` mejores parciales. */
export function buildTeams(slots: Slot[], scoredByRole: Record<string, ScoredCandidate[]>,
                           opts: { poolSize?: number; beam?: number; maxExhaustive?: number } = {}): ScoredCandidate[][] {
  const { poolSize = 10, beam = 500, maxExhaustive = 20000 } = opts;
  const pools = Object.fromEntries(slots.map((s) => [s.role, [...(scoredByRole[s.role] ?? [])].sort(byScore).slice(0, poolSize)]));
  const combos = slots.reduce((n, s) => n * choose(pools[s.role].length, s.count), 1);
  const width = combos <= maxExhaustive ? Infinity : beam;
  const flat = slots.flatMap((s) => Array.from({ length: s.count }, () => s.role));

  // lastIdx por rol: en roles con varias plazas solo se avanza en el pool, así no salen permutaciones del mismo equipo.
  type State = { members: ScoredCandidate[]; lastIdx: Record<string, number>; sum: number };
  let states: State[] = [{ members: [], lastIdx: {}, sum: 0 }];
  for (const role of flat) {
    const cands = pools[role];
    const next: State[] = [];
    for (const st of states) {
      const used = new Set(st.members.map((m) => m.employee_id));
      for (let i = (st.lastIdx[role] ?? -1) + 1; i < cands.length; i++) {
        if (used.has(cands[i].employee_id)) continue;
        next.push({ members: [...st.members, cands[i]], lastIdx: { ...st.lastIdx, [role]: i }, sum: st.sum + cands[i].score });
      }
    }
    states = width === Infinity ? next : next.sort((a, b) => b.sum - a.sum).slice(0, width);
  }
  return states.map((s) => s.members);
}

/** Fecha en que puede empezar: la confirmada; si está En banca y no hay fecha, la mínima del proyecto. Roll-off sin fecha = desconocida. */
const availableOn = (m: ScoredCandidate, prj: Project) =>
  m.available_on ?? (m.disponibilidad === "En banca" ? prj.earliestStart : null);
const maxDate = (ds: string[]) => ds.reduce((a, b) => (b > a ? b : a));

/** Paso 10 · Puntúa cada equipo. `eligibleByRole` = todos los elegibles por rol (sustitutos posibles). */
export function scoreTeams(combos: ScoredCandidate[][], slots: Slot[], eligibleByRole: Record<string, ScoredCandidate[]>,
                           prj: Project, a: Assumptions = {}): Team[] {
  const hours = Object.fromEntries(slots.map((s) => [s.role, s.hours ?? a.hoursPerPerson ?? null]));
  const rate = (m: ScoredCandidate) =>
    m.cost_per_hour ?? (typeof a.ratePerHour === "number" ? a.ratePerHour : a.ratePerHour?.[m.nivel_seniority]) ?? null;
  const total = combos[0]?.length ?? 0;

  return combos.map((members): Team => {
    const ids = new Set(members.map((m) => m.employee_id));
    const dates = members.map((m) => availableOn(m, prj));
    const start = dates.every((d) => d) ? maxDate([...(dates as string[]), ...(prj.earliestStart ? [prj.earliestStart] : [])]) : null;
    const costs = members.map((m) => { const r = rate(m), h = hours[m.role]; return r != null && h != null ? r * h : null; });

    // Continuidad: se retira a cada integrante; su plaza se cubre con alguien elegible del mismo rol, fuera del equipo,
    // disponible como tarde en la fecha de inicio original del equipo.
    let worst: Team["continuity"]["worst"] = null, covered = total;
    for (const m of members) {
      const subs = (eligibleByRole[m.role] ?? []).filter((c) => !ids.has(c.employee_id))
        .map((c) => ({ c, d: availableOn(c, prj) }))
        .sort((x, y) => (x.d ?? "9999").localeCompare(y.d ?? "9999") || byScore(x.c, y.c));
      const inTime = subs.find(({ d }) => start == null || (d != null && d <= start));
      const cov = inTime ? total : total - 1;
      if (!worst || cov < covered) {
        covered = cov;
        worst = { employee_id: m.employee_id, role: m.role, substitute: inTime?.c.employee_id ?? null,
                  late_substitute: !inTime && subs[0] ? { employee_id: subs[0].c.employee_id, available_on: subs[0].d } : null };
      }
    }
    const costKnown = costs.every((c) => c != null);
    return {
      id: members.map((m) => m.employee_id).join("+"),
      members: members.map((m, i) => ({ role: m.role, employee_id: m.employee_id, nombre_completo: m.nombre_completo, score: m.score,
                                        disponibilidad: m.disponibilidad, available_on: dates[i], cost: costs[i] })),
      fit: members.reduce((s, m) => s + m.score, 0) / members.length,
      cost: { value: costKnown ? costs.reduce((s: number, c) => s + c!, 0) : null, status: costKnown ? "estimado" : "por estimar", is_illustrative: true },
      start: { date: start, status: start ? "estimado" : "por confirmar" },
      continuity: { covered, total, pct: total ? Math.round((covered / total) * 100) : 0, worst },
      gaps: members.reduce((s, m) => s + m.gaps.length, 0),
    };
  });
}

/** Orden por criterio; empate → mayor encaje → ID. Los datos pendientes (coste/inicio nulos) van al final. */
export function sortTeams(teams: Team[], by: SortBy = "fit"): Team[] {
  const key = (t: Team): number | string | null =>
    by === "cost" ? t.cost.value : by === "start" ? t.start.date : by === "risk" ? -t.continuity.covered / (t.continuity.total || 1) : -t.fit;
  return [...teams].sort((x, y) => {
    const a = key(x), b = key(y);
    if (a == null || b == null) { if (a != b) return a == null ? 1 : -1; }
    else if (a !== b) return a < b ? -1 : 1;
    return y.fit - x.fit || x.id.localeCompare(y.id);
  });
}

/** Top N tras filtros inclusivos. Equipos cuyo dato pendiente afecta a un filtro activo van aparte, en `pending`. */
export function topTeams(teams: Team[], opts: { sortBy?: SortBy; filters?: TeamFilters; top?: number } = {}) {
  const { sortBy = "fit", filters: f = {}, top = 5 } = opts;
  const ok: Team[] = [], pending: Team[] = [];
  for (const t of teams) {
    if (f.minFit != null && t.fit < f.minFit - 1e-9) continue;
    if (f.minContinuity != null && t.continuity.pct < f.minContinuity) continue;
    const costPending = f.maxCost != null && t.cost.value == null, startPending = f.latestStart != null && t.start.date == null;
    if (costPending || startPending) { pending.push(t); continue; }
    if (f.maxCost != null && t.cost.value! > f.maxCost) continue;
    if (f.latestStart != null && t.start.date! > f.latestStart) continue;
    ok.push(t);
  }
  return { cumplen: ok.length, items: sortTeams(ok, sortBy).slice(0, top), pending: sortTeams(pending, sortBy) };
}
