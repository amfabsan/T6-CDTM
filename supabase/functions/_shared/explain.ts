// Paso 11 del workflow: explicación con LLM (Gemini).
// El LLM SOLO redacta a partir de la evidencia que ya calculó el paso 7 (score).
// Gaps y riesgos NO los escribe el LLM: se muestran tal cual salen del código.
// Todo lo que devuelve el modelo pasa por validate(): se descarta cualquier frase que
//   - cite una evidencia que no está en la entrada,
//   - nombre entre comillas un proyecto que no existe en la evidencia,
//   - use un número que no aparece en los datos del candidato o del equipo.
// Si Gemini falla, tarda demasiado o lo descarta todo, se usa una plantilla determinista:
// la pantalla nunca se queda sin explicación.
// Módulo puro (sin APIs de Deno) para poder testearlo con Node: explain.test.ts.

export type EvidenceType = "project" | "skill" | "certification" | "experience";

export interface Evidence {
  id: string; // único dentro del candidato, p. ej. "P1", "S3"
  type: EvidenceType;
  ref: string; // texto que se puede mostrar: "Migración a la nube de core bancario (2024)"
  detail?: string; // p. ej. "Azure nivel 4, 3 años"
}

export interface CandidateInput {
  employee_id: string;
  nombre: string;
  role: string;
  fit: number;
  disponibilidad: string;
  breakdown: Record<string, number>;
  gaps: string[];
  risks: string[];
  evidence: Evidence[];
}

export interface TeamInput {
  team_id: string;
  fit: number;
  continuity: number | null;
  /** Coste estimado del equipo en euros (supuesto ilustrativo); null = "por estimar". */
  cost_eur: number | null;
  start: { day: number | null; status: string; date?: string | null };
  members: { role: string; employee_id: string }[];
}

export interface ExplainInput {
  project_summary: string; // 1 párrafo con roles y obligatorias (de project_requirements)
  candidates: CandidateInput[];
  teams: TeamInput[];
}

export interface Claim {
  text: string;
  evidence_ids: string[];
}

export type Source = "llm" | "fallback";

export interface CandidateExplanation {
  employee_id: string;
  summary: string;
  strengths: Claim[];
  source: Source;
  dropped: number; // frases del LLM descartadas por la validación
}

export interface TeamExplanation {
  team_id: string;
  summary: string;
  reasons: Claim[];
  source: Source;
  dropped: number;
}

export interface ExplainOutput {
  candidates: CandidateExplanation[];
  teams: TeamExplanation[];
  error?: string;
}

// ───────────────────────────── Prompt ─────────────────────────────

export const SYSTEM_PROMPT = `Eres el redactor de explicaciones de ORBIT AI, una herramienta de staffing interno de NTT DATA.
Recibes un proyecto, candidatos ya puntuados y equipos ya formados. NO decides nada: el ranking, el encaje, los gaps y los riesgos ya están calculados.
Tu trabajo es explicar al manager, en español, claro y breve, por qué cada persona y cada equipo encajan.

Reglas obligatorias:
1. Usa SOLO la información de la entrada. No añadas experiencia, skills, proyectos, años ni niveles que no aparezcan.
2. Cada fortaleza debe citar en "evidence_ids" los ids de la evidencia que la respaldan (p. ej. ["P1","S2"]). Sin evidencia, no hay fortaleza.
3. Si nombras un proyecto, escríbelo entre comillas «» exactamente como aparece en "ref".
4. No inventes cifras. Solo puedes usar números que aparezcan en la entrada (encaje, niveles, años, días, continuidad).
5. No repitas los gaps ni los riesgos: la pantalla ya los muestra. Puedes mencionar en el resumen que existen.
6. Resumen de candidato: 1 frase. Fortalezas: 2 o 3, cada una de menos de 25 palabras.
7. Para cada equipo explica cómo se complementan sus integrantes (qué aporta cada uno) en 2 o 3 razones, citando la evidencia de los integrantes.
8. Si un candidato sale de otra área o sector y aun así encaja, dilo: es talento oculto.
10. Si a alguien le falta una skill obligatoria (está en sus gaps), no digas ni insinúes que la domina. Habla de lo que sí aporta.
11. En el resumen del equipo nombra a las personas por su nombre, nunca por su employee_id.
9. Todo el dinero está en euros. Escríbelo así, sin comillas: 11.800 €. Nunca uses $, USD ni dólares. Si cost_eur es null, di «coste por estimar». El coste es siempre una estimación con supuestos, nunca un dato real: no lo presentes como seguro.`;

