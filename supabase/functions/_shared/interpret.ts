// ORBIT AI · Pasos 2 y 3 del workflow: interpretar el plan con el LLM y validar su salida con código.
// Módulo puro (sin APIs de Deno): lo usa la edge function interpret-project y se prueba con Node
// (node --test --experimental-strip-types supabase/functions/_shared/interpret.test.ts).

export interface Vocabulario {
  skills: string[];
  roles: string[];
  sectores: string[];
  certificaciones: string[];
  idiomas: string[];
  paises: string[];
  ciudades: string[];
  niveles_idioma: string[];   // A1 … C2, Nativo
  seniorities: string[];      // Trainee … Principal
  modalidades: string[];      // remoto, hibrido, presencial
}

export interface SkillReq { name: string; min_level: number | null }
export interface LangReq { name: string; level: string | null }

export interface RoleReq {
  title: string;                       // nombre del rol tal como lo dice el plan
  count: number;                       // plazas
  matching_roles: string[];            // roles del dataset que encajan (de los 87)
  seniority_min: string | null;
  min_years_experience: number | null;
  mandatory_skills: SkillReq[];
  desirable_skills: { name: string }[];
  languages: LangReq[];
  certifications: string[];            // obligatorias: hacen falta TODAS
  certification_options: string[];     // alternativas ("CISSP o CEH"): basta con UNA
}

export interface ProjectReq {
  project_name: string | null;
  client_sector: string | null;
  country: string | null;
  city: string | null;
  modality: "remoto" | "hibrido" | "presencial" | null;
  country_required: boolean;
  start_date: string | null;           // YYYY-MM-DD
}

export interface Requirements { project: ProjectReq; roles: RoleReq[] }

export interface ReviewItem {
  path: string;                        // p. ej. "roles[0].mandatory_skills"
  value: unknown;
  reason: string;
  action: "eliminado" | "corregido" | "revisar";
}

// ───────────────────────────── Prompt y esquema (paso 2) ─────────────────────────────

export function buildSystemPrompt(v: Vocabulario): string {
  return `Eres un analista de staffing de NTT DATA. Recibes el texto de un plan de proyecto y devuelves SOLO un JSON con los requisitos.

REGLAS
- Usa EXCLUSIVAMENTE los valores de los vocabularios de abajo, escritos exactamente igual. Traduce la jerga del plan al vocabulario
  (p. ej. "orquestación de contenedores" → "Kubernetes"; "nube de Microsoft" → "Azure"). Si algo no tiene equivalente, no lo pongas.
- NO inventes nada que el plan no diga: si no indica seniority, años, nivel de skill, idioma, certificación, ciudad o fecha, usa null o una lista vacía.
- Una skill es obligatoria solo si el plan la exige; si dice "valorable", "deseable", "se valorará", "nice to have" o "no imprescindible", va en desirable_skills.
- Un rol del plan puede encajar con varios roles del dataset: ponlos todos en matching_roles (los más probables primero, máximo 4).
- count = número de personas para ese rol (1 si el plan no lo dice).
- modality: "remoto", "hibrido" o "presencial" según el plan; null si no lo dice.
- country_required = true solo si el plan EXIGE ese país (p. ej. "residentes en España", "imprescindible estar en España"). Si solo lo menciona o lo prefiere, false.
- client_sector: el sector del cliente, uno de los sectores del vocabulario, o null.
- min_level de una skill: 1-5 solo si el plan da un nivel o una expresión clara ("experto" ≈ 5, "avanzado" ≈ 4, "intermedio" ≈ 3, "básico" ≈ 2); si no, null.
- certifications = certificaciones que el plan exige todas a la vez. Si da alternativas ("CISSP o CEH"), van en certification_options (basta con una). Solo nombres del vocabulario.
- Idiomas con los nombres del vocabulario (p. ej. "Inglés") y nivel MCER (A1…C2, Nativo) o null si no lo dice.

VOCABULARIOS
roles (87): ${JSON.stringify(v.roles)}
skills (${v.skills.length}): ${JSON.stringify(v.skills)}
sectores: ${JSON.stringify(v.sectores)}
idiomas: ${JSON.stringify(v.idiomas)}
niveles_idioma: ${JSON.stringify(v.niveles_idioma)}
seniorities (de menor a mayor): ${JSON.stringify(v.seniorities)}
certificaciones: ${JSON.stringify(v.certificaciones)}
paises: ${JSON.stringify(v.paises)}`;
}

