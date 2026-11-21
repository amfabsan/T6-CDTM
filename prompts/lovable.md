# Prompts para Lovable · ORBIT AI (en orden)

> **Iterar rápido es mejor que escribir prompts largos.** Un prompt por paso: se comprueba el resultado y se pasa al siguiente.
> Lovable construye la **interfaz** y la conecta. Las tablas y las reglas ya existen: ver [`AGENTS.md`](../AGENTS.md).
> Flujo y cálculos: [`docs/WORKFLOW_MATCHING.md`](../docs/WORKFLOW_MATCHING.md) y [`docs/ORBIT_AI_Rankings_y_Filtros.pdf`](../docs/ORBIT_AI_Rankings_y_Filtros.pdf).
> **Simulación:** las edge functions las hacen los roles 2 y 3. Hasta que existan, cada pantalla trabaja contra la respuesta de ejemplo de su contrato (`AGENTS.md` §5), con un aviso visible "Datos simulados".

**Flujo:** 1 · Necesidad → 2 · Talento (ranking por rol) → 3 · Equipos (Top 5) → 4 · Decisión (Internal / External / Hybrid). Además, la página **Personas** y el **asistente de voz** de ElevenLabs (paso 6), que maneja por voz los controles de los pasos 2 y 3.

## 0. Preparación (una vez)
- Proyecto en Lovable → **Connect GitHub** con este repo. **No subáis `data/profiles.parquet`** desde Lovable: los datos ya están en Supabase.
- **Base de datos:** Supabase propio conectado a Lovable, ya cargado con los 34.003 perfiles disponibles y las migraciones `001` y `002`. Para recargarlo, ver `AGENTS.md` §7.
- **Secretos de Supabase:** `ELEVENLABS_API_KEY` y `ELEVENLABS_AGENT_ID`; además, `AI_GATEWAY_URL` + `AI_API_KEY` si no se usa el AI Gateway de Lovable. Nunca en el código del navegador.

## 1. Base, datos y fichas (solo lectura)
> Build "ORBIT AI", a staffing intelligence web app for NTT DATA managers. Tagline: "Find the talent. Validate the fit. Make the staffing decision." It finds people inside the company even when their experience is described with different words, explains every recommendation with evidence, proposes the best teams and helps decide between internal, external or hybrid staffing. Spanish UI, clean enterprise look (deep blue palette, shadcn). Top navigation with 4 steps: "1 · Necesidad", "2 · Talento", "3 · Equipos", "4 · Decisión", plus "Personas".
>
> The Supabase database is ALREADY created and loaded. **Do NOT create, alter, migrate or seed any table.** Dataset tables are read-only (RLS):
> - `empleados`: one row per person (`employee_id`, `nombre_completo`, `area`, `rol`, `nivel_seniority`, `puesto_actual`, `anios_experiencia`, `anios_en_ntt`, `pais`, `sector_principal`, `disponibilidad` ∈ {"En banca","Roll-off próximo (<3 meses)"}, `modalidad_trabajo`, `movilidad_internacional`, `resumen`, `sectores_proyectos` text[] …)
> - `empleado_skills`: one row per person and skill (`skill`, `nivel` 1-5, `anios`, `demostrada` boolean, `n_proyectos`, `ultimo_anio`)
> - `proyectos`, `experiencia`, `estudios`, `certificaciones`, `idiomas`; `catalogo_skills` (614 canonical skills)
> - RPC `perfil(p_employee_id text)` → full profile JSON; RPC `buscar_personas(p_disponibilidad text[], p_area, p_rol, p_sector, p_min_anios int, p_skills text[], p_min_nivel int, p_limit int, p_offset int)` → one page of people, each row carries `total`.
>
> Build:
> 1. **"Personas" page**: a paginated table (50 per page) that ONLY uses `supabase.rpc('buscar_personas', …)`; never fetch all rows. Filters: disponibilidad ("Todas" / "En banca" / "Roll-off próximo (<3 meses)"), área, rol, sector principal, minimum years of experience, skills (autocomplete from `catalogo_skills`), minimum skill level. Columns: nombre, puesto, área, años de experiencia, sector principal, availability badge showing the status text EXACTLY as stored (green for "En banca", amber for "Roll-off próximo (<3 meses)"). Show "{total} personas".
> 2. **Profile page `/persona/:id`** via `supabase.rpc('perfil', …)`. Header: name, puesto, área, years (total and at NTT), sector principal, availability badge, modalidad, movilidad. Skills: skill, level as 5 dots, years of use, evidence badge: green "Demostrada en proyecto" if `demostrada` (tooltip: last used `ultimo_anio`, in `n_proyectos` projects), yellow "Solo declarada" otherwise. Projects timeline (name, client sector, year, role, technology chips), work history, education, certifications ("Sin certificaciones" when empty, never invent any) and languages.

