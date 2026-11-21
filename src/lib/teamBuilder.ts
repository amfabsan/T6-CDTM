// Lógica de staffing de SkillSonar: determinista, explicable y sin LLM.
// El LLM solo extrae requisitos y citas; aquí se decide qué cubre quién.
import type {
  CandidateLabel,
  CoverageStatus,
  Evidence,
  Person,
  ProjectRecord,
  RequirementCoverage,
  StaffingRequest,
  TeamCoverage,
} from "./types";

/** Sinónimos → nombre canónico. Ampliar el sábado según los datos de NTT DATA. */
export const SKILL_ALIASES: Record<string, string> = {
  ciberseguridad: "cybersecurity",
  seguridad: "cybersecurity",
  "microsoft azure": "azure",
  "sap s4hana": "sap s/4hana",
};

export function normalizeSkill(skill: string): string {
  const s = skill.trim().toLowerCase().replace(/\s+/g, " ");
  return SKILL_ALIASES[s] ?? s;
}

const RANK: Record<CoverageStatus, number> = { verificada: 2, autodeclarada: 1, sin_evidencia: 0 };

/** Mejor evidencia que tiene una persona para una skill (verificada > autodeclarada). */
export function bestEvidence(person: Person, skill: string): Evidence | null {
  const target = normalizeSkill(skill);
  let best: Evidence | null = null;
  for (const e of person.evidence) {
    if (normalizeSkill(e.skill) !== target) continue;
    if (!best || RANK[e.status] > RANK[best.status]) best = e;
  }
  return best;
}

/** Restricciones POR PERSONA. */
export function isEligible(person: Person, req: StaffingRequest): boolean {
  return person.availabilityPct >= req.minAvailabilityPct;
}

/** Etiqueta individual: «cumple», «candidata para revisar» o «falta evidencia de X». */
export function candidateLabel(person: Person, req: StaffingRequest): CandidateLabel {
  const missing: string[] = [];
  const pending: string[] = [];
  for (const m of req.musts) {
    const e = bestEvidence(person, m);
    if (!e) missing.push(m);
    else if (e.status === "autodeclarada") pending.push(m);
  }
  if (missing.length) return { kind: "falta", missing, pending };
  if (pending.length) return { kind: "revisar", pending };
  return { kind: "cumple" };
}

function countCovered(person: Person, skills: string[]) {
  let any = 0;
  let verified = 0;
  for (const s of skills) {
    const e = bestEvidence(person, s);
    if (e) any++;
    if (e?.status === "verificada") verified++;
  }
  return { any, verified };
}

/** Ranking individual (lo que haría un buscador clásico): obligatorios, verificados, deseables. */
export function rankIndividuals(people: Person[], req: StaffingRequest): Person[] {
  return people
    .filter((p) => isEligible(p, req))
    .map((p) => ({ p, m: countCovered(p, req.musts), n: countCovered(p, req.nices) }))
    .sort(
      (a, b) =>
        b.m.any - a.m.any ||
        b.m.verified - a.m.verified ||
        b.n.any - a.n.any ||
        a.p.name.localeCompare(b.p.name),
    )
    .map((x) => x.p);
}

/** Requisitos POR EQUIPO: cada obligatorio lo cubre quien aporte la mejor evidencia. */
export function teamCoverage(team: Person[], req: StaffingRequest): TeamCoverage {
  const rows: RequirementCoverage[] = req.musts.map((skill) => {
    let row: RequirementCoverage = { skill, status: "sin_evidencia", coveredBy: null, evidence: null };
    for (const p of team) {
      const e = bestEvidence(p, skill);
      if (e && RANK[e.status] > RANK[row.status]) row = { skill, status: e.status, coveredBy: p.id, evidence: e };
    }
    return row;
  });
  const nicesCovered = req.nices.filter((s) => team.some((p) => bestEvidence(p, s))).length;
  return {
    rows,
    verified: rows.filter((r) => r.status === "verificada").length,
    pending: rows.filter((r) => r.status === "autodeclarada").length,
    missing: rows.filter((r) => r.status === "sin_evidencia").length,
    nicesCovered,
  };
}