/** responseSchema de Gemini (subconjunto OpenAPI). Los enumerados cortos se fuerzan aquí; las listas largas se validan en código. */
export function buildResponseSchema(v: Vocabulario) {
  const str = { type: "STRING" };
  const nstr = { type: "STRING", nullable: true };
  return {
    type: "OBJECT",
    properties: {
      project: {
        type: "OBJECT",
        properties: {
          project_name: nstr,
          client_sector: { type: "STRING", nullable: true, enum: v.sectores },
          country: nstr,
          city: nstr,
          modality: { type: "STRING", nullable: true, enum: ["remoto", "hibrido", "presencial"] },
          country_required: { type: "BOOLEAN" },
          start_date: { type: "STRING", nullable: true, description: "YYYY-MM-DD solo si el plan da una fecha" },
        },
        required: ["client_sector", "country", "modality", "country_required"],
      },
      roles: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: str,
            count: { type: "INTEGER" },
            matching_roles: { type: "ARRAY", items: str },
            seniority_min: { type: "STRING", nullable: true, enum: v.seniorities },
            min_years_experience: { type: "INTEGER", nullable: true },
            mandatory_skills: {
              type: "ARRAY",
              items: { type: "OBJECT", properties: { name: str, min_level: { type: "INTEGER", nullable: true } }, required: ["name"] },
            },
            desirable_skills: { type: "ARRAY", items: { type: "OBJECT", properties: { name: str }, required: ["name"] } },
            languages: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: { name: str, level: { type: "STRING", nullable: true, enum: v.niveles_idioma } },
                required: ["name"],
              },
            },
            certifications: { type: "ARRAY", items: str },
            certification_options: { type: "ARRAY", items: str },
          },
          required: ["title", "count", "matching_roles", "mandatory_skills", "desirable_skills", "languages", "certifications", "certification_options"],
        },
      },
    },
    required: ["project", "roles"],
  };
}

export interface GeminiOptions {
  apiKey: string;
  model?: string;                  // modelo preferido (secreto GEMINI_MODEL); si falla por saturación se prueban los de respaldo
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  requestTimeoutMs?: number;       // por petición (60 s por defecto)
  totalBudgetMs?: number;          // total con reintentos (120 s por defecto)
}

// Alias que Google mantiene al día, de más a menos capaz. Se prueban en orden si el anterior está saturado.
export const GEMINI_FALLBACK_MODELS = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-lite-latest"];
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/** Llama a Gemini con salida JSON estructurada y devuelve el objeto tal cual (interpretation_raw).
 *  Reintenta los errores transitorios (429/5xx) con espera exponencial y pasa a los modelos de respaldo. */
export async function callGemini(planText: string, v: Vocabulario, opts: GeminiOptions): Promise<unknown> {
  const f = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const models = [...new Set([opts.model, ...GEMINI_FALLBACK_MODELS].filter(Boolean) as string[])];
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: buildSystemPrompt(v) }] },
    contents: [{ role: "user", parts: [{ text: `PLAN DEL PROYECTO:\n\n${planText.slice(0, 60000)}` }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: buildResponseSchema(v) },
  });

  const deadline = Date.now() + (opts.totalBudgetMs ?? 120_000);   // las edge functions de Supabase cortan a ~150 s
  let lastError = "";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining < 5_000) throw new Error(`Gemini no respondió a tiempo. Último error: ${lastError || "timeout"}`);
      let res: Response;
      try {
        res = await f(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
          body,
          signal: AbortSignal.timeout(Math.min(opts.requestTimeoutMs ?? 60_000, remaining)),
        });
      } catch (e) {                                         // timeout o error de red: reintentable
        lastError = `Gemini (${model}) sin respuesta: ${e instanceof Error ? e.name : String(e)}`;
        continue;
      }
      if (res.ok) {
        const data = await res.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
        if (!text) throw new Error(`Gemini (${model}) no devolvió contenido (finishReason: ${data?.candidates?.[0]?.finishReason ?? "?"})`);
        return JSON.parse(text);
      }
      lastError = `Gemini (${model}) respondió ${res.status}: ${(await res.text()).slice(0, 300)}`;
      if (res.status === 404) break;                       // modelo retirado o no disponible: siguiente modelo
      if (!RETRYABLE.has(res.status)) throw new Error(lastError); // 400/401/403: no tiene sentido reintentar
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw new Error(lastError || "Gemini no disponible");
}

// ───────────────────────────── Validación (paso 3) ─────────────────────────────

