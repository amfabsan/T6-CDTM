# Prompts para Lovable · ORBIT AI (en orden)

> **Un prompt por paso.** Pega uno, comprueba el resultado (la línea ✅ de cada paso) y pasa al siguiente. Iterar rápido es mejor que un prompt gigante.
> Lovable construye la **interfaz** y la conecta. Las tablas, las funciones y las reglas ya existen: ver [`AGENTS.md`](../AGENTS.md).
> **Simulación:** mientras una función no esté desplegada, su pantalla usa la respuesta de ejemplo de este documento con un aviso visible «Datos simulados». Lo simulado se dice en el pitch.

**Flujo:** 1 · Necesidad (PDF o texto → requisitos) → 2 · Talento (ranking por rol) → 3 · Equipos (Top 5) → 4 · Decisión (interno / externo / híbrido). Además: **Personas** y ficha de persona.

## 0. Preparación (una vez)
- Proyecto en Lovable → **Connect GitHub** con este repo. No subáis `data/profiles.parquet`: los datos ya están en Supabase.
- **Supabase propio** conectado a Lovable, con los 34.003 perfiles disponibles y las migraciones `001`–`004` aplicadas (`AGENTS.md` §7).
- **Secretos de Supabase** (nunca en el navegador):
  - `GEMINI_API_KEY`: paso 2 (`interpret-project`);
  - `GEMINI_API_KEY_EXPLAIN`: paso 11 (`explain-recommendations`), clave propia para no compartir cuota.

## 1. Base visual (tema NTT DATA), navegación y fichas
> Build **"ORBIT AI"**, an internal staffing-intelligence web app for NTT DATA managers. Tagline: **"Find the talent. Validate the fit. Make the staffing decision."** Spanish UI. React + shadcn/ui + Tailwind.
>
> **Visual identity: follow NTT DATA's corporate web style** (es.nttdata.com). Do NOT copy or recreate the NTT DATA logo; in the header write the text "ORBIT AI" and, smaller, "para NTT DATA".
> - Font: **Noto Sans** (Google Fonts) for everything; headings 600–700, body 400. Generous line height, short sentences.
> - Colors (define as CSS variables / Tailwind theme tokens and use only these):
>   - `--navy: #070F26` → header and footer background, page titles, primary text on light backgrounds;
>   - `--blue: #0072BC` → primary buttons, links, active tab, selected state, progress bars;
>   - `--gold: #E6B600` → accent only: the "Equipo ideal" badge, the active step underline in the top navigation, key numbers highlight;
>   - `--bg: #F6F8FD` → app background; cards are white `#FFFFFF`;
>   - `--border: #E6E6E6`; `--text: #3D4852`; `--muted: #8795A1`;
>   - `--danger: #CD1517` → gaps, "Hueco" badges, errors.
>   - Availability badges: green for "En banca", amber for "Roll-off próximo (<3 meses)" (subtle backgrounds, dark text).
> - Shapes: cards and panels with **square corners (radius 0)**, 1px `--border`, very light shadow; **buttons are pills (radius 40px)**: primary = `--blue` background with white text, secondary = white with `--navy` 1px border.
> - Layout: dark navy top bar (white text, simple line icons from lucide-react) with the 4 steps **"1 · Necesidad", "2 · Talento", "3 · Equipos", "4 · Decisión"** plus "Personas"; the active step has a gold underline. Content in a centered container (max 1280px), white cards on the light background, plenty of whitespace. Tone: corporate, clear, action verbs.
> - Every money value is in **euros**, formatted Spanish style: `11.800 €`, `70 €/h`. Never use $ or USD.
>
> The Supabase database is ALREADY created and loaded. **Do NOT create, alter, migrate or seed any table.** Dataset tables are read-only (RLS):
> - `empleados` (`employee_id`, `nombre_completo`, `area`, `rol`, `nivel_seniority`, `puesto_actual`, `anios_experiencia`, `anios_en_ntt`, `pais`, `sector_principal`, `disponibilidad` ∈ {"En banca","Roll-off próximo (<3 meses)"}, `modalidad_trabajo`, `movilidad_internacional`, `resumen`, `sectores_proyectos` text[]…)
> - `empleado_skills` (`skill`, `nivel` 1-5, `anios`, `demostrada`, `n_proyectos`, `ultimo_anio`), `proyectos`, `experiencia`, `estudios`, `certificaciones`, `idiomas`, `catalogo_skills` (614 skills)
> - RPC `perfil(p_employee_id text)` → full profile JSON; RPC `buscar_personas(p_disponibilidad text[], p_area, p_rol, p_sector, p_min_anios int, p_skills text[], p_min_nivel int, p_limit int, p_offset int)` → one page, each row has `total`.
>
> Build:
> 1. **"Personas"**: paginated table (50 per page) using ONLY `supabase.rpc('buscar_personas', …)`, never fetching all rows. Filters: disponibilidad, área, rol, sector principal, años mínimos, skills (autocomplete from `catalogo_skills`), nivel mínimo. Columns: nombre, puesto, área, años, sector principal, availability badge with the status text EXACTLY as stored. Show "{total} personas".
> 2. **Ficha `/persona/:id`** via `supabase.rpc('perfil', …)`: header (name, puesto, área, years total and at NTT, sector, availability badge, modalidad, movilidad); skills with level as 5 dots, years, and an evidence badge: "Demostrada en proyecto" (tooltip: last used `ultimo_anio`, in `n_proyectos` projects) or "Solo declarada"; projects timeline (name, client sector, year, role, technology chips); work history; education; certifications ("Sin certificaciones" if empty, never invent); languages.