## 2. Necesidad (`interpret-project`)
> Build the "1 · Necesidad" page. A large textarea "Describe la necesidad del proyecto" with an example button that fills: "Banco español, app de pagos. Necesitamos 1 arquitecto cloud senior, 2 desarrolladores backend y 1 especialista de seguridad, en remoto desde España, con inglés. Kubernetes es deseable. Incorporación lo antes posible." On "Interpretar", call the edge function `interpret-project` with `{ project_description }`. It returns one block per team role. Show it as an editable form, with one card per role:
> - role (from the 87 dataset roles), how many people (`count`), seniority (select);
> - **MUST-HAVE** skill chips with min level 1-5, **NICE-TO-HAVE** skill chips (both only from `catalogo_skills`, autocomplete);
> - sector experience, languages with minimum level, mandatory certifications, minimum years of experience.
>
> Project-level fields: country, acceptable availability (checkboxes "En banca" / "Roll-off próximo (<3 meses)"), project start date (optional) and start deadline (optional). Show a note: "Las skills nunca excluyen: un candidato sin una obligatoria aparece con el hueco visible. Los requisitos deseables solo suman." On "Confirmar y buscar talento", insert the edited object into `project_requirements` (keep the untouched LLM output in `interpretation_raw`) and go to step 2 with the new `project_id`.

## 3. Talento: ranking por rol (`match-candidates`, PDF §1)
> Build the "2 · Talento" page for a `project_id`. Call the edge function `match-candidates` with `{ project_id }` once and keep the response in a shared store, because the "3 · Equipos" page and the voice assistant use it too. The response has `roles[]`, each with its `candidates[]` already scored, and `teams[]`.
>
> Show one tab per role ("Arquitecto cloud · 1 plaza"…). Right below the role's best fit percentage and above the list, add the controls **"Mostrar: Top 3 / Top 5 / Top 10"** (Top 5 by default) and **"Encaje mínimo (%)"** (slider 0-100). Apply in this order: keep candidates that pass the hard filters, filter by minimum fit, sort by fit (highest first), limit to Top N. If fewer remain, show "Cumplen {n} de los {N} pedidos".
>
> Each candidate card:
> - name, puesto, área, availability badge (exact text), **fit %**, and a stacked bar with the breakdown (skills obligatorias, evidencia demostrada, sector y rol, seniority y años, deseables, idiomas y certificaciones, recencia);
> - "Fortalezas" and "Gaps", each item linked to its evidence (skill with level and years, project name and year, certification);
> - missing MUST-HAVE skills as a red "Hueco" badge, never hidden;
> - "Riesgos" chips (e.g. "nivel 1 con 4 años de uso", "Roll-off: inicio por confirmar", "solo declarada", "último uso en 2019");
> - the label **"Talento fuera de su área"** when the person comes from another área or sector principal but has relevant project evidence.
>
> Add a "Comparar" checkbox on each card. With 2-4 selected, a drawer shows them side by side: fit, availability, MUST-HAVE coverage (✓/✗ per requirement), gaps and risks. Each card has "Ver perfil". The page has "Ver equipos" (step 3).