function* combinations<T>(items: T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) {
    yield acc.slice();
    return;
  }
  for (let i = start; i <= items.length - (k - acc.length); i++) {
    acc.push(items[i]);
    yield* combinations(items, k, i + 1, acc);
    acc.pop();
  }
}

function better(a: TeamCoverage, b: TeamCoverage): boolean {
  const covA = a.verified + a.pending;
  const covB = b.verified + b.pending;
  return covA !== covB ? covA > covB : a.verified !== b.verified ? a.verified > b.verified : a.nicesCovered > b.nicesCovered;
}

export interface TeamProposal {
  team: Person[];
  coverage: TeamCoverage;
  /** true si se probaron todas las combinaciones hasta ese tamaño (el equipo es el más pequeño posible). */
  exhaustive: boolean;
}

/**
 * Propone el equipo MÁS PEQUEÑO que cubre todos los obligatorios, probando todas las combinaciones
 * de 1..maxTeamSize personas elegibles. Entre empates: más verificados, más deseables.
 * Si ninguno cubre todo, devuelve el de mejor cobertura con maxTeamSize personas.
 */
export function proposeTeam(people: Person[], req: StaffingRequest, maxCombos = 200_000): TeamProposal {
  const pool = people.filter((p) => isEligible(p, req));
  let fallback: TeamProposal | null = null;
  let tried = 0;
  for (let k = 1; k <= Math.min(req.maxTeamSize, pool.length); k++) {
    let best: TeamProposal | null = null;
    for (const team of combinations(pool, k)) {
      if (++tried > maxCombos) return fallback ?? { team: [], coverage: teamCoverage([], req), exhaustive: false };
      const coverage = teamCoverage(team, req);
      if (!best || better(coverage, best.coverage)) best = { team, coverage, exhaustive: true };
    }
    if (best && best.coverage.missing === 0) return best;
    if (best && (!fallback || better(best.coverage, fallback.coverage))) fallback = best;
  }
  return fallback ?? { team: [], coverage: teamCoverage([], req), exhaustive: true };
}

/** Cuántas parejas (o equipos de tamaño k) cubren todos los obligatorios. Útil para afirmar cosas en el pitch. */
export function teamsCoveringAll(people: Person[], req: StaffingRequest, k: number): Person[][] {
  const pool = people.filter((p) => isEligible(p, req));
  const out: Person[][] = [];
  for (const team of combinations(pool, k)) if (teamCoverage(team, req).missing === 0) out.push(team);
  return out;
}

/** Busca en el histórico un registro que respalde una skill autodeclarada (para que el manager la verifique). */
export function findSupportingRecord(person: Person, skill: string, history: ProjectRecord[]): ProjectRecord | null {
  const target = normalizeSkill(skill);
  return (
    history.find((r) => r.employeeId === person.id && normalizeSkill(r.text).includes(target)) ?? null
  );
}

/** El manager verifica una skill autodeclarada con un registro: pasa a «verificada». */
export function verifySkill(person: Person, skill: string, record: ProjectRecord): Person {
  const target = normalizeSkill(skill);
  return {
    ...person,
    evidence: [
      ...person.evidence,
      {
        skill: person.evidence.find((e) => normalizeSkill(e.skill) === target)?.skill ?? skill,
        status: "verificada",
        source: "project",
        quote: record.text,
        project: record.project,
      },
    ],
  };
}

/** Línea de explicación para cada tarjeta. */
export function explain(person: Person, req: StaffingRequest): string {
  const parts = req.musts.map((m) => {
    const e = bestEvidence(person, m);
    if (!e) return `${m}: sin evidencia`;
    return `${m} (${e.status}${e.project ? `, ${e.project}` : `, ${e.source}`})`;
  });
  const nices = req.nices.filter((n) => bestEvidence(person, n)).length;
  return `${parts.join(" · ")} · Disponible al ${person.availabilityPct} % · ${nices}/${req.nices.length} deseables`;
}