✅ La barra superior es azul marino con el paso activo subrayado en dorado, la fuente es Noto Sans y «Personas» pagina sin descargar toda la tabla.

## 2. Necesidad: PDF o texto → requisitos (`interpret-project`)
> Build **"1 · Necesidad"**. Two inputs side by side: a drop zone "Sube el plan del proyecto (PDF)" and a textarea "…o descríbelo con tus palabras", plus a button "Usar ejemplo" that fills: "Banco español, app de pagos. Necesitamos 1 arquitecto cloud senior, 2 desarrolladores backend y 1 especialista de seguridad, en remoto desde España, con inglés. Kubernetes es deseable. Incorporación lo antes posible."
>
> On "Interpretar", call the edge function `interpret-project`: with a PDF send `multipart/form-data` with `file`; with text send JSON `{ project_text }`. Show a loader "Leyendo el plan…" (it can take ~10 s). If the response is **422 `{ error: "pdf_sin_texto" }`**, show "Este PDF no tiene texto (parece escaneado). Pega el contenido en el cuadro de texto." and focus the textarea.
>
> The response is `{ requirements, review[], interpretation_raw, row_template }`. Show `requirements` as an **editable form**:
> - Project card: `project_name`, `client_sector`, `country` + switch "País exigido" (`country_required`), `modality` (remoto / híbrido / presencial), `start_date`.
> - One card per `requirements.roles[]`: `title`, `count` (plazas), `matching_roles` (chips, from the 87 dataset roles), `seniority_min`, `min_years_experience`, **OBLIGATORIAS** = `mandatory_skills[{name, min_level 1-5}]` (red-outlined chips), **DESEABLES** = `desirable_skills` (blue-outlined chips), `languages[{name, level}]`, `certifications` (all required) and `certification_options` (any one is enough). Skill chips autocomplete from `catalogo_skills`.
> - If `review[]` is not empty, a yellow panel "Revisado por el sistema" listing each item (`path`, `value`, `reason`, `action`: eliminado / corregido / revisar).
> - Note under the roles: "Las skills nunca excluyen: a quien le falte una obligatoria aparece con el hueco visible. Las deseables solo suman."
>
> On "Confirmar y buscar talento": insert into `project_requirements` using `row_template` with the EDITED requirements (keep `interpretation_raw` untouched), then go to step 2 with the new `project_id`.

✅ Con el ejemplo salen 3 tarjetas de rol, «Kubernetes» aparece como deseable y al confirmar se crea una fila en `project_requirements`.

## 3. Talento: ranking por rol (pasos 5-8)
> Build **"2 · Talento"** for a `project_id`. Call the backend `match-candidates` with `{ project_id }` ONCE and keep the full response in a shared store (React context or Zustand): steps 3 and 4 and the explanations reuse it. Until it is deployed, load the sample response from `src/mocks/matching.json` and show a "Datos simulados" banner.
>
> Response shape (from `matching/pipeline.py`):
> ```
> { "ranking": { "<role title>": { "cumplen": n, "total": N, "items": [Candidate] } },
>   "excluded": { "<role title>": [{ "employee_id", "score", "reasons": [..] }] },
>   "top_teams": { "cumplen": n, "items": [Team], "pending": [Team] }, "teams": [Team], "members_detail": [Candidate] }
> Candidate = { employee_id, nombre_completo, puesto_actual, role, nivel_seniority, disponibilidad, pais, modalidad_trabajo,
>   score (0-100), breakdown: { mandatory|evidence|sectorRole|seniority|desirable|langCert|recency: { value, weight, points } },
>   gaps: [string], risks: [string], evidence: [{ proyecto, anio, sector, skills: [..] }],
>   skills: [{ name, tipo: "obligatoria"|"deseable", nivel, anios, demostrada, confianza }] }
> ```
> - One tab per role ("Backend · 2 plazas"). Controls: **"Mostrar: Top 3 / Top 5 / Top 10"** (default 5) and **"Encaje mínimo (%)"** slider. Filter by min fit, sort by score desc (tie → employee_id), take Top N. If fewer remain: "Cumplen {n} de los {N} pedidos".
> - **Candidate card**: name, puesto, availability badge, **encaje % (rounded)**, a stacked horizontal bar of `breakdown[*].points` with a legend (Obligatorias, Evidencia en proyectos, Sector y rol, Seniority y años, Deseables, Idiomas y certificaciones, Uso reciente); skills table (✓ demostrada / "solo declarada", nivel, años); **"Gaps"** in red badges (never hidden); **"Riesgos"** as amber chips; **"Evidencia"**: project name, year, sector and skill chips.
> - **"Comparar"** checkbox per card; with 2-4 selected, a side drawer shows them in columns: encaje, disponibilidad, each obligatoria ✓/✗, gaps, riesgos.
> - A collapsible "Excluidos ({n})" section per role showing `excluded[role]` with their reasons ("nadie desaparece sin motivo").
> - Buttons "Ver ficha" per card and "Ver equipos" for the page.

