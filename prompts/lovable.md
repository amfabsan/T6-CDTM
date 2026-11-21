# Prompts para Lovable · ORBIT AI (en orden)

> **Iterar rápido es mejor que escribir prompts largos.** Un prompt por paso: se comprueba el resultado y se pasa al siguiente.
> Lovable construye la **interfaz** y la conecta. Las tablas y las reglas ya existen: ver [`AGENTS.md`](../AGENTS.md). Las 4 edge functions las hacen los roles 2, 3 y 4. Hasta que existan, cada pantalla puede trabajar contra la respuesta de ejemplo de su contrato (`AGENTS.md` §5), **marcándolo como simulado**.

## 0. Preparación (una vez)
- Proyecto en Lovable → **Connect GitHub** con este repo. **No subáis `data/profiles.parquet`** desde Lovable: los datos ya están en Supabase.
- **Base de datos:** Supabase propio conectado a Lovable, ya cargado con los 34.003 perfiles disponibles y las migraciones `001` y `002`. Para recargarlo, ver `AGENTS.md` §7.
- **Secretos de Supabase:** `ELEVENLABS_API_KEY` y, si no se usa el AI Gateway de Lovable, `AI_GATEWAY_URL` + `AI_API_KEY`. Nunca en el código del navegador.

## 1. Base, datos y fichas (solo lectura)
> Build "ORBIT AI", a staffing intelligence web app for NTT DATA managers. Tagline: "Find the talent. Validate the fit. Make the staffing decision." It finds people inside the company even when their experience is described with different words, explains every recommendation with evidence, and helps decide between internal, external or hybrid staffing. Spanish UI, clean enterprise look (deep blue palette, shadcn). Top navigation with 4 steps: "1 · Necesidad", "2 · Talento", "3 · Evaluación", "4 · Decisión", plus "Personas".
>
> The Supabase database is ALREADY created and loaded. **Do NOT create, alter, migrate or seed any table.** Dataset tables are read-only (RLS):
> - `empleados`: one row per person (`employee_id`, `nombre_completo`, `area`, `rol`, `nivel_seniority`, `puesto_actual`, `anios_experiencia`, `anios_en_ntt`, `sector_principal`, `disponibilidad` ∈ {"En banca","Roll-off próximo (<3 meses)"}, `modalidad_trabajo`, `movilidad_internacional`, `resumen`, `sectores_proyectos` text[] …)
> - `empleado_skills`: one row per person and skill (`skill`, `nivel` 1-5, `anios`, `demostrada` boolean, `n_proyectos`, `ultimo_anio`)
> - `proyectos`, `experiencia`, `estudios`, `certificaciones`, `idiomas`; `catalogo_skills` (614 canonical skills)
> - RPC `perfil(p_employee_id text)` → full profile JSON; RPC `buscar_personas(p_disponibilidad text[], p_area, p_rol, p_sector, p_min_anios int, p_skills text[], p_min_nivel int, p_limit int, p_offset int)` → one page of people, each row carries `total`.
>
> Build:
> 1. **"Personas" page**: a paginated table (50 per page) that ONLY uses `supabase.rpc('buscar_personas', …)`; never fetch all rows. Filters: disponibilidad ("Todas" / "En banca" / "Roll-off próximo (<3 meses)"), área, rol, sector principal, minimum years of experience, skills (autocomplete from `catalogo_skills`), minimum skill level. Columns: nombre, puesto, área, años de experiencia, sector principal, availability badge showing the status text EXACTLY as stored (green for "En banca", amber for "Roll-off próximo (<3 meses)"). Show "{total} personas".
> 2. **Profile page `/persona/:id`** via `supabase.rpc('perfil', …)`. Header: name, puesto, área, years (total and at NTT), sector principal, availability badge, modalidad, movilidad. Skills: skill, level as 5 dots, years of use, evidence badge: green "Demostrada en proyecto" if `demostrada` (tooltip: last used `ultimo_anio`, in `n_proyectos` projects), yellow "Solo declarada" otherwise. Projects timeline (name, client sector, year, role, technology chips), work history, education, certifications ("Sin certificaciones" when empty, never invent any) and languages.

