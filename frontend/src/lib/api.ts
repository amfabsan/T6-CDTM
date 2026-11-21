import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MOCK_INTERPRET, mockCandidates } from "./mock-data";
import type { InterpretResult, Profile, RoleCandidates } from "./types";

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
    return structuredClone({ ...MOCK_INTERPRET, source_text: "text" in input && input.text.trim() ? input.text : MOCK_INTERPRET.source_text });
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

export async function getCandidates(projectId: string): Promise<RoleCandidates[]> {
  if (!isLive || projectId === "mock-project") {
    await delay(500);
    return mockCandidates();
  }
  const { data, error } = await sb().rpc("candidatos_proyecto", { p_project_id: projectId });
  if (error) throw error;
  return data as RoleCandidates[];
}

type Row = Record<string, unknown>;
const pick = (o: Row, ...keys: string[]) => { for (const k of keys) if (o[k] != null) return o[k]; return undefined; };
const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));
const arr = (v: unknown): Row[] => (Array.isArray(v) ? v.map((x) => (typeof x === "object" && x ? (x as Row) : { nombre: x })) : []);
const bool = (v: unknown) => (typeof v === "boolean" ? v : v === "demostrada" ? true : v === "declarada" ? false : null);

/** Maps the rpc perfil payload to Profile. Values are kept exactly as stored (no reformatting). */
export function parsePerfil(raw: unknown): Profile | null {
  const o = (Array.isArray(raw) ? raw[0] : raw) as Row | null;
  if (!o || typeof o !== "object") return null;
  return {
    name: str(pick(o, "nombre", "name", "full_name", "nombre_completo")) || str(pick(o, "employee_id")),
    availability: str(pick(o, "disponibilidad", "availability", "estado")),
    area: str(pick(o, "area", "área", "sector", "practica")),
    skills: arr(pick(o, "skills", "habilidades", "competencias")).map((s) => ({
      name: str(pick(s, "skill", "nombre", "name")),
      level: num(pick(s, "nivel", "level")),
      years: num(pick(s, "anios", "años", "years", "experiencia_anios")),
      demonstrated: bool(pick(s, "demostrada", "demonstrated", "evidencia", "origen")),
    })),
    projects: arr(pick(o, "proyectos", "projects")).map((p) => ({
      name: str(pick(p, "nombre", "name", "proyecto")),
      year: num(pick(p, "anio", "año", "year")),
      role: str(pick(p, "rol", "role")) || undefined,
    })),
    certifications: arr(pick(o, "certificaciones", "certifications")).map((c) => str(pick(c, "nombre", "name", "certificacion"))).filter(Boolean),
  };
}

/** Real profile from rpc perfil; null when the backend is not configured (caller simulates). */
export async function getProfile(employeeId: string): Promise<Profile | null> {
  if (!isLive) return null;
  const { data, error } = await sb().rpc("perfil", { p_employee_id: employeeId });
  if (error) throw error;
  return parsePerfil(data);
}