export const norm = (s: unknown): string =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Alias explícitos (inglés → nombre del dataset). Solo traducciones directas, nunca equivalencias "creativas".
const ALIAS_IDIOMAS: Record<string, string> = {
  english: "Inglés", spanish: "Español", castellano: "Español", french: "Francés", german: "Alemán",
  portuguese: "Portugués", italian: "Italiano", catalan: "Catalán", japanese: "Japonés", chinese: "Chino mandarín",
  mandarin: "Chino mandarín", polish: "Polaco", romanian: "Rumano", hindi: "Hindi", basque: "Euskera", galician: "Gallego",
};
const ALIAS_PAISES: Record<string, string> = {
  spain: "España", mexico: "México", brazil: "Brasil", "united states": "Estados Unidos", usa: "Estados Unidos",
  italy: "Italia", "united kingdom": "Reino Unido", uk: "Reino Unido", germany: "Alemania", poland: "Polonia",
  japan: "Japón", romania: "Rumanía", india: "India", argentina: "Argentina", colombia: "Colombia", chile: "Chile", portugal: "Portugal",
};
const MODALIDADES: Record<string, ProjectReq["modality"]> = {
  remoto: "remoto", remote: "remoto", teletrabajo: "remoto",
  hibrido: "hibrido", hybrid: "hibrido",
  presencial: "presencial", "on-site": "presencial", onsite: "presencial", "on site": "presencial",
};

function lookup(list: string[], alias: Record<string, string> = {}) {
  const map = new Map(list.map((x) => [norm(x), x]));
  return (value: unknown): string | null => {
    const n = norm(value);
    if (!n) return null;
    const hit = map.get(n) ?? (alias[n] && map.get(norm(alias[n])));
    return hit ?? null;
  };
}

const asInt = (x: unknown): number | null => {
  const n = typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? Number(x) : NaN;
  return Number.isFinite(n) ? Math.round(n) : null;
};

/**
 * Valida la salida del LLM contra el vocabulario del dataset. Elimina lo que no existe y lo apunta en `review`.
 * Las coincidencias por mayúsculas/tildes o por alias de traducción directa se corrigen (y también se apuntan).
 * Nunca añade nada que el LLM no haya devuelto.
 */
