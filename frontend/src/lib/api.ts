import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MOCK_INTERPRET } from "./mock-data";
import type { ExplainResponse, InterpretResult, MatchResponse, Perfil, Requirements } from "./types";

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const key = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

/** True when the external backend is configured; otherwise everything falls back to mock data. */
export const isLive = Boolean(url && key);

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase no configurado");
  client ??= createClient(url, key);
  return client;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class PdfSinTextoError extends Error {
  constructor() {
    super("pdf_sin_texto");
  }
}

export type InterpretInput = { file: File } | { text: string };

export async function interpretProject(input: InterpretInput): Promise<InterpretResult> {
  if (!isLive) {
    await delay(2400);
    if ("file" in input && /escane/i.test(input.file.name)) throw new PdfSinTextoError();
    const text = "text" in input && input.text.trim() ? input.text : MOCK_INTERPRET.source_text;
    return structuredClone({ ...MOCK_INTERPRET, source: "file" in input ? "pdf" : "texto", source_text: text });
  }
  let body: FormData | { project_text: string };
  if ("file" in input) {
    const fd = new FormData();
    fd.append("file", input.file);
    body = fd;
  } else body = { project_text: input.text };
  const { data, error } = await sb().functions.invoke("interpret-project", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && ctx.status === 422) {
      const j = (await ctx.json().catch(() => null)) as { error?: string } | null;
      if (j?.error === "pdf_sin_texto") throw new PdfSinTextoError();
    }
    throw error;
  }
  return data as InterpretResult;
}

export async function saveRequirements(row: Record<string, unknown>): Promise<string> {
  if (!isLive) {
    await delay(400);
    return "mock-project";
  }
  const { data, error } = await sb().from("project_requirements").insert(row).select("id").single();
  if (error) throw error;
  return String((data as { id: unknown }).id);
}

/** Skill names for autocomplete, from table catalogo_skills. */
export async function getSkillCatalog(): Promise<string[]> {
  const fallback = ["AWS", "Azure", "Kubernetes", "Docker", "Terraform", "Java", "Spring Boot", "Kafka", "PostgreSQL", "Python", "React", "Angular", "PCI-DSS", "IAM", "CI/CD", "Arquitectura de microservicios", "SAP S/4HANA", "Scrum"];
  if (!isLive) return fallback;
  const { data, error } = await sb().from("catalogo_skills").select("*").limit(2000);
  if (error || !data) return fallback;
  return [...new Set((data as Record<string, unknown>[]).map((r) => String(r["skill"] ?? r["name"] ?? r["nombre"] ?? "")).filter(Boolean))].sort();
}

/** Row for project_requirements: backend row_template with the manager's edits on top (interpretation_raw untouched). */
export function buildRequirementsRow(template: Record<string, unknown>, req: Requirements): Record<string, unknown> {
  const p = req.project;
  return { ...template, roles: req.roles, client_sector: p.client_sector, country: p.country, city: p.city, modality: p.modality, country_required: p.country_required, project_start_date: p.start_date };
}

/** Real perfil (one JSON object); null when the backend is not configured (caller simulates). */
export async function getProfile(employeeId: string): Promise<Perfil | null> {
  if (!isLive) return null;
  const { data, error } = await sb().rpc("perfil", { p_employee_id: employeeId });
  if (error) throw error;
  return ((Array.isArray(data) ? data[0] : data) ?? null) as Perfil | null;
}

/** explain-recommendations edge function; simulated fallback summaries when the backend is not configured. */
export async function explainRecommendations(match: MatchResponse): Promise<ExplainResponse> {
  if (!isLive) {
    await delay(1200);
    const cands = new Map<string, MatchResponse["members_detail"][number]>();
    Object.values(match.ranking).forEach((r) => r.items.forEach((c) => cands.set(c.employee_id, c)));
    return {
      teams: match.teams.map((t) => ({
        team_id: t.id,
        summary: `Encaje medio del ${Math.round(t.fit)} % con ${t.gaps === 0 ? "todas las obligatorias cubiertas" : `${t.gaps} gap${t.gaps === 1 ? "" : "s"} a vigilar`}.`,
        reasons: [
          { text: `${t.members.filter((m) => m.disponibilidad === "En banca").length} de ${t.members.length} personas están en banca.`, evidence_ids: [] },
          { text: `Si falla una persona clave, se mantienen ${t.continuity.covered} de ${t.continuity.total} plazas.`, evidence_ids: [] },
        ],
        source: "fallback",
      })),
      candidates: [...cands.values()].map((c) => ({
        employee_id: c.employee_id,
        summary: `${c.puesto_actual} (${c.nivel_seniority}) con ${c.skills.filter((s) => s.demostrada).length} skills demostradas en proyectos.`,
        strengths: c.evidence.slice(0, 2).map((e) => ({ text: `${e.skills.join(" y ")} en ${e.proyecto} (${e.anio}).`, evidence_ids: [e.proyecto] })),
        source: "fallback",
      })),
    };
  }
  const { data, error } = await sb().functions.invoke("explain-recommendations", { body: match });
  if (error) throw error;
  return data as ExplainResponse;
}

/** Exact columns of the scenario_assumptions table. */
export interface ScenarioAssumptionsRow {
  project_id: string;
  rates_by_seniority: Record<string, number>;
  internal_rate_per_hour: number;
  external_rate_per_hour: number;
  recruitment_cost: number;
  hours_per_person: number;
  rolloff_days: number;
  internal_mobilization_days: number;
  hiring_days: number;
  onboarding_days: number;
  project_days: number;
  weights: { cost: number; time: number; coverage: number; availability: number; risk: number };
  is_illustrative: boolean;
}
/** Inserts a new scenario_assumptions row (skipped when the backend is not configured). */
export async function saveScenarioAssumptions(row: ScenarioAssumptionsRow): Promise<void> {
  if (!isLive) return;
  const { error } = await sb().from("scenario_assumptions").insert(row);
  if (error) throw error;
}