## 2. Módulo A · Necesidad (`interpret-project`)
> Build the "1 · Necesidad" page. A large textarea "Describe la necesidad del proyecto" with an example button that fills: "Migración del core bancario de un cliente a Azure. Necesitamos un arquitecto cloud senior con experiencia en banca, Kubernetes y Terraform; inglés B2. Valorable experiencia en seguridad. Incorporación inmediata." On "Interpretar", call the edge function `interpret-project` with `{ project_description }`. Show the result as an editable form: role, seniority (select), **MUST-HAVE** skill chips with min level (1-5), **NICE-TO-HAVE** skill chips, sector experience, languages with level, certifications, minimum years of experience, acceptable availability (checkboxes "En banca" / "Roll-off próximo (<3 meses)"). Skill chips can only be added from `catalogo_skills` (autocomplete). Show a note: "Los requisitos deseables suman puntos pero nunca excluyen candidatos". On "Confirmar y buscar talento", insert the edited object into `project_requirements` (keep the untouched LLM output in `interpretation_raw`) and go to step 2 with the new `project_id`.

## 3. Módulo B · Talento (`match-candidates`)
> Build the "2 · Talento" page for a `project_id`. Call the edge function `match-candidates` with `{ project_id }`. Show a ranked list. Each card has:
> - name, puesto, área, availability badge (exact text), total score (0-100) and a stacked bar with the score breakdown (skills, nivel, años de uso, proyectos/sector, seniority, idiomas/otros);
> - "Fortalezas" and "Gaps" lists, where each item links to its evidence (skill with level and years, project name and year, certification);
> - missing MUST-HAVE requirements shown as a red "Bloqueo" badge, never hidden;
> - a "Riesgos" line (e.g. "nivel 1 con 4 años de uso", "disponible en <3 meses", "solo declarada", "último uso en 2019");
> - a highlighted label "Talento fuera de su área" when the person comes from another área or sector principal but has relevant project evidence.
>
> Checkbox "Comparar" on each card. With 2-4 selected, a "Comparar" drawer shows a side-by-side table: score, availability, MUST-HAVE coverage (✓/✗ per requirement), gaps and risks. Each card has the buttons "Ver perfil" and "Evaluar con entrevista" (goes to step 3), and the page has "Ir a decisión" (step 4).

## 4. Módulo C · Evaluación (ElevenLabs + `evaluate-interview`)
> Build the "3 · Evaluación" page for a `project_id` + `employee_id`. Left: the candidate summary and the project context (role, MUST-HAVE). Center: the ElevenLabs Conversational AI widget/agent (agent id from config, see `prompts/elevenlabs.md`). When starting, pass dynamic variables `project_context` (one paragraph built from the requirements) and `candidate_name`. When the conversation ends, get the transcript and call the edge function `evaluate-interview` with `{ project_id, employee_id, transcript }`. Show:
> - the transcript;
> - a rubric with 5 dimensions scored 1-5 (Aplicación práctica, Resolución de problemas, Comprensión del contexto, Comunicación, Evidencia/límites), each with the literal quote that supports it;
> - strengths, concerns and a yellow box "No verificado" with `unverified_items`.
>
> A fixed note: "Evaluación complementaria: no modifica el perfil ni las skills oficiales; la decisión es humana." Save to `candidate_assessments`.

## 5. Módulo D · Decisión (`calculate-staffing-scenarios`)
> Build the "4 · Decisión" page for a `project_id`. Left panel "Supuestos" (editable number inputs, each tagged "Supuesto ilustrativo"): coste interno €/día, tarifa externa €/día, coste de selección €, días de movilización interna, días de contratación, días de onboarding, duración del proyecto en días; and 5 weight sliders (coste, tiempo, cobertura, disponibilidad, riesgo) that always sum to 100 %. On every change, insert a new row in `scenario_assumptions` (debounced) and call the edge function `calculate-staffing-scenarios` with `{ project_id, assumptions }`. Main area: three columns **Internal / External / Hybrid** with coste total estimado, tiempo hasta incorporación, cobertura de requisitos, disponibilidad, riesgo and the scenario score. Mark the winner and show the returned "por qué gana". Every number has a small tag: "dato" (from the dataset), "supuesto" or "calculado". No monetary value may appear without the "supuesto" tag.
