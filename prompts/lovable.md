# Prompts para Lovable (en orden)

> La lección de Republica (3.º en Múnich 2025): **iterar rápido es mejor que escribir prompts largos.** Un prompt por paso, se comprueba el resultado y se pasa al siguiente.
> El repositorio ya trae la lógica y el backend. **Lovable solo tiene que construir la interfaz y conectarla.**

> ⚠️ **Actualizado al dataset de NTT DATA (190k perfiles).** Los pasos 0 y 1 ya usan el esquema nuevo. Los pasos 2-5 son del diseño anterior: hay que adaptarlos al motor de matching por rol antes de usarlos.

## 0. Preparación (una vez)
- Proyecto nuevo en Lovable → **Connect GitHub**, que crea el repo. Copiad en él `src/lib/`, `supabase/`, `docs/` y `prompts/`, y haced push. Lovable sincroniza los cambios. **No subáis `data/profiles.parquet`** (30 MB): los datos van directos a la base de datos.
- **Base de datos:** conectad un proyecto **Supabase propio** (plan gratuito) a Lovable. Hace falta su cadena de conexión para cargar los datos. Si usáis Lovable Cloud, comprobad antes que os da la cadena de conexión de Postgres.
- **Esquema y datos** desde vuestro ordenador. El script aplica `supabase/migrations/001_schema.sql` y carga una **muestra estratificada de 50.000 perfiles completos** (todas las columnas, los 87 roles y las 614 skills) en ~15 s. Ocupa **167 MB**. Probado en Postgres 17. El porqué de la muestra está en `docs/DATA.md`.
  - Cadena de conexión: Supabase → Project Settings → Database → Connection string → URI, *Session pooler* o *Direct* (puerto 5432).
  ```powershell
  pip install duckdb "psycopg[binary]"
  $env:DATABASE_URL = "postgresql://postgres.xxxx:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
  python scripts/load_profiles.py --schema --muestra 50000
  ```
- Añadid el secreto `ELEVENLABS_API_KEY`.

## 1. Base y datos (solo lectura)
> Build "SkillSonar", a staffing decision-support web app for NTT DATA staffing managers: it finds the right people for a project inside the company, even when they sit in another department. Spanish UI, clean enterprise look (deep blue palette, shadcn).
>
> The Supabase database is ALREADY created and loaded with synthetic employee profiles (up to 190,000; never assume a fixed count, read it from the data). The schema is in `supabase/migrations/001_schema.sql`. **Do NOT create, alter, migrate or seed any table, and never write to these tables from the browser (they are read-only via RLS).** Tables:
> - `empleados`: one row per person (`employee_id`, `nombre_completo`, `area`, `rol`, `nivel_seniority`, `puesto_actual`, `anios_experiencia`, `sector_principal`, `disponibilidad` ∈ {"Asignado","Roll-off próximo (<3 meses)","En banca"}, `modalidad_trabajo`, `movilidad_internacional`, `sectores_proyectos` text[] …)
> - `empleado_skills`: one row per person and skill (`skill`, `nivel` 1-5, `anios`, `demostrada` boolean, `n_proyectos`, `ultimo_anio`)
> - `proyectos`, `experiencia`, `estudios`, `certificaciones`, `idiomas`
> - `catalogo_skills`: the 614 canonical skills (`skill`, `perfiles`, `area_principal`)
> - RPC `perfil(p_employee_id text)` returns a person's full profile as JSON
> - RPC `buscar_personas(p_disponibilidad text[], p_area, p_rol, p_sector, p_min_anios int, p_skills text[], p_min_nivel int, p_limit int, p_offset int)` returns one page of people; every row carries `total` (the number of matches). With `p_skills` it requires ALL skills.
>
> Build:
> 1. **"Personas" page**: a paginated table (50 rows per page) that ONLY uses `supabase.rpc('buscar_personas', …)`. Never query `empleados` directly for the list and never fetch all rows. Filters: disponibilidad (multi-select, default "En banca" + "Roll-off próximo (<3 meses)"), área, rol, sector principal, minimum years of experience, one or more skills (autocomplete from `catalogo_skills`) and minimum skill level 1-5. Columns: nombre_completo, puesto_actual, área, años de experiencia, sector principal, and a disponibilidad badge (green "En banca", amber "Roll-off", grey "Asignado"). Show "{total} personas" from the first row's `total`. Clicking a row opens the profile.
> 2. **Profile page `/persona/:id`** using `supabase.rpc('perfil', { p_employee_id: id })`. Header: name, puesto_actual, área, años de experiencia (total and at NTT), sector principal, disponibilidad badge, modalidad, movilidad internacional. Skills table: skill, level as 5 dots, years of use, and an evidence badge: green "Demostrada en proyecto" when `demostrada` is true (tooltip: last used in `ultimo_anio`, in `n_proyectos` projects), yellow "Solo declarada" when false. Projects as a timeline (name, client sector, year, role, technology chips). Then certifications (show "Sin certificaciones" when empty, never invent any), languages with level, work history (`experiencia`) and education (`estudios`).
> 3. A small header with 3 live counters: total profiles, people "En banca" and people in "Roll-off".

## 2. Necesidad → candidatos
> Add a "Nueva necesidad" page: a textarea for a project need or RFP excerpt; on submit call the Supabase edge function `extract` with `{mode: "requirements", text}` and show the returned `musts`, `nices` and `minAvailabilityPct` as editable chips/inputs (plus max team size, default 3). Then show candidates ranked with `rankIndividuals` from `src/lib/teamBuilder.ts` (do NOT reimplement the logic). Each card shows the person, the line from `explain()`, and per required skill a badge: green "verificada", yellow "autodeclarada", grey "sin evidencia", with the evidence quote on hover. Use `candidateLabel()` for the card label: "cumple" / "candidata para revisar" / "falta evidencia de X".

## 3. Proponer equipo (EL NÚCLEO)
> Add a prominent "Proponer equipo" button. Use `proposeTeam()` and `teamCoverage()` from `src/lib/teamBuilder.ts`. Show two columns side by side: "Top-2 del ranking" (first two of `rankIndividuals`) and "Equipo propuesto", each with a requirement × person coverage matrix where empty cells are red, and a summary "X verificados + Y pendientes + Z sin cubrir". The manager can swap any member (dropdown of eligible people) and everything recalculates live. Add "Generar borrador": an editable text with the team, who covers each requirement, their evidence and any gaps, formatted as the "Equipo propuesto" section of a proposal. Save to `team_proposals`.

## 4. Nota de voz (ElevenLabs)
> On the person profile page add a big "Grabar nota de voz" button: record up to 20 s with MediaRecorder, POST the audio as multipart field `audio` to the edge function `transcribe`, then send the returned text to `extract` with `{mode: "skills", text}`. Show a review screen with each proposed skill, project and literal quote, where the employee can confirm, edit or discard each one. Confirmed ones are inserted into `employee_skills` with status 'autodeclarada' and source 'voice', and appear with a highlight animation. Show the transcript too. Handle errors with a clear message and a "Reintentar" button.

## 5. Verificación del manager
> On a candidate or team member with an 'autodeclarada' skill, add "Verificar con histórico": use `findSupportingRecord()` from `src/lib/teamBuilder.ts` with that person's `project_history`. If a record is found, show it next to the quote and let the manager confirm; that inserts a new `employee_skills` row with status 'verificada', source 'project', `evidence_quote` = record text, and `verified_by` = 'manager'. If no record exists, keep it as pending and say so.
