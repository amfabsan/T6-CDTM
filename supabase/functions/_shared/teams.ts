// Pasos 9-10 · Equipos por beam search (sustituye a la búsqueda exhaustiva de legacy/teamBuilder.ts) y su puntuación.
// Una persona puede repetirse entre equipos, pero nunca en dos huecos del mismo equipo.
import type { ScoredCandidate } from "./scoring.ts";

export interface Slot { role: string; count: number }
/** Supuestos editables (el dataset no trae tarifas ni fechas). Lo que falte sale como «por estimar» / «por confirmar». */
export interface Assumptions {
  ratePerHour?: number | Partial<Record<string, number>>;  // €/h, único o por seniority
  hoursPerPerson?: number;                                  // horas planificadas por persona
  startDaysEnBanca?: number;                                // días hasta incorporar a alguien En banca
}
export interface Team {
  id: string;                                               // estable: IDs ordenados
  members: { role: string; employee_id: string; nombre_completo: string; score: number; disponibilidad: string; nivel_seniority: string }[];
  fit: number;                                              // encaje: media de los scores (0-100)
  continuity: { pct: number; worst: { employee_id: string; role: string; substitute: string | null } | null };
  cost: { value: number | null; status: "estimado" | "por estimar"; is_illustrative: true };
  start: { day: number | null; status: "estimado" | "por confirmar"; is_illustrative: true };
  gaps: number;                                             // nº de gaps de sus integrantes
}

const byScore = (a: ScoredCandidate, b: ScoredCandidate) => b.score - a.score || a.employee_id.localeCompare(b.employee_id);

/** Paso 9 · Beam search hueco a hueco sobre el pool (8-10 mejores por rol). Devuelve hasta `top` combinaciones. */
export function buildTeams(slots: Slot[], scoredByRole: Record<string, ScoredCandidate[]>,
                           opts: { poolSize?: number; beam?: number; top?: number } = {}): ScoredCandidate[][] {
  const { poolSize = 10, beam = 60, top = 15 } = opts;
  const flat = slots.flatMap((s) => Array.from({ length: s.count }, () => s.role));
  const pools = Object.fromEntries(slots.map((s) => [s.role, [...(scoredByRole[s.role] ?? [])].sort(byScore).slice(0, poolSize)]));

  // lastIdx por rol: en roles con varios huecos solo se avanza en el pool, así no salen permutaciones del mismo equipo.
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
    states = next.sort((a, b) => b.sum - a.sum).slice(0, beam);
  }
  return states.slice(0, top).map((s) => s.members);
}

/** Paso 10 · Encaje, continuidad ante una baja, coste e inicio. Orden inicial: encaje (empate → ID estable). */
export function scoreTeams(teams: ScoredCandidate[][], slots: Slot[], scoredByRole: Record<string, ScoredCandidate[]>,
                           a: Assumptions = {}, opts: { poolSize?: number } = {}): Team[] {
  const { poolSize = 10 } = opts;
  const pools = Object.fromEntries(slots.map((s) => [s.role, [...(scoredByRole[s.role] ?? [])].sort(byScore).slice(0, poolSize)]));
  const rate = (m: ScoredCandidate) => (typeof a.ratePerHour === "number" ? a.ratePerHour : a.ratePerHour?.[m.nivel_seniority]);

  return teams.map((members): Team => {
    const ids = new Set(members.map((m) => m.employee_id));
    // Continuidad: se retira a cada integrante; su rol sigue cubierto si hay un sustituto del pool fuera del equipo.
    // % = roles cubiertos / roles del proyecto; se muestra el peor caso.
    let worst: Team["continuity"]["worst"] = null, pct = 100;
    for (const m of members) {
      const substitute = pools[m.role].find((c) => !ids.has(c.employee_id))?.employee_id ?? null;
      const p = substitute ? 100 : Math.round(((slots.length - 1) / slots.length) * 100);
      if (!worst || p < pct) { pct = p; worst = { employee_id: m.employee_id, role: m.role, substitute }; }
    }
    const rates = members.map(rate);
    const costKnown = a.hoursPerPerson != null && rates.every((r) => r != null);
    const startKnown = a.startDaysEnBanca != null && members.every((m) => m.disponibilidad === "En banca");
    return {
      id: [...ids].sort().join("+"),
      members: members.map(({ role, employee_id, nombre_completo, score, disponibilidad, nivel_seniority }) =>
        ({ role, employee_id, nombre_completo, score, disponibilidad, nivel_seniority })),
      fit: Math.round((members.reduce((s, m) => s + m.score, 0) / members.length) * 10) / 10,
      continuity: { pct, worst },
      cost: { value: costKnown ? rates.reduce((s: number, r) => s + r! * a.hoursPerPerson!, 0) : null,
              status: costKnown ? "estimado" : "por estimar", is_illustrative: true },
      // Roll-off próximo es una ventana (<3 meses) sin día confirmado: nunca se convierte en fecha.
      start: { day: startKnown ? a.startDaysEnBanca! : null, status: startKnown ? "estimado" : "por confirmar", is_illustrative: true },
      gaps: members.reduce((s, m) => s + m.gaps.length, 0),
    };
  }).sort((x, y) => y.fit - x.fit || x.id.localeCompare(y.id));
}
