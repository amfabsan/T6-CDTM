// Convierte la salida de los pasos 7-10 (matching/pipeline.py → run_matching) en la entrada del paso 11.
// Así el front solo tiene que reenviar a explain-recommendations lo que devolvió el matching.
// Asigna ids de evidencia por persona: P1, P2… (proyectos) y S1, S2… (skills con nivel en el perfil).
import type { CandidateInput, Evidence, ExplainInput, TeamInput } from "./explain.ts";

interface PyEvidence { proyecto: string; anio: number; sector: string; skills: string[] }
interface PySkill { name: string; tipo: string; nivel: number | null; anios: number | null; demostrada: boolean }
interface PyCandidate {
  employee_id: string; nombre_completo?: string; role: string; score: number; disponibilidad?: string;
  breakdown?: Record<string, { points: number }>; gaps?: string[]; risks?: string[];
  evidence?: PyEvidence[]; skills?: PySkill[];
}
interface PyMember { role: string; employee_id: string; nombre_completo?: string; score?: number; disponibilidad?: string }
interface PyTeam {
  id: string; fit: number;
  cost?: { value: number | null; status?: string };
  start?: { date?: string | null; status: string };
  continuity?: { pct: number | null };
  members: PyMember[];
}
interface PyPlan {
  // Formato de interpret-project ({ requirements: { project, roles } }) o el antiguo ({ project, roles }).
  requirements?: PyPlan;
  project?: { name?: string; project_name?: string; client_sector?: string; country?: string; work_mode?: string; modality?: string };
  roles?: { title: string; count?: number; mandatory_skills?: { name: string }[]; mandatory_any_of?: { options: string[] }[] }[];
}
export interface MatchingResult {
  plan?: PyPlan;
  project_summary?: string;
  ranking?: Record<string, { items: PyCandidate[] }>;
  top_teams: { items: PyTeam[] };
  /** Lo añade run_matching desde el PR #6. Si no viene, se usan ranking[].items. */
  members_detail?: PyCandidate[];
}

/** Basta con top_teams: members_detail, ranking y plan son opcionales. */
export function isMatchingResult(body: unknown): body is MatchingResult {
  return !!body && typeof body === "object" && "top_teams" in body;
}

export function summarizePlan(input?: PyPlan): string {
  if (!input) return "";
  const plan = input.requirements ?? input;
  const p = plan.project ?? {};
  const head = [p.project_name ?? p.name, p.client_sector && `sector ${p.client_sector}`, p.country, p.modality ?? p.work_mode]
    .filter(Boolean).join(" · ");
  const roles = (plan.roles ?? []).map((r) => {
    // Obligatorias sueltas y grupos «una de» (mandatory_any_of, migración 007): "Azure, una de (Gestión de identidades / Entra ID)".
    const must = [...(r.mandatory_skills ?? []).map((s) => s.name),
                  ...(r.mandatory_any_of ?? []).filter((g) => g.options?.length).map((g) => `una de (${g.options.join(" / ")})`)];
    return `${r.count ?? 1} × ${r.title}${must.length ? ` (obligatorias: ${must.join(", ")})` : ""}`;
  });
  return `${head}. Roles: ${roles.join("; ")}.`;
}

function toEvidence(c: PyCandidate): Evidence[] {
  const projects = (c.evidence ?? []).map((e, i): Evidence => ({
    id: `P${i + 1}`, type: "project", ref: `${e.proyecto} (${e.anio})`,
    detail: [e.sector, e.skills?.length ? e.skills.join(", ") : ""].filter(Boolean).join(" · "),
  }));
  const skills = (c.skills ?? []).filter((s) => s.nivel != null).map((s, i): Evidence => ({
    id: `S${i + 1}`, type: "skill", ref: s.name,
    detail: `${s.tipo}, nivel ${s.nivel}, ${s.anios} años, ${s.demostrada ? "demostrada en proyectos" : "solo declarada"}`,
  }));
  return [...projects, ...skills];
}

/** Fichas puntuadas de los integrantes: members_detail si viene; si no, el ranking; y, en último caso,
 *  los datos mínimos del propio equipo (sin evidencia: la explicación de esa persona sale de la plantilla). */
function memberProfiles(result: MatchingResult): PyCandidate[] {
  const byKey = new Map<string, PyCandidate>();
  const add = (c: PyCandidate) => { const k = `${c.role}|${c.employee_id}`; if (!byKey.has(k)) byKey.set(k, c); };
  (result.members_detail ?? []).forEach(add);
  Object.values(result.ranking ?? {}).forEach((r) => (r.items ?? []).forEach(add));
  const out: PyCandidate[] = [];
  const seen = new Set<string>();
  for (const t of result.top_teams?.items ?? []) {
    for (const m of t.members) {
      const k = `${m.role}|${m.employee_id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(byKey.get(k) ?? { employee_id: m.employee_id, nombre_completo: m.nombre_completo, role: m.role,
        score: m.score ?? 0, disponibilidad: m.disponibilidad });
    }
  }
  return out;
}

export function fromMatching(result: MatchingResult): ExplainInput {
  // Clave por persona; si la misma persona sale en dos roles, la segunda lleva "@rol".
  const keyOf = new Map<string, string>();
  const used = new Set<string>();
  const candidates: CandidateInput[] = [];
  for (const c of memberProfiles(result)) {
    const key = used.has(c.employee_id) ? `${c.employee_id}@${c.role}` : c.employee_id;
    used.add(key);
    keyOf.set(`${c.role}|${c.employee_id}`, key);
    candidates.push({
      employee_id: key,
      nombre: c.nombre_completo ?? c.employee_id,
      role: c.role,
      fit: Math.round(c.score), // entero: el LLM escribirá "45 %" y la validación de cifras lo acepta
      disponibilidad: c.disponibilidad ?? "",
      breakdown: Object.fromEntries(Object.entries(c.breakdown ?? {}).map(([k, v]) => [k, v.points])),
      gaps: c.gaps ?? [],
      risks: c.risks ?? [],
      evidence: toEvidence(c),
    });
  }
  const teams: TeamInput[] = (result.top_teams?.items ?? []).map((t) => ({
    team_id: t.id,
    fit: Math.round(t.fit),
    continuity: t.continuity?.pct ?? null,
    cost_eur: t.cost?.value ?? null, // euros (supuesto ilustrativo de los pasos 9-10)
    start: { day: null, status: t.start?.status ?? "por confirmar", date: t.start?.date ?? null },
    members: t.members
      .map((m) => ({ role: m.role, employee_id: keyOf.get(`${m.role}|${m.employee_id}`) ?? m.employee_id })),
  }));
  const summary = result.project_summary || summarizePlan(result.plan) ||
    `Roles: ${Object.keys(result.ranking ?? {}).join(", ") || [...new Set(teams.flatMap((t) => t.members.map((m) => m.role)))].join(", ")}.`;
  return { project_summary: summary, candidates, teams };
}
