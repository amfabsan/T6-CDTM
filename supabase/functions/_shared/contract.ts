// Contratos de entrada de los pasos 7-10.
// ⚠️ PROVISIONAL: `LlmPlan` es la forma supuesta de la salida del LLM del paso 2 (interpretar plan.pdf).
// Cuando el formato sea definitivo, solo cambian `LlmPlan` y `fromLlmPlan()`; el resto del código usa
// `Project` y `RoleRequirements`, que son internos y estables.

// ───────────── Salida del LLM (paso 2, revisada por el manager en el paso 4) ─────────────
export interface LlmPlan {
  project: {
    name?: string;
    client_sector?: string | null;            // uno de los 10 sectores del dataset
    country?: string | null;                  // país del cliente / del proyecto
    city?: string | null;
    country_required?: boolean;               // true = el país es exigido (contrato, normativa), no solo preferido
    work_mode?: "Remoto" | "Híbrido" | "Presencial" | null;
    start_date?: string | null;               // ISO YYYY-MM-DD, solo si el plan la dice
  };
  roles: {
    title: string;                            // etiqueta libre del puesto: "Arquitecto cloud senior"
    count: number;                            // cuántas personas
    dataset_roles?: string[];                 // de los 87 roles del dataset
    seniority_min?: string | null;            // Trainee | Junior | Mid | Senior | Lead | Principal
    min_years?: number | null;
    mandatory_skills?: { name: string; min_level?: number | null }[];
    desirable_skills?: { name: string }[];
    languages?: { name: string; level: string }[];
    certifications_required?: string[];
    sector_experience?: string[];             // si falta, se usa project.client_sector
  }[];
}

// ───────────── Modelo interno (estable) ─────────────
export type WorkMode = "Remoto" | "Híbrido" | "Presencial";
export interface Project { sector: string | null; country: string | null; city: string | null; countryRequired: boolean; workMode: WorkMode | null }
export interface RoleRequirements {
  role: string; count: number; roles: string[]; seniority: string | null; minYears: number | null;
  mandatory: { name: string; minLevel: number }[]; desirable: string[];
  languages: { name: string; level: string }[]; certifications: string[]; sectors: string[];
}

export const DEFAULT_MIN_LEVEL = 3;

export function fromLlmPlan(plan: LlmPlan): { project: Project; roles: RoleRequirements[] } {
  const p = plan.project ?? {};
  const project: Project = {
    sector: p.client_sector ?? null, country: p.country ?? null, city: p.city ?? null,
    countryRequired: !!p.country_required, workMode: p.work_mode ?? null,
  };
  const roles = plan.roles.map((r): RoleRequirements => ({
    role: r.title, count: Math.max(1, r.count | 0), roles: r.dataset_roles ?? [],
    seniority: r.seniority_min ?? null, minYears: r.min_years ?? null,
    mandatory: (r.mandatory_skills ?? []).map((s) => ({ name: s.name, minLevel: s.min_level ?? DEFAULT_MIN_LEVEL })),
    desirable: (r.desirable_skills ?? []).map((s) => s.name),
    languages: r.languages ?? [], certifications: r.certifications_required ?? [],
    sectors: r.sector_experience?.length ? r.sector_experience : project.sector ? [project.sector] : [],
  }));
  return { project, roles };
}

// ───────────── Perfil ─────────────
// Acepta la forma de la RPC perfil() (con campos derivados) o la del Parquet / data/sample (sin ellos).
export interface SkillRow { skill: string; nivel: number; anios: number; demostrada: boolean; n_proyectos: number; ultimo_anio: number | null }
export interface ProfileProject { nombre: string; cliente_sector: string; anio: number; rol: string; tecnologias: string[] }
export interface Profile {
  employee_id: string; nombre_completo: string; rol: string; nivel_seniority: string; anios_experiencia: number;
  sector_principal: string; disponibilidad: string; pais: string; ciudad: string; modalidad_trabajo: string;
  movilidad_internacional: boolean; sectores_proyectos: string[]; skills: SkillRow[]; proyectos: ProfileProject[];
  certificaciones: { nombre: string; anio: number | null }[]; idiomas: { idioma: string; nivel: string }[];
}

/** Completa los campos derivados que calcula load_profiles.py si el perfil viene del Parquet. */
// deno-lint-ignore no-explicit-any
export function normalizeProfile(p: any): Profile {
  const proyectos: ProfileProject[] = p.proyectos ?? [];
  const expTec = new Set<string>((p.experiencia ?? []).flatMap((e: { tecnologias: string[] }) => e.tecnologias));
  // deno-lint-ignore no-explicit-any
  const skills = (p.skills ?? []).map((s: any): SkillRow => {
    if (s.demostrada !== undefined) return s;
    const usados = proyectos.filter((x) => x.tecnologias.includes(s.skill));
    return { ...s, demostrada: usados.length > 0 || expTec.has(s.skill), n_proyectos: usados.length,
             ultimo_anio: usados.length ? Math.max(...usados.map((x) => x.anio)) : null };
  });
  return { ...p, skills, proyectos, certificaciones: p.certificaciones ?? [], idiomas: p.idiomas ?? [],
           sectores_proyectos: p.sectores_proyectos ?? [...new Set(proyectos.map((x) => x.cliente_sector))].sort() };
}