✅ Cada rol tiene su pestaña, el slider de encaje mínimo cambia la lista y ningún gap queda escondido.

## 4. Equipos: Top 5 + «Por qué este equipo» (pasos 9-11)
> Build **"3 · Equipos"** from the store (never recompute teams in the browser).
> ```
> Team = { id, fit (average, unrounded), members: [{ role, employee_id, nombre_completo, score, disponibilidad, available_on, cost }],
>   cost: { value: number|null, status: "estimado"|"por estimar", is_illustrative: true },
>   start: { date: "YYYY-MM-DD"|null, status: "estimado"|"por confirmar" },
>   continuity: { covered, total, pct, worst: { employee_id, role, substitute: id|null, late_substitute: { employee_id, available_on }|null } },
>   gaps: number }
> ```
> - Controls: **"Ordenar por"** (Mayor encaje · Menor coste · Inicio más próximo · Mayor continuidad) and filters **"Presupuesto máximo (€)"**, **"Encaje mínimo (%)"**, **"Inicio como tarde (fecha)"**, **"Continuidad mínima (%)"** (inclusive). Apply filters to `teams`, sort, show at most 5. Ties: higher fit, then `id`.
> - Pending data: `cost.value = null` → **"Por estimar"**; `start.status = "por confirmar"` → **"Por confirmar"** (tooltip: "Roll-off próximo: menos de 3 meses, sin fecha confirmada"). If an active filter depends on a pending value, show those teams in a separate "Pendientes de dato" section.
> - **Team card**: members grouped by role (name, encaje, availability badge); big **encaje %**; **coste** in euros with a small grey tag "supuesto"; **inicio**; "Continuidad tras una baja: {pct} %" and below it the worst case: "Si se va {name}, quedan {covered} de {total} plazas · sustituto: {name|'ninguno'}". The first card under "Mayor encaje" gets a gold **"Equipo ideal"** badge.
> - **Explanations (paso 11):** right after the teams are shown, call `supabase.functions.invoke('explain-recommendations', { body: <the full matching response from the store> })` ONCE per load (not per card). While waiting, each card shows a skeleton "Analizando por qué encaja…". The response is `{ teams: [{ team_id, summary, reasons: [{ text, evidence_ids }], source }], candidates: [{ employee_id, summary, strengths: [{ text, evidence_ids }], source }], error? }`.
>   - Team card → section **"Por qué este equipo"**: `summary` + `reasons[].text` as bullets (match by `team_id === team.id`).
>   - Candidate cards (step 2) and member rows → **"Por qué encaja"**: `summary` + `strengths[].text` (match by `employee_id`).
>   - If `source === "fallback"`, add a small grey tag "resumen automático (sin IA)". If the call fails, hide the section; never block the page.
> - Button "Usar en la decisión" → step 4 with this team.

✅ Al cargar aparecen los 5 equipos y, unos segundos después, «Por qué este equipo» en cada tarjeta. Los textos en euros salen como `11.800 €`.

## 5. Decisión: interno / externo / híbrido
> Build **"4 · Decisión"** for a `project_id` and the chosen team. Left panel **"Supuestos"** (number inputs, each with the tag "Supuesto ilustrativo"), all costs **per hour**:
> - "Tarifa interna por seniority (€/h)": one input per level (Junior, Mid, Senior, Lead, Principal) → `rates_by_seniority`;
> - "Horas planificadas por persona" → `hours_per_person`;
> - "Tarifa externa (€/h)" → `external_rate_per_hour`; "Coste de selección (€)" → `recruitment_cost`;
> - "Días hasta incorporar a alguien interno", "Días de contratación externa", "Días de onboarding";
> - 5 weight sliders (coste, tiempo, cobertura, disponibilidad, riesgo) that always sum to 100 %.
>
> On change (debounced 500 ms) insert a new row in `scenario_assumptions` and recompute. Team costs in step 3 use the same rates: cost per person = €/h × hours; team = sum. Main area: three columns **Interno / Externo / Híbrido** with coste total (€), tiempo hasta incorporación (días), cobertura de requisitos, disponibilidad, riesgo and score; highlight the winner with a gold top border and show "Por qué gana". Every number carries a tiny tag: "dato" (from the dataset), "supuesto" or "calculado". No euro amount appears without the "supuesto" tag.

✅ Cambiar la tarifa Senior de 70 a 80 €/h cambia el coste de los equipos con seniors y el ganador se recalcula.

## 6. (Opcional, desactivado) Asistente de voz
El equipo decidió el 21-11 **no usar ElevenLabs** en el MVP. No construir este paso salvo que se reactive; el diseño anterior está en `prompts/elevenlabs.md`.