## 4. Equipos: Top 5 (PDF §2-4)
> Build the "3 · Equipos" page from the `teams[]` already in the store (do not recompute teams in the browser). Each team has `team_id`, `members[{role, employee_id, nombre, fit}]`, `fit` (average of its members' fit), `cost` (number or null), `start` (`{day: number|null, status: "confirmado"|"por_confirmar"}`), `continuity` (0-100) and `worst_dropout` (`{employee_id, role, covered_roles, total_roles, substitute}`).
>
> Controls at the top: **"Ordenar por"** (Encaje, mayor primero · Coste, menor primero · Inicio, más próximo primero · Continuidad, mayor primero), plus filters **"Presupuesto máximo (€)"**, **"Encaje mínimo (%)"**, **"Fecha límite de inicio (día)"** and **"Continuidad mínima (%)"**. Apply the filters to all teams, sort by the chosen criterion, then show at most 5. Default sort: fit. Ties: higher fit first, then `team_id`.
>
> Pending data:
> - `cost = null` → show **"Por estimar"**;
> - `start.status = "por_confirmar"` → show **"Por confirmar"**, with the tooltip "Roll-off próximo: ventana de menos de 3 meses, sin día confirmado";
> - teams with pending data go at the end, and if an active filter depends on a pending value, show those teams in a separate "Pendientes de dato" section.
>
> Each team card shows its members grouped by role (with fit and availability badge), fit %, cost (tag "supuesto"), start, and "Continuidad tras una baja: {continuity} %". Under the continuity, explain the worst case: "Si se va {nombre}, quedan cubiertos {covered_roles} de {total_roles} roles · sustituto: {name or 'ninguno'}". The first card under the "Encaje" sort gets the badge "Equipo ideal". Button "Usar en la decisión" (step 4).

## 5. Decisión (`calculate-staffing-scenarios`)
> Build the "4 · Decisión" page for a `project_id` and the chosen team. Left panel "Supuestos" (editable number inputs, each tagged "Supuesto ilustrativo"): coste interno €/día, tarifa externa €/día, coste de selección €, días de movilización interna, días de contratación, días de onboarding, duración del proyecto en días; and 5 weight sliders (coste, tiempo, cobertura, disponibilidad, riesgo) that always sum to 100 %. On every change, insert a new row in `scenario_assumptions` (debounced) and call `calculate-staffing-scenarios` with `{ project_id, team_id, assumptions }`. These same assumptions feed the team costs in step 3. Main area: three columns **Internal / External / Hybrid** with coste total estimado, tiempo hasta incorporación, cobertura de requisitos, disponibilidad, riesgo and score. Mark the winner and show the returned "por qué gana". Every number carries a small tag: "dato" (from the dataset), "supuesto" or "calculado". No monetary value may appear without the "supuesto" tag.

## 6. Asistente de voz ORBIT (ElevenLabs)
> Add a floating microphone button "Pregunta a ORBIT" on the "2 · Talento" and "3 · Equipos" pages. Use the official React SDK `@elevenlabs/react` (`useConversation`).
> - To start, call the edge function `elevenlabs-signed-url` to get a signed URL, then `startSession({ signedUrl, dynamicVariables: { project_summary } })`, where `project_summary` is one paragraph with the roles and MUST-HAVE skills. Never put the ElevenLabs API key in the browser.
> - Register these **client tools**. They read and write the SAME UI state that the on-screen controls use, so every voice change is visible at once. Each returns a short JSON string:
>   - `get_state()` → active page, role tab, profile controls (top_n, min_fit), team controls (sort_by, max_budget, min_fit, start_deadline_day, min_continuity), and the currently VISIBLE profiles (name, fit, availability, gaps, risks) and teams (team_id, members, fit, cost or "Por estimar", start or "Por confirmar", continuity).
>   - `set_profile_filters({ role?, top_n?, min_fit? })` → switches the role tab and/or sets Top N (3, 5 or 10) and minimum fit. Returns the new visible profiles and "Cumplen n de N" if fewer.
>   - `set_team_filters({ sort_by?, max_budget?, min_fit?, start_deadline_day?, min_continuity? })` → `sort_by` ∈ fit | cost | start | continuity; `null` clears a filter. Returns the visible teams.
>   - `explain_team({ team_id })` → highlights the card and returns its members, fit, cost, start, continuity and worst dropout.
>   - `simulate_dropout({ team_id, employee_id })` → returns, from that team's precomputed `dropouts[]`, the roles still covered and the substitute.
>   - `open_profile({ employee_id })` → navigates to `/persona/:id`.
>   - `reset_filters()` → defaults (Top 5, fit 0, sort by fit, no filters).
> - While talking, show a small live transcript panel and a "Detener" button. If the session fails, show "El asistente de voz no está disponible" and keep everything usable by hand.