export function validateInterpretation(raw: unknown, v: Vocabulario): { requirements: Requirements; review: ReviewItem[] } {
  const review: ReviewItem[] = [];
  const r = (raw ?? {}) as Record<string, any>;
  const p = (r.project ?? {}) as Record<string, any>;

  const fix = (path: string, original: unknown, found: string | null, what: string): string | null => {
    if (original === null || original === undefined || original === "") return null;
    if (found === null) review.push({ path, value: original, reason: `${what} fuera del vocabulario del dataset`, action: "eliminado" });
    else if (found !== original) review.push({ path, value: original, reason: `normalizado a "${found}"`, action: "corregido" });
    return found;
  };

  const skillOf = lookup(v.skills);
  const roleOf = lookup(v.roles);
  const sectorOf = lookup(v.sectores);
  const certOf = lookup(v.certificaciones);
  const langOf = lookup(v.idiomas, ALIAS_IDIOMAS);
  const levelOf = lookup(v.niveles_idioma, { native: "Nativo", nativo: "Nativo" });
  const senOf = lookup(v.seniorities);
  const countryOf = lookup(v.paises, ALIAS_PAISES);
  const cityOf = lookup(v.ciudades);

  // ── proyecto
  const modalityRaw = p.modality;
  const modality = modalityRaw == null ? null : MODALIDADES[norm(modalityRaw)] ?? null;
  if (modalityRaw != null && modality === null) review.push({ path: "project.modality", value: modalityRaw, reason: "modalidad desconocida", action: "eliminado" });

  const startRaw = p.start_date;
  const start = typeof startRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startRaw) ? startRaw : null;
  if (startRaw && !start) review.push({ path: "project.start_date", value: startRaw, reason: "fecha no válida (YYYY-MM-DD)", action: "eliminado" });

  const project: ProjectReq = {
    project_name: typeof p.project_name === "string" && p.project_name.trim() ? p.project_name.trim() : null,
    client_sector: fix("project.client_sector", p.client_sector, sectorOf(p.client_sector), "sector"),
    country: fix("project.country", p.country, countryOf(p.country), "país (no hay perfiles en ese país)"),
    city: fix("project.city", p.city, cityOf(p.city), "ciudad (no hay perfiles en esa ciudad)"),
    modality,
    country_required: p.country_required === true,
    start_date: start,
  };
  if (project.country_required && !project.country) {
    review.push({ path: "project.country_required", value: true, reason: "país exigido pero sin país válido: se desactiva", action: "corregido" });
    project.country_required = false;
  }

  // ── roles
  const rolesIn: any[] = Array.isArray(r.roles) ? r.roles : [];
  if (rolesIn.length === 0) review.push({ path: "roles", value: [], reason: "el plan no describe ningún rol: hay que añadirlo a mano", action: "revisar" });

  const roles: RoleReq[] = rolesIn.map((ro, i) => {
    const base = `roles[${i}]`;
    const title = typeof ro?.title === "string" && ro.title.trim() ? ro.title.trim() : `Rol ${i + 1}`;

    let count = asInt(ro?.count);
    if (count === null || count < 1) {
      review.push({ path: `${base}.count`, value: ro?.count ?? null, reason: "nº de plazas no indicado o no válido: se usa 1", action: "corregido" });
      count = 1;
    }

    const matching_roles = uniq((Array.isArray(ro?.matching_roles) ? ro.matching_roles : [])
      .map((x: unknown) => fix(`${base}.matching_roles`, x, roleOf(x), "rol")).filter(Boolean) as string[]);
    if (matching_roles.length === 0) review.push({ path: `${base}.matching_roles`, value: ro?.matching_roles ?? [], reason: "ningún rol del dataset: revisar", action: "revisar" });

    const seniority_min = fix(`${base}.seniority_min`, ro?.seniority_min, senOf(ro?.seniority_min), "seniority");

    let min_years = asInt(ro?.min_years_experience);
    if (min_years !== null && (min_years < 0 || min_years > 45)) {
      review.push({ path: `${base}.min_years_experience`, value: min_years, reason: "años fuera de rango", action: "eliminado" });
      min_years = null;
    }

    const mandatory: SkillReq[] = [];
    for (const s of Array.isArray(ro?.mandatory_skills) ? ro.mandatory_skills : []) {
      const name = fix(`${base}.mandatory_skills`, s?.name, skillOf(s?.name), "skill");
      if (!name || mandatory.some((m) => m.name === name)) continue;
      let lvl = asInt(s?.min_level);
      if (lvl !== null && (lvl < 1 || lvl > 5)) {
        review.push({ path: `${base}.mandatory_skills.${name}.min_level`, value: lvl, reason: "nivel fuera de 1-5", action: "eliminado" });
        lvl = null;
      }
      mandatory.push({ name, min_level: lvl });
    }

    const desirable: { name: string }[] = [];
    for (const s of Array.isArray(ro?.desirable_skills) ? ro.desirable_skills : []) {
      const name = fix(`${base}.desirable_skills`, s?.name, skillOf(s?.name), "skill");
      if (!name || mandatory.some((m) => m.name === name) || desirable.some((d) => d.name === name)) continue;
      desirable.push({ name });
    }

    const languages: LangReq[] = [];
    for (const l of Array.isArray(ro?.languages) ? ro.languages : []) {
      const name = fix(`${base}.languages`, l?.name, langOf(l?.name), "idioma");
      if (!name || languages.some((x) => x.name === name)) continue;
      const level = l?.level == null ? null : fix(`${base}.languages.${name}.level`, l.level, levelOf(l.level), "nivel de idioma");
      languages.push({ name, level });
    }

    const certifications = uniq((Array.isArray(ro?.certifications) ? ro.certifications : [])
      .map((x: unknown) => fix(`${base}.certifications`, x, certOf(x), "certificación")).filter(Boolean) as string[]);

    const certification_options = uniq((Array.isArray(ro?.certification_options) ? ro.certification_options : [])
      .map((x: unknown) => fix(`${base}.certification_options`, x, certOf(x), "certificación")).filter(Boolean) as string[])
      .filter((c) => !certifications.includes(c));
    if (Array.isArray(ro?.certification_options) && ro.certification_options.length > 0 && certification_options.length === 0 && !certifications.length) {
      review.push({ path: `${base}.certification_options`, value: ro.certification_options, reason: "ninguna de las certificaciones alternativas existe en el dataset: se quita el requisito", action: "revisar" });
    }

    return { title, count, matching_roles, seniority_min, min_years_experience: min_years,
             mandatory_skills: mandatory, desirable_skills: desirable, languages, certifications, certification_options };
  });

  return { requirements: { project, roles }, review };
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/** Fila lista para insertar en project_requirements tras la revisión humana (paso 4). */
export function toProjectRequirementsRow(req: Requirements, extra: { description: string; source_text?: string; interpretation_raw: unknown; review: ReviewItem[] }) {
  return {
    project_name: req.project.project_name,
    description: extra.description,
    source_text: extra.source_text ?? null,
    client_sector: req.project.client_sector,
    country: req.project.country,
    city: req.project.city,
    modality: req.project.modality,
    country_required: req.project.country_required,
    project_start_date: req.project.start_date,
    roles: req.roles,
    sector: req.project.client_sector ? [req.project.client_sector] : [],
    interpretation_raw: extra.interpretation_raw,
    validation_review: extra.review,
  };
}