export function buildUserPrompt(input: ExplainInput): string {
  return JSON.stringify(input);
}

// Esquema de salida estructurada de Gemini (subconjunto de OpenAPI).
export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    candidates: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          employee_id: { type: "STRING" },
          summary: { type: "STRING" },
          strengths: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                text: { type: "STRING" },
                evidence_ids: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: ["text", "evidence_ids"],
            },
          },
        },
        required: ["employee_id", "summary", "strengths"],
      },
    },
    teams: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          team_id: { type: "STRING" },
          summary: { type: "STRING" },
          reasons: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                text: { type: "STRING" },
                evidence_ids: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: ["text", "evidence_ids"],
            },
          },
        },
        required: ["team_id", "summary", "reasons"],
      },
    },
  },
  required: ["candidates", "teams"],
} as const;

// ───────────────────────────── Validación ─────────────────────────────

const NUM_RE = /\d+(?:[.,]\d+)?/g; // números en los datos (JSON: punto decimal)
// Números en el texto del LLM: admite miles a la española ("11.800", "11 800") y coma decimal ("2,5").
const TEXT_NUM_RE = /\d{1,3}(?:[.\u00a0 ]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g;
const THOUSANDS = /^\d{1,3}(?:[.\u00a0 ]\d{3})+(?:,\d+)?$/;
const normTextNum = (s: string) =>
  THOUSANDS.test(s) ? String(Number(s.replace(/[.\u00a0 ]/g, "").replace(",", "."))) : String(Number(s.replace(",", ".")));
const QUOTE_RE = /[«"“]([^»"”]+)[»"”]/g;

const normNum = (s: string) => String(Number(s.replace(",", ".")));
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

function numbersIn(value: unknown): Set<string> {
  return new Set((JSON.stringify(value).match(NUM_RE) ?? []).map(normNum));
}

/** Para comprobar cada texto del LLM contra los datos permitidos de su candidato o equipo. */
interface Scope {
  evidenceIds: Set<string>;
  refs: string[]; // refs normalizados de la evidencia (proyectos, certificaciones…)
  numbers: Set<string>;
}

function scopeFor(candidates: CandidateInput[], extra: unknown = null): Scope {
  const evidence = candidates.flatMap((c) => c.evidence);
  return {
    evidenceIds: new Set(evidence.map((e) => e.id)),
    refs: evidence.map((e) => norm(e.ref)),
    numbers: numbersIn([candidates, extra]),
  };
}

const OTHER_CURRENCY = /\$|\bUSD\b|d[oó]lar/i;

function textOk(text: string, scope: Scope): boolean {
  if (typeof text !== "string" || !text.trim()) return false;
  if (OTHER_CURRENCY.test(text)) return false; // todo el dinero va en euros
  for (const n of text.match(TEXT_NUM_RE) ?? []) {
    // "11.800" puede ser 11800 (miles) o 11,8 (decimal inglés): vale si cualquiera de las dos está en los datos.
    if (!scope.numbers.has(normTextNum(n)) && !scope.numbers.has(normNum(n))) return false;
  }
  for (const m of text.matchAll(QUOTE_RE)) {
    if (!/[a-záéíóúñ]/i.test(m[1].replace(/€|eur(os)?/gi, ""))) continue; // cifra entre comillas: la valida NUM_RE
    const quoted = norm(m[1]);
    if (!scope.refs.some((r) => r.includes(quoted))) return false;
  }
  return true;
}

function claimOk(c: unknown, scope: Scope): c is Claim {
  if (!c || typeof c !== "object") return false;
  const { text, evidence_ids } = c as Claim;
  return (
    Array.isArray(evidence_ids) &&
    evidence_ids.length > 0 &&
    evidence_ids.every((id) => scope.evidenceIds.has(id)) &&
    textOk(text, scope)
  );
}

function filterClaims(raw: unknown, scope: Scope): { kept: Claim[]; dropped: number } {
  const list = Array.isArray(raw) ? raw : [];
  const kept = list
    .filter((c) => claimOk(c, scope))
    .map((c) => ({ text: c.text.trim(), evidence_ids: c.evidence_ids }));
  return { kept, dropped: list.length - kept.length };
}

// En el equipo, el id de evidencia se prefija con el employee_id ("NTT0001:P1"),
// porque "P1" se repite entre integrantes.
function teamCandidates(team: TeamInput, byId: Map<string, CandidateInput>): CandidateInput[] {
  return team.members
    .map((m) => byId.get(m.employee_id))
    .filter((c): c is CandidateInput => !!c)
    .map((c) => ({ ...c, evidence: c.evidence.map((e) => ({ ...e, id: `${c.employee_id}:${e.id}` })) }));
}

// ───────────────────────────── Plantilla determinista ─────────────────────────────

/** 11800 → "11.800 €" (agrupa también los de 4 cifras, a diferencia de Intl es-ES). */
export function formatEur(n: number): string {
  const [int, dec] = String(Math.round(n * 100) / 100).split(".");
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${dec ? "," + dec : ""} €`;
}

const TYPE_ORDER: Record<EvidenceType, number> = { project: 0, certification: 1, experience: 2, skill: 3 };

const describe = (e: Evidence) => (e.detail ? `${e.ref} (${e.detail})` : e.ref);

export function fallbackCandidate(c: CandidateInput): CandidateExplanation {
  const top = [...c.evidence].sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]).slice(0, 3);
  return {
    employee_id: c.employee_id,
    summary: `${c.nombre} encaja al ${c.fit} % como ${c.role}.`,
    strengths: top.map((e) => ({ text: describe(e), evidence_ids: [e.id] })),
    source: "fallback",
    dropped: 0,
  };
}

export function fallbackTeam(t: TeamInput, byId: Map<string, CandidateInput>): TeamExplanation {
  const reasons = t.members.flatMap((m) => {
    const c = byId.get(m.employee_id);
    const e = c?.evidence.slice().sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type])[0];
    return c && e ? [{ text: `${c.nombre} cubre ${m.role}: ${describe(e)}`, evidence_ids: [`${c.employee_id}:${e.id}`] }] : [];
  });
  return {
    team_id: t.team_id,
    summary: `Equipo de ${t.members.map((m) => byId.get(m.employee_id)?.nombre ?? m.employee_id).join(", ")}: encaje medio del ${t.fit} %. ` +
      (t.cost_eur != null ? `Coste estimado: ${formatEur(t.cost_eur)} (supuesto).` : "Coste por estimar."),
    reasons,
    source: "fallback",
    dropped: 0,
  };
}

export function fallbackAll(input: ExplainInput, error?: string): ExplainOutput {
  const byId = new Map(input.candidates.map((c) => [c.employee_id, c]));
  return {
    candidates: input.candidates.map(fallbackCandidate),
    teams: input.teams.map((t) => fallbackTeam(t, byId)),
    ...(error ? { error } : {}),
  };
}

/** Cruza la salida del modelo con la entrada. Nunca lanza excepciones: lo que no valida se sustituye por la plantilla. */
export function validate(raw: unknown, input: ExplainInput): ExplainOutput {
  const r = (raw && typeof raw === "object" ? raw : {}) as { candidates?: unknown[]; teams?: unknown[] };
  const rawCands = new Map(
    (Array.isArray(r.candidates) ? r.candidates : []).map((c) => [(c as { employee_id?: string })?.employee_id, c as Record<string, unknown>]),
  );
  const rawTeams = new Map(
    (Array.isArray(r.teams) ? r.teams : []).map((t) => [(t as { team_id?: string })?.team_id, t as Record<string, unknown>]),
  );
  const byId = new Map(input.candidates.map((c) => [c.employee_id, c]));

  const candidates = input.candidates.map((c): CandidateExplanation => {
    const got = rawCands.get(c.employee_id);
    const fb = fallbackCandidate(c);
    if (!got) return fb;
    const scope = scopeFor([c]);
    const { kept, dropped } = filterClaims(got.strengths, scope);
    const summaryOk = textOk(got.summary as string, scope);
    if (!kept.length) return { ...fb, dropped };
    return {
      employee_id: c.employee_id,
      summary: summaryOk ? (got.summary as string).trim() : fb.summary,
      strengths: kept,
      source: "llm",
      dropped: dropped + (summaryOk ? 0 : 1),
    };
  });

  const teams = input.teams.map((t): TeamExplanation => {
    const got = rawTeams.get(t.team_id);
    const fb = fallbackTeam(t, byId);
    if (!got) return fb;
    const scope = scopeFor(teamCandidates(t, byId), t);
    const { kept, dropped } = filterClaims(got.reasons, scope);
    const summaryOk = textOk(got.summary as string, scope);
    if (!kept.length) return { ...fb, dropped };
    return {
      team_id: t.team_id,
      summary: summaryOk ? (got.summary as string).trim() : fb.summary,
      reasons: kept,
      source: "llm",
      dropped: dropped + (summaryOk ? 0 : 1),
    };
  });

  return { candidates, teams };
}

// ───────────────────────────── Llamada a Gemini ─────────────────────────────

/** Comprobados el 21-11-2026: responden en ~1 s; 3.6-flash responde pero tarda ~9 s. */
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_FALLBACKS = ["gemini-flash-lite-latest", "gemini-3.6-flash"];

export interface GeminiOptions {
  apiKey: string;
  model: string;
  /** Se prueban en orden si el anterior da 404 (retirado), 429 (cuota), 5xx (saturado) o tarda demasiado. */
  fallbackModels?: string[];
  /** Tiempo máximo por intento. */
  timeoutMs?: number;
  fetchFn?: typeof fetch; // inyectable para los tests
}

/** Errores en los que tiene sentido probar el siguiente modelo. Un 400 o un 403 (petición o clave mal) no. */
const RETRYABLE = (status: number) => status === 404 || status === 429 || status >= 500;

/** Prepara la entrada para el LLM: en los equipos, los ids de evidencia van prefijados con el employee_id. */
function promptInput(input: ExplainInput) {
  const byId = new Map(input.candidates.map((c) => [c.employee_id, c]));
  return {
    project_summary: input.project_summary,
    candidates: input.candidates,
    teams: input.teams.map((t) => ({ ...t, members_evidence: teamCandidates(t, byId).map((c) => ({ employee_id: c.employee_id, nombre: c.nombre, evidence: c.evidence })) })),
  };
}

export async function explainWithGemini(
  input: ExplainInput,
  opts: GeminiOptions,
): Promise<ExplainOutput & { model?: string }> {
  const fetchFn = opts.fetchFn ?? fetch;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(promptInput(input)) }] }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
  });
  const errors: string[] = [];

  for (const model of [opts.model, ...(opts.fallbackModels ?? [])]) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);
    try {
      const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
        body,
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const detail = (await res.text()).replace(/\s+/g, " ").slice(0, 200);
        errors.push(`${model} ${res.status}: ${detail}`);
        if (RETRYABLE(res.status)) continue;
        break;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      return { ...validate(JSON.parse(text), input), model };
    } catch (e) {
      // Timeout (AbortError) o JSON roto: se prueba el siguiente modelo.
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  return fallbackAll(input, `Gemini: ${errors.join(" | ")}`);
}
